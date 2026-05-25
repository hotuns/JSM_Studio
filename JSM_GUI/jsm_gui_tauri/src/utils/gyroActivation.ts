import { keyName } from '../constants/configKeys'
import { removeKeymapEntry, updateKeymapEntry } from './keymap'

export type GyroActivationMode = 'always_on' | 'hold_on' | 'hold_off' | 'always_off'

export type GyroActivationConfig = {
  mode: GyroActivationMode
  button: string
}

const GYRO_ACTIVATION_KEYS = [keyName.GYRO_ON, keyName.GYRO_OFF] as const

const escapeKey = (key: string) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const stripInlineComment = (value?: string) => {
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

const removeAllKeymapEntries = (text: string, key: string) => {
  let current = text
  let next = removeKeymapEntry(current, key)
  while (next !== current) {
    current = next
    next = removeKeymapEntry(current, key)
  }
  return current
}

export const parseGyroActivation = (text: string): GyroActivationConfig => {
  let latest: { key: string; value: string } | null = null
  const pattern = new RegExp(`^\\s*(${GYRO_ACTIVATION_KEYS.map(escapeKey).join('|')})\\s*=\\s*(.+)$`, 'i')

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(pattern)
    if (!match) continue
    latest = {
      key: match[1].toUpperCase(),
      value: stripInlineComment(match[2]),
    }
  }

  if (!latest) return { mode: 'always_on', button: '' }

  const button = latest.value.split(/\s+/).filter(Boolean)[0]?.toUpperCase() ?? ''
  if (latest.key === keyName.GYRO_ON) {
    if (button === 'NONE') return { mode: 'always_off', button: '' }
    return { mode: 'hold_on', button }
  }

  if (button === 'NONE') return { mode: 'always_on', button: '' }
  return { mode: 'hold_off', button }
}

export const writeGyroActivation = (text: string, mode: GyroActivationMode, button: string) => {
  let next = text
  GYRO_ACTIVATION_KEYS.forEach(key => {
    next = removeAllKeymapEntries(next, key)
  })

  const normalizedButton = button.trim().toUpperCase()
  switch (mode) {
    case 'hold_on':
      return updateKeymapEntry(next, keyName.GYRO_ON, [normalizedButton || 'R3'])
    case 'hold_off':
      return updateKeymapEntry(next, keyName.GYRO_OFF, [normalizedButton || 'R3'])
    case 'always_off':
      return updateKeymapEntry(next, keyName.GYRO_ON, ['NONE'])
    case 'always_on':
    default:
      return next
  }
}
