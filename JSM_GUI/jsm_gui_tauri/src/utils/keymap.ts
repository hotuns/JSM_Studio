import { bindingSpecialKeys } from '../constants/configKeys'

export interface SensitivityValues {
  inGameSens?: number
  realWorldCalibration?: number
  accelCurve?: string
  naturalVHalf?: number
  powerVRef?: number
  powerExponent?: number
  sigmoidMid?: number
  sigmoidWidth?: number
  jumpTau?: number
  minSensX?: number
  minSensY?: number
  maxSensX?: number
  maxSensY?: number
  minThreshold?: number
  maxThreshold?: number
  gyroSensX?: number
  gyroSensY?: number
  rollContribution?: number
  cutoffSpeed?: number
  cutoffRecovery?: number
  smoothTime?: number
  smoothThreshold?: number
  smoothingDecay?: string
  oneEuroFilter?: boolean
  oneEuroMinCutoff?: number
  oneEuroSpeedCoeff?: number
  angleSnap?: number
  angleSnapEase?: string
  decelBrakeStrength?: number
  decelBrakeThreshold?: number
  gyroSpace?: string
  gyroAxisX?: string
  gyroAxisY?: string
  tickTime?: number
}

const escapeKey = (key: string) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const LINE_REGEX = (key: string) => new RegExp(`^\\s*${escapeKey(key)}\\s*=\\s*(.+)$`, 'im')

function parseNumbers(value?: string, limit = Infinity) {
  if (!value) return []
  return value
    .trim()
    .split(/\s+/)
    .slice(0, limit)
    .map(token => parseFloat(token))
    .filter(num => Number.isFinite(num))
}

export function parseSensitivityValues(text: string, options?: { prefix?: string }): SensitivityValues {
  const keyWithPrefix = (key: string) => {
    if (!options?.prefix) return key
    return `${options.prefix}${key}`
  }
  const get = (key: string, limit = Infinity) => {
    const match = text.match(LINE_REGEX(keyWithPrefix(key)))
    return parseNumbers(match?.[1], limit)
  }
  const single = (key: string) => get(key, 1)[0]
  const raw = (key: string) => {
    const match = text.match(LINE_REGEX(keyWithPrefix(key)))
    return match?.[1]?.trim()
  }
  const accelCurveRaw = raw('ACCEL_CURVE')
  const accelCurve = accelCurveRaw ? accelCurveRaw.trim().toUpperCase() : undefined
  const naturalVHalf = single('ACCEL_NATURAL_VHALF')
  const powerVRef = single('ACCEL_POWER_VREF')
  const powerExponent = single('ACCEL_POWER_EXPONENT')
  const sigmoidMid = single('ACCEL_SIGMOID_MID')
  const sigmoidWidth = single('ACCEL_SIGMOID_WIDTH')
  const jumpTau = single('ACCEL_JUMP_TAU')
  const minSens = get('MIN_GYRO_SENS', 2)
  const maxSens = get('MAX_GYRO_SENS', 2)
  const staticSens = get('GYRO_SENS', 2)
  const rollContribution = single('ROLL_CONTRIBUTION')
  const angleSnap = single('GYRO_ANGLE_SNAP')
  const angleSnapEaseRaw = raw('GYRO_ANGLE_SNAP_EASE')
  const smoothingDecayRaw = raw('GYRO_SMOOTHING_DECAY')
  const oneEuroFilter = /^\s*ONE_EURO_FILTER\b/im.test(text)
  const decelBrakeStrength = single('DECEL_BRAKE_STRENGTH')
  const decelBrakeThreshold = single('DECEL_BRAKE_THRESHOLD')

  const result: SensitivityValues = {
    inGameSens: single('IN_GAME_SENS'),
    realWorldCalibration: single('REAL_WORLD_CALIBRATION'),
    minSensX: minSens[0],
    minSensY: minSens[1],
    maxSensX: maxSens[0],
    maxSensY: maxSens[1],
    minThreshold: single('MIN_GYRO_THRESHOLD'),
    maxThreshold: single('MAX_GYRO_THRESHOLD'),
    gyroSensX: staticSens[0],
    gyroSensY: staticSens[1],
    rollContribution,
    cutoffSpeed: single('GYRO_CUTOFF_SPEED'),
    cutoffRecovery: single('GYRO_CUTOFF_RECOVERY'),
    smoothTime: single('GYRO_SMOOTH_TIME'),
    smoothThreshold: single('GYRO_SMOOTH_THRESHOLD'),
    smoothingDecay: smoothingDecayRaw ? smoothingDecayRaw.toUpperCase() : undefined,
    oneEuroFilter: oneEuroFilter || undefined,
    oneEuroMinCutoff: single('ONE_EURO_MIN_CUTOFF'),
    oneEuroSpeedCoeff: single('ONE_EURO_SPEED_COEFF'),
    angleSnap,
    angleSnapEase: angleSnapEaseRaw ? angleSnapEaseRaw.toUpperCase() : undefined,
    decelBrakeStrength,
    decelBrakeThreshold,
    gyroSpace: raw('GYRO_SPACE'),
    gyroAxisX: raw('GYRO_AXIS_X'),
    gyroAxisY: raw('GYRO_AXIS_Y'),
    tickTime: single('TICK_TIME'),
    accelCurve,
    naturalVHalf,
    powerVRef,
    powerExponent,
    sigmoidMid,
    sigmoidWidth,
    jumpTau,
  }

  if (result.gyroSensX !== undefined) {
    result.minSensX = result.minSensX ?? result.gyroSensX
    result.maxSensX = result.maxSensX ?? result.gyroSensX
    if (result.minThreshold === undefined) {
      result.minThreshold = 0
    }
    if (result.maxThreshold === undefined) {
      result.maxThreshold = 50
    }
  }
  if (result.gyroSensY !== undefined) {
    result.minSensY = result.minSensY ?? result.gyroSensY
    result.maxSensY = result.maxSensY ?? result.gyroSensY
  }
  return result
}

function formatNumber(value: number | undefined, fractionDigits = 4) {
  if (!Number.isFinite(value)) return ''
  const fixed = value!.toFixed(fractionDigits)
  return fixed.replace(/\.?0+$/, '')
}

export function updateKeymapEntry(text: string, key: string, values: Array<number | string>) {
  const formatted = values
    .filter(v => v !== undefined && v !== null && `${v}`.length > 0)
    .map(v => (typeof v === 'number' ? formatNumber(v) : `${v}`.trim()))
    .join(' ')

  const nextLine = `${key} = ${formatted}`
  const lines = text.split(/\r?\n/)
  const index = lines.findIndex(line => line.trim().toUpperCase().startsWith(`${key.toUpperCase()} =`))
  if (index >= 0) {
    lines[index] = nextLine
  } else {
    lines.push(nextLine)
  }
  return lines.join('\n')
}

export function removeKeymapEntry(text: string, key: string) {
  const lines = text.split(/\r?\n/)
  const pattern = new RegExp(`^\\s*${escapeKey(key)}\\s*=`, 'i')
  const index = lines.findIndex(line => pattern.test(line))
  if (index >= 0) {
    lines.splice(index, 1)
  }
  return lines.join('\n')
}

function stripInlineComment(value?: string) {
  if (!value) return ''
  let quoted = false
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === '#' && !quoted) {
      return value.slice(0, index).trim()
    }
  }
  return value.trim()
}

export function getKeymapValue(text: string, key: string) {
  const match = text.match(LINE_REGEX(key))
  const value = stripInlineComment(match?.[1])
  return value || undefined
}

export type BindingSlot = 'tap' | 'hold' | 'double' | 'chord' | 'simultaneous' | 'diagonal'
export type BindingWriteMode = 'slot' | 'line'

export type BindingActionModifier = '' | '^' | '!' | '-'
export type BindingEventModifier = '' | '\\' | '/' | "'" | '_' | '+'
export type BindingTokenKind = 'input' | 'mouse' | 'wheel' | 'special' | 'console_command' | 'raw_literal'

export type BindingToken = {
  kind: BindingTokenKind
  value: string
  raw: string
  actionModifier: BindingActionModifier
  eventModifier: BindingEventModifier
}

export type BindingExpression = {
  raw: string
  tokens: BindingToken[]
}

export type ButtonBindingSet = {
  tap?: string
  hold?: string
  double?: string
}

export type ButtonBindingRow = {
  id: string
  slot: BindingSlot
  label: string
  binding: string | null
  expression: BindingExpression | null
  editorMode: 'simple' | 'advanced'
  writeMode: BindingWriteMode
  supportsAdvancedEditor: boolean
  canSwitchToSimple: boolean
  isManual: boolean
  modifierCommand?: string
  manualTriggerKind?: string
  manualOutputKind?: string
  manualOutputBehavior?: string
  manualOutputValue?: string
}

export type ManualRowInfo = {
  id: string
  modifierCommand?: string
  manualTriggerKind?: string
  manualOutputKind?: string
  manualOutputBehavior?: string
  manualOutputValue?: string
}

export type ManualRowState = Partial<Record<BindingSlot, ManualRowInfo[]>>

export type StickModeShiftAssignment = {
  target: 'LEFT' | 'RIGHT'
  mode: string
}

const SLOT_LABELS: Record<BindingSlot, string> = {
  tap: 'Tap',
  hold: 'Hold (press & hold)',
  double: 'Double Press',
  chord: 'Chorded Press',
  simultaneous: 'Simultaneous Press',
  diagonal: 'Diagonal Press',
}

const FACE_BUTTONS = ['N', 'E', 'S', 'W'] as const
const ACTION_MODIFIERS: BindingActionModifier[] = ['', '^', '!', '-']
const EVENT_MODIFIERS: BindingEventModifier[] = ['', '\\', '/', "'", '_', '+']
const ACTION_MODIFIER_SET = new Set(ACTION_MODIFIERS.filter(Boolean))
const EVENT_MODIFIER_SET = new Set(EVENT_MODIFIERS.filter(Boolean))
const MOUSE_BINDINGS = new Set(['LMOUSE', 'MMOUSE', 'RMOUSE', 'BMOUSE', 'FMOUSE'])
const WHEEL_BINDINGS = new Set(['SCROLLUP', 'SCROLLDOWN'])
const SPECIAL_BINDINGS = new Set([...bindingSpecialKeys, 'CALIBRATE', 'NONE', 'DEFAULT'].map(value => value.toUpperCase()))

const defaultTokenValueForKind = (kind: BindingTokenKind) => {
  switch (kind) {
    case 'mouse':
      return 'LMOUSE'
    case 'wheel':
      return 'SCROLLDOWN'
    case 'special':
      return 'NONE'
    case 'console_command':
      return 'GyroConfigs/example.txt'
    case 'raw_literal':
      return 'TOKEN'
    case 'input':
    default:
      return 'SPACE'
  }
}

const classifyBindingTokenKind = (value: string): BindingTokenKind => {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return 'raw_literal'
  if (MOUSE_BINDINGS.has(normalized)) return 'mouse'
  if (WHEEL_BINDINGS.has(normalized)) return 'wheel'
  if (SPECIAL_BINDINGS.has(normalized)) return 'special'
  if (/^[A-Z0-9_[\]`=;'",./\\-]+$/i.test(normalized)) return 'input'
  return 'raw_literal'
}

const tokenizeBindingExpression = (value?: string) => {
  const source = stripInlineComment(value)
  if (!source) return []
  const tokens: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (char === '"') {
      quoted = !quoted
      current += char
      continue
    }
    if (/\s/.test(char) && !quoted) {
      if (current.trim()) {
        tokens.push(current.trim())
      }
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) {
    tokens.push(current.trim())
  }

  return tokens
}

const parseBindingToken = (rawToken: string): BindingToken => {
  let actionModifier: BindingActionModifier = ''
  let eventModifier: BindingEventModifier = ''
  let remaining = rawToken.trim()

  if (remaining && ACTION_MODIFIER_SET.has(remaining[0] as BindingActionModifier)) {
    actionModifier = remaining[0] as BindingActionModifier
    remaining = remaining.slice(1)
  }
  if (remaining && EVENT_MODIFIER_SET.has(remaining[remaining.length - 1] as BindingEventModifier)) {
    eventModifier = remaining[remaining.length - 1] as BindingEventModifier
    remaining = remaining.slice(0, -1)
  }

  const trimmedValue = remaining.trim()
  if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"') && trimmedValue.length >= 2) {
    const value = trimmedValue.slice(1, -1)
    return {
      kind: 'console_command',
      value,
      raw: rawToken.trim(),
      actionModifier,
      eventModifier,
    }
  }

  const value = trimmedValue
  return {
    kind: classifyBindingTokenKind(value),
    value,
    raw: rawToken.trim(),
    actionModifier,
    eventModifier,
  }
}

export function parseBindingExpression(value?: string | null): BindingExpression | null {
  const raw = stripInlineComment(value ?? undefined)
  if (!raw) return null
  const tokens = tokenizeBindingExpression(raw).map(parseBindingToken)
  return {
    raw,
    tokens,
  }
}

const sanitizeConsoleCommandValue = (value: string) => value.trim().replace(/^"+|"+$/g, '')

export function serializeBindingToken(token: BindingToken) {
  const baseValue =
    token.kind === 'console_command'
      ? `"${sanitizeConsoleCommandValue(token.value)}"`
      : token.value.trim()
  return `${token.actionModifier}${baseValue}${token.eventModifier}`.trim()
}

export function serializeBindingExpression(expression: BindingExpression) {
  return expression.tokens
    .map(serializeBindingToken)
    .filter(Boolean)
    .join(' ')
    .trim()
}

export function createBindingToken(kind: BindingTokenKind = 'input'): BindingToken {
  return {
    kind,
    value: defaultTokenValueForKind(kind),
    raw: '',
    actionModifier: '',
    eventModifier: '',
  }
}

export function createBindingExpression(tokens?: BindingToken[]): BindingExpression {
  const nextTokens = tokens && tokens.length > 0 ? tokens : [createBindingToken()]
  const raw = nextTokens.map(serializeBindingToken).filter(Boolean).join(' ').trim()
  return {
    raw,
    tokens: nextTokens.map(token => ({
      ...token,
      raw: serializeBindingToken(token),
    })),
  }
}

export function updateBindingExpressionToken(
  expression: BindingExpression,
  index: number,
  patch: Partial<BindingToken>
) {
  const tokens = expression.tokens.map((token, tokenIndex) => {
    if (tokenIndex !== index) return token
    const nextKind = patch.kind ?? token.kind
    const nextValue = patch.value ?? token.value
    const updated: BindingToken = {
      kind: nextKind,
      value: nextKind === 'console_command' ? sanitizeConsoleCommandValue(nextValue) : nextValue.trim(),
      raw: token.raw,
      actionModifier: patch.actionModifier ?? token.actionModifier,
      eventModifier: patch.eventModifier ?? token.eventModifier,
    }
    if (!updated.value) {
      updated.value = defaultTokenValueForKind(nextKind)
    }
    return updated
  })
  return createBindingExpression(tokens)
}

export function addBindingExpressionToken(expression: BindingExpression, kind: BindingTokenKind = 'input') {
  return createBindingExpression([...expression.tokens, createBindingToken(kind)])
}

export function removeBindingExpressionToken(expression: BindingExpression, index: number) {
  const tokens = expression.tokens.filter((_, tokenIndex) => tokenIndex !== index)
  return tokens.length > 0 ? createBindingExpression(tokens) : null
}

export function moveBindingExpressionToken(expression: BindingExpression, index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= expression.tokens.length) return expression
  const tokens = [...expression.tokens]
  const [token] = tokens.splice(index, 1)
  tokens.splice(nextIndex, 0, token)
  return createBindingExpression(tokens)
}

export function isSimpleBindingToken(token: BindingToken) {
  return (
    token.kind !== 'console_command' &&
    token.kind !== 'raw_literal' &&
    token.actionModifier === '' &&
    token.eventModifier === ''
  )
}

export function canUseSimpleSingleBindingEditor(expression: BindingExpression | null) {
  return Boolean(expression && expression.tokens.length === 1 && isSimpleBindingToken(expression.tokens[0]))
}

export function canUseSimpleBaseBindingEditor(expression: BindingExpression | null) {
  return Boolean(
    expression &&
      expression.tokens.length > 0 &&
      expression.tokens.length <= 2 &&
      expression.tokens.every(isSimpleBindingToken)
  )
}

export function getSimpleBaseBindingParts(expression: BindingExpression | null) {
  if (!canUseSimpleBaseBindingEditor(expression) || !expression) return null
  return {
    tap: expression.tokens[0]?.value || undefined,
    hold: expression.tokens[1]?.value || undefined,
  }
}

function parseBaseBinding(value?: string): { tap?: string; hold?: string } {
  const parts = getSimpleBaseBindingParts(parseBindingExpression(value))
  if (!parts) return {}
  return parts
}

function writeBaseBinding(text: string, button: string, tap?: string, hold?: string) {
  const values: string[] = []
  if (tap) {
    values.push(tap)
  } else if (hold) {
    values.push('NONE')
  }
  if (hold) values.push(hold)
  if (values.length === 0) {
    return removeKeymapEntry(text, button)
  }
  return updateKeymapEntry(text, button, values)
}

export function setBindingLine(text: string, key: string, expression?: string | null) {
  const trimmed = stripInlineComment(expression ?? undefined)
  if (!trimmed) {
    return removeKeymapEntry(text, key)
  }
  return updateKeymapEntry(text, key, [trimmed])
}

export function getButtonBindingSet(text: string, button: string): ButtonBindingSet {
  const base = parseBaseBinding(getKeymapValue(text, button))
  const doubleExpression = parseBindingExpression(getKeymapValue(text, `${button},${button}`))
  return {
    tap: base.tap,
    hold: base.hold,
    double: canUseSimpleSingleBindingEditor(doubleExpression) ? doubleExpression?.tokens[0]?.value : doubleExpression?.raw,
  }
}

export function setTapBinding(text: string, button: string, value?: string | null) {
  const current = getButtonBindingSet(text, button)
  const tapValue = value?.trim() ? value.trim() : undefined
  return writeBaseBinding(text, button, tapValue, current.hold)
}

export function setHoldBinding(text: string, button: string, value?: string | null) {
  const current = getButtonBindingSet(text, button)
  const holdValue = value?.trim() ? value.trim() : undefined
  return writeBaseBinding(text, button, current.tap, holdValue)
}

export function setDoubleBinding(text: string, button: string, value?: string | null) {
  const target = `${button},${button}`
  const trimmed = value?.trim()
  if (!trimmed) {
    return removeKeymapEntry(text, target)
  }
  return updateKeymapEntry(text, target, [trimmed])
}

type ComboBinding = {
  id: string
  modifier: string
  binding: string
  expression: BindingExpression | null
  editorMode: 'simple' | 'advanced'
  canSwitchToSimple: boolean
  lineIndex: number
}

const comboSlotSeparator = (slot: Extract<BindingSlot, 'chord' | 'simultaneous' | 'diagonal'>) =>
  slot === 'chord' ? ',' : slot === 'simultaneous' ? '+' : '*'

function parseComboBindings(
  text: string,
  button: string,
  separator: '+' | ',' | '*',
  slot: Extract<BindingSlot, 'chord' | 'simultaneous' | 'diagonal'>
): ComboBinding[] {
  const target = button.toUpperCase()
  const lines = text.split(/\r?\n/)
  const results: ComboBinding[] = []
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    const trimmed = line.trim()
    if (!trimmed) continue
    const [rawKey, rawValue] = trimmed.split('=')
    if (!rawValue) continue
    const key = rawKey.trim().toUpperCase()
    const value = rawValue.trim()
    const parts = key.split(separator)
    if (parts.length !== 2) continue
    const [left, right] = parts.map(part => part.trim())
    if (right !== target) continue
    if (left.toUpperCase() === target) continue
    const expression = parseBindingExpression(value)
    if (!expression) continue
    results.push({
      id: `combo-${slot}-${target}-${results.length}`,
      modifier: left,
      binding: expression.raw,
      expression,
      editorMode: canUseSimpleSingleBindingEditor(expression) ? 'simple' : 'advanced',
      canSwitchToSimple: canUseSimpleSingleBindingEditor(expression),
      lineIndex,
    })
  }
  return results
}

export function setComboBindingLine(
  text: string,
  button: string,
  slot: Extract<BindingSlot, 'chord' | 'simultaneous' | 'diagonal'>,
  rowId: string,
  modifier: string | undefined,
  value?: string | null
) {
  if (!modifier) return text
  const separator = comboSlotSeparator(slot)
  const lines = text.split(/\r?\n/)
  const parsed = parseComboBindings(text, button, separator, slot)
  const trimmed = value?.trim()
  const existing = parsed.find(entry => entry.id === rowId)

  if (!trimmed) {
    if (existing) {
      lines.splice(existing.lineIndex, 1)
    }
    return lines.join('\n')
  }

  const nextLine = `${modifier}${separator}${button} = ${trimmed}`
  if (existing) {
    lines[existing.lineIndex] = nextLine
    return lines.join('\n')
  }

  lines.push(nextLine)
  return lines.join('\n')
}

export function removeComboBindingLine(
  text: string,
  button: string,
  slot: Extract<BindingSlot, 'chord' | 'simultaneous' | 'diagonal'>,
  rowId: string
) {
  const separator = comboSlotSeparator(slot)
  const lines = text.split(/\r?\n/)
  const parsed = parseComboBindings(text, button, separator, slot)
  const existing = parsed.find(entry => entry.id === rowId)
  if (!existing) return text
  lines.splice(existing.lineIndex, 1)
  return lines.join('\n')
}

export function getButtonBindingRows(
  text: string,
  button: string,
  manualState: ManualRowState = {}
): ButtonBindingRow[] {
  const baseExpression = parseBindingExpression(getKeymapValue(text, button))
  const simpleBaseParts = getSimpleBaseBindingParts(baseExpression)
  const baseEditorMode = !baseExpression || canUseSimpleBaseBindingEditor(baseExpression) ? 'simple' : 'advanced'
  const rows: ButtonBindingRow[] = [
    {
      id: `${button}-tap`,
      slot: 'tap',
      label: SLOT_LABELS.tap,
      binding: baseEditorMode === 'advanced' ? baseExpression?.raw ?? null : simpleBaseParts?.tap ?? null,
      expression: baseExpression,
      editorMode: baseEditorMode,
      writeMode: baseEditorMode === 'advanced' ? 'line' : 'slot',
      supportsAdvancedEditor: true,
      canSwitchToSimple: !baseExpression || canUseSimpleBaseBindingEditor(baseExpression),
      isManual: false,
    },
  ]
  ;(manualState.tap ?? []).forEach(entry => {
    rows.push({
      id: entry.id,
      slot: 'tap',
      label: SLOT_LABELS.tap,
      binding: entry.manualOutputValue ?? null,
      expression: null,
      editorMode: 'simple',
      writeMode: 'line',
      supportsAdvancedEditor: true,
      canSwitchToSimple: true,
      isManual: true,
      modifierCommand: entry.modifierCommand,
      manualTriggerKind: entry.manualTriggerKind,
      manualOutputKind: entry.manualOutputKind,
      manualOutputBehavior: entry.manualOutputBehavior,
      manualOutputValue: entry.manualOutputValue,
    })
  })
  const holdManualEntries = manualState.hold ?? []
  const holdManualInfo = holdManualEntries[0]
  if (baseEditorMode === 'simple' && (simpleBaseParts?.hold !== undefined || holdManualInfo)) {
    rows.push({
      id: holdManualInfo?.id ?? `${button}-hold`,
      slot: 'hold',
      label: SLOT_LABELS.hold,
      binding: simpleBaseParts?.hold ?? null,
      expression: baseExpression,
      editorMode: 'simple',
      writeMode: 'slot',
      supportsAdvancedEditor: false,
      canSwitchToSimple: true,
      isManual: Boolean(holdManualInfo),
      modifierCommand: holdManualInfo?.modifierCommand,
      manualTriggerKind: holdManualInfo?.manualTriggerKind,
      manualOutputKind: holdManualInfo?.manualOutputKind,
      manualOutputBehavior: holdManualInfo?.manualOutputBehavior,
      manualOutputValue: holdManualInfo?.manualOutputValue,
    })
  }
  const doubleExpression = parseBindingExpression(getKeymapValue(text, `${button},${button}`))
  const doubleEditorMode = !doubleExpression || canUseSimpleSingleBindingEditor(doubleExpression) ? 'simple' : 'advanced'
  ;(['double'] as BindingSlot[]).forEach(slot => {
    const bindingValue = doubleExpression?.raw ?? null
    const manualEntries = manualState[slot] ?? []
    const manualInfo = manualEntries[0]
    if (bindingValue || manualInfo) {
      rows.push({
        id: manualInfo?.id ?? `${button}-${slot}`,
        slot,
        label: SLOT_LABELS[slot],
        binding: bindingValue ?? null,
        expression: doubleExpression,
        editorMode: doubleEditorMode,
        writeMode: doubleEditorMode === 'advanced' ? 'line' : 'slot',
        supportsAdvancedEditor: true,
        canSwitchToSimple: !doubleExpression || canUseSimpleSingleBindingEditor(doubleExpression),
        isManual: Boolean(manualInfo),
        modifierCommand: manualInfo?.modifierCommand,
        manualTriggerKind: manualInfo?.manualTriggerKind,
        manualOutputKind: manualInfo?.manualOutputKind,
        manualOutputBehavior: manualInfo?.manualOutputBehavior,
        manualOutputValue: manualInfo?.manualOutputValue,
      })
    }
  })
  ;(['chord', 'simultaneous', 'diagonal'] as const).forEach(slot => {
    const separator = comboSlotSeparator(slot)
    const parsedCombos = parseComboBindings(text, button, separator, slot)
    const parsedIds = new Set(parsedCombos.map(entry => entry.id))
    parsedCombos.forEach(entry => {
      rows.push({
        id: entry.id,
        slot,
        label: SLOT_LABELS[slot],
        binding: entry.binding ?? null,
        expression: entry.expression,
        editorMode: entry.editorMode,
        writeMode: entry.editorMode === 'advanced' ? 'line' : 'slot',
        supportsAdvancedEditor: true,
        canSwitchToSimple: entry.canSwitchToSimple,
        isManual: false,
        modifierCommand: entry.modifier,
      })
    })
    const manualEntries = (manualState[slot] ?? []).filter(entry => !parsedIds.has(entry.id))
    manualEntries.forEach(entry => {
      rows.push({
        id: entry.id,
        slot,
        label: SLOT_LABELS[slot],
        binding: null,
        expression: null,
        editorMode: 'simple',
        writeMode: 'slot',
        supportsAdvancedEditor: true,
        canSwitchToSimple: true,
        isManual: true,
        modifierCommand: entry.modifierCommand,
        manualTriggerKind: entry.manualTriggerKind,
        manualOutputKind: entry.manualOutputKind,
        manualOutputBehavior: entry.manualOutputBehavior,
        manualOutputValue: entry.manualOutputValue,
      })
    })
  })
  return rows
}

export function getButtonSpecialAssignments(text: string) {
  const assignments: Record<string, string[]> = {}
  bindingSpecialKeys.forEach(special => {
    const assignment = getKeymapValue(text, special)
    if (!assignment) return
    assignment
      .split(/\s+/)
      .map(token => token.trim().toUpperCase())
      .filter(Boolean)
      .forEach(button => {
        const existing = assignments[button] ?? []
        if (!existing.includes(special)) {
          assignments[button] = [...existing, special]
        }
      })
  })
  return assignments
}

export function getStickModeShiftAssignmentMap(text: string) {
  const result: Record<string, StickModeShiftAssignment[]> = {}
  const lines = text.split(/\r?\n/)
  lines.forEach(line => {
    const match = line.match(/^\s*([^,]+)\s*,\s*((LEFT|RIGHT)_STICK_MODE)\s*=\s*([^\s#]+)/i)
    if (!match) return
    const button = match[1].trim().toUpperCase()
    const target = match[3].toUpperCase() === 'LEFT' ? 'LEFT' : 'RIGHT'
    const mode = match[4].trim().toUpperCase()
    if (!button || !mode) return
    const existing = result[button] ?? []
    const filtered = existing.filter(entry => entry.target !== target)
    result[button] = [...filtered, { target, mode }]
  })
  return result
}

export function isTrackballBindingPresent(text: string) {
  const trackballSpecials = ['GYRO_TRACKBALL', 'GYRO_TRACK_X', 'GYRO_TRACK_Y']
  const hasSpecial = trackballSpecials.some(cmd => Boolean(getKeymapValue(text, cmd)))
  if (hasSpecial) return true
  return FACE_BUTTONS.some(button => {
    const expression = parseBindingExpression(getKeymapValue(text, button))
    const doubleExpression = parseBindingExpression(getKeymapValue(text, `${button},${button}`))
    return Boolean(
      expression?.tokens.some(token => token.value.toUpperCase().includes('TRACK')) ||
        doubleExpression?.tokens.some(token => token.value.toUpperCase().includes('TRACK'))
    )
  })
}
