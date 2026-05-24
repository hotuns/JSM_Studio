mod commands;
mod runtime;
mod services;

use tauri::{Manager, RunEvent};

use services::{app_state::AppState, hidhide, input_debug, jsm_process, telemetry};

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
            if let Err(error) = sync_hidhide_whitelist_if_available(&app.handle()) {
                eprintln!(
                    "Failed to sync HidHide whitelist before launching JoyShockMapper: {error}"
                );
            }
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
            commands::get_runtime_mapping_state,
            commands::set_mapping_enabled,
            commands::set_autoload_enabled,
            commands::list_autoload_rules,
            commands::save_autoload_rule,
            commands::delete_autoload_rule,
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
            commands::list_jsm_controllers,
            commands::connect_jsm_controllers,
            commands::get_backend_choice,
            commands::set_backend_choice,
            commands::get_latest_telemetry_sample,
            commands::get_hidhide_status,
            commands::set_hidhide_active,
            commands::set_hidhide_device_hidden,
            commands::sync_hidhide_whitelist,
            commands::install_bundled_hidhide,
            commands::open_hidhide_client,
            commands::open_external,
            commands::open_config_directory,
            commands::start_input_debug_hook,
            commands::stop_input_debug_hook,
            commands::get_input_debug_hook_status,
            commands::get_ai_settings,
            commands::save_ai_settings,
            commands::generate_ai_mapping,
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

fn sync_hidhide_whitelist_if_available(app: &tauri::AppHandle) -> Result<(), String> {
    let status = hidhide::get_status(app, None)?;
    if status.supported
        && status.installed
        && !status.requires_elevation
        && !status.whitelist_synced
    {
        let _ = hidhide::sync_whitelist(app, None)?;
    }
    Ok(())
}
