import { readGameProfile } from '../games/gameProfiles'

export const COMMUNITY_REPOSITORY = 'https://github.com/hotuns/JSM_Studio'
export const COMMUNITY_BRANCH = 'gh-pages'
export const COMMUNITY_ROOT = `https://raw.githubusercontent.com/hotuns/JSM_Studio/${COMMUNITY_BRANCH}/community-configs/`
export const COMMUNITY_SOURCE = `${COMMUNITY_REPOSITORY}/tree/${COMMUNITY_BRANCH}/community-configs`
export const WEBSITE_URL = 'https://hotuns.github.io/JSM_Studio/'
export type CommunityProfile = {
  id: string; name: string; game: string; author: string; description: string
  controller: string; mode: 'keyboardMouse' | 'nativeGyro'; updatedAt: string
  file: string; sha256: string; tags: string[]; notes: string; verified: boolean
}
export type CommunityCatalog = { version: 1; profiles: CommunityProfile[] }
const MAX_BYTES = 512 * 1024
const field = (value: unknown, max = 300): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max

export function parseCommunityCatalog(value: unknown): CommunityCatalog {
  if (!value || typeof value !== 'object') throw new Error('Invalid community catalog')
  const raw = value as Record<string, unknown>
  if (raw.version !== 1 || !Array.isArray(raw.profiles) || raw.profiles.length > 500) throw new Error('Unsupported community catalog')
  const ids = new Set<string>()
  const profiles = raw.profiles.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid profile entry')
    const p = item as CommunityProfile
    if (!field(p.id, 80) || !/^[a-z0-9-]+$/.test(p.id) || ids.has(p.id)
      || !field(p.name, 120) || !field(p.game, 100) || !field(p.author, 100)
      || !field(p.description, 1200) || !field(p.controller, 200)
      || !['keyboardMouse', 'nativeGyro'].includes(p.mode)
      || !/^\d{4}-\d{2}-\d{2}$/.test(p.updatedAt)
      || !/^[a-f0-9]{64}$/i.test(p.sha256)
      || !/^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.txt$/.test(p.file)
      || !Array.isArray(p.tags) || p.tags.length > 12 || !p.tags.every(t => field(t, 40))
      || typeof p.notes !== 'string' || p.notes.length > 3000 || typeof p.verified !== 'boolean') throw new Error('Invalid profile entry')
    ids.add(p.id)
    return { ...p }
  })
  return { version: 1, profiles }
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(cancel, 15000)
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store', credentials: 'omit', redirect: 'error' })
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`)
    if (Number(response.headers.get('content-length')) > MAX_BYTES || !response.body) throw new Error('Community file is too large or empty')
    const reader = response.body.getReader(), chunks: Uint8Array[] = []
    let length = 0
    try {
      while (!controller.signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.length
        if (length > MAX_BYTES) throw new Error('Community file is too large')
        chunks.push(value)
      }
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
    } finally { await reader.cancel() }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel) }
}

export async function loadCommunityCatalog(signal?: AbortSignal) {
  return parseCommunityCatalog(JSON.parse(await fetchText(`${COMMUNITY_ROOT}index.json`, signal)))
}

export async function loadCommunityProfile(profile: CommunityProfile, signal?: AbortSignal) {
  if (!/^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.txt$/.test(profile.file)) throw new Error('Invalid profile path')
  const text = await fetchText(`${COMMUNITY_ROOT}${profile.file}`, signal)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
  if (hash !== profile.sha256.toLowerCase()) throw new Error('Profile checksum mismatch. Refresh the catalog and try again.')
  if (!text.trim() || text.includes('\0') || /^\s*(?:<!doctype|<html)/i.test(text)) throw new Error('Invalid profile content')
  const game = readGameProfile(text)
  if (!game || game.gameName !== profile.game || game.mode !== profile.mode) throw new Error('Profile metadata does not match the catalog')
  return text
}
