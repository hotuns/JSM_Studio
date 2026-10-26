//! Read-only SetupAPI fallback for old HidHide CLI builds that truncate Unicode JSON.
#[cfg(windows)]
pub fn enumerate() -> Result<String, String> {
    use serde_json::json;
    use windows_sys::core::GUID;
    use windows_sys::Win32::{
        Devices::DeviceAndDriverInstallation::*,
        Foundation::{GetLastError, ERROR_NO_MORE_ITEMS, INVALID_HANDLE_VALUE},
    };
    const HID_CLASS: GUID = GUID::from_u128(0x745a17a0_74d3_11d0_b6fe_00a0c90f57da);
    unsafe fn property(set: HDEVINFO, info: &SP_DEVINFO_DATA, key: u32) -> String {
        let mut bytes = vec![0u8; 32768];
        let mut kind = 0;
        let mut needed = 0;
        if SetupDiGetDeviceRegistryPropertyW(
            set,
            info,
            key,
            &mut kind,
            bytes.as_mut_ptr(),
            bytes.len() as u32,
            &mut needed,
        ) == 0
        {
            return String::new();
        }
        let chars: Vec<_> = bytes[..(needed as usize).min(bytes.len())]
            .chunks_exact(2)
            .map(|b| u16::from_le_bytes([b[0], b[1]]))
            .collect();
        String::from_utf16_lossy(&chars)
            .trim_matches('\0')
            .replace('\0', " ")
    }
    unsafe {
        let set = SetupDiGetClassDevsW(
            &HID_CLASS,
            std::ptr::null(),
            std::ptr::null_mut(),
            DIGCF_PRESENT,
        );
        if set == INVALID_HANDLE_VALUE as isize {
            return Err(std::io::Error::last_os_error().to_string());
        }
        let mut groups = Vec::new();
        let mut index = 0;
        loop {
            let mut info: SP_DEVINFO_DATA = std::mem::zeroed();
            info.cbSize = std::mem::size_of_val(&info) as u32;
            if SetupDiEnumDeviceInfo(set, index, &mut info) == 0 {
                let code = GetLastError();
                if code != ERROR_NO_MORE_ITEMS {
                    SetupDiDestroyDeviceInfoList(set);
                    return Err(format!("Windows device enumeration failed: {code}"));
                }
                break;
            }
            index += 1;
            let mut instance = [0u16; 1024];
            if SetupDiGetDeviceInstanceIdW(
                set,
                &info,
                instance.as_mut_ptr(),
                instance.len() as u32,
                std::ptr::null_mut(),
            ) == 0
            {
                continue;
            }
            let id = String::from_utf16_lossy(
                &instance[..instance
                    .iter()
                    .position(|c| *c == 0)
                    .unwrap_or(instance.len())],
            );
            if !id.to_uppercase().starts_with("HID\\") {
                continue;
            }
            let compat = property(set, &info, SPDRP_COMPATIBLEIDS).to_uppercase();
            let is_xinput = id.to_uppercase().contains("&IG_");
            if !is_xinput
                && ![
                    "HID_DEVICE_SYSTEM_GAME",
                    "HID_DEVICE_SYSTEM_JOYSTICK",
                    "HID_DEVICE_UP:0001_U:0004",
                    "HID_DEVICE_UP:0001_U:0005",
                ]
                .iter()
                .any(|s| compat.contains(s))
            {
                continue;
            }
            let description = property(set, &info, SPDRP_DEVICEDESC);
            let friendly = property(set, &info, SPDRP_FRIENDLYNAME);
            let name = if friendly.is_empty() {
                description.clone()
            } else {
                friendly
            };
            let mut current = info.DevInst;
            let mut base = String::new();
            let mut xusb = String::new();
            let mut virtual_device = false;
            for _ in 0..12 {
                let mut parent = 0;
                if CM_Get_Parent(&mut parent, current, 0) != CR_SUCCESS {
                    break;
                }
                current = parent;
                let mut buffer = [0u16; 1024];
                if CM_Get_Device_IDW(parent, buffer.as_mut_ptr(), buffer.len() as u32, 0)
                    != CR_SUCCESS
                {
                    break;
                }
                let value = String::from_utf16_lossy(
                    &buffer[..buffer.iter().position(|c| *c == 0).unwrap_or(buffer.len())],
                );
                let upper = value.to_uppercase();
                if upper.contains("VIGEM") || upper.starts_with("ROOT\\") {
                    virtual_device = true;
                    break;
                }
                if upper.starts_with("USB\\VID_") {
                    if is_xinput && xusb.is_empty() {
                        xusb = value.clone();
                    }
                    base = value.clone();
                    if !upper.contains("&MI_") && !upper.contains("&IG_") {
                        break;
                    }
                }
            }
            if virtual_device {
                continue;
            }
            groups.push(json!({"friendlyName":name,"devices":[{"present":true,"gamingDevice":true,"description":description,"product":name,"deviceInstancePath":id,"xusbDeviceInstancePath":xusb,"baseContainerDeviceInstancePath":base,"baseContainerDeviceCount":0}]}));
        }
        SetupDiDestroyDeviceInfoList(set);
        serde_json::to_string(&groups).map_err(|e| e.to_string())
    }
}
#[cfg(not(windows))]
pub fn enumerate() -> Result<String, String> {
    Err("Windows device enumeration is unavailable".into())
}
