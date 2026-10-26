use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs::File,
    io::Read,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};

const MANIFEST: &str = include_str!("../../drivers/manifest.json");
#[derive(Deserialize)]
struct Manifest {
    version: u32,
    installers: BTreeMap<String, Installer>,
}
#[derive(Deserialize)]
struct Installer {
    file: String,
    sha256: String,
    size: u64,
}
#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub cancelled: bool,
    pub reboot_required: bool,
    pub exit_code: u32,
}
fn installer(kind: &str) -> Result<Installer, String> {
    if !["hidhide", "vigem"].contains(&kind) {
        return Err("Unknown driver installer".into());
    }
    let mut manifest: Manifest = serde_json::from_str(MANIFEST).map_err(|e| e.to_string())?;
    if manifest.version != 1 {
        return Err("Unsupported driver manifest".into());
    }
    let value = manifest
        .installers
        .remove(kind)
        .ok_or("Bundled driver installer is missing")?;
    if value.file.contains(['/', '\\']) || !value.file.ends_with(".exe") {
        return Err("Invalid bundled installer filename".into());
    }
    Ok(value)
}
fn verify(path: &Path, expected: &Installer) -> Result<File, String> {
    let mut options = std::fs::OpenOptions::new();
    options.read(true);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options.share_mode(1); // FILE_SHARE_READ: hold the verified file through installation.
    }
    let mut file = options
        .open(path)
        .map_err(|e| format!("Bundled driver installer was not found: {e}"))?;
    if file.metadata().map_err(|e| e.to_string())?.len() != expected.size {
        return Err("Bundled driver installer size mismatch. Reinstall JSM Studio.".into());
    }
    let mut digest = Sha256::new();
    let mut buffer = [0u8; 65536];
    loop {
        let size = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if size == 0 {
            break;
        }
        digest.update(&buffer[..size]);
    }
    if format!("{:x}", digest.finalize()) != expected.sha256 {
        return Err("Bundled driver installer checksum mismatch. Reinstall JSM Studio.".into());
    }
    Ok(file)
}
fn result(code: u32) -> Result<InstallResult, String> {
    match code {
        0 => Ok(InstallResult {cancelled:false,reboot_required:false,exit_code:code}),
        3010 | 1641 => Ok(InstallResult {cancelled:false,reboot_required:true,exit_code:code}),
        1223 | 1602 | 0x80070642 => Ok(InstallResult {cancelled:true,reboot_required:false,exit_code:code}),
        _ => Err(format!("Driver installer exited with code {code} (0x{code:08X}). Check the installer message and try again.")),
    }
}
fn resource(app: &AppHandle, filename: &str) -> Result<PathBuf, String> {
    if cfg!(dev) {
        return Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("drivers")
            .join(filename));
    }
    Ok(app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("drivers")
        .join(filename))
}
pub fn install(app: &AppHandle, kind: &str) -> Result<InstallResult, String> {
    if !cfg!(all(windows, target_arch = "x86_64")) {
        return Err("Bundled drivers require Windows x64".into());
    }
    let entry = installer(kind)?;
    let _gate = super::components::GATE
        .lock()
        .map_err(|_| "Component control lock failed")?;
    let service = if kind == "hidhide" {
        "HidHide"
    } else {
        "ViGEmBus"
    };
    let status = super::components::driver(service);
    if status.status != "missing" {
        return Err("The driver is already installed or its state is unknown. Detect again; restart Windows if the installed driver is not running.".into());
    }
    let path = resource(app, &entry.file)?;
    let _verified_file = verify(&path, &entry)?;
    launch(&path)
}

#[cfg(windows)]
fn launch(path: &Path) -> Result<InstallResult, String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::{
        Foundation::{CloseHandle, GetLastError, ERROR_CANCELLED, WAIT_OBJECT_0},
        System::Threading::{GetExitCodeProcess, WaitForSingleObject, INFINITE},
        UI::{
            Shell::{
                ShellExecuteExW, SEE_MASK_NOASYNC, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW,
            },
            WindowsAndMessaging::SW_SHOWNORMAL,
        },
    };
    let file: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let folder: Vec<u16> = path
        .parent()
        .ok_or("Invalid driver installer location")?
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect();
    let verb: Vec<u16> = "runas".encode_utf16().chain(Some(0)).collect();
    // Interactive official wizard; Windows handles elevation. Never auto-reboot.
    let parameters: Vec<u16> = "/norestart".encode_utf16().chain(Some(0)).collect();
    unsafe {
        let mut info: SHELLEXECUTEINFOW = std::mem::zeroed();
        info.cbSize = std::mem::size_of_val(&info) as u32;
        info.fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC;
        info.lpVerb = verb.as_ptr();
        info.lpFile = file.as_ptr();
        info.lpParameters = parameters.as_ptr();
        info.lpDirectory = folder.as_ptr();
        info.nShow = SW_SHOWNORMAL;
        if ShellExecuteExW(&mut info) == 0 {
            let code = GetLastError();
            return if code == ERROR_CANCELLED {
                result(code)
            } else {
                Err(format!(
                    "Could not launch driver installer: {}",
                    std::io::Error::from_raw_os_error(code as i32)
                ))
            };
        }
        if info.hProcess.is_null() {
            return Err("Windows did not return an installer process handle".into());
        }
        let waited = WaitForSingleObject(info.hProcess, INFINITE);
        let mut code = 0;
        let ok = if waited == WAIT_OBJECT_0 {
            GetExitCodeProcess(info.hProcess, &mut code)
        } else {
            0
        };
        let error = std::io::Error::last_os_error();
        CloseHandle(info.hProcess);
        if ok == 0 {
            return Err(format!(
                "Could not read the driver installer result: {error}"
            ));
        }
        result(code)
    }
}
#[cfg(not(windows))]
fn launch(_: &Path) -> Result<InstallResult, String> {
    Err("Driver installation requires Windows".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bundled_installers_match_the_pinned_manifest() {
        for kind in ["hidhide", "vigem"] {
            let entry = installer(kind).unwrap();
            verify(
                &PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .join("drivers")
                    .join(&entry.file),
                &entry,
            )
            .unwrap();
        }
    }
    #[test]
    fn rejects_unknown_installer_without_launching_anything() {
        assert!(installer("../cmd.exe").is_err());
        assert!(installer("SDL").is_err());
    }
    #[test]
    fn distinguishes_cancel_failure_and_restart() {
        assert!(result(1223).unwrap().cancelled);
        assert!(result(1602).unwrap().cancelled);
        assert!(result(3010).unwrap().reboot_required);
        assert!(!result(0).unwrap().reboot_required);
        assert!(result(1603).is_err());
    }
    #[test]
    fn refuses_an_existing_file_with_the_wrong_hash() {
        let entry = installer("hidhide").unwrap();
        let bad = Installer {
            sha256: "0".repeat(64),
            ..entry
        };
        assert!(verify(
            &PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("drivers")
                .join(&bad.file),
            &bad
        )
        .unwrap_err()
        .contains("checksum"));
    }
}
