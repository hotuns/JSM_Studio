use std::{
    net::UdpSocket,
    sync::atomic::Ordering,
    thread,
    time::{Duration, Instant},
};

use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

use crate::services::app_state::AppState;

const TELEMETRY_PORT: u16 = 8974;
const TELEMETRY_STALE_MS: u64 = 1500;
const TELEMETRY_HEALTH_CHECK_MS: u64 = 500;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalibrationStatusPayload {
    pub calibrating: bool,
    pub seconds: Option<u32>,
}

pub fn start(app: AppHandle, state: AppState) {
    let _ = emit_calibration_status(
        &app,
        CalibrationStatusPayload {
            calibrating: false,
            seconds: None,
        },
    );

    thread::spawn(move || {
        let socket = match UdpSocket::bind(("127.0.0.1", TELEMETRY_PORT)) {
            Ok(socket) => socket,
            Err(error) => {
                eprintln!("Failed to bind telemetry socket: {error}");
                return;
            }
        };

        let _ = socket.set_read_timeout(Some(Duration::from_millis(TELEMETRY_HEALTH_CHECK_MS)));
        let mut buffer = [0_u8; 65535];

        loop {
            match socket.recv_from(&mut buffer) {
                Ok((size, _)) => match serde_json::from_slice::<Value>(&buffer[..size]) {
                    Ok(packet) => {
                        update_latest_packet(&state, packet.clone());
                        let _ = emit_telemetry_packet(&app, packet);
                    }
                    Err(error) => {
                        eprintln!("Failed to parse telemetry packet: {error}");
                    }
                },
                Err(error)
                    if matches!(
                        error.kind(),
                        std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                    ) => {}
                Err(error) => {
                    eprintln!("Telemetry socket error: {error}");
                    break;
                }
            }

            let _ = handle_health(&app, &state);
        }
    });
}

pub fn latest_packet(state: &AppState) -> Result<Option<Value>, String> {
    let telemetry_state = state
        .telemetry
        .lock()
        .map_err(|_| "Telemetry state lock poisoned.".to_string())?;
    Ok(telemetry_state.latest_packet.clone())
}

pub fn emit_calibration_status(
    app: &AppHandle,
    payload: CalibrationStatusPayload,
) -> Result<(), String> {
    app.emit("calibration-status", payload)
        .map_err(|error| format!("Failed to emit calibration status: {error}"))
}

pub fn stop_calibration_countdown(app: &AppHandle, state: &AppState) -> Result<(), String> {
    state.calibration_generation.fetch_add(1, Ordering::SeqCst);
    emit_calibration_status(
        app,
        CalibrationStatusPayload {
            calibrating: false,
            seconds: None,
        },
    )
}

pub fn start_calibration_countdown(
    app: AppHandle,
    state: AppState,
    seconds: u32,
) -> Result<(), String> {
    if seconds == 0 {
        return stop_calibration_countdown(&app, &state);
    }

    let generation = state.calibration_generation.fetch_add(1, Ordering::SeqCst) + 1;
    emit_calibration_status(
        &app,
        CalibrationStatusPayload {
            calibrating: true,
            seconds: Some(seconds),
        },
    )?;

    thread::spawn(move || {
        let mut remaining = seconds;
        while remaining > 0 {
            thread::sleep(Duration::from_secs(1));
            if state.calibration_generation.load(Ordering::SeqCst) != generation {
                return;
            }
            remaining -= 1;
            if remaining > 0 {
                let _ = emit_calibration_status(
                    &app,
                    CalibrationStatusPayload {
                        calibrating: true,
                        seconds: Some(remaining),
                    },
                );
            } else {
                let _ = emit_calibration_status(
                    &app,
                    CalibrationStatusPayload {
                        calibrating: false,
                        seconds: None,
                    },
                );
            }
        }
    });

    Ok(())
}

pub fn broadcast_empty_devices(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let packet = {
        let mut telemetry_state = state
            .telemetry
            .lock()
            .map_err(|_| "Telemetry state lock poisoned.".to_string())?;
        let cleared = clear_devices(
            telemetry_state
                .latest_packet
                .clone()
                .unwrap_or_else(|| json!({ "devices": [] })),
        );
        telemetry_state.latest_packet = Some(cleared.clone());
        telemetry_state.latest_received_at = None;
        telemetry_state.stale_devices_cleared = true;
        cleared
    };

    emit_telemetry_packet(app, packet)
}

fn emit_telemetry_packet(app: &AppHandle, packet: Value) -> Result<(), String> {
    app.emit("telemetry-sample", packet)
        .map_err(|error| format!("Failed to emit telemetry packet: {error}"))
}

fn update_latest_packet(state: &AppState, packet: Value) {
    if let Ok(mut telemetry_state) = state.telemetry.lock() {
        telemetry_state.latest_packet = Some(packet);
        telemetry_state.latest_received_at = Some(Instant::now());
        telemetry_state.stale_devices_cleared = false;
        if telemetry_state
            .latest_packet
            .as_ref()
            .map(packet_has_devices)
            .unwrap_or(false)
        {
            telemetry_state.last_reconnect_attempt = None;
        }
    }
}

fn handle_health(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let mut stale_packet_to_emit = None;

    {
        let mut telemetry_state = state
            .telemetry
            .lock()
            .map_err(|_| "Telemetry state lock poisoned.".to_string())?;

        let has_devices = telemetry_state
            .latest_packet
            .as_ref()
            .map(packet_has_devices)
            .unwrap_or(false);
        let has_fresh_telemetry = telemetry_state
            .latest_received_at
            .map(|received_at| received_at.elapsed() <= Duration::from_millis(TELEMETRY_STALE_MS))
            .unwrap_or(false);

        if has_devices && !has_fresh_telemetry && !telemetry_state.stale_devices_cleared {
            let cleared = clear_devices(
                telemetry_state
                    .latest_packet
                    .clone()
                    .unwrap_or_else(|| json!({ "devices": [] })),
            );
            telemetry_state.latest_packet = Some(cleared.clone());
            telemetry_state.stale_devices_cleared = true;
            stale_packet_to_emit = Some(cleared);
        }

        if has_devices && has_fresh_telemetry {
            telemetry_state.last_reconnect_attempt = None;
        }
    }

    if let Some(packet) = stale_packet_to_emit {
        emit_telemetry_packet(app, packet)?;
    }

    Ok(())
}

fn packet_has_devices(packet: &Value) -> bool {
    packet
        .get("devices")
        .and_then(Value::as_array)
        .map(|devices| !devices.is_empty())
        .unwrap_or(false)
}

fn clear_devices(packet: Value) -> Value {
    match packet {
        Value::Object(mut map) => {
            map.insert("devices".to_string(), Value::Array(Vec::new()));
            Value::Object(map)
        }
        _ => json!({ "devices": [] }),
    }
}
