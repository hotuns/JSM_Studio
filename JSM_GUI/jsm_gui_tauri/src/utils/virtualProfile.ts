import { toVirtualControllerToken, type VirtualControllerLogicalOutput } from './virtualController'

/** A separate starting profile. Creating it must never replace the current draft. */
export function createVirtualProfile(type: 'XBOX' | 'DS4'): string {
  if (type !== 'XBOX' && type !== 'DS4') throw new Error('Unsupported virtual controller type')
  const bindings: [string, VirtualControllerLogicalOutput][] = [
    ['S', 'faceSouth'], ['E', 'faceEast'], ['W', 'faceWest'], ['N', 'faceNorth'],
    ['L', 'leftBumper'], ['R', 'rightBumper'], ['L3', 'leftStickClick'], ['R3', 'rightStickClick'],
    ['-', 'back'], ['+', 'start'], ['HOME', 'home'],
    ['UP', 'dpadUp'], ['DOWN', 'dpadDown'], ['LEFT', 'dpadLeft'], ['RIGHT', 'dpadRight'],
  ]
  return [
    '# JSM Studio virtual controller starter', 'RESET_MAPPINGS', 'AUTOCONNECT = ON',
    'TELEMETRY_ENABLED = ON', 'TELEMETRY_PORT = 8974', `VIRTUAL_CONTROLLER = ${type}`,
    'GYRO_OUTPUT = MOUSE', 'GYRO_SENS = 0 0', 'LEFT_STICK_MODE = LEFT_STICK', 'RIGHT_STICK_MODE = RIGHT_STICK',
    `ZL_MODE = ${type === 'XBOX' ? 'X_LT' : 'PS_L2'}`, `ZR_MODE = ${type === 'XBOX' ? 'X_RT' : 'PS_R2'}`,
    ...bindings.map(([input, output]) => `${input} = ${toVirtualControllerToken(output, type)}`), '',
  ].join('\n')
}
