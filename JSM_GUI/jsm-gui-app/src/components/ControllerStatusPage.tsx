import type { TFunction } from 'i18next'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { keyName } from '../constants/configKeys'
import { formatStickModeLabel } from '../constants/sticks'
import type { TelemetryDevice } from '../hooks/useTelemetry'
import {
  BUMPER_BUTTONS,
  CENTER_BUTTONS,
  DPAD_BUTTONS,
  FACE_BUTTONS,
  LEFT_STICK_BUTTONS,
  MINI_BUTTONS,
  MISC_BUTTONS,
  PADDLE_BUTTONS,
  RIGHT_STICK_BUTTONS,
  TOUCH_BUTTONS,
  TRIGGER_BUTTONS,
  buildTouchpadGridButton,
  getAllSpecialLabelKeys,
  getSpecialLabel,
  type ButtonDefinition,
} from '../keymap/schema'
import {
  getButtonBindingRows,
  getButtonSpecialAssignments,
  getKeymapValue,
  getStickModeShiftAssignmentMap,
  type BindingSlot,
  type ButtonBindingRow,
  type StickModeShiftAssignment,
} from '../utils/keymap'
import { buildModifierOptions, resolveModifierOptionLabel } from '../utils/modifierOptions'
import { controllerButtonLabel, getPressedControllerButtons } from '../utils/controllerStatus'
import { controllerLabel, formatVidPid } from '../utils/controllers'
import { Card } from './Card'
import { ControllerStatusSvg } from './ControllerStatusSvg'
import styles from './ControllerStatusPage.module.css'

type ControllerStatusPageProps = {
  backendChoice: 'SDL' | 'legacy'
  configText: string
  devices?: TelemetryDevice[]
  ignoredDevices?: string[]
  view: 'status' | 'bindings'
}

type ControllerDeviceCardProps = {
  configText: string
  device: TelemetryDevice
  ignoredDevices?: string[]
  view: 'status' | 'bindings'
}

type MeterRowProps = {
  label: string
  value?: number
  digits?: number
  mode?: 'signed' | 'unsigned'
  maxAbs?: number
}

type BindingLayer = BindingSlot | 'special' | 'stickShift'

type BindingDetailEntry = {
  id: string
  label: string
  value: string
  meta?: string
  summaryPrefix?: string
}

type ButtonCategory = {
  key: string
  title: string
  buttons: ButtonDefinition[]
}

type BoundButtonCard = {
  button: ButtonDefinition
  categoryTitle: string
  command: string
  entries: BindingDetailEntry[]
}

const SPECIAL_LABEL_KEYS = getAllSpecialLabelKeys()

const BINDING_LAYER_ORDER: BindingLayer[] = [
  'tap',
  'hold',
  'double',
  'chord',
  'simultaneous',
  'diagonal',
  'special',
  'stickShift',
]

const SLOT_LABEL_KEYS: Record<BindingSlot, string> = {
  tap: 'keymap.buttonRegularPress',
  hold: 'keymap.holdPressAndHold',
  double: 'keymap.doublePress',
  chord: 'keymap.chordedPress',
  simultaneous: 'keymap.simultaneousPress',
  diagonal: 'keymap.diagonalPress',
}

const MAX_TOUCHPAD_GRID_BUTTONS = 25

const formatValue = (value: number | undefined, digits = 2) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '0.00'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const clampPositiveInteger = (value: number, fallback = 0) => {
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.max(1, Math.floor(value))
}

const parseNumberTokens = (value?: string) =>
  (value ?? '')
    .trim()
    .split(/\s+/)
    .map(token => Number(token))
    .filter(num => Number.isFinite(num))

const formatBindingValue = (value: string, t: TFunction) => {
  const trimmed = value.trim()
  const normalized = trimmed.toUpperCase()
  return SPECIAL_LABEL_KEYS[normalized] ? getSpecialLabel(normalized, t) : trimmed
}

const formatStickShiftValue = (assignment: StickModeShiftAssignment, t: TFunction) =>
  assignment.target === 'LEFT'
    ? t('specialBindings.stickShiftLeft', { mode: formatStickModeLabel(assignment.mode, t) })
    : t('specialBindings.stickShiftRight', { mode: formatStickModeLabel(assignment.mode, t) })

const dedupeEntries = (entries: BindingDetailEntry[]) => {
  const seen = new Set<string>()
  return entries.filter(entry => {
    const key = `${entry.label}|${entry.meta ?? ''}|${entry.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const slotLabel = (slot: BindingSlot, t: TFunction) => t(SLOT_LABEL_KEYS[slot])

const comboMetaLabel = (
  slot: Extract<BindingSlot, 'chord' | 'simultaneous' | 'diagonal'>,
  modifier: string | undefined,
  modifierLabelMap: Record<string, string>,
  t: TFunction
) => {
  if (!modifier) return undefined
  const modifierLabel = modifierLabelMap[modifier.toUpperCase()] ?? modifier
  const prefix =
    slot === 'simultaneous'
      ? t('keymap.combineWith')
      : slot === 'diagonal'
        ? t('keymap.diagonalWith')
        : t('keymap.modifierButton')
  return { detail: `${prefix}: ${modifierLabel}`, summary: modifierLabel }
}

const actionEntriesForRows = (
  rows: ButtonBindingRow[],
  modifierLabelMap: Record<string, string>,
  t: TFunction
) =>
  rows.flatMap(row => {
    if (!row.binding) return []
    const comboMeta =
      row.slot === 'chord' || row.slot === 'simultaneous' || row.slot === 'diagonal'
        ? comboMetaLabel(row.slot, row.modifierCommand, modifierLabelMap, t)
        : undefined
    return [
      {
        id: row.id,
        label: slotLabel(row.slot, t),
        value: formatBindingValue(row.binding, t),
        meta: comboMeta?.detail,
        summaryPrefix: comboMeta?.summary,
      },
    ]
  })

const specialEntries = (values: string[], t: TFunction) =>
  values.map((value, index) => ({
    id: `special-${value}-${index}`,
    label: t('keymap.specialBinds'),
    value: getSpecialLabel(value, t),
  }))

const stickShiftEntries = (assignments: StickModeShiftAssignment[], t: TFunction) =>
  assignments.map((assignment, index) => ({
    id: `stick-shift-${assignment.target}-${assignment.mode}-${index}`,
    label: t('keymap.stickModeShifts'),
    value: formatStickShiftValue(assignment, t),
  }))

const layerEntries = (
  layer: BindingLayer,
  rows: ButtonBindingRow[],
  specials: string[],
  shifts: StickModeShiftAssignment[],
  modifierLabelMap: Record<string, string>,
  t: TFunction
) => {
  switch (layer) {
    case 'tap': {
      const tapRow = rows.find(row => row.slot === 'tap' && row.binding)
      if (tapRow) {
        return actionEntriesForRows([tapRow], modifierLabelMap, t)
      }
      const fallbackEntries = [
        ...specialEntries(specials, t).map(entry => ({ ...entry, label: slotLabel('tap', t) })),
        ...stickShiftEntries(shifts, t).map(entry => ({ ...entry, label: slotLabel('tap', t) })),
      ]
      return dedupeEntries(fallbackEntries)
    }
    case 'hold':
    case 'double':
      return actionEntriesForRows(rows.filter(row => row.slot === layer), modifierLabelMap, t)
    case 'chord':
    case 'simultaneous':
    case 'diagonal':
      return actionEntriesForRows(rows.filter(row => row.slot === layer), modifierLabelMap, t)
    case 'special':
      return dedupeEntries(specialEntries(specials, t))
    case 'stickShift':
      return stickShiftEntries(shifts, t)
    default:
      return []
  }
}

const touchpadGridLayout = (configText: string) => {
  const sizeTokens = parseNumberTokens(getKeymapValue(configText, keyName.GRID_SIZE))
  let columns = clampPositiveInteger(sizeTokens[0] ?? 0)
  let rows = clampPositiveInteger(sizeTokens[1] ?? 0)
  const configuredCount = columns > 0 && rows > 0 ? Math.min(columns * rows, MAX_TOUCHPAD_GRID_BUTTONS) : 0

  let referencedCount = 0
  const matches = configText.matchAll(/\bT(\d{1,2})\b/gi)
  for (const match of matches) {
    const value = Number(match[1])
    if (Number.isFinite(value)) {
      referencedCount = Math.max(referencedCount, value)
    }
  }

  const count = Math.min(Math.max(configuredCount, referencedCount), MAX_TOUCHPAD_GRID_BUTTONS)
  if (count === 0) {
    return { columns: 0, rows: 0, count: 0 }
  }

  if (columns === 0 || rows === 0) {
    columns = Math.min(count, 5)
    rows = Math.ceil(count / columns)
  } else if (count > configuredCount) {
    rows = Math.ceil(count / columns)
  }

  return { columns, rows, count }
}

const buildTouchpadGridButtons = (configText: string) => {
  const { columns, count } = touchpadGridLayout(configText)
  if (count === 0) return []
  const safeColumns = Math.max(columns, 1)
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / safeColumns) + 1
    const col = (index % safeColumns) + 1
    return buildTouchpadGridButton(index + 1, row, col)
  })
}

const buttonsByCommands = (buttons: ButtonDefinition[], commands: string[]) => {
  const allowed = new Set(commands.map(command => command.toUpperCase()))
  return buttons.filter(button => allowed.has(button.command.toUpperCase()))
}

const buildButtonCategories = (device: TelemetryDevice, touchpadGridButtons: ButtonDefinition[], t: TFunction) => {
  const hasLeftSide = device.split !== 2
  const hasRightSide = device.split !== 1
  const isSplit = device.split === 1 || device.split === 2
  const categories: ButtonCategory[] = []

  if (hasRightSide) {
    categories.push({ key: 'face', title: t('keymap.faceButtonsTitle'), buttons: FACE_BUTTONS })
  }
  if (hasLeftSide) {
    categories.push({ key: 'dpad', title: t('keymap.dpadTitle'), buttons: DPAD_BUTTONS })
  }

  categories.push({
    key: 'bumpers',
    title: t('keymap.bumpersTitle'),
    buttons: buttonsByCommands(BUMPER_BUTTONS, [...(hasLeftSide ? ['L'] : []), ...(hasRightSide ? ['R'] : [])]),
  })
  categories.push({
    key: 'triggers',
    title: t('keymap.triggersTitle'),
    buttons: buttonsByCommands(TRIGGER_BUTTONS, [
      ...(hasLeftSide ? ['ZL', 'ZLF'] : []),
      ...(hasRightSide ? ['ZR', 'ZRF'] : []),
    ]),
  })
  categories.push({
    key: 'center',
    title: t('keymap.centerButtonsTitle'),
    buttons: buttonsByCommands(
      CENTER_BUTTONS,
      isSplit ? (device.split === 1 ? ['-'] : ['+', 'HOME']) : ['+', '-', 'MIC', 'HOME']
    ),
  })
  if (hasLeftSide) {
    categories.push({ key: 'left-stick', title: t('keymap.leftStickTitle'), buttons: LEFT_STICK_BUTTONS })
  }
  if (hasRightSide) {
    categories.push({ key: 'right-stick', title: t('keymap.rightStickTitle'), buttons: RIGHT_STICK_BUTTONS })
  }
  categories.push({
    key: 'touch',
    title: t('keymap.touchButtonsTitle'),
    buttons: buttonsByCommands(
      TOUCH_BUTTONS,
      isSplit ? (device.split === 1 ? ['CAPTURE'] : []) : ['TOUCH', 'CAPTURE']
    ),
  })
  categories.push({
    key: 'paddles',
    title: t('keymap.paddlesTitle'),
    buttons: buttonsByCommands(
      PADDLE_BUTTONS,
      isSplit ? (device.split === 1 ? ['LSL', 'LSR'] : ['RSR', 'RSL']) : ['LSL', 'RSR', 'LSR', 'RSL']
    ),
  })
  categories.push({
    key: 'mini',
    title: t('keymap.bumpersTitle'),
    buttons: buttonsByCommands(
      MINI_BUTTONS,
      isSplit ? (device.split === 1 ? ['LMINI'] : ['RMINI']) : ['LMINI', 'RMINI']
    ),
  })

  if (!isSplit && MISC_BUTTONS.length) {
    categories.push({ key: 'extra', title: t('keymap.extraButtonsTitle'), buttons: MISC_BUTTONS })
  }
  if (!isSplit && touchpadGridButtons.length > 0) {
    categories.push({ key: 'touch-grid', title: t('keymap.touchpadGridTitle'), buttons: touchpadGridButtons })
  }

  return categories.filter(category => category.buttons.length > 0)
}

function MeterRow({ label, value = 0, digits = 2, mode = 'signed', maxAbs = 1 }: MeterRowProps) {
  const normalizedValue = Number.isFinite(value) ? value : 0
  const safeMaxAbs = maxAbs > 0 ? maxAbs : 1
  const fillWidth =
    mode === 'unsigned'
      ? `${clamp(normalizedValue / safeMaxAbs, 0, 1) * 100}%`
      : `${clamp(Math.abs(normalizedValue) / safeMaxAbs, 0, 1) * 50}%`

  const fillStyle: CSSProperties =
    mode === 'unsigned'
      ? { width: fillWidth }
      : normalizedValue >= 0
        ? { left: '50%', width: fillWidth }
        : { right: '50%', width: fillWidth }

  return (
    <div className={styles.metricRow}>
      <div className={styles.metricHeader}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles.metricValue}>{formatValue(normalizedValue, digits)}</span>
      </div>
      <div className={styles.meterTrack}>
        {mode === 'signed' && <span className={styles.meterCenterLine} />}
        <span
          className={`${styles.meterFill} ${
            mode === 'unsigned'
              ? styles.meterFillUnsigned
              : normalizedValue >= 0
                ? styles.meterFillPositive
                : styles.meterFillNegative
          }`}
          style={fillStyle}
        />
      </div>
    </div>
  )
}

function ControllerDeviceCard({ configText, device, ignoredDevices, view }: ControllerDeviceCardProps) {
  const { t } = useTranslation()
  const [activeLayer, setActiveLayer] = useState<BindingLayer>('tap')
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null)
  const isBindingView = view === 'bindings'
  const bindingCardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const vidPid = formatVidPid(device.vid, device.pid)
  const ignoreKey = vidPid.toLowerCase()
  const isIgnored = Boolean(vidPid) && ignoredDevices?.includes(ignoreKey)
  const pressedButtons = getPressedControllerButtons(device)
  const hasLeftSide = device.split !== 2
  const hasRightSide = device.split !== 1
  const touchpadGridButtons = useMemo(() => buildTouchpadGridButtons(configText), [configText])
  const buttonCategories = useMemo(
    () => buildButtonCategories(device, touchpadGridButtons, t),
    [device, touchpadGridButtons, t]
  )
  const allButtons = useMemo(() => {
    const seen = new Set<string>()
    return buttonCategories.flatMap(category =>
      category.buttons.filter(button => {
        const command = button.command.toUpperCase()
        if (seen.has(command)) return false
        seen.add(command)
        return true
      })
    )
  }, [buttonCategories])
  const bindingRowsByButton = useMemo(() => {
    const next: Record<string, ButtonBindingRow[]> = {}
    allButtons.forEach(button => {
      next[button.command.toUpperCase()] = getButtonBindingRows(configText, button.command)
    })
    return next
  }, [allButtons, configText])
  const directSpecialAssignments = useMemo(() => getButtonSpecialAssignments(configText), [configText])
  const specialAssignmentsByButton = useMemo(() => {
    const next: Record<string, string[]> = {}
    allButtons.forEach(button => {
      const command = button.command.toUpperCase()
      const rowSpecials = (bindingRowsByButton[command] ?? []).flatMap(row => {
        const normalized = row.binding?.trim().toUpperCase()
        return normalized && SPECIAL_LABEL_KEYS[normalized] ? [normalized] : []
      })
      const values = [...(directSpecialAssignments[command] ?? []), ...rowSpecials]
      const deduped = [...new Set(values)]
      if (deduped.length > 0) {
        next[command] = deduped
      }
    })
    return next
  }, [allButtons, bindingRowsByButton, directSpecialAssignments])
  const stickModeShiftAssignments = useMemo(() => getStickModeShiftAssignmentMap(configText), [configText])
  const modifierLabelMap = useMemo(() => {
    const next: Record<string, string> = {}
    buildModifierOptions(true, touchpadGridButtons.length).forEach(option => {
      next[option.value.toUpperCase()] = resolveModifierOptionLabel(option, t)
    })
    return next
  }, [touchpadGridButtons.length, t])
  const layerEntriesByButton = useMemo(() => {
    const next: Record<string, BindingDetailEntry[]> = {}
    allButtons.forEach(button => {
      const command = button.command.toUpperCase()
      next[command] = layerEntries(
        activeLayer,
        bindingRowsByButton[command] ?? [],
        specialAssignmentsByButton[command] ?? [],
        stickModeShiftAssignments[command] ?? [],
        modifierLabelMap,
        t
      )
    })
    return next
  }, [
    activeLayer,
    allButtons,
    bindingRowsByButton,
    specialAssignmentsByButton,
    stickModeShiftAssignments,
    modifierLabelMap,
    t,
  ])
  const layerBoundCommandList = useMemo(
    () => allButtons.map(button => button.command.toUpperCase()).filter(command => (layerEntriesByButton[command] ?? []).length > 0),
    [allButtons, layerEntriesByButton]
  )
  const layerBoundCommandSet = useMemo(() => new Set(layerBoundCommandList), [layerBoundCommandList])
  const boundButtonCards = useMemo<BoundButtonCard[]>(
    () =>
      buttonCategories.flatMap(category =>
        category.buttons.flatMap(button => {
          const command = button.command.toUpperCase()
          const entries = layerEntriesByButton[command] ?? []
          return entries.length > 0
            ? [
                {
                  button,
                  categoryTitle: category.title,
                  command,
                  entries,
                },
              ]
            : []
        })
      ),
    [buttonCategories, layerEntriesByButton]
  )

  useEffect(() => {
    if (!isBindingView) {
      return
    }
    const normalized = selectedCommand?.toUpperCase() ?? null
    if (normalized && layerBoundCommandSet.has(normalized)) {
      return
    }
    const fallback = boundButtonCards[0]?.command ?? null
    if (fallback !== normalized) {
      setSelectedCommand(fallback)
    }
  }, [boundButtonCards, isBindingView, layerBoundCommandSet, selectedCommand])

  const normalizedSelectedCommand = selectedCommand?.toUpperCase() ?? null

  useEffect(() => {
    if (!isBindingView || !normalizedSelectedCommand) {
      return
    }
    bindingCardRefs.current[normalizedSelectedCommand]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }, [isBindingView, normalizedSelectedCommand])

  return (
    <Card className={styles.deviceCard}>
      <div className={styles.deviceHeader}>
        <div className={styles.deviceHeading}>
          <h3>{controllerLabel(device.type, t)}</h3>
          <div className={styles.deviceMeta}>
            <span>{t('controllerStatus.handleLabel', { handle: device.handle })}</span>
            {vidPid && <span>{t('controllerStatus.vidPidLabel', { value: vidPid })}</span>}
          </div>
        </div>
        <span className={`${styles.statusBadge} ${isIgnored ? styles.statusIgnored : styles.statusNormal}`}>
          {isIgnored ? t('controllerStatus.ignoredGyro') : t('controllerStatus.normalStatus')}
        </span>
      </div>

      {isBindingView ? (
        <div className={styles.bindingPreviewLayout}>
          <section className={`${styles.panel} ${styles.visualPanel}`}>
            <div className={styles.visualPanelHeader}>
              <div className={styles.panelTitle}>{t('app.tabs.bindingPreview')}</div>
              <span className={styles.visualLayerTag}>
                {activeLayer === 'special'
                  ? t('keymap.specialBinds')
                  : activeLayer === 'stickShift'
                    ? t('keymap.stickModeShifts')
                    : slotLabel(activeLayer, t)}
              </span>
            </div>
            <ControllerStatusSvg
              device={device}
              boundCommands={layerBoundCommandSet}
              selectedCommand={normalizedSelectedCommand}
              onSelectCommand={command => setSelectedCommand(command.toUpperCase())}
            />
          </section>

          <section className={`${styles.panel} ${styles.boundButtonsPanel}`}>
            <div className={styles.bindingPanelHeader}>
              <div className={styles.panelTitle}>{t('controllerStatus.boundButtons')}</div>
              <div className={styles.layerTabs}>
                {BINDING_LAYER_ORDER.map(layer => {
                  const label =
                    layer === 'special'
                      ? t('keymap.specialBinds')
                      : layer === 'stickShift'
                        ? t('keymap.stickModeShifts')
                        : slotLabel(layer, t)
                  return (
                    <button
                      key={layer}
                      type="button"
                      className={`${styles.layerTab} ${activeLayer === layer ? styles.layerTabActive : ''}`}
                      onClick={() => setActiveLayer(layer)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {boundButtonCards.length > 0 ? (
              <div className={styles.boundButtonGrid}>
                {boundButtonCards.map(card => {
                  const isSelected = normalizedSelectedCommand === card.command
                  return (
                    <button
                      key={card.command}
                      type="button"
                      ref={node => {
                        bindingCardRefs.current[card.command] = node
                      }}
                      className={`${styles.boundButtonCard} ${isSelected ? styles.bindingItemSelected : ''}`}
                      onClick={() => setSelectedCommand(card.command)}
                    >
                      <span className={styles.bindingItemHeader}>
                        <span className={styles.bindingItemTitle}>
                          <span className={styles.bindingItemLabel}>{controllerButtonLabel(card.button)}</span>
                          <span className={styles.bindingItemCategory}>{card.categoryTitle}</span>
                        </span>
                        <span className={styles.bindingItemCode}>{card.button.command}</span>
                      </span>

                      <div className={styles.detailList}>
                        {card.entries.map(entry => (
                          <div key={entry.id} className={styles.detailRow}>
                            <div className={styles.detailRowHeader}>
                              <span className={styles.detailLabel}>{entry.label}</span>
                              {entry.meta && <span className={styles.detailMeta}>{entry.meta}</span>}
                            </div>
                            <div className={styles.detailValue}>{entry.value}</div>
                          </div>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className={styles.emptyInline}>{t('controllerStatus.noBoundButtonsForLayer')}</div>
            )}
          </section>
        </div>
      ) : !device.status ? (
        <div className={styles.emptyInline}>{t('controllerStatus.noLiveStatus')}</div>
      ) : (
        <div className={styles.statusLayout}>
          <section className={`${styles.panel} ${styles.visualPanel}`}>
            <div className={styles.visualPanelHeader}>
              <div className={styles.panelTitle}>{t('controllerStatus.title')}</div>
            </div>
            <ControllerStatusSvg device={device} />
          </section>

          <div className={styles.detailPanels}>
            <section className={`${styles.panel} ${styles.buttonsPanel}`}>
              <div className={styles.panelTitle}>{t('controllerStatus.buttons')}</div>
              {pressedButtons.length > 0 ? (
                <div className={styles.buttonList}>
                  {pressedButtons.map(button => (
                    <span key={button.command} className={styles.buttonChip}>
                      {controllerButtonLabel(button)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyInline}>{t('controllerStatus.noButtons')}</div>
              )}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTitle}>{t('controllerStatus.sticks')}</div>
              <div className={styles.metricGrid}>
                {hasLeftSide && (
                  <>
                    <MeterRow label={t('controllerStatus.leftStickX')} value={device.status.leftStick.x} />
                    <MeterRow label={t('controllerStatus.leftStickY')} value={device.status.leftStick.y} />
                  </>
                )}
                {hasRightSide && (
                  <>
                    <MeterRow label={t('controllerStatus.rightStickX')} value={device.status.rightStick.x} />
                    <MeterRow label={t('controllerStatus.rightStickY')} value={device.status.rightStick.y} />
                  </>
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTitle}>{t('controllerStatus.triggers')}</div>
              <div className={styles.metricGrid}>
                {hasLeftSide && (
                  <MeterRow
                    label={t('controllerStatus.leftTrigger')}
                    value={device.status.triggers.left}
                    mode="unsigned"
                  />
                )}
                {hasRightSide && (
                  <MeterRow
                    label={t('controllerStatus.rightTrigger')}
                    value={device.status.triggers.right}
                    mode="unsigned"
                  />
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTitle}>{t('controllerStatus.gyro')}</div>
              <div className={styles.metricGrid}>
                <MeterRow label={t('controllerStatus.gyroX')} value={device.status.gyro.x} maxAbs={360} />
                <MeterRow label={t('controllerStatus.gyroY')} value={device.status.gyro.y} maxAbs={360} />
                <MeterRow label={t('controllerStatus.gyroZ')} value={device.status.gyro.z} maxAbs={360} />
              </div>
            </section>
          </div>
        </div>
      )}
    </Card>
  )
}

export function ControllerStatusPage({
  backendChoice,
  configText,
  devices,
  ignoredDevices,
  view,
}: ControllerStatusPageProps) {
  const { t } = useTranslation()
  const descriptionKey =
    view === 'bindings' ? 'controllerStatus.bindingsDescription' : 'controllerStatus.description'
  const noControllersDescriptionKey =
    view === 'bindings'
      ? 'controllerStatus.noControllersBindingsDescription'
      : 'controllerStatus.noControllersDescription'

  if (backendChoice === 'legacy' && view === 'status') {
    return (
      <Card className={styles.pageCard}>
        <h2>{t('controllerStatus.title')}</h2>
        <p className="field-description">{t(descriptionKey)}</p>
        <div className={styles.emptyState}>
          <strong>{t('controllerStatus.sdlOnlyTitle')}</strong>
          <p>{t('controllerStatus.sdlOnlyDescription')}</p>
        </div>
      </Card>
    )
  }

  if (!devices || devices.length === 0) {
    return (
      <Card className={styles.pageCard}>
        <h2>{t('controllerStatus.title')}</h2>
        <p className="field-description">{t(descriptionKey)}</p>
        <div className={styles.emptyState}>
          <strong>{t('controllerStatus.noControllersTitle')}</strong>
          <p>{t(noControllersDescriptionKey)}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className={styles.page}>
      <Card className={styles.pageCard}>
        <h2>{t('controllerStatus.title')}</h2>
        <p className="field-description">{t(descriptionKey)}</p>
      </Card>
      {devices.map(device => (
        <ControllerDeviceCard
          key={device.handle}
          configText={configText}
          device={device}
          ignoredDevices={ignoredDevices}
          view={view}
        />
      ))}
    </div>
  )
}
