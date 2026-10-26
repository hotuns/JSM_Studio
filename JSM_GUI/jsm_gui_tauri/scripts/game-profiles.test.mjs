import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
const bundle = await build({ stdin: { contents: `export * from './src/games/gameProfiles'; export {prepareGameProfileExport} from './src/games/exportGameProfile'; export {parseConfigText,serializeConfig} from './src/utils/configSerializer'; export {sanitizeImportedConfig} from './src/utils/config';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false })
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const config = p => api.createGameConfig(p, { axis: 'flydigi', activation: 'aim', sensitivity: 1 })
const change = (p, id, values) => ({ ...p, actions: p.actions.map(a => a.id === id ? { ...a, ...values } : a) })
test('Delta template generates movement, trigger, tap/hold and verified Flydigi gyro commands', () => {
  const p = api.createDeltaProfile(), text = config(p)
  assert.deepEqual(api.validateGameProfile(p), [])
  for (const line of ['LUP = W', 'ZR = LMOUSE', 'ZL = RMOUSE', 'W = R F', 'E = C Z', 'GYRO_ON = ZL', 'MOUSE_X_FROM_GYRO_AXIS = X', 'MOUSE_Y_FROM_GYRO_AXIS = Z', 'RIGHT_STICK_MODE = AIM']) assert(text.includes(line), line)
  assert.equal(p.actions.every(a => !a.confirmed), true)
})
test('Game metadata survives repeated normalizing, import and source edits', () => {
  const p = api.createDeltaProfile()
  let text = config(p)
  for (let i = 0; i < 3; i++) text = api.serializeConfig(api.parseConfigText(api.sanitizeImportedConfig(text)))
  assert.deepEqual(api.readGameProfile(text), p)
  assert.deepEqual(api.gameBindingDrift(text, p), [])
})
test('Editing an action preserves advanced lines and the other half of a tap/hold pair', () => {
  const p = api.createDeltaProfile(), next = change(p, 'reload', { key: 'T', confirmed: true })
  const text = api.updateGameProfile(config(p) + '\nSTICK_ACCELERATION_RATE = 17\nLSL = Q\nL,N = F2', p, next)
  assert(text.includes('W = T F'))
  assert(text.includes('STICK_ACCELERATION_RATE = 17'))
  assert(text.includes('LSL = Q'))
  assert(text.includes('L,N = F2'))
  assert.deepEqual(api.readGameProfile(text), next)
})
test('Relocating a binding clears only its old slot, and aim moves its gyro activation', () => {
  const p = api.createDeltaProfile(), next = change(p, 'aim', { button: 'LSL' })
  const text = api.updateGameProfile(config(p), p, next)
  assert(text.includes('ZL = NONE'))
  assert(text.includes('LSL = RMOUSE'))
  assert(text.includes('GYRO_ON = LSL'))
})
test('Conflicting slots and injected tokens are rejected; tap/hold and chords are supported', () => {
  const p = api.createDeltaProfile()
  assert(api.validateGameProfile(change(p, 'jump', { button: 'W' })).some(e => e.startsWith('conflict:')))
  assert.throws(() => api.updateGameProfile(config(p), p, change(p, 'fire', { key: 'LMOUSE\nCLEAR' })))
  const next = change(p, 'gadget', { button: 'S', gesture: 'chord', modifier: 'L' })
  assert.deepEqual(api.validateGameProfile(next), [])
  assert.equal(api.compileGameBindings(next).get('L,S'), 'G')
})
test('Advanced changes are detected; explicit rebuild preserves unrelated commands and removes duplicates', () => {
  const p = api.createDeltaProfile(), advanced = config(p) + '\nW=F1\nW = F2\nN,N = F3'
  assert.deepEqual(api.gameBindingDrift(advanced, p), ['W'])
  const text = api.putGameSetting(advanced, 'W', 'F4')
  assert.equal(text.split('\n').filter(l => /^W\s*=/.test(l)).length, 1)
  assert.deepEqual(api.gameBindingDrift(api.putGameSetting(config(p), 'W', 'F4'), p), ['W'])
  const rebuilt = api.updateGameProfile(advanced, p, p, true)
  assert.deepEqual(api.gameBindingDrift(rebuilt, p), [])
  assert(rebuilt.includes('N,N = F3'))
})
test('Native controller + gyro emits no keyboard mappings or stick mouse commands', () => {
  const p = api.createDeltaProfile('nativeGyro'), text = config(p)
  assert.equal(api.compileGameBindings(p).size, 0)
  assert(!text.includes('LUP = W'))
  assert(!text.includes('ZR = LMOUSE'))
  assert(text.includes('RIGHT_STICK_MODE = NO_MOUSE'))
})
test('Malformed, oversized and unsupported metadata is ignored safely', () => {
  for (const value of ['garbage', '%', encodeURIComponent(JSON.stringify({ version: 3 })), 'a'.repeat(110000)]) assert.equal(api.readGameProfile(api.GAME_METADATA_PREFIX + value), null)
})
test('Readable comments contain game name and one complete action per line, with no URI encoding', () => {
  const p = api.createDeltaProfile(), text = config(p)
  assert(text.includes('"gameName":"三角洲行动"'))
  assert(text.includes('"zh":"跳跃 / 翻越"'))
  assert.equal(text.split('\n').filter(line => line.startsWith(api.ACTION_METADATA_PREFIX)).length, p.actions.length)
  assert(!text.includes('%7B'))
  assert.deepEqual(api.readGameProfile(text), p)
})
test('Legacy encoded metadata loads and exports as readable v2 without dropping advanced commands', () => {
  const p = api.createDeltaProfile(), legacy = { ...p }
  delete legacy.gameName
  const text = api.GAME_METADATA_PREFIX + encodeURIComponent(JSON.stringify(legacy)) + '\nRESET_MAPPINGS\nCOUNTER_OS_MOUSE_SPEED\nCUSTOM_COMMAND = 42'
  assert.deepEqual(api.readGameProfile(text), p)
  const exported = api.prepareGameProfileExport(text, '三角洲 / 我的方案')
  assert.equal(exported.fileName, '三角洲 _ 我的方案.txt')
  assert(exported.content.includes('"version":2'))
  const imported = api.serializeConfig(api.parseConfigText(api.sanitizeImportedConfig(exported.content)))
  assert(imported.includes('COUNTER_OS_MOUSE_SPEED'))
  assert(imported.includes('CUSTOM_COMMAND = 42'))
  assert.deepEqual(api.readGameProfile(imported), p)
})
test('Custom game names, action names and lists round trip without an installed template', () => {
  const p = { ...api.createBasicGameProfile('自定义游戏 #1'), actions: [
    { id: 'custom-jump', zh: '二段跳', en: 'Double jump', group: 'move', key: 'SPACE', button: 'S', gesture: 'press', modifier: '', confirmed: true },
  ] }
  const exported = api.prepareGameProfileExport(api.writeGameMetadata('S = SPACE\nGYRO_SENS = 2 3', p), 'My game.txt')
  assert.equal(exported.fileName, 'My game.txt')
  assert.deepEqual(api.readGameProfile(api.sanitizeImportedConfig(exported.content)), p)
  assert(exported.content.includes('GYRO_SENS = 2 3'))
})
test('Duplicate metadata headers and malformed action comments cannot silently change a game profile', () => {
  const text = config(api.createDeltaProfile())
  assert.equal(api.readGameProfile(text + '\n' + text.split('\n')[0]), null)
  assert.equal(api.readGameProfile(text + '\n' + api.ACTION_METADATA_PREFIX + '{broken'), null)
})
test('Deleting an action preserves the paired hold binding and disables a removed aim activation', () => {
  const p = api.createDeltaProfile()
  const next = { ...p, actions: p.actions.filter(a => a.id !== 'reload' && a.id !== 'aim') }
  const text = api.updateGameProfile(config(p), p, next)
  assert(text.includes('W = NONE F'))
  assert(text.includes('ZL = NONE'))
  assert(text.includes('GYRO_ON = NONE'))
  assert.deepEqual(api.readGameProfile(text), next)
})
test('All actions can be deleted, shared and replaced with a custom action', () => {
  const p = api.createDeltaProfile(), empty = { ...p, actions: [] }
  const text = api.updateGameProfile(config(p), p, empty)
  assert.deepEqual(api.validateGameProfile(empty), [])
  assert.deepEqual(api.readGameProfile(api.sanitizeImportedConfig(text)), empty)
  const next = { ...empty, actions: [{ id: 'custom-action', zh: '探头', en: 'Lean', group: 'combat', key: 'Q', button: 'LSL', gesture: 'press', modifier: '', confirmed: false }] }
  const updated = api.updateGameProfile(text, empty, next)
  assert(updated.includes('LSL = Q'))
  assert.deepEqual(api.readGameProfile(updated), next)
})
