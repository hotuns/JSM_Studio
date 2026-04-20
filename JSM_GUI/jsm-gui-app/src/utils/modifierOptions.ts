export type ModifierSelectOption = { value: string; label: string; disabled?: boolean }

const BASE_MODIFIER_OPTIONS: ModifierSelectOption[] = [
  { value: 'UP', label: 'UP – D-pad up' },
  { value: 'DOWN', label: 'DOWN – D-pad down' },
  { value: 'LEFT', label: 'LEFT – D-pad left' },
  { value: 'RIGHT', label: 'RIGHT – D-pad right' },
  { value: 'L', label: 'L – top-left bumper (L1 / LB)' },
  { value: 'ZL', label: 'ZL – left trigger soft pull (L2 / LT)' },
  { value: 'ZLF', label: 'ZLF – left trigger full pull' },
  { value: 'R', label: 'R – top-right bumper (R1 / RB)' },
  { value: 'ZR', label: 'ZR – right trigger soft pull (R2 / RT)' },
  { value: 'ZRF', label: 'ZRF – right trigger full pull' },
  { value: '-', label: '- – Minus / Share button' },
  { value: '+', label: '+ – Options / Menu button' },
  { value: 'HOME', label: 'HOME – PS / Guide button' },
  { value: 'CAPTURE', label: 'CAPTURE – Touchpad click / Capture' },
  { value: 'LSL', label: 'LSL – primary left back paddle' },
  { value: 'RSR', label: 'RSR – primary right back paddle' },
  { value: 'LSR', label: 'LSR – secondary left back paddle' },
  { value: 'RSL', label: 'RSL – secondary right back paddle' },
  { value: 'L3', label: 'L3 – left stick click' },
  { value: 'R3', label: 'R3 – right stick click' },
  { value: 'N', label: 'N – North face button (Triangle / Y)' },
  { value: 'E', label: 'E – East face button (Circle / B)' },
  { value: 'S', label: 'S – South face button (Cross / A)' },
  { value: 'W', label: 'W – West face button (Square / X)' },
  { value: 'LUP', label: 'LUP – left stick up' },
  { value: 'LDOWN', label: 'LDOWN – left stick down' },
  { value: 'LLEFT', label: 'LLEFT – left stick left' },
  { value: 'LRIGHT', label: 'LRIGHT – left stick right' },
  { value: 'LRING', label: 'LRING – left stick ring binding' },
  { value: 'RUP', label: 'RUP – right stick up' },
  { value: 'RDOWN', label: 'RDOWN – right stick down' },
  { value: 'RLEFT', label: 'RLEFT – right stick left' },
  { value: 'RRIGHT', label: 'RRIGHT – right stick right' },
  { value: 'RRING', label: 'RRING – right stick ring binding' },
  { value: 'LEAN_LEFT', label: 'LEAN_LEFT – tilt controller left' },
  { value: 'LEAN_RIGHT', label: 'LEAN_RIGHT – tilt controller right' },
  { value: 'MIC', label: 'MIC – DualSense microphone button' },
  { value: 'LMINI', label: 'LMINI – left mini shoulder button' },
  { value: 'RMINI', label: 'RMINI – right mini shoulder button' },
  { value: 'LTOUCH', label: 'LTOUCH – left stick capacitive touch' },
  { value: 'RTOUCH', label: 'RTOUCH – right stick capacitive touch' },
  { value: 'MISC1', label: 'MISC1 – extra button 1' },
  { value: 'MISC2', label: 'MISC2 – extra button 2' },
  { value: 'MISC3', label: 'MISC3 – extra button 3' },
  { value: 'MISC4', label: 'MISC4 – extra button 4' },
  { value: 'MISC5', label: 'MISC5 – extra button 5' },
  { value: 'MISC6', label: 'MISC6 – extra button 6' },
]

const TOUCHPAD_CORE_OPTIONS: ModifierSelectOption[] = [{ value: 'TOUCH', label: 'TOUCH – touchpad touch' }]

const TOUCHPAD_GRID_PREVIEW_COUNT = 6

const clampGridButtons = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 1
  return Math.min(Math.max(Math.floor(value), 1), 25)
}

export const buildModifierOptions = (
  gridActive: boolean,
  configuredGridButtons: number
) => {
  const options: ModifierSelectOption[] = [...BASE_MODIFIER_OPTIONS, ...TOUCHPAD_CORE_OPTIONS]
  if (gridActive) {
    const count = clampGridButtons(configuredGridButtons || 1)
    for (let index = 1; index <= count; index += 1) {
      options.push({ value: `T${index}`, label: `T${index} – touch grid region ${index}` })
    }
  } else {
    const previewCount = Math.min(TOUCHPAD_GRID_PREVIEW_COUNT, Math.max(configuredGridButtons, 2) || 2)
    for (let index = 1; index <= previewCount; index += 1) {
      options.push({
        value: `T${index}`,
        label: `T${index} – touch grid region ${index} (enable GRID_AND_STICK to use)`,
        disabled: true,
      })
    }
  }
  return options
}
