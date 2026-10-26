import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const source = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(source)
const checkout = path.join(root, '.codex-dev/pages-publish')
const prepareOnly = process.argv.includes('--prepare-only')
const git = args => execFileSync('git', args, { cwd: checkout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const index = JSON.parse(readFileSync(path.join(root, 'community-configs/index.json'), 'utf8'))
for (const p of index.profiles) {
  if (!/^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.txt$/.test(p.file)) throw Error('Invalid config path')
  const actual = createHash('sha256').update(readFileSync(path.join(root, 'community-configs', p.file))).digest('hex')
  if (actual !== p.sha256) throw Error(`Checksum mismatch: ${p.file}`)
}
mkdirSync(checkout, { recursive: true })
if (!existsSync(path.join(checkout, '.git'))) {
  git(['init', '-b', 'gh-pages'])
  git(['remote', 'add', 'origin', 'git@github.com:hotuns/JSM_Studio.git'])
  const remote = git(['ls-remote', 'origin', 'refs/heads/gh-pages'])
  if (remote) { git(['fetch', 'origin', 'gh-pages']); git(['reset', '--hard', 'FETCH_HEAD']) }
}
// The dedicated checkout contains only files produced by this publisher.
for (const name of ['index.html', 'style.css', 'app.js', 'i18n.js', 'translations.js', 'mark.svg']) cpSync(path.join(source, name), path.join(checkout, name))
cpSync(path.join(source, 'screenshots'), path.join(checkout, 'screenshots'), { recursive: true })
cpSync(path.join(root, 'community-configs'), path.join(checkout, 'community-configs'), { recursive: true })
writeFileSync(path.join(checkout, '.nojekyll'), '')
writeFileSync(path.join(checkout, '.gitattributes'), '* -text\n')
writeFileSync(path.join(checkout, 'README.md'), '# JSM Studio public website\n\nGenerated from website/ and community-configs/ in the JSM Studio source workspace.\n')
const expected = new Set(['.git', '.gitattributes', '.nojekyll', 'README.md', 'index.html', 'style.css', 'app.js', 'i18n.js', 'translations.js', 'mark.svg', 'community-configs', 'screenshots'])
for (const name of readdirSync(checkout)) if (!expected.has(name)) throw Error(`Unexpected deployment file: ${name}`)
if (prepareOnly) { console.log(JSON.stringify({ checkout, prepared: true })); process.exit(0) }
git(['add', '--all'])
if (git(['diff', '--cached', '--name-only'])) git(['-c', 'user.name=hotuns', '-c', 'user.email=hotuns@users.noreply.github.com', 'commit', '-m', 'Publish JSM Studio website and community profiles'])
git(['push', 'origin', 'HEAD:refs/heads/gh-pages'])
console.log(JSON.stringify({ branch: 'gh-pages', commit: git(['rev-parse', 'HEAD']), url: 'https://hotuns.github.io/JSM_Studio/' }))
