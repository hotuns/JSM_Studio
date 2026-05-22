import { useTranslation } from 'react-i18next'
import {
  BindingCommand,
  BindingCommandPatch,
  BindingOutputBehavior,
  BindingOutputKind,
  BindingTriggerKind,
} from '../../utils/bindingCommands'
import keymapStyles from '../Keymap.module.css'

type Option = { value: string; label: string; disabled?: boolean }

type BindingCommandEditorProps = {
  command: BindingCommand
  modifierOptions: Option[]
  specialOptions: Option[]
  isCapturing: boolean
  captureLabel: string
  onChange: (patch: BindingCommandPatch) => void
  onCapture: () => void
}

const TRIGGER_OPTIONS: Array<{ value: BindingTriggerKind; labelKey: string }> = [
  { value: 'regular', labelKey: 'keymap.commandTriggerRegular' },
  { value: 'tap', labelKey: 'keymap.commandTriggerTap' },
  { value: 'hold', labelKey: 'keymap.commandTriggerHold' },
  { value: 'double', labelKey: 'keymap.commandTriggerDouble' },
  { value: 'release', labelKey: 'keymap.commandTriggerRelease' },
  { value: 'turbo', labelKey: 'keymap.commandTriggerTurbo' },
  { value: 'chord', labelKey: 'keymap.commandTriggerChord' },
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

const BEHAVIOR_OPTIONS: Array<{ value: BindingOutputBehavior; labelKey: string }> = [
  { value: 'normal', labelKey: 'keymap.commandBehaviorNormal' },
  { value: 'tapOnce', labelKey: 'keymap.commandBehaviorTapOnce' },
  { value: 'toggle', labelKey: 'keymap.commandBehaviorToggle' },
  { value: 'releaseOnly', labelKey: 'keymap.commandBehaviorReleaseOnly' },
]

const mouseOptions = ['LMOUSE', 'MMOUSE', 'RMOUSE', 'BMOUSE', 'FMOUSE']
const wheelOptions = ['SCROLLUP', 'SCROLLDOWN']
const conditionTriggers = new Set<BindingTriggerKind>(['chord', 'simultaneous', 'diagonal'])

export function BindingCommandEditor({
  command,
  modifierOptions,
  specialOptions,
  isCapturing,
  captureLabel,
  onChange,
  onCapture,
}: BindingCommandEditorProps) {
  const { t } = useTranslation()
  const canCapture = command.outputKind === 'keyboard' || command.outputKind === 'mouse' || command.outputKind === 'wheel'
  const showCondition = conditionTriggers.has(command.triggerKind)
  const handleOutputKindChange = (nextOutputKind: BindingOutputKind) => {
    if (nextOutputKind === command.outputKind) return
    onChange({ outputKind: nextOutputKind, outputValue: '' })
  }

  return (
    <div className={keymapStyles.commandEditor}>
      <label>
        <span>{t('keymap.commandTrigger')}</span>
        <select
          className="app-select"
          value={command.triggerKind}
          onChange={(event) => onChange({ triggerKind: event.target.value as BindingTriggerKind })}
          data-capture-ignore="true"
          disabled={command.triggerKind === 'stickShift'}
        >
          {TRIGGER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </label>

      {showCondition && (
        <label>
          <span>{t('keymap.commandCondition')}</span>
          <select
            className="app-select"
            value={command.conditionInput ?? ''}
            onChange={(event) => onChange({ conditionInput: event.target.value })}
            data-capture-ignore="true"
          >
            {modifierOptions.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        <span>{t('keymap.commandOutput')}</span>
        <select
          className="app-select"
          value={command.outputKind}
          onChange={(event) => handleOutputKindChange(event.target.value as BindingOutputKind)}
          data-capture-ignore="true"
          disabled={command.triggerKind === 'stickShift'}
        >
          {OUTPUT_KIND_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <label className={keymapStyles.commandOutputValue}>
        <span>{t('keymap.commandOutputValue')}</span>
        {command.outputKind === 'mouse' ? (
          <select
            className="app-select"
            value={command.outputValue}
            onChange={(event) => onChange({ outputValue: event.target.value })}
            data-capture-ignore="true"
          >
            <option value="">{t('keymap.commandNoOutput')}</option>
            {mouseOptions.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        ) : command.outputKind === 'wheel' ? (
          <select
            className="app-select"
            value={command.outputValue}
            onChange={(event) => onChange({ outputValue: event.target.value })}
            data-capture-ignore="true"
          >
            <option value="">{t('keymap.commandNoOutput')}</option>
            {wheelOptions.map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        ) : command.outputKind === 'special' ? (
          <select
            className="app-select"
            value={command.outputValue}
            onChange={(event) => onChange({ outputValue: event.target.value })}
            data-capture-ignore="true"
            disabled={command.triggerKind === 'stickShift'}
          >
            <option value="">{t('keymap.commandNoOutput')}</option>
            {specialOptions.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={command.outputValue}
            onChange={(event) => onChange({ outputValue: event.target.value })}
            placeholder={command.outputKind === 'command' ? t('keymap.advancedCommandPlaceholder') : t('keymap.advancedValuePlaceholder')}
            data-capture-ignore="true"
          />
        )}
      </label>

      {canCapture && (
        <button type="button" className={keymapStyles.commandCaptureBtn} onClick={onCapture}>
          {isCapturing ? captureLabel : t('keymap.captureToken')}
        </button>
      )}

      <label>
        <span>{t('keymap.commandBehavior')}</span>
        <select
          className="app-select"
          value={command.outputBehavior}
          onChange={(event) => onChange({ outputBehavior: event.target.value as BindingOutputBehavior })}
          data-capture-ignore="true"
          disabled={command.triggerKind === 'stickShift'}
        >
          {BEHAVIOR_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
