import { KeymapSection } from '../KeymapSection'
import { SectionActions } from '../SectionActions'
import keymapStyles from '../Keymap.module.css'

type TriggerControlsSectionProps = {
  adaptiveTriggerValue: string
  onAdaptiveTriggerChange: (value: string) => void
  triggerThreshold: number
  onTriggerThresholdChange: (value: string) => void
  hasPendingChanges: boolean
  statusMessage?: string | null
  onApply: () => void
  onCancel: () => void
  applyDisabled?: boolean
}

export function TriggerControlsSection({
  adaptiveTriggerValue,
  onAdaptiveTriggerChange,
  triggerThreshold,
  onTriggerThresholdChange,
  hasPendingChanges,
  statusMessage,
  onApply,
  onCancel,
  applyDisabled,
}: TriggerControlsSectionProps) {
  return (
    <>
      <KeymapSection title="Trigger controls" description="Adaptive trigger mode and soft-pull threshold for L2/R2.">
        <div className={keymapStyles.globalControls} data-capture-ignore="true">
          <div className={keymapStyles.globalControlRow}>
            <div className={keymapStyles.globalControlText}>
              <span className={keymapStyles.globalControlTitle}>Adaptive triggers (DualSense)</span>
            </div>
            <div className={keymapStyles.globalControlInputGroup}>
              <select
                className="app-select"
                value={adaptiveTriggerValue}
                onChange={(event) => onAdaptiveTriggerChange(event.target.value)}
                disabled={applyDisabled}
              >
                <option value="">Default (ON)</option>
                <option value="OFF">Off</option>
              </select>
            </div>
          </div>
          <div className={keymapStyles.globalControlRow}>
            <div className={keymapStyles.globalControlText}>
              <span className={keymapStyles.globalControlTitle}>Trigger threshold</span>
              <span className={keymapStyles.globalControlCaption}>
                {triggerThreshold > 0 ? `Custom TRIGGER_THRESHOLD = ${triggerThreshold.toFixed(2)}` : 'Default (0.00)'}
              </span>
            </div>
            <div className={keymapStyles.globalControlInputGroup}>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={triggerThreshold}
                onChange={(event) => onTriggerThresholdChange(event.target.value)}
                disabled={applyDisabled}
              />
            </div>
          </div>
        </div>
      </KeymapSection>
      <SectionActions
        className={keymapStyles.keymapSectionActions}
        hasPendingChanges={hasPendingChanges}
        statusMessage={statusMessage}
        onApply={onApply}
        onCancel={onCancel}
        applyDisabled={applyDisabled}
      />
    </>
  )
}
