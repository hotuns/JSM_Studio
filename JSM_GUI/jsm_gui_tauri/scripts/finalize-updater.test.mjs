import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { publicUpdaterManifest, verifyPublicDownloads } from './finalize-updater.mjs'

const binary = Buffer.from('MZ installer fixture')
const installer = {
  name: 'setup.exe', url: 'https://api.github.com/repos/example/app/releases/assets/1',
  browser_download_url: 'https://github.com/example/app/releases/download/v1/setup.exe',
  size: binary.length, digest: `sha256:${createHash('sha256').update(binary).digest('hex')}`,
}
const signature = { name: 'setup.exe.sig', browser_download_url: `${installer.browser_download_url}.sig` }
const assets = [installer, signature]
const manifest = { version: '1.0.0', notes: 'Keep notes', platforms: {
  'windows-x86_64': { url: installer.url, signature: 'signed-fixture' },
  'windows-x86_64-nsis': { url: installer.url, signature: 'signed-fixture' },
} }
const anonymousFetch = async (url, options) => {
  assert.equal(options?.headers?.Authorization, undefined)
  if (url.startsWith('https://api.github.com/')) return new Response('API rate limit exceeded', { status: 403 })
  if (url.endsWith('.sig')) return new Response('signed-fixture\n')
  return new Response(binary)
}

test('replace API URLs for all platforms while preserving signatures and notes', () => {
  const updated = publicUpdaterManifest(manifest, assets)
  assert.equal(updated.notes, manifest.notes)
  for (const entry of Object.values(updated.platforms)) {
    assert.equal(entry.url, installer.browser_download_url)
    assert.equal(entry.signature, 'signed-fixture')
  }
  assert.equal(manifest.platforms['windows-x86_64'].url, installer.url)
  assert.deepEqual(publicUpdaterManifest(updated, assets), updated)
})
test('public updater succeeds anonymously and deduplicates identical installers', async () => {
  assert.equal(await verifyPublicDownloads(publicUpdaterManifest(manifest, assets), assets, anonymousFetch), 1)
  await assert.rejects(verifyPublicDownloads(manifest, assets, anonymousFetch), /API URL is not allowed/)
})
test('reject unknown assets and missing signatures before publishing', () => {
  assert.throws(() => publicUpdaterManifest(manifest, []), /Unknown installer/)
  assert.throws(() => publicUpdaterManifest({ ...manifest, platforms: { win: { url: installer.url } } }, assets), /Missing signature/)
})
test('reject corrupt downloads and mismatched signatures', async () => {
  const updated = publicUpdaterManifest(manifest, assets)
  await assert.rejects(verifyPublicDownloads(updated, [{ ...installer, size: 1 }, signature], anonymousFetch), /size mismatch/)
  await assert.rejects(verifyPublicDownloads(updated, [{ ...installer, digest: 'sha256:wrong' }, signature], anonymousFetch), /digest mismatch/)
  const badSignature = (url, options) => url.endsWith('.sig') ? Promise.resolve(new Response('wrong')) : anonymousFetch(url, options)
  await assert.rejects(verifyPublicDownloads(updated, assets, badSignature), /Signature mismatch/)
})
