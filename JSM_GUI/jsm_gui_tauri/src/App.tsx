import { createVirtualProfile } from './utils/virtualProfile'
import { StudioShell, type StudioPage } from './components/StudioShell'
import { StudioOverview } from './components/StudioOverview'
import { GameProfilesPage } from './components/GameProfilesPage'
import motionStyles from './components/MotionControls.module.css'
import './App.css'
import { Suspense, lazy, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useTelemetry } from './hooks/useTelemetry'
import miscStyles from './components/Misc.module.css'
import { SectionActions } from './components/SectionActions'
import { DEFAULT_HOLD_PRESS_TIME } from './constants/defaults'
import { ControllerStatusPage } from './components/ControllerStatusPage'
import { useProfileLibrary } from './hooks/useProfileLibrary'
import { useKeymapConfig } from './hooks/useKeymapConfig'
import { useCalibration } from './hooks/useCalibration'
import { ToastHost } from './components/ToastHost'
import { desktopBridge } from './platform/desktopBridge'
import { updateKeymapEntry } from './utils/keymap'
import { showToast } from './utils/toast'


type PrimaryTab = StudioPage
type GyroSubTab = 'behavior' | 'sensitivity' | 'noise'
const QQ_GROUP_URL = 'https://qm.qq.com/q/OyPvwoBSkU'

const asNumber = (value: unknown) => (typeof value === 'number' ? value : undefined)
const formatNumber = (value: number | undefined, digits = 2) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '0.00'
const FLOATING_WINDOW_MARGIN = 16

type FloatingWindowPosition = {
  x: number
  y: number
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const clampFloatingWindowPosition = (
  position: FloatingWindowPosition,
  width: number,
  height: number
): FloatingWindowPosition => {
  const maxX = Math.max(FLOATING_WINDOW_MARGIN, window.innerWidth - width - FLOATING_WINDOW_MARGIN)
  const maxY = Math.max(FLOATING_WINDOW_MARGIN, window.innerHeight - height - FLOATING_WINDOW_MARGIN)

  return {
    x: clamp(position.x, FLOATING_WINDOW_MARGIN, maxX),
    y: clamp(position.y, FLOATING_WINDOW_MARGIN, maxY),
  }
}

const getDefaultFloatingWindowPosition = (width: number, height: number): FloatingWindowPosition =>
  clampFloatingWindowPosition(
    {
      x: window.innerWidth - width - FLOATING_WINDOW_MARGIN,
      y: Math.round((window.innerHeight - height) / 2),
    },
    width,
    height
  )

const GyroBehaviorControls = lazy(async () => {
  const module = await import('./components/GyroBehaviorControls')
  return { default: module.GyroBehaviorControls }
})

const SensitivityControls = lazy(async () => {
  const module = await import('./components/SensitivityControls')
  return { default: module.SensitivityControls }
})

const NoiseSteadyingControls = lazy(async () => {
  const module = await import('./components/NoiseSteadyingControls')
  return { default: module.NoiseSteadyingControls }
})

const KeymapControls = lazy(async () => {
  const module = await import('./components/KeymapControls')
  return { default: module.KeymapControls }
})

const ConfigEditor = lazy(async () => {
  const module = await import('./components/ConfigEditor')
  return { default: module.ConfigEditor }
})

const CommunityProfilesPage = lazy(async () => {
  const module = await import('./components/CommunityProfilesPage')
  return { default: module.CommunityProfilesPage }
})

const ProfileManager = lazy(async () => {
  const module = await import('./components/ProfileManager')
  return { default: module.ProfileManager }
})

const AutoloadManager = lazy(async () => {
  const module = await import('./components/AutoloadManager')
  return { default: module.AutoloadManager }
})

const SettingsPage = lazy(async () => {
  const module = await import('./components/SettingsPage')
  return { default: module.SettingsPage }
})

const UpdateBanner = lazy(async () => {
  const module = await import('./components/UpdateBanner')
  return { default: module.UpdateBanner }
})

const RwcGuideModal = lazy(async () => {
  const module = await import('./components/RwcGuideModal')
  return { default: module.RwcGuideModal }
})

type LazyPanelFallbackProps = {
  title?: string
  compact?: boolean
}

const LazyPanelFallback = ({ title, compact = false }: LazyPanelFallbackProps) => (
  <div className={`lazy-panel-fallback ${compact ? 'compact' : ''}`} data-capture-ignore="true">
    {title && <div className="lazy-panel-fallback-title">{title}</div>}
    <div className="lazy-panel-fallback-text">Loading...</div>
  </div>
)

function App() {
  const { t } = useTranslation()
  const { sample, isCalibrating, countdown } = useTelemetry()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [recalibrating, setRecalibrating] = useState(false)
  const [isAutoloadModalOpen, setAutoloadModalOpen] = useState(false)
  const [isRwcGuideModalOpen, setIsRwcGuideModalOpen] = useState(false)
  const [isConfigDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [configWindowPosition, setConfigWindowPosition] = useState<FloatingWindowPosition | null>(null)
  const [configWindowDragging, setConfigWindowDragging] = useState(false)
  const [mappingEnabled, setMappingEnabled] = useState(true)
  const [autoloadEnabled, setAutoloadEnabled] = useState(true)
  const [runtimeMappingBusy, setRuntimeMappingBusy] = useState(false)
  const [gameCreating, setGameCreating] = useState(false)
  const [calibrationTurns, setCalibrationTurns] = useState('1')
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('overview')
  const [gyroSubTab, setGyroSubTab] = useState<GyroSubTab>('behavior')
  const [selectedMappingCommand, setSelectedMappingCommand] = useState<string | null>('N')
  const configWindowRef = useRef<HTMLDivElement | null>(null)
  const configWindowDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const {
    configText,
    setConfigText,
    appliedConfig,
    setAppliedConfig,
    sensitivityView,
    setSensitivityView,
    sensitivityModeshiftButton,
    sensitivity,
    modeshiftSensitivity,
    activeSensitivityPrefix,
    ignoredGyroDevices,
    finalizePendingValues,
    selectedBaseMode,
    selectedModeshiftMode,
    holdPressTimeSeconds,
    holdPressTimeIsCustom,
    doublePressWindowSeconds,
    doublePressWindowIsCustom,
    simPressWindowSeconds,
    simPressWindowIsCustom,
    lightBarColor,
    handleLightBarChange,
    triggerThresholdValue,
    touchpadModeValue,
    gridSizeValue,
    touchpadSensitivityValue,
    touchpadDualStageModeValue,
    touchStickModeValue,
    touchDeadzoneInnerValue,
    touchRingModeValue,
    touchStickRadiusValue,
    touchStickAxisValue,
    touchpadWarnings,
    hasPendingChanges,
    hasPendingSensitivityChanges,
    handleSensitivityModeshiftButtonChange,
    handleThresholdChange,
    handleCutoffSpeedChange,
    handleCutoffRecoveryChange,
    handleSmoothTimeChange,
    handleSmoothThresholdChange,
    handleSmoothingDecayChange,
    handleOneEuroFilterChange,
    handleOneEuroMinCutoffChange,
    handleOneEuroSpeedCoeffChange,
    handleAngleSnapChange,
    handleAngleSnapSmoothChange,
    handleDecelBrakeStrengthChange,
    handleDecelBrakeThresholdChange,
    handleTickTimeChange,
    handleHoldPressTimeChange,
    handleDoublePressWindowChange,
    handleSimPressWindowChange,
    handleTriggerThresholdChange,
    handleGyroSpaceChange,
    handleGyroAxisXChange,
    handleGyroAxisYChange,
    handleDualSensChange,
    handleStaticSensChange,
    handleRollContributionChange,
    handleTouchpadModeChange,
    handleGridSizeChange,
    handleTouchpadSensitivityChange,
    handleTouchpadDualStageModeChange,
    handleTouchStickModeChange,
    handleTouchDeadzoneInnerChange,
    handleTouchRingModeChange,
    handleTouchStickRadiusChange,
    handleTouchStickAxisChange,
    handleInGameSensChange,
    handleRealWorldCalibrationChange,
    handleAccelCurveChange,
    handleNaturalVHalfChange,
    handlePowerVRefChange,
    handlePowerExponentChange,
    handleJumpTauChange,
    handleSigmoidMidChange,
    handleSigmoidWidthChange,
    handleModeSelection,
    handleFaceButtonBindingChange,
    handleModifierChange,
    handleSpecialActionAssignment,
    handleClearSpecialAction,
    gyroActivation,
    handleGyroActivationModeChange,
    handleGyroActivationButtonChange,
    trackballDecayValue,
    handleTrackballDecayChange,
    virtualControllerType,
    virtualControllerWarnings,
    handleVirtualControllerTypeChange,
    handleStickDeadzoneChange,
    handleStickModeChange,
    handleRingModeChange,
    handleStickModeShiftChange,
    handleAdaptiveTriggerChange,
    stickAimHandlers,
    stickFlickSettings,
    stickFlickHandlers,
    mouseRingRadiusValue,
    handleMouseRingRadiusChange,
    counterOsMouseSpeedEnabled,
    handleCounterOsMouseSpeedChange,
    stickDeadzoneDefaults,
    leftStickDeadzone,
    rightStickDeadzone,
    stickModes,
    stickModeShiftAssignments,
    stickAimSettings,
    adaptiveTriggerValue,
    zlModeValue,
    zrModeValue,
    handleZlModeChange,
    handleZrModeChange,
    handleToggleIgnoreGyroDevice,
    scrollSensValue,
    handleScrollSensChange,
    resetPendingSensitivityChanges,
  } = useKeymapConfig()
  const {
    libraryProfiles,
    isLibraryLoading,
    editedLibraryNames,
    currentLibraryProfile,
    applyConfig,
    handleLoadProfileFromLibrary,
    handleLibraryProfileNameChange,
    handleCreateProfile,
    handleCreateGameProfile,
    savedConfig,
    saveConfig,
    handleRenameProfile,
    handleDeleteLibraryProfile,
    handleImportProfile,
    handleCopyActiveProfile,
    refreshLibraryProfiles,
  } = useProfileLibrary({
    configText,
    setConfigText,
    setAppliedConfig,
    setStatusMessage,
    resetPendingSensitivityChanges: resetPendingSensitivityChanges,
  })
  const hasUnsavedChanges = configText !== savedConfig || hasPendingSensitivityChanges
  const handleCancel = () => { resetPendingSensitivityChanges(); setConfigText(savedConfig) }
  const handleSaveWithFinalize = async () => {
    try { await saveConfig(finalizePendingValues?.() ?? configText) }
    catch (error) { console.error(error); showToast(t('studio.saveFailed'), 'error') }
  }
  const {
    isCalibrationModalOpen,
    calibrationCounterOs,
    calibrationInGameSens,
    calibrationDirty,
    setCalibrationCounterOs,
    setCalibrationInGameSens,
    setCalibrationDirty,
    calibrationLoadMessage,
    calibrationOutput,
    resetCalibrationInputs,
    handleOpenCalibration,
    handleCloseCalibration,
    handleApplyCalibrationPreset,
    handleRunCalibration,
  } = useCalibration({
    configText,
    counterOsMouseSpeedEnabled,
    sensitivityInGame: sensitivity.inGameSens,
  })


  const handleRecalibrate = async () => {
    if (isCalibrating || recalibrating) return
    setRecalibrating(true)
    try {
      const result = await desktopBridge.recalibrateGyro()
      if (result?.success) {
        setStatusMessage(t('messages.recalibrationStarted'))
      } else {
        setStatusMessage(t('messages.recalibrationFailed'))
      }
    } catch (err) {
      console.error(err)
      setStatusMessage(t('messages.recalibrationFailed'))
    } finally {
      setRecalibrating(false)
      setTimeout(() => setStatusMessage(null), 3000)
    }
  }

  const formatTimestamp = (value: unknown) => {
    if (typeof value === 'number') {
      const date = new Date(value)
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      const ms = String(date.getMilliseconds()).padStart(3, '0')
      return `${hours}:${minutes}:${seconds}.${ms}`
    }
    if (typeof value === 'string') {
      return value
    }
    return '-'
  }

  const telemetryValues = {
    omega: formatNumber(asNumber(sample?.omega)),
    sensX: formatNumber(asNumber(sample?.sensX)),
    sensY: formatNumber(asNumber(sample?.sensY)),
    sampleHz: formatNumber(asNumber(sample?.sampleHz), 0),
    timestamp: formatTimestamp(sample?.ts),
  }
  const currentMode: 'static' | 'accel' =
    sensitivityView === 'modeshift' && sensitivityModeshiftButton ? selectedModeshiftMode : selectedBaseMode
  const profileLabel = currentLibraryProfile ?? t('app.profileSummary.unsavedProfile')
  const profileFileLabel = `${profileLabel}${profileLabel.endsWith('.txt') ? '' : '.txt'}`
  const lockMessage = t('messages.lockMessage')

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target
      // Make numeric tuning quick without overriding caret placement in search,
      // profile names or the source editor. Keep native slider keyboard access.
      if (target instanceof HTMLInputElement && target.type === 'number' && !target.disabled && !target.readOnly) {
        requestAnimationFrame(() => target.select())
      }
    }
    window.addEventListener('focusin', handleFocusIn)
    return () => window.removeEventListener('focusin', handleFocusIn)
  }, [])

  useEffect(() => {
    if (!isConfigDrawerOpen) {
      configWindowDragRef.current = null
      setConfigWindowDragging(false)
      return
    }

    const updateFloatingWindowPosition = () => {
      const rect = configWindowRef.current?.getBoundingClientRect()
      const width = rect?.width ?? Math.min(window.innerWidth - FLOATING_WINDOW_MARGIN * 2, 400)
      const height = rect?.height ?? Math.min(window.innerHeight - FLOATING_WINDOW_MARGIN * 2, 760)
      setConfigWindowPosition(current =>
        clampFloatingWindowPosition(current ?? getDefaultFloatingWindowPosition(width, height), width, height)
      )
    }

    const frame = window.requestAnimationFrame(updateFloatingWindowPosition)
    window.addEventListener('resize', updateFloatingWindowPosition)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateFloatingWindowPosition)
    }
  }, [isConfigDrawerOpen])

  useEffect(() => {
    if (!isConfigDrawerOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfigDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isConfigDrawerOpen])

  const handleApplyWithFinalize = () => {
    const nextText = finalizePendingValues ? finalizePendingValues() : undefined
    if (nextText !== undefined) {
      return applyConfig({ textOverride: nextText })
    } else {
      return applyConfig()
    }
  }

  useEffect(() => {
    let disposed = false
    void desktopBridge.getRuntimeMappingState().then(state => {
      if (disposed) return
      setMappingEnabled(state.mappingEnabled)
      setAutoloadEnabled(state.autoloadEnabled)
    }).catch(error => {
      console.error('Failed to load runtime mapping state', error)
    })
    return () => {
      disposed = true
    }
  }, [])

  const handleToggleMappingEnabled = async () => {
    if (runtimeMappingBusy) return
    const nextEnabled = !mappingEnabled
    setRuntimeMappingBusy(true)
    try {
      if (nextEnabled && hasPendingChanges) {
        if (!await applyConfig()) return
      }
      const nextState = await desktopBridge.setMappingEnabled(nextEnabled)
      setMappingEnabled(nextState.mappingEnabled)
      setAutoloadEnabled(nextState.autoloadEnabled)
      const message = nextState.mappingEnabled ? t('messages.mappingEnabled') : t('messages.mappingPaused')
      setStatusMessage(message)
      showToast(message)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (error) {
      console.error('Failed to toggle mapping output', error)
      const message = t('messages.mappingToggleFailed')
      setStatusMessage(message)
      showToast(message, 'error')
    } finally {
      setRuntimeMappingBusy(false)
    }
  }

  const handleAutoloadEnabledChange = async (enabled: boolean) => {
    if (runtimeMappingBusy) return
    setRuntimeMappingBusy(true)
    try {
      const nextState = await desktopBridge.setAutoloadEnabled(enabled)
      setMappingEnabled(nextState.mappingEnabled)
      setAutoloadEnabled(nextState.autoloadEnabled)
      const message = nextState.autoloadEnabled ? t('messages.autoloadEnabled') : t('messages.autoloadDisabled')
      setStatusMessage(message)
      showToast(message)
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (error) {
      console.error('Failed to update AutoLoad setting', error)
      const message = t('messages.autoloadUpdateFailed')
      setStatusMessage(message)
      showToast(message, 'error')
    } finally {
      setRuntimeMappingBusy(false)
    }
  }

  const handleOpenConfigDirectory = async () => {
    try {
      await desktopBridge.openConfigDirectory()
    } catch (error) {
      console.error('Failed to open config directory', error)
      showToast(t('messages.openConfigDirectoryFailed'), 'error')
    }
  }

  const handleConfigWindowDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const floatingWindow = configWindowRef.current
    if (!floatingWindow) return

    const rect = floatingWindow.getBoundingClientRect()
    const nextPosition = configWindowPosition ?? { x: rect.left, y: rect.top }
    configWindowDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - nextPosition.x,
      offsetY: event.clientY - nextPosition.y,
    }
    setConfigWindowPosition(nextPosition)
    event.currentTarget.setPointerCapture(event.pointerId)
    setConfigWindowDragging(true)
  }

  const handleConfigWindowDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = configWindowDragRef.current
    const floatingWindow = configWindowRef.current
    if (!dragState || dragState.pointerId !== event.pointerId || !floatingWindow) return

    const rect = floatingWindow.getBoundingClientRect()
    setConfigWindowPosition(
      clampFloatingWindowPosition(
        {
          x: event.clientX - dragState.offsetX,
          y: event.clientY - dragState.offsetY,
        },
        rect.width,
        rect.height
      )
    )
  }

  const handleConfigWindowDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (configWindowDragRef.current?.pointerId !== event.pointerId) return

    configWindowDragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setConfigWindowDragging(false)
  }

  const renderGyroNav = () => (
    <nav className={motionStyles.nav} aria-label={t('motion.title')}>
      {(['behavior', 'sensitivity', 'noise'] as const).map((tab, index) => (
        <button type="button" key={tab} aria-current={gyroSubTab === tab ? 'page' : undefined} onClick={() => setGyroSubTab(tab)}>
          <span className={motionStyles.number}>{String(index + 1).padStart(2, '0')}</span>
          <span><strong>{t(`motion.${tab}`)}</strong><small>{t(`motion.${tab}Hint`)}</small></span>
        </button>
      ))}
    </nav>
  )

  const renderPrimaryContent = () => {
    if (primaryTab === 'settings') {
      return <Suspense fallback={<LazyPanelFallback title={t('studio.settings')} />}>
        <SettingsPage virtualType={virtualControllerType} warnings={virtualControllerWarnings}
          onVirtualChange={handleVirtualControllerTypeChange} disabled={isCalibrating || runtimeMappingBusy || recalibrating}
          onMappings={() => setPrimaryTab('keybinds')} onDevices={() => setPrimaryTab('controllerStatus')} onFolder={handleOpenConfigDirectory}
          onLibrary={() => setPrimaryTab('profiles')} onCreateVirtual={async type => {
            const result = await desktopBridge.createSavedProfile(type === 'XBOX' ? 'Xbox Virtual' : 'DS4 Virtual', createVirtualProfile(type))
            if (!result?.name || !result.path) throw new Error(t('studio.saveFailed'))
            await refreshLibraryProfiles()
            return result.name
          }} />
      </Suspense>
    }
    if (primaryTab === 'games') {
      return <GameProfilesPage configText={configText} onChange={setConfigText} profileName={currentLibraryProfile}
        sample={sample} hasPendingChanges={hasUnsavedChanges} isCalibrating={isCalibrating || gameCreating}
        onLibrary={() => setPrimaryTab('profiles')}
        onCreate={async (name, text, applyNow) => { setGameCreating(true); try { await handleCreateGameProfile(name, text, applyNow); if (!applyNow) setPrimaryTab('profiles') } finally { setGameCreating(false) } }}
        onAdvanced={() => setPrimaryTab('keybinds')} onSource={() => { setConfigWindowPosition(null); setConfigDrawerOpen(true) }} onGyro={() => setPrimaryTab('gyro')} />
    }
    if (primaryTab === 'overview') {
      return <StudioOverview sample={sample} profile={currentLibraryProfile} sensitivity={sensitivity}
        sampleHz={telemetryValues.sampleHz} mappingEnabled={mappingEnabled} onNavigate={setPrimaryTab} />
    }
    if (primaryTab === 'communityProfiles') {
      return <Suspense fallback={<LazyPanelFallback title={t('studio.communityProfiles')} />}>
        <CommunityProfilesPage disabled={isCalibrating} onLibrary={() => setPrimaryTab('profiles')}
          onImport={async (name, text) => {
            const result = await desktopBridge.createSavedProfile(name, text)
            if (!result?.name || !result.path) throw new Error(t('studio.saveFailed'))
            await refreshLibraryProfiles()
            return result.name
          }} />
      </Suspense>
    }
    if (primaryTab === 'profiles') {
      return <div className="studio-profiles-page">
        <div className="studio-profile-tools">
          <button type="button" className="secondary-btn" onClick={() => setPrimaryTab('communityProfiles')}>{t('studio.communityProfiles')}</button>
          <button type="button" className="secondary-btn" onClick={() => setAutoloadModalOpen(true)}>{t('studio.autoload')}</button>
          <button type="button" className="secondary-btn" onClick={handleOpenConfigDirectory}>{t('studio.folder')}</button>
        </div>
        <Suspense fallback={<LazyPanelFallback title={t('studio.profiles')} />}>
              <ProfileManager
                currentProfileName={currentLibraryProfile}
                hasPendingChanges={hasUnsavedChanges}
                isCalibrating={isCalibrating}
                profileApplied={configText === appliedConfig}
                onImportProfile={handleImportProfile}
                libraryProfiles={libraryProfiles}
                libraryLoading={isLibraryLoading}
                editedProfileNames={editedLibraryNames}
                onProfileNameChange={handleLibraryProfileNameChange}
                onRenameProfile={handleRenameProfile}
                onDeleteProfile={handleDeleteLibraryProfile}
                onAddProfile={handleCreateProfile}
                onLoadLibraryProfile={handleLoadProfileFromLibrary}
                onCopyActiveProfile={handleCopyActiveProfile}
              />
        </Suspense>
      </div>
    }
    if (primaryTab === 'gyro') {
      return (
        <div className={motionStyles.page}>
          {renderGyroNav()}
          {gyroSubTab === 'behavior' && (
            <Suspense fallback={<LazyPanelFallback title={t('app.tabs.gyroBehavior')} />}>
              <GyroBehaviorControls
                sensitivity={sensitivity}
                gyroActivationMode={gyroActivation.mode}
                gyroActivationButton={gyroActivation.button}
                touchpadMode={touchpadModeValue}
                touchpadGridCells={
                  touchpadModeValue === 'GRID_AND_STICK' ? Math.min(25, gridSizeValue.columns * gridSizeValue.rows) : 0
                }
                isCalibrating={isCalibrating}
                statusMessage={statusMessage}
                devices={sample?.devices}
                ignoredDevices={ignoredGyroDevices}
                onToggleIgnoreDevice={handleToggleIgnoreGyroDevice}
                onInGameSensChange={handleInGameSensChange}
                onRealWorldCalibrationChange={handleRealWorldCalibrationChange}
                onTickTimeChange={handleTickTimeChange}
                onGyroSpaceChange={handleGyroSpaceChange}
                onGyroAxisXChange={handleGyroAxisXChange}
                onGyroAxisYChange={handleGyroAxisYChange}
                onGyroActivationModeChange={handleGyroActivationModeChange}
                onGyroActivationButtonChange={handleGyroActivationButtonChange}
                counterOsMouseSpeed={counterOsMouseSpeedEnabled}
                onCounterOsMouseSpeedChange={handleCounterOsMouseSpeedChange}
                onOpenCalibration={handleOpenCalibration}
                onOpenRwcGuide={() => setIsRwcGuideModalOpen(true)}
                hasPendingChanges={hasPendingChanges}
                onApply={handleApplyWithFinalize}
                onCancel={handleCancel}
                lockMessage={lockMessage}
                appliedSampleHz={telemetryValues.sampleHz}
              />
            </Suspense>
          )}
          {gyroSubTab === 'sensitivity' && (
            <Suspense fallback={<LazyPanelFallback title={t('app.tabs.sensitivity')} />}>
              <SensitivityControls
                sensitivity={sensitivity}
                modeshiftSensitivity={modeshiftSensitivity}
                isCalibrating={isCalibrating}
                statusMessage={statusMessage}
                accelCurve={sensitivity.accelCurve}
                naturalVHalf={sensitivity.naturalVHalf}
                powerVRef={sensitivity.powerVRef}
                powerExponent={sensitivity.powerExponent}
                sigmoidMid={sensitivity.sigmoidMid}
                sigmoidWidth={sensitivity.sigmoidWidth}
                jumpTau={sensitivity.jumpTau}
                mode={currentMode}
                sensitivityView={sensitivityView}
                hasPendingChanges={hasPendingChanges}
                sample={sample}
                telemetry={telemetryValues}
                touchpadMode={touchpadModeValue}
                touchpadGridCells={
                  touchpadModeValue === 'GRID_AND_STICK' ? Math.min(25, gridSizeValue.columns * gridSizeValue.rows) : 0
                }
                onModeChange={(mode) => handleModeSelection(mode, activeSensitivityPrefix)}
                onSensitivityViewChange={setSensitivityView}
                onApply={handleApplyWithFinalize}
                onCancel={handleCancel}
                onAccelCurveChange={handleAccelCurveChange}
                onNaturalVHalfChange={handleNaturalVHalfChange}
                onPowerVRefChange={handlePowerVRefChange}
                onPowerExponentChange={handlePowerExponentChange}
                onSigmoidMidChange={handleSigmoidMidChange}
                onSigmoidWidthChange={handleSigmoidWidthChange}
                onJumpTauChange={handleJumpTauChange}
                onMinThresholdChange={handleThresholdChange('MIN_GYRO_THRESHOLD')}
                onMaxThresholdChange={handleThresholdChange('MAX_GYRO_THRESHOLD')}
                onMinSensXChange={handleDualSensChange('MIN_GYRO_SENS', 0)}
                onMinSensYChange={handleDualSensChange('MIN_GYRO_SENS', 1)}
                onMaxSensXChange={handleDualSensChange('MAX_GYRO_SENS', 0)}
                onMaxSensYChange={handleDualSensChange('MAX_GYRO_SENS', 1)}
                onStaticSensXChange={handleStaticSensChange(0)}
                onStaticSensYChange={handleStaticSensChange(1)}
                onRollContributionChange={handleRollContributionChange}
                modeshiftButton={sensitivityModeshiftButton}
                onModeshiftButtonChange={handleSensitivityModeshiftButtonChange}
                lockMessage={lockMessage}
              />
            </Suspense>
          )}
          {gyroSubTab === 'noise' && (
            <Suspense fallback={<LazyPanelFallback title={t('app.tabs.noiseAndSteadying')} />}>
              <NoiseSteadyingControls
                sensitivity={sensitivity}
                isCalibrating={isCalibrating}
                statusMessage={statusMessage}
                hasPendingChanges={hasPendingChanges}
                onApply={handleApplyWithFinalize}
                onCancel={handleCancel}
                lockMessage={lockMessage}
                onCutoffSpeedChange={handleCutoffSpeedChange}
                onCutoffRecoveryChange={handleCutoffRecoveryChange}
                onSmoothTimeChange={handleSmoothTimeChange}
                onSmoothThresholdChange={handleSmoothThresholdChange}
                onSmoothingDecayChange={handleSmoothingDecayChange}
                onOneEuroFilterChange={handleOneEuroFilterChange}
                onOneEuroMinCutoffChange={handleOneEuroMinCutoffChange}
                onOneEuroSpeedCoeffChange={handleOneEuroSpeedCoeffChange}
                onAngleSnapChange={handleAngleSnapChange}
                onAngleSnapSmoothChange={handleAngleSnapSmoothChange}
                onDecelBrakeStrengthChange={handleDecelBrakeStrengthChange}
                onDecelBrakeThresholdChange={handleDecelBrakeThresholdChange}
                telemetry={{
                  omega: telemetryValues.omega,
                  timestamp: telemetryValues.timestamp,
                  sampleHz: telemetryValues.sampleHz,
                }}
              />
            </Suspense>
          )}
        </div>
      )
    }

    if (primaryTab === 'keybinds') {
      return (
        <Suspense fallback={<LazyPanelFallback title={t('app.nav.keybinds')} />}>
          <KeymapControls
            configText={configText}
            hasPendingChanges={hasPendingChanges}
            isCalibrating={isCalibrating}
            statusMessage={statusMessage}
            onApply={handleApplyWithFinalize}
            onCancel={handleCancel}
            onBindingChange={handleFaceButtonBindingChange}
            onAssignSpecialAction={handleSpecialActionAssignment}
            onClearSpecialAction={handleClearSpecialAction}
            trackballDecay={trackballDecayValue}
            onTrackballDecayChange={handleTrackballDecayChange}
            holdPressTimeSeconds={holdPressTimeSeconds}
            holdPressTimeIsCustom={holdPressTimeIsCustom}
            holdPressTimeDefault={DEFAULT_HOLD_PRESS_TIME}
            onHoldPressTimeChange={handleHoldPressTimeChange}
            doublePressWindowSeconds={doublePressWindowSeconds}
            doublePressWindowIsCustom={doublePressWindowIsCustom}
            onDoublePressWindowChange={handleDoublePressWindowChange}
            simPressWindowSeconds={simPressWindowSeconds}
            simPressWindowIsCustom={simPressWindowIsCustom}
            onSimPressWindowChange={handleSimPressWindowChange}
            lightBarColor={lightBarColor}
            onLightBarChange={handleLightBarChange}
            triggerThreshold={triggerThresholdValue}
            onTriggerThresholdChange={handleTriggerThresholdChange}
            onModifierChange={handleModifierChange}
            touchpadMode={touchpadModeValue}
            touchpadDualStageMode={touchpadDualStageModeValue}
            gridColumns={gridSizeValue.columns}
            gridRows={gridSizeValue.rows}
            touchDeadzoneInner={touchDeadzoneInnerValue}
            touchRingMode={touchRingModeValue}
            touchStickMode={touchStickModeValue}
            touchStickRadius={touchStickRadiusValue}
            touchStickAxis={touchStickAxisValue}
            touchpadWarnings={touchpadWarnings}
            stickDeadzoneSettings={{
              defaults: stickDeadzoneDefaults,
              left: leftStickDeadzone,
              right: rightStickDeadzone,
            }}
            stickModeSettings={stickModes}
            onStickDeadzoneChange={handleStickDeadzoneChange}
            onStickModeChange={handleStickModeChange}
            onRingModeChange={handleRingModeChange}
            stickModeShiftAssignments={stickModeShiftAssignments}
            onStickModeShiftChange={handleStickModeShiftChange}
            adaptiveTriggerValue={adaptiveTriggerValue}
            onAdaptiveTriggerChange={handleAdaptiveTriggerChange}
            zlModeValue={zlModeValue}
            zrModeValue={zrModeValue}
            onZlModeChange={handleZlModeChange}
            onZrModeChange={handleZrModeChange}
            stickAimSettings={stickAimSettings}
            stickAimHandlers={stickAimHandlers}
            stickFlickSettings={stickFlickSettings}
            stickFlickHandlers={stickFlickHandlers}
            mouseRingRadius={mouseRingRadiusValue}
            onMouseRingRadiusChange={handleMouseRingRadiusChange}
            scrollSens={scrollSensValue}
            onScrollSensChange={handleScrollSensChange}
            lockMessage={lockMessage}
            devices={sample?.devices}
            selectedMappingCommand={selectedMappingCommand}
            onSelectedMappingCommandChange={setSelectedMappingCommand}
            virtualControllerType={virtualControllerType}
            virtualControllerWarnings={virtualControllerWarnings}
            onVirtualControllerTypeChange={handleVirtualControllerTypeChange}
          />
        </Suspense>
      )
    }

    if (primaryTab === 'touchpad') {
      const sections = ['touch-grid', 'touch-stick', 'touch-bind']
      return (
        <Suspense fallback={<LazyPanelFallback title={t('app.nav.touchpad')} />}>
          <KeymapControls
            view="touchpad"
            configText={configText}
            hasPendingChanges={hasPendingChanges}
            isCalibrating={isCalibrating}
            statusMessage={statusMessage}
            onApply={handleApplyWithFinalize}
            onCancel={handleCancel}
            onBindingChange={handleFaceButtonBindingChange}
            onAssignSpecialAction={handleSpecialActionAssignment}
            onClearSpecialAction={handleClearSpecialAction}
            trackballDecay={trackballDecayValue}
            onTrackballDecayChange={handleTrackballDecayChange}
            holdPressTimeSeconds={holdPressTimeSeconds}
            holdPressTimeIsCustom={holdPressTimeIsCustom}
            holdPressTimeDefault={DEFAULT_HOLD_PRESS_TIME}
            onHoldPressTimeChange={handleHoldPressTimeChange}
            doublePressWindowSeconds={doublePressWindowSeconds}
            doublePressWindowIsCustom={doublePressWindowIsCustom}
            onDoublePressWindowChange={handleDoublePressWindowChange}
            simPressWindowSeconds={simPressWindowSeconds}
            simPressWindowIsCustom={simPressWindowIsCustom}
            onSimPressWindowChange={handleSimPressWindowChange}
            lightBarColor={lightBarColor}
            onLightBarChange={handleLightBarChange}
            triggerThreshold={triggerThresholdValue}
            onTriggerThresholdChange={handleTriggerThresholdChange}
            onModifierChange={handleModifierChange}
            touchpadMode={touchpadModeValue}
            touchpadDualStageMode={touchpadDualStageModeValue}
            onTouchpadModeChange={handleTouchpadModeChange}
            onTouchpadDualStageModeChange={handleTouchpadDualStageModeChange}
            gridColumns={gridSizeValue.columns}
            gridRows={gridSizeValue.rows}
            onGridSizeChange={handleGridSizeChange}
            touchpadSensitivity={touchpadSensitivityValue}
            onTouchpadSensitivityChange={handleTouchpadSensitivityChange}
            touchDeadzoneInner={touchDeadzoneInnerValue}
            touchRingMode={touchRingModeValue}
            touchStickMode={touchStickModeValue}
            touchStickRadius={touchStickRadiusValue}
            touchStickAxis={touchStickAxisValue}
            onTouchDeadzoneInnerChange={handleTouchDeadzoneInnerChange}
            onTouchRingModeChange={handleTouchRingModeChange}
            onTouchStickModeChange={handleTouchStickModeChange}
            onTouchStickRadiusChange={handleTouchStickRadiusChange}
            onTouchStickAxisChange={handleTouchStickAxisChange}
            touchpadWarnings={touchpadWarnings}
            stickDeadzoneSettings={{
              defaults: stickDeadzoneDefaults,
              left: leftStickDeadzone,
              right: rightStickDeadzone,
            }}
            stickModeSettings={stickModes}
            onStickDeadzoneChange={handleStickDeadzoneChange}
            onStickModeChange={handleStickModeChange}
            onRingModeChange={handleRingModeChange}
            stickModeShiftAssignments={stickModeShiftAssignments}
            onStickModeShiftChange={handleStickModeShiftChange}
            adaptiveTriggerValue={adaptiveTriggerValue}
            onAdaptiveTriggerChange={handleAdaptiveTriggerChange}
            zlModeValue={zlModeValue}
            zrModeValue={zrModeValue}
            onZlModeChange={handleZlModeChange}
            onZrModeChange={handleZrModeChange}
            stickAimSettings={stickAimSettings}
            stickAimHandlers={stickAimHandlers}
            lockMessage={lockMessage}
            visibleSections={sections}
          />
        </Suspense>
      )
    }

    if (primaryTab === 'controllerStatus') {
      return (
        <ControllerStatusPage onSettings={() => setPrimaryTab('settings')}
          devices={sample?.devices}
          ignoredDevices={ignoredGyroDevices}
        />
      )
    }


    return null
  }

  return (
    <>
      <ToastHost />
      <Suspense fallback={null}>
        <UpdateBanner onSettings={() => setPrimaryTab('settings')} />
      </Suspense>
      <StudioShell page={primaryTab} onNavigate={page => { if (!gameCreating) setPrimaryTab(page) }}
        interactionLocked={gameCreating}
        hasUnsavedChanges={hasUnsavedChanges} onSave={handleSaveWithFinalize}
        profile={currentLibraryProfile} profiles={libraryProfiles ?? []} onSelectProfile={handleLoadProfileFromLibrary}
        mappingEnabled={mappingEnabled} runtimeBusy={runtimeMappingBusy || recalibrating || gameCreating}
        isCalibrating={isCalibrating} countdown={countdown} deviceCount={sample?.devices?.length ?? 0}
        sampleHz={telemetryValues.sampleHz} hasPendingChanges={hasPendingChanges} statusMessage={statusMessage}
        onToggleOutput={() => { void handleToggleMappingEnabled() }} onCalibrate={handleRecalibrate}
        onOpenSource={() => { setConfigWindowPosition(null); setConfigDrawerOpen(true) }}
        onOpenFolder={handleOpenConfigDirectory} onAutoload={() => setAutoloadModalOpen(true)}
        onCommunity={() => { void desktopBridge.openExternal(QQ_GROUP_URL) }}
        onApply={handleApplyWithFinalize} onCancel={handleCancel}>
        {renderPrimaryContent()}
      </StudioShell>
      {isConfigDrawerOpen && (
        <div
          ref={configWindowRef}
          className={`config-source-window ${configWindowDragging ? 'dragging' : ''}`}
          style={configWindowPosition
            ? { left: `${configWindowPosition.x}px`, top: `${configWindowPosition.y}px`, transform: 'none' }
            : undefined}
          onMouseDown={event => event.stopPropagation()}
        >
          <div className="modal-header config-source-window-header">
            <div
              className="config-source-window-dragHandle"
              onPointerDown={handleConfigWindowDragStart}
              onPointerMove={handleConfigWindowDragMove}
              onPointerUp={handleConfigWindowDragEnd}
              onPointerCancel={handleConfigWindowDragEnd}
            >
              <span className="config-source-window-grip" aria-hidden="true" />
              <div>
                <h3>{t('app.profileSummary.sourceConfigTitle')}</h3>
                <p className="modal-description">{t('app.profileSummary.sourceConfigDescription')}</p>
              </div>
            </div>
            <button type="button" className="ghost-btn" onClick={() => setConfigDrawerOpen(false)}>
              {t('common.close')}
            </button>
          </div>
          <div className="config-source-window-body">
            <Suspense fallback={<LazyPanelFallback title={profileFileLabel} compact />}>
              <ConfigEditor
                value={configText}
                label={profileFileLabel}
                disabled={isCalibrating}
                hasPendingChanges={hasPendingChanges}
                statusMessage={null}
                onChange={setConfigText}
                onApply={handleApplyWithFinalize}
                onCancel={handleCancel}
              />
            </Suspense>
          </div>
        </div>
      )}
      {isCalibrationModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{t('app.calibrationModal.title')}</h3>
              {calibrationLoadMessage && <span className="profile-status inline-flag">{calibrationLoadMessage}</span>}
            </div>
            <p className="modal-description">
              {t('app.calibrationModal.description')}
            </p>
            <div className="flex-inputs">
              <label>
                {t('app.calibrationModal.inGameSensitivity')}
                <input
                  type="number"
                  step="0.1"
                  value={calibrationInGameSens}
                  onChange={(event) => {
                    setCalibrationInGameSens(event.target.value)
                    setCalibrationDirty(true)
                  }}
                />
              </label>
            </div>
            <div className="flex-inputs">
              <label>
                {t('app.calibrationModal.counterOsMouseSpeed')}
                <p className="field-description">{t('app.calibrationModal.counterOsMouseSpeedHint')}</p>
                <select
                  className="app-select"
                  value={calibrationCounterOs ? 'ON' : 'OFF'}
                  onChange={(event) => {
                    setCalibrationCounterOs(event.target.value === 'ON')
                    setCalibrationDirty(true)
                  }}
                >
                  <option value="OFF">{t('common.offDefault')}</option>
                  <option value="ON">{t('common.on')}</option>
                </select>
              </label>
            </div>
            <div className="flex-inputs">
              <label>
                {t('app.calibrationModal.numberOfTurns')}
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={calibrationTurns}
                  onChange={(e) => setCalibrationTurns(e.target.value)}
                />
              </label>
            </div>
            <SectionActions
              hasPendingChanges={calibrationDirty}
              statusMessage={statusMessage}
              onApply={() => {
                handleApplyCalibrationPreset()
              }}
              onCancel={resetCalibrationInputs}
              applyDisabled={isCalibrating}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => handleRunCalibration(parseFloat(calibrationTurns) || 1)}
                disabled={isCalibrating}
              >
                {t('app.calibrationModal.runCalculation')}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  handleCloseCalibration()
                  showToast(t('messages.activeProfileToast', { profileName: profileLabel }))
                }}
              >
                {t('common.close')}
              </button>
            </div>
            {calibrationOutput && (
              <>
                <div className={miscStyles.calibrationOutputLabel}>{t('app.calibrationModal.calculationResult')}</div>
                <div className={miscStyles.calibrationOutput} data-capture-ignore="true">
                  <pre>{calibrationOutput}</pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {isRwcGuideModalOpen && (
        <Suspense fallback={null}>
          <RwcGuideModal
            isOpen={isRwcGuideModalOpen}
            inGameSens={String(sensitivity.inGameSens ?? '')}
            onClose={() => setIsRwcGuideModalOpen(false)}
            onApplyRwc={(rwc) => {
              const baseText = finalizePendingValues ? finalizePendingValues() : configText
              const rwcNum = parseFloat(rwc)
              const textWithRwc = updateKeymapEntry(baseText, 'REAL_WORLD_CALIBRATION', [rwcNum])
              applyConfig({ textOverride: textWithRwc })
            }}
          />
        </Suspense>
      )}
      {isAutoloadModalOpen && (
        <Suspense fallback={<LazyPanelFallback title={t('autoload.title')} compact />}>
          <AutoloadManager
            onRefreshProfiles={refreshLibraryProfiles}
            libraryProfiles={libraryProfiles}
            autoloadEnabled={autoloadEnabled}
            runtimeBusy={runtimeMappingBusy}
            onAutoloadEnabledChange={handleAutoloadEnabledChange}
            onClose={() => setAutoloadModalOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}

export default App
