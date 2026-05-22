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

const noop: Unsubscribe = () => {}

const getElectronAPI = () => (typeof window === 'undefined' ? undefined : window.electronAPI)
const getTelemetryAPI = () => (typeof window === 'undefined' ? undefined : window.telemetry)

export const desktopBridge: DesktopBridge = {
  async launchJSM(calibrationSeconds = 5) {
    await getElectronAPI()?.launchJSM?.(calibrationSeconds)
  },
  async terminateJSM() {
    await getElectronAPI()?.terminateJSM?.()
  },
  async minimizeTemporarily() {
    await getElectronAPI()?.minimizeTemporarily?.()
  },
  async applyProfile(profilePath, text) {
    const result = await getElectronAPI()?.applyProfile?.(profilePath, text)
    return result ?? { restarted: false }
  },
  async recalibrateGyro() {
    const result = await getElectronAPI()?.recalibrateGyro?.()
    return result ?? { success: false }
  },
  async getCalibrationSeconds() {
    return (await getElectronAPI()?.getCalibrationSeconds?.()) ?? null
  },
  async setCalibrationSeconds(seconds) {
    return (await getElectronAPI()?.setCalibrationSeconds?.(seconds)) ?? null
  },
  onCalibrationStatus(callback) {
    return getElectronAPI()?.onCalibrationStatus?.(callback) ?? noop
  },
  async listLibraryProfiles() {
    return (await getElectronAPI()?.listLibraryProfiles?.()) ?? []
  },
  async saveLibraryProfile(name, content) {
    return (await getElectronAPI()?.saveLibraryProfile?.(name, content)) ?? null
  },
  async loadLibraryProfile(name) {
    return (await getElectronAPI()?.loadLibraryProfile?.(name)) ?? null
  },
  async deleteLibraryProfile(name) {
    return (await getElectronAPI()?.deleteLibraryProfile?.(name)) ?? { success: false }
  },
  async getActiveProfile() {
    return (await getElectronAPI()?.getActiveProfile?.()) ?? null
  },
  async activateLibraryProfile(name) {
    return (await getElectronAPI()?.activateLibraryProfile?.(name)) ?? null
  },
  async createLibraryProfile(preferredBaseName) {
    return (await getElectronAPI()?.createLibraryProfile?.(preferredBaseName)) ?? null
  },
  async copyActiveProfile() {
    return (await getElectronAPI()?.copyActiveProfile?.()) ?? null
  },
  async renameLibraryProfile(oldName, newName) {
    return (await getElectronAPI()?.renameLibraryProfile?.(oldName, newName)) ?? null
  },
  async loadCalibrationPreset() {
    return (await getElectronAPI()?.loadCalibrationPreset?.()) ?? { success: false }
  },
  async readCalibrationPreset() {
    return (await getElectronAPI()?.readCalibrationPreset?.()) ?? { success: false }
  },
  async saveCalibrationPreset(content) {
    return (await getElectronAPI()?.saveCalibrationPreset?.(content)) ?? { success: false }
  },
  async runCalibrationCommand(command) {
    return (await getElectronAPI()?.runCalibrationCommand?.(command)) ?? { success: false, output: '' }
  },
  async getBackendChoice() {
    return (await getElectronAPI()?.getBackendChoice?.()) ?? null
  },
  async setBackendChoice(choice) {
    return (await getElectronAPI()?.setBackendChoice?.(choice)) ?? null
  },
  async openExternal(url) {
    await getElectronAPI()?.openExternal?.(url)
  },
  onUpdateAvailable(callback) {
    return getElectronAPI()?.onUpdateAvailable?.(callback) ?? noop
  },
  onUpdateDownloaded(callback) {
    return getElectronAPI()?.onUpdateDownloaded?.(callback) ?? noop
  },
  onUpdateDownloadProgress(callback) {
    return getElectronAPI()?.onUpdateDownloadProgress?.(callback) ?? noop
  },
  async downloadUpdate() {
    await getElectronAPI()?.downloadUpdate?.()
  },
  async installUpdate() {
    await getElectronAPI()?.installUpdate?.()
  },
  onTelemetrySample(callback) {
    return getTelemetryAPI()?.onSample?.(callback) ?? noop
  },
}
