import { useMemo } from 'react'
import {
  BindingSlot,
  BindingWriteMode,
  getKeymapValue,
  isTrackballBindingPresent,
  removeComboBindingLine,
  removeKeymapEntry,
  setBindingLine,
  setComboBindingLine,
  setDoubleBinding,
  setHoldBinding,
  setTapBinding,
  updateKeymapEntry,
} from '../utils/keymap'
import { bindingSpecialKeys, keyName } from '../constants/configKeys'
import type { GyroActivationMode } from '../utils/gyroActivation'
import { parseGyroActivation, writeGyroActivation } from '../utils/gyroActivation'

const TOGGLE_SPECIALS = [keyName.GYRO_ON, keyName.GYRO_OFF] as const
const SPECIAL_COMMANDS = bindingSpecialKeys.map(key => key.toUpperCase())

const clearToggleAssignments = (text: string, command: string) => {
  let next = text
  TOGGLE_SPECIALS.forEach(toggle => {
    const assigned = getKeymapValue(next, toggle)
    if (assigned) {
      const matches = assigned
        .split(/\s+/)
        .filter(Boolean)
        .some(token => token.toUpperCase() === command.toUpperCase())
      if (matches) {
        next = removeKeymapEntry(next, toggle)
      }
    }
  })
  return next
}

const removeTrackballDecayIfUnused = (text: string) => {
  return isTrackballBindingPresent(text) ? text : removeKeymapEntry(text, keyName.TRACKBALL_DECAY)
}

const clearSpecialAssignmentsForButton = (text: string, button: string) => {
  let next = text
  SPECIAL_COMMANDS.forEach(cmd => {
    const assignment = getKeymapValue(next, cmd)
    if (!assignment) return
    const tokens = assignment.split(/\s+/).filter(Boolean)
    const remaining = tokens.filter(token => token.toUpperCase() !== button.toUpperCase())
    if (remaining.length === tokens.length) {
      return
    }
    if (remaining.length === 0) {
      next = removeKeymapEntry(next, cmd)
    } else {
      next = updateKeymapEntry(next, cmd, remaining)
    }
  })
  return next
}

type BindingArgs = {
  configText: string
  setConfigText: React.Dispatch<React.SetStateAction<string>>
}

export function useBindingsConfig({ configText, setConfigText }: BindingArgs) {
  const handleFaceButtonBindingChange = (
    button: string,
    slot: BindingSlot,
    rowId: string,
    binding: string | null,
    options?: { modifier?: string; writeMode?: BindingWriteMode }
  ) => {
    setConfigText(prev => {
      let next = clearSpecialAssignmentsForButton(prev, button)
      next = clearToggleAssignments(next, button)
      switch (slot) {
        case 'tap':
          next = options?.writeMode === 'line' ? setBindingLine(next, button, binding) : setTapBinding(next, button, binding)
          break
        case 'hold':
          next = setHoldBinding(next, button, binding)
          break
        case 'double':
          next = setDoubleBinding(next, button, binding)
          break
        case 'chord':
          next = setComboBindingLine(next, button, 'chord', rowId, options?.modifier, binding)
          break
        case 'simultaneous':
          next = setComboBindingLine(next, button, 'simultaneous', rowId, options?.modifier, binding)
          break
        case 'diagonal':
          next = setComboBindingLine(next, button, 'diagonal', rowId, options?.modifier, binding)
          break
        default:
          break
      }
      return removeTrackballDecayIfUnused(next)
    })
  }

  const handleModifierChange = (
    button: string,
    slot: BindingSlot,
    rowId: string,
    previousModifier: string | undefined,
    nextModifier: string,
    binding: string | null
  ) => {
    if (!nextModifier || previousModifier === nextModifier) return
    setConfigText(prev => {
      let next = prev
      if (slot === 'chord') {
        next = removeComboBindingLine(next, button, 'chord', rowId)
        if (binding) {
          next = setComboBindingLine(next, button, 'chord', rowId, nextModifier, binding)
        }
      } else if (slot === 'simultaneous') {
        next = removeComboBindingLine(next, button, 'simultaneous', rowId)
        if (binding) {
          next = setComboBindingLine(next, button, 'simultaneous', rowId, nextModifier, binding)
        }
      } else if (slot === 'diagonal') {
        next = removeComboBindingLine(next, button, 'diagonal', rowId)
        if (binding) {
          next = setComboBindingLine(next, button, 'diagonal', rowId, nextModifier, binding)
        }
      }
      return next
    })
  }

  const handleSpecialActionAssignment = (specialCommand: string, buttonCommand: string) => {
    setConfigText(prev => {
      let next = clearSpecialAssignmentsForButton(prev, buttonCommand)
      next = removeKeymapEntry(next, buttonCommand)
      next = clearToggleAssignments(next, buttonCommand)
      if (TOGGLE_SPECIALS.includes(specialCommand as (typeof TOGGLE_SPECIALS)[number])) {
        return removeTrackballDecayIfUnused(updateKeymapEntry(next, specialCommand, [buttonCommand]))
      }
      next = updateKeymapEntry(next, buttonCommand, [specialCommand])
      return removeTrackballDecayIfUnused(next)
    })
  }

  const handleClearSpecialAction = (specialCommand: string, buttonCommand: string) => {
    setConfigText(prev => {
      const assignment = getKeymapValue(prev, specialCommand)
      if (assignment) {
        const matches = assignment
          .split(/\s+/)
          .filter(Boolean)
          .some(token => token.toUpperCase() === buttonCommand.toUpperCase())
        if (matches) {
          const updated = removeKeymapEntry(prev, specialCommand)
          return removeTrackballDecayIfUnused(updated)
        }
      }
      return prev
    })
  }

  const handleTrackballDecayChange = (value: string) => {
    const nextValue = value.trim()
    setConfigText(prev => {
      if (!nextValue) {
        return removeKeymapEntry(prev, keyName.TRACKBALL_DECAY)
      }
      const numeric = Number(nextValue)
      if (Number.isNaN(numeric)) {
        return prev
      }
      return updateKeymapEntry(prev, keyName.TRACKBALL_DECAY, [numeric])
    })
  }

  const gyroActivation = useMemo(() => parseGyroActivation(configText), [configText])

  const handleGyroActivationModeChange = (mode: GyroActivationMode, fallbackButton = 'R3') => {
    setConfigText(prev => {
      const current = parseGyroActivation(prev)
      return writeGyroActivation(prev, mode, current.button || fallbackButton)
    })
  }

  const handleGyroActivationButtonChange = (button: string) => {
    if (!button.trim()) return
    setConfigText(prev => {
      const current = parseGyroActivation(prev)
      return writeGyroActivation(prev, current.mode, button)
    })
  }

  const trackballDecayValue = useMemo(() => getKeymapValue(configText, keyName.TRACKBALL_DECAY) ?? '', [configText])

  return {
    handleFaceButtonBindingChange,
    handleModifierChange,
    handleSpecialActionAssignment,
    handleClearSpecialAction,
    gyroActivation,
    handleGyroActivationModeChange,
    handleGyroActivationButtonChange,
    handleTrackballDecayChange,
    trackballDecayValue,
  }
}
