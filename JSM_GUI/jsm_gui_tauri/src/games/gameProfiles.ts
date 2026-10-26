import { getKeymapValue } from '../utils/keymap'
import { ACTION_METADATA_PREFIX, GAME_METADATA_PREFIX, isGameMetadataComment } from './gameMetadataFormat'

export { ACTION_METADATA_PREFIX, GAME_METADATA_PREFIX } from './gameMetadataFormat'
export const CONTROLS = [
  ['S', 'A'], ['E', 'B'], ['W', 'X'], ['N', 'Y'], ['L', 'LB'], ['R', 'RB'], ['ZL', 'LT'], ['ZR', 'RT'],
  ['L3', '左摇杆按下 / LS click'], ['R3', '右摇杆按下 / RS click'],
  ['UP', '↑'], ['DOWN', '↓'], ['LEFT', '←'], ['RIGHT', '→'], ['-', 'View'], ['+', 'Menu'],
  ['LSL', '左背键 1 / L B1'], ['LSR', '左背键 2 / L B2'], ['RSR', '右背键 1 / R B1'], ['RSL', '右背键 2 / R B2'],
  ['LMINI', '左扩展肩键 / L mini'], ['RMINI', '右扩展肩键 / R mini'],
  ['HOME', 'Home'], ['CAPTURE', 'Capture'], ['MIC', 'Mic'], ['LTOUCH', '左摇杆触摸 / LS touch'], ['RTOUCH', '右摇杆触摸 / RS touch'],
  ['MISC1', '扩展键 1 / Extra 1'], ['MISC2', '扩展键 2 / Extra 2'], ['MISC3', '扩展键 3 / Extra 3'],
  ['MISC4', '扩展键 4 / Extra 4'], ['MISC5', '扩展键 5 / Extra 5'], ['MISC6', '扩展键 6 / Extra 6'],
  ['LUP', 'LS ↑'], ['LDOWN', 'LS ↓'], ['LLEFT', 'LS ←'], ['LRIGHT', 'LS →'],
] as const
export type GameAction = {
  id: string; zh: string; en: string; group: 'move' | 'combat' | 'equipment' | 'menu'
  key: string; button: string; gesture: 'press' | 'hold' | 'chord'; modifier: string; confirmed: boolean
}
export type GameProfile = {
  version: 1; gameName: string; template: 'delta-force-infantry' | 'custom'; mode: 'keyboardMouse' | 'nativeGyro'
  actions: GameAction[]
}
const action = (id: string, zh: string, en: string, group: GameAction['group'], key: string, button: string, gesture: GameAction['gesture'] = 'press'): GameAction =>
  ({ id, zh, en, group, key, button, gesture, modifier: '', confirmed: false })

/** Generic starting layout; the user supplies the game name and verifies its keys. */
export const createBasicGameProfile = (gameName = '', mode: GameProfile['mode'] = 'keyboardMouse'): GameProfile => ({
  version: 1, gameName, template: 'custom', mode,
  actions: [
    action('forward', '前进', 'Move forward', 'move', 'W', 'LUP'),
    action('back', '后退', 'Move backward', 'move', 'S', 'LDOWN'),
    action('left', '向左移动', 'Move left', 'move', 'A', 'LLEFT'),
    action('right', '向右移动', 'Move right', 'move', 'D', 'LRIGHT'),
    action('sprint', '冲刺', 'Sprint', 'move', 'LSHIFT', 'L3'),
    action('jump', '跳跃 / 翻越', 'Jump / vault', 'move', 'SPACE', 'S'),
    action('crouch', '蹲下 / 滑铲', 'Crouch / slide', 'move', 'C', 'E'),
    action('prone', '卧倒', 'Prone', 'move', 'Z', 'E', 'hold'),
    action('fire', '开火', 'Fire', 'combat', 'LMOUSE', 'ZR'),
    action('aim', '瞄准', 'Aim down sights', 'combat', 'RMOUSE', 'ZL'),
    action('reload', '换弹', 'Reload', 'combat', 'R', 'W'),
    action('interact', '交互 / 拾取', 'Interact / pick up', 'combat', 'F', 'W', 'hold'),
    action('weapon', '切换武器', 'Switch weapon', 'combat', 'SCROLLDOWN', 'N'),
    action('melee', '近战', 'Melee', 'combat', 'V', 'R3'),
    action('gadget', '投掷 / 装备', 'Throw / equipment', 'equipment', 'G', 'R'),
    action('ability', '干员技能', 'Operator ability', 'equipment', 'E', 'L'),
    action('heal', '治疗', 'Heal', 'equipment', 'H', 'UP'),
    action('ping', '标记', 'Ping', 'equipment', 'MMOUSE', 'RIGHT'),
    action('inventory', '背包', 'Inventory', 'menu', 'TAB', 'DOWN'),
    action('map', '地图', 'Map', 'menu', 'M', '-'),
    action('menu', '暂停 / 返回', 'Pause / back', 'menu', 'ESC', '+'),
  ],
})

/** Keep older examples and shared Delta profiles compatible. */
export const createDeltaProfile = (mode: GameProfile['mode'] = 'keyboardMouse'): GameProfile =>
  ({ ...createBasicGameProfile('三角洲行动', mode), template: 'delta-force-infantry' })

export function readGameProfile(text: string): GameProfile | null {
  const comments = text.split(/\r?\n/).map(line => line.trim()).filter(isGameMetadataComment)
  const headers = comments.filter(line => line.startsWith(GAME_METADATA_PREFIX))
  if (headers.length !== 1 || comments.join('').length > 100000) return null
  try {
    const raw = headers[0].slice(GAME_METADATA_PREFIX.length)
    // Older Studio files used one URI-encoded JSON comment. Reading is backward compatible.
    const value = JSON.parse(raw.startsWith('{') ? raw : decodeURIComponent(raw))
    if (!value || ![1, 2].includes(value.version)) return null
    const actions = value.version === 2
      ? comments.filter(line => line.startsWith(ACTION_METADATA_PREFIX)).map(line => JSON.parse(line.slice(ACTION_METADATA_PREFIX.length)))
      : value.actions
    const profile: GameProfile = {
      version: 1, gameName: value.gameName ?? (value.version === 1 ? '三角洲行动' : ''),
      template: value.template, mode: value.mode, actions,
    }
    return validateGameProfile(profile).length ? null : profile
  } catch { return null }
}

export function writeGameMetadata(text: string, profile: GameProfile): string {
  if (validateGameProfile(profile).length) throw new Error('Invalid game action metadata')
  const rest = text.split(/\r?\n/).filter(line => !isGameMetadataComment(line)).join('\n')
  const header = { version: 2, gameName: profile.gameName, template: profile.template, mode: profile.mode }
  const comments = [GAME_METADATA_PREFIX + JSON.stringify(header),
    ...profile.actions.map(action => ACTION_METADATA_PREFIX + JSON.stringify(action))]
  return `${comments.join('\n')}\n\n${rest.trim()}`
}

export const KEY_OPTIONS = ['NONE', 'LMOUSE', 'RMOUSE', 'MMOUSE', 'BMOUSE', 'FMOUSE', 'SCROLLUP', 'SCROLLDOWN',
  'SPACE', 'TAB', 'ESC', 'ENTER', 'BACKSPACE', 'LSHIFT', 'RSHIFT', 'LCONTROL', 'RCONTROL', 'LALT', 'RALT',
  'UP', 'DOWN', 'LEFT', 'RIGHT', 'CAPS_LOCK', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''),
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`)]

export function validateGameProfile(profile: GameProfile): string[] {
  const errors: string[] = []
  const label = (value: unknown, max = 120): value is string => typeof value === 'string' && Boolean(value.trim()) && value.length <= max
  if (!label(profile.gameName) || !['delta-force-infantry', 'custom'].includes(profile.template) || !['keyboardMouse', 'nativeGyro'].includes(profile.mode)) return ['profile']
  if (!Array.isArray(profile.actions) || profile.actions.length > 80) return ['actions']
  const ids = new Set<string>()
  const occupied = new Set<string>()
  profile.actions.forEach(a => {
    if (!a || !label(a.id, 64) || !/^[a-zA-Z][\w-]*$/.test(a.id) || ids.has(a.id) || !label(a.zh) || !label(a.en) ||
      !['move', 'combat', 'equipment', 'menu'].includes(a.group) || !['press', 'hold', 'chord'].includes(a.gesture) ||
      typeof a.confirmed !== 'boolean' || typeof a.button !== 'string' || typeof a.modifier !== 'string') {
      errors.push('action'); return
    }
    ids.add(a.id)
    if (!KEY_OPTIONS.includes(a.key)) errors.push(`key:${a.id}`)
    if (!a.button) return
    if (!CONTROLS.some(([key]) => key === a.button)) errors.push(`button:${a.id}`)
    if (a.gesture === 'chord' && (!CONTROLS.some(([key]) => key === a.modifier) || a.modifier === a.button)) errors.push(`modifier:${a.id}`)
    const slot = `${a.gesture === 'chord' ? `${a.modifier},` : ''}${a.button}:${a.gesture === 'hold' ? 'hold' : 'press'}`
    if (occupied.has(slot)) errors.push(`conflict:${a.id}`)
    occupied.add(slot)
  })
  return errors
}

export function compileGameBindings(profile: GameProfile): Map<string, string> {
  const bindings = new Map<string, { press?: string; hold?: string }>()
  if (profile.mode === 'nativeGyro') return new Map()
  for (const a of profile.actions) {
    if (!a.button) continue
    const command = a.gesture === 'chord' ? `${a.modifier},${a.button}` : a.button
    const entry = bindings.get(command) ?? {}
    entry[a.gesture === 'hold' ? 'hold' : 'press'] = a.key
    bindings.set(command, entry)
  }
  return new Map([...bindings].map(([key, value]) => [key, value.hold ? `${value.press ?? 'NONE'} ${value.hold}` : value.press ?? 'NONE']))
}

/** Replace all exact assignments, including compact syntax and duplicate lines. */
export function putGameSetting(text: string, key: string, value: string): string {
  const lines = text.split(/\r?\n/).filter(line => line.split('=')[0].trim().toUpperCase() !== key.toUpperCase())
  return `${lines.join('\n').trim()}\n${key} = ${value}`
}

export function gameBindingDrift(text: string, profile: GameProfile): string[] {
  const lines = text.split(/\r?\n/)
  return [...compileGameBindings(profile)].filter(([key, value]) => {
    const assignments = lines.filter(line => line.split('=')[0].trim().toUpperCase() === key)
    return assignments.length !== 1 || getKeymapValue(assignments[0], key)?.toUpperCase() !== value
  }).map(([key]) => key)
}

/** Only touch commands changed by an action edit. All unrelated advanced commands survive. */
export function updateGameProfile(text: string, previous: GameProfile, next: GameProfile, rebuild = false): string {
  if (validateGameProfile(next).length) throw new Error('Invalid game action bindings')
  const before = compileGameBindings(previous), after = compileGameBindings(next)
  let result = text
  for (const command of new Set([...before.keys(), ...after.keys()])) {
    if (rebuild || before.get(command) !== after.get(command)) result = putGameSetting(result, command, after.get(command) ?? 'NONE')
  }
  const oldAim = previous.actions.find(a => a.id === 'aim')
  const newAim = next.actions.find(a => a.id === 'aim')
  if (oldAim && oldAim.button !== newAim?.button && getKeymapValue(text, 'GYRO_ON') === oldAim.button) {
    result = putGameSetting(result, 'GYRO_ON', newAim?.button || 'NONE')
  }
  return writeGameMetadata(result, next)
}

export function createGameConfig(profile: GameProfile, gyro: { axis: 'standard' | 'flydigi'; activation: 'aim' | 'always'; sensitivity: number }): string {
  if (validateGameProfile(profile).length) throw new Error('Invalid game action bindings')
  const aim = profile.actions.find(a => a.id === 'aim')!
  const lines = ['RESET_MAPPINGS', 'AUTOCONNECT = ON', 'TELEMETRY_ENABLED = ON', 'TELEMETRY_PORT = 8974',
    'GYRO_SPACE = LOCAL', 'GYRO_OUTPUT = MOUSE', `GYRO_SENS = ${gyro.sensitivity} ${gyro.sensitivity}`,
    `MOUSE_X_FROM_GYRO_AXIS = ${gyro.axis === 'flydigi' ? 'X' : 'Y'}`, `MOUSE_Y_FROM_GYRO_AXIS = ${gyro.axis === 'flydigi' ? 'Z' : 'X'}`,
    gyro.activation === 'always' ? 'NO_GYRO_BUTTON' : `GYRO_ON = ${aim?.button || 'NONE'}`]
  if (profile.mode === 'keyboardMouse') lines.push('LEFT_STICK_MODE = NO_MOUSE', 'RIGHT_STICK_MODE = AIM', 'STICK_SENS = 180 180',
    'STICK_POWER = 1.5', 'HOLD_PRESS_TIME = 0.22', 'ZL_MODE = NO_FULL', 'ZR_MODE = NO_FULL')
  else lines.push('LEFT_STICK_MODE = NO_MOUSE', 'RIGHT_STICK_MODE = NO_MOUSE')
  for (const [key, value] of compileGameBindings(profile)) lines.push(`${key} = ${value}`)
  return writeGameMetadata(lines.join('\n'), profile)
}
