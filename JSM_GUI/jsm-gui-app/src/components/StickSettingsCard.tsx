import { ReactNode, useEffect, useRef, useState } from 'react'
import { STICK_MODE_VALUES, formatStickModeLabel } from '../constants/sticks'
import styles from './Sticks.module.css'

type StickSettingsCardProps = {
  title: string
  innerValue: string
  outerValue: string
  defaultInner: string
  defaultOuter: string
  modeValue: string
  ringValue: string
  onModeChange: (value: string) => void
  onRingChange: (value: string) => void
  disabled?: boolean
  onInnerChange: (value: string) => void
  onOuterChange: (value: string) => void
  modeExtras?: ReactNode
}

const clamp = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function useDeadzoneDraft(propValue: string, onChange: (value: string) => void, min = 0, max = 1) {
  const [draft, setDraft] = useState(propValue)
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(propValue)
  }, [propValue])

  const handleChange = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      setDraft('')
      onChange('')
      return
    }
    // Allow partial decimals while typing without flushing to config
    if (trimmed.endsWith('.') || trimmed.endsWith('-')) {
      setDraft(raw)
      return
    }
    const numeric = Number(trimmed)
    if (!Number.isNaN(numeric)) {
      // Clamp here so the draft always matches what gets written to config
      const clamped = String(Math.max(min, Math.min(max, numeric)))
      setDraft(clamped)
      onChange(clamped)
    }
  }

  const handleBlur = () => {
    focused.current = false
    const trimmed = draft.trim()
    if (!trimmed) {
      onChange('')
      setDraft('')
    } else if (trimmed.endsWith('.') || Number.isNaN(Number(trimmed))) {
      // Revert incomplete/invalid input to the last known prop value
      setDraft(propValue)
    } else {
      onChange(draft)
    }
  }

  return { draft, handleChange, handleFocus: () => { focused.current = true }, handleBlur }
}

export function StickSettingsCard({
  title,
  innerValue,
  outerValue,
  defaultInner,
  defaultOuter,
  modeValue,
  ringValue,
  onModeChange,
  onRingChange,
  disabled = false,
  onInnerChange,
  onOuterChange,
  modeExtras,
}: StickSettingsCardProps) {
  const inner = useDeadzoneDraft(innerValue, onInnerChange)
  const outer = useDeadzoneDraft(outerValue, onOuterChange)

  const resolvedInner = clamp(parseFloat(innerValue || defaultInner))
  const resolvedOuter = clamp(parseFloat(outerValue || defaultOuter))

  const selectableStickModes = STICK_MODE_VALUES.filter(mode => mode !== 'NO_MOUSE')

  return (
    <div className={styles.stickModeCard} data-capture-ignore="true">
      <h3>{title}</h3>
      <label>
        Stick mode
        <select
          className="app-select"
          value={modeValue}
          onChange={(event) => onModeChange(event.target.value)}
          disabled={disabled}
        >
          <option value="">Default ({formatStickModeLabel('NO_MOUSE')})</option>
          {selectableStickModes.map(mode => (
            <option key={mode} value={mode}>
              {formatStickModeLabel(mode)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ring mode
        <select
          className="app-select"
          value={ringValue}
          onChange={(event) => onRingChange(event.target.value)}
          disabled={disabled}
        >
          <option value="">Default (OUTER)</option>
          <option value="INNER">Inner</option>
          <option value="OUTER">Outer</option>
        </select>
      </label>
      <label>
        Inner deadzone {innerValue ? '' : `(default ${defaultInner})`}
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={inner.draft}
          placeholder={defaultInner}
          onChange={(event) => inner.handleChange(event.target.value)}
          onFocus={inner.handleFocus}
          onBlur={inner.handleBlur}
          disabled={disabled}
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={resolvedInner}
          onChange={(event) => onInnerChange(event.target.value)}
          disabled={disabled}
        />
      </label>
      <label>
        Outer deadzone {outerValue ? '' : `(default ${defaultOuter})`}
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={outer.draft}
          placeholder={defaultOuter}
          onChange={(event) => outer.handleChange(event.target.value)}
          onFocus={outer.handleFocus}
          onBlur={outer.handleBlur}
          disabled={disabled}
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={resolvedOuter}
          onChange={(event) => onOuterChange(event.target.value)}
          disabled={disabled}
        />
      </label>
      {modeExtras && <div className={styles.stickModeExtras}>{modeExtras}</div>}
    </div>
  )
}
