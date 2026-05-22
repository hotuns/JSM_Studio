import {
  BindingActionModifier,
  BindingEventModifier,
  BindingExpression,
  BindingSlot,
  BindingToken,
  BindingTokenKind,
  ButtonBindingRow,
  StickModeShiftAssignment,
  createBindingExpression,
  createBindingToken,
  parseBindingExpression,
  serializeBindingExpression,
  serializeBindingToken,
  updateBindingExpressionToken,
} from './keymap'

export type BindingTriggerKind =
  | 'regular'
  | 'tap'
  | 'hold'
  | 'double'
  | 'release'
  | 'turbo'
  | 'chord'
  | 'simultaneous'
  | 'diagonal'
  | 'stickShift'

export type BindingOutputKind = 'keyboard' | 'mouse' | 'wheel' | 'special' | 'command' | 'raw'
export type BindingOutputBehavior = 'normal' | 'tapOnce' | 'toggle' | 'releaseOnly'

export type BindingCommandSource =
  | {
      kind: 'row'
      slot: BindingSlot
      rowId: string
      writeMode: 'slot' | 'line'
      modifierCommand?: string
      expression: BindingExpression | null
      tokenIndex: number
      lineValue: string
      isManual: boolean
    }
  | {
      kind: 'special'
      specialKey: string
    }
  | {
      kind: 'stickShift'
      target: 'LEFT' | 'RIGHT'
      mode: string
    }

export type BindingCommand = {
  id: string
  physicalInput: string
  triggerKind: BindingTriggerKind
  outputKind: BindingOutputKind
  outputValue: string
  outputBehavior: BindingOutputBehavior
  conditionInput?: string
  tokens: BindingToken[]
  sourceLine: string
  isRoundTripSafe: boolean
  source: BindingCommandSource
}

export type BindingCommandPatch = Partial<
  Pick<BindingCommand, 'triggerKind' | 'outputKind' | 'outputValue' | 'outputBehavior' | 'conditionInput'>
>

export type BindingCommandPreset = Pick<
  BindingCommand,
  'triggerKind' | 'outputKind' | 'outputValue' | 'outputBehavior' | 'conditionInput'
>

const TRIGGER_KINDS = new Set<BindingTriggerKind>([
  'regular',
  'tap',
  'hold',
  'double',
  'release',
  'turbo',
  'chord',
  'simultaneous',
  'diagonal',
  'stickShift',
])

const OUTPUT_KINDS = new Set<BindingOutputKind>(['keyboard', 'mouse', 'wheel', 'special', 'command', 'raw'])
const OUTPUT_BEHAVIORS = new Set<BindingOutputBehavior>(['normal', 'tapOnce', 'toggle', 'releaseOnly'])
const MOUSE_OUTPUT_VALUES = new Set(['LMOUSE', 'MMOUSE', 'RMOUSE', 'BMOUSE', 'FMOUSE'])
const WHEEL_OUTPUT_VALUES = new Set(['SCROLLUP', 'SCROLLDOWN'])

export const inferOutputKindFromBindingValue = (value: string): BindingOutputKind => {
  const normalized = value.trim().toUpperCase()
  if (MOUSE_OUTPUT_VALUES.has(normalized)) return 'mouse'
  if (WHEEL_OUTPUT_VALUES.has(normalized)) return 'wheel'
  return 'keyboard'
}

const EVENT_TO_TRIGGER: Record<BindingEventModifier, BindingTriggerKind | undefined> = {
  '': undefined,
  '\\': 'regular',
  '/': 'release',
  "'": 'tap',
  _: 'hold',
  '+': 'turbo',
}

const TRIGGER_TO_EVENT: Partial<Record<BindingTriggerKind, BindingEventModifier>> = {
  regular: '',
  tap: "'",
  hold: '_',
  release: '/',
  turbo: '+',
}

const ACTION_TO_BEHAVIOR: Record<BindingActionModifier, BindingOutputBehavior> = {
  '': 'normal',
  '!': 'tapOnce',
  '^': 'toggle',
  '-': 'releaseOnly',
}

const BEHAVIOR_TO_ACTION: Record<BindingOutputBehavior, BindingActionModifier> = {
  normal: '',
  tapOnce: '!',
  toggle: '^',
  releaseOnly: '-',
}

const COMBO_SEPARATOR_BY_TRIGGER: Partial<Record<BindingTriggerKind, string>> = {
  chord: ',',
  simultaneous: '+',
  diagonal: '*',
}

const triggerFromSlot = (slot: BindingSlot): BindingTriggerKind => {
  switch (slot) {
    case 'hold':
      return 'hold'
    case 'double':
      return 'double'
    case 'chord':
    case 'simultaneous':
    case 'diagonal':
      return slot
    case 'tap':
    default:
      return 'regular'
  }
}

const outputKindFromToken = (token: BindingToken): BindingOutputKind => {
  switch (token.kind) {
    case 'mouse':
      return 'mouse'
    case 'wheel':
      return 'wheel'
    case 'special':
      return 'special'
    case 'console_command':
      return 'command'
    case 'raw_literal':
      return 'raw'
    case 'input':
    default:
      return 'keyboard'
  }
}

const tokenKindFromOutput = (kind: BindingOutputKind): BindingTokenKind => {
  switch (kind) {
    case 'mouse':
      return 'mouse'
    case 'wheel':
      return 'wheel'
    case 'special':
      return 'special'
    case 'command':
      return 'console_command'
    case 'raw':
      return 'raw_literal'
    case 'keyboard':
    default:
      return 'input'
  }
}

const defaultFallbackTrigger = (row: ButtonBindingRow, tokenIndex: number, tokenCount: number): BindingTriggerKind => {
  if (row.slot !== 'tap') return triggerFromSlot(row.slot)
  if (tokenCount === 2) return tokenIndex === 0 ? 'tap' : 'hold'
  return 'regular'
}

const tokenToCommandTrigger = (token: BindingToken, row: ButtonBindingRow, tokenIndex: number, tokenCount: number) =>
  EVENT_TO_TRIGGER[token.eventModifier] ?? defaultFallbackTrigger(row, tokenIndex, tokenCount)

const sourceLineForRow = (button: string, row: ButtonBindingRow) => {
  if (row.slot === 'double') return `${button},${button}`
  if ((row.slot === 'chord' || row.slot === 'simultaneous' || row.slot === 'diagonal') && row.modifierCommand) {
    return `${row.modifierCommand}${COMBO_SEPARATOR_BY_TRIGGER[row.slot]}${button}`
  }
  return button
}

const rowExpressionForCommands = (row: ButtonBindingRow) => {
  if (row.writeMode === 'line' && row.expression) return row.expression
  if (row.editorMode === 'advanced' && row.expression) return row.expression
  if (row.binding) return parseBindingExpression(row.binding)
  return null
}

const rowTokensForCommands = (row: ButtonBindingRow) => {
  const expression = rowExpressionForCommands(row)
  if (!expression) return []
  if (expression === row.expression && row.writeMode === 'line') return expression.tokens
  return expression.tokens.slice(0, 1)
}

const manualTriggerKind = (row: ButtonBindingRow): BindingTriggerKind => {
  const candidate = row.manualTriggerKind
  return candidate && TRIGGER_KINDS.has(candidate as BindingTriggerKind)
    ? (candidate as BindingTriggerKind)
    : triggerFromSlot(row.slot)
}

const manualOutputKind = (row: ButtonBindingRow): BindingOutputKind => {
  const candidate = row.manualOutputKind
  return candidate && OUTPUT_KINDS.has(candidate as BindingOutputKind) ? (candidate as BindingOutputKind) : 'keyboard'
}

const manualOutputBehavior = (row: ButtonBindingRow): BindingOutputBehavior => {
  const candidate = row.manualOutputBehavior
  return candidate && OUTPUT_BEHAVIORS.has(candidate as BindingOutputBehavior)
    ? (candidate as BindingOutputBehavior)
    : 'normal'
}

function manualRowToCommand(row: ButtonBindingRow, physicalInput: string): BindingCommand {
  const outputKind = manualOutputKind(row)
  return {
    id: `${physicalInput}-${row.id}-draft`,
    physicalInput,
    triggerKind: manualTriggerKind(row),
    outputKind,
    outputValue: row.manualOutputValue ?? '',
    outputBehavior: manualOutputBehavior(row),
    conditionInput: row.modifierCommand,
    tokens: [],
    sourceLine: sourceLineForRow(physicalInput, row),
    isRoundTripSafe: outputKind !== 'raw',
    source: {
      kind: 'row',
      slot: row.slot,
      rowId: row.id,
      writeMode: row.writeMode,
      modifierCommand: row.modifierCommand,
      expression: null,
      tokenIndex: 0,
      lineValue: '',
      isManual: true,
    },
  }
}

export function bindingTokenToCommand(
  token: BindingToken,
  context: {
    physicalInput: string
    row: ButtonBindingRow
    expression: BindingExpression | null
    tokenIndex: number
    tokenCount: number
  }
): BindingCommand {
  const sourceLine = sourceLineForRow(context.physicalInput, context.row)
  const triggerKind = tokenToCommandTrigger(token, context.row, context.tokenIndex, context.tokenCount)
  const outputKind = outputKindFromToken(token)
  const lineValue = context.expression ? serializeBindingExpression(context.expression) : serializeBindingToken(token)
  return {
    id: `${context.physicalInput}-${context.row.id}-${context.tokenIndex}`,
    physicalInput: context.physicalInput,
    triggerKind,
    outputKind,
    outputValue: token.value,
    outputBehavior: ACTION_TO_BEHAVIOR[token.actionModifier],
    conditionInput: context.row.modifierCommand,
    tokens: [token],
    sourceLine,
    isRoundTripSafe: outputKind !== 'raw',
    source: {
      kind: 'row',
      slot: context.row.slot,
      rowId: context.row.id,
      writeMode: context.row.writeMode,
      modifierCommand: context.row.modifierCommand,
      expression: context.expression,
      tokenIndex: context.tokenIndex,
      lineValue,
      isManual: context.row.isManual,
    },
  }
}

export function bindingCommandToToken(command: BindingCommandPreset, fallback?: BindingToken): BindingToken {
  const kind = tokenKindFromOutput(command.outputKind)
  const eventModifier = TRIGGER_TO_EVENT[command.triggerKind] ?? fallback?.eventModifier ?? ''
  return {
    kind,
    value: command.outputValue || createBindingToken(kind).value,
    raw: '',
    actionModifier: BEHAVIOR_TO_ACTION[command.outputBehavior],
    eventModifier,
  }
}

export function commandTokenPreview(command: BindingCommand | BindingCommandPreset) {
  return serializeBindingToken(bindingCommandToToken(command, 'tokens' in command ? command.tokens[0] : undefined))
}

export function commandLinePreview(command: BindingCommand) {
  if (command.source.kind === 'special') return `${command.source.specialKey} = ${command.physicalInput}`
  if (command.source.kind === 'stickShift') return `${command.physicalInput},${command.source.target}_STICK_MODE = ${command.source.mode}`
  if (command.source.writeMode === 'line') return `${command.sourceLine} = ${command.source.lineValue}`
  return `${command.sourceLine} = ${commandTokenPreview(command)}`
}

export function updateCommandExpression(command: BindingCommand, patch: BindingCommandPatch) {
  if (command.source.kind !== 'row') return null
  const nextCommand = { ...command, ...patch }
  const nextToken = bindingCommandToToken(nextCommand, command.tokens[0])
  const expression =
    command.source.writeMode === 'line'
      ? command.source.expression ?? createBindingExpression(command.tokens)
      : createBindingExpression([command.tokens[0] ?? createBindingToken()])
  return updateBindingExpressionToken(expression, command.source.writeMode === 'line' ? command.source.tokenIndex : 0, nextToken)
}

export function parseRowsToCommands(
  rows: ButtonBindingRow[],
  physicalInput: string,
  options: {
    specialKey?: string
    stickShiftAssignments?: StickModeShiftAssignment[]
  } = {}
) {
  const commands: BindingCommand[] = []
  rows.forEach(row => {
    const expression = rowExpressionForCommands(row)
    const tokens = rowTokensForCommands(row)
    if (tokens.length === 0 && row.isManual) {
      commands.push(manualRowToCommand(row, physicalInput))
      return
    }
    tokens.forEach((token, index) => {
      commands.push(
        bindingTokenToCommand(token, {
          physicalInput,
          row,
          expression,
          tokenIndex: index,
          tokenCount: expression?.tokens.length ?? tokens.length,
        })
      )
    })
  })

  if (options.specialKey) {
    commands.push({
      id: `${physicalInput}-special-${options.specialKey}`,
      physicalInput,
      triggerKind: 'regular',
      outputKind: 'special',
      outputValue: options.specialKey,
      outputBehavior: 'normal',
      tokens: [],
      sourceLine: options.specialKey,
      isRoundTripSafe: true,
      source: { kind: 'special', specialKey: options.specialKey },
    })
  }

  options.stickShiftAssignments?.forEach(assignment => {
    commands.push({
      id: `${physicalInput}-stick-shift-${assignment.target}-${assignment.mode}`,
      physicalInput,
      triggerKind: 'stickShift',
      outputKind: 'special',
      outputValue: `STICK_SHIFT:${assignment.target}:${assignment.mode}`,
      outputBehavior: 'normal',
      conditionInput: assignment.target,
      tokens: [],
      sourceLine: `${physicalInput},${assignment.target}_STICK_MODE`,
      isRoundTripSafe: true,
      source: { kind: 'stickShift', target: assignment.target, mode: assignment.mode },
    })
  })

  return commands
}

export function createBindingCommandPreset(
  triggerKind: BindingTriggerKind,
  overrides: Partial<BindingCommandPreset> = {}
): BindingCommandPreset {
  return {
    triggerKind,
    outputKind: triggerKind === 'stickShift' ? 'special' : 'keyboard',
    outputValue: triggerKind === 'stickShift' ? 'STICK_SHIFT:RIGHT:NO_MOUSE' : '',
    outputBehavior: 'normal',
    ...overrides,
  }
}
