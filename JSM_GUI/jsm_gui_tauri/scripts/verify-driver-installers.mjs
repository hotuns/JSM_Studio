import { readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../src-tauri/drivers/', import.meta.url))
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'))
if (manifest.version !== 1) throw Error('Unsupported driver manifest')
for (const kind of ['hidhide', 'vigem']) {
  const entry = manifest.installers[kind]
  if (!entry || path.basename(entry.file) !== entry.file || !entry.file.endsWith('.exe')) throw Error(`Invalid ${kind} installer entry`)
  const bytes = readFileSync(path.join(root, entry.file))
  if (bytes.subarray(0, 2).toString() !== 'MZ' || bytes.length !== entry.size || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw Error(`Bundled installer checksum mismatch: ${entry.file}`)
  if (!entry.url.startsWith('https://github.com/nefarius/') || !statSync(path.join(root, entry.licenseFile)).isFile()) throw Error(`Missing official source / license for ${kind}`)
  console.log(`Verified ${kind} ${entry.version}: ${entry.file}`)
}
