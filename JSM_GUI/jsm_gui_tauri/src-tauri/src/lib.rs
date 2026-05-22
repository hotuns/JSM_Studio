mod commands;
mod runtime;
mod services;

use tauri::{Manager, RunEvent};

use services::{
  app_state::AppState,
  input_debug,
  jsm_process,
  telemetry,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .manage(AppState::default())
    .setup(|app| {
      let state = app.state::<AppState>().inner().clone();
      if let Err(error) = runtime::ensure_required_files(&app.handle()) {
        eprintln!("Failed to initialize Tauri runtime files: {error}");
      }
      telemetry::start(app.handle().clone(), state.clone());
      if let Err(error) = jsm_process::launch_jsm(&app.handle(), &state) {
        eprintln!("Failed to auto-launch JoyShockMapper from Tauri: {error}");
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::launch_jsm,
      commands::terminate_jsm,
      commands::minimize_temporarily,
      commands::apply_profile,
      commands::recalibrate_gyro,
      commands::get_calibration_seconds,
      commands::set_calibration_seconds,
      commands::library_list_profiles,
      commands::library_save_profile,
      commands::library_load_profile,
      commands::get_active_profile,
      commands::activate_library_profile,
      commands::library_create_profile,
      commands::library_rename_profile,
      commands::library_delete_profile,
      commands::library_copy_active_profile,
      commands::load_calibration_preset,
      commands::read_calibration_preset,
      commands::save_calibration_preset,
      commands::run_calibration_command,
      commands::get_backend_choice,
      commands::set_backend_choice,
      commands::get_latest_telemetry_sample,
      commands::open_external,
      commands::start_input_debug_hook,
      commands::stop_input_debug_hook,
      commands::get_input_debug_hook_status,
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|app_handle, event| {
    if matches!(event, RunEvent::ExitRequested { .. } | RunEvent::Exit) {
      let state = app_handle.state::<AppState>();
      if let Err(error) = jsm_process::terminate_jsm(app_handle, state.inner()) {
        eprintln!("Failed to terminate JoyShockMapper during Tauri shutdown: {error}");
      }
      if let Err(error) = input_debug::stop() {
        eprintln!("Failed to stop input debug hook during Tauri shutdown: {error}");
      }
    }
  });
}
