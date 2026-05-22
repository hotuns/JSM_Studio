import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_STICK_DEADZONE_INNER, DEFAULT_STICK_DEADZONE_OUTER } from '../constants/defaults'
import type { TelemetryDevice } from '../hooks/useTelemetry'
import {
  BindingSlot,
  BindingWriteMode,
  ButtonBindingRow,
  getButtonBindingRows,
  getKeymapValue,
} from '../utils/keymap'
import { buildModifierOptions, resolveModifierOptionLabel } from '../utils/modifierOptions'
import {
  BUMPER_BUTTONS,
  CENTER_BUTTONS,
  DPAD_BUTTONS,
  FACE_BUTTONS,
  LEFT_STICK_BUTTONS,
  MINI_BUTTONS,
  MISC_BUTTONS,
  PADDLE_BUTTONS,
  RIGHT_STICK_BUTTONS,
  STICK_AIM_DEFAULTS,
  TOUCH_BUTTONS,
  TRIGGER_BUTTONS,
  buildTouchpadGridButton,
  getSpecialOptionList,
  type ButtonDefinition,
} from '../keymap/schema'
import { useBindingCapture } from '../keymap/useBindingCapture'
import { useButtonRowState } from '../keymap/useButtonRowState'
import { ButtonBindingsCard } from './keymap/ButtonBindingsCard'
import { ButtonGridSection } from './keymap/ButtonGridSection'
import { Card } from './Card'
import keymapStyles from './Keymap.module.css'
import { GlobalControlsSection } from './keymap/GlobalControlsSection'
import { MappingRulesHelpModal } from './keymap/MappingRulesHelpModal'
import { StickModesSection } from './keymap/StickModesSection'
import stickStyles from './Sticks.module.css'
import { TouchpadGridSection } from './keymap/TouchpadGridSection'
import { TouchpadSettingsSection } from './keymap/TouchpadSettingsSection'
import { TriggerControlsSection } from './keymap/TriggerControlsSection'
import { SectionActions } from './SectionActions'
import { ControllerStatusSvg } from './ControllerStatusSvg'
import { controllerButtonLabel } from '../utils/controllerStatus'
import { showToast } from '../utils/toast'

type KeymapControlsProps = {
  configText: string
  hasPendingChanges: boolean
  isCalibrating: boolean
  statusMessage?: string | null
  onApply: () => void
  onCancel: () => void
  onBindingChange: (
    button: string,
    slot: BindingSlot,
    rowId: string,
    value: string | null,
    options?: { modifier?: string; writeMode?: BindingWriteMode }
  ) => void
  onAssignSpecialAction: (special: string, buttonCommand: string) => void
  onClearSpecialAction: (special: string, buttonCommand: string) => void
  trackballDecay: string
  onTrackballDecayChange: (value: string) => void
  holdPressTimeSeconds: number
  onHoldPressTimeChange: (value: string) => void
  holdPressTimeIsCustom: boolean
  holdPressTimeDefault: number
  onModifierChange: (
    button: string,
    slot: BindingSlot,
    rowId: string,
    previousModifier: string | undefined,
    nextModifier: string,
    binding: string | null
  ) => void
  doublePressWindowSeconds: number
  doublePressWindowIsCustom: boolean
  onDoublePressWindowChange: (value: string) => void
  simPressWindowSeconds: number
  simPressWindowIsCustom: boolean
  onSimPressWindowChange: (value: string) => void
  lightBarColor: string | null
  onLightBarChange: (color: string | null) => void
  triggerThreshold: number
  onTriggerThresholdChange: (value: string) => void
  view?: 'full' | 'touchpad' | 'sticks'
  lockMessage?: string
  visibleSections?: string[]
  stickForcedView?: 'bindings' | 'modes'
  showStickViewToggle?: boolean
  touchpadMode?: string
  onTouchpadModeChange?: (value: string) => void
  gridColumns?: number
  gridRows?: number
  onGridSizeChange?: (cols: number, rows: number) => void
  touchpadSensitivity?: number
  onTouchpadSensitivityChange?: (value: string) => void
  stickDeadzoneSettings?: {
    defaults: { inner: string; outer: string }
    left: { inner: string; outer: string }
    right: { inner: string; outer: string }
  }
  onStickDeadzoneChange?: (side: 'LEFT' | 'RIGHT', type: 'INNER' | 'OUTER', value: string) => void
  stickModeSettings?: {
    left: { mode: string; ring: string }
    right: { mode: string; ring: string }
  }
  onStickModeChange?: (side: 'LEFT' | 'RIGHT', mode: string) => void
  onRingModeChange?: (side: 'LEFT' | 'RIGHT', mode: string) => void
  stickAimSettings?: {
    displaySensX: string
    displaySensY: string
    power: string
    accelerationRate: string
    accelerationCap: string
  }
  stickAimHandlers?: {
    onSensXChange: (value: string) => void
    onSensYChange: (value: string) => void
    onPowerChange: (value: string) => void
    onAccelerationRateChange: (value: string) => void
    onAccelerationCapChange: (value: string) => void
  }
  stickFlickSettings?: {
    flickTime: string
    flickTimeExponent: string
    snapMode: string
    snapStrength: string
    deadzoneAngle: string
  }
  stickFlickHandlers?: {
    onFlickTimeChange: (value: string) => void
    onFlickTimeExponentChange: (value: string) => void
    onSnapModeChange: (value: string) => void
    onSnapStrengthChange: (value: string) => void
    onDeadzoneAngleChange: (value: string) => void
  }
  mouseRingRadius?: string
  onMouseRingRadiusChange?: (value: string) => void
  scrollSens?: string
  onScrollSensChange?: (value: string) => void
  stickModeShiftAssignments?: Record<string, { target: 'LEFT' | 'RIGHT'; mode: string }[]>
  onStickModeShiftChange?: (button: string, target: 'LEFT' | 'RIGHT', mode?: string) => void
  adaptiveTriggerValue?: string
  onAdaptiveTriggerChange?: (value: string) => void
  zlModeValue?: string
  zrModeValue?: string
  onZlModeChange?: (value: string) => void
  onZrModeChange?: (value: string) => void
  devices?: TelemetryDevice[]
  selectedMappingCommand?: string | null
  onSelectedMappingCommandChange?: (command: string | null) => void
}

type StickAimSettingsProps = {
  values: NonNullable<KeymapControlsProps['stickAimSettings']>
  handlers: NonNullable<KeymapControlsProps['stickAimHandlers']>
  disabled?: boolean
}

const StickAimSettings = ({ values, handlers, disabled }: StickAimSettingsProps) => {
  const { t } = useTranslation()
  const sensXValue = values.displaySensX
  const sensYValue = values.displaySensY
  const powerValue = values.power ?? ''
  const accelRateValue = values.accelerationRate ?? ''
  const accelCapValue = values.accelerationCap ?? ''
  const formatDefault = (value: string) => t('common.defaultValue', { value })

  return (
    <div className={stickStyles.stickAimSettings} data-capture-ignore="true">
      <small>{t('keymap.stickAimNote')}</small>
      <div className={stickStyles.stickAimGrid}>
        <label>
          {t('keymap.stickSensitivityHorizontal')}
          <input
            type="number"
            step="1"
            value={sensXValue}
            onChange={(event) => handlers.onSensXChange(event.target.value)}
            placeholder={formatDefault(STICK_AIM_DEFAULTS.sens)}
            disabled={disabled}
          />
        </label>
        <label>
          {t('keymap.stickSensitivityVertical')}
          <input
            type="number"
            step="1"
            value={sensYValue}
            onChange={(event) => handlers.onSensYChange(event.target.value)}
            placeholder={formatDefault(STICK_AIM_DEFAULTS.sens)}
            disabled={disabled}
          />
        </label>
        <label>
          {t('keymap.stickPower')}
          <input
            type="number"
            step="0.1"
            value={powerValue}
            onChange={(event) => handlers.onPowerChange(event.target.value)}
            placeholder={formatDefault(STICK_AIM_DEFAULTS.power)}
            disabled={disabled}
          />
        </label>
        <label>
          {t('keymap.accelerationRate')}
          <input
            type="number"
            step="0.1"
            value={accelRateValue}
            onChange={(event) => handlers.onAccelerationRateChange(event.target.value)}
            placeholder={formatDefault(STICK_AIM_DEFAULTS.accelerationRate)}
            disabled={disabled}
          />
        </label>
        <label>
          {t('keymap.accelerationCap')}
          <input
            type="number"
            step="0.1"
            value={accelCapValue}
            onChange={(event) => handlers.onAccelerationCapChange(event.target.value)}
            placeholder={formatDefault(STICK_AIM_DEFAULTS.accelerationCap)}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  )
}

type StickFlickSettingsProps = {
  values: NonNullable<KeymapControlsProps['stickFlickSettings']>
  handlers: NonNullable<KeymapControlsProps['stickFlickHandlers']>
  disabled?: boolean
}

const StickFlickSettings = ({ values, handlers, disabled }: StickFlickSettingsProps) => {
  const { t } = useTranslation()
  const snapMode = values.snapMode || ''
  const formatDefault = (value: string) => t('common.defaultValue', { value })

  return (
    <div className="stick-flick-settings" data-capture-ignore="true">
      <small>{t('keymap.stickFlickNote')}</small>
      <div className={stickStyles.stickAimGrid}>
        <label>
          {t('keymap.flickTime')}
          <input
            type="number"
            step="0.01"
            value={values.flickTime}
            onChange={(event) => handlers.onFlickTimeChange(event.target.value)}
            placeholder={formatDefault('0.1')}
            disabled={disabled}
          />
        </label>
        <label>
          {t('keymap.flickTimeExponent')}
          <input
            type="number"
            step="0.1"
            value={values.flickTimeExponent}
            onChange={(event) => handlers.onFlickTimeExponentChange(event.target.value)}
            placeholder={formatDefault('0.0')}
            disabled={disabled}
          />
        </label>
        <label>
          {t('keymap.snapMode')}
          <select className="app-select" value={snapMode} onChange={(event) => handlers.onSnapModeChange(event.target.value)} disabled={disabled}>
            <option value="">{t('common.defaultValue', { value: 'NONE' })}</option>
            <option value="4">{t('keymap.snapToFour')}</option>
            <option value="8">{t('keymap.snapToEight')}</option>
          </select>
        </label>
        <label>
          {t('keymap.snapStrength')}
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={values.snapStrength}
            onChange={(event) => handlers.onSnapStrengthChange(event.target.value)}
            placeholder={formatDefault('1.0')}
            disabled={disabled}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={Number(values.snapStrength) || 0}
            onChange={(event) => handlers.onSnapStrengthChange(event.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          {t('keymap.forwardDeadzoneAngle')}
          <input
            type="number"
            step="1"
            min="0"
            max="180"
            value={values.deadzoneAngle}
            onChange={(event) => handlers.onDeadzoneAngleChange(event.target.value)}
            placeholder={formatDefault('0')}
            disabled={disabled}
          />
          <input
            type="range"
            min="0"
            max="180"
            step="1"
            value={Number(values.deadzoneAngle) || 0}
            onChange={(event) => handlers.onDeadzoneAngleChange(event.target.value)}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  )
}

const VIRTUAL_MAPPING_DEVICE: TelemetryDevice = {
  handle: 0,
  type: 6,
  status: {
    buttons: 0,
    leftStick: { x: 0, y: 0 },
    rightStick: { x: 0, y: 0 },
    triggers: { left: 0, right: 0 },
    gyro: { x: 0, y: 0, z: 0 },
  },
}

const MAPPING_BUTTON_GROUPS: Record<string, ButtonDefinition[]> = {
  face: FACE_BUTTONS,
  dpad: DPAD_BUTTONS,
  bumpers: [...BUMPER_BUTTONS, ...MINI_BUTTONS],
  triggers: TRIGGER_BUTTONS,
  center: CENTER_BUTTONS,
  paddles: PADDLE_BUTTONS,
  extra: MISC_BUTTONS,
  sticks: [...LEFT_STICK_BUTTONS, ...RIGHT_STICK_BUTTONS],
}

const ACTION_PRESETS = [
  { key: 'space', labelKey: 'app.actionRail.presetSpace', value: 'SPACE' },
  { key: 'leftMouse', labelKey: 'app.actionRail.presetLeftMouse', value: 'LMOUSE' },
  { key: 'rightMouse', labelKey: 'app.actionRail.presetRightMouse', value: 'RMOUSE' },
  { key: 'wheelUp', labelKey: 'app.actionRail.presetWheelUp', value: 'SCROLLUP' },
  { key: 'gyroOff', labelKey: 'app.actionRail.presetGyroOff', value: 'GYRO_OFF' },
  { key: 'none', labelKey: 'app.actionRail.presetNone', value: 'NONE' },
  { key: 'copy', labelKey: 'app.actionRail.presetCopy', value: '!LCTRL\\ !C\\ !C/ !LCTRL/' },
  { key: 'paste', labelKey: 'app.actionRail.presetPaste', value: '!LCTRL\\ !V\\ !V/ !LCTRL/' },
  { key: 'altTab', labelKey: 'app.actionRail.presetAltTab', value: '!LALT\\ !TAB\\ !TAB/ !LALT/' },
]

const allMappingButtons = () => {
  const seen = new Set<string>()
  return Object.values(MAPPING_BUTTON_GROUPS)
    .flat()
    .filter(button => {
      const key = button.command.toUpperCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function KeymapControls({
  configText,
  hasPendingChanges,
  isCalibrating,
  statusMessage,
  onApply,
  onCancel,
  onBindingChange,
  onAssignSpecialAction,
  onClearSpecialAction,
  trackballDecay,
  onTrackballDecayChange,
  holdPressTimeSeconds,
  onHoldPressTimeChange,
  holdPressTimeIsCustom,
  holdPressTimeDefault,
  onModifierChange,
  doublePressWindowSeconds,
  doublePressWindowIsCustom,
  onDoublePressWindowChange,
  simPressWindowSeconds,
  simPressWindowIsCustom,
  onSimPressWindowChange,
  lightBarColor,
  onLightBarChange,
  triggerThreshold,
  onTriggerThresholdChange,
  view = 'full',
  lockMessage,
  visibleSections,
  stickForcedView,
  showStickViewToggle = true,
  touchpadMode: touchpadModeProp = '',
  onTouchpadModeChange,
  gridColumns = 2,
  gridRows = 2,
  onGridSizeChange,
  touchpadSensitivity,
  onTouchpadSensitivityChange,
  stickDeadzoneSettings,
  onStickDeadzoneChange,
  stickModeSettings,
  onStickModeChange,
  onRingModeChange,
  stickModeShiftAssignments,
  onStickModeShiftChange,
  stickAimSettings,
  stickAimHandlers,
  stickFlickSettings,
  stickFlickHandlers,
  mouseRingRadius,
  onMouseRingRadiusChange,
  scrollSens,
  onScrollSensChange,
  adaptiveTriggerValue = '',
  onAdaptiveTriggerChange = () => {},
  zlModeValue = '',
  zrModeValue = '',
  onZlModeChange = () => {},
  onZrModeChange = () => {},
  devices,
  selectedMappingCommand,
  onSelectedMappingCommandChange,
}: KeymapControlsProps) {
  const { t } = useTranslation()
  const [stickView, setStickView] = useState<'bindings' | 'modes'>('bindings')
  const [mappingHelpOpen, setMappingHelpOpen] = useState(false)
  const {
    manualRows,
    ensureManualRow,
    updateManualRow,
    removeManualRow,
    stickShiftDisplayModes,
    updateStickShiftDisplayMode,
    replaceStickShiftDisplayModes,
    getRowEditorMode,
    setRowEditorMode,
  } = useButtonRowState()
  const { captureLabel, beginCapture, beginValueCapture, cancelCapture, isCapturing, isCapturingValue } = useBindingCapture((button, slot, rowId, value, options) => {
    onBindingChange(button, slot, rowId, value, options)
    const isComboSlot = slot === 'chord' || slot === 'simultaneous' || slot === 'diagonal'
    if (value && isComboSlot && manualRows[button]?.[slot]?.some(entry => entry.id === rowId)) {
      removeManualRow(button, slot, rowId)
    }
  })

  const currentStickView = stickForcedView ?? stickView
  const stickToggleVisible = view === 'sticks' && showStickViewToggle && !stickForcedView

  useEffect(() => {
    if (stickForcedView) {
      setStickView(stickForcedView)
    }
  }, [stickForcedView])

  const isVisible = (section: string) => {
    if (!visibleSections || visibleSections.length === 0) return true
    return visibleSections.includes(section)
  }

  const touchpadMode = useMemo(() => {
    const upper = touchpadModeProp?.toUpperCase()
    if (upper === 'GRID_AND_STICK' || upper === 'MOUSE') return upper
    return ''
  }, [touchpadModeProp])

  const gridActive = touchpadMode === 'GRID_AND_STICK'
  const clampedGridCols = Math.max(1, Math.min(5, gridColumns || 1))
  const clampedGridRows = Math.max(1, Math.min(5, gridRows || 1))
  const clampedGridCells = touchpadMode === 'GRID_AND_STICK' ? Math.min(25, clampedGridCols * clampedGridRows) : 0
  const configuredGridButtons = gridActive ? clampedGridCells : 0

  const modifierOptions = useMemo(() => {
    return buildModifierOptions(gridActive, configuredGridButtons).map(option => ({
      value: option.value,
      label: resolveModifierOptionLabel(option, t),
      disabled: option.disabled,
    }))
  }, [configuredGridButtons, gridActive, t])

  const touchpadGridButtons = useMemo<ButtonDefinition[]>(() => {
    return Array.from({ length: clampedGridCells }, (_, index) => {
      const rowIndex = Math.floor(index / clampedGridCols) + 1
      const colIndex = (index % clampedGridCols) + 1
      return buildTouchpadGridButton(index + 1, rowIndex, colIndex)
    })
  }, [clampedGridCells, clampedGridCols])

  const bindingRowsByButton = useMemo(() => {
    const record: Record<string, ButtonBindingRow[]> = {}
    ;[
      ...FACE_BUTTONS,
      ...DPAD_BUTTONS,
      ...BUMPER_BUTTONS,
      ...MINI_BUTTONS,
      ...TRIGGER_BUTTONS,
      ...CENTER_BUTTONS,
      ...PADDLE_BUTTONS,
      ...LEFT_STICK_BUTTONS,
      ...RIGHT_STICK_BUTTONS,
      ...TOUCH_BUTTONS,
      ...MISC_BUTTONS,
      ...touchpadGridButtons,
    ].forEach(({ command }) => {
      record[command] = getButtonBindingRows(configText, command, manualRows[command] ?? {})
    })
    return record
  }, [configText, manualRows, touchpadGridButtons])

  const visualMappingButtons = useMemo(() => {
    const focusedSections = visibleSections?.filter(section => section !== 'global') ?? []
    if (focusedSections.length === 1 && focusedSections[0] === 'face') {
      return allMappingButtons()
    }
    if (focusedSections.length === 1 && MAPPING_BUTTON_GROUPS[focusedSections[0]]) {
      return MAPPING_BUTTON_GROUPS[focusedSections[0]]
    }
    return allMappingButtons()
  }, [visibleSections])

  const visualButtonByCommand = useMemo(() => {
    const record: Record<string, ButtonDefinition> = {}
    allMappingButtons().forEach(button => {
      record[button.command.toUpperCase()] = button
    })
    return record
  }, [])

  const specialsByButton = useMemo(() => {
    const assignments: Record<string, string | undefined> = {}
    getSpecialOptionList(t).forEach(binding => {
      const assignment = getKeymapValue(configText, binding.value)
      if (!assignment) return
      assignment
        .split(/\s+/)
        .filter(Boolean)
        .forEach(token => {
          assignments[token.toUpperCase()] = binding.value
        })
    })
    return assignments
  }, [configText, t])

  const boundCommandSet = useMemo(() => {
    const commands = new Set<string>()
    allMappingButtons().forEach(button => {
      const key = button.command.toUpperCase()
      const rows = bindingRowsByButton[button.command] ?? bindingRowsByButton[key] ?? []
      if (rows.length > 0 || specialsByButton[button.command] || specialsByButton[key] || stickModeShiftAssignments?.[key]?.length) {
        commands.add(key)
      }
    })
    return commands
  }, [bindingRowsByButton, specialsByButton, stickModeShiftAssignments])

  const selectedVisualCommand = selectedMappingCommand?.toUpperCase() ?? ''
  const selectedVisualButton =
    visualMappingButtons.find(button => button.command.toUpperCase() === selectedVisualCommand) ??
    visualMappingButtons[0] ??
    visualButtonByCommand[selectedVisualCommand] ??
    allMappingButtons()[0]
  const visualDevice = devices?.find(device => device.status) ?? devices?.[0] ?? VIRTUAL_MAPPING_DEVICE

  useEffect(() => {
    if (view !== 'full') return
    if (!selectedVisualButton) return
    if (selectedMappingCommand?.toUpperCase() === selectedVisualButton.command.toUpperCase()) return
    onSelectedMappingCommandChange?.(selectedVisualButton.command)
  }, [onSelectedMappingCommandChange, selectedMappingCommand, selectedVisualButton, view])

  const showFullLayout = view === 'full'
  const showStickLayout = view === 'sticks'
  const deadzoneDefaults = stickDeadzoneSettings?.defaults ?? {
    inner: DEFAULT_STICK_DEADZONE_INNER,
    outer: DEFAULT_STICK_DEADZONE_OUTER,
  }
  const leftDeadzoneValues = stickDeadzoneSettings?.left ?? { inner: '', outer: '' }
  const rightDeadzoneValues = stickDeadzoneSettings?.right ?? { inner: '', outer: '' }
  const leftStickModes = stickModeSettings?.left ?? { mode: '', ring: '' }
  const rightStickModes = stickModeSettings?.right ?? { mode: '', ring: '' }

  useEffect(() => {
    replaceStickShiftDisplayModes(prev => {
      if (!stickModeShiftAssignments) return {}
      const next: Record<string, 'tap' | 'extra'> = {}
      Object.keys(prev).forEach(button => {
        if (stickModeShiftAssignments[button]?.length) {
          next[button] = prev[button]
        }
      })
      Object.keys(stickModeShiftAssignments).forEach(button => {
        if (stickModeShiftAssignments[button]?.length && !next[button]) {
          next[button] = 'tap'
        }
      })
      return next
    })
  }, [replaceStickShiftDisplayModes, stickModeShiftAssignments])

  const holdPressTimeInputValue = Number.isFinite(holdPressTimeSeconds) ? holdPressTimeSeconds : holdPressTimeDefault
  const doublePressInputValue = Number.isFinite(doublePressWindowSeconds) ? doublePressWindowSeconds : holdPressTimeDefault
  const simPressInputValue = Number.isFinite(simPressWindowSeconds) ? simPressWindowSeconds : holdPressTimeDefault

  const renderButtonCard = (button: ButtonDefinition) => {
    const rows = bindingRowsByButton[button.command] ?? []
    return (
      <ButtonBindingsCard
        button={button}
        rows={rows}
        modifierOptions={modifierOptions}
        specialsByButton={specialsByButton}
        stickModeShiftAssignments={stickModeShiftAssignments}
        stickShiftDisplayModes={stickShiftDisplayModes}
        updateStickShiftDisplayMode={updateStickShiftDisplayMode}
        manualRows={manualRows}
        ensureManualRow={ensureManualRow}
        updateManualRow={updateManualRow}
        removeManualRow={removeManualRow}
        getRowEditorMode={getRowEditorMode}
        setRowEditorMode={setRowEditorMode}
        captureLabel={captureLabel}
        isCapturing={isCapturing}
        isCapturingValue={isCapturingValue}
        beginCapture={beginCapture}
        beginValueCapture={beginValueCapture}
        cancelCapture={cancelCapture}
        onBindingChange={onBindingChange}
        onModifierChange={onModifierChange}
        onAssignSpecialAction={onAssignSpecialAction}
        onClearSpecialAction={onClearSpecialAction}
        onStickModeShiftChange={onStickModeShiftChange}
        trackballDecay={trackballDecay}
        onTrackballDecayChange={onTrackballDecayChange}
      />
    )
  }

  const actionsProps = {
    hasPendingChanges,
    statusMessage,
    onApply,
    onCancel,
    applyDisabled: isCalibrating,
  }

  const applyActionPreset = (value: string) => {
    const buttonCommand = selectedVisualButton.command.toUpperCase()
    onBindingChange(buttonCommand, 'tap', `${buttonCommand}-tap`, value, { writeMode: 'line' })
    showToast(t('messages.actionPresetApplied', { button: buttonCommand, value }))
  }

  const stickModeExtras = (side: 'LEFT' | 'RIGHT') => {
    const mode = side === 'LEFT' ? stickModeSettings?.left.mode ?? '' : stickModeSettings?.right.mode ?? ''
    if ((mode === 'AIM' || (side === 'LEFT' && mode === 'HYBRID_AIM')) && stickAimSettings && stickAimHandlers) {
      return <StickAimSettings values={stickAimSettings} handlers={stickAimHandlers} disabled={isCalibrating} />
    }
    if ((mode === 'FLICK' || mode === 'FLICK_ONLY' || mode === 'ROTATE_ONLY') && stickFlickSettings && stickFlickHandlers) {
      return <StickFlickSettings values={stickFlickSettings} handlers={stickFlickHandlers} disabled={isCalibrating} />
    }
    if (mode === 'MOUSE_AREA' && mouseRingRadius !== undefined && onMouseRingRadiusChange) {
      return (
        <div className={stickStyles.stickFlickSettings} data-capture-ignore="true">
          <small>{t('keymap.mouseAreaRadiusNote')}</small>
          <div className={stickStyles.stickAimGrid}>
            <label>
              {t('keymap.mouseAreaRadius')}
              <input
                type="number"
                min="0"
                step="10"
                value={mouseRingRadius}
                onChange={(event) => onMouseRingRadiusChange(event.target.value)}
                placeholder={t('common.enterRadius')}
                disabled={isCalibrating}
              />
            </label>
          </div>
        </div>
      )
    }
    if (mode === 'SCROLL_WHEEL' && scrollSens !== undefined && onScrollSensChange) {
      return (
        <div className={stickStyles.stickFlickSettings} data-capture-ignore="true">
          <small>{t('keymap.scrollSensitivityNote')}</small>
          <div className={stickStyles.stickAimGrid}>
            <label>
              {t('keymap.scrollSensitivity')}
              <input
                type="number"
                min="0"
                step="1"
                value={scrollSens}
                onChange={(event) => onScrollSensChange(event.target.value)}
                placeholder={t('common.enterDegrees')}
                disabled={isCalibrating}
              />
            </label>
          </div>
        </div>
      )
    }
    return null
  }

  const renderSections = (sections: { key: string; shouldRender: boolean; node: JSX.Element }[]) =>
    sections.filter(section => section.shouldRender).map(section => <Fragment key={section.key}>{section.node}</Fragment>)

  return (
    <Card className="control-panel" lockable locked={isCalibrating} lockMessage={lockMessage ?? t('messages.lockMessage')}>
      <div className={keymapStyles.keymapCardHeader}>
        <div className={keymapStyles.keymapTitleRow}>
          <h2>
            {view === 'touchpad'
              ? t('keymap.touchpadControlsTitle')
              : view === 'sticks'
                ? t('keymap.stickBindingsTitle')
                : t('keymap.controlsTitle')}
          </h2>
          <button type="button" className="secondary-btn" onClick={() => setMappingHelpOpen(true)} data-capture-ignore="true">
            {t('keymap.mappingHelpButton')}
          </button>
        </div>
      </div>

      {showFullLayout && isVisible('global') && (
        <GlobalControlsSection
          holdPressTimeSeconds={holdPressTimeInputValue}
          holdPressTimeIsCustom={holdPressTimeIsCustom}
          holdPressTimeDefault={holdPressTimeDefault}
          onHoldPressTimeChange={onHoldPressTimeChange}
          doublePressWindowSeconds={doublePressInputValue}
          doublePressWindowIsCustom={doublePressWindowIsCustom}
          onDoublePressWindowChange={onDoublePressWindowChange}
          simPressWindowSeconds={simPressInputValue}
          simPressWindowIsCustom={simPressWindowIsCustom}
          onSimPressWindowChange={onSimPressWindowChange}
          lightBarColor={lightBarColor}
          onLightBarChange={onLightBarChange}
          {...actionsProps}
        />
      )}

      {showFullLayout && !isVisible('global') && (
        <>
          {isVisible('triggers') && (
            <TriggerControlsSection
              adaptiveTriggerValue={adaptiveTriggerValue}
              onAdaptiveTriggerChange={onAdaptiveTriggerChange}
              triggerThreshold={triggerThreshold}
              onTriggerThresholdChange={onTriggerThresholdChange}
              {...actionsProps}
            />
          )}
          <section className={keymapStyles.mappingWorkbench}>
            <div className={keymapStyles.mappingVisualPanel}>
              <div className={keymapStyles.mappingVisualHeader}>
                <div>
                  <h3>{t('keymap.visualMappingTitle')}</h3>
                  <p>{t('keymap.visualMappingDescription')}</p>
                </div>
                {!devices?.length && <span className={keymapStyles.mappingModeBadge}>{t('keymap.virtualControllerMode')}</span>}
              </div>
              <ControllerStatusSvg
                device={visualDevice}
                boundCommands={boundCommandSet}
                selectedCommand={selectedVisualButton.command.toUpperCase()}
                onSelectCommand={command => onSelectedMappingCommandChange?.(command.toUpperCase())}
              />
              <div className={keymapStyles.mappingButtonStrip} data-capture-ignore="true">
                {visualMappingButtons.map(button => {
                  const command = button.command.toUpperCase()
                  return (
                    <button
                      key={command}
                      type="button"
                      className={`${keymapStyles.mappingButtonChip} ${selectedVisualButton.command.toUpperCase() === command ? keymapStyles.mappingButtonChipActive : ''} ${boundCommandSet.has(command) ? keymapStyles.mappingButtonChipBound : ''}`}
                      onClick={() => onSelectedMappingCommandChange?.(command)}
                    >
                      {controllerButtonLabel(button)}
                    </button>
                  )
                })}
              </div>
            </div>
            <aside className={keymapStyles.mappingDetailPanel}>
              <div className={keymapStyles.mappingDetailHeader}>
                <span>{t('keymap.selectedButton')}</span>
                <strong>{controllerButtonLabel(selectedVisualButton)}</strong>
              </div>
              {renderButtonCard(selectedVisualButton)}
              {isVisible('triggers') && (
                <div className={keymapStyles.triggerModeInline} data-capture-ignore="true">
                  <label>
                    {t('keymap.l2FullPullMode')}
                    <select className="app-select" value={zlModeValue || 'NO_FULL'} onChange={e => onZlModeChange(e.target.value)} disabled={actionsProps.applyDisabled}>
                      {['NO_FULL', 'NO_SKIP', 'NO_SKIP_EXCLUSIVE', 'MUST_SKIP', 'MAY_SKIP', 'MUST_SKIP_R', 'MAY_SKIP_R'].map(mode => (
                        <option key={mode} value={mode}>{mode === 'NO_FULL' ? t('common.defaultValue', { value: mode }) : mode}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('keymap.r2FullPullMode')}
                    <select className="app-select" value={zrModeValue || 'NO_FULL'} onChange={e => onZrModeChange(e.target.value)} disabled={actionsProps.applyDisabled}>
                      {['NO_FULL', 'NO_SKIP', 'NO_SKIP_EXCLUSIVE', 'MUST_SKIP', 'MAY_SKIP', 'MUST_SKIP_R', 'MAY_SKIP_R'].map(mode => (
                        <option key={mode} value={mode}>{mode === 'NO_FULL' ? t('common.defaultValue', { value: mode }) : mode}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <div className="action-library-card mapping-action-library" data-capture-ignore="true">
                <div className="action-library-header">
                  <div>
                    <div className="profile-summary-title">{t('app.actionRail.title')}</div>
                    <p>{t('app.actionRail.description')}</p>
                  </div>
                  <span className="selected-binding-pill">{selectedVisualButton.command.toUpperCase()}</span>
                </div>
                <div className="action-preset-grid">
                  {ACTION_PRESETS.map(preset => (
                    <button
                      key={preset.key}
                      type="button"
                      className="action-preset-card"
                      disabled={isCalibrating}
                      onClick={() => applyActionPreset(preset.value)}
                    >
                      <span>{t(preset.labelKey)}</span>
                      <code>{preset.value}</code>
                    </button>
                  ))}
                </div>
              </div>
              <SectionActions className={keymapStyles.keymapSectionActions} {...actionsProps} />
            </aside>
          </section>
        </>
      )}

      {showStickLayout && (
        <>
          {stickToggleVisible && (
            <div className={`mode-toggle ${stickStyles.stickSubtabs}`}>
              <button className={`pill-tab ${currentStickView === 'modes' ? 'active' : ''}`} onClick={() => setStickView('modes')}>
                {t('keymap.modesAndSettings')}
              </button>
              <button className={`pill-tab ${currentStickView === 'bindings' ? 'active' : ''}`} onClick={() => setStickView('bindings')}>
                {t('keymap.bindings')}
              </button>
            </div>
          )}
          {currentStickView === 'bindings' ? (
            renderSections([
              {
                key: 'left-stick-bind',
                shouldRender: true,
                node: (
                  <ButtonGridSection
                    title={t('keymap.leftStickTitle')}
                    description={t('keymap.leftStickDescription')}
                    buttons={LEFT_STICK_BUTTONS}
                    renderButton={renderButtonCard}
                    {...actionsProps}
                  />
                ),
              },
              {
                key: 'right-stick-bind',
                shouldRender: true,
                node: (
                  <ButtonGridSection
                    title={t('keymap.rightStickTitle')}
                    description={t('keymap.rightStickDescription')}
                    buttons={RIGHT_STICK_BUTTONS}
                    renderButton={renderButtonCard}
                    {...actionsProps}
                  />
                ),
              },
            ])
          ) : (
            <StickModesSection
              leftDeadzone={leftDeadzoneValues}
              rightDeadzone={rightDeadzoneValues}
              deadzoneDefaults={deadzoneDefaults}
              leftMode={leftStickModes}
              rightMode={rightStickModes}
              onModeChange={(side, value) => onStickModeChange?.(side, value)}
              onRingChange={(side, value) => onRingModeChange?.(side, value)}
              onDeadzoneChange={(side, type, value) => onStickDeadzoneChange?.(side, type, value)}
              leftExtras={stickModeExtras('LEFT')}
              rightExtras={stickModeExtras('RIGHT')}
              disabled={isCalibrating}
              {...actionsProps}
            />
          )}
        </>
      )}

      {view === 'touchpad' && (
        <>
          {renderSections([
            {
              key: 'touch-bind',
              shouldRender: isVisible('touch-bind'),
              node: (
                <ButtonGridSection
                  title={t('keymap.touchButtonsTitle')}
                  description={t('keymap.touchButtonsDescription')}
                  buttons={TOUCH_BUTTONS}
                  renderButton={renderButtonCard}
                  {...actionsProps}
                />
              ),
            },
            {
              key: 'touch-grid',
              shouldRender: isVisible('touch-grid'),
              node: (
                <>
                  <TouchpadSettingsSection
                    touchpadMode={touchpadMode}
                    gridColumns={gridColumns}
                    gridRows={gridRows}
                    onTouchpadModeChange={onTouchpadModeChange}
                    onGridSizeChange={onGridSizeChange}
                    touchpadSensitivity={touchpadSensitivity}
                    onTouchpadSensitivityChange={onTouchpadSensitivityChange}
                    {...actionsProps}
                  />
                  {touchpadMode === 'GRID_AND_STICK' && (
                    <TouchpadGridSection
                      gridColumns={clampedGridCols}
                      gridCells={clampedGridCells}
                      renderButton={renderButtonCard}
                      touchpadButtons={touchpadGridButtons}
                      {...actionsProps}
                    />
                  )}
                </>
              ),
            },
          ])}
        </>
      )}

      <MappingRulesHelpModal isOpen={mappingHelpOpen} onClose={() => setMappingHelpOpen(false)} />
    </Card>
  )
}
