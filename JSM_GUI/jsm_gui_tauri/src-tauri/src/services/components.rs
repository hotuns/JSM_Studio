use crate::runtime;
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};
use tauri::AppHandle;

pub(super) static GATE: Mutex<()> = Mutex::new(());
const OWNED_FILE: &str = "hidhide-studio-rules.json";
const LIMIT: usize = 2 * 1024 * 1024;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverInfo {
    pub status: String,
    pub error: Option<String>,
}
#[derive(Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct InventoryDevice {
    present: bool,
    gaming_device: bool,
    description: String,
    product: String,
    device_instance_path: String,
    xusb_device_instance_path: String,
    base_container_device_instance_path: String,
    base_container_device_count: u32,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InventoryGroup {
    friendly_name: String,
    devices: Vec<InventoryDevice>,
}
#[derive(Default)]
struct Snapshot {
    cloak: bool,
    inverse: bool,
    hidden: Vec<String>,
    apps: Vec<String>,
    groups: Vec<InventoryGroup>,
}
#[derive(Default, Deserialize, Serialize)]
#[serde(default)]
struct Owned {
    groups: BTreeMap<String, Vec<String>>,
    apps: Vec<String>,
    added_devices: Vec<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HidHideDevice {
    pub id: String,
    pub name: String,
    pub description: String,
    pub listed: bool,
    pub managed: bool,
    pub xinput_available: bool,
    pub shared_functions: u32,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentsStatus {
    pub supported: bool,
    pub hidhide: DriverInfo,
    pub vigem: DriverInfo,
    pub cli_available: bool,
    pub control_available: bool,
    pub cloak_enabled: bool,
    pub inverse: bool,
    pub engine_allowed: bool,
    pub engine_path: String,
    pub hidden_count: usize,
    pub managed_count: usize,
    pub devices: Vec<HidHideDevice>,
    pub error: Option<String>,
}
fn has(list: &[String], path: &str) -> bool {
    list.iter().any(|p| p.eq_ignore_ascii_case(path))
}
fn push_unique(list: &mut Vec<String>, value: String) {
    if !has(list, &value) {
        list.push(value);
    }
}
fn record_hide(owned: &mut Owned, before: &Snapshot, id: &str, paths: &[String]) {
    for path in paths {
        if !has(&before.hidden, path) {
            push_unique(&mut owned.added_devices, path.clone());
        }
        push_unique(
            owned.groups.entry(id.to_string()).or_default(),
            path.clone(),
        );
    }
}
fn restore_plan(owned: &Owned, device_id: Option<&str>) -> (Vec<String>, Vec<String>) {
    let ids: Vec<_> = owned
        .groups
        .keys()
        .filter(|id| device_id.is_none_or(|target| id.eq_ignore_ascii_case(target)))
        .cloned()
        .collect();
    let mut paths = Vec::new();
    for id in &ids {
        if let Some(group) = owned.groups.get(id) {
            for p in group {
                push_unique(&mut paths, p.clone());
            }
        }
    }
    if device_id.is_none() {
        for p in &owned.added_devices {
            push_unique(&mut paths, p.clone());
        }
    }
    paths.retain(|p| {
        has(&owned.added_devices, p)
            && !owned
                .groups
                .iter()
                .any(|(id, group)| !ids.contains(id) && has(group, p))
    });
    (ids, paths)
}

fn parse_list(text: &str, command: &str) -> Vec<String> {
    text.lines()
        .filter_map(|line| line.trim().strip_prefix(command))
        .map(|value| value.trim().trim_matches('"').to_string())
        .filter(|p| !p.is_empty())
        .collect()
}
fn parse_snapshot(text: &str) -> Result<Snapshot, String> {
    let lines: Vec<_> = text.lines().map(str::trim).collect();
    let cloak = if lines.contains(&"--cloak-on") {
        true
    } else if lines.contains(&"--cloak-off") {
        false
    } else {
        return Err("HidHide did not return its enabled state".into());
    };
    let inverse = if lines.contains(&"--inv-on") {
        true
    } else if lines.contains(&"--inv-off") {
        false
    } else {
        return Err("HidHide did not return its application mode".into());
    };
    let start = text
        .char_indices()
        .find(|(i, c)| {
            *c == '['
                && text[..*i]
                    .rsplit('\n')
                    .next()
                    .unwrap_or("")
                    .trim()
                    .is_empty()
        })
        .map(|(i, _)| i)
        .ok_or("HidHide did not return a device inventory")?;
    let groups: Vec<InventoryGroup> = serde_json::from_str(&text[start..])
        .map_err(|e| format!("Invalid HidHide inventory: {e}"))?;
    Ok(Snapshot {
        cloak,
        inverse,
        hidden: parse_list(text, "--dev-hide "),
        apps: parse_list(text, "--app-reg "),
        groups,
    })
}
fn physical(device: &InventoryDevice) -> bool {
    let joined = format!(
        "{} {} {}",
        device.device_instance_path, device.base_container_device_instance_path, device.description
    )
    .to_uppercase();
    device.present
        && device.gaming_device
        && device
            .device_instance_path
            .to_uppercase()
            .starts_with("HID\\")
        && !["VIGEM", "VIRTUAL", "ROOT\\"]
            .iter()
            .any(|s| joined.contains(s))
}
fn find_device<'a>(snapshot: &'a Snapshot, id: &str) -> Result<&'a InventoryDevice, String> {
    snapshot
        .groups
        .iter()
        .flat_map(|g| &g.devices)
        .find(|d| physical(d) && d.device_instance_path.eq_ignore_ascii_case(id))
        .ok_or_else(|| {
            "The selected physical controller is no longer available. Refresh devices.".into()
        })
}
fn device_paths(device: &InventoryDevice, xinput: bool) -> Result<Vec<String>, String> {
    let mut result = vec![device.device_instance_path.clone()];
    if xinput {
        if device.xusb_device_instance_path.is_empty() {
            return Err("This device has no identified XInput companion node. Use the standard hide option.".into());
        }
        push_unique(&mut result, device.xusb_device_instance_path.clone());
        if device
            .base_container_device_instance_path
            .to_uppercase()
            .starts_with("USB\\")
        {
            push_unique(
                &mut result,
                device.base_container_device_instance_path.clone(),
            );
        }
    }
    Ok(result)
}
fn owned_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime::runtime_dir(app)?.join(OWNED_FILE))
}
fn load_owned(app: &AppHandle) -> Result<Owned, String> {
    match fs::read(owned_path(app)?) {
        Ok(bytes) => serde_json::from_slice(&bytes)
            .map_err(|e| format!("Cannot read Studio HidHide recovery rules: {e}")),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Owned::default()),
        Err(e) => Err(e.to_string()),
    }
}
fn save_owned(app: &AppHandle, owned: &Owned) -> Result<(), String> {
    let target = owned_path(app)?;
    let temp = target.with_extension("json.tmp");
    fs::write(
        &temp,
        serde_json::to_vec_pretty(owned).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temp, target).map_err(|e| e.to_string())
}
fn cli_path() -> Option<PathBuf> {
    for env in ["ProgramW6432", "ProgramFiles", "ProgramFiles(x86)"] {
        if let Some(root) = std::env::var_os(env) {
            for vendor in [
                "Nefarius Software Solutions",
                "Nefarius Software Solutions e.U.",
                "Nefarius Software Solutions e.U",
            ] {
                for child in ["HidHideCLI.exe", "x64/HidHideCLI.exe", "x86/HidHideCLI.exe"] {
                    let path = PathBuf::from(&root)
                        .join(vendor)
                        .join("HidHide")
                        .join(child);
                    if path.is_file() {
                        return Some(path);
                    }
                }
            }
        }
    }
    None
}
fn decode(bytes: &[u8]) -> String {
    if bytes.starts_with(&[0xff, 0xfe])
        || bytes
            .iter()
            .skip(1)
            .step_by(2)
            .take(30)
            .filter(|b| **b == 0)
            .count()
            > 5
    {
        let bytes = if bytes.starts_with(&[0xff, 0xfe]) {
            &bytes[2..]
        } else {
            bytes
        };
        return String::from_utf16_lossy(
            &bytes
                .chunks_exact(2)
                .map(|b| u16::from_le_bytes([b[0], b[1]]))
                .collect::<Vec<_>>(),
        );
    }
    String::from_utf8_lossy(bytes)
        .trim_start_matches('\u{feff}')
        .to_string()
}
fn run_cli(path: &Path, args: &[String]) -> Result<String, String> {
    let mut command = Command::new(path);
    command
        .args(args)
        .current_dir(path.parent().ok_or("Invalid HidHide path")?)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let mut child = command
        .spawn()
        .map_err(|e| format!("Could not start HidHide CLI: {e}"))?;
    let stdout = child.stdout.take().ok_or("Missing CLI output")?;
    let stderr = child.stderr.take().ok_or("Missing CLI error output")?;
    let read = |stream: Box<dyn Read + Send>| {
        thread::spawn(move || {
            let mut bytes = Vec::new();
            let _ = stream.take((LIMIT + 1) as u64).read_to_end(&mut bytes);
            bytes
        })
    };
    let out = read(Box::new(stdout));
    let err = read(Box::new(stderr));
    let start = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if start.elapsed() < Duration::from_secs(10) => {
                thread::sleep(Duration::from_millis(25))
            }
            result => {
                let _ = child.kill();
                let _ = child.wait();
                let _ = out.join();
                let _ = err.join();
                return Err(format!(
                    "HidHide CLI timed out or could not be read: {result:?}"
                ));
            }
        }
    };
    let output = out.join().map_err(|_| "HidHide output reader failed")?;
    let error = err.join().map_err(|_| "HidHide error reader failed")?;
    if output.len() > LIMIT || error.len() > LIMIT {
        return Err("HidHide output exceeded its limit".into());
    }
    if !status.success() {
        return Err(format!(
            "HidHide CLI failed ({}). Close HidHide Configuration Client and retry. {}",
            status.code().unwrap_or(-1),
            decode(&error).trim()
        ));
    }
    Ok(decode(&output))
}
fn snapshot(path: &Path) -> Result<Snapshot, String> {
    let output = run_cli(
        path,
        &[
            "--cloak-state",
            "--inv-state",
            "--dev-list",
            "--app-list",
            "--dev-gaming",
        ]
        .map(String::from),
    )?;
    if let Ok(value) = parse_snapshot(&output) {
        return Ok(value);
    }
    // Old CLI builds can stop printing at a non-ASCII device description.
    // Never salvage incomplete JSON or treat truncated records as complete devices.
    let flags = run_cli(
        path,
        &["--cloak-state", "--inv-state", "--dev-list", "--app-list"].map(String::from),
    )?;
    let inventory = super::hid_inventory::enumerate()?;
    parse_snapshot(&format!("{flags}\n{inventory}"))
}

#[cfg(windows)]
pub(super) fn driver(service: &str) -> DriverInfo {
    use windows_sys::Win32::{
        Foundation::{GetLastError, ERROR_SERVICE_DOES_NOT_EXIST},
        System::Services::*,
    };
    let service: Vec<u16> = service.encode_utf16().chain(Some(0)).collect();
    unsafe {
        let manager = OpenSCManagerW(std::ptr::null(), std::ptr::null(), SC_MANAGER_CONNECT);
        if manager.is_null() {
            return DriverInfo {
                status: "unknown".into(),
                error: Some(std::io::Error::last_os_error().to_string()),
            };
        }
        let handle = OpenServiceW(manager, service.as_ptr(), SERVICE_QUERY_STATUS);
        if handle.is_null() {
            let code = GetLastError();
            CloseServiceHandle(manager);
            return DriverInfo {
                status: if code == ERROR_SERVICE_DOES_NOT_EXIST {
                    "missing"
                } else {
                    "unknown"
                }
                .into(),
                error: if code == ERROR_SERVICE_DOES_NOT_EXIST {
                    None
                } else {
                    Some(format!("Windows error {code}"))
                },
            };
        }
        let mut status: SERVICE_STATUS_PROCESS = std::mem::zeroed();
        let mut needed = 0;
        let ok = QueryServiceStatusEx(
            handle,
            SC_STATUS_PROCESS_INFO,
            &mut status as *mut _ as *mut u8,
            std::mem::size_of_val(&status) as u32,
            &mut needed,
        );
        let error = if ok == 0 {
            Some(std::io::Error::last_os_error().to_string())
        } else {
            None
        };
        CloseServiceHandle(handle);
        CloseServiceHandle(manager);
        DriverInfo {
            status: if ok == 0 {
                "unknown"
            } else if status.dwCurrentState == SERVICE_RUNNING {
                "running"
            } else {
                "stopped"
            }
            .into(),
            error,
        }
    }
}
#[cfg(not(windows))]
pub(super) fn driver(_: &str) -> DriverInfo {
    DriverInfo {
        status: "unsupported".into(),
        error: None,
    }
}

fn status_inner(app: &AppHandle) -> Result<ComponentsStatus, String> {
    let backend = runtime::read_backend_choice(app)?;
    let engine = runtime::jsm_executable_path(app, &backend)?
        .to_string_lossy()
        .to_string();
    let cli = cli_path();
    let owned = load_owned(app)?;
    let mut result = ComponentsStatus {
        supported: cfg!(windows),
        hidhide: driver("HidHide"),
        vigem: driver("ViGEmBus"),
        cli_available: cli.is_some(),
        control_available: false,
        cloak_enabled: false,
        inverse: false,
        engine_allowed: false,
        engine_path: engine.clone(),
        hidden_count: 0,
        managed_count: owned.added_devices.len(),
        devices: vec![],
        error: None,
    };
    if let Some(cli) = cli {
        match snapshot(&cli) {
            Err(e) => result.error = Some(e),
            Ok(s) => {
                result.control_available = true;
                result.cloak_enabled = s.cloak;
                result.inverse = s.inverse;
                result.engine_allowed = !s.inverse && has(&s.apps, &engine);
                result.hidden_count = s.hidden.len();
                for group in &s.groups {
                    for d in group.devices.iter().filter(|d| physical(d)) {
                        result.devices.push(HidHideDevice {
                            id: d.device_instance_path.clone(),
                            name: group.friendly_name.clone(),
                            description: if d.product.is_empty() {
                                d.description.clone()
                            } else {
                                d.product.clone()
                            },
                            listed: has(&s.hidden, &d.device_instance_path)
                                || (!d.xusb_device_instance_path.is_empty()
                                    && has(&s.hidden, &d.xusb_device_instance_path))
                                || (!d.base_container_device_instance_path.is_empty()
                                    && has(&s.hidden, &d.base_container_device_instance_path)),
                            managed: owned.groups.iter().any(|(id, paths)| {
                                id.eq_ignore_ascii_case(&d.device_instance_path)
                                    && paths
                                        .iter()
                                        .any(|p| has(&s.hidden, p) && has(&owned.added_devices, p))
                            }),
                            xinput_available: !d.xusb_device_instance_path.is_empty(),
                            shared_functions: d.base_container_device_count,
                        });
                    }
                }
            }
        }
    }
    Ok(result)
}
pub fn get_status(app: &AppHandle) -> Result<ComponentsStatus, String> {
    let _gate = GATE.lock().map_err(|_| "Component control lock failed")?;
    status_inner(app)
}
pub fn open_tool(kind: &str) -> Result<(), String> {
    if !cfg!(windows) {
        return Err("Component tools require Windows".into());
    }
    let mut command = match kind {
        "hidhide" => {
            let cli = cli_path().ok_or("HidHide management tools were not found")?;
            let folder = cli.parent().ok_or("Invalid HidHide location")?;
            let candidates = [
                folder.join("HidHideClient.exe"),
                folder.join("x64/HidHideClient.exe"),
                folder.parent().unwrap_or(folder).join("HidHideClient.exe"),
            ];
            let path = candidates.into_iter().find(|p| p.is_file()).ok_or(
                "HidHide Configuration Client was not found. Repair the official installation.",
            )?;
            Command::new(path)
        }
        "gamepads" => {
            let system = std::env::var_os("SystemRoot").ok_or("Windows directory was not found")?;
            let mut command = Command::new(PathBuf::from(system).join("System32/control.exe"));
            command.arg("joy.cpl");
            command
        }
        _ => return Err("Unknown component tool".into()),
    };
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    command.spawn().map_err(|e| e.to_string())?;
    Ok(())
}
pub fn manage(
    app: &AppHandle,
    action: &str,
    device_id: &str,
    xinput: bool,
) -> Result<ComponentsStatus, String> {
    let _gate = GATE.lock().map_err(|_| "Component control lock failed")?;
    let cli = cli_path().ok_or("Install HidHide first, then refresh")?;
    let before = snapshot(&cli)?;
    let mut owned = load_owned(app)?;
    let mut args = Vec::new();
    match action {
        "hide" | "allow" => {
            if before.inverse {
                return Err("HidHide uses an inverted application list. Restore normal mode in the official client before using quick controls; Studio will not change existing mode.".into());
            }
            let backend = runtime::read_backend_choice(app)?;
            let engine = runtime::jsm_executable_path(app, &backend)?;
            if !engine.is_file() {
                return Err("JoyShockMapper executable is missing".into());
            }
            let engine = engine.to_string_lossy().to_string();
            let paths = if action == "hide" {
                device_paths(find_device(&before, device_id)?, xinput)?
            } else {
                Vec::new()
            };
            let mut engines = vec![engine.clone()];
            for backend in ["SDL", "legacy"] {
                if let Ok(path) = runtime::jsm_executable_path(app, backend) {
                    if path.is_file() {
                        push_unique(&mut engines, path.to_string_lossy().to_string());
                    }
                }
            }
            for path in engines {
                if !has(&before.apps, &path) {
                    push_unique(&mut owned.apps, path.clone());
                }
                args.extend(["--app-reg".into(), path]);
            }
            if action == "hide" {
                record_hide(&mut owned, &before, device_id, &paths);
                for p in &paths {
                    args.extend(["--dev-hide".into(), p.clone()]);
                }
                args.push("--cloak-on".into());
            }
            // Persist recovery information before any write to the driver.
            save_owned(app, &owned)?;
            run_cli(&cli, &args)?;
            let after = snapshot(&cli)?;
            if after.inverse || !has(&after.apps, &engine) {
                return Err(
                    "HidHide did not confirm JSM access. Refresh or restore Studio rules.".into(),
                );
            }
            if action == "hide" && (!after.cloak || paths.iter().any(|p| !has(&after.hidden, p))) {
                return Err("HidHide did not confirm the requested hide state. Refresh or restore Studio rules.".into());
            }
        }
        "show" | "restore" => {
            let (ids, remove) = restore_plan(
                &owned,
                if action == "restore" {
                    None
                } else {
                    Some(device_id)
                },
            );
            for p in &remove {
                args.extend(["--dev-unhide".into(), p.clone()]);
            }
            if !args.is_empty() {
                run_cli(&cli, &args)?;
            }
            let after = snapshot(&cli)?;
            if remove.iter().any(|p| has(&after.hidden, p)) {
                return Err(
                    "HidHide did not confirm restore. Recovery rules were retained; retry.".into(),
                );
            }
            for id in ids {
                owned.groups.remove(&id);
            }
            owned.added_devices.retain(|p| !has(&remove, p));
            // Keep allow-list entries so another still-hidden device cannot lock JSM out.
            save_owned(app, &owned)?;
        }
        _ => return Err("Unknown component control action".into()),
    }
    status_inner(app)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn read_only_windows_driver_probe() {
        for name in ["HidHide", "ViGEmBus"] {
            let result = driver(name);
            eprintln!("{name}: {}", result.status);
            assert!(["running", "missing", "stopped", "unknown", "unsupported"]
                .contains(&result.status.as_str()));
        }
        if let Some(path) = cli_path() {
            match snapshot(&path) {
                Ok(s) => eprintln!(
                    "HidHide CLI read-only probe: {} device groups",
                    s.groups.len()
                ),
                Err(e) => eprintln!("HidHide CLI read-only probe unavailable: {e}"),
            }
        }
    }
    fn inventory() -> String {
        r#"--cloak-on
--inv-off
--app-reg "C:\工具\JoyShockMapper.exe"
--dev-hide "HID\VID_1234&PID_5678\one"
[{"friendlyName":"测试手柄","devices":[{"present":true,"gamingDevice":true,"deviceInstancePath":"HID\\VID_1234&PID_5678\\one","xusbDeviceInstancePath":"USB\\VID_1234&PID_5678\\xusb","baseContainerDeviceInstancePath":"USB\\VID_1234&PID_5678\\receiver","baseContainerDeviceCount":3}]}]"#.into()
    }
    #[test]
    fn reads_real_cli_flags_lists_and_unicode_json() {
        let s = parse_snapshot(&inventory()).unwrap();
        assert!(s.cloak);
        assert!(!s.inverse);
        assert_eq!(s.groups[0].friendly_name, "测试手柄");
        assert!(has(&s.apps, r"c:\工具\joyshockmapper.exe"));
        assert_eq!(s.hidden.len(), 1);
    }
    #[test]
    fn rejects_incomplete_status_instead_of_assuming_safe_defaults() {
        assert!(parse_snapshot("[]").is_err());
        assert!(parse_snapshot("--cloak-on\n[]").is_err());
        assert!(parse_snapshot("--cloak-off\n--inv-off\nINVALID").is_err());
    }
    #[test]
    fn only_selected_physical_gaming_device_is_eligible() {
        let s = parse_snapshot(&inventory()).unwrap();
        assert!(find_device(&s, "missing").is_err());
        let mut d = s.groups[0].devices[0].clone();
        assert!(physical(&d));
        d.description = "Virtual Xbox".into();
        assert!(!physical(&d));
        d.description.clear();
        d.gaming_device = false;
        assert!(!physical(&d));
    }
    #[test]
    fn xinput_companions_require_explicit_opt_in() {
        let s = parse_snapshot(&inventory()).unwrap();
        let d = &s.groups[0].devices[0];
        assert_eq!(device_paths(d, false).unwrap().len(), 1);
        assert_eq!(device_paths(d, true).unwrap().len(), 3);
        let mut d = d.clone();
        d.xusb_device_instance_path.clear();
        assert!(device_paths(&d, true).is_err());
    }
    #[test]
    fn lists_preserve_spaces_and_quoted_paths() {
        assert_eq!(
            parse_list(
                "--app-reg \"C:\\Program Files\\JSM.exe\"\n--cloak-on",
                "--app-reg "
            ),
            vec![r"C:\Program Files\JSM.exe"]
        );
    }
    #[test]
    fn utf16_cli_output_is_supported() {
        let value = inventory();
        let bytes: Vec<_> = value.encode_utf16().flat_map(u16::to_le_bytes).collect();
        assert_eq!(decode(&bytes), value);
    }
    #[test]
    fn rules_only_record_new_paths_and_survive_restart() {
        let mut o = Owned::default();
        o.groups.insert("pad".into(), vec!["owned".into()]);
        let restored: Owned = serde_json::from_slice(&serde_json::to_vec(&o).unwrap()).unwrap();
        assert_eq!(restored.groups["pad"], vec!["owned"]);
        assert!(!restored
            .groups
            .values()
            .flatten()
            .any(|v| v == "other-tool"));
    }
    #[test]
    fn restore_preserves_preexisting_paths_and_shared_receiver_dependencies() {
        let mut s = Snapshot::default();
        s.hidden = vec!["external".into()];
        let mut o = Owned::default();
        record_hide(
            &mut o,
            &s,
            "pad1",
            &["pad1".into(), "receiver".into(), "external".into()],
        );
        s.hidden.extend(["pad1".into(), "receiver".into()]);
        record_hide(&mut o, &s, "pad2", &["pad2".into(), "receiver".into()]);
        assert_eq!(restore_plan(&o, Some("pad1")).1, vec!["pad1"]);
        let all = restore_plan(&o, None).1;
        assert!(has(&all, "pad1"));
        assert!(has(&all, "pad2"));
        assert!(has(&all, "receiver"));
        assert!(!has(&all, "external"));
    }
    #[test]
    fn failed_hide_journal_remains_recoverable_even_if_device_disconnected() {
        let mut o = Owned::default();
        record_hide(&mut o, &Snapshot::default(), "gone", &["gone".into()]);
        let reloaded: Owned = serde_json::from_slice(&serde_json::to_vec(&o).unwrap()).unwrap();
        assert_eq!(restore_plan(&reloaded, None).1, vec!["gone"]);
    }
}
