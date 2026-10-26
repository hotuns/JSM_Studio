import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createProfileTemplate, type ProfileTemplate } from '../utils/profileTemplates'
import styles from './CreateProfileDialog.module.css'

export function CreateProfileDialog({ initialTemplate = 'empty', initialScheme = 'XBOX', hasUnsavedChanges, onClose, onCreate }: {
  initialTemplate?: ProfileTemplate; initialScheme?: 'XBOX' | 'DS4'; hasUnsavedChanges: boolean
  onClose: () => void; onCreate: (name: string, content: string, load: boolean) => Promise<void>
}) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const submitting = useRef(false)
  const [template, setTemplate] = useState(initialTemplate)
  const [scheme, setScheme] = useState(initialScheme)
  const [name, setName] = useState(t(`profileCreation.${initialTemplate}Name`))
  const [customName, setCustomName] = useState(false)
  const [load, setLoad] = useState(!hasUnsavedChanges)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])
  const selectTemplate = (next: ProfileTemplate) => {
    setTemplate(next)
    if (!customName) setName(t(`profileCreation.${next}Name`))
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="create-profile-title" onCancel={event => { event.preventDefault(); if (!submitting.current) onClose() }}>
    <form onSubmit={async event => {
      event.preventDefault()
      if (submitting.current || !name.trim()) return
      submitting.current = true; setBusy(true); setError('')
      try { await onCreate(name.trim(), createProfileTemplate(template, scheme), load && !hasUnsavedChanges); onClose() }
      catch (failure) { setError(String(failure instanceof Error ? failure.message : failure)) }
      finally { submitting.current = false; setBusy(false) }
    }}>
      <h2 id="create-profile-title">{t('profileCreation.title')}</h2>
      <p>{t('profileCreation.description')}</p>
      <div className={styles.body}><fieldset disabled={busy} className={styles.templates}><legend>{t('profileCreation.template')}</legend>
        {(['cursor', 'native', 'empty'] as const).map(value => <label key={value} className={styles.template}>
          <input type="radio" name="profile-template" checked={template === value} onChange={() => selectTemplate(value)} />
          <span><strong>{t(`profileCreation.${value}`)}</strong><small>{t(`profileCreation.${value}Hint`)}</small></span>
        </label>)}
      </fieldset>
      {template === 'native' && <><label className={styles.field}>{t('profileCreation.scheme')}<select value={scheme} disabled={busy} onChange={e => setScheme(e.target.value as 'XBOX' | 'DS4')}><option value="XBOX">Xbox</option><option value="DS4">DualShock 4</option></select></label><p className={styles.notice}>{t('profileCreation.driverHint')}</p></>}
      <label className={styles.field}>{t('profileCreation.name')}<input autoFocus maxLength={80} value={name} disabled={busy} onChange={e => { setName(e.target.value); setCustomName(true) }} /></label>
      <label className={styles.check}><input type="checkbox" checked={load && !hasUnsavedChanges} disabled={busy || hasUnsavedChanges} onChange={e => setLoad(e.target.checked)} />{t('profileCreation.load')}</label>
      <p>{t(hasUnsavedChanges ? 'profileCreation.unsavedHint' : 'profileCreation.loadHint')}</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      </div><div className={styles.actions}><button type="button" className="secondary-btn" disabled={busy} onClick={onClose}>{t('common.cancel')}</button><button type="submit" className="primary-btn" disabled={busy || !name.trim()}>{t(busy ? 'profileCreation.creating' : 'profileCreation.create')}</button></div>
    </form>
  </dialog>
}
