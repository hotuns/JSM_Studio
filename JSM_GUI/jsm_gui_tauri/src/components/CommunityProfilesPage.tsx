import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { COMMUNITY_SOURCE, WEBSITE_URL, loadCommunityCatalog, loadCommunityProfile, type CommunityProfile } from '../community/catalog'
import { readGameProfile } from '../games/gameProfiles'
import { desktopBridge } from '../platform/desktopBridge'
import { StudioIcon } from './StudioIcon'
import styles from './CommunityProfilesPage.module.css'

type Props = { onImport: (name: string, text: string) => Promise<string>; onLibrary: () => void; disabled?: boolean }
export function CommunityProfilesPage({ onImport, onLibrary, disabled }: Props) {
  const { t, i18n } = useTranslation()
  const [profiles, setProfiles] = useState<CommunityProfile[]>([])
  const [query, setQuery] = useState(''), [mode, setMode] = useState('')
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true), [catalogError, setCatalogError] = useState('')
  const [selected, setSelected] = useState<CommunityProfile | null>(null), [text, setText] = useState('')
  const [loadedId, setLoadedId] = useState('')
  const [fetching, setFetching] = useState(false), [previewError, setPreviewError] = useState('')
  const [importing, setImporting] = useState(false), [savedName, setSavedName] = useState('')
  const importLock = useRef(false), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const abort = new AbortController()
    setLoading(true); setCatalogError(''); setSelected(null); setText(''); setSavedName('')
    loadCommunityCatalog(abort.signal).then(result => { if (!abort.signal.aborted) setProfiles(result.profiles) })
      .catch(error => { if (!abort.signal.aborted) { setProfiles([]); setCatalogError(String(error.message ?? error)) } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [refresh])
  useEffect(() => {
    if (!selected) return
    const abort = new AbortController()
    setFetching(true); setText(''); setLoadedId(''); setPreviewError(''); setSavedName('')
    loadCommunityProfile(selected, abort.signal).then(value => { if (!abort.signal.aborted) { setText(value); setLoadedId(selected.id) } })
      .catch(error => { if (!abort.signal.aborted) setPreviewError(String(error.message ?? error)) })
      .finally(() => { if (!abort.signal.aborted) setFetching(false) })
    return () => abort.abort()
  }, [selected])
  const importProfile = async () => {
    if (!selected || loadedId !== selected.id || !text || fetching || importLock.current || disabled) return
    importLock.current = true; setImporting(true); setPreviewError('')
    try {
      const name = await onImport(selected.name, text)
      if (mounted.current) setSavedName(name)
    } catch (error) { if (mounted.current) setPreviewError(String(error instanceof Error ? error.message : error)) }
    finally { importLock.current = false; if (mounted.current) setImporting(false) }
  }
  const filtered = profiles.filter(p => (!mode || p.mode === mode) && [p.name, p.game, p.description, p.author, p.controller, ...p.tags].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const game = text ? readGameProfile(text) : null
  return <div className={styles.page} data-capture-ignore="true">
    <div className={styles.intro}><p>{t('communityProfiles.intro')}</p><div>
      <button className="secondary-btn" onClick={() => { void desktopBridge.openExternal(WEBSITE_URL) }}>{t('communityProfiles.website')} ↗</button>
      <button className="secondary-btn" onClick={() => { void desktopBridge.openExternal(COMMUNITY_SOURCE) }}>{t('communityProfiles.source')} ↗</button>
      <button className="secondary-btn" disabled={loading || importing} onClick={() => setRefresh(n => n + 1)}><StudioIcon name="refresh" size={15} />{t('communityProfiles.refresh')}</button>
    </div></div>
    <div className={styles.filters}><input aria-label={t('communityProfiles.search')} placeholder={t('communityProfiles.search')} value={query} onChange={e => setQuery(e.target.value)} />
      <select aria-label={t('communityProfiles.all')} value={mode} onChange={e => setMode(e.target.value)}><option value="">{t('communityProfiles.all')}</option><option value="keyboardMouse">{t('communityProfiles.keyboardMouse')}</option><option value="nativeGyro">{t('communityProfiles.nativeGyro')}</option></select></div>
    {loading ? <p role="status">{t('communityProfiles.loading')}</p> : catalogError ? <div className={styles.error} role="alert"><strong>{t('communityProfiles.loadError')}</strong><p>{catalogError}</p><button className="secondary-btn" onClick={() => setRefresh(n => n + 1)}>{t('communityProfiles.retry')}</button></div> : <div className={styles.layout}>
      <div className={styles.list}>{!filtered.length && <p>{t('communityProfiles.empty')}</p>}{filtered.map(p => <button type="button" className={styles.card} key={p.id} aria-pressed={selected?.id === p.id} disabled={importing} onClick={() => setSelected(p)}>
        <small>{p.game}</small><strong>{p.name}</strong><p>{p.description}</p><span>{t(`communityProfiles.${p.mode}`)}</span><footer>{p.author}<time>{p.updatedAt}</time></footer>
      </button>)}</div>
      <section className={styles.preview} aria-label={t('communityProfiles.preview')} aria-busy={fetching}>
        {!selected ? <div className={styles.empty}><StudioIcon name="communityProfiles" size={36} /><h2>{t('communityProfiles.select')}</h2><p>{t('communityProfiles.selectHint')}</p></div> : <>
          <header><span className={styles.badge}>{t(selected.verified ? 'communityProfiles.verified' : 'communityProfiles.example')}</span><h2>{selected.name}</h2><p>{selected.description}</p></header>
          <dl><dt>{t('communityProfiles.author')}</dt><dd>{selected.author}</dd><dt>{t('communityProfiles.controller')}</dt><dd>{selected.controller}</dd><dt>{t('communityProfiles.updated')}</dt><dd>{selected.updatedAt}</dd></dl>
          {selected.notes && <div className={styles.notice}><strong>{t('communityProfiles.notes')}</strong><p>{selected.notes}</p></div>}
          {fetching && <p role="status">{t('communityProfiles.fetching')}</p>}
          {previewError && <p role="alert" className={styles.error}>{t('communityProfiles.error', { message: previewError })}</p>}
          {game && <><h3>{t('communityProfiles.actions')} · {game.actions.length}</h3><div className={styles.tableScroll}><table><thead><tr><th>{t('communityProfiles.action')}</th><th>{t('communityProfiles.button')}</th><th>{t('communityProfiles.key')}</th></tr></thead><tbody>{game.actions.map(a => <tr key={a.id}><td>{i18n.language.startsWith('zh') ? a.zh : a.en}</td><td><code>{a.modifier ? `${a.modifier} + ` : ''}{a.button || '—'}</code> <small>{t(`communityProfiles.${a.gesture}`)}</small></td><td><code>{a.key || '—'}</code></td></tr>)}</tbody></table></div></>}
          {text && <details className={styles.source}><summary>{t('communityProfiles.sourceCode')}</summary><pre tabIndex={0}>{text}</pre></details>}
          <div className={styles.importBar}><p>{t('communityProfiles.unchanged')}</p><button className="primary-btn" disabled={!text || loadedId !== selected.id || fetching || importing || disabled || !!savedName} onClick={() => { void importProfile() }}>{t(importing ? 'communityProfiles.importing' : savedName ? 'communityProfiles.imported' : 'communityProfiles.import')}</button></div>
          {savedName && <div role="status" className={styles.success}><p>{t('communityProfiles.saved', { name: savedName })}</p><button className="secondary-btn" onClick={onLibrary}>{t('communityProfiles.library')}</button></div>}
        </>}
      </section>
    </div>}
    <footer className={styles.contribute}><div><strong>{t('communityProfiles.contribute')}</strong><p>{t('communityProfiles.contributeHint')}</p></div><button className="secondary-btn" onClick={() => { void desktopBridge.openExternal(`${COMMUNITY_SOURCE}#分享配置`) }}>{t('communityProfiles.source')} ↗</button></footer>
  </div>
}
