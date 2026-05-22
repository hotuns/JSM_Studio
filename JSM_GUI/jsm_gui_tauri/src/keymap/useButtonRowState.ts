import { useCallback, useState } from 'react'
import { BindingSlot, ManualRowInfo, ManualRowState } from '../utils/keymap'

const isSingleSlot = (slot: BindingSlot) => slot === 'hold' || slot === 'double'

export const useButtonRowState = () => {
  const [manualRows, setManualRows] = useState<Record<string, ManualRowState>>({})
  const [stickShiftDisplayModes, setStickShiftDisplayModes] = useState<Record<string, 'tap' | 'extra'>>({})
  const [rowEditorModes, setRowEditorModes] = useState<Record<string, 'simple' | 'advanced'>>({})

  const rowKey = (button: string, slot: BindingSlot, rowId: string) => `${button.toUpperCase()}::${slot}::${rowId}`

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const ensureManualRow = useCallback((button: string, slot: BindingSlot, defaults?: Partial<ManualRowInfo>) => {
    const id = defaults?.id ?? generateId()
    setManualRows(prev => {
      const existing = prev[button] ? { ...prev[button] } : {}
      const rowsForSlot = existing[slot] ?? []
      const isComboSlot = !isSingleSlot(slot)
      if (!isComboSlot && rowsForSlot.length > 0) return prev
      existing[slot] = [...rowsForSlot, { id, ...(defaults ?? {}) }]
      return { ...prev, [button]: existing }
    })
    return id
  }, [])

  const updateManualRow = useCallback((button: string, slot: BindingSlot, rowId: string, info: Omit<ManualRowInfo, 'id'>) => {
    setManualRows(prev => {
      const existing = prev[button] ? { ...prev[button] } : {}
      const rowsForSlot = existing[slot] ?? []
      const nextRows = rowsForSlot.map(row => (row.id === rowId ? { ...row, ...info } : row))
      existing[slot] = nextRows
      return { ...prev, [button]: existing }
    })
  }, [])

  const removeManualRow = useCallback((button: string, slot: BindingSlot, rowId?: string) => {
    setManualRows(prev => {
      const existing = prev[button]
      if (!existing || !existing[slot]) return prev
      // For single-entry slots (hold/double), drop the slot entirely.
      if (isSingleSlot(slot)) {
        const nextExisting = { ...existing }
        delete nextExisting[slot]
        const next = { ...prev }
        if (Object.keys(nextExisting).length === 0) {
          delete next[button]
        } else {
          next[button] = nextExisting
        }
        return next
      }
      const rowsForSlot = existing[slot] ?? []
      const targetId = rowId ?? rowsForSlot[0]?.id
      const filtered = rowsForSlot.filter(row => row.id !== targetId)
      const nextExisting = { ...existing }
      if (filtered.length === 0) {
        delete nextExisting[slot]
      } else {
        nextExisting[slot] = filtered
      }
      const next = { ...prev }
      if (Object.keys(nextExisting).length === 0) {
        delete next[button]
      } else {
        next[button] = nextExisting
      }
      return next
    })
  }, [])

  const updateStickShiftDisplayMode = useCallback((buttonKey: string, mode?: 'tap' | 'extra') => {
    setStickShiftDisplayModes(prev => {
      if (!mode) {
        if (!prev[buttonKey]) return prev
        const next = { ...prev }
        delete next[buttonKey]
        return next
      }
      if (prev[buttonKey] === mode) return prev
      return { ...prev, [buttonKey]: mode }
    })
  }, [])

  const setRowEditorMode = useCallback((button: string, slot: BindingSlot, rowId: string, mode?: 'simple' | 'advanced') => {
    const key = rowKey(button, slot, rowId)
    setRowEditorModes(prev => {
      if (!mode) {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      if (prev[key] === mode) return prev
      return { ...prev, [key]: mode }
    })
  }, [])

  const getRowEditorMode = useCallback(
    (button: string, slot: BindingSlot, rowId: string) => rowEditorModes[rowKey(button, slot, rowId)],
    [rowEditorModes]
  )

  const replaceStickShiftDisplayModes = useCallback(
    (updater: (prev: Record<string, 'tap' | 'extra'>) => Record<string, 'tap' | 'extra'>) => {
      setStickShiftDisplayModes(prev => updater(prev))
    },
    []
  )

  return {
    manualRows,
    ensureManualRow,
    updateManualRow,
    removeManualRow,
    stickShiftDisplayModes,
    updateStickShiftDisplayMode,
    replaceStickShiftDisplayModes,
    getRowEditorMode,
    setRowEditorMode,
  }
}
