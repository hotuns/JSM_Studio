import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BindingCommand, BindingCommandPatch } from '../../utils/bindingCommands'
import keymapStyles from '../Keymap.module.css'
import { BindingQuickComposer } from './BindingQuickComposer'

type Option = { value: string; label: string; disabled?: boolean }

type BindingCommandCardProps = {
  command: BindingCommand
  modifierOptions: Option[]
  specialOptions: Option[]
  isCapturing: boolean
  captureLabel: string
  onUpdate: (command: BindingCommand, patch: BindingCommandPatch) => void
  onRemove: (command: BindingCommand) => void
  onDuplicate: (command: BindingCommand) => void
  onCapture: (command: BindingCommand) => void
}

const TRIGGER_LABEL_KEYS: Record<BindingCommand['triggerKind'], string> = {
  regular: 'keymap.commandTriggerRegular',
  tap: 'keymap.commandTriggerTap',
  hold: 'keymap.commandTriggerHold',
  double: 'keymap.commandTriggerDouble',
  release: 'keymap.commandTriggerRelease',
  turbo: 'keymap.commandTriggerTurbo',
  chord: 'keymap.commandTriggerChord',
  simultaneous: 'keymap.commandTriggerSimultaneous',
  diagonal: 'keymap.commandTriggerDiagonal',
  stickShift: 'keymap.stickModeShifts',
}

const BEHAVIOR_LABEL_KEYS: Record<BindingCommand['outputBehavior'], string> = {
  normal: 'keymap.commandBehaviorNormal',
  tapOnce: 'keymap.commandBehaviorTapOnce',
  toggle: 'keymap.commandBehaviorToggle',
  releaseOnly: 'keymap.commandBehaviorReleaseOnly',
}

const conditionPrefixKeys: Partial<Record<BindingCommand['triggerKind'], string>> = {
  chord: 'keymap.commandConditionChord',
  simultaneous: 'keymap.commandConditionSimultaneous',
  diagonal: 'keymap.commandConditionDiagonal',
}

export function BindingCommandCard({
  command,
  modifierOptions,
  specialOptions,
  isCapturing,
  captureLabel,
  onUpdate,
  onRemove,
  onDuplicate,
  onCapture,
}: BindingCommandCardProps) {
  const { t } = useTranslation()
  const isDraftCommand = command.source.kind === 'row' && command.source.isManual && !command.outputValue
  const [expanded, setExpanded] = useState(isDraftCommand)
  const triggerLabel = t(TRIGGER_LABEL_KEYS[command.triggerKind])
  const behaviorLabel = command.outputBehavior === 'normal' ? '' : t(BEHAVIOR_LABEL_KEYS[command.outputBehavior])
  const conditionLabel = command.conditionInput
    ? `${t(conditionPrefixKeys[command.triggerKind] ?? 'keymap.commandCondition')}: ${command.conditionInput}`
    : ''
  const outputLabel = command.outputValue || t('keymap.commandNoOutput')
  const summaryOutput = behaviorLabel ? `${behaviorLabel} ${outputLabel}` : outputLabel

  return (
    <div className={keymapStyles.commandCard}>
      <div className={keymapStyles.commandSummary}>
        <button type="button" className={keymapStyles.commandSummaryMain} onClick={() => setExpanded(value => !value)}>
          <span className={keymapStyles.commandTriggerBadge}>{triggerLabel}</span>
          {conditionLabel && <span className={keymapStyles.commandConditionBadge}>{conditionLabel}</span>}
          <span className={keymapStyles.commandArrow}>-&gt;</span>
          <span className={keymapStyles.commandOutputSummary}>{summaryOutput}</span>
          {!command.isRoundTripSafe && <span className={keymapStyles.commandRawBadge}>{t('keymap.commandRawSyntax')}</span>}
        </button>
        <div className={keymapStyles.commandActions} data-capture-ignore="true">
          <button type="button" className="link-btn" onClick={() => onDuplicate(command)}>
            {t('keymap.commandDuplicate')}
          </button>
          <button type="button" className={keymapStyles.advancedRemoveBtn} onClick={() => onRemove(command)}>
            {t('keymap.removeBinding')}
          </button>
        </div>
      </div>

      {expanded && (
        <BindingQuickComposer
          command={command}
          modifierOptions={modifierOptions}
          specialOptions={specialOptions}
          isCapturing={isCapturing}
          captureLabel={captureLabel}
          onChange={(patch) => onUpdate(command, patch)}
          onCapture={() => onCapture(command)}
        />
      )}
    </div>
  )
}
