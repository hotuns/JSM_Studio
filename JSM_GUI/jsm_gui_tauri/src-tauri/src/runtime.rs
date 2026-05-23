use std::{
  fs,
  path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

pub const DEFAULT_PROFILE_NAME: &str = "Profile 1";
pub const PROFILE_LIBRARY_RELATIVE: &str = "profiles-library";
pub const DEFAULT_PROFILE_RELATIVE: &str = "profiles-library/Profile 1.txt";
pub const CALIBRATION_PROFILE_RELATIVE: &str = "GyroConfigs/_3Dcalibrate.txt";
pub const CALIBRATION_COMMAND: &str = "RecalibrateGyro.txt";

const DEFAULT_BACKEND_CHOICE: &str = "SDL";
const DEFAULT_CALIBRATION_SECONDS: u32 = 5;
const BACKEND_FILE_NAME: &str = "backend.json";
const GUI_STATE_FILE_NAME: &str = "gui-state.json";
const STARTUP_FILE_NAME: &str = "OnStartUp.txt";
const CALIBRATION_COMMAND_FILE_NAME: &str = "RecalibrateGyro.txt";
const MAPPING_DISABLED_FILE_NAME: &str = "MappingDisabled.txt";
const MAPPING_DISABLED_RELATIVE: &str = MAPPING_DISABLED_FILE_NAME;
const PROFILE_TEMPLATE_LINES: [&str; 4] = [
  "RESET_MAPPINGS",
  "AUTOCONNECT = ON",
  "TELEMETRY_ENABLED = ON",
  "TELEMETRY_PORT = 8974",
];
const STARTUP_HEADER_LINES: [&str; 2] = [
  "TELEMETRY_ENABLED = ON",
  "TELEMETRY_PORT = 8974",
];
const MAPPING_DISABLED_LINES: [&str; 6] = [
  "RESET_MAPPINGS",
  "AUTOCONNECT = ON",
  "TELEMETRY_ENABLED = ON",
  "TELEMETRY_PORT = 8974",
  "AUTOLOAD = OFF",
  "VIRTUAL_CONTROLLER = NONE",
];
const SUPPORT_FILE_NAMES: [&str; 2] = ["OnReset.txt", "OnReconnect.txt"];

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeMappingState {
  pub active_profile_path: String,
  pub mapping_enabled: bool,
  pub autoload_enabled: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoloadRule {
  pub process_name: String,
  pub file_name: String,
  pub kind: String,
  pub profile_name: Option<String>,
  pub profile_path: Option<String>,
  pub missing_profile: bool,
}

pub fn ensure_required_files(app: &AppHandle) -> Result<(), String> {
  let backend = read_backend_choice(app)?;

  ensure_dir(&runtime_dir(app)?)?;
  ensure_dir(&profile_library_dir(app)?)?;
  ensure_dir(&calibration_dir(app)?)?;
  ensure_dir(&autoload_dir(app)?)?;

  migrate_bundled_runtime_data(app, &backend)?;
  ensure_runtime_support_files(app, &backend)?;

  ensure_file(
    &absolute_profile_path(app, DEFAULT_PROFILE_RELATIVE)?,
    &profile_template_text(),
  )?;
  ensure_mapping_disabled_file(app)?;

  let state = ensure_runtime_mapping_state(app)?;
  ensure_file(
    &absolute_profile_path(app, &state.active_profile_path)?,
    &profile_template_text(),
  )?;
  write_startup_file(app, &state)?;
  let seconds = read_calibration_seconds(app)?;
  write_calibration_command_file(app, seconds)?;

  Ok(())
}

pub fn read_backend_choice(app: &AppHandle) -> Result<String, String> {
  let path = backend_file(app)?;
  let raw = match fs::read_to_string(path) {
    Ok(value) => value,
    Err(_) => return Ok(DEFAULT_BACKEND_CHOICE.to_string()),
  };

  match serde_json::from_str::<String>(&raw) {
    Ok(value) => Ok(normalize_backend_choice(&value).to_string()),
    Err(_) => Ok(DEFAULT_BACKEND_CHOICE.to_string()),
  }
}

pub fn write_backend_choice(app: &AppHandle, choice: &str) -> Result<String, String> {
  let normalized = normalize_backend_choice(choice).to_string();
  let path = backend_file(app)?;
  ensure_parent_dir(&path)?;
  let content = serde_json::to_string(&normalized)
    .map_err(|error| format!("Failed to serialize backend choice: {error}"))?;
  fs::write(path, content).map_err(|error| format!("Failed to persist backend choice: {error}"))?;
  Ok(normalized)
}

pub fn read_calibration_seconds(app: &AppHandle) -> Result<u32, String> {
  let path = calibration_command_file(app)?;
  let content = match fs::read_to_string(path) {
    Ok(value) => value,
    Err(_) => return Ok(DEFAULT_CALIBRATION_SECONDS),
  };

  Ok(parse_sleep_seconds(&content).unwrap_or(DEFAULT_CALIBRATION_SECONDS))
}

pub fn write_calibration_seconds(app: &AppHandle, seconds: u32) -> Result<u32, String> {
  write_calibration_command_file(app, seconds)?;
  Ok(seconds)
}

pub fn get_active_profile(app: &AppHandle) -> Result<(String, String), String> {
  ensure_required_files(app)?;
  let relative = read_runtime_mapping_state(app)?.active_profile_path;
  let absolute = absolute_profile_path(app, &relative)?;
  let content = fs::read_to_string(absolute)
    .map_err(|error| format!("Failed to read active profile: {error}"))?;
  Ok((relative, content))
}

pub fn set_active_profile(app: &AppHandle, relative: &str) -> Result<(), String> {
  ensure_required_files(app)?;
  let absolute = absolute_profile_path(app, relative)?;
  ensure_file(&absolute, "")?;
  let mut state = read_runtime_mapping_state(app)?;
  state.active_profile_path = normalize_relative_profile_path(Some(relative))
    .ok_or_else(|| format!("Invalid profile path: {relative}"))?;
  persist_runtime_mapping_state(app, &state)?;
  write_startup_file(app, &state)?;
  Ok(())
}

pub fn write_active_profile(
  app: &AppHandle,
  relative: Option<&str>,
  content: &str,
) -> Result<String, String> {
  ensure_required_files(app)?;
  let resolved = match normalize_relative_profile_path(relative) {
    Some(value) => value,
    None => read_runtime_mapping_state(app)?.active_profile_path,
  };
  let absolute = absolute_profile_path(app, &resolved)?;
  ensure_file(&absolute, "")?;
  fs::write(&absolute, content).map_err(|error| format!("Failed to write profile: {error}"))?;
  let mut state = read_runtime_mapping_state(app)?;
  state.active_profile_path = resolved.clone();
  persist_runtime_mapping_state(app, &state)?;
  write_startup_file(app, &state)?;
  Ok(resolved)
}

pub fn list_library_profiles(app: &AppHandle) -> Result<Vec<String>, String> {
  ensure_library_dir(app)?;
  let mut names = Vec::new();
  let entries = fs::read_dir(profile_library_dir(app)?)
    .map_err(|error| format!("Failed to read profile library: {error}"))?;

  for entry in entries {
    let entry = entry.map_err(|error| format!("Failed to read profile entry: {error}"))?;
    let path = entry.path();
    if path.extension().and_then(|ext| ext.to_str()) != Some("txt") {
      continue;
    }
    if let Some(stem) = path.file_stem().and_then(|value| value.to_str()) {
      names.push(stem.to_string());
    }
  }

  names.sort_by(|left, right| {
    left
      .to_ascii_lowercase()
      .cmp(&right.to_ascii_lowercase())
      .then_with(|| left.cmp(right))
  });

  Ok(names)
}

pub fn save_library_profile(app: &AppHandle, name: &str, content: &str) -> Result<String, String> {
  ensure_library_dir(app)?;
  let safe_name = sanitize_profile_name(name);
  let path = library_profile_path(app, &safe_name)?;
  fs::write(path, content).map_err(|error| format!("Failed to save profile: {error}"))?;
  Ok(safe_name)
}

pub fn load_library_profile(app: &AppHandle, name: &str) -> Result<String, String> {
  ensure_library_dir(app)?;
  let safe_name = sanitize_profile_name(name);
  let path = library_profile_path(app, &safe_name)?;
  fs::read_to_string(path).map_err(|error| format!("Failed to load profile: {error}"))
}

pub fn create_library_profile(
  app: &AppHandle,
  preferred_base_name: Option<&str>,
) -> Result<(String, String), String> {
  ensure_required_files(app)?;
  let name = generate_unique_profile_name(app, preferred_base_name)?;
  let relative = relative_profile_path_from_name(&name);
  let absolute = absolute_profile_path(app, &relative)?;
  let content = profile_template_text();
  fs::write(&absolute, &content).map_err(|error| format!("Failed to create profile: {error}"))?;
  set_active_profile_state(app, &relative)?;
  Ok((relative, content))
}

pub fn rename_library_profile(
  app: &AppHandle,
  old_name: &str,
  new_name: &str,
) -> Result<(String, String), String> {
  ensure_required_files(app)?;
  let safe_old = sanitize_profile_name(old_name);
  let mut safe_new = sanitize_profile_name(new_name);

  if safe_new.is_empty() {
    return Err("New profile name cannot be empty.".to_string());
  }

  if safe_old.eq_ignore_ascii_case(&safe_new) {
    let relative = relative_profile_path_from_name(&safe_old);
    let content = fs::read_to_string(absolute_profile_path(app, &relative)?)
      .map_err(|error| format!("Failed to load profile during rename: {error}"))?;
    return Ok((relative, content));
  }

  let existing = list_library_profiles(app)?;
  let has_conflict = existing
    .iter()
    .filter(|entry| !entry.eq_ignore_ascii_case(&safe_old))
    .any(|entry| entry.eq_ignore_ascii_case(&safe_new));

  if has_conflict {
    safe_new = generate_unique_profile_name(app, Some(&safe_new))?;
  }

  let old_relative = relative_profile_path_from_name(&safe_old);
  let new_relative = relative_profile_path_from_name(&safe_new);
  let old_absolute = absolute_profile_path(app, &old_relative)?;
  let new_absolute = absolute_profile_path(app, &new_relative)?;

  ensure_file(&old_absolute, "")?;
  fs::rename(&old_absolute, &new_absolute)
    .map_err(|error| format!("Failed to rename profile: {error}"))?;

  let active = read_runtime_mapping_state(app)?.active_profile_path;
  if active.eq_ignore_ascii_case(&old_relative) {
    set_active_profile_state(app, &new_relative)?;
  }

  update_autoload_profile_references(app, &old_relative, &new_relative)?;

  let content = fs::read_to_string(&new_absolute)
    .map_err(|error| format!("Failed to read renamed profile: {error}"))?;
  Ok((new_relative, content))
}

pub fn copy_active_profile(app: &AppHandle) -> Result<(String, String), String> {
  ensure_required_files(app)?;
  let (active_relative, content) = get_active_profile(app)?;
  let active_name = profile_name_from_relative_path(&active_relative);
  let copy_name = generate_copy_profile_name(app, &active_name)?;
  let copy_relative = relative_profile_path_from_name(&copy_name);
  let copy_absolute = absolute_profile_path(app, &copy_relative)?;
  fs::write(&copy_absolute, &content).map_err(|error| format!("Failed to copy profile: {error}"))?;
  set_active_profile_state(app, &copy_relative)?;
  Ok((copy_relative, content))
}

pub fn delete_library_profile(app: &AppHandle, name: &str) -> Result<Option<(String, String)>, String> {
  ensure_required_files(app)?;
  let safe_name = sanitize_profile_name(name);
  let relative = relative_profile_path_from_name(&safe_name);
  let absolute = absolute_profile_path(app, &relative)?;
  let _ = fs::remove_file(absolute);

  let active = read_runtime_mapping_state(app)?.active_profile_path;
  if active.eq_ignore_ascii_case(&relative) {
    let remaining = list_library_profiles(app)?;
    if let Some(fallback_name) = remaining.first() {
      let fallback_relative = relative_profile_path_from_name(fallback_name);
      set_active_profile_state(app, &fallback_relative)?;
      let content = fs::read_to_string(absolute_profile_path(app, &fallback_relative)?)
        .map_err(|error| format!("Failed to read fallback profile: {error}"))?;
      return Ok(Some((fallback_relative, content)));
    }

    set_active_profile_state(app, DEFAULT_PROFILE_RELATIVE)?;
    ensure_file(&absolute_profile_path(app, DEFAULT_PROFILE_RELATIVE)?, "")?;
    return Ok(Some((DEFAULT_PROFILE_RELATIVE.to_string(), String::new())));
  }

  Ok(None)
}

pub fn read_calibration_preset(app: &AppHandle) -> Result<String, String> {
  ensure_required_files(app)?;
  let path = calibration_preset_path(app)?;
  ensure_file(&path, "")?;
  fs::read_to_string(path).map_err(|error| format!("Failed to read calibration preset: {error}"))
}

pub fn save_calibration_preset(app: &AppHandle, content: &str) -> Result<(), String> {
  ensure_required_files(app)?;
  let path = calibration_preset_path(app)?;
  fs::write(path, content).map_err(|error| format!("Failed to save calibration preset: {error}"))
}

pub fn calibration_preset_exists(app: &AppHandle) -> Result<bool, String> {
  Ok(calibration_preset_path(app)?.exists())
}

pub fn profile_name_from_relative_path(relative: &str) -> String {
  Path::new(relative)
    .file_stem()
    .and_then(|value| value.to_str())
    .unwrap_or(DEFAULT_PROFILE_NAME)
    .to_string()
}

pub fn calibration_profile_relative() -> String {
  CALIBRATION_PROFILE_RELATIVE.to_string()
}

pub fn get_runtime_mapping_state(app: &AppHandle) -> Result<RuntimeMappingState, String> {
  ensure_required_files(app)?;
  read_runtime_mapping_state(app)
}

pub fn set_mapping_enabled(app: &AppHandle, enabled: bool) -> Result<RuntimeMappingState, String> {
  ensure_required_files(app)?;
  let mut state = read_runtime_mapping_state(app)?;
  state.mapping_enabled = enabled;
  persist_runtime_mapping_state(app, &state)?;
  write_startup_file(app, &state)?;
  Ok(state)
}

pub fn set_autoload_enabled(app: &AppHandle, enabled: bool) -> Result<RuntimeMappingState, String> {
  ensure_required_files(app)?;
  let mut state = read_runtime_mapping_state(app)?;
  state.autoload_enabled = enabled;
  persist_runtime_mapping_state(app, &state)?;
  write_startup_file(app, &state)?;
  Ok(state)
}

pub fn effective_profile_for_state(state: &RuntimeMappingState) -> String {
  if state.mapping_enabled {
    state.active_profile_path.clone()
  } else {
    MAPPING_DISABLED_RELATIVE.to_string()
  }
}

pub fn list_autoload_rules(app: &AppHandle) -> Result<Vec<AutoloadRule>, String> {
  ensure_required_files(app)?;
  let dir = autoload_dir(app)?;
  ensure_dir(&dir)?;

  let mut rules = Vec::new();
  let entries = fs::read_dir(&dir)
    .map_err(|error| format!("Failed to read AutoLoad directory: {error}"))?;

  for entry in entries {
    let entry = entry.map_err(|error| format!("Failed to read AutoLoad entry: {error}"))?;
    let path = entry.path();
    if path.extension().and_then(|ext| ext.to_str()) != Some("txt") {
      continue;
    }
    rules.push(autoload_rule_from_path(app, &path)?);
  }

  rules.sort_by(|left, right| {
    left
      .process_name
      .to_ascii_lowercase()
      .cmp(&right.process_name.to_ascii_lowercase())
      .then_with(|| left.process_name.cmp(&right.process_name))
  });

  Ok(rules)
}

pub fn save_autoload_rule(
  app: &AppHandle,
  process_name: &str,
  profile_name: &str,
) -> Result<AutoloadRule, String> {
  ensure_required_files(app)?;
  let process = sanitize_process_name(process_name)?;
  let safe_profile = sanitize_profile_name(profile_name);
  let profile_relative = relative_profile_path_from_name(&safe_profile);
  let profile_absolute = absolute_profile_path(app, &profile_relative)?;
  if !profile_absolute.exists() {
    return Err(format!("Profile does not exist: {safe_profile}"));
  }

  let path = autoload_rule_path(app, &process)?;
  ensure_parent_dir(&path)?;
  fs::write(&path, format!("{profile_relative}\n"))
    .map_err(|error| format!("Failed to save AutoLoad rule: {error}"))?;
  autoload_rule_from_path(app, &path)
}

pub fn delete_autoload_rule(app: &AppHandle, process_name: &str) -> Result<bool, String> {
  ensure_required_files(app)?;
  let process = sanitize_process_name(process_name)?;
  let path = autoload_rule_path(app, &process)?;
  match fs::remove_file(path) {
    Ok(()) => Ok(true),
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(true),
    Err(error) => Err(format!("Failed to delete AutoLoad rule: {error}")),
  }
}

pub fn sanitize_profile_name(raw_name: &str) -> String {
  let trimmed = raw_name.trim();
  let cleaned: String = trimmed
    .chars()
    .filter(|character| {
      character.is_alphanumeric()
        || matches!(character, '-' | '_' | '.' | ',' | '(' | ')' | '\'' | ' ')
    })
    .take(80)
    .collect();

  let normalized = cleaned.trim_end_matches(['.', ' ']);
  if normalized.is_empty() {
    "Profile".to_string()
  } else {
    normalized.to_string()
  }
}

pub fn runtime_dir(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(
    app
      .path()
      .app_data_dir()
      .map_err(|error| format!("Failed to resolve app data directory: {error}"))?
      .join("jsm-runtime"),
  )
}

pub fn backend_bin_dir(app: &AppHandle, backend: &str) -> Result<PathBuf, String> {
  let path = bundled_shared_dir(app)?.join(normalize_backend_choice(backend));
  if path.exists() {
    Ok(path)
  } else {
    Err(format!("Backend directory not found: {}", path.display()))
  }
}

pub fn jsm_executable_path(app: &AppHandle, backend: &str) -> Result<PathBuf, String> {
  let file_name = if cfg!(target_os = "windows") {
    "JoyShockMapper.exe"
  } else {
    "JoyShockMapper"
  };
  Ok(backend_bin_dir(app, backend)?.join(file_name))
}

pub fn console_injector_path(app: &AppHandle, backend: &str) -> Result<PathBuf, String> {
  let file_name = if cfg!(target_os = "windows") {
    "jsm-console-injector.exe"
  } else {
    "jsm-console-injector"
  };
  Ok(backend_bin_dir(app, backend)?.join(file_name))
}

fn backend_file(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(
    app
      .path()
      .app_data_dir()
      .map_err(|error| format!("Failed to resolve app data directory: {error}"))?
      .join(BACKEND_FILE_NAME),
  )
}

fn bundled_shared_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let mut candidates = Vec::new();

  if let Ok(resource_dir) = app.path().resource_dir() {
    candidates.push(resource_dir.join("bin"));
  }

  candidates.push(
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
      .join("..")
      .join("..")
      .join("jsm-gui-app")
      .join("bin"),
  );

  candidates
    .into_iter()
    .find(|candidate| candidate.exists())
    .ok_or_else(|| "Unable to resolve bundled bin directory for JoyShockMapper sidecars.".to_string())
}

fn profile_library_dir(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(runtime_dir(app)?.join(PROFILE_LIBRARY_RELATIVE))
}

fn calibration_dir(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(runtime_dir(app)?.join("GyroConfigs"))
}

fn autoload_dir(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(runtime_dir(app)?.join("AutoLoad"))
}

fn calibration_preset_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(calibration_dir(app)?.join("_3Dcalibrate.txt"))
}

fn startup_file(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(runtime_dir(app)?.join(STARTUP_FILE_NAME))
}

fn gui_state_file(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(
    app
      .path()
      .app_data_dir()
      .map_err(|error| format!("Failed to resolve app data directory: {error}"))?
      .join(GUI_STATE_FILE_NAME),
  )
}

fn mapping_disabled_file(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(runtime_dir(app)?.join(MAPPING_DISABLED_FILE_NAME))
}

fn calibration_command_file(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(runtime_dir(app)?.join(CALIBRATION_COMMAND_FILE_NAME))
}

fn ensure_library_dir(app: &AppHandle) -> Result<(), String> {
  ensure_dir(&profile_library_dir(app)?)
}

fn ensure_dir(path: &Path) -> Result<(), String> {
  fs::create_dir_all(path).map_err(|error| format!("Failed to create directory {}: {error}", path.display()))
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
  match path.parent() {
    Some(parent) => ensure_dir(parent),
    None => Ok(()),
  }
}

fn ensure_file(path: &Path, default_content: &str) -> Result<(), String> {
  if path.exists() {
    return Ok(());
  }

  ensure_parent_dir(path)?;
  fs::write(path, default_content)
    .map_err(|error| format!("Failed to initialize file {}: {error}", path.display()))
}

fn copy_file_if_missing(source_path: &Path, target_path: &Path) -> Result<(), String> {
  if target_path.exists() || !source_path.exists() {
    return Ok(());
  }

  ensure_parent_dir(target_path)?;
  fs::copy(source_path, target_path)
    .map(|_| ())
    .map_err(|error| {
      format!(
        "Failed to copy {} to {}: {error}",
        source_path.display(),
        target_path.display()
      )
    })
}

fn copy_directory_files_if_missing(
  source_dir: &Path,
  target_dir: &Path,
  include_file: Option<&dyn Fn(&str) -> bool>,
) -> Result<(), String> {
  if !source_dir.exists() {
    return Ok(());
  }

  ensure_dir(target_dir)?;

  for entry in fs::read_dir(source_dir)
    .map_err(|error| format!("Failed to read directory {}: {error}", source_dir.display()))?
  {
    let entry = entry.map_err(|error| format!("Failed to read directory entry: {error}"))?;
    if !entry
      .file_type()
      .map_err(|error| format!("Failed to inspect file type: {error}"))?
      .is_file()
    {
      continue;
    }

    let file_name = entry.file_name();
    let file_name_str = file_name.to_string_lossy();
    if let Some(filter) = include_file {
      if !filter(&file_name_str) {
        continue;
      }
    }

    copy_file_if_missing(&entry.path(), &target_dir.join(&file_name))?;
  }

  Ok(())
}

fn migrate_bundled_runtime_data(app: &AppHandle, backend: &str) -> Result<(), String> {
  let bundled_root = bundled_shared_dir(app)?;
  let backend_dir = backend_bin_dir(app, backend)?;

  copy_file_if_missing(&backend_dir.join(STARTUP_FILE_NAME), &startup_file(app)?)?;
  copy_file_if_missing(
    &backend_dir.join(CALIBRATION_COMMAND_FILE_NAME),
    &calibration_command_file(app)?,
  )?;
  copy_directory_files_if_missing(
    &bundled_root.join("profiles-library"),
    &profile_library_dir(app)?,
    Some(&|file_name| file_name.to_ascii_lowercase().ends_with(".txt")),
  )?;
  copy_directory_files_if_missing(&bundled_root.join("GyroConfigs"), &calibration_dir(app)?, None)?;
  copy_directory_files_if_missing(&bundled_root.join("AutoLoad"), &autoload_dir(app)?, None)?;

  Ok(())
}

fn ensure_runtime_support_files(app: &AppHandle, backend: &str) -> Result<(), String> {
  let backend_dir = backend_bin_dir(app, backend)?;
  let runtime_root = runtime_dir(app)?;

  for file_name in SUPPORT_FILE_NAMES {
    copy_file_if_missing(&backend_dir.join(file_name), &runtime_root.join(file_name))?;
  }

  Ok(())
}

fn profile_template_text() -> String {
  PROFILE_TEMPLATE_LINES.join("\n") + "\n"
}

fn startup_file_text(state: &RuntimeMappingState) -> String {
  let mut lines = STARTUP_HEADER_LINES
    .iter()
    .map(|line| (*line).to_string())
    .collect::<Vec<_>>();
  if state.mapping_enabled {
    lines.push(state.active_profile_path.clone());
    lines.push(format!(
      "AUTOLOAD = {}",
      if state.autoload_enabled { "ON" } else { "OFF" }
    ));
  } else {
    lines.push("AUTOLOAD = OFF".to_string());
    lines.push(MAPPING_DISABLED_RELATIVE.to_string());
  }
  lines.join("\n") + "\n"
}

fn mapping_disabled_text() -> String {
  MAPPING_DISABLED_LINES.join("\n") + "\n"
}

fn calibration_command_text(seconds: u32) -> String {
  format!("RESTART_GYRO_CALIBRATION\nSLEEP {seconds}\nFINISH_GYRO_CALIBRATION\n")
}

fn parse_sleep_seconds(content: &str) -> Option<u32> {
  content.lines().find_map(|line| {
    let trimmed = line.trim();
    let upper = trimmed.to_ascii_uppercase();
    upper
      .strip_prefix("SLEEP ")
      .and_then(|value| value.trim().parse::<u32>().ok())
  })
}

fn get_startup_profile_path(app: &AppHandle) -> Result<Option<String>, String> {
  let path = startup_file(app)?;
  let content = match fs::read_to_string(path) {
    Ok(value) => value,
    Err(_) => return Ok(None),
  };

  for line in content.lines().rev() {
    let trimmed = line.trim();
    if trimmed.to_ascii_lowercase().ends_with(".txt") {
      return Ok(Some(trimmed.to_string()));
    }
  }

  Ok(None)
}

fn get_startup_autoload_enabled(app: &AppHandle) -> Result<Option<bool>, String> {
  let path = startup_file(app)?;
  let content = match fs::read_to_string(path) {
    Ok(value) => value,
    Err(_) => return Ok(None),
  };

  for line in content.lines().rev() {
    let normalized = line.trim().replace(' ', "").to_ascii_uppercase();
    match normalized.as_str() {
      "AUTOLOAD=ON" => return Ok(Some(true)),
      "AUTOLOAD=OFF" => return Ok(Some(false)),
      _ => {}
    }
  }

  Ok(None)
}

fn write_startup_file(app: &AppHandle, state: &RuntimeMappingState) -> Result<(), String> {
  let path = startup_file(app)?;
  ensure_parent_dir(&path)?;
  fs::write(&path, startup_file_text(state))
    .map_err(|error| format!("Failed to write startup file: {error}"))
}

fn ensure_mapping_disabled_file(app: &AppHandle) -> Result<(), String> {
  let path = mapping_disabled_file(app)?;
  ensure_parent_dir(&path)?;
  fs::write(path, mapping_disabled_text())
    .map_err(|error| format!("Failed to write mapping disabled profile: {error}"))
}

fn ensure_runtime_mapping_state(app: &AppHandle) -> Result<RuntimeMappingState, String> {
  let path = gui_state_file(app)?;
  let mut should_persist = false;
  let mut state = match fs::read_to_string(&path) {
    Ok(content) => match serde_json::from_str::<RuntimeMappingState>(&content) {
      Ok(value) => value,
      Err(_) => {
        should_persist = true;
        default_runtime_mapping_state(app)?
      }
    },
    Err(_) => {
      should_persist = true;
      default_runtime_mapping_state(app)?
    }
  };

  let normalized_active = normalize_relative_profile_path(Some(&state.active_profile_path))
    .unwrap_or_else(|| DEFAULT_PROFILE_RELATIVE.to_string());
  if normalized_active != state.active_profile_path {
    state.active_profile_path = normalized_active;
    should_persist = true;
  }

  ensure_file(
    &absolute_profile_path(app, &state.active_profile_path)?,
    &profile_template_text(),
  )?;

  if should_persist {
    persist_runtime_mapping_state(app, &state)?;
  }

  write_startup_file(app, &state)?;
  Ok(state)
}

fn default_runtime_mapping_state(app: &AppHandle) -> Result<RuntimeMappingState, String> {
  let startup_profile = get_startup_profile_path(app)?;
  let mapping_enabled = startup_profile
    .as_deref()
    .map(|candidate| !candidate.eq_ignore_ascii_case(MAPPING_DISABLED_RELATIVE))
    .unwrap_or(true);
  let active_profile_path = startup_profile
    .as_deref()
    .and_then(|candidate| normalize_relative_profile_path(Some(candidate)))
    .filter(|relative| {
      absolute_profile_path(app, relative)
        .map(|path| path.exists())
        .unwrap_or(false)
    })
    .unwrap_or_else(|| DEFAULT_PROFILE_RELATIVE.to_string());

  Ok(RuntimeMappingState {
    active_profile_path,
    mapping_enabled,
    autoload_enabled: get_startup_autoload_enabled(app)?.unwrap_or(true),
  })
}

fn read_runtime_mapping_state(app: &AppHandle) -> Result<RuntimeMappingState, String> {
  let path = gui_state_file(app)?;
  let raw = match fs::read_to_string(path) {
    Ok(value) => value,
    Err(_) => return default_runtime_mapping_state(app),
  };

  let mut state = serde_json::from_str::<RuntimeMappingState>(&raw)
    .map_err(|error| format!("Failed to parse GUI runtime state: {error}"))?;
  state.active_profile_path = normalize_relative_profile_path(Some(&state.active_profile_path))
    .unwrap_or_else(|| DEFAULT_PROFILE_RELATIVE.to_string());
  Ok(state)
}

fn persist_runtime_mapping_state(app: &AppHandle, state: &RuntimeMappingState) -> Result<(), String> {
  let path = gui_state_file(app)?;
  ensure_parent_dir(&path)?;
  let content = serde_json::to_string_pretty(state)
    .map_err(|error| format!("Failed to serialize GUI runtime state: {error}"))?;
  fs::write(path, content).map_err(|error| format!("Failed to write GUI runtime state: {error}"))
}

fn set_active_profile_state(app: &AppHandle, relative: &str) -> Result<(), String> {
  let normalized = normalize_relative_profile_path(Some(relative))
    .ok_or_else(|| format!("Invalid profile path: {relative}"))?;
  ensure_file(
    &absolute_profile_path(app, &normalized)?,
    &profile_template_text(),
  )?;
  let mut state = read_runtime_mapping_state(app)?;
  state.active_profile_path = normalized;
  persist_runtime_mapping_state(app, &state)?;
  write_startup_file(app, &state)
}

fn write_calibration_command_file(app: &AppHandle, seconds: u32) -> Result<(), String> {
  let path = calibration_command_file(app)?;
  ensure_parent_dir(&path)?;
  fs::write(&path, calibration_command_text(seconds))
    .map_err(|error| format!("Failed to write calibration command file: {error}"))
}

fn autoload_rule_path(app: &AppHandle, process_name: &str) -> Result<PathBuf, String> {
  Ok(autoload_dir(app)?.join(format!("{process_name}.txt")))
}

fn autoload_rule_from_path(app: &AppHandle, path: &Path) -> Result<AutoloadRule, String> {
  let file_name = path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or_default()
    .to_string();
  let process_name = path
    .file_stem()
    .and_then(|value| value.to_str())
    .unwrap_or_default()
    .to_string();
  let content = fs::read_to_string(path).unwrap_or_default();

  if let Some(profile_path) = parse_linked_autoload_profile(&content) {
    let missing_profile = !absolute_profile_path(app, &profile_path)?.exists();
    return Ok(AutoloadRule {
      process_name,
      file_name,
      kind: "profile".to_string(),
      profile_name: Some(profile_name_from_relative_path(&profile_path)),
      profile_path: Some(profile_path),
      missing_profile,
    });
  }

  Ok(AutoloadRule {
    process_name,
    file_name,
    kind: "advanced".to_string(),
    profile_name: None,
    profile_path: None,
    missing_profile: false,
  })
}

fn parse_linked_autoload_profile(content: &str) -> Option<String> {
  let meaningful_lines = content
    .lines()
    .map(str::trim)
    .filter(|line| !line.is_empty() && !line.starts_with('#') && !line.starts_with("//"))
    .collect::<Vec<_>>();

  if meaningful_lines.len() != 1 {
    return None;
  }

  let value = meaningful_lines[0].trim_matches('"');
  normalize_relative_profile_path(Some(value))
}

fn update_autoload_profile_references(
  app: &AppHandle,
  old_relative: &str,
  new_relative: &str,
) -> Result<(), String> {
  let dir = autoload_dir(app)?;
  if !dir.exists() {
    return Ok(());
  }

  for entry in fs::read_dir(&dir)
    .map_err(|error| format!("Failed to read AutoLoad directory: {error}"))?
  {
    let entry = entry.map_err(|error| format!("Failed to read AutoLoad entry: {error}"))?;
    let path = entry.path();
    if path.extension().and_then(|ext| ext.to_str()) != Some("txt") {
      continue;
    }
    let content = fs::read_to_string(&path).unwrap_or_default();
    if parse_linked_autoload_profile(&content)
      .as_deref()
      .is_some_and(|relative| relative.eq_ignore_ascii_case(old_relative))
    {
      fs::write(&path, format!("{new_relative}\n"))
        .map_err(|error| format!("Failed to update AutoLoad profile reference: {error}"))?;
    }
  }

  Ok(())
}

fn sanitize_process_name(raw_name: &str) -> Result<String, String> {
  let normalized = raw_name.trim().replace('\\', "/");
  let mut name = normalized
    .rsplit('/')
    .next()
    .unwrap_or_default()
    .trim()
    .to_string();

  for suffix in [".exe", ".txt"] {
    if name.to_ascii_lowercase().ends_with(suffix) {
      let next_len = name.len().saturating_sub(suffix.len());
      name.truncate(next_len);
    }
  }

  let cleaned = name
    .chars()
    .filter(|character| character.is_alphanumeric() || matches!(character, '-' | '_' | '.' | ' '))
    .take(80)
    .collect::<String>()
    .trim_matches(['.', ' '])
    .to_string();

  if cleaned.is_empty() {
    Err("Process name cannot be empty.".to_string())
  } else {
    Ok(cleaned)
  }
}

fn normalize_relative_profile_path(input: Option<&str>) -> Option<String> {
  let normalized = input?.replace('\\', "/");
  let stripped = normalized
    .strip_prefix("../profiles-library/")
    .or_else(|| normalized.strip_prefix("profiles-library/"))?;

  if stripped.is_empty() || stripped.starts_with('/') || stripped.contains("../") {
    return None;
  }

  Some(format!("{PROFILE_LIBRARY_RELATIVE}/{stripped}"))
}

fn absolute_profile_path(app: &AppHandle, relative_path: &str) -> Result<PathBuf, String> {
  let normalized = normalize_relative_profile_path(Some(relative_path))
    .ok_or_else(|| format!("Invalid profile path: {relative_path}"))?;
  let stripped = normalized
    .strip_prefix("profiles-library/")
    .ok_or_else(|| format!("Invalid profile path: {relative_path}"))?;

  let mut absolute = profile_library_dir(app)?;
  for segment in stripped.split('/') {
    if segment.is_empty() || segment == "." || segment == ".." {
      return Err(format!("Invalid profile path segment: {relative_path}"));
    }
    absolute.push(segment);
  }

  Ok(absolute)
}

fn library_profile_path(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
  Ok(profile_library_dir(app)?.join(format!("{name}.txt")))
}

fn relative_profile_path_from_name(name: &str) -> String {
  format!("{PROFILE_LIBRARY_RELATIVE}/{name}.txt")
}

fn generate_unique_profile_name(app: &AppHandle, preferred: Option<&str>) -> Result<String, String> {
  let existing = list_library_profiles(app)?;
  let used = existing
    .into_iter()
    .map(|entry| entry.to_ascii_lowercase())
    .collect::<Vec<_>>();

  let mut base = sanitize_profile_name(preferred.unwrap_or(DEFAULT_PROFILE_NAME));
  if base.is_empty() {
    base = DEFAULT_PROFILE_NAME.to_string();
  }

  let (prefix, mut counter) = split_trailing_counter(&base);
  let mut candidate = base.clone();

  while used.iter().any(|entry| entry == &candidate.to_ascii_lowercase()) {
    counter += 1;
    candidate = format!("{prefix} {counter}").trim().to_string();
  }

  Ok(candidate)
}

fn generate_copy_profile_name(app: &AppHandle, base_name: &str) -> Result<String, String> {
  let existing = list_library_profiles(app)?;
  let used = existing
    .into_iter()
    .map(|entry| entry.to_ascii_lowercase())
    .collect::<Vec<_>>();

  let safe_base = sanitize_profile_name(base_name);
  let root = safe_base.trim();
  let root = if root.is_empty() { DEFAULT_PROFILE_NAME } else { root };

  let mut counter = 0;
  let mut candidate = root.to_string();
  while used.iter().any(|entry| entry == &candidate.to_ascii_lowercase()) {
    counter += 1;
    candidate = format!("{root} ({counter})");
  }

  Ok(candidate)
}

fn split_trailing_counter(base: &str) -> (String, u32) {
  let mut digits = String::new();
  for character in base.chars().rev() {
    if character.is_ascii_digit() {
      digits.insert(0, character);
    } else {
      break;
    }
  }

  if digits.is_empty() {
    return (base.trim().to_string(), 1);
  }

  let prefix = base[..base.len() - digits.len()].trim();
  let normalized_prefix = if prefix.is_empty() {
    DEFAULT_PROFILE_NAME
      .trim_end_matches(|character: char| character.is_ascii_digit())
      .trim()
  } else {
    prefix
  };
  let counter = digits.parse::<u32>().unwrap_or(1);

  (normalized_prefix.to_string(), counter)
}

fn normalize_backend_choice(choice: &str) -> &'static str {
  if choice.eq_ignore_ascii_case("legacy") {
    "legacy"
  } else {
    "SDL"
  }
}
