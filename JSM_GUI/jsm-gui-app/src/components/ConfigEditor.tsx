type ConfigEditorProps = {
  value: string
  label: string
  disabled?: boolean
  hasPendingChanges: boolean
  statusMessage?: string | null
  onChange: (value: string) => void
  onApply: () => void
  onCancel: () => void
}

import { Card } from './Card'
import { SectionActions } from './SectionActions'
import styles from './ConfigEditor.module.css'

export function ConfigEditor({
  value,
  label,
  disabled = false,
  hasPendingChanges,
  statusMessage,
  onChange,
  onApply,
  onCancel,
}: ConfigEditorProps) {
  return (
    <Card className={`${styles.configPanel} config-panel legacy`}>
      <label>
        {label}
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={12} disabled={disabled} />
      </label>
      <SectionActions
        className={`${styles.configActions} config-actions`}
        hasPendingChanges={hasPendingChanges}
        statusMessage={statusMessage}
        onApply={onApply}
        onCancel={onCancel}
        applyDisabled={disabled}
        pendingMessage="Pending changes — click Apply to send to JoyShockMapper."
      />
    </Card>
  )
}
