use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, State, Window};

use crate::{
  runtime,
  services::{
    app_state::AppState,
    input_debug,
    jsm_process,
    telemetry,
  },
};

type CommandResult<T> = Result<T, String>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyProfileResult {
  restarted: bool,
  path: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NamedProfile {
  path: String,
  name: String,
  content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadLibraryProfileResult {
  name: String,
  content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteLibraryProfileResult {
  success: bool,
  fallback: Option<NamedProfile>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetBackendChoiceResult {
  success: bool,
  backend: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleSuccessResult {
  success: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalibrationPresetLoadResult {
  success: bool,
  active_profile: Option<String>,
  calibration_profile: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalibrationPresetReadResult {
  success: bool,
  calibration_profile: Option<String>,
  content: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalibrationCommandResult {
  success: bool,
  output: String,
}

#[tauri::command]
pub fn launch_jsm(
  app: AppHandle,
  state: State<'_, AppState>,
  calibration_seconds: Option<u32>,
) -> CommandResult<()> {
  if let Some(seconds) = calibration_seconds {
    runtime::write_calibration_seconds(&app, seconds)?;
  }
  jsm_process::launch_jsm(&app, state.inner())
}

#[tauri::command]
pub fn terminate_jsm(app: AppHandle, state: State<'_, AppState>) -> CommandResult<()> {
  jsm_process::terminate_jsm(&app, state.inner())
}

#[tauri::command]
pub fn minimize_temporarily(window: Window) -> CommandResult<()> {
  window
    .minimize()
    .map_err(|error| format!("Failed to minimize window: {error}"))?;

  let window_clone = window.clone();
  std::thread::spawn(move || {
    std::thread::sleep(std::time::Duration::from_millis(2500));
    let _ = window_clone.unminimize();
    let _ = window_clone.set_focus();
  });

  Ok(())
}

#[tauri::command]
pub fn apply_profile(
  app: AppHandle,
  state: State<'_, AppState>,
  profile_path: Option<String>,
  text: String,
) -> CommandResult<ApplyProfileResult> {
  let path = runtime::write_active_profile(&app, profile_path.as_deref(), &text)?;
  let _ = jsm_process::inject_console_command(&app, state.inner(), &path)?;
  Ok(ApplyProfileResult {
    restarted: false,
    path: Some(path),
  })
}

#[tauri::command]
pub fn recalibrate_gyro(app: AppHandle, state: State<'_, AppState>) -> CommandResult<SimpleSuccessResult> {
  runtime::ensure_required_files(&app)?;
  let success = jsm_process::inject_console_command(&app, state.inner(), runtime::CALIBRATION_COMMAND)?;
  if success {
    let seconds = runtime::read_calibration_seconds(&app)?;
    telemetry::start_calibration_countdown(app.clone(), state.inner().clone(), seconds)?;
  } else {
    telemetry::stop_calibration_countdown(&app, state.inner())?;
  }
  Ok(SimpleSuccessResult { success })
}

#[tauri::command]
pub fn get_calibration_seconds(app: AppHandle) -> CommandResult<u32> {
  runtime::read_calibration_seconds(&app)
}

#[tauri::command]
pub fn set_calibration_seconds(app: AppHandle, seconds: u32) -> CommandResult<u32> {
  runtime::write_calibration_seconds(&app, seconds)
}

#[tauri::command]
pub fn library_list_profiles(app: AppHandle) -> CommandResult<Vec<String>> {
  runtime::list_library_profiles(&app)
}

#[tauri::command]
pub fn library_save_profile(app: AppHandle, name: String, content: String) -> CommandResult<LoadLibraryProfileResult> {
  let saved_name = runtime::save_library_profile(&app, &name, &content)?;
  Ok(LoadLibraryProfileResult {
    name: saved_name,
    content,
  })
}

#[tauri::command]
pub fn library_load_profile(app: AppHandle, name: String) -> CommandResult<LoadLibraryProfileResult> {
  let content = runtime::load_library_profile(&app, &name)?;
  Ok(LoadLibraryProfileResult { name, content })
}

#[tauri::command]
pub fn get_active_profile(app: AppHandle) -> CommandResult<NamedProfile> {
  let (path, content) = runtime::get_active_profile(&app)?;
  Ok(named_profile(path, content))
}

#[tauri::command]
pub fn activate_library_profile(app: AppHandle, name: String) -> CommandResult<NamedProfile> {
  let safe_name = runtime::sanitize_profile_name(&name);
  let path = format!("{}/{}.txt", runtime::PROFILE_LIBRARY_RELATIVE, safe_name);
  runtime::set_active_profile(&app, &path)?;
  let content = runtime::load_library_profile(&app, &safe_name)?;
  Ok(named_profile(path, content))
}

#[tauri::command]
pub fn library_create_profile(
  app: AppHandle,
  preferred_base_name: Option<String>,
) -> CommandResult<NamedProfile> {
  let (path, content) = runtime::create_library_profile(&app, preferred_base_name.as_deref())?;
  Ok(named_profile(path, content))
}

#[tauri::command]
pub fn library_rename_profile(
  app: AppHandle,
  old_name: String,
  new_name: String,
) -> CommandResult<NamedProfile> {
  let (path, content) = runtime::rename_library_profile(&app, &old_name, &new_name)?;
  Ok(named_profile(path, content))
}

#[tauri::command]
pub fn library_delete_profile(app: AppHandle, name: String) -> CommandResult<DeleteLibraryProfileResult> {
  let fallback = runtime::delete_library_profile(&app, &name)?
    .map(|(path, content)| named_profile(path, content));

  Ok(DeleteLibraryProfileResult {
    success: true,
    fallback,
  })
}

#[tauri::command]
pub fn library_copy_active_profile(app: AppHandle) -> CommandResult<NamedProfile> {
  let (path, content) = runtime::copy_active_profile(&app)?;
  Ok(named_profile(path, content))
}

#[tauri::command]
pub fn load_calibration_preset(
  app: AppHandle,
  state: State<'_, AppState>,
) -> CommandResult<CalibrationPresetLoadResult> {
  runtime::ensure_required_files(&app)?;
  let (active_profile, _) = runtime::get_active_profile(&app)?;
  let success = if runtime::calibration_preset_exists(&app)? {
    jsm_process::inject_console_command(&app, state.inner(), &runtime::calibration_profile_relative())?
  } else {
    false
  };
  Ok(CalibrationPresetLoadResult {
    success,
    active_profile: Some(active_profile),
    calibration_profile: Some(runtime::calibration_profile_relative()),
  })
}

#[tauri::command]
pub fn read_calibration_preset(app: AppHandle) -> CommandResult<CalibrationPresetReadResult> {
  let content = runtime::read_calibration_preset(&app)?;
  Ok(CalibrationPresetReadResult {
    success: true,
    calibration_profile: Some(runtime::calibration_profile_relative()),
    content: Some(content),
  })
}

#[tauri::command]
pub fn save_calibration_preset(app: AppHandle, content: String) -> CommandResult<SimpleSuccessResult> {
  runtime::save_calibration_preset(&app, &content)?;
  Ok(SimpleSuccessResult { success: true })
}

#[tauri::command]
pub fn run_calibration_command(
  app: AppHandle,
  state: State<'_, AppState>,
  command: String,
) -> CommandResult<CalibrationCommandResult> {
  runtime::ensure_required_files(&app)?;
  let result = jsm_process::run_console_command_with_output(&app, state.inner(), &command)?;
  Ok(CalibrationCommandResult {
    success: result.success,
    output: result.output,
  })
}

#[tauri::command]
pub fn get_backend_choice(app: AppHandle) -> CommandResult<String> {
  runtime::read_backend_choice(&app)
}

#[tauri::command]
pub fn set_backend_choice(
  app: AppHandle,
  state: State<'_, AppState>,
  choice: String,
) -> CommandResult<SetBackendChoiceResult> {
  if choice != "SDL" && choice != "legacy" {
    let backend = runtime::read_backend_choice(&app)?;
    return Ok(SetBackendChoiceResult {
      success: false,
      backend,
    });
  }

  let current = runtime::read_backend_choice(&app)?;
  if current == choice {
    return Ok(SetBackendChoiceResult {
      success: true,
      backend: current,
    });
  }

  jsm_process::terminate_jsm(&app, state.inner())?;
  let backend = runtime::write_backend_choice(&app, &choice)?;
  runtime::ensure_required_files(&app)?;
  jsm_process::launch_jsm(&app, state.inner())?;
  Ok(SetBackendChoiceResult {
    success: true,
    backend,
  })
}

#[tauri::command]
pub fn get_latest_telemetry_sample(state: State<'_, AppState>) -> CommandResult<Option<Value>> {
  telemetry::latest_packet(state.inner())
}

#[tauri::command]
pub fn open_external(url: String) -> CommandResult<()> {
  open::that(url).map_err(|error| format!("Failed to open external link: {error}"))?;
  Ok(())
}

#[tauri::command]
pub fn start_input_debug_hook(app: AppHandle) -> CommandResult<input_debug::InputDebugHookStatus> {
  input_debug::start(app)
}

#[tauri::command]
pub fn stop_input_debug_hook() -> CommandResult<input_debug::InputDebugHookStatus> {
  input_debug::stop()
}

#[tauri::command]
pub fn get_input_debug_hook_status() -> CommandResult<input_debug::InputDebugHookStatus> {
  input_debug::status()
}

fn named_profile(path: String, content: String) -> NamedProfile {
  let name = runtime::profile_name_from_relative_path(&path);
  NamedProfile { path, name, content }
}
