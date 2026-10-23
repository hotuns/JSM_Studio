import { useTranslation } from 'react-i18next'
import { SensitivityValues } from '../utils/keymap'
import { Card } from './Card'
import { SectionActions } from './SectionActions'
import { TelemetryBanner } from './TelemetryBanner'
import { MotionLabel, MotionSection } from './MotionHelp'
import styles from './MotionControls.module.css'

type NoiseSteadyingControlsProps = {
  sensitivity: SensitivityValues
  isCalibrating: boolean
  hasPendingChanges: boolean
  statusMessage?: string | null
  onApply: () => void
  onCancel: () => void
  lockMessage?: string
  onCutoffSpeedChange: (value: string) => void
  onCutoffRecoveryChange: (value: string) => void
  onSmoothTimeChange: (value: string) => void
  onSmoothThresholdChange: (value: string) => void
  onSmoothingDecayChange: (value: string) => void
  onOneEuroFilterChange: (value: string) => void
  onOneEuroMinCutoffChange: (value: string) => void
  onOneEuroSpeedCoeffChange: (value: string) => void
  onAngleSnapChange: (value: string) => void
  onAngleSnapSmoothChange: (value: string) => void
  onDecelBrakeStrengthChange: (value: string) => void
  onDecelBrakeThresholdChange: (value: string) => void
  telemetry: {
    omega: string
    timestamp: string
    sampleHz?: string
  }
}

export function NoiseSteadyingControls({
  sensitivity,
  isCalibrating,
  hasPendingChanges,
  statusMessage,
  onApply,
  onCancel,
  lockMessage,
  onCutoffSpeedChange,
  onCutoffRecoveryChange,
  onSmoothTimeChange,
  onSmoothThresholdChange,
  onSmoothingDecayChange,
  onOneEuroFilterChange,
  onOneEuroMinCutoffChange,
  onOneEuroSpeedCoeffChange,
  onAngleSnapChange,
  onAngleSnapSmoothChange,
  onDecelBrakeStrengthChange,
  onDecelBrakeThresholdChange,
  telemetry,
}: NoiseSteadyingControlsProps) {
  const { t } = useTranslation()

  const numberField = (name: string, value: number | undefined, fallback: number, max: number, step: number, onChange: (value: string) => void, min = 0, disabled = false) => (
    <label>
      <MotionLabel title={t(`noise.${name}`)} topic={name} />
      <input type="number" disabled={disabled} aria-label={t(`noise.${name}`)} min={min} step={step} max={name === 'angleSnapping' || name === 'decelBrakeStrength' ? max : undefined}
        value={value ?? fallback} onChange={event => onChange(event.target.value)} />
      <input type="range" disabled={disabled} aria-label={t(`noise.${name}`)} min={min} max={Math.max(max, value ?? fallback)} step={step}
        value={value ?? fallback} onChange={event => onChange(event.target.value)} />
    </label>
  )
  const switchField = (name: string, value: string, onChange: (value: string) => void, disabled = false) => (
    <label><MotionLabel title={t(`noise.${name}`)} topic={name} />
      <select aria-label={t(`noise.${name}`)} value={value} onChange={event => onChange(event.target.value)} disabled={disabled}>
        <option value="OFF">{t('common.off')}</option><option value="ON">{t('common.on')}</option>
      </select>
    </label>
  )

  return (
    <Card className={`control-panel ${styles.panel}`} lockable locked={isCalibrating} lockMessage={lockMessage ?? t('messages.lockMessage')}>
      <div className="section-header">
        <h2 className="section-title">{t('motion.noise')}</h2>
        <p className={styles.description}>{t('motion.pendingHint')}</p>
      </div>
      <p className={styles.notice}>{t('motion.notice')}</p>
      <MotionSection title={t('motion.telemetry')} description={t('motion.telemetryDesc')}>
        <TelemetryBanner {...telemetry} />
      </MotionSection>
      <div className={styles.grid}>
        <MotionSection title={t('motion.filter')} description={t('motion.filterDesc')} active={sensitivity.oneEuroFilter ?? false} help="oneEuroFilter">
          <div className="flex-inputs">{switchField('oneEuroFilter', sensitivity.oneEuroFilter ? 'ON' : 'OFF', onOneEuroFilterChange)}</div>
          {sensitivity.oneEuroFilter && <div className="flex-inputs">
            {numberField('oneEuroMinCutoff', sensitivity.oneEuroMinCutoff, 6, 20, 0.1, onOneEuroMinCutoffChange, 0.1)}
            {numberField('oneEuroSpeedCoeff', sensitivity.oneEuroSpeedCoeff, 0.3, 2, 0.01, onOneEuroSpeedCoeffChange)}
          </div>}
        </MotionSection>
        <MotionSection title={t('motion.smoothing')} description={t('motion.smoothingDesc')}
          active={(sensitivity.smoothThreshold ?? 0) > 0 && (sensitivity.smoothTime ?? 0.125) > 0} help="smoothingDecay">
          <div className="flex-inputs"><label>
            <MotionLabel title={t('motion.smoothMethod')} topic="smoothingDecay" />
            <select value={sensitivity.smoothingDecay ?? 'OFF'} onChange={event => onSmoothingDecayChange(event.target.value)}>
              <option value="OFF">{t('motion.average')}</option><option value="ON">{t('motion.decay')}</option>
            </select>
          </label></div>
          <div className="flex-inputs">
            {numberField('smoothTime', sensitivity.smoothTime, 0.125, 0.25, 0.001, onSmoothTimeChange)}
            {numberField('smoothThreshold', sensitivity.smoothThreshold, 0, 50, 1, onSmoothThresholdChange)}
          </div>
          <p className={styles.hint}>{t('motion.smoothHint')}</p>
        </MotionSection>
        <MotionSection title={t('motion.deadzone')} description={t('motion.deadzoneDesc')} active={(sensitivity.cutoffSpeed ?? 0) > 0 || (sensitivity.cutoffRecovery ?? 0) > 0} help="deadzone">
          <div className="flex-inputs">
            {numberField('deadzone', sensitivity.cutoffSpeed, 0, 5, 0.01, onCutoffSpeedChange)}
            {numberField('steadying', sensitivity.cutoffRecovery, 0, 5, 0.01, onCutoffRecoveryChange)}
          </div>
          <p className={styles.hint}>{t('motion.offHint')}</p>
        </MotionSection>
        <MotionSection title={t('noise.angleSnapping')} description={t('motion.angleDesc')} active={(sensitivity.angleSnap ?? 0) > 0} help="angleSnapping">
          <div className="flex-inputs">
            {numberField('angleSnapping', sensitivity.angleSnap, 0, 45, 0.1, onAngleSnapChange)}
            {switchField('easeAngleSnapping', sensitivity.angleSnapEase ?? 'OFF', onAngleSnapSmoothChange, !(sensitivity.angleSnap && sensitivity.angleSnap > 0))}
          </div>
        </MotionSection>
        <MotionSection title={t('noise.decelBrakeStrength')} description={t('motion.brakeDesc')} active={(sensitivity.decelBrakeStrength ?? 0) > 0} help="decelBrakeStrength">
          <div className="flex-inputs">
            {numberField('decelBrakeStrength', sensitivity.decelBrakeStrength, 0, 1, 0.01, onDecelBrakeStrengthChange)}
            {numberField('decelBrakeThreshold', sensitivity.decelBrakeThreshold, 25, 60, 0.1, onDecelBrakeThresholdChange, 0, !(sensitivity.decelBrakeStrength && sensitivity.decelBrakeStrength > 0))}
          </div>
        </MotionSection>
      </div>
      <SectionActions hasPendingChanges={hasPendingChanges} statusMessage={statusMessage} onApply={onApply}
        onCancel={onCancel} applyDisabled={isCalibrating} className={styles.actions} />
    </Card>
  )
}
