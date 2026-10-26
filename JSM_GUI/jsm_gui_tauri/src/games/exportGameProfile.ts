import { readGameProfile, writeGameMetadata } from './gameProfiles'

export function prepareGameProfileExport(text: string, name: string): { fileName: string; content: string } {
  const profile = readGameProfile(text)
  // Upgrades older metadata in the exported copy while preserving actual commands.
  const content = profile ? writeGameMetadata(text, profile) : text
  const safeName = [...name].map(char => /[<>:"/\\|?*]/.test(char) || char.charCodeAt(0) < 32 ? '_' : char).join('').replace(/[. ]+$/, '').slice(0, 100) || 'JSM-profile'
  return { fileName: `${safeName.replace(/\.txt$/i, '')}.txt`, content: `${content.trimEnd()}\n` }
}

export function downloadGameProfile(text: string, name: string): void {
  const { content, fileName } = prepareGameProfileExport(text, name)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  try { link.click() }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
