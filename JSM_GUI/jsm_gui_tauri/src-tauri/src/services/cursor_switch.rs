use crate::{
    runtime,
    services::{app_state::AppState, jsm_process},
};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    sync::atomic::Ordering,
    thread,
    time::{Duration, Instant},
};
use tauri::AppHandle;

const SETTINGS_FILE: &str = "cursor-switch.json";
const OVERLAY_FILE: &str = "_studio-cursor-override.txt";
const RESTORE_FILE: &str = "_studio-cursor-restore.txt";
const DEBOUNCE_MS: u64 = 300;

const RESTORE_PREVIOUS: &str = "__restore_previous__";

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(from = "SettingsWire", rename_all = "camelCase")]
pub struct CursorSwitchSettings {
    pub enabled: bool,
    pub profile_name: String,
    pub hidden_profile_name: String,
}
#[derive(Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct SettingsWire {
    enabled: bool,
    profile_name: String,
    hidden_profile_name: Option<String>,
}
impl From<SettingsWire> for CursorSwitchSettings {
    fn from(wire: SettingsWire) -> Self {
        let hidden = wire.hidden_profile_name.unwrap_or_else(|| {
            if wire.profile_name.is_empty() {
                String::new()
            } else {
                RESTORE_PREVIOUS.into()
            }
        });
        Self {
            enabled: wire.enabled,
            profile_name: wire.profile_name,
            hidden_profile_name: hidden,
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CursorSwitchState {
    pub settings: CursorSwitchSettings,
    pub supported: bool,
    pub cursor_visible: Option<bool>,
    pub override_active: bool,
    pub return_profile: Option<String>,
    pub active_profile: Option<String>,
    pub last_error: Option<String>,
    #[serde(skip)]
    revision: u64,
}
impl Default for CursorSwitchState {
    fn default() -> Self {
        Self {
            settings: CursorSwitchSettings::default(),
            supported: cfg!(target_os = "windows"),
            cursor_visible: None,
            override_active: false,
            return_profile: None,
            active_profile: None,
            last_error: None,
            revision: 0,
        }
    }
}

#[derive(Default)]
struct VisibilityDebounce {
    candidate: Option<bool>,
    since: u64,
}
impl VisibilityDebounce {
    fn observe(&mut self, sample: Option<bool>, now: u64) -> Option<bool> {
        if sample != self.candidate {
            self.candidate = sample;
            self.since = now;
        }
        if now.saturating_sub(self.since) >= DEBOUNCE_MS {
            sample
        } else {
            None
        }
    }
}
// Latch only handled stable states: failed loads remain retryable, while manual
// changes consume even an in-flight observation so it cannot override the user.
#[derive(Default)]
struct CursorEdges {
    handled: Option<bool>,
    engine: u64,
    settings: u64,
}
impl CursorEdges {
    fn synchronize(
        &mut self,
        raw: Option<bool>,
        engine: u64,
        settings: u64,
        mapping: bool,
    ) -> bool {
        if self.settings != settings {
            self.settings = settings;
            self.handled = None;
        }
        let manual = self.engine != engine;
        self.engine = engine;
        if manual || !mapping {
            self.handled = raw.or(self.handled);
        }
        manual
    }
    fn pending(&self, stable: Option<bool>) -> bool {
        stable.is_some() && stable != self.handled
    }
}

struct Overlay {
    target: String,
    path: String,
    content: String,
    settings_revision: u64,
    needs_restore: bool,
}

#[derive(Debug, PartialEq)]
enum Decision {
    Wait,
    Forget,
    Restore,
    Enter,
}
struct Conditions {
    enabled: bool,
    mapping: bool,
    suspended: bool,
    running: bool,
    visible: Option<bool>,
    active: bool,
    manual_change: bool,
    settings_changed: bool,
    recovery: bool,
    event: bool,
    has_target: bool,
    restore_target: bool,
}
fn decide(c: Conditions) -> Decision {
    if c.active && (!c.mapping || c.manual_change) {
        return Decision::Forget;
    }
    if !c.mapping || c.suspended || !c.running {
        return Decision::Wait;
    }
    if c.active && (!c.enabled || c.settings_changed || c.recovery || (c.event && c.restore_target))
    {
        return Decision::Restore;
    }
    if c.enabled && c.event && c.visible.is_some() && c.has_target && !c.restore_target {
        return Decision::Enter;
    }
    Decision::Wait
}

pub fn get_state(state: &AppState) -> Result<CursorSwitchState, String> {
    Ok(state
        .cursor_switch
        .lock()
        .map_err(|_| "Cursor state lock poisoned")?
        .clone())
}

pub fn save_settings(
    app: &AppHandle,
    state: &AppState,
    settings: CursorSwitchSettings,
) -> Result<CursorSwitchState, String> {
    let _gate = state
        .engine_gate
        .lock()
        .map_err(|_| "Engine lock poisoned")?;
    if settings.enabled {
        if !cfg!(target_os = "windows") {
            return Err("Cursor detection is only supported on Windows".into());
        }
        for name in [&settings.profile_name, &settings.hidden_profile_name] {
            if !name.is_empty() && name != RESTORE_PREVIOUS {
                validate_profile(app, name)?;
            }
        }
        if settings.profile_name == RESTORE_PREVIOUS {
            return Err("Restore is only available for cursor hidden".into());
        }
    }
    let text = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(runtime::runtime_dir(app)?.join(SETTINGS_FILE), text).map_err(|e| e.to_string())?;
    let mut current = state
        .cursor_switch
        .lock()
        .map_err(|_| "Cursor state lock poisoned")?;
    current.settings = settings;
    current.revision += 1;
    current.last_error = None;
    Ok(current.clone())
}

fn validate_profile(app: &AppHandle, name: &str) -> Result<String, String> {
    if !runtime::list_library_profiles(app)?
        .iter()
        .any(|entry| entry == name)
    {
        return Err("Cursor profile does not exist. Select a saved profile.".into());
    }
    Ok(format!("profiles-library/{name}.txt"))
}

// The overlay never rewrites a user's profile, active selection, or startup file.
fn temporary_config(content: &str, autoload: bool) -> String {
    let mut lines: Vec<&str> = content
        .lines()
        .filter(|line| {
            line.split('=')
                .next()
                .unwrap_or("")
                .trim()
                .eq_ignore_ascii_case("AUTOLOAD")
                == false
        })
        .collect();
    lines.extend([
        "AUTOCONNECT = ON",
        "TELEMETRY_ENABLED = ON",
        "TELEMETRY_PORT = 8974",
    ]);
    format!(
        "RESET_MAPPINGS\nAUTOLOAD = OFF\n{}\nAUTOLOAD = {}\n",
        lines.join("\n"),
        if autoload { "ON" } else { "OFF" }
    )
}
fn inject_temporary(
    app: &AppHandle,
    state: &AppState,
    file: &str,
    content: &str,
    autoload: bool,
) -> Result<(), String> {
    fs::write(
        runtime::runtime_dir(app)?.join(file),
        temporary_config(content, autoload),
    )
    .map_err(|e| e.to_string())?;
    if !jsm_process::inject_console_command(app, state, "AUTOLOAD = OFF")? {
        return Err("Could not suspend process AutoLoad".into());
    }
    if !jsm_process::inject_console_command(app, state, file)? {
        return Err("Could not load cursor switch profile".into());
    }
    Ok(())
}
fn foreground_rule(app: &AppHandle, enabled: bool) -> Option<(String, String)> {
    if !enabled {
        return None;
    }
    let name = foreground_process()?;
    let rule = runtime::list_autoload_rules(app)
        .ok()?
        .into_iter()
        .find(|rule| rule.process_name.eq_ignore_ascii_case(&name))?;
    if rule.missing_profile {
        return None;
    }
    let path = rule
        .profile_path
        .unwrap_or_else(|| format!("AutoLoad/{}", rule.file_name));
    let content = fs::read_to_string(runtime::runtime_dir(app).ok()?.join(&path)).ok()?;
    Some((path, content))
}
fn base_profile(
    app: &AppHandle,
    state: &AppState,
    mapping: &runtime::RuntimeMappingState,
) -> Result<(String, String), String> {
    if let Some(rule) = foreground_rule(app, mapping.autoload_enabled) {
        return Ok(rule);
    }
    if let Some(profile) = state
        .applied_profile
        .lock()
        .map_err(|_| "Profile lock poisoned")?
        .as_ref()
    {
        if profile.0 == mapping.active_profile_path {
            return Ok(profile.clone());
        }
    }
    let path = mapping.active_profile_path.clone();
    let content =
        fs::read_to_string(runtime::runtime_dir(app)?.join(&path)).map_err(|e| e.to_string())?;
    Ok((path, content))
}
fn set_overlay_status(state: &AppState, overlay: Option<&Overlay>) {
    if let Ok(mut status) = state.cursor_switch.lock() {
        status.override_active = overlay.is_some();
        status.return_profile = overlay.map(|item| item.path.clone());
        status.active_profile = overlay.map(|item| item.target.clone());
    }
}

pub fn start(app: AppHandle, state: AppState) {
    if let Ok(root) = runtime::runtime_dir(&app) {
        if let Ok(text) = fs::read_to_string(root.join(SETTINGS_FILE)) {
            if let Ok(settings) = serde_json::from_str(&text) {
                if let Ok(mut status) = state.cursor_switch.lock() {
                    status.settings = settings;
                }
            }
        }
    }
    if !cfg!(target_os = "windows") {
        return;
    }
    thread::spawn(move || {
        let start = Instant::now();
        let mut debounce = VisibilityDebounce::default();
        let mut overlay: Option<Overlay> = None;
        let mut retry_at = Instant::now();
        let mut edges = CursorEdges {
            engine: state.engine_revision.load(Ordering::SeqCst),
            ..Default::default()
        };
        loop {
            thread::sleep(Duration::from_millis(100));
            let visible = system_cursor_visible();
            if let Ok(mut status) = state.cursor_switch.lock() {
                status.cursor_visible = visible;
            }
            let stable = debounce.observe(visible, start.elapsed().as_millis() as u64);
            let Ok(_gate) = state.engine_gate.lock() else {
                continue;
            };
            let Ok(settings) = get_state(&state) else {
                continue;
            };
            if !settings.settings.enabled && overlay.is_none() {
                edges.engine = state.engine_revision.load(Ordering::SeqCst);
                continue;
            }
            let Ok(mapping) = runtime::read_runtime_mapping_state(&app) else {
                continue;
            };
            let revision = state.engine_revision.load(Ordering::SeqCst);
            // Consume this cursor state on every manual apply, pause or engine restart,
            // including when no automatic profile was active. Only a new edge can win.
            let manual_change = edges.synchronize(
                visible,
                revision,
                settings.revision,
                mapping.mapping_enabled,
            );
            let target = if stable == Some(true) {
                &settings.settings.profile_name
            } else {
                &settings.settings.hidden_profile_name
            };
            let event = edges.pending(stable);
            let decision = decide(Conditions {
                enabled: settings.settings.enabled,
                mapping: mapping.mapping_enabled,
                suspended: state.calibrating.load(Ordering::SeqCst)
                    || state.calibration_profile_active.load(Ordering::SeqCst),
                running: jsm_process::is_running(&state).unwrap_or(false),
                visible: stable,
                active: overlay.is_some(),
                manual_change,
                settings_changed: overlay
                    .as_ref()
                    .is_some_and(|entry| entry.settings_revision != settings.revision),
                recovery: overlay.as_ref().is_some_and(|entry| entry.needs_restore),
                event,
                has_target: !target.is_empty(),
                restore_target: target == RESTORE_PREVIOUS,
            });
            // A manual apply/pause/restart wins over an earlier automatic overlay.
            if decision == Decision::Forget {
                overlay = None;
                set_overlay_status(&state, None);
                continue;
            }
            if decision == Decision::Wait {
                if settings.settings.enabled
                    && mapping.mapping_enabled
                    && stable.is_some()
                    && !state.calibrating.load(Ordering::SeqCst)
                    && !state.calibration_profile_active.load(Ordering::SeqCst)
                    && jsm_process::is_running(&state).unwrap_or(false)
                {
                    edges.handled = stable;
                }
                continue;
            }
            if Instant::now() < retry_at {
                continue;
            }
            if decision == Decision::Restore {
                let old = overlay.as_ref().unwrap();
                let restore = foreground_rule(&app, mapping.autoload_enabled)
                    .unwrap_or_else(|| (old.path.clone(), old.content.clone()));
                match inject_temporary(
                    &app,
                    &state,
                    RESTORE_FILE,
                    &restore.1,
                    mapping.autoload_enabled,
                ) {
                    Ok(()) => {
                        let retry_current =
                            old.needs_restore || old.settings_revision != settings.revision;
                        overlay = None;
                        edges.handled = if retry_current { None } else { stable };
                        set_overlay_status(&state, None);
                        if let Ok(mut s) = state.cursor_switch.lock() {
                            s.last_error = None;
                        }
                    }
                    Err(error) => {
                        if let Ok(mut s) = state.cursor_switch.lock() {
                            s.last_error = Some(error);
                        }
                        retry_at = Instant::now() + Duration::from_secs(3);
                    }
                }
                continue;
            }
            if decision == Decision::Enter {
                let result = (|| -> Result<Overlay, String> {
                    let path = validate_profile(&app, target)?;
                    let (base_path, base_content) = if let Some(old) = &overlay {
                        (old.path.clone(), old.content.clone())
                    } else {
                        base_profile(&app, &state, &mapping)?
                    };
                    let content = fs::read_to_string(runtime::runtime_dir(&app)?.join(&path))
                        .map_err(|e| e.to_string())?;
                    let mut entry = Overlay {
                        target: target.clone(),
                        path: base_path,
                        content: base_content,
                        settings_revision: settings.revision,
                        needs_restore: false,
                    };
                    if let Err(error) =
                        inject_temporary(&app, &state, OVERLAY_FILE, &content, false)
                    {
                        if inject_temporary(
                            &app,
                            &state,
                            RESTORE_FILE,
                            &entry.content,
                            mapping.autoload_enabled,
                        )
                        .is_err()
                        {
                            entry.needs_restore = true;
                            overlay = Some(entry);
                            set_overlay_status(&state, overlay.as_ref());
                        } else {
                            overlay = None;
                            set_overlay_status(&state, None);
                        }
                        return Err(error);
                    }
                    Ok(entry)
                })();
                match result {
                    Ok(entry) => {
                        edges.handled = stable;
                        overlay = Some(entry);
                        set_overlay_status(&state, overlay.as_ref());
                        if let Ok(mut s) = state.cursor_switch.lock() {
                            s.last_error = None;
                        }
                    }
                    Err(error) => {
                        if let Ok(mut s) = state.cursor_switch.lock() {
                            s.last_error = Some(error);
                        }
                        retry_at = Instant::now() + Duration::from_secs(3);
                    }
                }
            }
        }
    });
}

#[cfg(target_os = "windows")]
fn system_cursor_visible() -> Option<bool> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetCursorInfo, CURSORINFO, CURSOR_SHOWING, CURSOR_SUPPRESSED,
    };
    let mut info: CURSORINFO = unsafe { std::mem::zeroed() };
    info.cbSize = std::mem::size_of::<CURSORINFO>() as u32;
    if unsafe { GetCursorInfo(&mut info) } == 0 {
        None
    } else {
        Some(info.flags & CURSOR_SHOWING != 0 && info.flags & CURSOR_SUPPRESSED == 0)
    }
}
#[cfg(not(target_os = "windows"))]
fn system_cursor_visible() -> Option<bool> {
    None
}

#[cfg(target_os = "windows")]
fn foreground_process() -> Option<String> {
    use windows_sys::Win32::{
        Foundation::CloseHandle,
        System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
        },
        UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId},
    };
    let mut pid = 0;
    unsafe {
        GetWindowThreadProcessId(GetForegroundWindow(), &mut pid);
    }
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if handle.is_null() {
        return None;
    }
    let mut buffer = vec![0u16; 32768];
    let mut size = buffer.len() as u32;
    let ok = unsafe { QueryFullProcessImageNameW(handle, 0, buffer.as_mut_ptr(), &mut size) };
    unsafe {
        CloseHandle(handle);
    }
    if ok == 0 {
        return None;
    }
    let path = String::from_utf16_lossy(&buffer[..size as usize]);
    std::path::Path::new(&path)
        .file_stem()
        .map(|name| name.to_string_lossy().into_owned())
}
#[cfg(not(target_os = "windows"))]
fn foreground_process() -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    fn conditions() -> Conditions {
        Conditions {
            enabled: true,
            mapping: true,
            suspended: false,
            running: true,
            visible: Some(true),
            active: false,
            manual_change: false,
            settings_changed: false,
            recovery: false,
            event: true,
            has_target: true,
            restore_target: false,
        }
    }
    #[test]
    fn enters_once_and_restores_when_hidden_or_disabled() {
        assert_eq!(decide(conditions()), Decision::Enter);
        assert_eq!(
            decide(Conditions {
                active: true,
                event: false,
                ..conditions()
            }),
            Decision::Wait
        );
        assert_eq!(
            decide(Conditions {
                active: true,
                visible: Some(false),
                restore_target: true,
                ..conditions()
            }),
            Decision::Restore
        );
        assert_eq!(
            decide(Conditions {
                active: true,
                enabled: false,
                visible: None,
                ..conditions()
            }),
            Decision::Restore
        );
    }
    #[test]
    fn paused_output_and_calibration_never_trigger_a_load() {
        assert_eq!(
            decide(Conditions {
                mapping: false,
                ..conditions()
            }),
            Decision::Wait
        );
        assert_eq!(
            decide(Conditions {
                suspended: true,
                ..conditions()
            }),
            Decision::Wait
        );
        assert_eq!(
            decide(Conditions {
                running: false,
                ..conditions()
            }),
            Decision::Wait
        );
        assert_eq!(
            decide(Conditions {
                active: true,
                mapping: false,
                ..conditions()
            }),
            Decision::Forget
        );
    }
    #[test]
    fn manual_changes_win_and_unknown_cursor_does_not_force_restore() {
        assert_eq!(
            decide(Conditions {
                active: true,
                manual_change: true,
                ..conditions()
            }),
            Decision::Forget
        );
        assert_eq!(
            decide(Conditions {
                active: true,
                visible: None,
                ..conditions()
            }),
            Decision::Wait
        );
        assert_eq!(
            decide(Conditions {
                visible: None,
                ..conditions()
            }),
            Decision::Wait
        );
    }
    #[test]
    fn a_new_target_and_failed_loads_restore_before_trying_again() {
        assert_eq!(
            decide(Conditions {
                active: true,
                settings_changed: true,
                ..conditions()
            }),
            Decision::Restore
        );
        assert_eq!(
            decide(Conditions {
                active: true,
                recovery: true,
                ..conditions()
            }),
            Decision::Restore
        );
        assert_eq!(
            decide(Conditions {
                active: true,
                recovery: true,
                suspended: true,
                ..conditions()
            }),
            Decision::Wait
        );
    }
    #[test]
    fn old_or_empty_settings_default_to_disabled() {
        let settings: CursorSwitchSettings = serde_json::from_str("{}").unwrap();
        assert!(!settings.enabled);
        assert!(settings.profile_name.is_empty());
    }
    #[test]
    fn independent_hidden_profile_and_empty_actions() {
        // A hidden profile replaces an already-active visible profile.
        assert_eq!(
            decide(Conditions {
                active: true,
                visible: Some(false),
                ..conditions()
            }),
            Decision::Enter
        );
        for active in [false, true] {
            for visible in [Some(true), Some(false)] {
                assert_eq!(
                    decide(Conditions {
                        active,
                        visible,
                        has_target: false,
                        ..conditions()
                    }),
                    Decision::Wait
                );
            }
        }
        // Restore has nothing to do if no automatic switch has happened yet.
        assert_eq!(
            decide(Conditions {
                visible: Some(false),
                restore_target: true,
                ..conditions()
            }),
            Decision::Wait
        );
    }
    #[test]
    fn migrates_legacy_settings_and_preserves_explicit_empty_targets() {
        let legacy: CursorSwitchSettings =
            serde_json::from_str(r#"{"enabled":true,"profileName":"Menu"}"#).unwrap();
        assert_eq!(legacy.hidden_profile_name, RESTORE_PREVIOUS);
        for hidden in ["", "Battle", RESTORE_PREVIOUS] {
            let settings = CursorSwitchSettings {
                enabled: true,
                profile_name: "Menu".into(),
                hidden_profile_name: hidden.into(),
            };
            let roundtrip: CursorSwitchSettings =
                serde_json::from_str(&serde_json::to_string(&settings).unwrap()).unwrap();
            assert_eq!(roundtrip.hidden_profile_name, hidden);
        }
        let empty: CursorSwitchSettings = serde_json::from_str("{}").unwrap();
        assert!(empty.hidden_profile_name.is_empty());
    }
    #[test]
    fn manual_apply_latches_current_state_until_the_next_edge() {
        let mut edges = CursorEdges::default();
        assert!(edges.pending(Some(true)));
        edges.handled = Some(true); // successful visible action
        assert!(!edges.pending(Some(true))); // never load every poll
        assert!(edges.synchronize(Some(true), 1, 0, true));
        assert!(!edges.pending(Some(true)));
        assert!(!edges.pending(None));
        assert!(edges.pending(Some(false)));
        // Manual apply while a hide is still being debounced also wins.
        edges.synchronize(Some(false), 2, 0, true);
        assert!(!edges.pending(Some(false)));
        assert!(edges.pending(Some(true)));
        edges.synchronize(None, 3, 0, true);
        assert!(!edges.pending(Some(false))); // unknown samples cannot discard the latch
    }
    #[test]
    fn failed_actions_retry_but_no_switch_is_consumed_and_rule_saves_rearm() {
        let mut edges = CursorEdges::default();
        edges.synchronize(Some(false), 0, 0, true);
        assert!(edges.pending(Some(false)));
        assert!(edges.pending(Some(false))); // not consumed after failure
        edges.handled = Some(false); // no-switch is a successful no-op
        assert!(!edges.pending(Some(false)));
        edges.synchronize(Some(false), 0, 1, true);
        assert!(edges.pending(Some(false))); // saved settings evaluate current state
        edges.synchronize(Some(false), 0, 1, false);
        assert!(!edges.pending(Some(false))); // paused state cannot trigger on resume
    }
    #[test]
    fn rejects_short_flashes_and_requires_a_stable_hide() {
        let mut d = VisibilityDebounce::default();
        assert_eq!(d.observe(Some(true), 0), None);
        assert_eq!(d.observe(Some(true), 299), None);
        assert_eq!(d.observe(Some(true), 300), Some(true));
        assert_eq!(d.observe(Some(false), 400), None);
        assert_eq!(d.observe(Some(true), 450), None);
        assert_eq!(d.observe(Some(true), 750), Some(true));
        assert_eq!(d.observe(Some(false), 800), None);
        assert_eq!(d.observe(Some(false), 1100), Some(false));
    }
    #[test]
    fn an_unavailable_sample_is_not_treated_as_hidden() {
        let mut d = VisibilityDebounce::default();
        d.observe(Some(true), 0);
        assert_eq!(d.observe(None, 1000), None);
        assert_eq!(d.observe(Some(false), 1100), None);
        assert_eq!(d.observe(Some(false), 1400), Some(false));
    }
    #[test]
    fn temporary_profiles_keep_mappings_but_disable_competing_autoload() {
        let text = temporary_config(
            "RESET_MAPPINGS\nAUTOLOAD = ON\nS = LMOUSE\nGYRO_SENS = 0 0",
            false,
        );
        assert!(text.contains("S = LMOUSE"));
        assert!(text.contains("GYRO_SENS = 0 0"));
        assert!(!text.contains("AUTOLOAD = ON"));
        assert!(text.ends_with("AUTOLOAD = OFF\n"));
        assert!(temporary_config("S = SPACE", true).ends_with("AUTOLOAD = ON\n"));
    }
}
