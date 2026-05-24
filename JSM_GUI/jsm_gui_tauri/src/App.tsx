import './App.css'
import { version as APP_VERSION } from '../package.json'
import sideNavStyles from './components/SideNav.module.css'
import { ThemeToggle } from './components/ThemeToggle'
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
import { LanguageSelect } from './components/LanguageSelect'


type PrimaryTab = 'gyro' | 'keybinds' | 'touchpad' | 'controllerStatus' | 'debugConsole' | 'ai' | 'help'
type GyroSubTab = 'behavior' | 'sensitivity' | 'noise'
const QQ_GROUP_URL = 'https://qm.qq.com/q/OyPvwoBSkU'
const QQ_GROUP_NUMBER = '855488128'

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

const ProfileManager = lazy(async () => {
  const module = await import('./components/ProfileManager')
  return { default: module.ProfileManager }
})

const AutoloadManager = lazy(async () => {
  const module = await import('./components/AutoloadManager')
  return { default: module.AutoloadManager }
})

const HelpDocsPage = lazy(async () => {
  const module = await import('./components/HelpDocsPage')
  return { default: module.HelpDocsPage }
})

const MappingDebugPage = lazy(async () => {
  const module = await import('./components/MappingDebugPage')
  return { default: module.MappingDebugPage }
})

const AiMappingPage = lazy(async () => {
  const module = await import('./components/AiMappingPage')
  return { default: module.AiMappingPage }
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

type PrimaryNavProps = {
  primaryTab: PrimaryTab
  setPrimaryTab: (tab: PrimaryTab) => void
  includeHelp?: boolean
}

const PrimaryNav = ({ primaryTab, setPrimaryTab, includeHelp = false }: PrimaryNavProps) => {
  const { t } = useTranslation()

  return (
    <div className={sideNavStyles.navGroup}>
      <div className={sideNavStyles.navSection}>
        <div className={sideNavStyles.navSectionLabel}>{t('app.nav.dashboardGroup')}</div>
        <button
          className={`${sideNavStyles.navItem} ${primaryTab === 'controllerStatus' ? sideNavStyles.active : ''}`}
          onClick={() => setPrimaryTab('controllerStatus')}
        >
          {t('app.nav.controllerStatus')}
        </button>
        <button
          className={`${sideNavStyles.navItem} ${primaryTab === 'debugConsole' ? sideNavStyles.active : ''}`}
          onClick={() => setPrimaryTab('debugConsole')}
        >
          {t('app.nav.debugConsole')}
        </button>
      </div>
      <div className={sideNavStyles.navSection}>
        <div className={sideNavStyles.navSectionLabel}>{t('app.nav.mappingGroup')}</div>
        <button
          className={`${sideNavStyles.navItem} ${primaryTab === 'keybinds' ? sideNavStyles.active : ''}`}
          onClick={() => setPrimaryTab('keybinds')}
        >
          {t('app.nav.keybinds')}
        </button>
        <button
          className={`${sideNavStyles.navItem} ${primaryTab === 'touchpad' ? sideNavStyles.active : ''}`}
          onClick={() => setPrimaryTab('touchpad')}
        >
          {t('app.nav.touchpad')}
        </button>
        <button
          className={`${sideNavStyles.navItem} ${primaryTab === 'ai' ? sideNavStyles.active : ''}`}
          onClick={() => setPrimaryTab('ai')}
        >
          {t('app.nav.aiAssistant')}
        </button>
      </div>
      <div className={sideNavStyles.navSection}>
        <div className={sideNavStyles.navSectionLabel}>{t('app.nav.tuningGroup')}</div>
        <button
          className={`${sideNavStyles.navItem} ${primaryTab === 'gyro' ? sideNavStyles.active : ''}`}
          onClick={() => setPrimaryTab('gyro')}
        >
          {t('app.nav.gyroAndSensitivity')}
        </button>
      </div>
      {includeHelp && (
        <button
          className={`${sideNavStyles.navItem} ${primaryTab === 'help' ? sideNavStyles.active : ''}`}
          onClick={() => setPrimaryTab('help')}
        >
          {t('app.nav.documentation')}
        </button>
      )}
    </div>
  )
}

const CommunityNavButton = () => {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className={sideNavStyles.navFooterAction}
      onClick={() => {
        void desktopBridge.openExternal(QQ_GROUP_URL)
      }}
    >
      <span className={sideNavStyles.navFooterLinkTitle}>{t('common.joinQqGroup')}</span>
      <span className={sideNavStyles.navFooterLinkMeta}>{t('common.qqGroupNumber', { number: QQ_GROUP_NUMBER })}</span>
    </button>
  )
}

type NavSettingsProps = {
  compactThemeToggle?: boolean
}

const NavSettings = ({ compactThemeToggle = false }: NavSettingsProps) => (
  <div className={sideNavStyles.navSettings}>
    <LanguageSelect className={sideNavStyles.navLanguageSelect} />
    <ThemeToggle compact={compactThemeToggle} className={sideNavStyles.navThemeToggle} />
  </div>
)

function App() {
  const { t } = useTranslation()
  const { sample, isCalibrating, countdown } = useTelemetry()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [recalibrating, setRecalibrating] = useState(false)
  const [isProfileModalOpen, setProfileModalOpen] = useState(false)
  const [isAutoloadModalOpen, setAutoloadModalOpen] = useState(false)
  const [isRwcGuideModalOpen, setIsRwcGuideModalOpen] = useState(false)
  const [isConfigDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [configWindowPosition, setConfigWindowPosition] = useState<FloatingWindowPosition | null>(null)
  const [configWindowDragging, setConfigWindowDragging] = useState(false)
  const [mappingEnabled, setMappingEnabled] = useState(true)
  const [autoloadEnabled, setAutoloadEnabled] = useState(true)
  const [runtimeMappingBusy, setRuntimeMappingBusy] = useState(false)
  const [calibrationTurns, setCalibrationTurns] = useState('1')
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('controllerStatus')
  const [gyroSubTab, setGyroSubTab] = useState<GyroSubTab>('behavior')
  const [selectedMappingCommand, setSelectedMappingCommand] = useState<string | null>('N')
  const [showHidHideElevationModal, setShowHidHideElevationModal] = useState(false)
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
    hasPendingChanges,
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
    handleCancel,
    handleFaceButtonBindingChange,
    handleModifierChange,
    handleSpecialActionAssignment,
    handleClearSpecialAction,
    trackballDecayValue,
    handleTrackballDecayChange,
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
    handleRenameProfile,
    handleDeleteLibraryProfile,
    handleImportProfile,
    handleCopyActiveProfile,
  } = useProfileLibrary({
    configText,
    setConfigText,
    setAppliedConfig,
    setStatusMessage,
    resetPendingSensitivityChanges: resetPendingSensitivityChanges,
  })
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
      const target = event.target as HTMLElement
      const isTextInput = (el: HTMLInputElement) => {
        const excluded = ['checkbox', 'radio', 'range', 'file', 'color', 'button', 'submit', 'reset']
        return !excluded.includes(el.type)
      }
      if (target instanceof HTMLInputElement) {
        if (target.disabled || target.readOnly || !isTextInput(target)) return
        requestAnimationFrame(() => target.select())
      } else if (target instanceof HTMLTextAreaElement) {
        if (target.disabled || target.readOnly) return
        const skipAutoSelect = target.closest('.config-panel')
        if (skipAutoSelect) return
        requestAnimationFrame(() => target.select())
      }
    }
    window.addEventListener('focusin', handleFocusIn)
    return () => window.removeEventListener('focusin', handleFocusIn)
  }, [])

  useEffect(() => {
    const applyRangeTabIndex = (root: ParentNode | undefined | null) => {
      if (!root) return
      root.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(el => {
        if (el.tabIndex !== -1) {
          el.tabIndex = -1
        }
      })
    }
    applyRangeTabIndex(document.body)
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement || node instanceof DocumentFragment) {
            applyRangeTabIndex(node)
          }
        })
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
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
      applyConfig({ textOverride: nextText })
    } else {
      applyConfig()
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

  useEffect(() => {
    let disposed = false
    void desktopBridge.getHidHideStatus().then(status => {
      if (disposed) return
      if (status.requiresElevation) {
        setShowHidHideElevationModal(true)
      }
    }).catch(error => {
      console.error('Failed to probe HidHide status', error)
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
        await applyConfig()
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
    <div className="subnav">
      <button className={`pill-tab ${gyroSubTab === 'behavior' ? 'active' : ''}`} onClick={() => setGyroSubTab('behavior')}>
        {t('app.tabs.gyroBehavior')}
      </button>
      <button className={`pill-tab ${gyroSubTab === 'sensitivity' ? 'active' : ''}`} onClick={() => setGyroSubTab('sensitivity')}>
        {t('app.tabs.sensitivity')}
      </button>
      <button className={`pill-tab ${gyroSubTab === 'noise' ? 'active' : ''}`} onClick={() => setGyroSubTab('noise')}>
        {t('app.tabs.noiseAndSteadying')}
      </button>
    </div>
  )

  const renderUtilityBar = () => (
    <div className="utility-bar">
      <div className={`utility-mapping-switch ${mappingEnabled ? 'is-enabled' : 'is-paused'}`}>
        <label className={`mapping-toggle-control ${mappingEnabled ? 'is-enabled' : 'is-paused'}`}>
          <input
            type="checkbox"
            checked={mappingEnabled}
            disabled={runtimeMappingBusy}
            aria-label={t('app.profileSummary.mappingOutput')}
            onChange={() => {
              void handleToggleMappingEnabled()
            }}
          />
          <span className="mapping-toggle-slider" aria-hidden="true" />
          <span className="mapping-toggle-state">
            {mappingEnabled ? t('app.profileSummary.mappingOutputOn') : t('app.profileSummary.mappingOutputPaused')}
          </span>
        </label>
      </div>

      <div className="utility-profile-group">
        <div className="utility-title">{t('app.profileSummary.title')}</div>
        <label className="utility-profile-select">
          <select
            className="app-select"
            disabled={isCalibrating}
            value={currentLibraryProfile ?? ''}
            onChange={event => {
              const name = event.target.value
              if (!name) return
              handleLoadProfileFromLibrary(name)
            }}
          >
            <option value="" disabled>
              {t('app.profileSummary.selectProfile')}
            </option>
            {(libraryProfiles ?? []).map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="utility-actions">
        <button className="secondary-btn" onClick={() => setAutoloadModalOpen(true)}>
          {t('app.profileSummary.autoloadManager')}
        </button>
        <button className="secondary-btn" onClick={() => setProfileModalOpen(true)}>
          {t('app.profileSummary.manageProfiles')}
        </button>
        <button className="secondary-btn" onClick={handleOpenConfigDirectory}>
          {t('app.profileSummary.openConfigDirectory')}
        </button>
        <button
          className="secondary-btn"
          onClick={() => {
            setConfigWindowPosition(null)
            setConfigDrawerOpen(true)
          }}
        >
          {t('app.profileSummary.openSourceConfig')}
        </button>
        {isCalibrating ? (
          <span className="calibration-pill calibration-pill-inline utility-calibration-pill">
            {t('app.recalibration.calibratingCountdown', { seconds: countdown ?? '-' })}
          </span>
        ) : (
          <button className="primary-btn" onClick={handleRecalibrate} disabled={recalibrating}>
            {recalibrating ? t('app.recalibration.recalibrating') : t('app.recalibration.recalibrateGyro')}
          </button>
        )}
      </div>
    </div>
  )

  const renderPrimaryContent = () => {
    if (primaryTab === 'gyro') {
      return (
        <div className="page-with-subnav">
          <div className="page-subnav">{renderGyroNav()}</div>
          {gyroSubTab === 'behavior' && (
            <Suspense fallback={<LazyPanelFallback title={t('app.tabs.gyroBehavior')} />}>
              <GyroBehaviorControls
                sensitivity={sensitivity}
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
            gridColumns={gridSizeValue.columns}
            gridRows={gridSizeValue.rows}
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
          />
        </Suspense>
      )
    }

    if (primaryTab === 'touchpad') {
      const sections = ['touch-grid', 'touch-bind']
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
            onTouchpadModeChange={handleTouchpadModeChange}
            gridColumns={gridSizeValue.columns}
            gridRows={gridSizeValue.rows}
            onGridSizeChange={handleGridSizeChange}
            touchpadSensitivity={touchpadSensitivityValue}
            onTouchpadSensitivityChange={handleTouchpadSensitivityChange}
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
        <ControllerStatusPage
          devices={sample?.devices}
          ignoredDevices={ignoredGyroDevices}
        />
      )
    }

    if (primaryTab === 'debugConsole') {
      return (
        <Suspense fallback={<LazyPanelFallback title={t('app.nav.debugConsole')} />}>
          <MappingDebugPage
            configText={configText}
            appliedConfig={appliedConfig}
            hasPendingChanges={hasPendingChanges}
          />
        </Suspense>
      )
    }

    if (primaryTab === 'ai') {
      return (
        <Suspense fallback={<LazyPanelFallback title={t('app.nav.aiAssistant')} />}>
          <AiMappingPage
            configText={configText}
            currentProfileName={currentLibraryProfile}
            hasPendingChanges={hasPendingChanges}
            onReplaceConfig={setConfigText}
            onApplyGeneratedConfig={async (nextConfig) => {
              await applyConfig({ textOverride: nextConfig })
            }}
          />
        </Suspense>
      )
    }

    if (primaryTab === 'help') {
      return (
        <Suspense fallback={<LazyPanelFallback title={t('app.nav.documentation')} />}>
          <HelpDocsPage />
        </Suspense>
      )
    }

    return null
  }

  return (
    <div className="app-shell">
      <ToastHost />
      <Suspense fallback={null}>
        <UpdateBanner />
      </Suspense>
      {/* Desktop sidebar */}
      <aside className={sideNavStyles.sideNav}>
        <div className={sideNavStyles.navBrand}>{t('common.appName')}</div>
        <PrimaryNav primaryTab={primaryTab} setPrimaryTab={setPrimaryTab} includeHelp />
        <div className={sideNavStyles.navFooter}>
          <CommunityNavButton />
          <NavSettings />
          <div className={sideNavStyles.navVersion}>v{APP_VERSION}</div>
        </div>
      </aside>
      {/* Narrow-width sticky header */}
      <div className="responsive-header">
        <div className={sideNavStyles.navHeaderRow}>
          <div>
            <div className={sideNavStyles.navBrand}>{t('common.appName')}</div>
            <PrimaryNav primaryTab={primaryTab} setPrimaryTab={setPrimaryTab} includeHelp />
          </div>
          <NavSettings compactThemeToggle />
        </div>
      </div>
      <div className="shell-main">
        {renderUtilityBar()}
        <div className="shell-scroll"><div className="content-grid">
          <main className="main-pane">{renderPrimaryContent()}</main>
        </div></div>
      </div>
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
      {showHidHideElevationModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{t('controllerStatus.hidHideElevationTitle')}</h3>
            </div>
            <p className="modal-description">{t('controllerStatus.hidHideElevationStartupBody')}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setPrimaryTab('controllerStatus')
                  setShowHidHideElevationModal(false)
                }}
              >
                {t('controllerStatus.hidHideOpenStatusPage')}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowHidHideElevationModal(false)}
              >
                {t('common.close')}
              </button>
            </div>
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
      {isProfileModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card profile-modal">
            <div className="modal-header">
              <h3>{t('app.profilesModal.title')}</h3>
              <button className="ghost-btn" onClick={() => setProfileModalOpen(false)}>
                {t('common.close')}
              </button>
            </div>
            <Suspense fallback={<LazyPanelFallback title={t('app.profilesModal.title')} compact />}>
              <ProfileManager
                currentProfileName={currentLibraryProfile}
                hasPendingChanges={hasPendingChanges}
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
        </div>
      )}
      {isAutoloadModalOpen && (
        <Suspense fallback={<LazyPanelFallback title={t('autoload.title')} compact />}>
          <AutoloadManager
            libraryProfiles={libraryProfiles}
            autoloadEnabled={autoloadEnabled}
            runtimeBusy={runtimeMappingBusy}
            onAutoloadEnabledChange={handleAutoloadEnabledChange}
            onClose={() => setAutoloadModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default App
