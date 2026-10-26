import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { webcrypto } from 'node:crypto'
import { build } from 'esbuild'
const bundle = await build({ stdin: { contents: `export * from './src/community/catalog'; export * from './src/games/gameProfiles';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false })
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const root = new URL('../../../community-configs/', import.meta.url)
const catalog = api.parseCommunityCatalog(JSON.parse(await readFile(new URL('index.json', root), 'utf8')))
test('catalog entries reference valid, matching Studio profiles with byte-exact checksums', async () => {
  for (const p of catalog.profiles) {
    const bytes = await readFile(new URL(p.file, root))
    assert.equal(Buffer.from(await webcrypto.subtle.digest('SHA-256', bytes)).toString('hex'), p.sha256)
    const game = api.readGameProfile(bytes.toString('utf8'))
    assert.equal(game.gameName, p.game); assert.equal(game.mode, p.mode)
    assert.deepEqual(api.validateGameProfile(game), [])
  }
})
test('catalog rejects duplicate IDs, unsupported schemas, external paths and malformed entries', () => {
  const p = catalog.profiles[0]
  for (const patch of [{ file: '../secret.txt' }, { file: 'https://evil.test/config.txt' }, { file: '/test.txt' }, { file: 'config.exe' }, { sha256: 'bad' }, { tags: [''] }, { verified: 'true' }]) {
    assert.throws(() => api.parseCommunityCatalog({ version: 1, profiles: [{ ...p, ...patch }] }))
  }
  assert.throws(() => api.parseCommunityCatalog({ version: 1, profiles: [p, p] }))
  assert.throws(() => api.parseCommunityCatalog({ version: 2, profiles: [] }))
  assert.deepEqual(api.parseCommunityCatalog({ version: 1, profiles: [] }).profiles, [])
})
test('download checks status, maximum size, hash and metadata before returning text', async () => {
  const original = globalThis.fetch, p = catalog.profiles[0]
  try {
    const text = await readFile(new URL(p.file, root), 'utf8')
    globalThis.fetch = async url => { assert.equal(url, api.COMMUNITY_ROOT + p.file); return new Response(text) }
    assert.equal(await api.loadCommunityProfile(p), text)
    globalThis.fetch = async () => new Response('missing', { status: 404 })
    await assert.rejects(api.loadCommunityProfile(p), /404/)
    globalThis.fetch = async () => new Response(text + '\n')
    await assert.rejects(api.loadCommunityProfile(p), /checksum/)
    globalThis.fetch = async () => new Response('x'.repeat(512 * 1024 + 1))
    await assert.rejects(api.loadCommunityProfile(p), /too large/)
    globalThis.fetch = async () => new Response(text)
    await assert.rejects(api.loadCommunityProfile({ ...p, game: 'Wrong game' }), /metadata/)
    await assert.rejects(api.loadCommunityProfile({ ...p, file: '../config.txt' }), /path/)
  } finally { globalThis.fetch = original }
})
test('loading supports abort and catalog errors without returning partial data', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (_url, options) => { if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError'); return new Response('{broken') }
    await assert.rejects(api.loadCommunityCatalog())
    const controller = new AbortController(); controller.abort()
    await assert.rejects(api.loadCommunityCatalog(controller.signal), { name: 'AbortError' })
  } finally { globalThis.fetch = original }
})
