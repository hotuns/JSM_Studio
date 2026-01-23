import { useEffect, useState } from 'react'
import { toastEventName, type ToastKind } from '../utils/toast'
import styles from './Misc.module.css'

type ToastPayload = {
  message: string
  kind?: ToastKind
}

type Toast = ToastPayload & { id: string }

const toastDurationMs = 3000

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>)?.detail
      if (!detail?.message) return
      const nextToast = { id: crypto.randomUUID(), ...detail }
      setToasts([nextToast])
    }
    window.addEventListener(toastEventName, listener as EventListener)
    return () => window.removeEventListener(toastEventName, listener as EventListener)
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map(toast =>
      setTimeout(() => {
        setToasts(current => current.filter(item => item.id !== toast.id))
      }, toastDurationMs)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts])

  if (!toasts.length) return null

  return (
    <div className={styles.toastStack}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${styles.toast} ${
            toast.kind === 'error' ? styles.toastError : toast.kind === 'warn' ? styles.toastWarn : styles.toastSuccess
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
