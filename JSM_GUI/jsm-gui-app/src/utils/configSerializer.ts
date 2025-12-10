import {
  BUMPER_BUTTONS,
  CENTER_BUTTONS,
  DPAD_BUTTONS,
  FACE_BUTTONS,
  LEFT_STICK_BUTTONS,
  RIGHT_STICK_BUTTONS,
  TOUCH_BUTTONS,
  TRIGGER_BUTTONS,
} from '../keymap/schema'
import {
  bindingSpecialKeys,
  gyroBehaviorKeys,
  keyName,
  noiseKeys,
  sensitivityKeys,
  timingKeys,
  stickKeys,
  touchpadKeys,
} from '../constants/configKeys'

type SectionKey =
  | 'gyro_behavior'
  | 'noise'
  | 'sensitivity'
  | 'keymap'
  | 'touchpad'
  | 'sticks'
  | 'custom'

type KeymapSubsection =
  | 'global'
  | 'face'
  | 'dpad'
  | 'bumpers'
  | 'triggers'
  | 'center'
  | 'touch'
  | 'stick_buttons'
  | 'misc'

type ParsedLine = {
  line: string
  subsection?: KeymapSubsection
}

export type ParsedConfig = {
  sections: Record<SectionKey, ParsedLine[]>
  directives: ParsedLine[]
}

const SECTION_HEADERS: Record<SectionKey, string> = {
  gyro_behavior: '# Gyro Behavior',
  noise: '# Noise & Steadying',
  sensitivity: '# Sensitivity',
  keymap: '# Keymap',
  touchpad: '# Touchpad',
  sticks: '# Sticks',
  custom: '# Custom',
}

const KEYMAP_SUB_HEADERS: Record<KeymapSubsection, string> = {
  global: '# Global',
  face: '# Face Buttons',
  dpad: '# D-pad',
  bumpers: '# Bumpers',
  triggers: '# Triggers',
  center: '# Center buttons',
  touch: '# Touchpad',
  stick_buttons: '# Stick bindings',
  misc: '# Misc keymap',
}

const SECTION_ORDER: SectionKey[] = [
  'gyro_behavior',
  'noise',
  'sensitivity',
  'keymap',
  'touchpad',
  'sticks',
  'custom',
]

const KEYMAP_SUB_ORDER: KeymapSubsection[] = [
  'global',
  'face',
  'dpad',
  'bumpers',
  'triggers',
  'center',
  'touch',
  'stick_buttons',
  'misc',
]

const BUTTON_TO_SUBSECTION: Array<{ commands: string[]; subsection: KeymapSubsection }> = [
  { commands: FACE_BUTTONS.map(b => b.command.toUpperCase()), subsection: 'face' },
  { commands: DPAD_BUTTONS.map(b => b.command.toUpperCase()), subsection: 'dpad' },
  { commands: BUMPER_BUTTONS.map(b => b.command.toUpperCase()), subsection: 'bumpers' },
  { commands: TRIGGER_BUTTONS.map(b => b.command.toUpperCase()), subsection: 'triggers' },
  { commands: CENTER_BUTTONS.map(b => b.command.toUpperCase()), subsection: 'center' },
  { commands: TOUCH_BUTTONS.map(b => b.command.toUpperCase()), subsection: 'touch' },
  { commands: LEFT_STICK_BUTTONS.map(b => b.command.toUpperCase()).concat(RIGHT_STICK_BUTTONS.map(b => b.command.toUpperCase())), subsection: 'stick_buttons' },
]

const SPECIAL_BIND_COMMANDS = new Set(bindingSpecialKeys.map(key => key.toUpperCase()))

const normalizeLine = (line: string) => {
  const trimmed = line.trim()
  const parts = trimmed.split('=')
  if (parts.length < 2) return trimmed
  const left = parts.shift()!.trim()
  const right = parts.join('=').trim()
  return `${left} = ${right}`
}

const isDirectiveKey = (key: string) => {
  const upper = key.toUpperCase()
  if (upper === 'RESET_MAPPINGS') return true
  if (upper === 'TELEMETRY' || upper === 'TELEMETRY_ENABLE' || upper === 'TELEMETRY_ENABLED') return true
  if (upper.startsWith('TELEMETRY_')) return true
  return false
}

const classifyButton = (command: string | undefined | null): KeymapSubsection => {
  if (!command) return 'misc'
  const upper = command.toUpperCase()
  for (const entry of BUTTON_TO_SUBSECTION) {
    if (entry.commands.includes(upper)) {
      return entry.subsection
    }
  }
  if (/^T\d+$/.test(upper)) return 'touch'
  return 'misc'
}

const isKnownKey = (key: string, candidates: readonly string[]) => {
  const upper = key.toUpperCase()
  return candidates.some(c => c.toUpperCase() === upper)
}

const GYRO_BEHAVIOR_EXTRA_KEYS = new Set<string>([keyName.IN_GAME_SENS, keyName.REAL_WORLD_CALIBRATION])

const classify = (rawKey: string, value: string): { section: SectionKey; subsection?: KeymapSubsection } => {
  const key = rawKey.trim().toUpperCase()
  // Gyro behavior
  if (isKnownKey(key, gyroBehaviorKeys) || GYRO_BEHAVIOR_EXTRA_KEYS.has(key)) {
    return { section: 'gyro_behavior' }
  }
  // Trigger threshold lives under Triggers in UI
  if (key === keyName.TRIGGER_THRESHOLD) {
    return { section: 'keymap', subsection: 'triggers' }
  }
  // Global timing controls shown under keymap "Global controls"
  if (isKnownKey(key, timingKeys)) {
    return { section: 'keymap', subsection: 'global' }
  }
  // Noise
  if (isKnownKey(key, noiseKeys)) {
    return { section: 'noise' }
  }
  // Sensitivity
  if (isKnownKey(key, sensitivityKeys)) {
    return { section: 'sensitivity' }
  }
  // Touchpad settings (grouped with touch bindings)
  if (isKnownKey(key, touchpadKeys)) {
    return { section: 'keymap', subsection: 'touch' }
  }
  // Stick settings
  if (isKnownKey(key, stickKeys)) {
    return { section: 'sticks' }
  }

  // Special binds keyed by command: treat as keymap and try to group by the first button token in the value
  if (SPECIAL_BIND_COMMANDS.has(key)) {
    const firstToken = value.trim().split(/\s+/)[0]
    if (firstToken) {
      return { section: 'keymap', subsection: classifyButton(firstToken) }
    }
    return { section: 'keymap', subsection: 'misc' }
  }

  // Direct button assignment
  const subsection = classifyButton(key)
  if (subsection !== 'misc') {
    return { section: 'keymap', subsection }
  }

  // Keymap bindings: detect by button key or combo (e.g., L3,S or SHIFT+S)
  if (key.includes(',') || (key.includes('+') && key.length > 1)) {
    const parts = key.split(/[,+]/).map(p => p.trim()).filter(Boolean)
    const button = parts[parts.length - 1]
    return { section: 'keymap', subsection: classifyButton(button) }
  }

  return { section: 'custom' }
}

export function parseConfigText(text: string): ParsedConfig {
  const directives: ParsedLine[] = []
  const sections: ParsedConfig['sections'] = {
    gyro_behavior: [],
    noise: [],
    sensitivity: [],
    keymap: [],
    touchpad: [],
    sticks: [],
    custom: [],
  }

  const seenDirectives = new Set<string>()
  const trailingCustom: ParsedLine[] = []

  text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .forEach(line => {
      const normalized = normalizeLine(line)
      const [rawKey, ...rest] = normalized.split('=')
      const keyOnly = rawKey?.trim()

      if (!keyOnly) return
      if (keyOnly.startsWith('#')) {
        return
      }
      if (isDirectiveKey(keyOnly)) {
        const upper = keyOnly.toUpperCase()
        if (!seenDirectives.has(upper)) {
          seenDirectives.add(upper)
          directives.push({ line: normalized })
        }
        return
      }
      if (rest.length === 0) {
        const upper = keyOnly.toUpperCase()
        if (upper === 'CLEAR') {
          trailingCustom.push({ line: normalized })
        } else {
          sections.custom.push({ line: normalized })
        }
        return
      }
      const value = rest.join('=').trim()
      const { section, subsection } = classify(rawKey, value)
      sections[section].push({ line: normalized, subsection })
    })

  if (trailingCustom.length) {
    sections.custom.push(...trailingCustom)
  }
  return { sections, directives }
}

const serializeBlock = (header: string, lines: string[]) => {
  return [header, ...lines, '']
}

export function serializeConfig(parsed: ParsedConfig): string {
  const output: string[] = []

  if (parsed.directives.length) {
    output.push('# Required Settings')
    parsed.directives.forEach(d => output.push(d.line))
    output.push('')
  }

  SECTION_ORDER.forEach(sectionKey => {
    const entries = parsed.sections[sectionKey]
    if (!entries || entries.length === 0) return

    if (sectionKey === 'keymap') {
      // No top-level keymap header; emit subsections directly
      const stickOrder: Record<string, number> = {}
      LEFT_STICK_BUTTONS.concat(RIGHT_STICK_BUTTONS).forEach((btn, idx) => {
        stickOrder[btn.command.toUpperCase()] = idx
      })
      const resolveStickRank = (line: string) => {
        const left = line.split('=')[0]?.trim() ?? ''
        const keyPart = left.includes(',') || left.includes('+')
          ? left.split(/[,+]/).filter(Boolean).pop() ?? left
          : left
        return stickOrder[keyPart.toUpperCase()] ?? Number.MAX_SAFE_INTEGER
      }
      const touchPriority: Record<string, number> = {
        TOUCHPAD_MODE: 0,
        GRID_SIZE: 1,
        TOUCHPAD_SENS: 2,
        TOUCH: 3,
        CAPTURE: 4,
      }
      const touchRank = (line: string) => {
        const [lhsRaw, rhsRaw = ''] = line.split('=')
        const lhsTokens = (lhsRaw ?? '').split(/[,+]/).map(t => t.trim()).filter(Boolean)
        const rhsTokens = (rhsRaw ?? '').split(/\s+/).map(t => t.trim()).filter(Boolean)
        const firstTouchToken = [...lhsTokens, ...rhsTokens].find(tok => /^T\d+$/i.test(tok)) ?? ''

        // Use the first touch token (T1, T2, …) if present
        if (firstTouchToken) {
          const match = /^T(\d+)$/i.exec(firstTouchToken)
          if (match) return 100 + Number(match[1])
        }

        // Otherwise use the explicit priority map (mode/grid/sens/touch/capture)
        const keyPart = lhsTokens[lhsTokens.length - 1] ?? (lhsRaw ?? '').trim()
        const upper = keyPart.toUpperCase()
        if (upper in touchPriority) return touchPriority[upper]

        return Number.MAX_SAFE_INTEGER
      }

      KEYMAP_SUB_ORDER.forEach(sub => {
        const subLines = entries
          .filter(entry => (entry.subsection ?? 'misc') === sub)
          .map(entry => entry.line)
          .sort((a, b) => {
            if (sub === 'stick_buttons') {
              return resolveStickRank(a) - resolveStickRank(b)
            }
            if (sub === 'touch') {
              const keyA = (a.split('=')[0] ?? '').trim().toUpperCase()
              const keyB = (b.split('=')[0] ?? '').trim().toUpperCase()
              const specialA = SPECIAL_BIND_COMMANDS.has(keyA) ? 0 : 1
              const specialB = SPECIAL_BIND_COMMANDS.has(keyB) ? 0 : 1
              if (specialA !== specialB) return specialA - specialB
              return touchRank(a) - touchRank(b)
            }
            return 0
          })
        if (subLines.length === 0) return
        output.push(KEYMAP_SUB_HEADERS[sub])
        output.push(...subLines)
        output.push('')
      })
      return
    }

    let lines = entries.map(entry => entry.line)
    if (sectionKey === 'sticks') {
      const defaultsOrder = [
        keyName.STICK_DEADZONE_INNER,
        keyName.STICK_DEADZONE_OUTER,
        keyName.STICK_SENS,
        keyName.STICK_POWER,
        keyName.STICK_ACCELERATION_RATE,
        keyName.STICK_ACCELERATION_CAP,
        keyName.MOUSE_RING_RADIUS,
        keyName.SCROLL_SENS,
        keyName.ADAPTIVE_TRIGGER,
        keyName.FLICK_TIME,
        keyName.FLICK_TIME_EXPONENT,
        keyName.FLICK_SNAP_MODE,
        keyName.FLICK_SNAP_STRENGTH,
        keyName.FLICK_DEADZONE_ANGLE,
      ]
      const leftOrder = [
        keyName.LEFT_STICK_DEADZONE_INNER,
        keyName.LEFT_STICK_DEADZONE_OUTER,
        keyName.LEFT_STICK_MODE,
        keyName.LEFT_RING_MODE,
      ]
      const rightOrder = [
        keyName.RIGHT_STICK_DEADZONE_INNER,
        keyName.RIGHT_STICK_DEADZONE_OUTER,
        keyName.RIGHT_STICK_MODE,
        keyName.RIGHT_RING_MODE,
      ]
      const rank = (line: string) => {
        const keyPart = line.split('=')[0]?.trim().toUpperCase()
        const d = defaultsOrder.indexOf(keyPart as typeof keyName[keyof typeof keyName])
        if (d >= 0) return d
        const l = leftOrder.indexOf(keyPart as typeof keyName[keyof typeof keyName])
        if (l >= 0) return 100 + l
        const r = rightOrder.indexOf(keyPart as typeof keyName[keyof typeof keyName])
        if (r >= 0) return 200 + r
        return 1000
      }
      lines = [...lines].sort((a, b) => rank(a) - rank(b))
    }
    output.push(...serializeBlock(SECTION_HEADERS[sectionKey], lines))
  })

  // Remove trailing blank lines
  while (output.length && output[output.length - 1].trim() === '') {
    output.pop()
  }
  return output.join('\n')
}
