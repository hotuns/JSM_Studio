import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
const bundle = await build({ stdin: { contents: `export {desktopBridge} from './src/platform/desktopBridge'; export {createProfileTemplate} from './src/utils/profileTemplates'; export {createVirtualProfile} from './src/utils/virtualProfile'; export {analyzeVirtualControllerConfig} from './src/utils/virtualController'; export {parseConfigText,serializeConfig} from './src/utils/configSerializer';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false })
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
for (const type of ['XBOX', 'DS4']) test(`${type} starter remains valid after editor normalization and creates its controller before dependent mappings`, () => {
  let text = api.createVirtualProfile(type)
  for (let i = 0; i < 3; i++) text = api.serializeConfig(api.parseConfigText(text))
  const analysis = api.analyzeVirtualControllerConfig(text)
  assert.equal(analysis.type, type)
  assert.deepEqual(analysis.warnings, [])
  const scheme = text.indexOf(`VIRTUAL_CONTROLLER = ${type}`)
  for (const command of ['LEFT_STICK_MODE = LEFT_STICK', 'RIGHT_STICK_MODE = RIGHT_STICK', `ZL_MODE = ${type === 'XBOX' ? 'X_LT' : 'PS_L2'}`, `S = ${type === 'XBOX' ? 'X_A' : 'PS_CROSS'}`]) {
    assert(text.includes(command), command)
    assert(scheme < text.indexOf(command), 'Controller must exist before assigning virtual output')
  }
  assert(text.includes('GYRO_SENS = 0 0'))
  assert(!/ = (?:LMOUSE|RMOUSE|W|A|S|D|SPACE)$/m.test(text), 'Starter must not mix in game keyboard/mouse bindings')
})
test('unsupported virtual schemes cannot create misleading profiles', () => {
  assert.throws(() => api.createVirtualProfile('NONE'))
  assert.throws(() => api.createVirtualProfile('unknown'))
})

test('profile creation templates remain isolated after normalization', () => {
  for (const kind of ['cursor', 'empty']) {
    const text = api.serializeConfig(api.parseConfigText(api.createProfileTemplate(kind)))
    assert.equal(api.analyzeVirtualControllerConfig(text).type, 'NONE')
    assert(text.includes('GYRO_SENS = 0 0'))
    if (kind === 'cursor') {
      assert(text.includes('S = LMOUSE'))
      assert(text.includes('RIGHT_STICK_MODE = AIM'))
    } else {
      assert(text.includes('RIGHT_STICK_MODE = NO_MOUSE'))
      assert(!/^[SENW] = /m.test(text), 'Empty means no preassigned face buttons')
    }
  }
  assert.equal(api.createProfileTemplate('native', 'DS4'), api.createVirtualProfile('DS4'))
  assert.throws(() => api.createProfileTemplate('unknown'))
})

test('profile rename follows the Tauri command contract and exposes failures for retry', async () => {
  const previous = globalThis.window
  let call
  globalThis.window = { __TAURI_INTERNALS__: { invoke: async (command, args) => {
    call = { command, args }
    return { name: 'After', path: 'profiles-library/After.txt', content: 'RESET_MAPPINGS' }
  } } }
  try {
    const result = await api.desktopBridge.renameLibraryProfile('Before', 'After')
    assert.equal(result.name, 'After')
    assert.deepEqual(call, { command: 'library_rename_profile', args: { oldName: 'Before', newName: 'After' } })
    globalThis.window.__TAURI_INTERNALS__.invoke = async () => { throw new Error('Rename denied') }
    await assert.rejects(() => api.desktopBridge.renameLibraryProfile('Before', 'After'), /Rename denied/)
  } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
})
