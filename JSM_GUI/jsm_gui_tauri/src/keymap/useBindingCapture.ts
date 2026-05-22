import { useEffect, useState } from 'react'
import { BindingSlot, BindingWriteMode } from '../utils/keymap'
import { keyboardEventToBinding, mouseButtonToBinding, shouldIgnoreCapture, wheelEventToBinding } from './bindings'

type CaptureTarget = {
  key: string
  button?: string
  slot?: BindingSlot
  rowId?: string
  modifier?: string
  writeMode?: BindingWriteMode
  onCaptured?: (value: string) => void
}

export const useBindingCapture = (
  onBindingChange: (
    button: string,
    slot: BindingSlot,
    rowId: string,
    value: string | null,
    options?: { modifier?: string; writeMode?: BindingWriteMode }
  ) => void
) => {
  const [captureTarget, setCaptureTarget] = useState<CaptureTarget | null>(null)
  const [captureLabel, setCaptureLabel] = useState<string>('')
  const [suppressKey, setSuppressKey] = useState<string | null>(null)

  useEffect(() => {
    if (!captureTarget) return
    const handleBinding = (value: string | null, suppress: boolean) => {
      if (value) {
        if (captureTarget.onCaptured) {
          captureTarget.onCaptured(value)
        } else if (captureTarget.button && captureTarget.slot && captureTarget.rowId) {
          onBindingChange(
            captureTarget.button,
            captureTarget.slot,
            captureTarget.rowId,
            value,
            { modifier: captureTarget.modifier, writeMode: captureTarget.writeMode }
          )
        }
        if (suppress) {
          setSuppressKey(captureTarget.key)
        } else {
          setSuppressKey(null)
        }
        setCaptureTarget(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreCapture(event)) return
      event.preventDefault()
      event.stopPropagation()
      const binding = keyboardEventToBinding(event)
      handleBinding(binding, false)
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (shouldIgnoreCapture(event)) return
      event.preventDefault()
      event.stopPropagation()
      const binding = mouseButtonToBinding(event.button)
      handleBinding(binding, true)
    }

    const handleWheel = (event: WheelEvent) => {
      if (shouldIgnoreCapture(event)) return
      event.preventDefault()
      event.stopPropagation()
      const binding = wheelEventToBinding(event.deltaY)
      handleBinding(binding, false)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('mousedown', handleMouseDown, true)
    const wheelListenerOptions: AddEventListenerOptions = { passive: false, capture: true }
    window.addEventListener('wheel', handleWheel, wheelListenerOptions)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('wheel', handleWheel, wheelListenerOptions)
    }
  }, [captureTarget, onBindingChange])

  const beginCapture = (
    button: string,
    slot: BindingSlot,
    rowId: string,
    label: string,
    modifier?: string,
    writeMode?: BindingWriteMode
  ) => {
    const key = `${button}-${slot}-${rowId}`
    if (suppressKey === key) {
      setSuppressKey(null)
      return
    }
    setCaptureLabel(label)
    setCaptureTarget({ key, button, slot, rowId, modifier, writeMode })
  }

  const beginValueCapture = (key: string, label: string, onCaptured: (value: string) => void) => {
    if (suppressKey === key) {
      setSuppressKey(null)
      return
    }
    setCaptureLabel(label)
    setCaptureTarget({ key, onCaptured })
  }

  const cancelCapture = () => {
    setCaptureTarget(null)
    setSuppressKey(null)
  }

  const isCapturing = (button: string, slot: BindingSlot, rowId?: string) =>
    captureTarget?.button === button && captureTarget.slot === slot && (!rowId || captureTarget.rowId === rowId)

  const isCapturingValue = (key: string) => captureTarget?.key === key && Boolean(captureTarget?.onCaptured)

  return {
    captureLabel,
    beginCapture,
    beginValueCapture,
    cancelCapture,
    isCapturing,
    isCapturingValue,
  }
}
