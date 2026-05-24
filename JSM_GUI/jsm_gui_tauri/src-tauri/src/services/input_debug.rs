use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputDebugHookStatus {
    pub supported: bool,
    pub running: bool,
    pub platform: String,
    pub message: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputDebugPosition {
    pub x: i32,
    pub y: i32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InputDebugEvent {
    pub id: u64,
    pub timestamp: u64,
    pub source: InputDebugSource,
    pub action: InputDebugAction,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key_code: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scan_code: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mouse_button: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wheel_delta: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<InputDebugPosition>,
    pub injected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lower_integrity_injected: Option<bool>,
    pub capture_source: InputDebugCaptureSource,
    pub summary: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum InputDebugSource {
    Keyboard,
    Mouse,
    Wheel,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum InputDebugAction {
    Down,
    Up,
    Wheel,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum InputDebugCaptureSource {
    GlobalHook,
}

#[cfg(target_os = "windows")]
mod platform {
    use std::{
        ptr::null_mut,
        sync::{
            atomic::{AtomicU64, Ordering},
            mpsc::{self, Sender},
            Mutex, OnceLock,
        },
        thread::{self, JoinHandle},
        time::{SystemTime, UNIX_EPOCH},
    };

    use tauri::{AppHandle, Emitter};
    use windows_sys::Win32::{
        Foundation::{LPARAM, LRESULT, WPARAM},
        System::Threading::GetCurrentThreadId,
        UI::WindowsAndMessaging::{
            CallNextHookEx, DispatchMessageW, GetMessageW, PeekMessageW, PostThreadMessageW,
            SetWindowsHookExW, TranslateMessage, UnhookWindowsHookEx, HC_ACTION, HHOOK,
            KBDLLHOOKSTRUCT, LLKHF_ALTDOWN, LLKHF_EXTENDED, LLKHF_INJECTED,
            LLKHF_LOWER_IL_INJECTED, LLMHF_INJECTED, MSG, MSLLHOOKSTRUCT, PM_NOREMOVE,
            WH_KEYBOARD_LL, WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP, WM_LBUTTONDOWN, WM_LBUTTONUP,
            WM_MBUTTONDOWN, WM_MBUTTONUP, WM_MOUSEHWHEEL, WM_MOUSEWHEEL, WM_QUIT, WM_RBUTTONDOWN,
            WM_RBUTTONUP, WM_SYSKEYDOWN, WM_SYSKEYUP, WM_USER, WM_XBUTTONDOWN, WM_XBUTTONUP,
            XBUTTON1, XBUTTON2,
        },
    };

    use super::{
        InputDebugAction, InputDebugCaptureSource, InputDebugEvent, InputDebugHookStatus,
        InputDebugPosition, InputDebugSource,
    };

    const EVENT_NAME: &str = "input-debug-event";

    static EVENT_ID: AtomicU64 = AtomicU64::new(1);
    static EVENT_SENDER: OnceLock<Mutex<Option<Sender<InputDebugEvent>>>> = OnceLock::new();
    static RUNTIME: OnceLock<Mutex<InputDebugRuntime>> = OnceLock::new();

    struct InputDebugRuntime {
        running: bool,
        thread_id: Option<u32>,
        join: Option<JoinHandle<()>>,
        message: Option<String>,
    }

    impl Default for InputDebugRuntime {
        fn default() -> Self {
            Self {
                running: false,
                thread_id: None,
                join: None,
                message: None,
            }
        }
    }

    pub fn start(app: AppHandle) -> Result<InputDebugHookStatus, String> {
        {
            let runtime = runtime()?;
            if runtime.running {
                return Ok(status_from_runtime(&runtime));
            }
        }

        let (event_tx, event_rx) = mpsc::channel::<InputDebugEvent>();
        let (ready_tx, ready_rx) = mpsc::channel::<Result<u32, String>>();
        let emitter_app = app.clone();

        thread::spawn(move || {
            for event in event_rx {
                if let Err(error) = emitter_app.emit(EVENT_NAME, event) {
                    eprintln!("Failed to emit input debug event: {error}");
                }
            }
        });

        let join = thread::spawn(move || {
            run_hook_thread(event_tx, ready_tx);
        });

        let thread_id = match ready_rx.recv() {
            Ok(Ok(thread_id)) => thread_id,
            Ok(Err(error)) => {
                let _ = join.join();
                let mut runtime = runtime()?;
                runtime.running = false;
                runtime.thread_id = None;
                runtime.join = None;
                runtime.message = Some(error.clone());
                return Ok(status_from_runtime(&runtime));
            }
            Err(error) => {
                let _ = join.join();
                let message =
                    format!("Input debug hook thread exited before it became ready: {error}");
                let mut runtime = runtime()?;
                runtime.running = false;
                runtime.thread_id = None;
                runtime.join = None;
                runtime.message = Some(message);
                return Ok(status_from_runtime(&runtime));
            }
        };

        let mut runtime = runtime()?;
        runtime.running = true;
        runtime.thread_id = Some(thread_id);
        runtime.join = Some(join);
        runtime.message = None;
        Ok(status_from_runtime(&runtime))
    }

    pub fn stop() -> Result<InputDebugHookStatus, String> {
        let join = {
            let mut runtime = runtime()?;
            if !runtime.running {
                return Ok(status_from_runtime(&runtime));
            }

            clear_sender();
            let thread_id = runtime.thread_id;
            if let Some(thread_id) = thread_id {
                let posted = unsafe { PostThreadMessageW(thread_id, WM_QUIT, 0, 0) };
                if posted == 0 {
                    runtime.message =
                        Some("Failed to request input debug hook shutdown.".to_string());
                    runtime.running = false;
                    runtime.thread_id = None;
                    return Ok(status_from_runtime(&runtime));
                }
            }

            runtime.running = false;
            runtime.thread_id = None;
            runtime.message = None;
            runtime.join.take()
        };

        if let Some(join) = join {
            if join.join().is_err() {
                let mut runtime = runtime()?;
                runtime.message =
                    Some("Input debug hook thread panicked while stopping.".to_string());
                return Ok(status_from_runtime(&runtime));
            }
        }

        status()
    }

    pub fn status() -> Result<InputDebugHookStatus, String> {
        let runtime = runtime()?;
        Ok(status_from_runtime(&runtime))
    }

    fn run_hook_thread(event_tx: Sender<InputDebugEvent>, ready_tx: Sender<Result<u32, String>>) {
        set_sender(Some(event_tx));

        let thread_id = unsafe { GetCurrentThreadId() };
        let mut bootstrap_msg = MSG::default();
        unsafe {
            let _ = PeekMessageW(
                &mut bootstrap_msg,
                null_mut(),
                WM_USER,
                WM_USER,
                PM_NOREMOVE,
            );
        }

        let keyboard_hook =
            unsafe { SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), null_mut(), 0) };
        if keyboard_hook.is_null() {
            clear_sender();
            let _ = ready_tx.send(Err(format!(
                "Failed to install keyboard hook: {}",
                std::io::Error::last_os_error()
            )));
            return;
        }

        let mouse_hook = unsafe { SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), null_mut(), 0) };
        if mouse_hook.is_null() {
            unsafe {
                let _ = UnhookWindowsHookEx(keyboard_hook);
            }
            clear_sender();
            let _ = ready_tx.send(Err(format!(
                "Failed to install mouse hook: {}",
                std::io::Error::last_os_error()
            )));
            return;
        }

        let _ = ready_tx.send(Ok(thread_id));
        message_loop();
        unsafe {
            let _ = UnhookWindowsHookEx(mouse_hook);
            let _ = UnhookWindowsHookEx(keyboard_hook);
        }
        clear_sender();
    }

    fn message_loop() {
        let mut msg = MSG::default();
        loop {
            let result = unsafe { GetMessageW(&mut msg, null_mut(), 0, 0) };
            if result <= 0 || msg.message == WM_QUIT {
                break;
            }
            unsafe {
                let _ = TranslateMessage(&msg);
                let _ = DispatchMessageW(&msg);
            }
        }
    }

    unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code == HC_ACTION as i32 {
            if let Some(action) = keyboard_action(wparam as u32) {
                let hook = unsafe { *(lparam as *const KBDLLHOOKSTRUCT) };
                let injected = hook.flags & LLKHF_INJECTED != 0;
                let lower_integrity_injected = hook.flags & LLKHF_LOWER_IL_INJECTED != 0;
                let key_label = key_label(hook.vkCode);
                let direction = match action {
                    InputDebugAction::Down => "down",
                    InputDebugAction::Up => "up",
                    InputDebugAction::Wheel => "wheel",
                };
                emit_input_event(InputDebugEvent {
                    id: next_event_id(),
                    timestamp: now_ms(),
                    source: InputDebugSource::Keyboard,
                    action,
                    key_code: Some(hook.vkCode),
                    scan_code: Some(hook.scanCode),
                    key_label: Some(key_label.clone()),
                    mouse_button: None,
                    wheel_delta: None,
                    position: None,
                    injected,
                    lower_integrity_injected: Some(lower_integrity_injected),
                    capture_source: InputDebugCaptureSource::GlobalHook,
                    summary: format!(
                        "Keyboard {key_label} {direction}{}{}",
                        if hook.flags & LLKHF_EXTENDED != 0 {
                            " extended"
                        } else {
                            ""
                        },
                        if hook.flags & LLKHF_ALTDOWN != 0 {
                            " alt"
                        } else {
                            ""
                        }
                    ),
                });
            }
        }

        unsafe { CallNextHookEx(null_hook(), code, wparam, lparam) }
    }

    unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code == HC_ACTION as i32 {
            let hook = unsafe { *(lparam as *const MSLLHOOKSTRUCT) };
            if let Some(event) = mouse_event(wparam as u32, hook) {
                emit_input_event(event);
            }
        }

        unsafe { CallNextHookEx(null_hook(), code, wparam, lparam) }
    }

    fn keyboard_action(message: u32) -> Option<InputDebugAction> {
        match message {
            WM_KEYDOWN | WM_SYSKEYDOWN => Some(InputDebugAction::Down),
            WM_KEYUP | WM_SYSKEYUP => Some(InputDebugAction::Up),
            _ => None,
        }
    }

    fn mouse_event(message: u32, hook: MSLLHOOKSTRUCT) -> Option<InputDebugEvent> {
        let injected = hook.flags & LLMHF_INJECTED != 0;
        let position = Some(InputDebugPosition {
            x: hook.pt.x,
            y: hook.pt.y,
        });

        match message {
            WM_LBUTTONDOWN => Some(mouse_button_event(
                "left",
                InputDebugAction::Down,
                injected,
                position,
            )),
            WM_LBUTTONUP => Some(mouse_button_event(
                "left",
                InputDebugAction::Up,
                injected,
                position,
            )),
            WM_RBUTTONDOWN => Some(mouse_button_event(
                "right",
                InputDebugAction::Down,
                injected,
                position,
            )),
            WM_RBUTTONUP => Some(mouse_button_event(
                "right",
                InputDebugAction::Up,
                injected,
                position,
            )),
            WM_MBUTTONDOWN => Some(mouse_button_event(
                "middle",
                InputDebugAction::Down,
                injected,
                position,
            )),
            WM_MBUTTONUP => Some(mouse_button_event(
                "middle",
                InputDebugAction::Up,
                injected,
                position,
            )),
            WM_XBUTTONDOWN | WM_XBUTTONUP => {
                let x_button = ((hook.mouseData >> 16) & 0xffff) as u16;
                let button = match x_button {
                    XBUTTON1 => "x1",
                    XBUTTON2 => "x2",
                    _ => "x",
                };
                let action = if message == WM_XBUTTONDOWN {
                    InputDebugAction::Down
                } else {
                    InputDebugAction::Up
                };
                Some(mouse_button_event(button, action, injected, position))
            }
            WM_MOUSEWHEEL | WM_MOUSEHWHEEL => {
                let delta = ((hook.mouseData >> 16) & 0xffff) as u16 as i16 as i32;
                Some(InputDebugEvent {
                    id: next_event_id(),
                    timestamp: now_ms(),
                    source: InputDebugSource::Wheel,
                    action: InputDebugAction::Wheel,
                    key_code: None,
                    scan_code: None,
                    key_label: None,
                    mouse_button: None,
                    wheel_delta: Some(delta),
                    position,
                    injected,
                    lower_integrity_injected: None,
                    capture_source: InputDebugCaptureSource::GlobalHook,
                    summary: format!("Mouse wheel {delta:+}"),
                })
            }
            _ => None,
        }
    }

    fn mouse_button_event(
        button: &str,
        action: InputDebugAction,
        injected: bool,
        position: Option<InputDebugPosition>,
    ) -> InputDebugEvent {
        let direction = match action {
            InputDebugAction::Down => "down",
            InputDebugAction::Up => "up",
            InputDebugAction::Wheel => "wheel",
        };
        InputDebugEvent {
            id: next_event_id(),
            timestamp: now_ms(),
            source: InputDebugSource::Mouse,
            action,
            key_code: None,
            scan_code: None,
            key_label: None,
            mouse_button: Some(button.to_string()),
            wheel_delta: None,
            position,
            injected,
            lower_integrity_injected: None,
            capture_source: InputDebugCaptureSource::GlobalHook,
            summary: format!("Mouse {button} {direction}"),
        }
    }

    fn emit_input_event(event: InputDebugEvent) {
        if let Some(lock) = EVENT_SENDER.get() {
            if let Ok(sender) = lock.lock() {
                if let Some(sender) = sender.as_ref() {
                    let _ = sender.send(event);
                }
            }
        }
    }

    fn set_sender(sender: Option<Sender<InputDebugEvent>>) {
        let lock = EVENT_SENDER.get_or_init(|| Mutex::new(None));
        if let Ok(mut current) = lock.lock() {
            *current = sender;
        }
    }

    fn clear_sender() {
        set_sender(None);
    }

    fn runtime() -> Result<std::sync::MutexGuard<'static, InputDebugRuntime>, String> {
        RUNTIME
            .get_or_init(|| Mutex::new(InputDebugRuntime::default()))
            .lock()
            .map_err(|_| "Input debug hook state lock poisoned.".to_string())
    }

    fn status_from_runtime(runtime: &InputDebugRuntime) -> InputDebugHookStatus {
        InputDebugHookStatus {
            supported: true,
            running: runtime.running,
            platform: std::env::consts::OS.to_string(),
            message: runtime.message.clone(),
        }
    }

    fn next_event_id() -> u64 {
        EVENT_ID.fetch_add(1, Ordering::SeqCst)
    }

    fn now_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or(0)
    }

    fn null_hook() -> HHOOK {
        null_mut()
    }

    fn key_label(vk_code: u32) -> String {
        match vk_code {
            0x08 => "Backspace".to_string(),
            0x09 => "Tab".to_string(),
            0x0d => "Enter".to_string(),
            0x10 => "Shift".to_string(),
            0x11 => "Ctrl".to_string(),
            0x12 => "Alt".to_string(),
            0x13 => "Pause".to_string(),
            0x14 => "CapsLock".to_string(),
            0x1b => "Esc".to_string(),
            0x20 => "Space".to_string(),
            0x21 => "PageUp".to_string(),
            0x22 => "PageDown".to_string(),
            0x23 => "End".to_string(),
            0x24 => "Home".to_string(),
            0x25 => "Left".to_string(),
            0x26 => "Up".to_string(),
            0x27 => "Right".to_string(),
            0x28 => "Down".to_string(),
            0x2c => "PrintScreen".to_string(),
            0x2d => "Insert".to_string(),
            0x2e => "Delete".to_string(),
            0x5b => "LeftWin".to_string(),
            0x5c => "RightWin".to_string(),
            0x60..=0x69 => format!("Num{}", vk_code - 0x60),
            0x6a => "Num*".to_string(),
            0x6b => "Num+".to_string(),
            0x6d => "Num-".to_string(),
            0x6e => "Num.".to_string(),
            0x6f => "Num/".to_string(),
            0x70..=0x87 => format!("F{}", vk_code - 0x6f),
            0xa0 => "LeftShift".to_string(),
            0xa1 => "RightShift".to_string(),
            0xa2 => "LeftCtrl".to_string(),
            0xa3 => "RightCtrl".to_string(),
            0xa4 => "LeftAlt".to_string(),
            0xa5 => "RightAlt".to_string(),
            0xba => ";".to_string(),
            0xbb => "=".to_string(),
            0xbc => ",".to_string(),
            0xbd => "-".to_string(),
            0xbe => ".".to_string(),
            0xbf => "/".to_string(),
            0xc0 => "`".to_string(),
            0xdb => "[".to_string(),
            0xdc => "\\".to_string(),
            0xdd => "]".to_string(),
            0xde => "'".to_string(),
            0x30..=0x39 | 0x41..=0x5a => char::from_u32(vk_code)
                .map(|value| value.to_string())
                .unwrap_or_else(|| format!("VK_{vk_code}")),
            _ => format!("VK_{vk_code}"),
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    use tauri::AppHandle;

    use super::InputDebugHookStatus;

    pub fn start(_app: AppHandle) -> Result<InputDebugHookStatus, String> {
        Ok(unsupported_status())
    }

    pub fn stop() -> Result<InputDebugHookStatus, String> {
        Ok(unsupported_status())
    }

    pub fn status() -> Result<InputDebugHookStatus, String> {
        Ok(unsupported_status())
    }

    fn unsupported_status() -> InputDebugHookStatus {
        InputDebugHookStatus {
            supported: false,
            running: false,
            platform: std::env::consts::OS.to_string(),
            message: Some("Global input debug hook is only supported on Windows.".to_string()),
        }
    }
}

pub fn start(app: tauri::AppHandle) -> Result<InputDebugHookStatus, String> {
    platform::start(app)
}

pub fn stop() -> Result<InputDebugHookStatus, String> {
    platform::stop()
}

pub fn status() -> Result<InputDebugHookStatus, String> {
    platform::status()
}
