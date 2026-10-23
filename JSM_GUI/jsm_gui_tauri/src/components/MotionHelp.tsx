import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import styles from './MotionControls.module.css'

export function MotionHelp({ title, topic }: { title: string; topic: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const bodyId = useId()
  useEffect(() => {
    if (open) dialog.current?.showModal()
  }, [open])

  return <>
    <button type="button" className={styles.helpButton} aria-label={t('motion.help', { name: title })}
      aria-haspopup="dialog" onClick={event => { event.preventDefault(); setOpen(true) }}>?</button>
    {open && createPortal(
      <dialog ref={dialog} className={styles.helpDialog} aria-labelledby={titleId} aria-describedby={bodyId}
        onClose={() => setOpen(false)} onClick={event => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect()
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current?.close()
          }
        }}>
        <h2 id={titleId}>{title}</h2>
        <p id={bodyId}>{t(`motion.helpText.${topic}`)}</p>
        <button type="button" className="secondary-btn" autoFocus onClick={() => dialog.current?.close()}>{t('motion.close')}</button>
      </dialog>, document.body)}
  </>
}

export function MotionLabel({ title, topic }: { title: string; topic: string }) {
  return <span className={styles.label}>{title}<MotionHelp title={title} topic={topic} /></span>
}

export function MotionSection({ title, description, children, active, help }: {
  title: string; description: string; children: ReactNode; active?: boolean; help?: string
}) {
  const { t } = useTranslation()
  return <section className={styles.group}>
    <div className={styles.groupHeading}>
      <h3>{title}{help && <MotionHelp title={title} topic={help} />}</h3>
      {active !== undefined && <span className={`${styles.status} ${active ? styles.active : ''}`}>{t(active ? 'motion.active' : 'motion.inactive')}</span>}
    </div>
    <p className={styles.description}>{description}</p>
    {children}
  </section>
}
