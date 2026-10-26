import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { version } from '../../package.json'
import { LanguageSelect } from './LanguageSelect'
import { ThemeToggle } from './ThemeToggle'
import { StudioIcon } from './StudioIcon'
import { WorkspaceActionsContext } from './WorkspaceActionsContext'
import styles from './StudioShell.module.css'

export type StudioPage = 'overview' | 'games' | 'controllerStatus' | 'gyro' | 'keybinds' | 'touchpad' | 'profiles' | 'communityProfiles' | 'settings'
const pages: StudioPage[] = ['overview', 'games', 'controllerStatus', 'gyro', 'keybinds', 'touchpad', 'profiles', 'communityProfiles', 'settings']

type StudioShellProps = {
  page: StudioPage; onNavigate: (page: StudioPage) => void; children: ReactNode
  profile: string | null; profiles: string[]; onSelectProfile: (name: string) => void
  mappingEnabled: boolean; runtimeBusy: boolean; isCalibrating: boolean; countdown: number | null
  deviceCount: number; sampleHz: string; hasPendingChanges: boolean; statusMessage?: string | null
  onToggleOutput: () => void; onCalibrate: () => void; onOpenSource: () => void
  onOpenFolder: () => void; onAutoload: () => void; onCommunity: () => void
  onApply: () => void | Promise<unknown>; onCancel: () => void
  hasUnsavedChanges?: boolean; onSave?: () => void | Promise<void>
  interactionLocked?: boolean
}

export function StudioShell(props: StudioShellProps) {
  const { t } = useTranslation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [applying, setApplying] = useState(false)
  const [saving, setSaving] = useState(false)
  const busy = applying || saving
  const unsaved = props.hasUnsavedChanges ?? props.hasPendingChanges
  const applyingRef = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const latest = useRef(props)
  latest.current = props
  const applyChanges = useCallback(async () => {
    const current = latest.current
    if (applyingRef.current || current.isCalibrating || current.interactionLocked || !current.hasPendingChanges) return
    applyingRef.current = true
    setApplying(true)
    try { await current.onApply() }
    catch (error) { console.error('Failed to apply workspace changes', error) }
    finally { applyingRef.current = false; setApplying(false) }
  }, [])
  const saveChanges = useCallback(async () => {
    const current = latest.current
    if (applyingRef.current || current.isCalibrating || current.interactionLocked || !current.onSave || !(current.hasUnsavedChanges ?? current.hasPendingChanges)) return
    applyingRef.current = true; setSaving(true)
    try { await current.onSave() }
    catch (error) { console.error('Failed to save profile', error) }
    finally { applyingRef.current = false; setSaving(false) }
  }, [])
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (latest.current.interactionLocked) return
      if (event.defaultPrevented || event.repeat) return
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      if (document.querySelector('dialog[open], .modal-overlay')) return
      if (document.querySelector('.config-source-window') && event.key.toLowerCase() !== 's') return
      if (event.key.toLowerCase() === 's') { event.preventDefault(); void saveChanges() }
      else if (event.key.toLowerCase() === 'k') {
        event.preventDefault(); setQuery(''); setSearchOpen(true)
      } else if (event.key === 'Enter' && latest.current.hasPendingChanges && !latest.current.isCalibrating) {
        event.preventDefault(); void applyChanges()
      }
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [applyChanges, saveChanges])
  useEffect(() => { if (searchOpen) dialog.current?.showModal() }, [searchOpen])

  const allCommands = [
    ...pages.map(page => ({ label: t(`studio.${page}`), icon: page, run: () => props.onNavigate(page) })),
    { label: t('studio.source'), icon: 'code' as const, run: props.onOpenSource },
    { label: t('studio.folder'), icon: 'folder' as const, run: props.onOpenFolder },
    { label: t('studio.autoload'), icon: 'profiles' as const, run: props.onAutoload },
  ]
  const commands = allCommands.filter(command => command.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const runCommand = (action: () => void) => { dialog.current?.close(); action() }
  const navButton = (page: StudioPage) => <button type="button" key={page} className={styles.navItem}
    disabled={props.interactionLocked}
    aria-label={t(`studio.${page}`)} title={t(`studio.${page}`)} aria-current={props.page === page ? 'page' : undefined} onClick={() => props.onNavigate(page)}>
    <StudioIcon name={page} /><span>{t(`studio.${page}`)}</span>
  </button>

  return <div className={styles.shell}>
    <aside className={styles.sidebar} data-capture-ignore="true">
      <div className={styles.brand}><span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>
        <span><strong>JSM Studio</strong><small>CONTROL WORKSPACE</small></span></div>
      <button type="button" className={styles.searchButton} disabled={props.interactionLocked} onClick={() => { setQuery(''); setSearchOpen(true) }}>
        <StudioIcon name="search" size={16} /><span>{t('studio.search')}</span><kbd>Ctrl K</kbd>
      </button>
      <nav aria-label={t('studio.workspace')} className={styles.navigation}>
        <div className={styles.navGroup}>{pages.slice(0, 3).map(navButton)}</div>
        <div className={styles.navLabel}>{t('studio.configure')}</div>
        <div className={styles.navGroup}>{pages.slice(3, 6).map(navButton)}</div>
        <div className={styles.navLabel}>{t('studio.library')}</div>
        <div className={styles.navGroup}>{pages.slice(6).map(navButton)}</div>
      </nav>
      <div className={styles.sidebarBottom}>
        <button className={styles.community} type="button" onClick={props.onCommunity}><StudioIcon name="help" size={16} />{t('studio.community')}<span>↗</span></button>
        <div className={styles.preferences}><LanguageSelect /><ThemeToggle compact /></div>
        <div className={styles.version}>JSM Studio <span>v{version}</span></div>
      </div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.toolbar} data-capture-ignore="true">
        <label className={styles.profileSelect}><StudioIcon name="profiles" size={18} /><span>{t('studio.profile')}</span>
          <select aria-label={t('studio.profile')} value={props.profile ?? ''} disabled={props.isCalibrating || busy || props.interactionLocked}
            onChange={event => { if (event.target.value) props.onSelectProfile(event.target.value) }}>
            <option value="" disabled>{t('studio.noProfile')}</option>
            {props.profiles.map(profile => <option key={profile} value={profile}>{profile}</option>)}
          </select>
          {props.hasPendingChanges && <span className={styles.dirtyDot} title={t('studio.pending')} />}
        </label>
        <div className={styles.toolbarActions}>
          <button type="button" className={`${styles.outputButton} ${props.mappingEnabled ? styles.outputEnabled : ''}`}
            aria-pressed={props.mappingEnabled} disabled={props.runtimeBusy || props.isCalibrating || busy}
            aria-label={t(props.mappingEnabled ? 'studio.pause' : 'studio.resume')} onClick={props.onToggleOutput}>
            <span className={styles.statusDot} />{t(props.mappingEnabled ? 'studio.outputOn' : 'studio.outputOff')}
          </button>
          <details className={styles.tools}>
            <summary aria-label={t('studio.tools')} title={t('studio.tools')}><StudioIcon name="more" /></summary>
            <div className={styles.toolsMenu}>{allCommands.filter(command => ['code', 'folder'].includes(command.icon) || command.label === t('studio.autoload')).map(command =>
              <button key={command.label} type="button" disabled={props.interactionLocked} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); command.run() }}>
                <StudioIcon name={command.icon} size={16} />{command.label}
              </button>)}</div>
          </details>
        </div>
      </header>
      <div className={styles.scrollArea}>
        <main className={styles.main} id="studio-workspace">
          <div className={styles.pageHeading}>
            <div><div className={styles.breadcrumb}>JSM Studio <span>/</span> {t(`studio.${props.page}`)}</div>
              <h1>{t(`studio.${props.page}`)}</h1><p>{t(`studio.${props.page}Desc`)}</p></div>
            {props.page !== 'settings' && <button type="button" className="secondary-btn" disabled={props.isCalibrating || props.runtimeBusy || busy} onClick={props.onCalibrate}>
              <StudioIcon name="gyro" size={17} />{props.isCalibrating ? t('studio.calibrating', { seconds: props.countdown ?? '—' }) : t('studio.calibrate')}
            </button>}
          </div>
          <WorkspaceActionsContext.Provider value={true}>{props.children}</WorkspaceActionsContext.Provider>
        </main>
      </div>
      <footer className={`${styles.footer} ${props.hasPendingChanges ? styles.footerPending : ''}`} data-capture-ignore="true">
        <div className={styles.editState} role="status"><span className={props.hasPendingChanges ? styles.dirtyDot : styles.savedIcon}>{!props.hasPendingChanges && <StudioIcon name="check" size={15} />}</span>
          <span><strong>{t(unsaved ? 'studio.unsaved' : props.hasPendingChanges ? 'studio.savedPending' : 'studio.saved')}</strong>
            <small>{unsaved ? t('studio.unsavedDesc') : props.hasPendingChanges ? t('studio.savedPendingDesc') : (props.statusMessage || t('studio.savedDesc'))}</small></span></div>
        <div className={styles.footerActions}>
          <span className={styles.connection}><span className={styles.statusDot} />{t(props.deviceCount ? 'studio.deviceCount' : 'studio.noDevice', { count: props.deviceCount })}</span>
          {unsaved && <button type="button" className="ghost-btn" onClick={props.onCancel} disabled={props.isCalibrating || busy || props.interactionLocked}>{t('studio.discard')}</button>}
          {props.onSave && <button type="button" className="secondary-btn" onClick={() => { void saveChanges() }} disabled={!unsaved || props.isCalibrating || busy || props.interactionLocked}>{t(saving ? 'studio.savingFile' : 'studio.saveFile')}<kbd>Ctrl S</kbd></button>}
          <button type="button" className="primary-btn" onClick={() => { void applyChanges() }} disabled={!props.hasPendingChanges || props.isCalibrating || busy || props.interactionLocked}>{t(applying ? 'studio.applying' : 'studio.apply')}<kbd>Ctrl ↵</kbd></button>
        </div>
      </footer>
    </div>
    {searchOpen && <dialog className={styles.palette} ref={dialog} aria-labelledby="studio-search-title" onClose={() => setSearchOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current?.close()
      } }} data-capture-ignore="true">
      <h2 className={styles.srOnly} id="studio-search-title">{t('studio.search')}</h2>
      <div className={styles.paletteHeader}><StudioIcon name="search" /><input autoFocus aria-label={t('studio.search')}
        placeholder={t('studio.search')} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter' && commands[0]) { event.preventDefault(); runCommand(commands[0].run) }
          if (event.key === 'ArrowDown') { event.preventDefault(); dialog.current?.querySelector<HTMLButtonElement>('[data-command]')?.focus() }
        }} /><button type="button" className={styles.closeButton} aria-label={t('studio.close')} onClick={() => dialog.current?.close()}><StudioIcon name="close" size={18} /></button></div>
      <p className={styles.paletteHint}>{t('studio.searchHint')}</p>
      <div className={styles.commandList}>{commands.map(command => <button data-command type="button" key={command.label} onClick={() => runCommand(command.run)}>
        <StudioIcon name={command.icon} size={18} /><span>{command.label}</span><StudioIcon name="arrow" size={16} /></button>)}
        {!commands.length && <p>{t('studio.noResults')}</p>}</div>
    </dialog>}
  </div>
}
