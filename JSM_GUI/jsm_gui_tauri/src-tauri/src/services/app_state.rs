use std::{
    sync::{atomic::AtomicU64, Arc, Mutex},
    time::Instant,
};

use serde_json::Value;
#[cfg(not(target_os = "windows"))]
use std::process::Child;

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, STILL_ACTIVE, WAIT_FAILED};
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Threading::{
    GetExitCodeProcess, TerminateProcess, WaitForSingleObject, INFINITE,
};

#[cfg(target_os = "windows")]
pub struct ManagedProcess {
    pid: u32,
    handle: HANDLE,
}

#[cfg(target_os = "windows")]
impl ManagedProcess {
    pub fn new(pid: u32, handle: HANDLE) -> Self {
        Self { pid, handle }
    }

    pub fn id(&self) -> u32 {
        self.pid
    }

    pub fn handle(&self) -> HANDLE {
        self.handle
    }

    pub fn try_wait(&mut self) -> std::io::Result<Option<u32>> {
        let mut exit_code = 0_u32;
        let success = unsafe { GetExitCodeProcess(self.handle, &mut exit_code) };
        if success == 0 {
            return Err(std::io::Error::last_os_error());
        }

        if exit_code == STILL_ACTIVE as u32 {
            Ok(None)
        } else {
            Ok(Some(exit_code))
        }
    }

    pub fn kill(&mut self) -> std::io::Result<()> {
        let success = unsafe { TerminateProcess(self.handle, 1) };
        if success == 0 {
            Err(std::io::Error::last_os_error())
        } else {
            Ok(())
        }
    }

    pub fn wait(&mut self) -> std::io::Result<u32> {
        let wait_result = unsafe { WaitForSingleObject(self.handle, INFINITE) };
        if wait_result == WAIT_FAILED {
            return Err(std::io::Error::last_os_error());
        }

        let mut exit_code = 0_u32;
        let success = unsafe { GetExitCodeProcess(self.handle, &mut exit_code) };
        if success == 0 {
            Err(std::io::Error::last_os_error())
        } else {
            Ok(exit_code)
        }
    }
}

#[cfg(target_os = "windows")]
unsafe impl Send for ManagedProcess {}

#[cfg(target_os = "windows")]
unsafe impl Sync for ManagedProcess {}

#[cfg(target_os = "windows")]
impl Drop for ManagedProcess {
    fn drop(&mut self) {
        if !self.handle.is_null() {
            unsafe {
                let _ = CloseHandle(self.handle);
            }
        }
    }
}

#[cfg(target_os = "windows")]
pub struct JobObject {
    handle: HANDLE,
}

#[cfg(target_os = "windows")]
impl JobObject {
    pub fn new(handle: HANDLE) -> Self {
        Self { handle }
    }
}

#[cfg(target_os = "windows")]
unsafe impl Send for JobObject {}

#[cfg(target_os = "windows")]
unsafe impl Sync for JobObject {}

#[cfg(target_os = "windows")]
impl Drop for JobObject {
    fn drop(&mut self) {
        if !self.handle.is_null() {
            unsafe {
                let _ = CloseHandle(self.handle);
            }
        }
    }
}

pub struct ProcessState {
    #[cfg(target_os = "windows")]
    pub child: Option<ManagedProcess>,
    #[cfg(not(target_os = "windows"))]
    pub child: Option<Child>,
    #[cfg(target_os = "windows")]
    pub job: Option<JobObject>,
}

impl Default for ProcessState {
    fn default() -> Self {
        Self {
            child: None,
            #[cfg(target_os = "windows")]
            job: None,
        }
    }
}

pub struct TelemetryState {
    pub latest_packet: Option<Value>,
    pub latest_received_at: Option<Instant>,
    pub last_reconnect_attempt: Option<Instant>,
    pub stale_devices_cleared: bool,
}

impl Default for TelemetryState {
    fn default() -> Self {
        Self {
            latest_packet: None,
            latest_received_at: None,
            last_reconnect_attempt: None,
            stale_devices_cleared: false,
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub process: Arc<Mutex<ProcessState>>,
    pub telemetry: Arc<Mutex<TelemetryState>>,
    pub calibration_generation: Arc<AtomicU64>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            process: Arc::new(Mutex::new(ProcessState::default())),
            telemetry: Arc::new(Mutex::new(TelemetryState::default())),
            calibration_generation: Arc::new(AtomicU64::new(0)),
        }
    }
}
