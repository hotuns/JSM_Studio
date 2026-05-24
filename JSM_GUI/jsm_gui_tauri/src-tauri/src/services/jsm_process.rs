use std::{
    ffi::OsStr,
    path::Path,
    process::{Command, Stdio},
};

use tauri::AppHandle;

use crate::{
    runtime,
    services::{
        app_state::{AppState, ProcessState},
        telemetry,
    },
};

#[cfg(target_os = "windows")]
use std::{
    iter,
    os::windows::{ffi::OsStrExt, process::CommandExt},
};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
use crate::services::app_state::{JobObject, ManagedProcess};
#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::CloseHandle,
    System::{
        JobObjects::{
            AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
            SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
            JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
        },
        Threading::{CreateProcessW, PROCESS_INFORMATION, STARTF_USESHOWWINDOW, STARTUPINFOW},
    },
};

pub struct ConsoleCommandResult {
    pub success: bool,
    pub output: String,
}

pub fn launch_jsm(app: &AppHandle, state: &AppState) -> Result<(), String> {
    runtime::ensure_required_files(app)?;

    let backend = runtime::read_backend_choice(app)?;
    let jsm_executable = runtime::jsm_executable_path(app, &backend)?;
    let backend_dir = runtime::backend_bin_dir(app, &backend)?;
    let runtime_dir = runtime::runtime_dir(app)?;

    if !jsm_executable.exists() {
        return Err(format!(
            "JoyShockMapper executable not found: {}",
            jsm_executable.display()
        ));
    }

    let mut process_state = lock_process_state(state)?;
    sync_child_state(&mut process_state)?;
    if process_state.child.is_some() {
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    let mut child = spawn_hidden_jsm_windows(&jsm_executable, &backend_dir, &runtime_dir)?;

    #[cfg(not(target_os = "windows"))]
    let mut child = {
        let mut command = Command::new(&jsm_executable);
        command
            .arg(&runtime_dir)
            .arg("--manual-connect")
            .current_dir(&backend_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        apply_hidden_process_flags(&mut command, false);
        command
            .spawn()
            .map_err(|error| format!("Failed to launch JoyShockMapper: {error}"))?
    };

    #[cfg(target_os = "windows")]
    let job = match create_kill_on_close_job(&child) {
        Ok(job) => Some(job),
        Err(error) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }
    };

    process_state.child = Some(child);
    #[cfg(target_os = "windows")]
    {
        process_state.job = job;
    }
    drop(process_state);

    telemetry::stop_calibration_countdown(app, state)?;
    Ok(())
}

pub fn terminate_jsm(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let child = {
        let mut process_state = lock_process_state(state)?;
        sync_child_state(&mut process_state)?;
        #[cfg(target_os = "windows")]
        let _ = process_state.job.take();
        process_state.child.take()
    };

    if let Some(mut child) = child {
        let _ = child.kill();
        let _ = child.wait();
    }

    telemetry::broadcast_empty_devices(app, state)?;
    telemetry::stop_calibration_countdown(app, state)?;
    Ok(())
}

pub fn is_running(state: &AppState) -> Result<bool, String> {
    let mut process_state = lock_process_state(state)?;
    sync_child_state(&mut process_state)?;
    Ok(process_state.child.is_some())
}

pub fn inject_console_command(
    app: &AppHandle,
    state: &AppState,
    command: &str,
) -> Result<bool, String> {
    if !cfg!(target_os = "windows") {
        return Ok(false);
    }

    let pid = current_pid(state)?;
    let Some(pid) = pid else {
        return Ok(false);
    };

    let backend = runtime::read_backend_choice(app)?;
    let injector_path = runtime::console_injector_path(app, &backend)?;
    let backend_dir = runtime::backend_bin_dir(app, &backend)?;

    if !injector_path.exists() {
        return Ok(false);
    }

    let mut injector = Command::new(&injector_path);
    injector
        .arg(pid.to_string())
        .arg(command)
        .current_dir(backend_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    apply_hidden_process_flags(&mut injector, false);

    let status = injector
        .status()
        .map_err(|error| format!("Failed to launch console injector: {error}"))?;

    Ok(status.success())
}

pub fn run_console_command_with_output(
    app: &AppHandle,
    state: &AppState,
    command: &str,
) -> Result<ConsoleCommandResult, String> {
    if !cfg!(target_os = "windows") {
        return Ok(ConsoleCommandResult {
            success: false,
            output: String::new(),
        });
    }

    let pid = current_pid(state)?;
    let Some(pid) = pid else {
        return Ok(ConsoleCommandResult {
            success: false,
            output: String::new(),
        });
    };

    let backend = runtime::read_backend_choice(app)?;
    let injector_path = runtime::console_injector_path(app, &backend)?;
    let backend_dir = runtime::backend_bin_dir(app, &backend)?;

    if !injector_path.exists() {
        return Ok(ConsoleCommandResult {
            success: false,
            output: String::new(),
        });
    }

    let mut injector = Command::new(&injector_path);
    injector
        .arg(pid.to_string())
        .arg(command)
        .arg("--capture")
        .current_dir(backend_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    apply_hidden_process_flags(&mut injector, false);

    let output = injector
        .output()
        .map_err(|error| format!("Failed to capture console command output: {error}"))?;

    let mut combined = String::new();
    combined.push_str(&String::from_utf8_lossy(&output.stdout));
    combined.push_str(&String::from_utf8_lossy(&output.stderr));

    Ok(ConsoleCommandResult {
        success: output.status.success(),
        output: combined,
    })
}

fn current_pid(state: &AppState) -> Result<Option<u32>, String> {
    let mut process_state = lock_process_state(state)?;
    sync_child_state(&mut process_state)?;
    Ok(process_state.child.as_ref().map(|child| child.id()))
}

fn lock_process_state(state: &AppState) -> Result<std::sync::MutexGuard<'_, ProcessState>, String> {
    state
        .process
        .lock()
        .map_err(|_| "Process state lock poisoned.".to_string())
}

fn sync_child_state(process_state: &mut ProcessState) -> Result<(), String> {
    let exited = match process_state.child.as_mut() {
        Some(child) => match child.try_wait() {
            Ok(Some(_)) => true,
            Ok(None) => false,
            Err(error) => {
                return Err(format!(
                    "Failed to inspect JoyShockMapper process state: {error}"
                ));
            }
        },
        None => false,
    };

    if exited {
        process_state.child = None;
        #[cfg(target_os = "windows")]
        {
            process_state.job = None;
        }
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn apply_hidden_process_flags(command: &mut Command, _detach_console: bool) {
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
}

#[cfg(target_os = "windows")]
fn create_kill_on_close_job(child: &ManagedProcess) -> Result<JobObject, String> {
    let job_handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
    if job_handle.is_null() {
        return Err(format!(
            "Failed to create JoyShockMapper job object: {}",
            std::io::Error::last_os_error()
        ));
    }

    let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

    let set_result = unsafe {
        SetInformationJobObject(
            job_handle,
            JobObjectExtendedLimitInformation,
            &mut limits as *mut _ as *mut _,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        )
    };
    if set_result == 0 {
        drop(JobObject::new(job_handle));
        return Err(format!(
            "Failed to configure JoyShockMapper job object: {}",
            std::io::Error::last_os_error()
        ));
    }

    let process_handle = child.handle();
    let assign_result = unsafe { AssignProcessToJobObject(job_handle, process_handle) };
    if assign_result == 0 {
        drop(JobObject::new(job_handle));
        return Err(format!(
            "Failed to attach JoyShockMapper to shutdown job object: {}",
            std::io::Error::last_os_error()
        ));
    }

    Ok(JobObject::new(job_handle))
}

#[cfg(not(target_os = "windows"))]
fn apply_hidden_process_flags(_command: &mut Command, _detach_console: bool) {}

#[cfg(target_os = "windows")]
fn spawn_hidden_jsm_windows(
    executable: &Path,
    working_dir: &Path,
    runtime_dir: &Path,
) -> Result<ManagedProcess, String> {
    let mut startup_info = STARTUPINFOW::default();
    startup_info.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
    startup_info.dwFlags = STARTF_USESHOWWINDOW;
    startup_info.wShowWindow = 0;

    let mut process_info = PROCESS_INFORMATION::default();
    let application_name = wide_null(executable.as_os_str());
    let current_directory = wide_null(working_dir.as_os_str());
    let mut command_line = build_windows_command_line([
        executable.as_os_str(),
        runtime_dir.as_os_str(),
        OsStr::new("--manual-connect"),
    ]);

    let success = unsafe {
        CreateProcessW(
            application_name.as_ptr(),
            command_line.as_mut_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            0,
            CREATE_NO_WINDOW,
            std::ptr::null(),
            current_directory.as_ptr(),
            &startup_info,
            &mut process_info,
        )
    };

    if success == 0 {
        return Err(format!(
            "Failed to launch JoyShockMapper: {}",
            std::io::Error::last_os_error()
        ));
    }

    unsafe {
        let _ = CloseHandle(process_info.hThread);
    }

    Ok(ManagedProcess::new(
        process_info.dwProcessId,
        process_info.hProcess,
    ))
}

#[cfg(target_os = "windows")]
fn build_windows_command_line<'a>(arguments: impl IntoIterator<Item = &'a OsStr>) -> Vec<u16> {
    let command_line = arguments
        .into_iter()
        .map(quote_windows_argument)
        .collect::<Vec<_>>()
        .join(" ");
    OsStr::new(&command_line)
        .encode_wide()
        .chain(iter::once(0))
        .collect()
}

#[cfg(target_os = "windows")]
fn wide_null(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(iter::once(0)).collect()
}

#[cfg(target_os = "windows")]
fn quote_windows_argument(value: &OsStr) -> String {
    let text = value.to_string_lossy();
    if text.is_empty() {
        return "\"\"".to_string();
    }

    let needs_quotes = text
        .chars()
        .any(|character| matches!(character, ' ' | '\t' | '"'));
    if !needs_quotes {
        return text.into_owned();
    }

    let mut quoted = String::from("\"");
    let mut backslashes = 0;
    for character in text.chars() {
        match character {
            '\\' => backslashes += 1,
            '"' => {
                quoted.push_str(&"\\".repeat(backslashes * 2 + 1));
                quoted.push('"');
                backslashes = 0;
            }
            _ => {
                quoted.push_str(&"\\".repeat(backslashes));
                backslashes = 0;
                quoted.push(character);
            }
        }
    }

    quoted.push_str(&"\\".repeat(backslashes * 2));
    quoted.push('"');
    quoted
}
