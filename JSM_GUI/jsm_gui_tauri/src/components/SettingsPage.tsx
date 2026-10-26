import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { version } from '../../package.json'
import { desktopBridge, type BackendChoice, type ComponentsStatus } from '../platform/desktopBridge'
import { useSoftwareUpdate } from '../hooks/useSoftwareUpdate'
import type { VirtualControllerType, VirtualControllerWarning } from '../utils/virtualController'
import { LanguageSelect } from './LanguageSelect'
import { ThemeToggle } from './ThemeToggle'
import { WEBSITE_URL } from '../community/catalog'
import styles from './SettingsPage.module.css'
import driverManifest from '../../src-tauri/drivers/manifest.json'

type Props = { virtualType: VirtualControllerType; warnings: VirtualControllerWarning[]; onVirtualChange: (value: VirtualControllerType) => void; onMappings: () => void; onDevices: () => void; onFolder: () => void; onCreateVirtual: (type: 'XBOX' | 'DS4') => void; onLibrary: () => void; disabled?: boolean }
const LINKS = { hidhide: 'https://github.com/nefarius/HidHide/releases/latest', vigem: 'https://github.com/nefarius/ViGEmBus/releases/latest', hideHelp: 'https://docs.nefarius.at/projects/HidHide/Simple-Setup-Guide/', vigemHelp: 'https://docs.nefarius.at/projects/ViGEm/How-to-Install/', releases: 'https://github.com/hotuns/JSM_Studio/releases', feedback: 'https://github.com/hotuns/JSM_Studio/issues' }
export function SettingsPage(props: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ComponentsStatus | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [selected, setSelected] = useState(''), [xinput, setXinput] = useState(false)
  const [nativeOffer, setNativeOffer] = useState<'XBOX' | 'DS4' | null>(null)
  const [installingDriver, setInstallingDriver] = useState<'hidhide' | 'vigem' | null>(null)
  const [backend, setBackend] = useState<BackendChoice | null>(null), [backendDraft, setBackendDraft] = useState<BackendChoice>('SDL')
  const lock = useRef(false), mounted = useRef(true)
  const update = useSoftwareUpdate()
  const s = (key: string, vars?: Record<string, unknown>) => t(`settings.${key}`, vars)
  const refresh = useCallback(async () => {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const [result, choice] = await Promise.all([desktopBridge.getComponentsStatus(), desktopBridge.getBackendChoice()])
      if (mounted.current) { setStatus(result); setBackend(choice); if (choice) setBackendDraft(choice); setSelected(prev => result.devices.some(d => d.id === prev) ? prev : ''); }
    } catch (e) { if (mounted.current) setError(String(e instanceof Error ? e.message : e)) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }, [])
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false } }, [refresh])
  const operate = async (action: 'hide' | 'show' | 'allow' | 'restore') => {
    if (lock.current || props.disabled) return
    lock.current = true; setBusy(true); setError(''); setMessage('')
    try { const result = await desktopBridge.manageHidHide(action, selected || undefined, xinput); if (mounted.current) { setStatus(result); setMessage('saved') } }
    catch (e) { if (mounted.current) setError(String(e instanceof Error ? e.message : e)) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  const changeBackend = async () => {
    if (lock.current || props.disabled || backend === backendDraft) return
    lock.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const result = await desktopBridge.setBackendChoice(backendDraft)
      if (!result?.success) throw new Error('Could not change input backend')
      if (mounted.current) { setBackend(result.backend); setMessage('backendChanged') }
      const next = await desktopBridge.getComponentsStatus(); if (mounted.current) setStatus(next)
    } catch (e) { if (mounted.current) setError(String(e instanceof Error ? e.message : e)) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  const createVirtual = (type: 'XBOX' | 'DS4') => {
    if (lock.current || props.disabled) return
    setNativeOffer(null)
    props.onCreateVirtual(type)
  }
  const open = async (url: string) => { try { await desktopBridge.openExternal(url) } catch (e) { setError(String(e)) } }
  const installDriver = async (kind: 'hidhide' | 'vigem') => {
    if (lock.current || props.disabled || status?.[kind].status !== 'missing') return
    lock.current = true; setBusy(true); setInstallingDriver(kind); setError(''); setMessage('')
    try {
      const result = await desktopBridge.installDriver(kind)
      if (mounted.current) setMessage(result.cancelled ? 'installerCancelled' : result.rebootRequired ? 'installerRestart' : 'installerFinished')
    } catch (e) { if (mounted.current) setError(String(e instanceof Error ? e.message : e)) }
    finally {
      if (mounted.current) {
        try { const next = await desktopBridge.getComponentsStatus(); if (mounted.current) setStatus(next) }
        catch (e) { if (mounted.current) setError(previous => previous || String(e instanceof Error ? e.message : e)) }
      }
      lock.current = false; if (mounted.current) { setBusy(false); setInstallingDriver(null) }
    }
  }
  const tool = async (kind: 'hidhide' | 'gamepads') => { try { await desktopBridge.openComponentTool(kind) } catch (e) { setError(String(e)) } }
  const device = status?.devices.find(d => d.id === selected)
  const blocked = busy || props.disabled
  const controls = status?.controlAvailable && !status.inverse && status.supported
  const updateText = update.phase === 'available' ? 'available' : update.phase === 'error' ? 'updateError' : update.phase === 'unsupported' ? 'unsupportedUpdate' : update.phase
  return <div className={styles.page} data-capture-ignore="true">
    <section className={styles.section}>
      <div className={styles.heading}><div><h2>{s('components')}</h2><p>{s('componentsHint')}</p></div><button className="secondary-btn" disabled={busy} onClick={() => { void refresh() }}>{s(busy ? 'detecting' : 'refresh')}</button></div>
      <div className={styles.drivers}>{(['hidhide', 'vigem'] as const).map(kind => <article className={styles.driver} key={kind}>
        <div className={styles.heading}><h3>{kind === 'hidhide' ? 'HidHide' : 'ViGEmBus'}</h3><span className={styles.badge} data-ready={status?.[kind].status === 'running'}>{status ? s(status[kind].status) : s(busy ? 'detecting' : 'unknown')}</span></div>
        <p>{s(kind === 'hidhide' ? 'hidhideDesc' : 'vigemDesc')}</p>
        {status?.[kind].error && <p role="alert" className={styles.error}>{status[kind].error}</p>}
        <small>{s('bundledVersion', { version: driverManifest.installers[kind].version })}</small>
        <div className={styles.actions}><button className="primary-btn" disabled={blocked || !status?.supported || status[kind].status !== 'missing'} onClick={() => { void installDriver(kind) }}>{s(installingDriver === kind ? 'installingDriver' : status && ['running', 'stopped'].includes(status[kind].status) ? 'driverInstalled' : 'installDriver')}</button><button className="secondary-btn" onClick={() => { void open(LINKS[kind]) }}>{s('download')} ↗</button><button className="ghost-btn" onClick={() => { void open(kind === 'hidhide' ? LINKS.hideHelp : LINKS.vigemHelp) }}>{s('help')} ↗</button></div>
        {kind === 'vigem' && <small>{s('vigemLegacy')}</small>}
      </article>)}</div><p><small>{s('installedHint')}</small></p>
    </section>
    {error && <div role="alert" className={styles.error}>{s('error', { message: error })}</div>}
    {message && <p role="status" className={styles.success}>{s(message)}</p>}
    <section className={styles.section}>
      <div className={styles.heading}><div><h2>{s('hiding')}</h2><p>{s('hidingHint')}</p></div>{status?.cliAvailable && <button className="secondary-btn" disabled={busy} onClick={() => { void tool('hidhide') }}>{s('officialTool')}</button>}</div>
      {status?.error && <div role="alert" className={styles.error}>{status.error}<p>{s('busyHint')}</p></div>}
      {status && !status.cliAvailable && <p className={styles.notice}>{s('cliMissing')}</p>}
      {status?.inverse && <p className={styles.notice}>{s('inverse')}</p>}
      {status?.controlAvailable && <>
        <div className={styles.statusLine}><span className={styles.badge} data-ready={status.cloakEnabled}>{s(status.cloakEnabled ? 'enabled' : 'disabled')}</span><span className={styles.badge} data-ready={status.engineAllowed}>{s(status.engineAllowed ? 'engineAllowed' : 'engineDenied')}</span><small>{s('count', { count: status.hiddenCount, managed: status.managedCount })}</small></div>
        <details><summary>JoyShockMapper.exe</summary><code className={styles.path}>{status.enginePath}</code></details>
        <div className={styles.actions}><button className="secondary-btn" disabled={blocked || !controls} onClick={() => { void operate('allow') }}>{s('allow')}</button><button className="secondary-btn" disabled={blocked || !status.managedCount} onClick={() => { void operate('restore') }}>{s('restore')}</button></div>
        <label className={styles.field}>{s('selectDevice')}<select aria-label={s('selectDevice')} disabled={blocked} value={selected} onChange={e => { setSelected(e.target.value); setXinput(false) }}><option value="">{s('choose')}</option>{status.devices.map(d => <option key={d.id} value={d.id}>{d.name || d.description} · {d.id.split('\\')[1]} · {s(d.listed ? 'hidden' : 'visible')}{d.managed ? ` · ${s('owned')}` : d.listed ? ` · ${s('external')}` : ''}</option>)}</select></label>
        {!status.devices.length && <p>{s('noDevices')}</p>}
        {device && <><code className={styles.path}>{device.id}</code>{device.xinputAvailable && <><label className={styles.check}><input type="checkbox" checked={xinput} disabled={blocked || !controls} onChange={e => setXinput(e.target.checked)} />{s('xinput')}</label><p><small>{s('xinputHint', { count: device.sharedFunctions || s('unknown') })}</small></p></>}
          {!status.cloakEnabled && status.hiddenCount > 0 && <p className={styles.notice}>{s('globalWarning', { count: status.hiddenCount })}</p>}
          <div className={styles.actions}><button className="primary-btn" disabled={blocked || !controls} onClick={() => { void operate('hide') }}>{s('hide')}</button><button className="secondary-btn" disabled={blocked || !device.managed} onClick={() => { void operate('show') }}>{s('show')}</button></div>
        </>}
      </>}
      <p><small>{s('existing')}</small></p>
    </section>
    <section className={styles.section}>
      <div className={styles.heading}><div><h2>{s('virtual')}</h2><p>{s('virtualHint')}</p></div></div>
      <label className={styles.field}>{s('output')}<select aria-label={s('output')} value={nativeOffer ?? props.virtualType} disabled={props.disabled} onChange={e => { const value = e.target.value as VirtualControllerType; if (value === 'NONE') { setNativeOffer(null); props.onVirtualChange(value) } else setNativeOffer(value) }}><option value="NONE">{s('none')}</option><option value="XBOX" disabled={status?.vigem.status !== 'running'}>{s('xbox')}</option><option value="DS4" disabled={status?.vigem.status !== 'running'}>{s('ds4')}</option></select></label>
      {nativeOffer && <div className={styles.notice}><strong>{t('profileCreation.offer')}</strong><p>{t('profileCreation.offerHint')}</p><div className={styles.actions}>
        <button className="primary-btn" disabled={blocked} onClick={() => createVirtual(nativeOffer)}>{t('profileCreation.createNative')}</button>
        <button className="secondary-btn" disabled={blocked} onClick={() => { props.onVirtualChange(nativeOffer); setNativeOffer(null) }}>{t('profileCreation.outputOnly')}</button>
        <button className="secondary-btn" disabled={blocked} onClick={() => setNativeOffer(null)}>{t('common.cancel')}</button>
      </div></div>}
      {status?.vigem.status !== 'running' && <p className={styles.notice}>{s('needVigem')}</p>}
      {props.warnings.map((warning, i) => <p className={styles.notice} key={i}>{warning.kind === 'modeRequired' ? t('keymap.virtualControllerWarningModeRequired') : t('keymap.virtualControllerWarningSchemeMismatch', { detected: t(`keymap.virtualControllerType_${warning.detectedType}`), current: t(`keymap.virtualControllerType_${props.virtualType}`) })}</p>)}
      <p>{s('axisTip')}</p><div className={styles.actions}><button className="secondary-btn" onClick={props.onMappings}>{s('configure')}</button><button className="secondary-btn" onClick={() => { void tool('gamepads') }}>{s('testGamepad')}</button></div>
      <h3>{s('starter')}</h3><p>{s('starterHint')}</p><div className={styles.actions}>{(['XBOX', 'DS4'] as const).map(type => <button key={type} className="secondary-btn" disabled={blocked || status?.vigem.status !== 'running'} onClick={() => { void createVirtual(type) }}>{s(type === 'XBOX' ? 'newXbox' : 'newDs4')}</button>)}</div>

    </section>
    <section className={styles.section}>
      <div className={styles.heading}><div><h2>{s('updates')}</h2><p>{s('version', { version })}</p></div><button className="secondary-btn" disabled={update.busy || update.phase === 'ready'} onClick={() => { void update.check() }}>{s('check')}</button></div>
      <div className={styles.updateStatus} role="status">{s(updateText, { version: update.version, percent: update.percent })}</div>
      {update.error && <p className={styles.error} role="alert">{update.error}</p>}
      {update.phase === 'downloading' && <progress className={styles.progress} aria-label={s('updates')} max={100} value={update.percent} />}
      <div className={styles.actions}>{update.version && ['available', 'error'].includes(update.phase) && <button className="primary-btn" disabled={update.busy} onClick={() => { void update.download() }}>{s('getUpdate')}</button>}{update.phase === 'ready' && <button className="primary-btn" disabled={blocked} onClick={() => { void update.install() }}>{s('install')}</button>}<button className="secondary-btn" onClick={() => { void open(LINKS.releases) }}>{s('release')} ↗</button></div><p><small>{s('updateHint')}</small></p>
    </section>
    <section className={styles.section}>
      <div className={styles.heading}><h2>{s('runtime')}</h2></div><div className={styles.runtimeGrid}><div><label className={styles.field}>{s('backend')}<select value={backendDraft} disabled={blocked || !backend} onChange={e => setBackendDraft(e.target.value as BackendChoice)}><option value="SDL">SDL</option><option value="legacy">Legacy</option></select></label><p><small>{s('backendHint')}</small></p><button className="secondary-btn" disabled={blocked || !backend || backend === backendDraft} onClick={() => { void changeBackend() }}>{s('backendApply')}</button></div><div>
        <div className={styles.preferences}><div>{s('language')}<LanguageSelect showIcon={false} /></div><div>{s('theme')}<ThemeToggle compact /></div></div>
        <div className={styles.actions}><button className="secondary-btn" onClick={props.onFolder}>{s('folder')}</button><button className="secondary-btn" onClick={props.onDevices}>{s('devices')}</button><button className="secondary-btn" onClick={() => { void open(WEBSITE_URL) }}>{s('website')} ↗</button><button className="secondary-btn" onClick={() => { void open(LINKS.feedback) }}>{s('feedback')} ↗</button></div>
      </div></div>
    </section>
  </div>
}
