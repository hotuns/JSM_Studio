import { useEffect, useState } from 'react'
import { desktopBridge, type CalibrationStatus } from '../platform/desktopBridge'

export type TelemetryDeviceStatus = {
  buttons: number
  leftStick: {
    x: number
    y: number
  }
  rightStick: {
    x: number
    y: number
  }
  triggers: {
    left: number
    right: number
  }
  gyro: {
    x: number
    y: number
    z: number
  }
}

export type TelemetryDevice = {
  handle: number
  type: number
  split?: number
  vid?: number
  pid?: number
  status?: TelemetryDeviceStatus
}

export type TelemetrySample = {
  omega?: number
  t?: number
  u?: number
  sensX?: number
  sensY?: number
  curve?: string
  sampleHz?: number
  devices?: TelemetryDevice[]
  [key: string]: unknown
}

export function useTelemetry() {
  const [sample, setSample] = useState<TelemetrySample | null>(null)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const dispose = desktopBridge.onTelemetrySample((payload) => {
      setSample(payload as TelemetrySample)
    })
    const statusDispose = desktopBridge.onCalibrationStatus((state: CalibrationStatus) => {
      setIsCalibrating(state.calibrating)
      if (state.calibrating && state.seconds)
        setCountdown(state.seconds)
      else
        setCountdown(null)
    })
    return () => {
      dispose?.()
      statusDispose?.()
    }
  }, [])

  return { sample, isCalibrating, countdown }
}
