import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
const bundle = await build({ stdin: { contents: `export {createVirtualProfile} from './src/utils/virtualProfile'; export {analyzeVirtualControllerConfig} from './src/utils/virtualController'; export {parseConfigText,serializeConfig} from './src/utils/configSerializer';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false })
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
