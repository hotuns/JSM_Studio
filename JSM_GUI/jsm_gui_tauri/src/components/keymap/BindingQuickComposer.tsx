import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BindingCommand,
  BindingCommandPatch,
  BindingOutputKind,
  BindingTriggerKind,
} from '../../utils/bindingCommands'
import keymapStyles from '../Keymap.module.css'
import { BindingCommandEditor } from './BindingCommandEditor'

type Option = { value: string; label: string; disabled?: boolean }

type BindingQuickComposerProps = {
  command: BindingCommand
  modifierOptions: Option[]
  specialOptions: Option[]
  isCapturing: boolean
  captureLabel: string
  onChange: (patch: BindingCommandPatch) => void
  onCapture: () => void
}

const PRIMARY_TRIGGERS: Array<{ value: BindingTriggerKind; labelKey: string }> = [
  { value: 'regular', labelKey: 'keymap.commandTriggerRegular' },
  { value: 'tap', labelKey: 'keymap.commandTriggerTap' },
  { value: 'hold', labelKey: 'keymap.commandTriggerHold' },
  { value: 'double', labelKey: 'keymap.commandTriggerDouble' },
  { value: 'chord', labelKey: 'keymap.commandTriggerChord' },
]

const ADVANCED_TRIGGERS: Array<{ value: BindingTriggerKind; labelKey: string }> = [
  { value: 'release', labelKey: 'keymap.commandTriggerRelease' },
  { value: 'turbo', labelKey: 'keymap.commandTriggerTurbo' },
  { value: 'simultaneous', labelKey: 'keymap.commandTriggerSimultaneous' },
  { value: 'diagonal', labelKey: 'keymap.commandTriggerDiagonal' },
]

const OUTPUT_KIND_OPTIONS: Array<{ value: BindingOutputKind; labelKey: string }> = [
  { value: 'keyboard', labelKey: 'keymap.commandOutputKeyboard' },
  { value: 'mouse', labelKey: 'keymap.commandOutputMouse' },
  { value: 'wheel', labelKey: 'keymap.commandOutputWheel' },
  { value: 'special', labelKey: 'keymap.commandOutputSpecial' },
  { value: 'command', labelKey: 'keymap.commandOutputCommand' },
  { value: 'raw', labelKey: 'keymap.commandOutputRaw' },
]

const mouseOptions = ['LMOUSE', 'MMOUSE', 'RMOUSE', 'BMOUSE', 'FMOUSE']
const wheelOptions = ['SCROLLUP', 'SCROLLDOWN']
const conditionTriggers = new Set<BindingTriggerKind>(['chord', 'simultaneous', 'diagonal'])

export function BindingQuickComposer({
  command,
  modifierOptions,
  specialOptions,
  isCapturing,
  captureLabel,
  onChange,
  onCapture,
}: BindingQuickComposerProps) {
  const { t } = useTranslation()
  const [advancedOpen, setAdvancedOpen] = useState(command.outputKind === 'raw' || command.outputKind === 'command')
  const canCapture = command.outputKind === 'keyboard' || command.outputKind === 'mouse' || command.outputKind === 'wheel'
  const showCondition = conditionTriggers.has(command.triggerKind)
  const triggerOptions = PRIMARY_TRIGGERS.some(option => option.value === command.triggerKind)
    ? PRIMARY_TRIGGERS
    : [...PRIMARY_TRIGGERS, ...ADVANCED_TRIGGERS]

  const handleOutputKindChange = (nextOutputKind: BindingOutputKind) => {
    if (nextOutputKind === command.outputKind) return
    onChange({ outputKind: nextOutputKind, outputValue: '' })
  }

  const renderOutputValue = () => {
    if (command.outputKind === 'mouse') {
      return (
        <select
          className="app-select"
          value={command.outputValue}
          onChange={(event) => onChange({ outputValue: event.target.value })}
          data-capture-ignore="true"
        >
          <option value="">{t('keymap.commandNoOutput')}</option>
          {mouseOptions.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      )
    }
    if (command.outputKind === 'wheel') {
      return (
        <select
          className="app-select"
          value={command.outputValue}
          onChange={(event) => onChange({ outputValue: event.target.value })}
          data-capture-ignore="true"
        >
          <option value="">{t('keymap.commandNoOutput')}</option>
          {wheelOptions.map(value => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      )
    }
    if (command.outputKind === 'special') {
      return (
        <select
          className="app-select"
          value={command.outputValue}
          onChange={(event) => onChange({ outputValue: event.target.value })}
          data-capture-ignore="true"
        >
          <option value="">{t('keymap.commandNoOutput')}</option>
          {specialOptions.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
          ))}
        </select>
      )
    }
    return (
      <input
        type="text"
        value={command.outputValue}
        onChange={(event) => onChange({ outputValue: event.target.value })}
        placeholder={command.outputKind === 'command' ? t('keymap.advancedCommandPlaceholder') : t('keymap.quickOutputPlaceholder')}
        data-capture-ignore="true"
      />
    )
  }

  return (
    <div className={keymapStyles.quickComposer}>
      <div className={keymapStyles.quickComposerGroup} data-capture-ignore="true">
        <div className={keymapStyles.quickComposerLabel}>{t('keymap.commandTrigger')}</div>
        <div className={keymapStyles.segmentedControl}>
          {triggerOptions.map(option => (
            <button
              key={option.value}
              type="button"
              className={`${keymapStyles.segmentButton} ${command.triggerKind === option.value ? keymapStyles.segmentButtonActive : ''}`}
              onClick={() => onChange({ triggerKind: option.value, conditionInput: conditionTriggers.has(option.value) ? command.conditionInput : undefined })}
              disabled={command.triggerKind === 'stickShift'}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {showCondition && (
        <label className={keymapStyles.quickComposerField} data-capture-ignore="true">
          <span>{t('keymap.commandCondition')}</span>
          <select
            className="app-select"
            value={command.conditionInput ?? ''}
            onChange={(event) => onChange({ conditionInput: event.target.value })}
          >
            {modifierOptions.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
            ))}
          </select>
        </label>
      )}

      <div className={keymapStyles.quickComposerCaptureRow}>
        <button
          type="button"
          className={keymapStyles.capturePad}
          onClick={onCapture}
          disabled={!canCapture || command.triggerKind === 'stickShift'}
        >
          <span>{isCapturing ? captureLabel : t('keymap.quickCapturePrompt')}</span>
          <strong>{command.outputValue || t('keymap.commandNoOutput')}</strong>
        </button>
        <div className={keymapStyles.outputKindChips} data-capture-ignore="true">
          {OUTPUT_KIND_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              className={`${keymapStyles.outputKindChip} ${command.outputKind === option.value ? keymapStyles.outputKindChipActive : ''}`}
              onClick={() => handleOutputKindChange(option.value)}
              disabled={command.triggerKind === 'stickShift'}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <label className={keymapStyles.quickComposerField}>
        <span>{t('keymap.commandOutputValue')}</span>
        {renderOutputValue()}
      </label>

      <div className={keymapStyles.quickAdvanced} data-capture-ignore="true">
        <button type="button" className="link-btn" onClick={() => setAdvancedOpen(open => !open)}>
          {advancedOpen ? t('keymap.quickHideAdvanced') : t('keymap.quickShowAdvanced')}
        </button>
      </div>

      {advancedOpen && (
        <BindingCommandEditor
          command={command}
          modifierOptions={modifierOptions}
          specialOptions={specialOptions}
          isCapturing={isCapturing}
          captureLabel={captureLabel}
          onChange={onChange}
          onCapture={onCapture}
        />
      )}
    </div>
  )
}
