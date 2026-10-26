import { useEffect, useSyncExternalStore } from 'react'
import { desktopBridge } from '../platform/desktopBridge'

type UpdateState = { phase: 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'ready' | 'installing' | 'error' | 'unsupported'; version: string | null; percent: number; error: string | null }
let state: UpdateState = { phase: 'idle', version: null, percent: 0, error: null }
const listeners = new Set<() => void>()
let initialized = false, busy = false, autoChecked = false
const patch = (values: Partial<UpdateState>) => { state = { ...state, ...values }; listeners.forEach(fn => fn()) }
const message = (error: unknown) => error instanceof Error ? error.message : String(error)
function initialize() {
  if (initialized) return
  initialized = true
  desktopBridge.onUpdateAvailable(version => patch({ phase: 'available', version, error: null }))
  desktopBridge.onUpdateDownloadProgress(percent => patch({ percent }))
  desktopBridge.onUpdateDownloaded(() => patch({ phase: 'ready', percent: 100, error: null }))
}
async function perform(action: 'check' | 'download' | 'install') {
  if (busy || action === 'check' && ['ready', 'installing'].includes(state.phase)) return
  if (action === 'download' && !state.version || action === 'install' && state.phase !== 'ready') return
  initialize(); busy = true
  if (action === 'check') autoChecked = true
  patch({ phase: action === 'check' ? 'checking' : action === 'download' ? 'downloading' : 'installing', error: null })
  try {
    if (action === 'check') {
      const result = await desktopBridge.checkForUpdates()
      patch({ phase: !result.supported ? 'unsupported' : result.version ? 'available' : 'current', version: result.version })
    } else if (action === 'download') {
      await desktopBridge.downloadUpdate(); patch({ phase: 'ready', percent: 100 })
    } else { await desktopBridge.installUpdate() }
  } catch (error) { patch({ phase: action === 'install' ? 'ready' : 'error', error: message(error) }) }
  finally { busy = false }
}
export function useSoftwareUpdate(autoCheck = false) {
  const current = useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback) } }, () => state)
  useEffect(() => {
    initialize()
    if (!autoCheck || autoChecked) return
    const timer = window.setTimeout(() => { if (!autoChecked && state.phase === 'idle') { autoChecked = true; void perform('check') } }, 1500)
    return () => window.clearTimeout(timer)
  }, [autoCheck])
  return { ...current, busy: ['checking', 'downloading', 'installing'].includes(current.phase), check: () => perform('check'), download: () => perform('download'), install: () => perform('install') }
}
