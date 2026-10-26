import { CURSOR_PROFILE_TEXT } from './cursorProfile'
import { createVirtualProfile } from './virtualProfile'

export type ProfileTemplate = 'cursor' | 'native' | 'empty'
export function createProfileTemplate(template: ProfileTemplate, scheme: 'XBOX' | 'DS4' = 'XBOX'): string {
  if (template === 'cursor') return CURSOR_PROFILE_TEXT
  if (template === 'native') return createVirtualProfile(scheme)
  if (template !== 'empty') throw new Error('Unsupported profile template')
  return 'RESET_MAPPINGS\nAUTOCONNECT = ON\nTELEMETRY_ENABLED = ON\nTELEMETRY_PORT = 8974\nVIRTUAL_CONTROLLER = NONE\nGYRO_SENS = 0 0\nLEFT_STICK_MODE = NO_MOUSE\nRIGHT_STICK_MODE = NO_MOUSE\n'
}
