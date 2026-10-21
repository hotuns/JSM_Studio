export type BackendChoice = 'SDL' | 'legacy'

export type CalibrationStatus = {
  calibrating: boolean
  seconds?: number
}

export type ApplyProfileResult = {
  restarted: boolean
  path?: string
  mappingEnabled?: boolean
}

export type RuntimeMappingState = {
  activeProfilePath: string
  mappingEnabled: boolean
  autoloadEnabled: boolean
}

export type AutoloadRule = {
  processName: string
  fileName: string
  kind: 'profile' | 'advanced' | string
  profileName?: string
  profilePath?: string
  missingProfile: boolean
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

export type ReconnectControllersResult = {
  success: boolean
  restarted: boolean
}

type Unsubscribe = () => void

export interface DesktopBridge {
  launchJSM: (calibrationSeconds?: number) => Promise<void>
  terminateJSM: () => Promise<void>
  minimizeTemporarily: () => Promise<void>
  applyProfile: (profilePath: string, text: string) => Promise<ApplyProfileResult>
  getRuntimeMappingState: () => Promise<RuntimeMappingState>
  setMappingEnabled: (enabled: boolean) => Promise<RuntimeMappingState>
  setAutoloadEnabled: (enabled: boolean) => Promise<RuntimeMappingState>
  listAutoloadRules: () => Promise<AutoloadRule[]>
  saveAutoloadRule: (processName: string, profileName: string) => Promise<AutoloadRule | null>
  deleteAutoloadRule: (processName: string) => Promise<{ success: boolean }>
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
  openConfigDirectory: () => Promise<void>
  onUpdateAvailable: (callback: (version: string) => void) => Unsubscribe
  onUpdateDownloaded: (callback: () => void) => Unsubscribe
  onUpdateDownloadProgress: (callback: (percent: number) => void) => Unsubscribe
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  onTelemetrySample: (callback: (payload: unknown) => void) => Unsubscribe
  reconnectJsmControllers: () => Promise<ReconnectControllersResult>
}

type TauriEventPayload<T> = { payload: T }

const noop: Unsubscribe = () => {}

const getElectronAPI = () => (typeof window === 'undefined' ? undefined : window.electronAPI)
const getTelemetryAPI = () => (typeof window === 'undefined' ? undefined : window.telemetry)
const isTauriWindow = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

type TauriUpdate = import('@tauri-apps/plugin-updater').Update

let pendingTauriUpdate: TauriUpdate | null = null
const tauriUpdateAvailableListeners = new Set<(version: string) => void>()
const tauriUpdateDownloadedListeners = new Set<() => void>()
const tauriUpdateProgressListeners = new Set<(percent: number) => void>()

const notifyTauriUpdateAvailable = (version: string) => {
  tauriUpdateAvailableListeners.forEach(listener => listener(version))
}

const notifyTauriUpdateDownloaded = () => {
  tauriUpdateDownloadedListeners.forEach(listener => listener())
}

const notifyTauriUpdateProgress = (percent: number) => {
  tauriUpdateProgressListeners.forEach(listener => listener(Math.max(0, Math.min(100, percent))))
}

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
  async getRuntimeMappingState() {
    if (isTauriWindow()) {
      return invokeTauri<RuntimeMappingState>('get_runtime_mapping_state')
    }
    return { activeProfilePath: 'profiles-library/Profile 1.txt', mappingEnabled: true, autoloadEnabled: true }
  },
  async setMappingEnabled(enabled) {
    if (isTauriWindow()) {
      return invokeTauri<RuntimeMappingState>('set_mapping_enabled', { enabled })
    }
    return { activeProfilePath: 'profiles-library/Profile 1.txt', mappingEnabled: enabled, autoloadEnabled: true }
  },
  async setAutoloadEnabled(enabled) {
    if (isTauriWindow()) {
      return invokeTauri<RuntimeMappingState>('set_autoload_enabled', { enabled })
    }
    return { activeProfilePath: 'profiles-library/Profile 1.txt', mappingEnabled: true, autoloadEnabled: enabled }
  },
  async listAutoloadRules() {
    if (isTauriWindow()) {
      return invokeTauri<AutoloadRule[]>('list_autoload_rules').catch(() => [])
    }
    return []
  },
  async saveAutoloadRule(processName, profileName) {
    if (isTauriWindow()) {
      return invokeTauri<AutoloadRule>('save_autoload_rule', { process_name: processName, profile_name: profileName }).catch(() => null)
    }
    return null
  },
  async deleteAutoloadRule(processName) {
    if (isTauriWindow()) {
      return invokeTauri<{ success: boolean }>('delete_autoload_rule', { process_name: processName }).catch(() => ({ success: false }))
    }
    return { success: true }
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
  async openConfigDirectory() {
    if (isTauriWindow()) {
      await invokeTauri<void>('open_config_directory')
      return
    }
  },
  onUpdateAvailable(callback) {
    if (isTauriWindow()) {
      tauriUpdateAvailableListeners.add(callback)
      return () => tauriUpdateAvailableListeners.delete(callback)
    }
    return getElectronAPI()?.onUpdateAvailable?.(callback) ?? noop
  },
  onUpdateDownloaded(callback) {
    if (isTauriWindow()) {
      tauriUpdateDownloadedListeners.add(callback)
      return () => tauriUpdateDownloadedListeners.delete(callback)
    }
    return getElectronAPI()?.onUpdateDownloaded?.(callback) ?? noop
  },
  onUpdateDownloadProgress(callback) {
    if (isTauriWindow()) {
      tauriUpdateProgressListeners.add(callback)
      return () => tauriUpdateProgressListeners.delete(callback)
    }
    return getElectronAPI()?.onUpdateDownloadProgress?.(callback) ?? noop
  },
  async checkForUpdates() {
    if (!isTauriWindow()) return

    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      pendingTauriUpdate = await check()
      if (pendingTauriUpdate) {
        notifyTauriUpdateAvailable(pendingTauriUpdate.version)
      }
    } catch (error) {
      console.warn('Failed to check for JSM Studio updates', error)
    }
  },
  async downloadUpdate() {
    if (isTauriWindow()) {
      if (!pendingTauriUpdate) {
        throw new Error('No JSM Studio update is available to download.')
      }

      let contentLength = 0
      let downloadedLength = 0
      notifyTauriUpdateProgress(0)
      await pendingTauriUpdate.download(event => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength ?? 0
          downloadedLength = 0
          notifyTauriUpdateProgress(0)
        } else if (event.event === 'Progress') {
          downloadedLength += event.data.chunkLength
          notifyTauriUpdateProgress(
            contentLength > 0 ? Math.round((downloadedLength / contentLength) * 100) : 0,
          )
        } else if (event.event === 'Finished') {
          notifyTauriUpdateProgress(100)
        }
      })
      notifyTauriUpdateDownloaded()
      return
    }
    await getElectronAPI()?.downloadUpdate?.()
  },
  async installUpdate() {
    if (isTauriWindow()) {
      if (!pendingTauriUpdate) {
        throw new Error('No downloaded JSM Studio update is ready to install.')
      }

      await pendingTauriUpdate.install()
      pendingTauriUpdate = null
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
      return
    }
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
  async reconnectJsmControllers() {
    if (isTauriWindow()) {
      return invokeTauri<ReconnectControllersResult>('reconnect_jsm_controllers')
    }
    return { success: false, restarted: false }
  },
}
