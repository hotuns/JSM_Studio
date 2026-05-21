export type BackendChoice = 'SDL' | 'legacy'

export type CalibrationStatus = {
  calibrating: boolean
  seconds?: number
}

export type ApplyProfileResult = {
  restarted: boolean
  path?: string
}

export type NamedProfile = {
  path: string
  name: string
  content: string
}

export type DeleteProfileResult = {
  success: boolean
  fallback?: NamedProfile
}

export type CalibrationPresetLoadResult = {
  success: boolean
  activeProfile?: string
  calibrationProfile?: string
}

export type CalibrationPresetReadResult = {
  success: boolean
  calibrationProfile?: string
  content?: string
}

export type CalibrationCommandResult = {
  success: boolean
  output: string
}

type Unsubscribe = () => void

export interface DesktopBridge {
  launchJSM: (calibrationSeconds?: number) => Promise<void>
  terminateJSM: () => Promise<void>
  minimizeTemporarily: () => Promise<void>
  applyProfile: (profilePath: string, text: string) => Promise<ApplyProfileResult>
  recalibrateGyro: () => Promise<{ success: boolean }>
  getCalibrationSeconds: () => Promise<number | null>
  setCalibrationSeconds: (seconds: number) => Promise<number | null>
  onCalibrationStatus: (callback: (payload: CalibrationStatus) => void) => Unsubscribe
  listLibraryProfiles: () => Promise<string[]>
  saveLibraryProfile: (name: string, content: string) => Promise<{ name: string } | null>
  loadLibraryProfile: (name: string) => Promise<{ name: string; content: string } | null>
  deleteLibraryProfile: (name: string) => Promise<DeleteProfileResult>
  getActiveProfile: () => Promise<NamedProfile | null>
  activateLibraryProfile: (name: string) => Promise<NamedProfile | null>
  createLibraryProfile: (preferredBaseName?: string) => Promise<NamedProfile | null>
  copyActiveProfile: () => Promise<NamedProfile | null>
  renameLibraryProfile: (oldName: string, newName: string) => Promise<NamedProfile | null>
  loadCalibrationPreset: () => Promise<CalibrationPresetLoadResult>
  readCalibrationPreset: () => Promise<CalibrationPresetReadResult>
  saveCalibrationPreset: (content: string) => Promise<{ success: boolean }>
  runCalibrationCommand: (command: string) => Promise<CalibrationCommandResult>
  getBackendChoice: () => Promise<BackendChoice | null>
  setBackendChoice: (choice: BackendChoice) => Promise<{ success: boolean; backend: BackendChoice } | null>
  openExternal: (url: string) => Promise<void>
  onUpdateAvailable: (callback: (version: string) => void) => Unsubscribe
  onUpdateDownloaded: (callback: () => void) => Unsubscribe
  onUpdateDownloadProgress: (callback: (percent: number) => void) => Unsubscribe
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  onTelemetrySample: (callback: (payload: unknown) => void) => Unsubscribe
}

type TauriEventPayload<T> = { payload: T }

const noop: Unsubscribe = () => {}

const getElectronAPI = () => (typeof window === 'undefined' ? undefined : window.electronAPI)
const getTelemetryAPI = () => (typeof window === 'undefined' ? undefined : window.telemetry)
const isTauriWindow = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const invokeTauri = async <T>(command: string, args?: Record<string, unknown>) => {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(command, args)
}

const getLatestTauriTelemetrySample = () =>
  invokeTauri<unknown | null>('get_latest_telemetry_sample').catch(() => null)

const listenTauri = <T>(eventName: string, callback: (payload: T) => void): Unsubscribe => {
  let disposed = false
  let unlisten: Unsubscribe = noop

  void import('@tauri-apps/api/event')
    .then(({ listen }) =>
      listen<T>(eventName, (event: TauriEventPayload<T>) => {
        if (!disposed) {
          callback(event.payload)
        }
      })
    )
    .then(listener => {
      if (disposed) {
        listener()
      } else {
        unlisten = listener
      }
    })
    .catch(error => {
      console.error(`Failed to register Tauri listener for ${eventName}`, error)
    })

  return () => {
    disposed = true
    try {
      unlisten()
    } catch (error) {
      console.error(`Failed to unregister Tauri listener for ${eventName}`, error)
    }
  }
}

export const desktopBridge: DesktopBridge = {
  async launchJSM(calibrationSeconds = 5) {
    if (isTauriWindow()) {
      await invokeTauri<void>('launch_jsm', { calibration_seconds: calibrationSeconds })
      return
    }
    await getElectronAPI()?.launchJSM?.(calibrationSeconds)
  },
  async terminateJSM() {
    if (isTauriWindow()) {
      await invokeTauri<void>('terminate_jsm')
      return
    }
    await getElectronAPI()?.terminateJSM?.()
  },
  async minimizeTemporarily() {
    if (isTauriWindow()) {
      await invokeTauri<void>('minimize_temporarily')
      return
    }
    await getElectronAPI()?.minimizeTemporarily?.()
  },
  async applyProfile(profilePath, text) {
    if (isTauriWindow()) {
      return invokeTauri<ApplyProfileResult>('apply_profile', { profile_path: profilePath, text })
    }
    const result = await getElectronAPI()?.applyProfile?.(profilePath, text)
    return result ?? { restarted: false }
  },
  async recalibrateGyro() {
    if (isTauriWindow()) {
      return invokeTauri<{ success: boolean }>('recalibrate_gyro')
    }
    const result = await getElectronAPI()?.recalibrateGyro?.()
    return result ?? { success: false }
  },
  async getCalibrationSeconds() {
    if (isTauriWindow()) {
      return invokeTauri<number>('get_calibration_seconds').catch(() => null)
    }
    return (await getElectronAPI()?.getCalibrationSeconds?.()) ?? null
  },
  async setCalibrationSeconds(seconds) {
    if (isTauriWindow()) {
      return invokeTauri<number>('set_calibration_seconds', { seconds }).catch(() => null)
    }
    return (await getElectronAPI()?.setCalibrationSeconds?.(seconds)) ?? null
  },
  onCalibrationStatus(callback) {
    if (isTauriWindow()) {
      return listenTauri<CalibrationStatus>('calibration-status', callback)
    }
    return getElectronAPI()?.onCalibrationStatus?.(callback) ?? noop
  },
  async listLibraryProfiles() {
    if (isTauriWindow()) {
      return invokeTauri<string[]>('library_list_profiles').catch(() => [])
    }
    return (await getElectronAPI()?.listLibraryProfiles?.()) ?? []
  },
  async saveLibraryProfile(name, content) {
    if (isTauriWindow()) {
      return invokeTauri<{ name: string }>('library_save_profile', { name, content }).catch(() => null)
    }
    return (await getElectronAPI()?.saveLibraryProfile?.(name, content)) ?? null
  },
  async loadLibraryProfile(name) {
    if (isTauriWindow()) {
      return invokeTauri<{ name: string; content: string }>('library_load_profile', { name }).catch(() => null)
    }
    return (await getElectronAPI()?.loadLibraryProfile?.(name)) ?? null
  },
  async deleteLibraryProfile(name) {
    if (isTauriWindow()) {
      return invokeTauri<DeleteProfileResult>('library_delete_profile', { name }).catch(() => ({ success: false }))
    }
    return (await getElectronAPI()?.deleteLibraryProfile?.(name)) ?? { success: false }
  },
  async getActiveProfile() {
    if (isTauriWindow()) {
      return invokeTauri<NamedProfile>('get_active_profile').catch(() => null)
    }
    return (await getElectronAPI()?.getActiveProfile?.()) ?? null
  },
  async activateLibraryProfile(name) {
    if (isTauriWindow()) {
      return invokeTauri<NamedProfile>('activate_library_profile', { name }).catch(() => null)
    }
    return (await getElectronAPI()?.activateLibraryProfile?.(name)) ?? null
  },
  async createLibraryProfile(preferredBaseName) {
    if (isTauriWindow()) {
      return invokeTauri<NamedProfile>('library_create_profile', { preferred_base_name: preferredBaseName }).catch(() => null)
    }
    return (await getElectronAPI()?.createLibraryProfile?.(preferredBaseName)) ?? null
  },
  async copyActiveProfile() {
    if (isTauriWindow()) {
      return invokeTauri<NamedProfile>('library_copy_active_profile').catch(() => null)
    }
    return (await getElectronAPI()?.copyActiveProfile?.()) ?? null
  },
  async renameLibraryProfile(oldName, newName) {
    if (isTauriWindow()) {
      return invokeTauri<NamedProfile>('library_rename_profile', { old_name: oldName, new_name: newName }).catch(() => null)
    }
    return (await getElectronAPI()?.renameLibraryProfile?.(oldName, newName)) ?? null
  },
  async loadCalibrationPreset() {
    if (isTauriWindow()) {
      return invokeTauri<CalibrationPresetLoadResult>('load_calibration_preset').catch(() => ({ success: false }))
    }
    return (await getElectronAPI()?.loadCalibrationPreset?.()) ?? { success: false }
  },
  async readCalibrationPreset() {
    if (isTauriWindow()) {
      return invokeTauri<CalibrationPresetReadResult>('read_calibration_preset').catch(() => ({ success: false }))
    }
    return (await getElectronAPI()?.readCalibrationPreset?.()) ?? { success: false }
  },
  async saveCalibrationPreset(content) {
    if (isTauriWindow()) {
      return invokeTauri<{ success: boolean }>('save_calibration_preset', { content }).catch(() => ({ success: false }))
    }
    return (await getElectronAPI()?.saveCalibrationPreset?.(content)) ?? { success: false }
  },
  async runCalibrationCommand(command) {
    if (isTauriWindow()) {
      return invokeTauri<CalibrationCommandResult>('run_calibration_command', { command }).catch(() => ({ success: false, output: '' }))
    }
    return (await getElectronAPI()?.runCalibrationCommand?.(command)) ?? { success: false, output: '' }
  },
  async getBackendChoice() {
    if (isTauriWindow()) {
      return invokeTauri<BackendChoice>('get_backend_choice').catch(() => null)
    }
    return (await getElectronAPI()?.getBackendChoice?.()) ?? null
  },
  async setBackendChoice(choice) {
    if (isTauriWindow()) {
      return invokeTauri<{ success: boolean; backend: BackendChoice }>('set_backend_choice', { choice }).catch(() => null)
    }
    return (await getElectronAPI()?.setBackendChoice?.(choice)) ?? null
  },
  async openExternal(url) {
    if (isTauriWindow()) {
      await invokeTauri<void>('open_external', { url })
      return
    }
    await getElectronAPI()?.openExternal?.(url)
  },
  onUpdateAvailable(callback) {
    if (isTauriWindow()) {
      return listenTauri<string>('update-available', callback)
    }
    return getElectronAPI()?.onUpdateAvailable?.(callback) ?? noop
  },
  onUpdateDownloaded(callback) {
    if (isTauriWindow()) {
      return listenTauri('update-downloaded', callback)
    }
    return getElectronAPI()?.onUpdateDownloaded?.(callback) ?? noop
  },
  onUpdateDownloadProgress(callback) {
    if (isTauriWindow()) {
      return listenTauri<number>('update-download-progress', callback)
    }
    return getElectronAPI()?.onUpdateDownloadProgress?.(callback) ?? noop
  },
  async downloadUpdate() {
    if (isTauriWindow()) return
    await getElectronAPI()?.downloadUpdate?.()
  },
  async installUpdate() {
    if (isTauriWindow()) return
    await getElectronAPI()?.installUpdate?.()
  },
  onTelemetrySample(callback) {
    if (isTauriWindow()) {
      let disposed = false
      const unsubscribe = listenTauri<unknown>('telemetry-sample', callback)
      void getLatestTauriTelemetrySample().then(sample => {
        if (!disposed && sample) {
          callback(sample)
        }
      })
      return () => {
        disposed = true
        unsubscribe()
      }
    }
    return getTelemetryAPI()?.onSample?.(callback) ?? noop
  },
}
