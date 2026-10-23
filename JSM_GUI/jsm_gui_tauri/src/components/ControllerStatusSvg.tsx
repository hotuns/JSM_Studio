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

// Original generic artwork with an Xbox-style asymmetric stick layout.
const GENERIC_PATHS = {
  shell: 'M235 185 C180 185 145 225 125 300 L55 605 C35 705 90 765 155 735 L345 655 C375 620 410 610 445 610 H675 C710 610 745 625 775 655 L960 735 C1025 765 1085 705 1060 605 L990 300 C970 225 935 185 880 185 Z',
  leftGrip: 'M135 370 L88 610 C73 670 95 701 124 692 L292 565',
  rightGrip: 'M980 370 L1027 610 C1042 670 1020 701 991 692 L823 565',
  leftTrigger: 'M230 30 H330 Q350 30 350 50 V105 H210 V50 Q210 30 230 30 Z',
  rightTrigger: 'M785 30 H885 Q905 30 905 50 V105 H765 V50 Q765 30 785 30 Z',
  leftBumper: 'M202 125 H358 Q378 125 378 145 V167 H182 V145 Q182 125 202 125 Z',
  rightBumper: 'M757 125 H913 Q933 125 933 145 V167 H737 V145 Q737 125 757 125 Z',
  dpadUp: 'M388 424 H432 V472 L410 493 L388 472 Z',
  dpadDown: 'M388 586 H432 V538 L410 517 L388 538 Z',
  dpadLeft: 'M329 483 V527 H377 L398 505 L377 483 Z',
  dpadRight: 'M491 483 V527 H443 L422 505 L443 483 Z',
  view: 'M463 336 H507 Q521 336 521 350 V360 Q521 374 507 374 H463 Q449 374 449 360 V350 Q449 336 463 336 Z',
  menu: 'M608 336 H652 Q666 336 666 350 V360 Q666 374 652 374 H608 Q594 374 594 360 V350 Q594 336 608 336 Z',
  share: 'M526 398 H589 Q603 398 603 412 V422 Q603 436 589 436 H526 Q512 436 512 422 V412 Q512 398 526 398 Z',
  mic: 'M535 462 H580 Q592 462 592 474 V480 Q592 492 580 492 H535 Q523 492 523 480 V474 Q523 462 535 462 Z',
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
        {label}
      </text>
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
  const knobY = cy + clamp(-y, -1, 1) * 27

  return (
    <g className={join(muted && styles.sideMuted, onSelect && styles.interactive)} onClick={onSelect}>
      {title && <title>{title}</title>}
      <circle
        className={join(styles.stickBase, bound && styles.stickBaseBound, selected && styles.stickBaseSelected)}
        cx={cx}
        cy={cy}
        r={87}
      />
      <circle className={join(styles.stickRing, bound && styles.stickRingBound)} cx={cx} cy={cy} r={57} />
      <circle
        className={join(
          styles.stickKnob,
          selected && styles.stickKnobSelected,
          pressed && styles.stickKnobPressed
        )}
        cx={knobX}
        cy={knobY}
        r={38}
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
        viewBox="0 0 1117 795"
        role="img"
        aria-label="Generic gamepad with Xbox-style asymmetric sticks"
      >
        <ShellArtwork />

        <TriggerPath
          d={GENERIC_PATHS.leftTrigger}
          fillX={225}
          fillY={85}
          fillWidth={110}
          label={leftTriggerLabel}
          labelX={280}
          labelY={58}
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
          labelX={280}
          labelY={146}
          pressed={pressed.has('L')}
          muted={!hasLeftSide}
          bound={boundCommands?.has('L')}
          selected={selectedCommand === 'L'}
          onSelect={hasLeftSide && onSelectCommand ? () => onSelectCommand('L') : undefined}
          title="Left bumper"
        />

        <TriggerPath
          d={GENERIC_PATHS.rightTrigger}
          fillX={780}
          fillY={85}
          fillWidth={110}
          label={rightTriggerLabel}
          labelX={835}
          labelY={58}
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
          labelX={835}
          labelY={146}
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
            label="U"
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
            label="L"
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
            label="R"
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
            label="D"
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
            label="View"
            labelX={485}
            labelY={355}
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
          label="Share"
          labelX={557.5}
          labelY={417}
          pressed={pressed.has('CAPTURE')}
          muted={!hasAnySide}
          bound={boundCommands?.has('CAPTURE')}
          selected={selectedCommand === 'CAPTURE'}
          onSelect={hasAnySide && onSelectCommand ? () => onSelectCommand('CAPTURE') : undefined}
          title="Share / Capture button"
        />

        <g className={join(!hasRightSide && styles.sideMuted)}>
          <ButtonBubble
            cx={875}
            cy={260}
            radius={34.957}
            label="Y"
            pressed={pressed.has('N')}
            bound={boundCommands?.has('N')}
            selected={selectedCommand === 'N'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('N') : undefined}
            title="North face button"
          />
          <ButtonBubble
            cx={945}
            cy={330}
            radius={34.957}
            label="B"
            pressed={pressed.has('E')}
            bound={boundCommands?.has('E')}
            selected={selectedCommand === 'E'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('E') : undefined}
            title="East face button"
          />
          <ButtonBubble
            cx={875}
            cy={400}
            radius={34.957}
            label="A"
            pressed={pressed.has('S')}
            bound={boundCommands?.has('S')}
            selected={selectedCommand === 'S'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('S') : undefined}
            title="South face button"
          />
          <ButtonBubble
            cx={805}
            cy={330}
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
            label="Menu"
            labelX={630}
            labelY={355}
            pressed={pressed.has('+')}
            compact
            bound={boundCommands?.has('+')}
            selected={selectedCommand === '+'}
            onSelect={hasRightSide && onSelectCommand ? () => onSelectCommand('+') : undefined}
            title="Menu / Start button"
          />
        </g>

        <Stick
          cx={280}
          cy={330}
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
          cx={720}
          cy={505}
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
          cx={557.5}
          cy={268}
          radius={32}
          label="⌂"
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
            labelX={557.5}
            labelY={477}
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
