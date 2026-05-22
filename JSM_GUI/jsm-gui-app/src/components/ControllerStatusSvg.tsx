import type { TelemetryDevice } from '../hooks/useTelemetry'
import {
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

type PillButtonProps = SharedControlProps & {
  compact?: boolean
  height: number
  label: string
  width: number
  x: number
  y: number
}

type StickProps = SharedControlProps & {
  cx: number
  cy: number
  x: number
  y: number
}

const LEFT_STICK_COMMANDS = ['L3', 'LUP', 'LDOWN', 'LLEFT', 'LRIGHT', 'LRING', 'LTOUCH']
const RIGHT_STICK_COMMANDS = ['R3', 'RUP', 'RDOWN', 'RLEFT', 'RRIGHT', 'RRING', 'RTOUCH']
const LEFT_TRIGGER_COMMANDS = ['ZL', 'ZLF']
const RIGHT_TRIGGER_COMMANDS = ['ZR', 'ZRF']

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

function PillButton({
  x,
  y,
  width,
  height,
  label,
  pressed = false,
  muted = false,
  compact = false,
  bound = false,
  selected = false,
  onSelect,
  title,
}: PillButtonProps) {
  return (
    <g className={join(muted && styles.sideMuted, onSelect && styles.interactive)} onClick={onSelect}>
      {title && <title>{title}</title>}
      <rect
        className={join(
          styles.control,
          compact && styles.controlCompact,
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
          compact && styles.controlTextCompact,
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
  const knobX = cx + clamp(x, -1, 1) * 16
  const knobY = cy + clamp(-y, -1, 1) * 16

  return (
    <g className={join(muted && styles.sideMuted, onSelect && styles.interactive)} onClick={onSelect}>
      {title && <title>{title}</title>}
      <circle
        className={join(styles.stickBase, bound && styles.stickBaseBound, selected && styles.stickBaseSelected)}
        cx={cx}
        cy={cy}
        r={54}
      />
      <circle className={join(styles.stickRing, bound && styles.stickRingBound)} cx={cx} cy={cy} r={33} />
      <circle
        className={join(
          styles.stickKnob,
          selected && styles.stickKnobSelected,
          pressed && styles.stickKnobPressed
        )}
        cx={knobX}
        cy={knobY}
        r={24}
      />
    </g>
  )
}

function DpadButton({
  x,
  y,
  width,
  height,
  label,
  pressed = false,
  muted = false,
  bound = false,
  selected = false,
  onSelect,
  title,
}: PillButtonProps) {
  return (
    <g className={join(muted && styles.sideMuted, onSelect && styles.interactive)} onClick={onSelect}>
      {title && <title>{title}</title>}
      <rect
        className={join(
          styles.control,
          bound && styles.controlBound,
          selected && styles.controlSelected,
          pressed && styles.controlPressed
        )}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={16}
      />
      <text
        className={join(
          styles.controlText,
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

  return (
    <div className={styles.visualizer}>
      <svg
        className={styles.controllerSvg}
        viewBox="0 0 860 560"
        role="img"
        aria-label="Controller live status visualization"
      >
        <path
          className={styles.shell}
          d="M150 176 C158 126 190 98 248 96 H612 C670 98 702 126 710 176 L728 408 C734 469 709 504 672 506 C642 508 618 479 602 438 C579 378 548 342 496 332 H364 C312 342 281 378 258 438 C242 479 218 508 188 506 C151 504 126 469 132 408 Z"
        />
        <path
          className={styles.centerPanel}
          d="M300 136 C320 124 351 118 392 118 H468 C509 118 540 124 560 136 C576 145 584 164 584 192 C584 214 575 231 556 244 C539 256 516 262 486 262 H374 C344 262 321 256 304 244 C285 231 276 214 276 192 C276 164 284 145 300 136 Z"
        />

        <g
          className={join(!hasLeftSide && styles.sideMuted, hasLeftSide && onSelectCommand && styles.interactive)}
          onClick={() =>
            hasLeftSide ? onSelectCommand?.(pickCommand(LEFT_TRIGGER_COMMANDS, boundCommands, selectedCommand)) : undefined
          }
        >
          <rect
            className={join(
              styles.triggerTrack,
              leftTriggerBound && styles.triggerTrackBound,
              leftTriggerSelected && styles.triggerTrackSelected
            )}
            x="138"
            y="40"
            width="128"
            height="30"
            rx="15"
          />
          <rect className={styles.triggerFill} x="138" y="40" width={128 * leftTrigger} height="30" rx="15" />
          <text className={join(styles.triggerLabel, leftTriggerSelected && styles.triggerLabelSelected)} x="202" y="55">
            {leftTriggerLabel}
          </text>
        </g>
        <PillButton
          x={146}
          y={82}
          width={116}
          height={26}
          label={controllerButtonGlyph(device.type, 'L')}
          pressed={pressed.has('L')}
          muted={!hasLeftSide}
          bound={boundCommands?.has('L')}
          selected={selectedCommand === 'L'}
          onSelect={hasLeftSide ? () => onSelectCommand?.('L') : undefined}
          title="Left bumper"
        />

        <g
          className={join(!hasRightSide && styles.sideMuted, hasRightSide && onSelectCommand && styles.interactive)}
          onClick={() =>
            hasRightSide ? onSelectCommand?.(pickCommand(RIGHT_TRIGGER_COMMANDS, boundCommands, selectedCommand)) : undefined
          }
        >
          <rect
            className={join(
              styles.triggerTrack,
              rightTriggerBound && styles.triggerTrackBound,
              rightTriggerSelected && styles.triggerTrackSelected
            )}
            x="594"
            y="40"
            width="128"
            height="30"
            rx="15"
          />
          <rect className={styles.triggerFill} x="594" y="40" width={128 * rightTrigger} height="30" rx="15" />
          <text className={join(styles.triggerLabel, rightTriggerSelected && styles.triggerLabelSelected)} x="658" y="55">
            {rightTriggerLabel}
          </text>
        </g>
        <PillButton
          x={598}
          y={82}
          width={116}
          height={26}
          label={controllerButtonGlyph(device.type, 'R')}
          pressed={pressed.has('R')}
          muted={!hasRightSide}
          bound={boundCommands?.has('R')}
          selected={selectedCommand === 'R'}
          onSelect={hasRightSide ? () => onSelectCommand?.('R') : undefined}
          title="Right bumper"
        />

        <g className={join(!hasLeftSide && styles.sideMuted)}>
          <DpadButton
            x={176}
            y={170}
            width={48}
            height={66}
            label="U"
            pressed={pressed.has('UP')}
            bound={boundCommands?.has('UP')}
            selected={selectedCommand === 'UP'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('UP') : undefined}
            title="D-pad up"
          />
          <DpadButton
            x={130}
            y={229}
            width={66}
            height={48}
            label="L"
            pressed={pressed.has('LEFT')}
            bound={boundCommands?.has('LEFT')}
            selected={selectedCommand === 'LEFT'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('LEFT') : undefined}
            title="D-pad left"
          />
          <DpadButton
            x={204}
            y={229}
            width={66}
            height={48}
            label="R"
            pressed={pressed.has('RIGHT')}
            bound={boundCommands?.has('RIGHT')}
            selected={selectedCommand === 'RIGHT'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('RIGHT') : undefined}
            title="D-pad right"
          />
          <DpadButton
            x={176}
            y={268}
            width={48}
            height={66}
            label="D"
            pressed={pressed.has('DOWN')}
            bound={boundCommands?.has('DOWN')}
            selected={selectedCommand === 'DOWN'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('DOWN') : undefined}
            title="D-pad down"
          />
          <PillButton
            x={324}
            y={196}
            width={52}
            height={20}
            label={controllerButtonGlyph(device.type, '-')}
            pressed={pressed.has('-')}
            muted={!hasLeftSide}
            compact
            bound={boundCommands?.has('-')}
            selected={selectedCommand === '-'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('-') : undefined}
            title="Minus / View button"
          />
          <PillButton
            x={324}
            y={226}
            width={52}
            height={20}
            label={controllerButtonGlyph(device.type, 'CAPTURE')}
            pressed={pressed.has('CAPTURE')}
            muted={!hasLeftSide}
            compact
            bound={boundCommands?.has('CAPTURE')}
            selected={selectedCommand === 'CAPTURE'}
            onSelect={hasLeftSide ? () => onSelectCommand?.('CAPTURE') : undefined}
            title="Capture / touchpad click"
          />
        </g>

        <g className={join(!hasRightSide && styles.sideMuted)}>
          <ButtonBubble
            cx={640}
            cy={184}
            label={controllerButtonGlyph(device.type, 'N')}
            pressed={pressed.has('N')}
            bound={boundCommands?.has('N')}
            selected={selectedCommand === 'N'}
            onSelect={hasRightSide ? () => onSelectCommand?.('N') : undefined}
            title="North face button"
          />
          <ButtonBubble
            cx={684}
            cy={228}
            label={controllerButtonGlyph(device.type, 'E')}
            pressed={pressed.has('E')}
            bound={boundCommands?.has('E')}
            selected={selectedCommand === 'E'}
            onSelect={hasRightSide ? () => onSelectCommand?.('E') : undefined}
            title="East face button"
          />
          <ButtonBubble
            cx={640}
            cy={272}
            label={controllerButtonGlyph(device.type, 'S')}
            pressed={pressed.has('S')}
            bound={boundCommands?.has('S')}
            selected={selectedCommand === 'S'}
            onSelect={hasRightSide ? () => onSelectCommand?.('S') : undefined}
            title="South face button"
          />
          <ButtonBubble
            cx={596}
            cy={228}
            label={controllerButtonGlyph(device.type, 'W')}
            pressed={pressed.has('W')}
            bound={boundCommands?.has('W')}
            selected={selectedCommand === 'W'}
            onSelect={hasRightSide ? () => onSelectCommand?.('W') : undefined}
            title="West face button"
          />
          <PillButton
            x={484}
            y={196}
            width={52}
            height={20}
            label={controllerButtonGlyph(device.type, '+')}
            pressed={pressed.has('+')}
            muted={!hasRightSide}
            compact
            bound={boundCommands?.has('+')}
            selected={selectedCommand === '+'}
            onSelect={hasRightSide ? () => onSelectCommand?.('+') : undefined}
            title="Plus / Menu button"
          />
          <PillButton
            x={484}
            y={226}
            width={52}
            height={20}
            label={controllerButtonGlyph(device.type, 'MIC')}
            pressed={pressed.has('MIC')}
            muted={!hasRightSide}
            compact
            bound={boundCommands?.has('MIC')}
            selected={selectedCommand === 'MIC'}
            onSelect={hasRightSide ? () => onSelectCommand?.('MIC') : undefined}
            title="Microphone button"
          />
        </g>

        <Stick
          cx={294}
          cy={366}
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
          cx={566}
          cy={366}
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

        <PillButton
          x={388}
          y={286}
          width={84}
          height={26}
          label={controllerButtonGlyph(device.type, 'HOME')}
          pressed={pressed.has('HOME')}
          muted={!hasRightSide}
          compact
          bound={boundCommands?.has('HOME')}
          selected={selectedCommand === 'HOME'}
          onSelect={hasRightSide ? () => onSelectCommand?.('HOME') : undefined}
          title="Home / Guide button"
        />
      </svg>
    </div>
  )
}
