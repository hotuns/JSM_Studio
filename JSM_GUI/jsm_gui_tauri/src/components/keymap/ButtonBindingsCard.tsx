import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BindingCommand,
  BindingCommandPatch,
  BindingCommandPreset,
  BindingTriggerKind,
  bindingCommandToToken,
  commandTokenPreview,
  createBindingCommandPreset,
  inferOutputKindFromBindingValue,
  parseRowsToCommands,
  updateCommandExpression,
} from '../../utils/bindingCommands'
import {
  BindingSlot,
  ButtonBindingRow,
  ManualRowInfo,
  ManualRowState,
  createBindingExpression,
  parseBindingExpression,
  removeBindingExpressionToken,
  serializeBindingExpression,
  serializeBindingToken,
} from '../../utils/keymap'
import keymapStyles from '../Keymap.module.css'
import {
  MODIFIER_SLOT_TYPES,
  getButtonDescription,
  getDefaultModifierForButton,
  getSpecialOptionList,
  type ButtonDefinition,
} from '../../keymap/schema'
import { BindingCommandCard } from './BindingCommandCard'
import { ButtonMappingCard } from './ButtonMappingCard'

type ButtonBindingsCardProps = {
  button: ButtonDefinition
  rows: ButtonBindingRow[]
  modifierOptions: { value: string; label: string; disabled?: boolean }[]
  specialsByButton: Record<string, string | undefined>
  stickModeShiftAssignments?: Record<string, { target: 'LEFT' | 'RIGHT'; mode: string }[]>
  stickShiftDisplayModes: Record<string, 'tap' | 'extra'>
  updateStickShiftDisplayMode: (buttonKey: string, mode?: 'tap' | 'extra') => void
  manualRows: Record<string, ManualRowState>
  ensureManualRow: (button: string, slot: BindingSlot, defaults?: Partial<ManualRowInfo>) => string
  updateManualRow: (button: string, slot: BindingSlot, rowId: string, info: Omit<ManualRowInfo, 'id'>) => void
  removeManualRow: (button: string, slot: BindingSlot, rowId?: string) => void
  getRowEditorMode: (button: string, slot: BindingSlot, rowId: string) => 'simple' | 'advanced' | undefined
  setRowEditorMode: (button: string, slot: BindingSlot, rowId: string, mode?: 'simple' | 'advanced') => void
  captureLabel: string
  isCapturing: (button: string, slot: BindingSlot, rowId?: string) => boolean
  isCapturingValue: (key: string) => boolean
  beginCapture: (
    button: string,
    slot: BindingSlot,
    rowId: string,
    label: string,
    modifier?: string,
    writeMode?: 'slot' | 'line'
  ) => void
  beginValueCapture: (key: string, label: string, onCaptured: (value: string) => void) => void
  cancelCapture: () => void
  onBindingChange: (
    button: string,
    slot: BindingSlot,
    rowId: string,
    value: string | null,
    options?: { modifier?: string; writeMode?: 'slot' | 'line' }
  ) => void
  onModifierChange: (
    button: string,
    slot: BindingSlot,
    rowId: string,
    previousModifier: string | undefined,
    nextModifier: string,
    binding: string | null
  ) => void
  onAssignSpecialAction: (special: string, buttonCommand: string) => void
  onClearSpecialAction: (special: string, buttonCommand: string) => void
  onStickModeShiftChange?: (button: string, target: 'LEFT' | 'RIGHT', mode?: string) => void
  trackballDecay: string
  onTrackballDecayChange: (value: string) => void
}

const triggerToSlot = (trigger: BindingTriggerKind): BindingSlot => {
  switch (trigger) {
    case 'hold':
      return 'hold'
    case 'double':
      return 'double'
    case 'chord':
      return 'chord'
    case 'simultaneous':
      return 'simultaneous'
    case 'diagonal':
      return 'diagonal'
    case 'regular':
    case 'tap':
    case 'release':
    case 'turbo':
    case 'stickShift':
    default:
      return 'tap'
  }
}

const triggerUsesBaseLine = (trigger: BindingTriggerKind) =>
  trigger === 'regular' || trigger === 'tap' || trigger === 'hold' || trigger === 'release' || trigger === 'turbo'

const hasOutputValue = (command: Pick<BindingCommandPreset, 'outputValue'>) => command.outputValue.trim().length > 0

export const ButtonBindingsCard = ({
  button,
  rows,
  modifierOptions,
  specialsByButton,
  stickModeShiftAssignments,
  updateStickShiftDisplayMode,
  ensureManualRow,
  updateManualRow,
  removeManualRow,
  captureLabel,
  isCapturing,
  isCapturingValue,
  beginValueCapture,
  onBindingChange,
  onAssignSpecialAction,
  onClearSpecialAction,
  onStickModeShiftChange,
  trackballDecay,
  onTrackballDecayChange,
}: ButtonBindingsCardProps) => {
  const { t } = useTranslation()
  const buttonKey = button.command.toUpperCase()
  const specialKey = specialsByButton[button.command]
  const stickShiftEntries = useMemo(
    () => stickModeShiftAssignments?.[buttonKey] ?? [],
    [buttonKey, stickModeShiftAssignments]
  )
  const specialOptionList = useMemo(
    () => [
      { value: 'NONE', label: 'NONE' },
      { value: 'DEFAULT', label: 'DEFAULT' },
      { value: 'CALIBRATE', label: 'CALIBRATE' },
      ...getSpecialOptionList(t),
    ].filter((option, index, source) => source.findIndex(candidate => candidate.value === option.value) === index),
    [t]
  )
  const commands = useMemo(
    () => parseRowsToCommands(rows, button.command, { specialKey, stickShiftAssignments: stickShiftEntries }),
    [button.command, rows, specialKey, stickShiftEntries]
  )
  const rowCapturing = rows.some(row => isCapturing(button.command, row.slot, row.id)) || commands.some(command => isCapturingValue(command.id))
  const buttonHasTrackball = commands.some(command => command.outputValue.toUpperCase().includes('TRACK'))
  const trackballSliderValue = trackballDecay && !Number.isNaN(Number(trackballDecay)) ? Number(trackballDecay) : 1
  const defaultModifier = getDefaultModifierForButton(button.command, modifierOptions)

  const addCommandToBaseLine = (preset: BindingCommandPreset) => {
    if (!hasOutputValue(preset)) return
    const baseRow = rows.find(row => row.slot === 'tap')
    const existingTokens = baseRow?.expression?.tokens ?? []
    const token = bindingCommandToToken(preset)
    const expression = createBindingExpression([...existingTokens, token])
    onBindingChange(button.command, 'tap', baseRow?.id ?? `${button.command}-tap`, serializeBindingExpression(expression), { writeMode: 'line' })
  }

  const commandSlot = (trigger: BindingTriggerKind) => (triggerUsesBaseLine(trigger) ? 'tap' : triggerToSlot(trigger))

  const manualInfoForCommand = (command: BindingCommandPreset, modifier?: string): Omit<ManualRowInfo, 'id'> => ({
    modifierCommand: modifier,
    manualTriggerKind: command.triggerKind,
    manualOutputKind: command.outputKind,
    manualOutputBehavior: command.outputBehavior,
    manualOutputValue: command.outputValue,
  })

  const addDraftCommand = (preset: BindingCommandPreset) => {
    if (preset.triggerKind === 'stickShift') {
      onStickModeShiftChange?.(button.command, 'RIGHT', 'NO_MOUSE')
      updateStickShiftDisplayMode(buttonKey, 'extra')
      return
    }
    const slot = commandSlot(preset.triggerKind)
    const modifier = MODIFIER_SLOT_TYPES.includes(slot) ? preset.conditionInput || defaultModifier : preset.conditionInput
    ensureManualRow(button.command, slot, manualInfoForCommand({ ...preset, conditionInput: modifier }, modifier))
  }

  const writeCommand = (preset: BindingCommandPreset) => {
    if (preset.triggerKind === 'stickShift') {
      onStickModeShiftChange?.(button.command, 'RIGHT', 'NO_MOUSE')
      updateStickShiftDisplayMode(buttonKey, 'extra')
      return
    }
    if (!hasOutputValue(preset)) {
      addDraftCommand(preset)
      return
    }
    if (triggerUsesBaseLine(preset.triggerKind)) {
      addCommandToBaseLine(preset)
      return
    }
    const slot = triggerToSlot(preset.triggerKind)
    const modifier = MODIFIER_SLOT_TYPES.includes(slot) ? preset.conditionInput || defaultModifier : undefined
    const rowId = ensureManualRow(button.command, slot, modifier ? { modifierCommand: modifier } : undefined)
    onBindingChange(button.command, slot, rowId, serializeBindingToken(bindingCommandToToken(preset)), modifier ? { modifier } : undefined)
  }

  const removeCommand = (command: BindingCommand) => {
    if (command.source.kind === 'special') {
      onClearSpecialAction(command.source.specialKey, button.command)
      return
    }
    if (command.source.kind === 'stickShift') {
      onStickModeShiftChange?.(button.command, command.source.target)
      updateStickShiftDisplayMode(buttonKey, undefined)
      return
    }
    if (command.source.isManual && !command.source.expression) {
      removeManualRow(button.command, command.source.slot, command.source.rowId)
      return
    }
    if (command.source.writeMode === 'line' && command.source.expression && command.source.expression.tokens.length > 1) {
      const expression = removeBindingExpressionToken(command.source.expression, command.source.tokenIndex)
      onBindingChange(
        button.command,
        command.source.slot,
        command.source.rowId,
        expression ? serializeBindingExpression(expression) : null,
        { modifier: command.conditionInput, writeMode: 'line' }
      )
      return
    }
    onBindingChange(
      button.command,
      command.source.slot,
      command.source.rowId,
      null,
      command.conditionInput ? { modifier: command.conditionInput, writeMode: command.source.writeMode } : { writeMode: command.source.writeMode }
    )
    if (command.source.isManual) {
      removeManualRow(button.command, command.source.slot, command.source.rowId)
    }
  }

  const updateDraftCommand = (command: BindingCommand, nextCommand: BindingCommand) => {
    if (command.source.kind !== 'row') return
    const slot = commandSlot(nextCommand.triggerKind)
    const modifier = MODIFIER_SLOT_TYPES.includes(slot) ? nextCommand.conditionInput || defaultModifier : nextCommand.conditionInput
    const info = manualInfoForCommand({ ...nextCommand, conditionInput: modifier }, modifier)
    if (slot !== command.source.slot) {
      removeManualRow(button.command, command.source.slot, command.source.rowId)
      ensureManualRow(button.command, slot, { id: command.source.rowId, ...info })
      return
    }
    updateManualRow(button.command, command.source.slot, command.source.rowId, info)
  }

  const updateCommand = (command: BindingCommand, patch: BindingCommandPatch) => {
    const nextCommand = { ...command, ...patch }
    if (command.source.kind === 'special') {
      if (nextCommand.outputKind === 'special') {
        onAssignSpecialAction(nextCommand.outputValue, button.command)
      }
      return
    }
    if (command.source.kind === 'stickShift') return

    if (command.source.isManual && !command.source.expression) {
      if (!hasOutputValue(nextCommand)) {
        updateDraftCommand(command, nextCommand)
        return
      }
      writeCommand({
        triggerKind: nextCommand.triggerKind,
        outputKind: nextCommand.outputKind,
        outputValue: nextCommand.outputValue,
        outputBehavior: nextCommand.outputBehavior,
        conditionInput: nextCommand.conditionInput,
      })
      removeManualRow(button.command, command.source.slot, command.source.rowId)
      return
    }

    const expression = updateCommandExpression(command, patch)
    if (!expression) return
    const nextValue = serializeBindingExpression(expression)
    const targetSlot = commandSlot(nextCommand.triggerKind)
    const shouldWriteLine =
      command.source.writeMode === 'line' ||
      triggerUsesBaseLine(nextCommand.triggerKind) ||
      command.source.slot !== targetSlot

    if (shouldWriteLine) {
      if (command.source.slot !== 'tap' && targetSlot !== command.source.slot) {
        removeCommand(command)
        writeCommand({
          triggerKind: nextCommand.triggerKind,
          outputKind: nextCommand.outputKind,
          outputValue: nextCommand.outputValue,
          outputBehavior: nextCommand.outputBehavior,
          conditionInput: nextCommand.conditionInput,
        })
        return
      }
      onBindingChange(button.command, command.source.slot, command.source.rowId, nextValue, {
        modifier: nextCommand.conditionInput,
        writeMode: 'line',
      })
      return
    }

    if (command.source.slot !== targetSlot) {
      removeCommand(command)
      writeCommand({
        triggerKind: nextCommand.triggerKind,
        outputKind: nextCommand.outputKind,
        outputValue: nextCommand.outputValue,
        outputBehavior: nextCommand.outputBehavior,
        conditionInput: nextCommand.conditionInput,
      })
      return
    }

    if (nextCommand.conditionInput && command.source.modifierCommand && nextCommand.conditionInput !== command.source.modifierCommand) {
      updateManualRow(button.command, command.source.slot, command.source.rowId, { modifierCommand: nextCommand.conditionInput })
    }
    onBindingChange(button.command, command.source.slot, command.source.rowId, commandTokenPreview(nextCommand), {
      modifier: nextCommand.conditionInput,
      writeMode: command.source.writeMode,
    })
  }

  const duplicateCommand = (command: BindingCommand) => {
    writeCommand({
      triggerKind: command.triggerKind,
      outputKind: command.outputKind,
      outputValue: command.outputValue,
      outputBehavior: command.outputBehavior,
      conditionInput: command.conditionInput,
    })
  }

  const captureCommand = (command: BindingCommand) => {
    beginValueCapture(command.id, t('keymap.anyBindingPrompt'), value => {
      const token = parseBindingExpression(value)?.tokens[0]
      updateCommand(command, {
        outputKind:
          token?.kind === 'mouse'
            ? 'mouse'
            : token?.kind === 'wheel'
              ? 'wheel'
              : token?.kind === 'special'
                ? 'special'
                : inferOutputKindFromBindingValue(token?.value ?? value),
        outputValue: token?.value ?? value,
      })
    })
  }

  const handleAddCommand = (trigger: BindingTriggerKind | 'script') => {
    if (trigger === 'script') {
      addDraftCommand(createBindingCommandPreset('regular', { outputKind: 'command', outputValue: '' }))
      return
    }
    addDraftCommand(createBindingCommandPreset(trigger, trigger === 'chord' || trigger === 'simultaneous' || trigger === 'diagonal'
      ? { conditionInput: defaultModifier }
      : undefined))
  }

  const addControl = (
    <div className={keymapStyles.addCommandRow} data-capture-ignore="true">
      <div className={keymapStyles.addCommandLabel}>{t('keymap.addCommand')}</div>
      <div className={keymapStyles.addCommandButtons}>
        <button type="button" className="secondary-btn" onClick={() => handleAddCommand('regular')}>{t('keymap.commandTriggerRegular')}</button>
        <button type="button" className="secondary-btn" onClick={() => handleAddCommand('tap')}>{t('keymap.commandTriggerTap')}</button>
        <button type="button" className="secondary-btn" onClick={() => handleAddCommand('hold')}>{t('keymap.commandTriggerHold')}</button>
        <button type="button" className="secondary-btn" onClick={() => handleAddCommand('double')}>{t('keymap.commandTriggerDouble')}</button>
        <button type="button" className="secondary-btn" onClick={() => handleAddCommand('chord')}>{t('keymap.commandTriggerChord')}</button>
      </div>
      <details className={keymapStyles.addCommandAdvanced}>
        <summary>{t('keymap.quickShowAdvanced')}</summary>
        <div className={keymapStyles.addCommandButtons}>
          <button type="button" className="secondary-btn" onClick={() => handleAddCommand('simultaneous')}>{t('keymap.commandTriggerSimultaneous')}</button>
          <button type="button" className="secondary-btn" onClick={() => handleAddCommand('diagonal')}>{t('keymap.commandTriggerDiagonal')}</button>
          {onStickModeShiftChange && <button type="button" className="secondary-btn" onClick={() => handleAddCommand('stickShift')}>{t('keymap.commandAddStickShift')}</button>}
          <button type="button" className="secondary-btn" onClick={() => handleAddCommand('script')}>{t('keymap.commandAddScript')}</button>
        </div>
      </details>
    </div>
  )

  const extras = (
    <>
      {buttonHasTrackball && (
        <div className={keymapStyles.trackballInline} data-capture-ignore="true">
          <label>
            {t('keymap.trackballDecay')}
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={trackballDecay}
              onChange={(event) => onTrackballDecayChange(event.target.value)}
              placeholder={t('common.defaultValue', { value: '1.0' })}
            />
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={trackballSliderValue}
            onChange={(event) => onTrackballDecayChange(event.target.value)}
          />
        </div>
      )}
    </>
  )

  return (
    <ButtonMappingCard
      title={button.playstation === button.xbox ? button.playstation : `${button.playstation} / ${button.xbox}`}
      description={getButtonDescription(button, t)}
      isCapturing={rowCapturing}
      addControl={addControl}
      extras={extras}
      commands={
        commands.length > 0 ? (
          commands.map(command => (
            <BindingCommandCard
              key={command.id}
              command={command}
              modifierOptions={modifierOptions}
              specialOptions={specialOptionList}
              isCapturing={isCapturingValue(command.id)}
              captureLabel={captureLabel}
              onUpdate={updateCommand}
              onRemove={removeCommand}
              onDuplicate={duplicateCommand}
              onCapture={captureCommand}
            />
          ))
        ) : (
          <div className={keymapStyles.commandEmptyState}>{t('keymap.commandEmptyState')}</div>
        )
      }
    />
  )
}
