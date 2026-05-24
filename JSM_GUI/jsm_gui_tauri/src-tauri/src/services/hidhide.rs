use std::collections::{BTreeSet, HashMap, HashSet};

use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;

use crate::runtime;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HidHideDevice {
    pub instance_id: String,
    pub display_name: String,
    pub vendor: String,
    pub product: String,
    pub serial_number: Option<String>,
    pub present: bool,
    pub hidden: bool,
    pub likely_current_controller: bool,
    pub stale: bool,
    pub managed_by_app: bool,
    pub vendor_id: Option<u16>,
    pub product_id: Option<u16>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HidHideStatus {
    pub supported: bool,
    pub installed: bool,
    pub active: bool,
    pub devices: Vec<HidHideDevice>,
    pub managed_instance_ids: Vec<String>,
    pub whitelist_synced: bool,
    pub requires_elevation: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HidHideInstallResult {
    pub completed: bool,
    pub installer_path: Option<String>,
    pub status: HidHideStatus,
}

pub fn get_status(app: &AppHandle, latest_packet: Option<&Value>) -> Result<HidHideStatus, String> {
    imp::get_status(app, latest_packet)
}

pub fn set_active(
    app: &AppHandle,
    active: bool,
    latest_packet: Option<&Value>,
) -> Result<HidHideStatus, String> {
    imp::set_active(app, active, latest_packet)
}

pub fn set_device_hidden(
    app: &AppHandle,
    instance_id: &str,
    hidden: bool,
    latest_packet: Option<&Value>,
) -> Result<HidHideStatus, String> {
    imp::set_device_hidden(app, instance_id, hidden, latest_packet)
}

pub fn sync_whitelist(
    app: &AppHandle,
    latest_packet: Option<&Value>,
) -> Result<HidHideStatus, String> {
    imp::sync_whitelist(app, latest_packet)
}

pub fn install_bundled(
    app: &AppHandle,
    latest_packet: Option<&Value>,
) -> Result<HidHideInstallResult, String> {
    imp::install_bundled(app, latest_packet)
}

pub fn open_configuration_client(app: &AppHandle) -> Result<(), String> {
    imp::open_configuration_client(app)
}

fn canonicalize_instance_id(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn canonicalize_value(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

fn sort_case_insensitive(values: &mut [String]) {
    values.sort_by(|left, right| {
        left.to_ascii_lowercase()
            .cmp(&right.to_ascii_lowercase())
            .then_with(|| left.cmp(right))
    });
}

fn unique_values(values: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut unique = Vec::new();
    for value in values {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }
        let canonical = canonicalize_value(trimmed);
        if seen.insert(canonical) {
            unique.push(trimmed.to_string());
        }
    }
    sort_case_insensitive(&mut unique);
    unique
}

fn encode_multi_string(values: &[String]) -> Vec<u16> {
    let mut encoded = Vec::new();
    for value in values {
        encoded.extend(value.encode_utf16());
        encoded.push(0);
    }
    encoded.push(0);
    encoded
}

fn decode_multi_string(values: &[u16]) -> Vec<String> {
    let mut decoded = Vec::new();
    let mut start = 0usize;

    for (index, value) in values.iter().enumerate() {
        if *value != 0 {
            continue;
        }
        if start == index {
            start = index + 1;
            continue;
        }
        decoded.push(String::from_utf16_lossy(&values[start..index]));
        start = index + 1;
    }

    decoded
}

fn update_managed_instance_ids(current: &[String], target: &[String], hidden: bool) -> Vec<String> {
    let targets = target
        .iter()
        .map(|value| canonicalize_instance_id(value))
        .collect::<HashSet<_>>();

    if hidden {
        let mut merged = current.to_vec();
        let mut seen = current
            .iter()
            .map(|value| canonicalize_instance_id(value))
            .collect::<HashSet<_>>();
        for value in target {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                continue;
            }
            let canonical = canonicalize_instance_id(trimmed);
            if seen.insert(canonical) {
                merged.push(trimmed.to_string());
            }
        }
        sort_case_insensitive(&mut merged);
        return merged;
    }

    let mut retained = current
        .iter()
        .filter(|value| !targets.contains(&canonicalize_instance_id(value)))
        .cloned()
        .collect::<Vec<_>>();
    sort_case_insensitive(&mut retained);
    retained
}

fn merge_blacklist(
    live: &[String],
    previous_managed: &[String],
    next_managed: &[String],
) -> Vec<String> {
    let previous_managed = previous_managed
        .iter()
        .map(|value| canonicalize_instance_id(value))
        .collect::<HashSet<_>>();

    let mut merged = live
        .iter()
        .filter(|value| !previous_managed.contains(&canonicalize_instance_id(value)))
        .cloned()
        .collect::<Vec<_>>();

    let mut seen = merged
        .iter()
        .map(|value| canonicalize_instance_id(value))
        .collect::<HashSet<_>>();

    for value in next_managed {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }
        let canonical = canonicalize_instance_id(trimmed);
        if seen.insert(canonical) {
            merged.push(trimmed.to_string());
        }
    }

    merged
}

fn merge_whitelist(live: &[String], required: &[String]) -> Vec<String> {
    let mut merged = live.to_vec();
    let mut seen = merged
        .iter()
        .map(|value| canonicalize_value(value))
        .collect::<HashSet<_>>();

    for value in required {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }
        let canonical = canonicalize_value(trimmed);
        if seen.insert(canonical) {
            merged.push(trimmed.to_string());
        }
    }

    merged
}

fn whitelist_is_synced(live: &[String], required: &[String]) -> bool {
    if required.is_empty() {
        return false;
    }

    let live = live
        .iter()
        .map(|value| canonicalize_value(value))
        .collect::<HashSet<_>>();

    required
        .iter()
        .all(|value| live.contains(&canonicalize_value(value)))
}

fn parse_likely_pairs(latest_packet: Option<&Value>) -> HashSet<(u16, u16)> {
    let Some(packet) = latest_packet else {
        return HashSet::new();
    };
    let Some(devices) = packet.get("devices").and_then(Value::as_array) else {
        return HashSet::new();
    };

    let mut pairs = HashSet::new();
    for device in devices {
        let Some(vid) = device.get("vid").and_then(Value::as_u64) else {
            continue;
        };
        let Some(pid) = device.get("pid").and_then(Value::as_u64) else {
            continue;
        };
        if vid == 0 || pid == 0 {
            continue;
        }
        pairs.insert((vid as u16, pid as u16));
    }
    pairs
}

fn normalize_windows_image_path(path: &str) -> Result<String, String> {
    let normalized = path.replace('/', "\\");
    if normalized.starts_with(r"\Device\") {
        return Ok(normalized);
    }
    if let Some(stripped) = normalized.strip_prefix(r"\\?\") {
        if stripped.starts_with(r"UNC\") {
            return Err(format!(
                "Executable path on a UNC share is not supported: {path}"
            ));
        }
        return Ok(stripped.to_string());
    }
    if let Some(stripped) = normalized.strip_prefix(r"\??\") {
        return Ok(stripped.to_string());
    }
    Ok(normalized)
}

#[cfg(target_os = "windows")]
mod imp {
    use std::{
        fs,
        mem::size_of,
        path::{Path, PathBuf},
        process::Command,
        ptr::{addr_of, null, null_mut},
    };

    use tauri::Manager;

    use windows_sys::{
        core::GUID,
        Win32::{
            Devices::{
                DeviceAndDriverInstallation::{
                    SetupDiDestroyDeviceInfoList, SetupDiEnumDeviceInterfaces,
                    SetupDiGetClassDevsW, SetupDiGetDeviceInstanceIdW,
                    SetupDiGetDeviceInterfaceDetailW, SetupDiGetDevicePropertyW,
                    DIGCF_DEVICEINTERFACE, DIGCF_PRESENT, HDEVINFO, SP_DEVICE_INTERFACE_DATA,
                    SP_DEVICE_INTERFACE_DETAIL_DATA_W, SP_DEVINFO_DATA,
                },
                HumanInterfaceDevice::{
                    HidD_FreePreparsedData, HidD_GetAttributes, HidD_GetHidGuid,
                    HidD_GetManufacturerString, HidD_GetPreparsedData, HidD_GetProductString,
                    HidD_GetSerialNumberString, HidP_GetCaps, HIDD_ATTRIBUTES, HIDP_CAPS,
                    HIDP_STATUS_SUCCESS, PHIDP_PREPARSED_DATA,
                },
                Properties::{
                    DEVPKEY_Device_BusReportedDeviceDesc, DEVPKEY_Device_ContainerId,
                    DEVPKEY_Device_DeviceDesc, DEVPKEY_Device_FriendlyName,
                    DEVPKEY_Device_Manufacturer, DEVPROPTYPE, DEVPROP_TYPE_GUID,
                    DEVPROP_TYPE_STRING,
                },
            },
            Foundation::{
                CloseHandle, GetLastError, ERROR_ACCESS_DENIED, ERROR_FILE_NOT_FOUND,
                ERROR_INSUFFICIENT_BUFFER, ERROR_NOT_FOUND, ERROR_NO_MORE_ITEMS, GENERIC_READ,
                HANDLE, INVALID_HANDLE_VALUE,
            },
            Storage::FileSystem::{
                CreateFileW, QueryDosDeviceW, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_DELETE,
                FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
            },
            System::IO::DeviceIoControl,
        },
    };

    use super::*;

    const IO_CONTROL_DEVICE_TYPE: u32 = 32769;
    const IOCTL_GET_WHITELIST: u32 = ctl_code(
        IO_CONTROL_DEVICE_TYPE,
        2048,
        METHOD_BUFFERED,
        FILE_READ_DATA,
    );
    const IOCTL_SET_WHITELIST: u32 = ctl_code(
        IO_CONTROL_DEVICE_TYPE,
        2049,
        METHOD_BUFFERED,
        FILE_READ_DATA,
    );
    const IOCTL_GET_BLACKLIST: u32 = ctl_code(
        IO_CONTROL_DEVICE_TYPE,
        2050,
        METHOD_BUFFERED,
        FILE_READ_DATA,
    );
    const IOCTL_SET_BLACKLIST: u32 = ctl_code(
        IO_CONTROL_DEVICE_TYPE,
        2051,
        METHOD_BUFFERED,
        FILE_READ_DATA,
    );
    const IOCTL_GET_ACTIVE: u32 = ctl_code(
        IO_CONTROL_DEVICE_TYPE,
        2052,
        METHOD_BUFFERED,
        FILE_READ_DATA,
    );
    const IOCTL_SET_ACTIVE: u32 = ctl_code(
        IO_CONTROL_DEVICE_TYPE,
        2053,
        METHOD_BUFFERED,
        FILE_READ_DATA,
    );

    const METHOD_BUFFERED: u32 = 0;
    const FILE_READ_DATA: u32 = 0x0001;
    const INVALID_DEVICE_INFO_SET: HDEVINFO = -1isize;
    const HIDHIDE_ACCESS_DENIED_MESSAGE: &str =
        "Access denied opening the HidHide control device. Run JSM Studio as administrator.";
    const HIDHIDE_INSTALLER_REBOOT_REQUIRED_EXIT_CODE: i32 = 3010;

    enum ControlDeviceStatus {
        Ready,
        Missing,
        AccessDenied,
    }

    #[derive(Clone, Debug)]
    struct RawHidDevice {
        instance_id: String,
        group_key: String,
        display_hint: String,
        vendor: String,
        product: String,
        serial_number: Option<String>,
        present: bool,
        candidate: bool,
        hidden: bool,
        managed_by_app: bool,
        likely_current_controller: bool,
        vendor_id: Option<u16>,
        product_id: Option<u16>,
    }

    #[derive(Clone, Debug)]
    struct GroupedDevice {
        device: HidHideDevice,
        child_instance_ids: Vec<String>,
    }

    struct HandleGuard(HANDLE);

    impl Drop for HandleGuard {
        fn drop(&mut self) {
            if !self.0.is_null() && self.0 != INVALID_HANDLE_VALUE {
                unsafe {
                    CloseHandle(self.0);
                }
            }
        }
    }

    struct DeviceInfoSetGuard(HDEVINFO);

    impl Drop for DeviceInfoSetGuard {
        fn drop(&mut self) {
            if self.0 != INVALID_DEVICE_INFO_SET {
                unsafe {
                    SetupDiDestroyDeviceInfoList(self.0);
                }
            }
        }
    }

    struct PreparsedDataGuard(PHIDP_PREPARSED_DATA);

    impl Drop for PreparsedDataGuard {
        fn drop(&mut self) {
            if self.0 != 0 {
                unsafe {
                    HidD_FreePreparsedData(self.0);
                }
            }
        }
    }

    pub fn get_status(
        app: &AppHandle,
        latest_packet: Option<&Value>,
    ) -> Result<HidHideStatus, String> {
        let managed_state = runtime::read_hidhide_state(app)?;
        let mut managed_instance_ids = managed_state.managed_instance_ids;
        sort_case_insensitive(&mut managed_instance_ids);

        match control_device_status()? {
            ControlDeviceStatus::Missing => {
                return Ok(HidHideStatus {
                    supported: true,
                    installed: false,
                    active: false,
                    devices: stale_devices(&managed_instance_ids),
                    managed_instance_ids,
                    whitelist_synced: false,
                    requires_elevation: false,
                });
            }
            ControlDeviceStatus::AccessDenied => {
                return Ok(HidHideStatus {
                    supported: true,
                    installed: true,
                    active: false,
                    devices: stale_devices(&managed_instance_ids),
                    managed_instance_ids,
                    whitelist_synced: false,
                    requires_elevation: true,
                });
            }
            ControlDeviceStatus::Ready => {}
        }

        let blacklist = get_blacklist()?;
        let whitelist = get_whitelist()?;
        let required_whitelist_entries = required_whitelist_entries(app)?;
        let active = get_active()?;
        let likely_pairs = parse_likely_pairs(latest_packet);
        let grouped_devices = enumerate_devices(&managed_instance_ids, &blacklist, &likely_pairs)?;

        Ok(HidHideStatus {
            supported: true,
            installed: true,
            active,
            devices: build_devices(grouped_devices, &managed_instance_ids, &blacklist),
            managed_instance_ids,
            whitelist_synced: whitelist_is_synced(&whitelist, &required_whitelist_entries),
            requires_elevation: false,
        })
    }

    pub fn set_active(
        app: &AppHandle,
        active: bool,
        latest_packet: Option<&Value>,
    ) -> Result<HidHideStatus, String> {
        ensure_control_device_ready()?;

        if active {
            sync_whitelist_entries(app)?;
        }

        set_active_flag(active)?;
        get_status(app, latest_packet)
    }

    pub fn set_device_hidden(
        app: &AppHandle,
        instance_id: &str,
        hidden: bool,
        latest_packet: Option<&Value>,
    ) -> Result<HidHideStatus, String> {
        ensure_control_device_ready()?;

        let trimmed_instance_id = instance_id.trim();
        if trimmed_instance_id.is_empty() {
            return Err("Instance ID cannot be empty.".to_string());
        }

        let managed_state = runtime::read_hidhide_state(app)?;
        let previous_managed = managed_state.managed_instance_ids;
        let blacklist = get_blacklist()?;
        let likely_pairs = parse_likely_pairs(latest_packet);
        let grouped_devices = enumerate_devices(&previous_managed, &blacklist, &likely_pairs)?;

        let canonical_target = canonicalize_instance_id(trimmed_instance_id);
        let target_instance_ids = grouped_devices
            .iter()
            .find(|group| {
                canonicalize_instance_id(&group.device.instance_id) == canonical_target
                    || group
                        .child_instance_ids
                        .iter()
                        .any(|child| canonicalize_instance_id(child) == canonical_target)
            })
            .map(|group| group.child_instance_ids.clone());

        let Some(target_instance_ids) = target_instance_ids.or_else(|| {
            if hidden {
                None
            } else {
                Some(vec![trimmed_instance_id.to_string()])
            }
        }) else {
            return Err(format!(
                "Unable to find a HidHide device for instance ID: {trimmed_instance_id}"
            ));
        };

        let next_managed =
            update_managed_instance_ids(&previous_managed, &target_instance_ids, hidden);
        let next_blacklist = merge_blacklist(&blacklist, &previous_managed, &next_managed);

        if hidden {
            sync_whitelist_entries(app)?;
        }

        set_blacklist(&next_blacklist)?;

        if hidden {
            set_active_flag(true)?;
        }

        runtime::write_hidhide_state(
            app,
            &runtime::HidHideState {
                managed_instance_ids: next_managed,
            },
        )?;

        get_status(app, latest_packet)
    }

    pub fn sync_whitelist(
        app: &AppHandle,
        latest_packet: Option<&Value>,
    ) -> Result<HidHideStatus, String> {
        ensure_control_device_ready()?;

        sync_whitelist_entries(app)?;
        get_status(app, latest_packet)
    }

    pub fn install_bundled(
        app: &AppHandle,
        latest_packet: Option<&Value>,
    ) -> Result<HidHideInstallResult, String> {
        let current_status = get_status(app, latest_packet)?;
        if current_status.installed {
            return Ok(HidHideInstallResult {
                completed: false,
                installer_path: None,
                status: current_status,
            });
        }

        let installer_path = find_bundled_hidhide_installer(app)?;
        run_hidhide_installer(&installer_path)?;

        Ok(HidHideInstallResult {
            completed: true,
            installer_path: Some(installer_path.display().to_string()),
            status: get_status(app, latest_packet)?,
        })
    }

    pub fn open_configuration_client(app: &AppHandle) -> Result<(), String> {
        if matches!(control_device_status()?, ControlDeviceStatus::Missing) {
            return Err("HidHide is not installed.".to_string());
        }

        let client_path = find_hidhide_configuration_client(app)?;
        Command::new(&client_path).spawn().map_err(|error| {
            format!(
                "Failed to launch HidHide configuration client {}: {error}",
                client_path.display()
            )
        })?;

        Ok(())
    }

    fn build_devices(
        grouped_devices: Vec<GroupedDevice>,
        managed_instance_ids: &[String],
        blacklist: &[String],
    ) -> Vec<HidHideDevice> {
        let mut devices = grouped_devices
            .iter()
            .map(|group| group.device.clone())
            .collect::<Vec<_>>();

        let known_instance_ids = grouped_devices
            .iter()
            .flat_map(|group| group.child_instance_ids.iter())
            .map(|value| canonicalize_instance_id(value))
            .collect::<HashSet<_>>();

        let blacklisted_ids = blacklist
            .iter()
            .map(|value| canonicalize_instance_id(value))
            .collect::<HashSet<_>>();

        for managed_instance_id in managed_instance_ids {
            if known_instance_ids.contains(&canonicalize_instance_id(managed_instance_id)) {
                continue;
            }
            let (vendor_id, product_id) = parse_vid_pid_from_instance_id(managed_instance_id);
            devices.push(HidHideDevice {
                instance_id: managed_instance_id.clone(),
                display_name: "Unavailable saved HID device".to_string(),
                vendor: String::new(),
                product: String::new(),
                serial_number: None,
                present: false,
                hidden: blacklisted_ids.contains(&canonicalize_instance_id(managed_instance_id)),
                likely_current_controller: false,
                stale: true,
                managed_by_app: true,
                vendor_id,
                product_id,
            });
        }

        devices.sort_by(|left, right| {
            right
                .likely_current_controller
                .cmp(&left.likely_current_controller)
                .then_with(|| left.stale.cmp(&right.stale))
                .then_with(|| right.hidden.cmp(&left.hidden))
                .then_with(|| {
                    left.display_name
                        .to_ascii_lowercase()
                        .cmp(&right.display_name.to_ascii_lowercase())
                })
                .then_with(|| {
                    left.instance_id
                        .to_ascii_lowercase()
                        .cmp(&right.instance_id.to_ascii_lowercase())
                })
        });

        devices
    }

    fn stale_devices(managed_instance_ids: &[String]) -> Vec<HidHideDevice> {
        managed_instance_ids
            .iter()
            .map(|instance_id| {
                let (vendor_id, product_id) = parse_vid_pid_from_instance_id(instance_id);
                HidHideDevice {
                    instance_id: instance_id.clone(),
                    display_name: "Unavailable saved HID device".to_string(),
                    vendor: String::new(),
                    product: String::new(),
                    serial_number: None,
                    present: false,
                    hidden: false,
                    likely_current_controller: false,
                    stale: true,
                    managed_by_app: true,
                    vendor_id,
                    product_id,
                }
            })
            .collect()
    }

    fn enumerate_devices(
        managed_instance_ids: &[String],
        blacklist: &[String],
        likely_pairs: &HashSet<(u16, u16)>,
    ) -> Result<Vec<GroupedDevice>, String> {
        let managed = managed_instance_ids
            .iter()
            .map(|value| canonicalize_instance_id(value))
            .collect::<HashSet<_>>();
        let blacklisted = blacklist
            .iter()
            .map(|value| canonicalize_instance_id(value))
            .collect::<HashSet<_>>();

        let raw_devices = enumerate_present_hid_devices(&managed, &blacklisted, likely_pairs)?;
        let mut groups = HashMap::<String, Vec<RawHidDevice>>::new();
        for raw in raw_devices {
            groups.entry(raw.group_key.clone()).or_default().push(raw);
        }

        let mut grouped_devices = Vec::new();
        for devices in groups.into_values() {
            if !devices.iter().any(|device| device.candidate) {
                continue;
            }

            let child_instance_ids = devices
                .iter()
                .map(|device| device.instance_id.clone())
                .collect::<Vec<_>>();

            let instance_id = child_instance_ids
                .iter()
                .min_by(|left, right| {
                    left.to_ascii_lowercase()
                        .cmp(&right.to_ascii_lowercase())
                        .then_with(|| left.cmp(right))
                })
                .cloned()
                .unwrap_or_default();

            let vendor_values = devices
                .iter()
                .map(|device| device.vendor.clone())
                .collect::<Vec<_>>();
            let product_values = devices
                .iter()
                .map(|device| device.product.clone())
                .collect::<Vec<_>>();
            let hint_values = devices
                .iter()
                .map(|device| device.display_hint.clone())
                .collect::<Vec<_>>();
            let serial_values = devices
                .iter()
                .filter_map(|device| device.serial_number.clone())
                .collect::<Vec<_>>();
            let vendor_ids = devices
                .iter()
                .filter_map(|device| device.vendor_id)
                .collect::<BTreeSet<_>>();
            let product_ids = devices
                .iter()
                .filter_map(|device| device.product_id)
                .collect::<BTreeSet<_>>();

            let vendor = unique_values(&vendor_values).join(" / ");
            let product = unique_values(&product_values).join(" / ");
            let display_name = build_display_name(&vendor, &product, &hint_values, &instance_id);
            let serial_number = match unique_values(&serial_values).as_slice() {
                [single] => Some(single.clone()),
                _ => None,
            };

            grouped_devices.push(GroupedDevice {
                device: HidHideDevice {
                    instance_id,
                    display_name,
                    vendor,
                    product,
                    serial_number,
                    present: devices.iter().any(|device| device.present),
                    hidden: devices.iter().any(|device| device.hidden),
                    likely_current_controller: devices
                        .iter()
                        .any(|device| device.likely_current_controller),
                    stale: false,
                    managed_by_app: devices.iter().any(|device| device.managed_by_app),
                    vendor_id: vendor_ids.iter().next().copied(),
                    product_id: product_ids.iter().next().copied(),
                },
                child_instance_ids,
            });
        }

        grouped_devices.sort_by(|left, right| {
            right
                .device
                .likely_current_controller
                .cmp(&left.device.likely_current_controller)
                .then_with(|| {
                    left.device
                        .display_name
                        .to_ascii_lowercase()
                        .cmp(&right.device.display_name.to_ascii_lowercase())
                })
                .then_with(|| {
                    left.device
                        .instance_id
                        .to_ascii_lowercase()
                        .cmp(&right.device.instance_id.to_ascii_lowercase())
                })
        });

        Ok(grouped_devices)
    }

    fn enumerate_present_hid_devices(
        managed: &HashSet<String>,
        blacklisted: &HashSet<String>,
        likely_pairs: &HashSet<(u16, u16)>,
    ) -> Result<Vec<RawHidDevice>, String> {
        let mut hid_guid = GUID::default();
        unsafe {
            HidD_GetHidGuid(&mut hid_guid);
        }

        let device_info_set = unsafe {
            SetupDiGetClassDevsW(
                &hid_guid,
                null(),
                null_mut(),
                DIGCF_DEVICEINTERFACE | DIGCF_PRESENT,
            )
        };
        if device_info_set == INVALID_DEVICE_INFO_SET {
            return Err(format!(
                "Failed to enumerate HID devices: {}",
                std::io::Error::last_os_error()
            ));
        }
        let _device_info_guard = DeviceInfoSetGuard(device_info_set);

        let mut devices = Vec::new();
        let mut interface_index = 0u32;

        loop {
            let mut interface_data = SP_DEVICE_INTERFACE_DATA {
                cbSize: size_of::<SP_DEVICE_INTERFACE_DATA>() as u32,
                ..Default::default()
            };

            let enum_result = unsafe {
                SetupDiEnumDeviceInterfaces(
                    device_info_set,
                    null(),
                    &hid_guid,
                    interface_index,
                    &mut interface_data,
                )
            };

            if enum_result == 0 {
                let error = unsafe { GetLastError() };
                if error == ERROR_NO_MORE_ITEMS {
                    break;
                }
                return Err(format!(
                    "Failed to enumerate HID device interfaces: {}",
                    std::io::Error::from_raw_os_error(error as i32)
                ));
            }

            interface_index += 1;
            let mut required_size = 0u32;
            unsafe {
                SetupDiGetDeviceInterfaceDetailW(
                    device_info_set,
                    &interface_data,
                    null_mut(),
                    0,
                    &mut required_size,
                    null_mut(),
                );
            }

            let detail_error = unsafe { GetLastError() };
            if required_size == 0 || detail_error != ERROR_INSUFFICIENT_BUFFER {
                continue;
            }

            let mut detail_buffer = vec![0u8; required_size as usize];
            let detail_data = detail_buffer.as_mut_ptr() as *mut SP_DEVICE_INTERFACE_DETAIL_DATA_W;
            unsafe {
                (*detail_data).cbSize = size_of::<SP_DEVICE_INTERFACE_DETAIL_DATA_W>() as u32;
            }

            let mut devinfo_data = SP_DEVINFO_DATA {
                cbSize: size_of::<SP_DEVINFO_DATA>() as u32,
                ..Default::default()
            };

            let detail_result = unsafe {
                SetupDiGetDeviceInterfaceDetailW(
                    device_info_set,
                    &interface_data,
                    detail_data,
                    required_size,
                    null_mut(),
                    &mut devinfo_data,
                )
            };
            if detail_result == 0 {
                continue;
            }

            let device_path =
                unsafe { read_wide_ptr(addr_of!((*detail_data).DevicePath) as *const u16) };
            let Some(instance_id) = get_device_instance_id(device_info_set, &devinfo_data) else {
                continue;
            };
            let canonical_instance_id = canonicalize_instance_id(&instance_id);
            let hidden = blacklisted.contains(&canonical_instance_id);
            let managed_by_app = managed.contains(&canonical_instance_id);

            let friendly_name = get_device_property_string(
                device_info_set,
                &devinfo_data,
                &DEVPKEY_Device_FriendlyName,
            );
            let bus_reported_desc = get_device_property_string(
                device_info_set,
                &devinfo_data,
                &DEVPKEY_Device_BusReportedDeviceDesc,
            );
            let device_desc = get_device_property_string(
                device_info_set,
                &devinfo_data,
                &DEVPKEY_Device_DeviceDesc,
            );
            let manufacturer = get_device_property_string(
                device_info_set,
                &devinfo_data,
                &DEVPKEY_Device_Manufacturer,
            );
            let container_id = get_device_property_guid(
                device_info_set,
                &devinfo_data,
                &DEVPKEY_Device_ContainerId,
            );

            let hid_details = read_hid_details(&device_path).unwrap_or_default();
            let (parsed_vid, parsed_pid) = parse_vid_pid_from_instance_id(&instance_id);
            let vendor_id = hid_details.vendor_id.or(parsed_vid);
            let product_id = hid_details.product_id.or(parsed_pid);
            let likely_current_controller = vendor_id
                .zip(product_id)
                .map(|pair| likely_pairs.contains(&pair))
                .unwrap_or(false);

            let vendor = first_non_empty(&[hid_details.vendor.as_deref(), manufacturer.as_deref()])
                .unwrap_or_default()
                .to_string();

            let product = first_non_empty(&[
                hid_details.product.as_deref(),
                bus_reported_desc.as_deref(),
                friendly_name.as_deref(),
                device_desc.as_deref(),
            ])
            .unwrap_or_default()
            .to_string();

            let display_hint = first_non_empty(&[
                friendly_name.as_deref(),
                bus_reported_desc.as_deref(),
                device_desc.as_deref(),
                Some(instance_id.as_str()),
            ])
            .unwrap_or_default()
            .to_string();

            let candidate = hid_details.gaming_device
                || hidden
                || managed_by_app
                || looks_like_game_controller(&display_hint, &vendor, &product);

            let group_key = container_id
                .filter(|guid| !is_null_guid(guid))
                .map(|guid| format!("container:{}", guid_to_string(&guid)))
                .unwrap_or_else(|| format!("instance:{canonical_instance_id}"));

            devices.push(RawHidDevice {
                instance_id,
                group_key,
                display_hint,
                vendor,
                product,
                serial_number: hid_details.serial_number,
                present: true,
                candidate,
                hidden,
                managed_by_app,
                likely_current_controller,
                vendor_id,
                product_id,
            });
        }

        Ok(devices)
    }

    #[derive(Default)]
    struct HidDetails {
        vendor: Option<String>,
        product: Option<String>,
        serial_number: Option<String>,
        vendor_id: Option<u16>,
        product_id: Option<u16>,
        gaming_device: bool,
    }

    fn read_hid_details(device_path: &str) -> Option<HidDetails> {
        let handle = open_file_handle(device_path)?;
        let _handle_guard = HandleGuard(handle);

        let mut attributes = HIDD_ATTRIBUTES {
            Size: size_of::<HIDD_ATTRIBUTES>() as u32,
            ..Default::default()
        };
        if !unsafe { HidD_GetAttributes(handle, &mut attributes) } {
            return None;
        }

        let mut preparsed_data: PHIDP_PREPARSED_DATA = 0;
        if !unsafe { HidD_GetPreparsedData(handle, &mut preparsed_data) } {
            return None;
        }
        let _preparsed_data_guard = PreparsedDataGuard(preparsed_data);

        let mut caps = HIDP_CAPS::default();
        if unsafe { HidP_GetCaps(preparsed_data, &mut caps) } != HIDP_STATUS_SUCCESS {
            return None;
        }

        Some(HidDetails {
            vendor: read_hid_wide_string(handle, HidD_GetManufacturerString),
            product: read_hid_wide_string(handle, HidD_GetProductString),
            serial_number: read_hid_wide_string(handle, HidD_GetSerialNumberString),
            vendor_id: Some(attributes.VendorID),
            product_id: Some(attributes.ProductID),
            gaming_device: is_gaming_device(
                attributes.VendorID,
                attributes.ProductID,
                caps.UsagePage,
                caps.Usage,
            ),
        })
    }

    fn get_device_instance_id(
        device_info_set: HDEVINFO,
        devinfo_data: &SP_DEVINFO_DATA,
    ) -> Option<String> {
        let mut required_size = 0u32;
        unsafe {
            SetupDiGetDeviceInstanceIdW(
                device_info_set,
                devinfo_data,
                null_mut(),
                0,
                &mut required_size,
            );
        }

        let error = unsafe { GetLastError() };
        if required_size == 0 || error != ERROR_INSUFFICIENT_BUFFER {
            return None;
        }

        let mut buffer = vec![0u16; required_size as usize + 1];
        let success = unsafe {
            SetupDiGetDeviceInstanceIdW(
                device_info_set,
                devinfo_data,
                buffer.as_mut_ptr(),
                buffer.len() as u32,
                &mut required_size,
            )
        };
        if success == 0 {
            return None;
        }

        Some(read_wide_slice(&buffer))
    }

    fn get_device_property_string(
        device_info_set: HDEVINFO,
        devinfo_data: &SP_DEVINFO_DATA,
        property_key: &windows_sys::Win32::Foundation::DEVPROPKEY,
    ) -> Option<String> {
        let (property_type, buffer) =
            get_device_property_buffer(device_info_set, devinfo_data, property_key)?;
        if property_type != DEVPROP_TYPE_STRING {
            return None;
        }
        if buffer.is_empty() {
            return None;
        }

        let wide = unsafe {
            std::slice::from_raw_parts(
                buffer.as_ptr() as *const u16,
                buffer.len() / size_of::<u16>(),
            )
        };
        let value = read_wide_slice(wide);
        if value.trim().is_empty() {
            None
        } else {
            Some(value)
        }
    }

    fn get_device_property_guid(
        device_info_set: HDEVINFO,
        devinfo_data: &SP_DEVINFO_DATA,
        property_key: &windows_sys::Win32::Foundation::DEVPROPKEY,
    ) -> Option<GUID> {
        let (property_type, buffer) =
            get_device_property_buffer(device_info_set, devinfo_data, property_key)?;
        if property_type != DEVPROP_TYPE_GUID || buffer.len() < size_of::<GUID>() {
            return None;
        }

        Some(unsafe { *(buffer.as_ptr() as *const GUID) })
    }

    fn get_device_property_buffer(
        device_info_set: HDEVINFO,
        devinfo_data: &SP_DEVINFO_DATA,
        property_key: &windows_sys::Win32::Foundation::DEVPROPKEY,
    ) -> Option<(DEVPROPTYPE, Vec<u8>)> {
        let mut property_type = 0u32;
        let mut required_size = 0u32;
        let initial_result = unsafe {
            SetupDiGetDevicePropertyW(
                device_info_set,
                devinfo_data,
                property_key,
                &mut property_type,
                null_mut(),
                0,
                &mut required_size,
                0,
            )
        };
        if initial_result != 0 {
            return Some((property_type, Vec::new()));
        }

        let error = unsafe { GetLastError() };
        if error == ERROR_NOT_FOUND || required_size == 0 {
            return None;
        }
        if error != ERROR_INSUFFICIENT_BUFFER {
            return None;
        }

        let mut buffer = vec![0u8; required_size as usize];
        let result = unsafe {
            SetupDiGetDevicePropertyW(
                device_info_set,
                devinfo_data,
                property_key,
                &mut property_type,
                buffer.as_mut_ptr(),
                buffer.len() as u32,
                &mut required_size,
                0,
            )
        };
        if result == 0 {
            return None;
        }

        buffer.truncate(required_size as usize);
        Some((property_type, buffer))
    }

    fn find_bundled_hidhide_installer(app: &AppHandle) -> Result<PathBuf, String> {
        let directories = bundled_hidhide_installer_dirs(app);
        let mut candidates = Vec::new();

        for directory in &directories {
            let Ok(entries) = fs::read_dir(directory) else {
                continue;
            };
            for entry in entries.flatten() {
                let path = entry.path();
                if is_hidhide_installer_candidate(&path) {
                    candidates.push(path);
                }
            }
        }

        candidates.sort_by(|left, right| installer_rank(left).cmp(&installer_rank(right)));

        candidates.into_iter().next().ok_or_else(|| {
            let searched = directories
                .iter()
                .map(|path| path.display().to_string())
                .collect::<Vec<_>>()
                .join(", ");
            format!(
                "Bundled HidHide installer not found. Place an official HidHide*.exe or HidHide*.msi installer in src-tauri/third_party/HidHide before building. Searched: {searched}"
            )
        })
    }

    fn bundled_hidhide_installer_dirs(app: &AppHandle) -> Vec<PathBuf> {
        let mut directories = Vec::new();

        if let Ok(resource_dir) = app.path().resource_dir() {
            directories.push(resource_dir.join("third_party").join("HidHide"));
        }

        directories.push(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("third_party")
                .join("HidHide"),
        );

        directories
    }

    fn is_hidhide_installer_candidate(path: &Path) -> bool {
        if !path.is_file() {
            return false;
        }

        let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
            return false;
        };
        let file_name = file_name.to_ascii_lowercase();
        if !file_name.contains("hidhide") {
            return false;
        }

        matches!(
            path.extension()
                .and_then(|value| value.to_str())
                .map(|value| value.to_ascii_lowercase())
                .as_deref(),
            Some("exe") | Some("msi")
        )
    }

    fn installer_rank(path: &Path) -> (u8, String) {
        let extension_rank = match path
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.to_ascii_lowercase())
            .as_deref()
        {
            Some("exe") => 0,
            Some("msi") => 1,
            _ => 2,
        };
        let file_name = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();
        (extension_rank, file_name)
    }

    fn run_hidhide_installer(installer_path: &Path) -> Result<(), String> {
        let mut command = if installer_path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("msi"))
        {
            let mut command = Command::new("msiexec.exe");
            command.arg("/i").arg(installer_path);
            command
        } else {
            Command::new(installer_path)
        };

        let status = command.status().map_err(|error| {
            format!(
                "Failed to launch HidHide installer {}: {error}",
                installer_path.display()
            )
        })?;

        if status.success() || status.code() == Some(HIDHIDE_INSTALLER_REBOOT_REQUIRED_EXIT_CODE) {
            return Ok(());
        }

        Err(format!(
            "HidHide installer {} exited with code {:?}.",
            installer_path.display(),
            status.code()
        ))
    }

    fn find_hidhide_configuration_client(app: &AppHandle) -> Result<PathBuf, String> {
        let candidates = hidhide_configuration_client_candidates(app);

        candidates.into_iter().find(|path| path.is_file()).ok_or_else(|| {
            "HidHide is installed, but HidHideClient.exe could not be found. Reinstall HidHide or open it from the Windows Start menu.".to_string()
        })
    }

    fn hidhide_configuration_client_candidates(app: &AppHandle) -> Vec<PathBuf> {
        let mut candidates = Vec::new();

        for install_dir in hidhide_install_dirs_from_registry() {
            push_hidhide_client_candidates(&mut candidates, &install_dir);
        }

        if let Ok(resource_dir) = app.path().resource_dir() {
            push_hidhide_client_candidates(
                &mut candidates,
                &resource_dir.join("third_party").join("HidHide"),
            );
        }

        if let Some(program_files) = std::env::var_os("ProgramFiles") {
            let program_files = PathBuf::from(program_files);
            push_hidhide_client_candidates(
                &mut candidates,
                &program_files
                    .join("Nefarius Software Solutions")
                    .join("HidHide"),
            );
            push_hidhide_client_candidates(
                &mut candidates,
                &program_files
                    .join("Nefarius Software Solutions e.U")
                    .join("HidHide"),
            );
            push_hidhide_client_candidates(
                &mut candidates,
                &program_files
                    .join("Nefarius Software Solutions e.U.")
                    .join("HidHide"),
            );
        }

        if let Some(program_files_x86) = std::env::var_os("ProgramFiles(x86)") {
            let program_files_x86 = PathBuf::from(program_files_x86);
            push_hidhide_client_candidates(
                &mut candidates,
                &program_files_x86
                    .join("Nefarius Software Solutions")
                    .join("HidHide"),
            );
            push_hidhide_client_candidates(
                &mut candidates,
                &program_files_x86
                    .join("Nefarius Software Solutions e.U")
                    .join("HidHide"),
            );
            push_hidhide_client_candidates(
                &mut candidates,
                &program_files_x86
                    .join("Nefarius Software Solutions e.U.")
                    .join("HidHide"),
            );
        }

        let mut seen = HashSet::new();
        candidates
            .into_iter()
            .filter(|path| seen.insert(path.to_string_lossy().to_ascii_lowercase()))
            .collect()
    }

    fn push_hidhide_client_candidates(candidates: &mut Vec<PathBuf>, base_dir: &Path) {
        candidates.push(base_dir.join("HidHideClient.exe"));
        candidates.push(base_dir.join("x64").join("HidHideClient.exe"));
        candidates.push(base_dir.join("HidHide").join("HidHideClient.exe"));
        candidates.push(
            base_dir
                .join("HidHide")
                .join("x64")
                .join("HidHideClient.exe"),
        );
    }

    fn hidhide_install_dirs_from_registry() -> Vec<PathBuf> {
        const REGISTRY_KEYS: [&str; 4] = [
            r"HKCR\SOFTWARE\Nefarius Software Solutions e.U.\Nefarius Software Solutions e.U. HidHide",
            r"HKCR\SOFTWARE\Nefarius Software Solutions\HidHide",
            r"HKLM\SOFTWARE\Nefarius Software Solutions e.U.\Nefarius Software Solutions e.U. HidHide",
            r"HKLM\SOFTWARE\Nefarius Software Solutions\HidHide",
        ];

        REGISTRY_KEYS
            .iter()
            .filter_map(|key| query_registry_string_value(key, "Path"))
            .map(PathBuf::from)
            .collect()
    }

    fn query_registry_string_value(key: &str, value_name: &str) -> Option<String> {
        let output = Command::new("reg.exe")
            .args(["query", key, "/v", value_name])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let trimmed = line.trim();
            if !trimmed.starts_with(value_name) {
                continue;
            }
            let mut parts = trimmed.split_whitespace();
            let _name = parts.next()?;
            let value_type = parts.next()?;
            if !value_type.starts_with("REG_") {
                continue;
            }
            let value = parts.collect::<Vec<_>>().join(" ");
            if value.trim().is_empty() {
                continue;
            }
            return Some(value);
        }

        None
    }

    fn required_whitelist_entries(app: &AppHandle) -> Result<Vec<String>, String> {
        let backend = runtime::read_backend_choice(app)?;
        let active_jsm = runtime::jsm_executable_path(app, &backend)?;
        let mut executable_paths = vec![active_jsm];
        executable_paths.extend(runtime::bundled_jsm_executable_paths(app)?);

        let mut seen = HashSet::new();
        let mut required = Vec::new();
        for path in executable_paths {
            if !path.exists() {
                continue;
            }

            let image_name = full_image_name(&path)?;
            if seen.insert(canonicalize_value(&image_name)) {
                required.push(image_name);
            }
        }

        sort_case_insensitive(&mut required);
        Ok(required)
    }

    fn sync_whitelist_entries(app: &AppHandle) -> Result<(), String> {
        let required = required_whitelist_entries(app)?;
        if required.is_empty() {
            return Err("No JoyShockMapper executables were found to whitelist.".to_string());
        }

        let whitelist = get_whitelist()?;
        let merged = merge_whitelist(&whitelist, &required);
        if merged != whitelist {
            set_whitelist(&merged)?;
        }

        Ok(())
    }

    fn control_device_status() -> Result<ControlDeviceStatus, String> {
        match open_control_device_raw(true) {
            Ok(Some(handle)) => {
                let _handle_guard = HandleGuard(handle);
                Ok(ControlDeviceStatus::Ready)
            }
            Ok(None) => Ok(ControlDeviceStatus::Missing),
            Err(ERROR_ACCESS_DENIED) => Ok(ControlDeviceStatus::AccessDenied),
            Err(error) => Err(format!(
                "Failed to open HidHide control device: {}",
                std::io::Error::from_raw_os_error(error as i32)
            )),
        }
    }

    fn ensure_control_device_ready() -> Result<(), String> {
        match control_device_status()? {
            ControlDeviceStatus::Ready => Ok(()),
            ControlDeviceStatus::Missing => Err("HidHide is not installed.".to_string()),
            ControlDeviceStatus::AccessDenied => Err(HIDHIDE_ACCESS_DENIED_MESSAGE.to_string()),
        }
    }

    fn get_blacklist() -> Result<Vec<String>, String> {
        get_string_list(IOCTL_GET_BLACKLIST)
    }

    fn set_blacklist(values: &[String]) -> Result<(), String> {
        set_string_list(IOCTL_SET_BLACKLIST, values)
    }

    fn get_whitelist() -> Result<Vec<String>, String> {
        get_string_list(IOCTL_GET_WHITELIST)
    }

    fn set_whitelist(values: &[String]) -> Result<(), String> {
        set_string_list(IOCTL_SET_WHITELIST, values)
    }

    fn get_active() -> Result<bool, String> {
        let handle =
            open_control_device(false)?.ok_or_else(|| "HidHide is not installed.".to_string())?;
        let _handle_guard = HandleGuard(handle);

        let mut value = [0u8; 1];
        let mut bytes_returned = 0u32;
        let success = unsafe {
            DeviceIoControl(
                handle,
                IOCTL_GET_ACTIVE,
                null(),
                0,
                value.as_mut_ptr() as *mut _,
                value.len() as u32,
                &mut bytes_returned,
                null_mut(),
            )
        };
        if success == 0 {
            return Err(format!(
                "Failed to query HidHide active state: {}",
                std::io::Error::last_os_error()
            ));
        }

        Ok(value[0] != 0)
    }

    fn set_active_flag(active: bool) -> Result<(), String> {
        let handle =
            open_control_device(false)?.ok_or_else(|| "HidHide is not installed.".to_string())?;
        let _handle_guard = HandleGuard(handle);

        let mut bytes_returned = 0u32;
        let value = [if active { 1u8 } else { 0u8 }];
        let success = unsafe {
            DeviceIoControl(
                handle,
                IOCTL_SET_ACTIVE,
                value.as_ptr() as *const _,
                value.len() as u32,
                null_mut(),
                0,
                &mut bytes_returned,
                null_mut(),
            )
        };
        if success == 0 {
            return Err(format!(
                "Failed to update HidHide active state: {}",
                std::io::Error::last_os_error()
            ));
        }

        Ok(())
    }

    fn get_string_list(ioctl_code: u32) -> Result<Vec<String>, String> {
        let handle =
            open_control_device(false)?.ok_or_else(|| "HidHide is not installed.".to_string())?;
        let _handle_guard = HandleGuard(handle);

        let mut needed = 0u32;
        let success = unsafe {
            DeviceIoControl(
                handle,
                ioctl_code,
                null(),
                0,
                null_mut(),
                0,
                &mut needed,
                null_mut(),
            )
        };
        if success == 0 {
            let error = std::io::Error::last_os_error();
            if needed == 0 {
                return Err(format!("Failed to query HidHide data: {error}"));
            }
        }

        if needed == 0 {
            return Ok(Vec::new());
        }

        let mut buffer = vec![0u16; needed as usize];
        let mut bytes_returned = 0u32;
        let success = unsafe {
            DeviceIoControl(
                handle,
                ioctl_code,
                null(),
                0,
                buffer.as_mut_ptr() as *mut _,
                (buffer.len() * size_of::<u16>()) as u32,
                &mut bytes_returned,
                null_mut(),
            )
        };
        if success == 0 {
            return Err(format!(
                "Failed to read HidHide data: {}",
                std::io::Error::last_os_error()
            ));
        }

        Ok(decode_multi_string(&buffer))
    }

    fn set_string_list(ioctl_code: u32, values: &[String]) -> Result<(), String> {
        let handle =
            open_control_device(false)?.ok_or_else(|| "HidHide is not installed.".to_string())?;
        let _handle_guard = HandleGuard(handle);

        let buffer = encode_multi_string(values);
        let mut bytes_returned = 0u32;
        let success = unsafe {
            DeviceIoControl(
                handle,
                ioctl_code,
                buffer.as_ptr() as *const _,
                (buffer.len() * size_of::<u16>()) as u32,
                null_mut(),
                0,
                &mut bytes_returned,
                null_mut(),
            )
        };
        if success == 0 {
            return Err(format!(
                "Failed to update HidHide data: {}",
                std::io::Error::last_os_error()
            ));
        }

        Ok(())
    }

    fn open_control_device_raw(allow_file_not_found: bool) -> Result<Option<HANDLE>, u32> {
        let path = wide_null(r"\\.\HidHide");
        let handle = unsafe {
            CreateFileW(
                path.as_ptr(),
                GENERIC_READ,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                null(),
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                null_mut(),
            )
        };

        if handle == INVALID_HANDLE_VALUE {
            let error = unsafe { GetLastError() };
            if allow_file_not_found && error == ERROR_FILE_NOT_FOUND {
                return Ok(None);
            }
            return Err(error);
        }

        Ok(Some(handle))
    }

    fn open_control_device(allow_file_not_found: bool) -> Result<Option<HANDLE>, String> {
        open_control_device_raw(allow_file_not_found).map_err(|error| {
            if error == ERROR_ACCESS_DENIED {
                HIDHIDE_ACCESS_DENIED_MESSAGE.to_string()
            } else {
                format!(
                    "Failed to open HidHide control device: {}",
                    std::io::Error::from_raw_os_error(error as i32)
                )
            }
        })
    }

    fn open_file_handle(path: &str) -> Option<HANDLE> {
        let wide_path = wide_null(path);
        let handle = unsafe {
            CreateFileW(
                wide_path.as_ptr(),
                GENERIC_READ,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                null(),
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                null_mut(),
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            return None;
        }
        Some(handle)
    }

    fn read_hid_wide_string(
        handle: HANDLE,
        getter: unsafe extern "system" fn(HANDLE, *mut core::ffi::c_void, u32) -> bool,
    ) -> Option<String> {
        let mut buffer = vec![0u16; 256];
        let success = unsafe {
            getter(
                handle,
                buffer.as_mut_ptr() as *mut _,
                (buffer.len() * size_of::<u16>()) as u32,
            )
        };
        if !success {
            return None;
        }
        let value = read_wide_slice(&buffer);
        if value.trim().is_empty() {
            None
        } else {
            Some(value)
        }
    }

    fn looks_like_game_controller(display_hint: &str, vendor: &str, product: &str) -> bool {
        let haystack = format!("{display_hint} {vendor} {product}").to_ascii_lowercase();
        [
            "controller",
            "gamepad",
            "joystick",
            "joy-con",
            "joycon",
            "dualshock",
            "dualsense",
            "xbox",
            "switch",
            "pro controller",
            "wireless gamepad",
        ]
        .iter()
        .any(|needle| haystack.contains(needle))
    }

    fn build_display_name(
        vendor: &str,
        product: &str,
        hints: &[String],
        instance_id: &str,
    ) -> String {
        if !vendor.is_empty() && !product.is_empty() {
            let vendor_lower = vendor.to_ascii_lowercase();
            let product_lower = product.to_ascii_lowercase();
            if product_lower.contains(&vendor_lower) {
                return product.to_string();
            }
            return format!("{vendor} {product}");
        }

        if !product.is_empty() {
            return product.to_string();
        }

        let unique_hints = unique_values(hints);
        if let Some(first) = unique_hints.first() {
            if !first.trim().is_empty() {
                return first.clone();
            }
        }

        instance_id.to_string()
    }

    fn full_image_name(path: &Path) -> Result<String, String> {
        let absolute = path.canonicalize().map_err(|error| {
            format!(
                "Failed to resolve executable path {}: {error}",
                path.display()
            )
        })?;
        let path_string = normalize_windows_image_path(&absolute.to_string_lossy())?;
        if path_string.starts_with(r"\Device\") {
            return Ok(path_string);
        }

        let mut chars = path_string.chars();
        let Some(drive_letter) = chars.next() else {
            return Err(format!(
                "Unable to resolve drive for {}",
                absolute.display()
            ));
        };
        if chars.next() != Some(':') {
            return Err(format!(
                "Executable path must start with a drive letter: {}",
                absolute.display()
            ));
        }

        let drive = format!("{drive_letter}:");
        let wide_drive = wide_null(&drive);
        let mut buffer = vec![0u16; 1024];
        let length = unsafe {
            QueryDosDeviceW(
                wide_drive.as_ptr(),
                buffer.as_mut_ptr(),
                buffer.len() as u32,
            )
        };
        if length == 0 {
            return Err(format!(
                "Failed to resolve device path for {}: {}",
                absolute.display(),
                std::io::Error::last_os_error()
            ));
        }

        let device_prefix = read_wide_slice(&buffer);
        let suffix = &path_string[2..];
        Ok(format!("{device_prefix}{suffix}"))
    }

    const fn ctl_code(device_type: u32, function: u32, method: u32, access: u32) -> u32 {
        (device_type << 16) | (access << 14) | (function << 2) | method
    }

    fn wide_null(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn read_wide_ptr(ptr: *const u16) -> String {
        let mut length = 0usize;
        unsafe {
            while *ptr.add(length) != 0 {
                length += 1;
            }
            read_wide_slice(std::slice::from_raw_parts(ptr, length))
        }
    }

    fn read_wide_slice(value: &[u16]) -> String {
        let end = value
            .iter()
            .position(|entry| *entry == 0)
            .unwrap_or(value.len());
        String::from_utf16_lossy(&value[..end])
    }

    fn parse_vid_pid_from_instance_id(instance_id: &str) -> (Option<u16>, Option<u16>) {
        let upper = instance_id.to_ascii_uppercase();
        let vendor_id = extract_hex_component(&upper, "VID_");
        let product_id = extract_hex_component(&upper, "PID_");
        (vendor_id, product_id)
    }

    fn extract_hex_component(value: &str, marker: &str) -> Option<u16> {
        let start = value.find(marker)? + marker.len();
        let end = start.saturating_add(4).min(value.len());
        u16::from_str_radix(&value[start..end], 16).ok()
    }

    fn guid_to_string(guid: &GUID) -> String {
        format!(
            "{:08x}-{:04x}-{:04x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
            guid.data1,
            guid.data2,
            guid.data3,
            guid.data4[0],
            guid.data4[1],
            guid.data4[2],
            guid.data4[3],
            guid.data4[4],
            guid.data4[5],
            guid.data4[6],
            guid.data4[7],
        )
    }

    fn is_null_guid(guid: &GUID) -> bool {
        guid.data1 == 0
            && guid.data2 == 0
            && guid.data3 == 0
            && guid.data4.iter().all(|value| *value == 0)
    }

    fn is_gaming_device(vendor_id: u16, product_id: u16, usage_page: u16, usage: u16) -> bool {
        (vendor_id == 0x28de && product_id == 0x1142)
            || usage_page == 0x05
            || (usage_page == 0x01 && (usage == 0x04 || usage == 0x05))
    }

    fn first_non_empty<'a>(values: &[Option<&'a str>]) -> Option<&'a str> {
        values
            .iter()
            .flatten()
            .find(|value| !value.trim().is_empty())
            .copied()
    }
}

#[cfg(not(target_os = "windows"))]
mod imp {
    use super::*;

    fn unsupported_status() -> HidHideStatus {
        HidHideStatus {
            supported: false,
            installed: false,
            active: false,
            devices: Vec::new(),
            managed_instance_ids: Vec::new(),
            whitelist_synced: false,
            requires_elevation: false,
        }
    }

    pub fn get_status(
        _app: &AppHandle,
        _latest_packet: Option<&Value>,
    ) -> Result<HidHideStatus, String> {
        Ok(unsupported_status())
    }

    pub fn set_active(
        _app: &AppHandle,
        _active: bool,
        _latest_packet: Option<&Value>,
    ) -> Result<HidHideStatus, String> {
        Ok(unsupported_status())
    }

    pub fn set_device_hidden(
        _app: &AppHandle,
        _instance_id: &str,
        _hidden: bool,
        _latest_packet: Option<&Value>,
    ) -> Result<HidHideStatus, String> {
        Ok(unsupported_status())
    }

    pub fn sync_whitelist(
        _app: &AppHandle,
        _latest_packet: Option<&Value>,
    ) -> Result<HidHideStatus, String> {
        Ok(unsupported_status())
    }

    pub fn install_bundled(
        _app: &AppHandle,
        _latest_packet: Option<&Value>,
    ) -> Result<HidHideInstallResult, String> {
        Ok(HidHideInstallResult {
            completed: false,
            installer_path: None,
            status: unsupported_status(),
        })
    }

    pub fn open_configuration_client(_app: &AppHandle) -> Result<(), String> {
        Err("HidHide configuration client is only available on Windows.".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn multi_string_round_trip_preserves_values() {
        let values = vec![
            "HID\\VID_054C&PID_0CE6".to_string(),
            r"\Device\HarddiskVolume4\JoyShockMapper.exe".to_string(),
        ];

        let encoded = encode_multi_string(&values);
        let decoded = decode_multi_string(&encoded);
        assert_eq!(decoded, values);
    }

    #[test]
    fn update_managed_instance_ids_adds_and_removes_exact_values() {
        let current = vec!["HID\\A".to_string(), "HID\\B".to_string()];
        let added = update_managed_instance_ids(
            &current,
            &[String::from("HID\\C"), String::from("hid\\a")],
            true,
        );
        assert_eq!(
            added,
            vec![
                "HID\\A".to_string(),
                "HID\\B".to_string(),
                "HID\\C".to_string()
            ]
        );

        let removed = update_managed_instance_ids(&added, &[String::from("hid\\b")], false);
        assert_eq!(removed, vec!["HID\\A".to_string(), "HID\\C".to_string()]);
    }

    #[test]
    fn merge_blacklist_preserves_external_entries() {
        let live = vec!["HID\\EXTERNAL".to_string(), "HID\\APP_OLD".to_string()];
        let previous_managed = vec!["HID\\APP_OLD".to_string()];
        let next_managed = vec!["HID\\APP_NEW".to_string()];

        let merged = merge_blacklist(&live, &previous_managed, &next_managed);
        assert_eq!(
            merged,
            vec!["HID\\EXTERNAL".to_string(), "HID\\APP_NEW".to_string()]
        );
    }

    #[test]
    fn merge_whitelist_preserves_existing_entries_and_appends_required() {
        let live = vec![r"\Device\HarddiskVolume4\OtherApp.exe".to_string()];
        let required = vec![
            r"\Device\HarddiskVolume4\JoyShockMapper.exe".to_string(),
            r"\Device\HarddiskVolume5\JoyShockMapper.exe".to_string(),
        ];

        let merged = merge_whitelist(&live, &required);
        assert_eq!(
            merged,
            vec![
                r"\Device\HarddiskVolume4\OtherApp.exe".to_string(),
                r"\Device\HarddiskVolume4\JoyShockMapper.exe".to_string(),
                r"\Device\HarddiskVolume5\JoyShockMapper.exe".to_string(),
            ]
        );
    }

    #[test]
    fn normalize_windows_image_path_strips_verbatim_disk_prefix() {
        assert_eq!(
            normalize_windows_image_path(r"\\?\C:\tools\JoyShockMapper.exe").unwrap(),
            r"C:\tools\JoyShockMapper.exe"
        );
        assert_eq!(
            normalize_windows_image_path(r"\??\D:\games\JoyShockMapper.exe").unwrap(),
            r"D:\games\JoyShockMapper.exe"
        );
    }

    #[test]
    fn normalize_windows_image_path_rejects_unc_verbatim_path() {
        assert!(normalize_windows_image_path(r"\\?\UNC\server\share\JoyShockMapper.exe").is_err());
    }
}
