import type { TelemetryDevice } from '../hooks/useTelemetry'
import {
  controllerBackInputMode,
  getPressedControllerCommandSet,
} from '../utils/controllerStatus'
import styles from './ControllerStatusSvg.module.css'

type ControllerStatusSvgProps = {
  boundCommands?: Set<string>
  device: TelemetryDevice
  selectedCommand?: string | null
  onSelectCommand?: (command: string) => void
}

type SharedControlProps = {
  bound?: boolean
  muted?: boolean
  onSelect?: () => void
  pressed?: boolean
  selected?: boolean
  title?: string
}

type ButtonBubbleProps = SharedControlProps & {
  cx: number
  cy: number
  label: string
  radius?: number
}

type PathButtonProps = SharedControlProps & {
  compact?: boolean
  d: string
  label: string
  labelX: number
  labelY: number
}

type StickProps = SharedControlProps & {
  cx: number
  cy: number
  x: number
  y: number
}

type TriggerPathProps = SharedControlProps & {
  d: string
  fillX: number
  fillY: number
  fillWidth: number
  label: string
  labelX: number
  labelY: number
  value: number
}

type PaddleButtonProps = SharedControlProps & {
  height: number
  label: string
  width: number
  x: number
  y: number
}

const LEFT_STICK_COMMANDS = ['L3', 'LUP', 'LDOWN', 'LLEFT', 'LRIGHT', 'LRING', 'LTOUCH']
const RIGHT_STICK_COMMANDS = ['R3', 'RUP', 'RDOWN', 'RLEFT', 'RRIGHT', 'RRING', 'RTOUCH']
const LEFT_TRIGGER_COMMANDS = ['ZL', 'ZLF']
const RIGHT_TRIGGER_COMMANDS = ['ZR', 'ZRF']
const PADDLE_COMMANDS = ['LSL', 'LSR', 'RSR', 'RSL'] as const

type PaddleCommand = (typeof PADDLE_COMMANDS)[number]

type PaddleLayoutEntry = {
  command: PaddleCommand
  height: number
  side: 'left' | 'right'
  width: number
  x: number
  y: number
}

const PADDLE_LAYOUT: PaddleLayoutEntry[] = [
  { command: 'LSL', side: 'left', x: 162, y: 656, width: 132, height: 38 },
  { command: 'LSR', side: 'left', x: 196, y: 710, width: 132, height: 38 },
  { command: 'RSR', side: 'right', x: 823, y: 656, width: 132, height: 38 },
  { command: 'RSL', side: 'right', x: 789, y: 710, width: 132, height: 38 },
]

const BACK_INPUT_TITLES: Record<PaddleCommand, string> = {
  LSL: 'Primary left back paddle / Joy-Con L SL',
  LSR: 'Secondary left back paddle / Joy-Con L SR',
  RSR: 'Primary right back paddle / Joy-Con R SR',
  RSL: 'Secondary right back paddle / Joy-Con R SL',
}

// Unbranded front-view line artwork; coordinates retain the live input hit targets.
const GENERIC_PATHS = {
  shell: 'M184 140 C169 149 112 292 70 452 C41 557 58 622 112 650 C139 664 171 663 194 649 L324 576 Q339 567 359 567 H753 Q772 567 789 576 L919 649 C958 674 1002 653 1030 622 C1070 577 1080 539 1064 473 C1038 354 992 211 942 141 C932 127 919 119 901 113 L767 87 L737 104 H394 L359 84 C300 86 235 104 184 140 Z',
  leftGrip: 'M184 140 C231 122 296 121 359 120 H755 C822 120 884 125 940 143',
  rightGrip: 'M418 104 L414 120 M705 104 L707 120 M469 109 H491 M499 107 V113 M506 107 V113 M513 107 V113',
  leftTrigger: 'M204 104 L240 40 Q250 27 277 27 Q291 27 298 40 L314 72 C269 77 234 88 204 104 Z',
  rightTrigger: 'M813 72 L828 39 Q834 24 855 26 Q881 27 890 40 L925 104 C890 87 852 78 813 72 Z',
  leftBumper: 'M185 138 Q210 86 359 67 L393 88 H418 L414 120 H394 L359 94 Q256 94 194 146 Q179 154 185 138 Z',
  rightBumper: 'M705 88 H737 L767 67 Q890 73 935 131 Q948 149 932 147 Q873 108 767 94 L738 120 H707 Z',
  dpadUp: 'M399 432 V404 Q399 393 411 392 H437 Q449 393 449 404 V432 Z',
  dpadDown: 'M399 480 H449 V508 Q449 519 437 520 H411 Q399 519 399 508 Z',
  dpadLeft: 'M399 432 H371 Q349 432 348 444 V468 Q349 480 371 480 H399 Z',
  dpadRight: 'M449 432 H477 Q499 432 500 444 V468 Q499 480 477 480 H449 Z',
  view: 'M482 276 A24 24 0 1 1 482 324 A24 24 0 1 1 482 276 Z',
  menu: 'M642 276 A24 24 0 1 1 642 324 A24 24 0 1 1 642 276 Z',
  share: 'M545 339 H579 Q591 339 591 350 V358 Q591 369 579 369 H545 Q533 369 533 358 V350 Q533 339 545 339 Z',
  mic: 'M539 406 H585 Q597 406 597 418 V424 Q597 436 585 436 H539 Q527 436 527 424 V418 Q527 406 539 406 Z',
} as const

const join = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const hasAny = (commands: readonly string[], set?: Set<string>) => commands.some(command => set?.has(command))

const isAnySelected = (commands: readonly string[], selectedCommand?: string | null) =>
  commands.some(command => command === selectedCommand)

const pickCommand = (commands: readonly string[], boundCommands?: Set<string>, selectedCommand?: string | null) => {
  if (selectedCommand && commands.includes(selectedCommand)) return selectedCommand
  const boundCommand = commands.find(command => boundCommands?.has(command))
  return boundCommand ?? commands[0]
}

const getDefaultPaddleCommands = (mode: ReturnType<typeof controllerBackInputMode>): PaddleCommand[] => {
  switch (mode) {
    case 'fourPaddles':
      return ['LSL', 'LSR', 'RSR', 'RSL']
    case 'twoPaddles':
      return ['LSL', 'RSR']
    case 'leftJoyConRail':
      return ['LSL', 'LSR']
    case 'rightJoyConRail':
      return ['RSL', 'RSR']
    default:
      return []
  }
}

const getPaddleLabel = (mode: ReturnType<typeof controllerBackInputMode>, command: PaddleCommand) => {
  if (mode === 'leftJoyConRail' || mode === 'rightJoyConRail') {
    const joyConLabels: Record<PaddleCommand, string> = {
      LSL: 'L SL',
      LSR: 'L SR',
      RSR: 'R SR',
      RSL: 'R SL',
    }
    return joyConLabels[command]
  }

  const backPaddleLabels: Record<PaddleCommand, string> = {
    LSL: 'L B1',
    LSR: 'L B2',
    RSR: 'R B1',
    RSL: 'R B2',
  }
  return backPaddleLabels[command]
}

const uniquePaddleCommands = (commands: PaddleCommand[]) => Array.from(new Set(commands))

function ShellArtwork() {
  return (
    <g aria-hidden="true">
      <path className={styles.shell} d={GENERIC_PATHS.shell} />
      <path className={styles.shellLine} d={GENERIC_PATHS.leftGrip} />
      <path className={styles.shellLine} d={GENERIC_PATHS.rightGrip} />
      <circle className={styles.detailLine} cx={424} cy={456} r={77} />
      <rect className={styles.detailLine} x={402} y={435} width={44} height={42} rx={3} />
    </g>
  )
}

function ButtonBubble({
  cx,
  cy,
  label,
  pressed = false,
  muted = false,
  radius = 23,
  bound = false,
  selected = false,
  onSelect,
  title,
}: ButtonBubbleProps) {
  return (
    <g className={join(muted && styles.sideMuted, onSelect && styles.interactive)} onClick={onSelect}>
      {title && <title>{title}</title>}
      <circle
        className={join(
          styles.control,
          bound && styles.controlBound,
          selected && styles.controlSelected,
          pressed && styles.controlPressed
        )}
        cx={cx}
        cy={cy}
        r={radius}
      />
      <text
        className={join(
          styles.controlText,
          selected && styles.controlTextSelected,
          pressed && styles.controlTextPressed
        )}
        x={cx}
        y={cy}
      >
        {label}
      </text>
    </g>
  )
}

function PathButton({
  d,
  label,
  labelX,
  labelY,
  pressed = false,
  muted = false,
  compact = false,
  bound = false,
  selected = false,
  onSelect,
  title,
}: PathButtonProps) {
  return (
    <g className={join(muted && styles.sideMuted, onSelect && styles.interactive)} onClick={onSelect}>
      {title && <title>{title}</title>}
      <path
        className={join(
          styles.control,
          compact && styles.controlCompact,
          bound && styles.controlBound,
          selected && styles.controlSelected,
          pressed && styles.controlPressed
        )}
        d={d}
      />
      <text
        className={join(
          styles.controlText,
          compact && styles.controlTextCompact,
          selected && styles.controlTextSelected,
          pressed && styles.controlTextPressed
        )}
        x={labelX}
        y={labelY}
      >
        {label === '▱' ? '' : label}
      </text>
      {label === '▱' && (
        <g className={join(styles.buttonIcon, (selected || pressed) && styles.buttonIconActive)} aria-hidden="true">
          <rect x={labelX - 12} y={labelY - 9} width={19} height={14} rx={1} />
          <rect x={labelX - 5} y={labelY - 3} width={19} height={14} rx={1} />
        </g>
      )}
    </g>
  )
}

function PaddleButton({
  height,
  label,
  pressed = false,
  muted = false,
  width,
  x,
  y,
  bound = false,
  selected = false,
  onSelect,
  title,
}: PaddleButtonProps) {
  return (
    <g className={join(muted && styles.sideMuted, onSelect && styles.interactive)} onClick={onSelect}>
      {title && <title>{title}</title>}
      <rect
        className={join(
          styles.control,
          styles.paddleControl,
          bound && styles.controlBound,
          selected && styles.controlSelected,
          pressed && styles.controlPressed
        )}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={height / 2}
      />
      <text
        className={join(
          styles.controlText,
          styles.paddleText,
          selected && styles.controlTextSelected,
          pressed && styles.controlTextPressed
        )}
        x={x + width / 2}
        y={y + height / 2}
      >
        {label}
      </text>
    </g>
  )
}

function TriggerPath({
  d,
  fillX,
  fillY,
  fillWidth,
  label,
  labelX,
  labelY,
  value,
  pressed = false,
  muted = false,
  bound = false,
  selected = false,
  onSelect,
  title,
}: TriggerPathProps) {
  const fillValue = clamp(value, 0, 1)

  return (
    <g className={join(muted && styles.sideMuted, onSelect && styles.interactive)} onClick={onSelect}>
      {title && <title>{title}</title>}
      <path
        className={join(
          styles.triggerTrack,
          bound && styles.triggerTrackBound,
          selected && styles.triggerTrackSelected,
          pressed && styles.controlPressed
        )}
        d={d}
      />
      <rect className={styles.triggerFill} x={fillX} y={fillY} width={fillWidth * fillValue} height={12} rx={6} />
      <text className={join(styles.triggerLabel, selected && styles.triggerLabelSelected)} x={labelX} y={labelY}>
        {label}
      </text>
    </g>
  )
}

function Stick({
  cx,
  cy,
  x,
  y,
  pressed = false,
  muted = false,
  bound = false,
  selected = false,
  onSelect,
  title,
}: StickProps) {
  const knobX = cx + clamp(x, -1, 1) * 27
  const knobY = cy + 16 + clamp(-y, -1, 1) * 27

  return (
    <g className={join(muted && styles.sideMuted, onSelect && styles.interactive)} onClick={onSelect}>
      {title && <title>{title}</title>}
      <circle
        className={join(styles.stickBase, bound && styles.stickBaseBound, selected && styles.stickBaseSelected)}
        cx={cx}
        cy={cy}
        r={76}
      />
      <circle className={join(styles.stickRing, bound && styles.stickRingBound)} cx={cx} cy={cy} r={64} />
      <circle className={styles.stickRing} cx={knobX} cy={knobY - 8} r={55} />
      <circle
        className={join(
          styles.stickKnob,
          selected && styles.stickKnobSelected,
          pressed && styles.stickKnobPressed
        )}
        cx={knobX}
        cy={knobY}
        r={40}
      />
    </g>
  )
}

export function ControllerStatusSvg({
  boundCommands,
  device,
  selectedCommand,
  onSelectCommand,
}: ControllerStatusSvgProps) {
  const pressed = getPressedControllerCommandSet(device)
  const hasLeftSide = device.split !== 2
  const hasRightSide = device.split !== 1
  const leftTrigger = clamp(device.status?.triggers.left ?? 0, 0, 1)
  const rightTrigger = clamp(device.status?.triggers.right ?? 0, 0, 1)
  const leftStickX = device.status?.leftStick.x ?? 0
  const leftStickY = device.status?.leftStick.y ?? 0
  const rightStickX = device.status?.rightStick.x ?? 0
  const rightStickY = device.status?.rightStick.y ?? 0
  const leftTriggerLabel = 'LT'
  const rightTriggerLabel = 'RT'
  const leftStickBound = hasAny(LEFT_STICK_COMMANDS, boundCommands)
  const rightStickBound = hasAny(RIGHT_STICK_COMMANDS, boundCommands)
  const leftStickSelected = isAnySelected(LEFT_STICK_COMMANDS, selectedCommand)
  const rightStickSelected = isAnySelected(RIGHT_STICK_COMMANDS, selectedCommand)
  const leftTriggerBound = hasAny(LEFT_TRIGGER_COMMANDS, boundCommands)
  const rightTriggerBound = hasAny(RIGHT_TRIGGER_COMMANDS, boundCommands)
  const leftTriggerSelected = isAnySelected(LEFT_TRIGGER_COMMANDS, selectedCommand)
  const rightTriggerSelected = isAnySelected(RIGHT_TRIGGER_COMMANDS, selectedCommand)
  const hasAnySide = hasLeftSide || hasRightSide
  const backInputMode = controllerBackInputMode(device)
  const visiblePaddleCommands = uniquePaddleCommands([
    ...getDefaultPaddleCommands(backInputMode),
    ...PADDLE_COMMANDS.filter(
      command => pressed.has(command) || boundCommands?.has(command) || selectedCommand === command
    ),
  ])
  const visiblePaddleCommandSet = new Set(visiblePaddleCommands)

  return (
    <div className={styles.visualizer}>
      <svg
        className={styles.controllerSvg}
        viewBox={visiblePaddleCommands.length ? "0 0 1117 780" : "0 0 1117 700"}
        role="img"
        aria-label="Generic gamepad with Xbox-style asymmetric sticks"
      >
        <ShellArtwork />

        <TriggerPath
          d={GENERIC_PATHS.leftTrigger}
          fillX={245}
          fillY={55}
          fillWidth={42}
          label={leftTriggerLabel}
          labelX={270}
          labelY={46}
          value={leftTrigger}
          muted={!hasLeftSide}
          bound={leftTriggerBound}
          selected={leftTriggerSelected}
          onSelect={
            hasLeftSide && onSelectCommand ? () => onSelectCommand(pickCommand(LEFT_TRIGGER_COMMANDS, boundCommands, selectedCommand)) : undefined
          }
          title="Left trigger"
        />
        <PathButton
          d={GENERIC_PATHS.leftBumper}
          label="LB"
          compact
          labelX={270}
          labelY={107}
          pressed={pressed.has('L')}
          muted={!hasLeftSide}
          bound={boundCommands?.has('L')}
          selected={selectedCommand === 'L'}
          onSelect={hasLeftSide && onSelectCommand ? () => onSelectCommand('L') : undefined}
          title="Left bumper"
        />

        <TriggerPath
          d={GENERIC_PATHS.rightTrigger}
          fillX={837}
          fillY={55}
          fillWidth={42}
          label={rightTriggerLabel}
          labelX={860}
          labelY={46}
          value={rightTrigger}
          muted={!hasRightSide}
          bound={rightTriggerBound}
          selected={rightTriggerSelected}
          onSelect={
            hasRightSide && onSelectCommand ? () => onSelectCommand(pickCommand(RIGHT_TRIGGER_COMMANDS, boundCommands, selectedCommand)) : undefined
          }
          title="Right trigger"
        />
        <PathButton
          d={GENERIC_PATHS.rightBumper}
          label="RB"
          compact
          labelX={860}
          labelY={107}
          pressed={pressed.has('R')}
          muted={!hasRightSide}
          bound={boundCommands?.has('R')}
          selected={selectedCommand === 'R'}
          onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('R') : undefined}
          title="Right bumper"
        />

        <g className={join(!hasLeftSide && styles.sideMuted)}>
          <PathButton
            d={GENERIC_PATHS.dpadUp}
            label=""
            labelX={410}
            labelY={450}
            pressed={pressed.has('UP')}
            bound={boundCommands?.has('UP')}
            selected={selectedCommand === 'UP'}
            onSelect={hasLeftSide && onSelectCommand ? () => onSelectCommand('UP') : undefined}
            title="D-pad up"
          />
          <PathButton
            d={GENERIC_PATHS.dpadLeft}
            label=""
            labelX={355}
            labelY={505}
            pressed={pressed.has('LEFT')}
            bound={boundCommands?.has('LEFT')}
            selected={selectedCommand === 'LEFT'}
            onSelect={hasLeftSide && onSelectCommand ? () => onSelectCommand('LEFT') : undefined}
            title="D-pad left"
          />
          <PathButton
            d={GENERIC_PATHS.dpadRight}
            label=""
            labelX={465}
            labelY={505}
            pressed={pressed.has('RIGHT')}
            bound={boundCommands?.has('RIGHT')}
            selected={selectedCommand === 'RIGHT'}
            onSelect={hasLeftSide && onSelectCommand ? () => onSelectCommand('RIGHT') : undefined}
            title="D-pad right"
          />
          <PathButton
            d={GENERIC_PATHS.dpadDown}
            label=""
            labelX={410}
            labelY={560}
            pressed={pressed.has('DOWN')}
            bound={boundCommands?.has('DOWN')}
            selected={selectedCommand === 'DOWN'}
            onSelect={hasLeftSide && onSelectCommand ? () => onSelectCommand('DOWN') : undefined}
            title="D-pad down"
          />
          <PathButton
            d={GENERIC_PATHS.view}
            label="▱"
            labelX={482}
            labelY={300}
            pressed={pressed.has('-')}
            compact
            bound={boundCommands?.has('-')}
            selected={selectedCommand === '-'}
            onSelect={hasLeftSide && onSelectCommand ? () => onSelectCommand('-') : undefined}
            title="View / Back button"
          />
        </g>

        <PathButton
          d={GENERIC_PATHS.share}
          compact
          label="↑"
          labelX={562}
          labelY={354}
          pressed={pressed.has('CAPTURE')}
          muted={!hasAnySide}
          bound={boundCommands?.has('CAPTURE')}
          selected={selectedCommand === 'CAPTURE'}
          onSelect={hasAnySide && onSelectCommand ? () => onSelectCommand('CAPTURE') : undefined}
          title="Share / Capture button"
        />

        <g className={join(!hasRightSide && styles.sideMuted)}>
          <ButtonBubble
            cx={830}
            cy={228}
            radius={34.957}
            label="Y"
            pressed={pressed.has('N')}
            bound={boundCommands?.has('N')}
            selected={selectedCommand === 'N'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('N') : undefined}
            title="North face button"
          />
          <ButtonBubble
            cx={900}
            cy={298}
            radius={34.957}
            label="B"
            pressed={pressed.has('E')}
            bound={boundCommands?.has('E')}
            selected={selectedCommand === 'E'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('E') : undefined}
            title="East face button"
          />
          <ButtonBubble
            cx={830}
            cy={360}
            radius={34.957}
            label="A"
            pressed={pressed.has('S')}
            bound={boundCommands?.has('S')}
            selected={selectedCommand === 'S'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('S') : undefined}
            title="South face button"
          />
          <ButtonBubble
            cx={760}
            cy={298}
            radius={34.957}
            label="X"
            pressed={pressed.has('W')}
            bound={boundCommands?.has('W')}
            selected={selectedCommand === 'W'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('W') : undefined}
            title="West face button"
          />
          <PathButton
            d={GENERIC_PATHS.menu}
            label="≡"
            labelX={642}
            labelY={300}
            pressed={pressed.has('+')}
            compact
            bound={boundCommands?.has('+')}
            selected={selectedCommand === '+'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('+') : undefined}
            title="Menu / Start button"
          />
        </g>

        <Stick
          cx={292}
          cy={298}
          x={leftStickX}
          y={leftStickY}
          pressed={pressed.has('L3')}
          muted={!hasLeftSide}
          bound={leftStickBound}
          selected={leftStickSelected}
          onSelect={
            hasLeftSide && onSelectCommand
              ? () => onSelectCommand(pickCommand(LEFT_STICK_COMMANDS, boundCommands, selectedCommand))
              : undefined
          }
          title="Left stick"
        />
        <Stick
          cx={698}
          cy={450}
          x={rightStickX}
          y={rightStickY}
          pressed={pressed.has('R3')}
          muted={!hasRightSide}
          bound={rightStickBound}
          selected={rightStickSelected}
          onSelect={
            hasRightSide && onSelectCommand
              ? () => onSelectCommand(pickCommand(RIGHT_STICK_COMMANDS, boundCommands, selectedCommand))
              : undefined
          }
          title="Right stick"
        />

        {PADDLE_LAYOUT.filter(entry => visiblePaddleCommandSet.has(entry.command)).map(entry => {
          const hasSide = entry.side === 'left' ? hasLeftSide : hasRightSide
          return (
            <PaddleButton
              key={entry.command}
              x={entry.x}
              y={entry.y}
              width={entry.width}
              height={entry.height}
              label={getPaddleLabel(backInputMode, entry.command)}
              pressed={pressed.has(entry.command)}
              muted={!hasSide}
              bound={boundCommands?.has(entry.command)}
              selected={selectedCommand === entry.command}
              onSelect={hasSide && onSelectCommand ? () => onSelectCommand(entry.command) : undefined}
              title={BACK_INPUT_TITLES[entry.command]}
            />
          )
        })}

        <ButtonBubble
          cx={562}
          cy={200}
          radius={24}
          label=""
          pressed={pressed.has('HOME')}
          muted={!hasRightSide}
          bound={boundCommands?.has('HOME')}
          selected={selectedCommand === 'HOME'}
          onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('HOME') : undefined}
          title="Home / Guide button"
        />
        {(pressed.has('MIC') || boundCommands?.has('MIC') || selectedCommand === 'MIC') && (
          <PathButton
            d={GENERIC_PATHS.mic}
            label="MIC"
            labelX={562}
            labelY={421}
            pressed={pressed.has('MIC')}
            muted={!hasRightSide}
            compact
            bound={boundCommands?.has('MIC')}
            selected={selectedCommand === 'MIC'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('MIC') : undefined}
            title="Microphone button"
          />
        )}
      </svg>
    </div>
  )
}
