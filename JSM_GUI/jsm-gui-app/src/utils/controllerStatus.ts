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
  type ButtonDefinition,
} from '../keymap/schema'
import type { TelemetryDevice } from '../hooks/useTelemetry'

export type ControllerVisualFamily = 'playstation' | 'xbox' | 'nintendo' | 'generic'

const CONTROLLER_TYPES = {
  XBOXONE: 6,
  JOYCON_LEFT: 1,
  JOYCON_RIGHT: 2,
  PRO_CONTROLLER: 3,
  DS4: 4,
  DS: 5,
  XBOXONE_ELITE: 7,
  XBOX_SERIES: 8,
  HORI_STEAM: 9,
  G7_PRO_8K: 10,
  EIGHTBITDO_PRO_2: 15,
  EIGHTBITDO_PRO_2_BT: 16,
  EIGHTBITDO_PRO_3: 17,
  EIGHTBITDO_ULTIMATE2_WIRELESS: 18,
  FLYDIGI_APEX5: 19,
  FLYDIGI_VADER3_PRO: 20,
  FLYDIGI_VADER4_PRO: 21,
  FLYDIGI_VADER5_PRO: 22,
  SWITCH2_PRO_CONTROLLER: 23,
} as const

const SPLIT_TYPES = {
  LEFT: 1,
  RIGHT: 2,
} as const

const RAW_BUTTONS = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
  PLUS: 4,
  MINUS: 5,
  LCLICK: 6,
  RCLICK: 7,
  L: 8,
  R: 9,
  E: 13,
  S: 12,
  W: 14,
  N: 15,
  HOME: 16,
  CAPTURE: 17,
  MIC: 18,
  SL: 19,
  SR: 20,
  FNL: 21,
  FNR: 22,
  LTOUCH: 23,
  RTOUCH: 24,
  LMINI: 25,
  RMINI: 26,
  MISC1: 27,
  MISC2: 28,
  MISC3: 29,
  MISC4: 30,
  MISC5: 31,
  MISC6: 32,
} as const

const findButton = (collection: ButtonDefinition[], command: string) => {
  const button = collection.find(entry => entry.command === command)
  if (!button) {
    throw new Error(`Missing button definition for ${command}`)
  }
  return button
}

const BUTTON_ORDER: ButtonDefinition[] = [
  ...FACE_BUTTONS,
  ...DPAD_BUTTONS,
  ...BUMPER_BUTTONS,
  ...CENTER_BUTTONS,
  findButton(LEFT_STICK_BUTTONS, 'L3'),
  findButton(RIGHT_STICK_BUTTONS, 'R3'),
  findButton(TOUCH_BUTTONS, 'CAPTURE'),
  ...PADDLE_BUTTONS,
  ...MINI_BUTTONS,
  findButton(LEFT_STICK_BUTTONS, 'LTOUCH'),
  findButton(RIGHT_STICK_BUTTONS, 'RTOUCH'),
  ...MISC_BUTTONS,
]

const hasRawButton = (buttons: number, bit: number) => {
  const normalized = BigInt(Math.trunc(buttons))
  return (normalized & (1n << BigInt(bit))) !== 0n
}

const addIfPressed = (commands: Set<string>, buttons: number, command: string, bit: number) => {
  if (hasRawButton(buttons, bit)) {
    commands.add(command)
  }
}

export const controllerButtonLabel = (button: ButtonDefinition) =>
  button.playstation === button.xbox ? button.playstation : `${button.playstation} / ${button.xbox}`

export const controllerVisualFamily = (type?: number): ControllerVisualFamily => {
  switch (type) {
    case CONTROLLER_TYPES.DS4:
    case CONTROLLER_TYPES.DS:
      return 'playstation'
    case CONTROLLER_TYPES.JOYCON_LEFT:
    case CONTROLLER_TYPES.JOYCON_RIGHT:
    case CONTROLLER_TYPES.PRO_CONTROLLER:
    case CONTROLLER_TYPES.EIGHTBITDO_PRO_2:
    case CONTROLLER_TYPES.EIGHTBITDO_PRO_2_BT:
    case CONTROLLER_TYPES.EIGHTBITDO_PRO_3:
    case CONTROLLER_TYPES.EIGHTBITDO_ULTIMATE2_WIRELESS:
    case CONTROLLER_TYPES.SWITCH2_PRO_CONTROLLER:
      return 'nintendo'
    case CONTROLLER_TYPES.XBOXONE:
    case CONTROLLER_TYPES.XBOXONE_ELITE:
    case CONTROLLER_TYPES.XBOX_SERIES:
    case CONTROLLER_TYPES.G7_PRO_8K:
    case CONTROLLER_TYPES.HORI_STEAM:
    case CONTROLLER_TYPES.FLYDIGI_APEX5:
    case CONTROLLER_TYPES.FLYDIGI_VADER3_PRO:
    case CONTROLLER_TYPES.FLYDIGI_VADER4_PRO:
    case CONTROLLER_TYPES.FLYDIGI_VADER5_PRO:
      return 'xbox'
    default:
      return 'generic'
  }
}

const BUTTON_GLYPHS: Record<ControllerVisualFamily, Partial<Record<string, string>>> = {
  playstation: {
    N: '△',
    E: '○',
    S: '×',
    W: '□',
    HOME: 'PS',
    '+': '+',
    '-': '-',
    CAPTURE: 'TP',
    MIC: 'MIC',
    L: 'L1',
    R: 'R1',
  },
  xbox: {
    N: 'Y',
    E: 'B',
    S: 'A',
    W: 'X',
    HOME: 'G',
    '+': 'M',
    '-': 'V',
    CAPTURE: 'SH',
    MIC: 'MIC',
    L: 'LB',
    R: 'RB',
  },
  nintendo: {
    N: 'X',
    E: 'A',
    S: 'B',
    W: 'Y',
    HOME: '⌂',
    '+': '+',
    '-': '-',
    CAPTURE: 'CAP',
    MIC: 'MIC',
    L: 'L',
    R: 'R',
  },
  generic: {
    N: 'N',
    E: 'E',
    S: 'S',
    W: 'W',
    HOME: 'H',
    '+': '+',
    '-': '-',
    CAPTURE: 'CAP',
    MIC: 'MIC',
    L: 'L',
    R: 'R',
  },
}

export const controllerButtonGlyph = (type: number | undefined, command: string) => {
  const family = controllerVisualFamily(type)
  return BUTTON_GLYPHS[family][command] ?? command
}

export const getPressedControllerCommandSet = (device?: TelemetryDevice) => {
  const buttons = device?.status?.buttons
  if (typeof buttons !== 'number' || !Number.isFinite(buttons) || buttons <= 0) {
    return new Set<string>()
  }

  const commands = new Set<string>()
  const controllerType = device?.type ?? 0
  const splitType = device?.split ?? 0

  if (splitType !== SPLIT_TYPES.RIGHT) {
    addIfPressed(commands, buttons, 'UP', RAW_BUTTONS.UP)
    addIfPressed(commands, buttons, 'DOWN', RAW_BUTTONS.DOWN)
    addIfPressed(commands, buttons, 'LEFT', RAW_BUTTONS.LEFT)
    addIfPressed(commands, buttons, 'RIGHT', RAW_BUTTONS.RIGHT)
    addIfPressed(commands, buttons, 'L', RAW_BUTTONS.L)
    addIfPressed(commands, buttons, '-', RAW_BUTTONS.MINUS)
    addIfPressed(commands, buttons, 'L3', RAW_BUTTONS.LCLICK)

    switch (controllerType) {
      case CONTROLLER_TYPES.DS:
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        addIfPressed(commands, buttons, 'LSR', RAW_BUTTONS.FNL)
        addIfPressed(commands, buttons, 'RSL', RAW_BUTTONS.FNR)
        addIfPressed(commands, buttons, 'MIC', RAW_BUTTONS.MIC)
        addIfPressed(commands, buttons, 'CAPTURE', RAW_BUTTONS.CAPTURE)
        break
      case CONTROLLER_TYPES.DS4:
        addIfPressed(commands, buttons, 'CAPTURE', RAW_BUTTONS.CAPTURE)
        break
      case CONTROLLER_TYPES.XBOXONE_ELITE:
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        addIfPressed(commands, buttons, 'LSR', RAW_BUTTONS.FNL)
        addIfPressed(commands, buttons, 'RSL', RAW_BUTTONS.FNR)
        break
      case CONTROLLER_TYPES.XBOX_SERIES:
        addIfPressed(commands, buttons, 'CAPTURE', RAW_BUTTONS.CAPTURE)
        break
      case CONTROLLER_TYPES.JOYCON_LEFT:
        addIfPressed(commands, buttons, 'CAPTURE', RAW_BUTTONS.CAPTURE)
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'LSR', RAW_BUTTONS.SR)
        break
      case CONTROLLER_TYPES.PRO_CONTROLLER:
        addIfPressed(commands, buttons, 'CAPTURE', RAW_BUTTONS.CAPTURE)
        break
      case CONTROLLER_TYPES.SWITCH2_PRO_CONTROLLER:
        addIfPressed(commands, buttons, 'CAPTURE', RAW_BUTTONS.CAPTURE)
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        addIfPressed(commands, buttons, 'MISC1', RAW_BUTTONS.MISC1)
        break
      case CONTROLLER_TYPES.HORI_STEAM:
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        addIfPressed(commands, buttons, 'LSR', RAW_BUTTONS.FNL)
        addIfPressed(commands, buttons, 'RSL', RAW_BUTTONS.FNR)
        addIfPressed(commands, buttons, 'LTOUCH', RAW_BUTTONS.LTOUCH)
        addIfPressed(commands, buttons, 'RTOUCH', RAW_BUTTONS.RTOUCH)
        addIfPressed(commands, buttons, 'MISC1', RAW_BUTTONS.MISC1)
        break
      case CONTROLLER_TYPES.G7_PRO_8K:
        addIfPressed(commands, buttons, 'LMINI', RAW_BUTTONS.LMINI)
        addIfPressed(commands, buttons, 'RMINI', RAW_BUTTONS.RMINI)
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        addIfPressed(commands, buttons, 'CAPTURE', RAW_BUTTONS.CAPTURE)
        break
      case CONTROLLER_TYPES.EIGHTBITDO_PRO_2:
      case CONTROLLER_TYPES.EIGHTBITDO_PRO_2_BT:
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        break
      case CONTROLLER_TYPES.EIGHTBITDO_PRO_3:
      case CONTROLLER_TYPES.EIGHTBITDO_ULTIMATE2_WIRELESS:
        addIfPressed(commands, buttons, 'LMINI', RAW_BUTTONS.LMINI)
        addIfPressed(commands, buttons, 'RMINI', RAW_BUTTONS.RMINI)
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        break
      case CONTROLLER_TYPES.FLYDIGI_APEX5:
        addIfPressed(commands, buttons, 'LMINI', RAW_BUTTONS.LMINI)
        addIfPressed(commands, buttons, 'RMINI', RAW_BUTTONS.RMINI)
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        addIfPressed(commands, buttons, 'LSR', RAW_BUTTONS.FNL)
        addIfPressed(commands, buttons, 'RSL', RAW_BUTTONS.FNR)
        break
      case CONTROLLER_TYPES.FLYDIGI_VADER5_PRO:
        addIfPressed(commands, buttons, 'LMINI', RAW_BUTTONS.LMINI)
        addIfPressed(commands, buttons, 'RMINI', RAW_BUTTONS.RMINI)
        addIfPressed(commands, buttons, 'MISC3', RAW_BUTTONS.MISC3)
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        addIfPressed(commands, buttons, 'LSR', RAW_BUTTONS.FNL)
        addIfPressed(commands, buttons, 'RSL', RAW_BUTTONS.FNR)
        addIfPressed(commands, buttons, 'MISC1', RAW_BUTTONS.MISC1)
        addIfPressed(commands, buttons, 'MISC2', RAW_BUTTONS.MISC2)
        break
      case CONTROLLER_TYPES.FLYDIGI_VADER4_PRO:
      case CONTROLLER_TYPES.FLYDIGI_VADER3_PRO:
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        addIfPressed(commands, buttons, 'LSR', RAW_BUTTONS.FNL)
        addIfPressed(commands, buttons, 'RSL', RAW_BUTTONS.FNR)
        addIfPressed(commands, buttons, 'MISC1', RAW_BUTTONS.MISC1)
        addIfPressed(commands, buttons, 'MISC2', RAW_BUTTONS.MISC2)
        break
      default:
        addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
        addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
        addIfPressed(commands, buttons, 'LSR', RAW_BUTTONS.FNL)
        addIfPressed(commands, buttons, 'RSL', RAW_BUTTONS.FNR)
        addIfPressed(commands, buttons, 'MISC1', RAW_BUTTONS.MISC1)
        addIfPressed(commands, buttons, 'MISC2', RAW_BUTTONS.MISC2)
        addIfPressed(commands, buttons, 'MISC3', RAW_BUTTONS.MISC3)
        addIfPressed(commands, buttons, 'MISC4', RAW_BUTTONS.MISC4)
        addIfPressed(commands, buttons, 'MISC5', RAW_BUTTONS.MISC5)
        addIfPressed(commands, buttons, 'MISC6', RAW_BUTTONS.MISC6)
        break
    }
  } else {
    addIfPressed(commands, buttons, 'RSL', RAW_BUTTONS.SL)
    addIfPressed(commands, buttons, 'RSR', RAW_BUTTONS.SR)
  }

  if (splitType !== SPLIT_TYPES.LEFT) {
    addIfPressed(commands, buttons, 'E', RAW_BUTTONS.E)
    addIfPressed(commands, buttons, 'S', RAW_BUTTONS.S)
    addIfPressed(commands, buttons, 'N', RAW_BUTTONS.N)
    addIfPressed(commands, buttons, 'W', RAW_BUTTONS.W)
    addIfPressed(commands, buttons, 'R', RAW_BUTTONS.R)
    addIfPressed(commands, buttons, '+', RAW_BUTTONS.PLUS)
    addIfPressed(commands, buttons, 'HOME', RAW_BUTTONS.HOME)
    addIfPressed(commands, buttons, 'R3', RAW_BUTTONS.RCLICK)
  } else {
    addIfPressed(commands, buttons, 'LSL', RAW_BUTTONS.SL)
    addIfPressed(commands, buttons, 'LSR', RAW_BUTTONS.SR)
  }

  return commands
}

export const getPressedControllerButtons = (device?: TelemetryDevice) => {
  const commands = getPressedControllerCommandSet(device)
  return BUTTON_ORDER.filter(button => commands.has(button.command))
}
