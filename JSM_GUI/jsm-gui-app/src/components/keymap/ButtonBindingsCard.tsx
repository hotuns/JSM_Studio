import { Fragment } from 'react'
import { BindingRow } from '../BindingRow'
import {
  BindingSlot,
  ButtonBindingRow,
  ManualRowInfo,
  ManualRowState,
} from '../../utils/keymap'
import {
  EXTRA_BINDING_SLOTS,
  MODIFIER_SLOT_TYPES,
  SPECIAL_LABELS,
  SPECIAL_OPTION_LIST,
  SPECIAL_OPTION_MANUAL_LIST,
  STICK_SHIFT_HEADER_OPTION,
  STICK_SHIFT_LEFT_HEADER,
  STICK_SHIFT_RIGHT_HEADER,
  STICK_SHIFT_SPECIAL_OPTIONS,
  buildStickShiftValue,
  getDefaultModifierForButton,
  parseStickShiftSelection,
  type ButtonDefinition,
} from '../../keymap/schema'
import { formatStickModeLabel } from '../../constants/sticks'
import stickStyles from '../Sticks.module.css'
import keymapStyles from '../Keymap.module.css'

type ButtonBindingsCardProps = {
  button: ButtonDefinition
  layout: 'playstation' | 'xbox'
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
  captureLabel: string
  isCapturing: (button: string, slot: BindingSlot, rowId?: string) => boolean
  beginCapture: (button: string, slot: BindingSlot, rowId: string, label: string, modifier?: string) => void
  cancelCapture: () => void
  onBindingChange: (
    button: string,
    slot: BindingSlot,
    rowId: string,
    value: string | null,
    options?: { modifier?: string }
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

export const ButtonBindingsCard = ({
  button,
  layout,
  rows,
  modifierOptions,
  specialsByButton,
  stickModeShiftAssignments,
  stickShiftDisplayModes,
  updateStickShiftDisplayMode,
  manualRows,
  ensureManualRow,
  updateManualRow,
  removeManualRow,
  captureLabel,
  isCapturing,
  beginCapture,
  cancelCapture,
  onBindingChange,
  onModifierChange,
  onAssignSpecialAction,
  onClearSpecialAction,
  onStickModeShiftChange,
  trackballDecay,
  onTrackballDecayChange,
}: ButtonBindingsCardProps) => {
  const buttonKey = button.command.toUpperCase()
  const specialKey = specialsByButton[button.command] as keyof typeof SPECIAL_LABELS | undefined
  const tapSpecialLabel = specialKey ? SPECIAL_LABELS[specialKey] ?? '' : ''
  const stickShiftEntries = stickModeShiftAssignments?.[buttonKey] ?? []
  const shiftDisplayMode = stickShiftDisplayModes[buttonKey] ?? 'tap'
  const tapStickShiftEntry = shiftDisplayMode === 'tap' ? stickShiftEntries[0] : undefined
  const buttonHasTrackball = Boolean(
    rows.some(row => {
      const binding = row.binding?.toUpperCase()
      return binding ? binding.includes('TRACK') : false
    }) || (specialKey && new Set(['GYRO_TRACKBALL', 'GYRO_TRACK_X', 'GYRO_TRACK_Y']).has(specialKey))
  )
  const trackballSliderValue = trackballDecay && !Number.isNaN(Number(trackballDecay)) ? Number(trackballDecay) : 1

  const rowCapturing = rows.some(row => isCapturing(button.command, row.slot, row.id))

  return (
    <div className={`${keymapStyles.keymapRow} ${rowCapturing ? keymapStyles.keymapRowCapturing : ''}`} key={button.command}>
      <div className={keymapStyles.keymapLabel}>
        <span className={keymapStyles.buttonName}>{layout === 'playstation' ? button.playstation : button.xbox}</span>
        <span className={keymapStyles.buttonMeta}>{button.description}</span>
      </div>
      <div className={keymapStyles.keymapBindingControls}>
        {rows.map(row => {
          const rowCapturing = isCapturing(button.command, row.slot, row.id)
          const hasExtraRows = rows.length > 1
          const isSpecialValue = Boolean(row.binding && SPECIAL_LABELS[row.binding])
          const displayValue = (() => {
            if (row.slot === 'tap') {
              if (row.binding) return row.binding
              if (tapSpecialLabel) return tapSpecialLabel
              if (tapStickShiftEntry) {
                return `${tapStickShiftEntry.target === 'LEFT' ? 'Left stick' : 'Right stick'} → ${formatStickModeLabel(tapStickShiftEntry.mode)}`
              }
              return ''
            }
            if (isSpecialValue && row.binding) {
              return SPECIAL_LABELS[row.binding]
            }
            return row.binding || ''
          })()
          const showHeader = row.slot !== 'tap' || hasExtraRows
          const headerLabel = row.slot === 'tap' && hasExtraRows ? 'Regular Press' : row.label
          let rowSpecialOptions = MODIFIER_SLOT_TYPES.includes(row.slot as BindingSlot)
            ? SPECIAL_OPTION_MANUAL_LIST
            : SPECIAL_OPTION_LIST
          if (row.slot === 'tap' && onStickModeShiftChange) {
            rowSpecialOptions = [
              ...rowSpecialOptions,
              STICK_SHIFT_HEADER_OPTION,
              STICK_SHIFT_RIGHT_HEADER,
              ...STICK_SHIFT_SPECIAL_OPTIONS.filter(o => o.value.includes(':RIGHT:')),
              STICK_SHIFT_LEFT_HEADER,
              ...STICK_SHIFT_SPECIAL_OPTIONS.filter(o => o.value.includes(':LEFT:')),
            ]
          }
          const specialValue = (() => {
            if (row.slot === 'tap') {
              if (tapStickShiftEntry) {
                return buildStickShiftValue(tapStickShiftEntry.target, tapStickShiftEntry.mode)
              }
              if (row.binding && SPECIAL_LABELS[row.binding]) {
                return row.binding
              }
              return specialKey ?? ''
            }
            if (isSpecialValue && row.binding) {
              return row.binding
            }
            return ''
          })()
          const clearTapSpecialBinding = () => {
            if (row.slot !== 'tap') return
            if (row.binding && SPECIAL_LABELS[row.binding]) {
              onBindingChange(button.command, row.slot, row.id, null)
            }
          }
          const clearAllStickShiftAssignments = () => {
            if (!stickShiftEntries.length || !onStickModeShiftChange) return
            stickShiftEntries.forEach(entry => onStickModeShiftChange(button.command, entry.target))
            updateStickShiftDisplayMode(buttonKey, undefined)
          }
          const needsModifier = MODIFIER_SLOT_TYPES.includes(row.slot as BindingSlot)
          const manualEntries = manualRows[button.command]?.[row.slot] ?? []
          const manualInfo = manualEntries.find(entry => entry.id === row.id)
          const modifierValue = needsModifier
            ? row.modifierCommand ??
              manualInfo?.modifierCommand ??
              getDefaultModifierForButton(button.command, modifierOptions)
            : undefined
          const modifierLabel = row.slot === 'simultaneous' ? 'Combine with' : row.slot === 'diagonal' ? 'Diagonal with' : 'Modifier button'
          let rowModifierOptions = modifierOptions
          if (
            needsModifier &&
            modifierValue &&
            !modifierOptions.some(option => option.value === modifierValue)
          ) {
            rowModifierOptions = [...modifierOptions, { value: modifierValue, label: modifierValue }]
          }
          const isLegacyFileCall = Boolean(row.binding && /"\s*[^"]+\.(txt|cfg|ini)"/i.test(row.binding))
          return (
            <Fragment key={`${button.command}-${row.slot}-${row.id}-wrapper`}>
              <BindingRow
                key={row.id}
                label={headerLabel}
                showHeader={showHeader}
                displayValue={displayValue}
                isManual={row.isManual}
                isCapturing={rowCapturing}
                captureLabel={captureLabel}
                onBeginCapture={() =>
                  beginCapture(
                    button.command,
                    row.slot,
                    row.id,
                    row.slot === 'hold' ? 'Press and hold binding…' : 'Press any key or mouse button…',
                    needsModifier ? modifierValue : undefined
                  )
                }
                onCancelCapture={cancelCapture}
                onClear={() => {
                  if (row.slot === 'tap') {
                    if (row.binding) {
                      onBindingChange(button.command, row.slot, row.id, null)
                    } else if (specialKey) {
                      onClearSpecialAction(specialKey, button.command)
                    } else if (tapStickShiftEntry) {
                      onStickModeShiftChange?.(button.command, tapStickShiftEntry.target)
                    }
                  } else {
                    const options = needsModifier ? { modifier: modifierValue } : undefined
                    onBindingChange(button.command, row.slot, row.id, null, options)
                  }
                }}
                onRemoveRow={row.isManual ? () => removeManualRow(button.command, row.slot, row.id) : undefined}
                disableClear={!displayValue && !row.isManual}
                specialOptions={rowSpecialOptions}
                specialValue={specialValue}
                modifierOptions={needsModifier ? rowModifierOptions : undefined}
                modifierValue={modifierValue}
                modifierLabel={needsModifier ? modifierLabel : undefined}
                onModifierChange={
                  needsModifier
                    ? (selected) => {
                        if (!selected) return
                        if (row.isManual) {
                          updateManualRow(button.command, row.slot, row.id, { modifierCommand: selected })
                        }
                        onModifierChange(button.command, row.slot, row.id, row.modifierCommand, selected, row.binding ?? null)
                      }
                    : undefined
                }
                onSpecialChange={
                  row.slot === 'tap'
                    ? (selected) => {
                        if (!selected) {
                          if (specialKey) {
                            onClearSpecialAction(specialKey, button.command)
                          }
                          if (tapStickShiftEntry) {
                            clearAllStickShiftAssignments()
                          }
                          clearTapSpecialBinding()
                          return
                        }
                        if (selected === STICK_SHIFT_HEADER_OPTION.value) {
                          return
                        }
                        const parsedShift = parseStickShiftSelection(selected)
                        if (parsedShift && onStickModeShiftChange) {
                          if (specialKey) {
                            onClearSpecialAction(specialKey, button.command)
                          }
                          clearTapSpecialBinding()
                          stickShiftEntries.forEach(entry => onStickModeShiftChange(button.command, entry.target))
                          onStickModeShiftChange(button.command, parsedShift.target, parsedShift.mode)
                          updateStickShiftDisplayMode(buttonKey, 'tap')
                          return
                        }
                        if (tapStickShiftEntry) {
                          clearAllStickShiftAssignments()
                        }
                        onAssignSpecialAction(selected, button.command)
                      }
                    : (selected) => {
                        if (!selected) {
                          if (isSpecialValue) {
                            const options = needsModifier ? { modifier: modifierValue } : undefined
                            onBindingChange(button.command, row.slot, row.id, null, options)
                          }
                      return
                    }
                    onBindingChange(
                      button.command,
                      row.slot,
                      row.id,
                      selected,
                      needsModifier ? { modifier: modifierValue } : undefined
                    )
                    if (row.isManual) {
                      removeManualRow(button.command, row.slot, row.id)
                    }
                  }
            }
          />
              {isLegacyFileCall && (
                <div className="legacy-binding-warning">
                  Legacy script detected — place the referenced file inside <code>JSM_GUI/bin/</code> or clear this row.
                </div>
              )}
            </Fragment>
          )
        })}
        {(() => {
          const hasHold = rows.some(row => row.slot === 'hold')
          const hasDouble = rows.some(row => row.slot === 'double')
          const availableSlots = EXTRA_BINDING_SLOTS.filter(slot => {
            if (slot === 'hold') return !hasHold
            if (slot === 'double') return !hasDouble
            return true
          })
          return (
            <div className={`${keymapStyles.bindingRow} ${keymapStyles.addBindingRow}`} data-capture-ignore="true">
              <select
                className="app-select"
                value=""
                onChange={(event) => {
                  const selectedValue = event.target.value
                  if (selectedValue === STICK_SHIFT_HEADER_OPTION.value) {
                    event.target.value = ''
                    return
                  }
                  const parsedShift = parseStickShiftSelection(selectedValue)
                  if (parsedShift && onStickModeShiftChange) {
                    onStickModeShiftChange(button.command, parsedShift.target, parsedShift.mode)
                    updateStickShiftDisplayMode(buttonKey, 'extra')
                    event.target.value = ''
                    return
                  }
                  const selected = selectedValue as BindingSlot
                  if (selected) {
                    const isComboSlot = MODIFIER_SLOT_TYPES.includes(selected)
                    if (isComboSlot) {
                      ensureManualRow(button.command, selected, {
                        modifierCommand: getDefaultModifierForButton(button.command, modifierOptions),
                      })
                    } else {
                      ensureManualRow(button.command, selected)
                    }
                  }
                  event.target.value = ''
                }}
              >
                <option value="">Add extra binding</option>
                {availableSlots.map(slot => (
                  <option key={`${button.command}-${slot}-opt`} value={slot}>
                    {slot === 'hold'
                      ? 'Hold (press & hold)'
                      : slot === 'double'
                        ? 'Double press'
                        : slot === 'chord'
                          ? 'Chorded press'
                          : slot === 'simultaneous'
                            ? 'Simultaneous press'
                            : 'Diagonal press'}
                  </option>
                ))}
                {onStickModeShiftChange && (
                  <>
                    <option value={STICK_SHIFT_HEADER_OPTION.value} disabled>
                      Stick mode shifts
                    </option>
                    <option value={STICK_SHIFT_RIGHT_HEADER.value} disabled>
                      {STICK_SHIFT_RIGHT_HEADER.label}
                    </option>
                    {STICK_SHIFT_SPECIAL_OPTIONS.filter(o => o.value.includes(':RIGHT:')).map(option => (
                      <option key={`${button.command}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value={STICK_SHIFT_LEFT_HEADER.value} disabled>
                      {STICK_SHIFT_LEFT_HEADER.label}
                    </option>
                    {STICK_SHIFT_SPECIAL_OPTIONS.filter(o => o.value.includes(':LEFT:')).map(option => (
                      <option key={`${button.command}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          )
        })()}
        {stickShiftEntries.length > 0 && (
          <div className={stickStyles.stickShiftRows}>
            {stickShiftEntries.map(entry => {
              const tapDisplaysShift =
                rows.length === 1 &&
                rows[0].slot === 'tap' &&
                !rows[0].binding &&
                !tapSpecialLabel &&
                stickShiftEntries.length === 1 &&
                shiftDisplayMode !== 'extra'
              if (tapDisplaysShift) {
                return null
              }
              const label = entry.target === 'LEFT' ? 'Left stick mode shift' : 'Right stick mode shift'
              const buttonLabel = `${entry.target === 'LEFT' ? 'Left stick' : 'Right stick'} → ${formatStickModeLabel(entry.mode)}`
              return (
                <div className={`${keymapStyles.bindingRow} ${keymapStyles.manualStickShift}`} key={`${button.command}-${entry.target}`}>
                  <div className={keymapStyles.bindingRowHeader}>
                    <span>{label}</span>
                  </div>
                  <div className={keymapStyles.primaryBindingRow}>
                    <button type="button" className={keymapStyles.bindingInput} disabled>
                      {buttonLabel}
                    </button>
                    <button
                      type="button"
                      className={keymapStyles.clearBindingBtn}
                      onClick={() => {
                        onStickModeShiftChange?.(button.command, entry.target)
                        if (stickShiftEntries.length === 1) {
                          updateStickShiftDisplayMode(buttonKey, undefined)
                        }
                      }}
                      data-capture-ignore="true"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {buttonHasTrackball && (
          <div className={keymapStyles.trackballInline} data-capture-ignore="true">
            <label>
              Trackball decay
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={trackballDecay}
                onChange={(event) => onTrackballDecayChange(event.target.value)}
                placeholder="Default (1.0)"
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
      </div>
    </div>
  )
}
