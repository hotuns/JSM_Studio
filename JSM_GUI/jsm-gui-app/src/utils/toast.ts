export type ToastKind = 'success' | 'warn' | 'error'

export const toastEventName = 'app-toast'

export function showToast(message: string, kind: ToastKind = 'success') {
  window.dispatchEvent(new CustomEvent<{ message: string; kind?: ToastKind }>(toastEventName, { detail: { message, kind } }))
}
