import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// Public desktop clients must not depend on authenticated GitHub API downloads.
export function publicUpdaterManifest(manifest, assets) {
  assert.equal(typeof manifest.version, 'string')
  assert.ok(manifest.platforms && Object.keys(manifest.platforms).length, 'Missing updater platforms')
  const platforms = {}
  for (const [platform, entry] of Object.entries(manifest.platforms)) {
    const asset = assets.find(asset => asset.url === entry.url || asset.browser_download_url === entry.url)
    assert.ok(asset, `Unknown installer for ${platform}`)
    assert.ok(/\.(exe|msi)$/.test(asset.name), `Unexpected installer type for ${platform}`)
    assert.ok(entry.signature?.trim(), `Missing signature for ${platform}`)
    assert.ok(asset.browser_download_url.startsWith('https://github.com/'), 'Expected public GitHub download URL')
    platforms[platform] = { ...entry, url: asset.browser_download_url }
  }
  return { ...manifest, platforms }
}

export async function verifyPublicDownloads(manifest, assets, fetcher = fetch) {
  const checked = new Map()
  for (const [platform, entry] of Object.entries(manifest.platforms)) {
    assert.ok(entry.url.startsWith('https://github.com/'), `API URL is not allowed for ${platform}`)
    if (checked.has(entry.url)) {
      assert.equal(checked.get(entry.url), entry.signature.trim(), 'Conflicting installer signatures')
      continue
    }
    const asset = assets.find(asset => asset.browser_download_url === entry.url)
    assert.ok(asset, `Unknown public installer for ${platform}`)
    const signature = assets.find(candidate => candidate.name === `${asset.name}.sig`)
    assert.ok(signature, `Missing signature asset for ${platform}`)
    // Deliberately no Authorization header: reproduce a normal installed client.
    const response = await fetcher(entry.url, {
      headers: { Accept: 'application/octet-stream', 'User-Agent': 'JSM-Studio-updater-check' },
      signal: AbortSignal.timeout(120000),
    })
    assert.equal(response.status, 200, `Anonymous installer download failed for ${platform}`)
    const binary = Buffer.from(await response.arrayBuffer())
    assert.equal(binary.length, asset.size, `Installer size mismatch for ${platform}`)
    const sha256 = `sha256:${createHash('sha256').update(binary).digest('hex')}`
    assert.ok(asset.digest?.startsWith('sha256:'), 'GitHub installer digest is required')
    assert.equal(sha256, asset.digest, `Installer digest mismatch for ${platform}`)
    const sigResponse = await fetcher(signature.browser_download_url, { signal: AbortSignal.timeout(30000) })
    assert.equal(sigResponse.status, 200, `Anonymous signature download failed for ${platform}`)
    assert.equal((await sigResponse.text()).trim(), entry.signature.trim(), `Signature mismatch for ${platform}`)
    checked.set(entry.url, entry.signature.trim())
  }
  return checked.size
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY || 'hotuns/JSM_Studio'
  assert.match(repository, /^[\w.-]+\/[\w.-]+$/)
  const token = process.env.GITHUB_TOKEN
  assert.ok(token, 'GITHUB_TOKEN is required for release metadata only')
  const args = process.argv.slice(2)
  const version = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version
  const tagIndex = args.indexOf('--tag')
  const tag = tagIndex >= 0 ? args[tagIndex + 1] : `v${version}`
  assert.ok(tag, 'Missing release tag')
  const apiBase = `https://api.github.com/repos/${repository}/`
  async function api(path, method = 'GET', body) {
    const response = await fetch(apiBase + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json', 'User-Agent': 'JSM-Studio-release' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    assert.ok(response.ok, `GitHub release API returned ${response.status}`)
    return response.json()
  }
  const release = await api(`releases/tags/${encodeURIComponent(tag)}`)
  const assets = await api(`releases/${release.id}/assets?per_page=100`)
  const current = assets.find(asset => asset.name === 'latest.json')
  assert.ok(current, 'Missing latest.json release asset')
  const response = await fetch(current.browser_download_url, { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, 'Public latest.json is unavailable')
  const original = await response.json()
  assert.equal(original.version, tag.replace(/^v/, ''), 'Updater version does not match release')
  const updated = publicUpdaterManifest(original, assets)
  const verified = await verifyPublicDownloads(updated, assets)
  console.log(`Verified ${verified} installer downloads without GitHub credentials.`)
  if (args.includes('--dry-run') || JSON.stringify(original) === JSON.stringify(updated)) {
    console.log(args.includes('--dry-run') ? 'Dry run: public URLs verified; no release changes.' : 'Updater URLs are already public.')
    return
  }
  // Stage and verify the replacement before changing the live filename. Keep the
  // old manifest as a backup so a failed rename can be rolled back without loss.
  const pendingName = `latest.pending-${current.id}.json`
  assert.ok(!assets.some(asset => asset.name === pendingName), 'A pending manifest already exists; inspect it before retrying')
  const payload = JSON.stringify(updated, null, 2) + '\n'
  const uploadUrl = new URL(release.upload_url.split('{')[0])
  uploadUrl.searchParams.set('name', pendingName)
  const upload = await fetch(uploadUrl, { method: 'POST', headers: {
    Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'JSM-Studio-release',
  }, body: payload, signal: AbortSignal.timeout(30000) })
  assert.ok(upload.ok, `Manifest upload returned ${upload.status}`)
  const staged = await upload.json()
  const stagedResponse = await fetch(staged.browser_download_url, { signal: AbortSignal.timeout(30000) })
  assert.equal(stagedResponse.status, 200, 'Staged manifest is unavailable')
  assert.equal(await stagedResponse.text(), payload, 'Staged manifest content mismatch')
  const backupName = `latest.api-urls-${current.id}.json`
  await api(`releases/assets/${current.id}`, 'PATCH', { name: backupName })
  try {
    await api(`releases/assets/${staged.id}`, 'PATCH', { name: 'latest.json' })
  } catch (error) {
    const now = await api(`releases/${release.id}/assets?per_page=100`)
    if (!now.some(asset => asset.name === 'latest.json')) {
      await api(`releases/assets/${current.id}`, 'PATCH', { name: 'latest.json' })
    }
    throw error
  }
  const live = await fetch(`${current.browser_download_url}?verify=${Date.now()}`, { signal: AbortSignal.timeout(30000) })
  assert.equal(live.status, 200, 'Published manifest is unavailable')
  assert.deepEqual(await live.json(), updated, 'Published manifest does not match verified content')
  console.log(`Published public updater URLs for ${tag}; original preserved as ${backupName}.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
