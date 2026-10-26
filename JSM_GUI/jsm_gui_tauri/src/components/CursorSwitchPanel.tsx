import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { desktopBridge, type CursorSwitchState, type CursorSwitchSettings } from '../platform/desktopBridge'
import { CURSOR_PROFILE_TEXT } from '../utils/cursorProfile'
import { showToast } from '../utils/toast'
import styles from './CursorSwitchPanel.module.css'

export function CursorSwitchPanel({ profiles, onRefresh }: { profiles: string[]; onRefresh?: () => Promise<unknown> }) {
  const { t } = useTranslation()
  const [snapshot, setSnapshot] = useState<CursorSwitchState | null>(null)
  const [draft, setDraft] = useState<CursorSwitchSettings>({ enabled: false, profileName: '', hiddenProfileName: '' })
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    let disposed = false, pending = false
    const refresh = async (initial = false) => {
      if (pending) return
      pending = true
      try {
        const result = await desktopBridge.getCursorSwitchState()
        if (!disposed) { setSnapshot(result); if (initial) setDraft({ ...result.settings, hiddenProfileName: result.settings.hiddenProfileName ?? (result.settings.profileName ? '__restore_previous__' : '') }) }
      } catch (error) { if (!disposed) setError(String(error)) }
      finally { pending = false }
    }
    void refresh(true)
    const timer = window.setInterval(() => void refresh(), 1000)
    return () => { disposed = true; alive.current = false; window.clearInterval(timer) }
  }, [])
  const missing = [draft.profileName, draft.hiddenProfileName].some(name => Boolean(name) && name !== '__restore_previous__' && !profiles.includes(name))
  const dirty = snapshot && (draft.enabled !== snapshot.settings.enabled || draft.profileName !== snapshot.settings.profileName || draft.hiddenProfileName !== snapshot.settings.hiddenProfileName)
  return <section className={styles.panel} aria-labelledby="cursor-switch-title">
    <div className={styles.heading}><div><h4 id="cursor-switch-title">{t('cursorSwitch.title')}</h4><p>{t('cursorSwitch.description')}</p></div>
      <label className={styles.toggle}><input type="checkbox" aria-label={t('cursorSwitch.enable')} checked={draft.enabled} disabled={busy || !snapshot?.supported} onChange={e => setDraft(old => ({ ...old, enabled: e.target.checked }))} />{t('cursorSwitch.enable')}</label>
    </div>
    <div className={styles.controls}>
      {(['profileName', 'hiddenProfileName'] as const).map(field => {
        const label = t(field === 'profileName' ? 'cursorSwitch.profile' : 'cursorSwitch.hiddenProfile')
        const value = draft[field]
        const absent = Boolean(value) && value !== '__restore_previous__' && !profiles.includes(value)
        return <label key={field}>{label}<select aria-label={label} value={value} disabled={busy || !snapshot?.supported} onChange={e => setDraft(old => ({ ...old, [field]: e.target.value }))}>
          <option value="">{t('cursorSwitch.select')}</option>
          {field === 'hiddenProfileName' && <option value="__restore_previous__">{t('cursorSwitch.restorePrevious')}</option>}
          {absent && <option value={value}>{value} ({t('cursorSwitch.missing')})</option>}
          {profiles.map(name => <option key={name}>{name}</option>)}
        </select></label>
      })}
    </div>
    <div className={styles.controls}>
      {onRefresh && <button type="button" className="secondary-btn" disabled={busy || !snapshot?.supported} onClick={async () => {
        setBusy(true); setError('')
        try { const saved = await desktopBridge.createSavedProfile(t('cursorSwitch.presetName'), CURSOR_PROFILE_TEXT); if (!saved?.name) throw new Error(t('cursorSwitch.failed')); await onRefresh(); if (alive.current) setDraft(old => ({ ...old, profileName: saved.name })) }
        catch (error) { if (alive.current) setError(String(error)) }
        finally { if (alive.current) setBusy(false) }
      }}>{t('cursorSwitch.create')}</button>}
      <button type="button" className="primary-btn" disabled={busy || !dirty || !snapshot?.supported || draft.enabled && missing} onClick={async () => {
        setBusy(true); setError('')
        try { const result = await desktopBridge.saveCursorSwitchSettings(draft); if (alive.current) { setSnapshot(result); setDraft(result.settings); showToast(t('cursorSwitch.saved')) } }
        catch (error) { if (alive.current) setError(String(error)) }
        finally { if (alive.current) setBusy(false) }
      }}>{t('cursorSwitch.save')}</button>
    </div>
    <div className={styles.status} role="status"><span>{t('cursorSwitch.detected')}: {t(snapshot?.cursorVisible === true ? 'cursorSwitch.visible' : snapshot?.cursorVisible === false ? 'cursorSwitch.hidden' : 'cursorSwitch.unknown')}</span><span>{t(snapshot?.overrideActive ? 'cursorSwitch.active' : 'cursorSwitch.normal')}{snapshot?.overrideActive && snapshot.activeProfile ? `：${snapshot.activeProfile}` : ''}</span>{snapshot?.overrideActive && snapshot.returnProfile && <span>{t('cursorSwitch.restore')}: {snapshot.returnProfile}</span>}</div>
    {missing && <p className={styles.error}>{t('cursorSwitch.missingHelp')}</p>}
    {(error || snapshot?.lastError) && <p className={styles.error} role="alert">{error || snapshot?.lastError}</p>}
    {snapshot && !snapshot.supported && <p className={styles.error}>{t('cursorSwitch.unsupported')}</p>}
    <p className={styles.hint}>{t('cursorSwitch.limit')}</p><p className={styles.hint}>{t('cursorSwitch.presetHint')}</p>
  </section>
}
