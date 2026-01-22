import { Card } from './Card'
import { SensitivityValues } from '../utils/keymap'
import { TelemetryBanner } from './TelemetryBanner'
import { SectionActions } from './SectionActions'
import { LOCK_MESSAGE } from '../constants/messages'

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
  lockMessage = LOCK_MESSAGE,
  onCutoffSpeedChange,
  onCutoffRecoveryChange,
  onSmoothTimeChange,
  onSmoothThresholdChange,
  onSmoothingDecayChange,
  onAngleSnapChange,
  onAngleSnapSmoothChange,
  onDecelBrakeStrengthChange,
  onDecelBrakeThresholdChange,
  telemetry,
}: NoiseSteadyingControlsProps) {
  return (
    <Card
      className="control-panel"
      lockable
      locked={isCalibrating}
      lockMessage={lockMessage}
    >
      <div className="section-header">
        <h2 className="section-title">Noise & Steadying</h2>
        <p className="section-caption compact">
          Increase deadzone/steadying to damp the live gyro noise shown below; higher values reduce tiny movements when the
          controller is at rest.
        </p>
      </div>
      <div className="telemetry-inline">
        <TelemetryBanner {...telemetry} />
      </div>
      <div className="flex-inputs">
        <label>
          Deadzone (°/s)
          <input
            type="number"
            step="0.01"
            min="0"
            value={sensitivity.cutoffSpeed ?? ''}
            onChange={(e) => onCutoffSpeedChange(e.target.value)}
          />
          <input
            type="range"
            min="0"
            max="5"
            step="0.01"
            value={sensitivity.cutoffSpeed ?? 0}
            onChange={(e) => onCutoffSpeedChange(e.target.value)}
          />
        </label>
        <label>
          Steadying (°/s)
          <input
            type="number"
            step="0.01"
            min="0"
            value={sensitivity.cutoffRecovery ?? ''}
            onChange={(e) => onCutoffRecoveryChange(e.target.value)}
          />
          <input
            type="range"
            min="0"
            max="5"
            step="0.01"
            value={sensitivity.cutoffRecovery ?? 0}
            onChange={(e) => onCutoffRecoveryChange(e.target.value)}
          />
        </label>
      </div>
      <div className="flex-inputs">
        <label>
          Gyro Smooth Time (sec)
          <input
            type="number"
            step="0.001"
            min="0"
            value={sensitivity.smoothTime ?? ''}
            onChange={(e) => onSmoothTimeChange(e.target.value)}
          />
          <input
            type="range"
            min="0"
            max="0.03"
            step="0.001"
            value={sensitivity.smoothTime ?? 0}
            onChange={(e) => onSmoothTimeChange(e.target.value)}
          />
        </label>
        <label>
          Gyro Smooth Threshold (RWS)
          <input
            type="number"
            step="1"
            min="0"
            value={sensitivity.smoothThreshold ?? ''}
            onChange={(e) => onSmoothThresholdChange(e.target.value)}
          />
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={sensitivity.smoothThreshold ?? 0}
            onChange={(e) => onSmoothThresholdChange(e.target.value)}
          />
        </label>
      </div>
      <div className="flex-inputs">
        <label>
          Gyro Smoothing Decay
          <select
            value={sensitivity.smoothingDecay ?? 'OFF'}
            onChange={(e) => onSmoothingDecayChange(e.target.value)}
          >
            <option value="OFF">Off</option>
            <option value="ON">On</option>
          </select>
        </label>
      </div>
      <div className="flex-inputs">
        <label>
          Angle Snapping (degrees)
          <input
            type="number"
            step="0.1"
            min="0"
            max="45"
            value={sensitivity.angleSnap ?? ''}
            onChange={(e) => onAngleSnapChange(e.target.value)}
          />
          <input
            type="range"
            min="0"
            max="45"
            step="0.1"
            value={sensitivity.angleSnap ?? 0}
            onChange={(e) => onAngleSnapChange(e.target.value)}
          />
        </label>
        <label>
          Ease Angle Snapping
          <select
            value={sensitivity.angleSnapEase ?? 'OFF'}
            onChange={(e) => onAngleSnapSmoothChange(e.target.value)}
          >
            <option value="OFF">Off</option>
            <option value="ON">On</option>
          </select>
        </label>
      </div>
      <div className="flex-inputs">
        <label>
          Decel Brake Strength
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={sensitivity.decelBrakeStrength ?? ''}
            onChange={(e) => onDecelBrakeStrengthChange(e.target.value)}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sensitivity.decelBrakeStrength ?? 0}
            onChange={(e) => onDecelBrakeStrengthChange(e.target.value)}
          />
        </label>
        <label>
          Decel Brake Threshold (°/s)
          <input
            type="number"
            step="0.1"
            min="1"
            max="60"
            value={sensitivity.decelBrakeThreshold ?? ''}
            onChange={(e) => onDecelBrakeThresholdChange(e.target.value)}
          />
          <input
            type="range"
            min="1"
            max="60"
            step="0.5"
            value={sensitivity.decelBrakeThreshold ?? 25}
            onChange={(e) => onDecelBrakeThresholdChange(e.target.value)}
          />
        </label>
      </div>
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
