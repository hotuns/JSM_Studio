declare interface Window {
  __TAURI_INTERNALS__?: unknown
  electronAPI?: {
    installDriver?: (kind: 'hidhide' | 'vigem') => Promise<{ cancelled: boolean; rebootRequired: boolean; exitCode: number }>
    openComponentTool?: (kind: 'hidhide' | 'gamepads') => Promise<void>
    getComponentsStatus?: () => Promise<import('../platform/desktopBridge').ComponentsStatus>
    manageHidHide?: (action: 'hide' | 'show' | 'allow' | 'restore', deviceId?: string, xinput?: boolean) => Promise<import('../platform/desktopBridge').ComponentsStatus>
    getCursorSwitchState?: () => Promise<import('../platform/desktopBridge').CursorSwitchState>
    saveCursorSwitchSettings?: (settings: import('../platform/desktopBridge').CursorSwitchSettings) => Promise<import('../platform/desktopBridge').CursorSwitchState>
    launchJSM: (calibrationSeconds?: number) => Promise<void>
    terminateJSM: () => Promise<void>
    minimizeTemporarily: () => Promise<void>
    applyProfile?: (profilePath: string, text: string) => Promise<{ restarted: boolean; path?: string; mappingEnabled?: boolean }>
    recalibrateGyro?: () => Promise<{ success: boolean }>
    getCalibrationSeconds?: () => Promise<number>
    setCalibrationSeconds?: (seconds: number) => Promise<number>
    onCalibrationStatus?: (callback: (payload: { calibrating: boolean; seconds?: number }) => void) => () => void
    listLibraryProfiles?: () => Promise<string[]>
    saveLibraryProfile?: (name: string, content: string) => Promise<{ name: string }>
    loadLibraryProfile?: (name: string) => Promise<{ name: string; content: string }>
    deleteLibraryProfile?: (name: string) => Promise<{ success: boolean; fallback?: { path: string; name: string; content: string } }>
    getActiveProfile?: () => Promise<{ path: string; name: string; content: string }>
    activateLibraryProfile?: (name: string) => Promise<{ path: string; name: string; content: string }>
    createLibraryProfile?: (preferredBaseName?: string) => Promise<{ path: string; name: string; content: string }>
    createSavedProfile?: (name: string, content: string) => Promise<{ path: string; name: string; content: string }>
    copyActiveProfile?: () => Promise<{ path: string; name: string; content: string }>
    renameLibraryProfile?: (oldName: string, newName: string) => Promise<{ path: string; name: string; content: string }>
    loadCalibrationPreset?: () => Promise<{ success: boolean; activeProfile?: string; calibrationProfile?: string }>
    readCalibrationPreset?: () => Promise<{ success: boolean; calibrationProfile?: string; content?: string }>
    saveCalibrationPreset?: (content: string) => Promise<{ success: boolean }>
    runCalibrationCommand?: (command: string) => Promise<{ success: boolean; output: string }>
    getBackendChoice?: () => Promise<'SDL' | 'legacy'>
    setBackendChoice?: (choice: 'SDL' | 'legacy') => Promise<{ success: boolean; backend: 'SDL' | 'legacy' }>
    openExternal?: (url: string) => Promise<void>
    onUpdateAvailable?: (callback: (version: string) => void) => () => void
    onUpdateDownloaded?: (callback: () => void) => () => void
    onUpdateDownloadProgress?: (callback: (percent: number) => void) => () => void
    downloadUpdate?: () => Promise<void>
    installUpdate?: () => Promise<void>

  }
  telemetry?: {
    onSample?: (callback: (payload: unknown) => void) => () => void
  }
}
