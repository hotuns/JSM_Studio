import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SensitivityValues } from '../utils/keymap'
import type { GyroActivationMode } from '../utils/gyroActivation'
import { buildModifierOptions, resolveModifierOptionLabel } from '../utils/modifierOptions'
import { Card } from './Card'
import { SectionActions } from './SectionActions'
import { controllerLabel, formatVidPid } from '../utils/controllers'
import styles from './Gyro.module.css'

const TICK_TIME_OPTIONS = [
  { value: '1', label: '1 ms' },
  { value: '2', label: '2 ms' },
  { value: '3', label: '3 ms' },
]

const GYRO_SPACE_OPTIONS = [
  { value: 'LOCAL', labelKey: 'gyro.spaces.local' },
  { value: 'YAW_PLUS_ROLL', labelKey: 'gyro.spaces.yawPlusRoll' },
  { value: 'PLAYER_TURN', labelKey: 'gyro.spaces.playerTurn' },
  { value: 'WORLD_TURN', labelKey: 'gyro.spaces.worldTurn' },
]

const GYRO_ACTIVATION_MODE_OPTIONS: Array<{ value: GyroActivationMode; labelKey: string }> = [
  { value: 'always_on', labelKey: 'gyro.activationAlwaysOn' },
  { value: 'hold_on', labelKey: 'gyro.activationHoldOn' },
  { value: 'hold_off', labelKey: 'gyro.activationHoldOff' },
  { value: 'always_off', labelKey: 'gyro.activationAlwaysOff' },
]

type GyroBehaviorControlsProps = {
  sensitivity: SensitivityValues
  gyroActivationMode: GyroActivationMode
  gyroActivationButton: string
  touchpadMode: string
  touchpadGridCells: number
  isCalibrating: boolean
  statusMessage?: string | null
  devices?: {
    handle: number
    type: number
    split?: number
    vid?: number
    pid?: number
  }[]
  ignoredDevices?: string[]
  onToggleIgnoreDevice?: (vid: number, pid: number, ignore: boolean) => void
  onInGameSensChange: (value: string) => void
  onRealWorldCalibrationChange: (value: string) => void
  onTickTimeChange: (value: string) => void
  onGyroSpaceChange: (value: string) => void
  onGyroAxisXChange: (value: string) => void
  onGyroAxisYChange: (value: string) => void
  onGyroActivationModeChange: (mode: GyroActivationMode, fallbackButton?: string) => void
  onGyroActivationButtonChange: (button: string) => void
  counterOsMouseSpeed: boolean
  onCounterOsMouseSpeedChange: (enabled: boolean) => void
  onOpenCalibration?: () => void
  onOpenRwcGuide?: () => void
  hasPendingChanges: boolean
  onApply: () => void
  onCancel: () => void
  lockMessage?: string
  appliedSampleHz?: string
}

export function GyroBehaviorControls({
  sensitivity,
  gyroActivationMode,
  gyroActivationButton,
  touchpadMode,
  touchpadGridCells,
  isCalibrating,
  statusMessage,
  devices,
  ignoredDevices,
  onToggleIgnoreDevice,
  onInGameSensChange,
  onRealWorldCalibrationChange,
  onTickTimeChange,
  onGyroSpaceChange,
  onGyroAxisXChange,
  onGyroAxisYChange,
  onGyroActivationModeChange,
  onGyroActivationButtonChange,
  counterOsMouseSpeed,
  onCounterOsMouseSpeedChange,
  onOpenCalibration,
  onOpenRwcGuide,
  hasPendingChanges,
  onApply,
  onCancel,
  lockMessage,
  appliedSampleHz,
}: GyroBehaviorControlsProps) {
  const { t } = useTranslation()
  const isTouchpadGridActive = touchpadMode === 'GRID_AND_STICK'
  const activationButtonOptions = useMemo(() => {
    const options = buildModifierOptions(isTouchpadGridActive, isTouchpadGridActive ? touchpadGridCells : 0).map(option => ({
      value: option.value,
      label: resolveModifierOptionLabel(option, t),
      disabled: option.disabled,
    }))
    if (gyroActivationButton && !options.some(option => option.value === gyroActivationButton)) {
      options.push({ value: gyroActivationButton, label: gyroActivationButton, disabled: false })
    }
    return options
  }, [gyroActivationButton, isTouchpadGridActive, t, touchpadGridCells])
  const fallbackActivationButton =
    activationButtonOptions.find(option => option.value === 'R3' && !option.disabled)?.value ??
    activationButtonOptions.find(option => !option.disabled)?.value ??
    'R3'
  const selectedActivationButton = gyroActivationButton || fallbackActivationButton
  const usesActivationButton = gyroActivationMode === 'hold_on' || gyroActivationMode === 'hold_off'

  return (
    <Card className="control-panel" lockable locked={isCalibrating} lockMessage={lockMessage ?? t('messages.lockMessage')}>
      <h2>{t('gyro.title')}</h2>
      {(onOpenCalibration || onOpenRwcGuide) && (
        <div className="flex-inputs">
          {onOpenRwcGuide && (
            <button type="button" className="primary-btn full-width-btn" onClick={onOpenRwcGuide} disabled={isCalibrating}>
              {t('gyro.easyCalibrationMethod')}
            </button>
          )}
          {onOpenCalibration && (
            <button type="button" className="secondary-btn full-width-btn" onClick={onOpenCalibration} disabled={isCalibrating}>
              {t('gyro.manualCalibration')}
            </button>
          )}
        </div>
      )}
      <div className="flex-inputs">
        <label>
          {t('gyro.activationMode')}
          <p className="field-description">{t('gyro.activationHint')}</p>
          <select
            className="app-select"
            value={gyroActivationMode}
            onChange={(event) =>
              onGyroActivationModeChange(event.target.value as GyroActivationMode, selectedActivationButton)
            }
            disabled={isCalibrating}
          >
            {GYRO_ACTIVATION_MODE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('gyro.activationButton')}
          <p className="field-description">{t('gyro.activationButtonHint')}</p>
          <select
            className="app-select"
            value={selectedActivationButton}
            onChange={(event) => onGyroActivationButtonChange(event.target.value)}
            disabled={isCalibrating || !usesActivationButton}
          >
            {activationButtonOptions.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex-inputs">
        <label>
          {t('gyro.realWorldCalibration')}
          <input
            type="number"
            step="0.1"
            value={sensitivity.realWorldCalibration ?? ''}
            onChange={(e) => onRealWorldCalibrationChange(e.target.value)}
          />
        </label>
        <label>
          {t('gyro.inGameSensitivity')}
          <input type="number" step="0.1" value={sensitivity.inGameSens ?? ''} onChange={(e) => onInGameSensChange(e.target.value)} />
        </label>
      </div>
      <div className="flex-inputs">
        <label>
          <div className="label-row">
            <span>{t('gyro.pollingTickTime')}</span>
            {appliedSampleHz && <span className="field-description inline-helper">{appliedSampleHz} Hz</span>}
          </div>
          <select value={sensitivity.tickTime?.toString() ?? ''} onChange={(e) => onTickTimeChange(e.target.value)}>
            <option value="">{t('common.useDefault')}</option>
            {TICK_TIME_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('gyro.gyroSpace')}
          <select value={sensitivity.gyroSpace ?? ''} onChange={(e) => onGyroSpaceChange(e.target.value)}>
            <option value="">{t('common.useDefault')}</option>
            {GYRO_SPACE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex-inputs">
        <label>
          {t('gyro.gyroAxisX')}
          <select value={sensitivity.gyroAxisX ?? ''} onChange={(e) => onGyroAxisXChange(e.target.value)}>
            <option value="">{t('common.default')}</option>
            <option value="INVERTED">{t('gyro.inverted')}</option>
          </select>
        </label>
        <label>
          {t('gyro.gyroAxisY')}
          <select value={sensitivity.gyroAxisY ?? ''} onChange={(e) => onGyroAxisYChange(e.target.value)}>
            <option value="">{t('common.default')}</option>
            <option value="INVERTED">{t('gyro.inverted')}</option>
          </select>
        </label>
      </div>
      <div className="flex-inputs">
        <label>
          {t('gyro.counterOsMouseSpeed')}
          <p className="field-description">{t('gyro.counterOsMouseSpeedHint')}</p>
          <select
            className="app-select"
            value={counterOsMouseSpeed ? 'ON' : 'OFF'}
            onChange={(event) => onCounterOsMouseSpeedChange(event.target.value === 'ON')}
            disabled={isCalibrating}
          >
            <option value="OFF">{t('common.offDefault')}</option>
            <option value="ON">{t('common.on')}</option>
          </select>
        </label>
      </div>
      {devices && devices.length > 0 && (
        <div className="flex-inputs">
          <label>
            {t('gyro.connectedControllers')}
            <p className="field-description">{t('gyro.connectedControllersHint')}</p>
            <div className={styles.controllerList}>
              {devices.map(dev => {
                const id = formatVidPid(dev.vid, dev.pid)
                const isIgnored = id ? ignoredDevices?.includes(id.toLowerCase()) : false
                const disabled = !dev.vid || !dev.pid
                return (
                  <div key={dev.handle} className={styles.controllerCard}>
                    <div className={styles.controllerEntry}>
                      {controllerLabel(dev.type, t)}
                      {id && <span className={styles.controllerVidpid}>: {id}</span>}
                    </div>
                    <label className={styles.toggleSwitch}>
                      <span className={styles.toggleLabel}>{t('gyro.ignoreGyroOutput')}</span>
                      <div className={styles.toggleWrapper}>
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={Boolean(isIgnored)}
                          onChange={(event) => {
                            if (!dev.vid || !dev.pid) return
                            onToggleIgnoreDevice?.(dev.vid, dev.pid, event.target.checked)
                          }}
                        />
                        <span className={styles.toggleSlider} />
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>
          </label>
        </div>
      )}
      <SectionActions
        hasPendingChanges={hasPendingChanges}
        statusMessage={statusMessage}
        onApply={onApply}
        onCancel={onCancel}
        applyDisabled={isCalibrating}
        className="control-actions"
      />
    </Card>
  )
}
