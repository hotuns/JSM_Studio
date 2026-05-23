import type { TelemetryDevice } from '../hooks/useTelemetry'
import {
  controllerBackInputMode,
  controllerButtonGlyph,
  controllerVisualFamily,
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

const DUALSENSE_PATHS = {
  borderLower:
    'M100.97,881.749c8.551,1.607 62.356,4.094 68.38,-3.153c33.93,-40.827 69.521,-154.237 85.416,-196.14c9.791,-25.813 35.4,-37.881 67.491,-40.687c30.597,13.569 45.149,13.982 96.708,3.594l280.228,-0c51.559,10.388 66.111,9.975 96.708,-3.594c32.091,2.806 57.701,14.874 67.492,40.687c15.894,41.903 51.486,155.313 85.416,196.14c6.023,7.247 59.828,4.76 68.38,3.153',
  borderLeftUpper: 'M282.527,168.559c13.841,1.794 27.682,-1.16 41.522,-6.511',
  borderRightUpper: 'M835.33,168.559c-13.84,1.794 -27.681,-1.16 -41.522,-6.511',
  leftHandle:
    'M296.668,193.129c-5.479,-25.983 -25.743,-37.755 -62.282,-33.901c-40.742,4.297 -79.814,11.918 -115.424,22.309c-11.905,3.474 -23.487,8.273 -28.39,18.67c-91.01,192.963 -106.846,408.796 -55.913,643.084c2.947,13.555 9.046,24.221 21.05,32.104c5.843,3.836 12.587,7.06 21.886,9.445c21.562,5.529 31.041,-9.866 33.636,-23.758c33.416,-178.821 88.679,-342.348 191.663,-450.233c9.318,-9.761 18.181,-31.681 20.635,-51.733c0.969,-7.926 0.451,-15.333 -0.463,-22.036c-6.051,-44.414 -16.477,-96.901 -26.398,-143.951Z',
  rightHandle:
    'M820.718,193.129c5.479,-25.983 25.744,-37.755 62.283,-33.901c40.742,4.297 79.814,11.918 115.424,22.309c11.905,3.474 23.486,8.273 28.39,18.67c91.01,192.963 106.846,408.796 55.912,643.084c-2.947,13.555 -9.046,24.221 -21.05,32.104c-5.842,3.836 -12.586,7.06 -21.885,9.445c-21.563,5.529 -31.041,-9.866 -33.637,-23.758c-33.415,-178.821 -88.678,-342.348 -191.662,-450.233c-9.318,-9.761 -18.181,-31.681 -20.635,-51.733c-0.97,-7.926 -0.451,-15.333 0.462,-22.036c6.052,-44.414 16.477,-96.901 26.398,-143.951Z',
  touchpad:
    'M559.079,143.015c0,0 158.534,-0.805 226.555,15.497c12.437,2.981 21.237,14.507 19.467,24.644c-8.942,51.221 -20.354,109.033 -30.53,160.023c-8.029,40.224 -40.893,53.816 -68.431,53.692c-27.538,-0.124 -147.061,-0.559 -147.061,-0.559c0,0 -119.522,0.435 -147.06,0.559c-27.538,0.124 -60.403,-13.468 -68.431,-53.692c-10.177,-50.99 -21.589,-108.802 -30.531,-160.023c-1.77,-10.137 7.031,-21.663 19.467,-24.644c68.021,-16.302 226.555,-15.497 226.555,-15.497Z',
  l2:
    'M252.212,116.785l-114.214,0c-12.312,0 1.248,-110.916 78.919,-110.916c37.32,-0 51.81,110.916 35.295,110.916Z',
  r2:
    'M866.471,116.785l114.214,0c12.312,0 -1.248,-110.916 -78.919,-110.916c-37.32,-0 -51.81,110.916 -35.295,110.916Z',
  l1:
    'M122.514,180.513c0.736,-29.244 151.654,-71.59 148.099,-18.465c-9.518,-3.397 -21.562,-4.367 -36.227,-2.82c-39.392,4.154 -77.223,11.417 -111.872,21.285Z',
  r1:
    'M995.675,180.421c-0.736,-29.244 -151.654,-71.59 -148.099,-18.465c9.518,-3.397 21.562,-4.367 36.227,-2.82c39.392,4.154 77.223,11.417 111.872,21.285Z',
  dpadUp:
    'M213.487,271.996c0,-11.214 -9.091,-20.305 -20.305,-20.305l-28.888,-0c-11.215,-0 -20.306,9.091 -20.306,20.305l0,24.336c0,6.286 2.397,12.335 6.703,16.915c6.856,7.293 17.331,18.436 23.351,24.838c1.218,1.296 2.917,2.031 4.696,2.031c1.778,-0 3.478,-0.735 4.696,-2.031c6.019,-6.402 16.494,-17.545 23.35,-24.838c4.306,-4.58 6.703,-10.629 6.703,-16.915c0,-6.766 0,-16.013 0,-24.336Z',
  dpadDown:
    'M213.487,443.093c0,11.215 -9.091,20.306 -20.305,20.306l-28.888,-0c-11.215,-0 -20.306,-9.091 -20.306,-20.306l0,-24.125c0,-6.412 2.494,-12.572 6.953,-17.178c6.884,-7.11 17.23,-17.796 23.166,-23.927c1.214,-1.254 2.885,-1.962 4.631,-1.962c1.745,0 3.416,0.708 4.63,1.962c5.936,6.131 16.282,16.817 23.166,23.927c4.46,4.606 6.953,10.766 6.953,17.178c0,6.746 0,15.888 0,24.125Z',
  dpadLeft:
    'M93.725,322.259c-11.214,0 -20.306,9.091 -20.306,20.306l0,28.888c0,11.214 9.092,20.305 20.306,20.305l24.349,0c6.278,0 12.321,-2.391 16.899,-6.687c7.081,-6.644 17.749,-16.654 23.908,-22.433c1.273,-1.195 2.007,-2.855 2.034,-4.601c0.027,-1.746 -0.656,-3.428 -1.891,-4.661c-6.106,-6.094 -16.81,-16.778 -23.947,-23.901c-4.63,-4.621 -10.904,-7.216 -17.446,-7.216c-6.724,0 -15.757,0 -23.906,0Z',
  dpadRight:
    'M263.75,322.259c11.215,0 20.306,9.091 20.306,20.306l-0,28.888c-0,11.214 -9.091,20.305 -20.306,20.305l-24.349,0c-6.278,0 -12.32,-2.391 -16.899,-6.687c-7.081,-6.644 -17.749,-16.654 -23.907,-22.433c-1.274,-1.195 -2.008,-2.855 -2.035,-4.601c-0.027,-1.746 0.656,-3.428 1.892,-4.661c6.106,-6.094 16.81,-16.778 23.946,-23.901c4.63,-4.621 10.905,-7.216 17.446,-7.216c6.724,0 15.758,0 23.906,0Z',
  create:
    'M281.064,206.321l6.369,31.916c-0,-0 2.557,11.875 -11.724,14.725c-14.281,2.849 -16.478,-9.098 -16.478,-9.098l-6.4,-32.075c-0,-0 -2.559,-11.876 11.739,-14.645c14.299,-2.77 16.494,9.177 16.494,9.177Z',
  options:
    'M839.082,206.321l-6.369,31.916c-0,-0 -2.557,11.875 11.724,14.725c14.281,2.849 16.478,-9.098 16.478,-9.098l6.4,-32.075c0,-0 2.559,-11.876 -11.74,-14.645c-14.298,-2.77 -16.493,9.177 -16.493,9.177Z',
  mute:
    'M590.061,591.266c-0,-3.699 -2.999,-6.698 -6.698,-6.698c-11.914,0 -36.653,0 -48.567,0c-3.7,0 -6.698,2.999 -6.698,6.698c-0,0.001 -0,0.001 -0,0.002c-0,3.699 2.998,6.698 6.698,6.698c11.914,-0 36.653,-0 48.567,-0c3.699,-0 6.698,-2.999 6.698,-6.698c-0,-0.001 -0,-0.001 -0,-0.002Z',
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
      <path className={styles.shell} d={DUALSENSE_PATHS.leftHandle} />
      <path className={styles.shell} d={DUALSENSE_PATHS.rightHandle} />
      <path className={styles.shellLine} d={DUALSENSE_PATHS.borderLower} />
      <path className={styles.shellLine} d={DUALSENSE_PATHS.borderLeftUpper} />
      <path className={styles.shellLine} d={DUALSENSE_PATHS.borderRightUpper} />
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
  const family = controllerVisualFamily(device.type)
  const pressed = getPressedControllerCommandSet(device)
  const hasLeftSide = device.split !== 2
  const hasRightSide = device.split !== 1
  const leftTrigger = clamp(device.status?.triggers.left ?? 0, 0, 1)
  const rightTrigger = clamp(device.status?.triggers.right ?? 0, 0, 1)
  const leftStickX = device.status?.leftStick.x ?? 0
  const leftStickY = device.status?.leftStick.y ?? 0
  const rightStickX = device.status?.rightStick.x ?? 0
  const rightStickY = device.status?.rightStick.y ?? 0
  const leftTriggerLabel = family === 'playstation' ? 'L2' : family === 'xbox' ? 'LT' : 'ZL'
  const rightTriggerLabel = family === 'playstation' ? 'R2' : family === 'xbox' ? 'RT' : 'ZR'
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
        viewBox="0 0 1117 892"
        role="img"
        aria-label="Controller live status visualization"
      >
        <ShellArtwork />

        <TriggerPath
          d={DUALSENSE_PATHS.l2}
          fillX={142}
          fillY={96}
          fillWidth={106}
          label={leftTriggerLabel}
          labelX={196}
          labelY={62}
          value={leftTrigger}
          muted={!hasLeftSide}
          bound={leftTriggerBound}
          selected={leftTriggerSelected}
          onSelect={
            hasLeftSide ? () => onSelectCommand?.(pickCommand(LEFT_TRIGGER_COMMANDS, boundCommands, selectedCommand)) : undefined
          }
          title="Left trigger"
        />
        <PathButton
          d={DUALSENSE_PATHS.l1}
          label={controllerButtonGlyph(device.type, 'L')}
          labelX={196}
          labelY={166}
          pressed={pressed.has('L')}
          muted={!hasLeftSide}
          bound={boundCommands?.has('L')}
          selected={selectedCommand === 'L'}
          onSelect={hasLeftSide ? () => onSelectCommand?.('L') : undefined}
          title="Left bumper"
        />

        <TriggerPath
          d={DUALSENSE_PATHS.r2}
          fillX={870}
          fillY={96}
          fillWidth={106}
          label={rightTriggerLabel}
          labelX={923}
          labelY={62}
          value={rightTrigger}
          muted={!hasRightSide}
          bound={rightTriggerBound}
          selected={rightTriggerSelected}
          onSelect={
            hasRightSide ? () => onSelectCommand?.(pickCommand(RIGHT_TRIGGER_COMMANDS, boundCommands, selectedCommand)) : undefined
          }
          title="Right trigger"
        />
        <PathButton
          d={DUALSENSE_PATHS.r1}
          label={controllerButtonGlyph(device.type, 'R')}
          labelX={922}
          labelY={166}
          pressed={pressed.has('R')}
          muted={!hasRightSide}
          bound={boundCommands?.has('R')}
          selected={selectedCommand === 'R'}
          onSelect={hasRightSide ? () => onSelectCommand?.('R') : undefined}
          title="Right bumper"
        />

        <g className={join(!hasLeftSide && styles.sideMuted)}>
          <PathButton
            d={DUALSENSE_PATHS.dpadUp}
            label="U"
            labelX={179}
            labelY={296}
            pressed={pressed.has('UP')}
            bound={boundCommands?.has('UP')}
            selected={selectedCommand === 'UP'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('UP') : undefined}
            title="D-pad up"
          />
          <PathButton
            d={DUALSENSE_PATHS.dpadLeft}
            label="L"
            labelX={118}
            labelY={357}
            pressed={pressed.has('LEFT')}
            bound={boundCommands?.has('LEFT')}
            selected={selectedCommand === 'LEFT'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('LEFT') : undefined}
            title="D-pad left"
          />
          <PathButton
            d={DUALSENSE_PATHS.dpadRight}
            label="R"
            labelX={240}
            labelY={357}
            pressed={pressed.has('RIGHT')}
            bound={boundCommands?.has('RIGHT')}
            selected={selectedCommand === 'RIGHT'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('RIGHT') : undefined}
            title="D-pad right"
          />
          <PathButton
            d={DUALSENSE_PATHS.dpadDown}
            label="D"
            labelX={179}
            labelY={420}
            pressed={pressed.has('DOWN')}
            bound={boundCommands?.has('DOWN')}
            selected={selectedCommand === 'DOWN'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('DOWN') : undefined}
            title="D-pad down"
          />
          <PathButton
            d={DUALSENSE_PATHS.create}
            label={controllerButtonGlyph(device.type, '-')}
            labelX={270}
            labelY={226}
            pressed={pressed.has('-')}
            compact
            bound={boundCommands?.has('-')}
            selected={selectedCommand === '-'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('-') : undefined}
            title="Create / View button"
          />
        </g>

        <PathButton
          d={DUALSENSE_PATHS.touchpad}
          label={controllerButtonGlyph(device.type, 'CAPTURE')}
          labelX={559}
          labelY={270}
          pressed={pressed.has('CAPTURE')}
          muted={!hasAnySide}
          bound={boundCommands?.has('CAPTURE')}
          selected={selectedCommand === 'CAPTURE'}
          onSelect={hasAnySide ? () => onSelectCommand?.('CAPTURE') : undefined}
          title="Touchpad / capture button"
        />

        <g className={join(!hasRightSide && styles.sideMuted)}>
          <ButtonBubble
            cx={934.079}
            cy={288.08}
            radius={34.957}
            label={controllerButtonGlyph(device.type, 'N')}
            pressed={pressed.has('N')}
            bound={boundCommands?.has('N')}
            selected={selectedCommand === 'N'}
            onSelect={hasRightSide ? () => onSelectCommand?.('N') : undefined}
            title="North face button"
          />
          <ButtonBubble
            cx={1004.08}
            cy={358.08}
            radius={34.957}
            label={controllerButtonGlyph(device.type, 'E')}
            pressed={pressed.has('E')}
            bound={boundCommands?.has('E')}
            selected={selectedCommand === 'E'}
            onSelect={hasRightSide ? () => onSelectCommand?.('E') : undefined}
            title="East face button"
          />
          <ButtonBubble
            cx={934.079}
            cy={428.08}
            radius={34.957}
            label={controllerButtonGlyph(device.type, 'S')}
            pressed={pressed.has('S')}
            bound={boundCommands?.has('S')}
            selected={selectedCommand === 'S'}
            onSelect={hasRightSide ? () => onSelectCommand?.('S') : undefined}
            title="South face button"
          />
          <ButtonBubble
            cx={864.079}
            cy={358.08}
            radius={34.957}
            label={controllerButtonGlyph(device.type, 'W')}
            pressed={pressed.has('W')}
            bound={boundCommands?.has('W')}
            selected={selectedCommand === 'W'}
            onSelect={hasRightSide ? () => onSelectCommand?.('W') : undefined}
            title="West face button"
          />
          <PathButton
            d={DUALSENSE_PATHS.options}
            label={controllerButtonGlyph(device.type, '+')}
            labelX={850}
            labelY={226}
            pressed={pressed.has('+')}
            compact
            bound={boundCommands?.has('+')}
            selected={selectedCommand === '+'}
            onSelect={hasRightSide ? () => onSelectCommand?.('+') : undefined}
            title="Options / Menu button"
          />
        </g>

        <Stick
          cx={351.764}
          cy={528.548}
          x={leftStickX}
          y={leftStickY}
          pressed={pressed.has('L3')}
          muted={!hasLeftSide}
          bound={leftStickBound}
          selected={leftStickSelected}
          onSelect={
            hasLeftSide
              ? () => onSelectCommand?.(pickCommand(LEFT_STICK_COMMANDS, boundCommands, selectedCommand))
              : undefined
          }
          title="Left stick"
        />
        <Stick
          cx={763.456}
          cy={528.548}
          x={rightStickX}
          y={rightStickY}
          pressed={pressed.has('R3')}
          muted={!hasRightSide}
          bound={rightStickBound}
          selected={rightStickSelected}
          onSelect={
            hasRightSide
              ? () => onSelectCommand?.(pickCommand(RIGHT_STICK_COMMANDS, boundCommands, selectedCommand))
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
              onSelect={hasSide ? () => onSelectCommand?.(entry.command) : undefined}
              title={BACK_INPUT_TITLES[entry.command]}
            />
          )
        })}

        <ButtonBubble
          cx={559}
          cy={532}
          radius={27}
          label={controllerButtonGlyph(device.type, 'HOME')}
          pressed={pressed.has('HOME')}
          muted={!hasRightSide}
          bound={boundCommands?.has('HOME')}
          selected={selectedCommand === 'HOME'}
          onSelect={hasRightSide ? () => onSelectCommand?.('HOME') : undefined}
          title="Home / Guide button"
        />
        <PathButton
          d={DUALSENSE_PATHS.mute}
          label={controllerButtonGlyph(device.type, 'MIC')}
          labelX={559}
          labelY={592}
          pressed={pressed.has('MIC')}
          muted={!hasRightSide}
          compact
          bound={boundCommands?.has('MIC')}
          selected={selectedCommand === 'MIC'}
          onSelect={hasRightSide ? () => onSelectCommand?.('MIC') : undefined}
          title="Microphone button"
        />
      </svg>
    </div>
  )
}
