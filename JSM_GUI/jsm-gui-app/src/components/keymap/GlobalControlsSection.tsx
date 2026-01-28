import { KeymapSection } from '../KeymapSection'
import { SectionActions } from '../SectionActions'
import keymapStyles from '../Keymap.module.css'

type GlobalControlsSectionProps = {
  holdPressTimeSeconds: number
  holdPressTimeIsCustom: boolean
  holdPressTimeDefault: number
  onHoldPressTimeChange: (value: string) => void
  doublePressWindowSeconds: number
  doublePressWindowIsCustom: boolean
  onDoublePressWindowChange: (value: string) => void
  simPressWindowSeconds: number
  simPressWindowIsCustom: boolean
  onSimPressWindowChange: (value: string) => void
  hasPendingChanges: boolean
  statusMessage?: string | null
  onApply: () => void
  onCancel: () => void
  applyDisabled?: boolean
}

export function GlobalControlsSection({
  holdPressTimeSeconds,
  holdPressTimeIsCustom,
  holdPressTimeDefault,
  onHoldPressTimeChange,
  doublePressWindowSeconds,
  doublePressWindowIsCustom,
  onDoublePressWindowChange,
  simPressWindowSeconds,
  simPressWindowIsCustom,
  onSimPressWindowChange,
  hasPendingChanges,
  statusMessage,
  onApply,
  onCancel,
  applyDisabled,
}: GlobalControlsSectionProps) {
  const renderRow = (
    title: string,
    caption: string,
    value: number,
    onChange: (value: string) => void
  ) => (
    <div className={keymapStyles.globalControlRow} data-capture-ignore="true">
      <div className={keymapStyles.globalControlText}>
        <span className={keymapStyles.globalControlTitle}>{title}</span>
        <span className={keymapStyles.globalControlCaption}>{caption}</span>
      </div>
      <div className={keymapStyles.globalControlInputGroup}>
        <input type="number" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} />
        <span className={keymapStyles.globalControlUnit}>seconds</span>
      </div>
    </div>
  )

  return (
    <>
      <KeymapSection title="Global controls" description="Timing windows that apply whenever those binding types are in use.">
        <div className={keymapStyles.globalControls}>
          {renderRow(
            'Tap vs hold press threshold',
            holdPressTimeIsCustom ? 'Custom HOLD_PRESS_TIME saved' : `Using default (${Math.round(holdPressTimeDefault * 1000)} ms)`,
            holdPressTimeSeconds,
            onHoldPressTimeChange
          )}
          {renderRow(
            'Double press window',
            doublePressWindowIsCustom ? 'Custom DBL_PRESS_WINDOW saved' : `Using default (${Math.round(holdPressTimeDefault * 1000)} ms)`,
            doublePressWindowSeconds,
            onDoublePressWindowChange
          )}
          {renderRow(
            'Simultaneous press window',
            simPressWindowIsCustom ? 'Custom SIM_PRESS_WINDOW saved' : `Using default (${Math.round(holdPressTimeDefault * 1000)} ms)`,
            simPressWindowSeconds,
            onSimPressWindowChange
          )}
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
