import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSoftwareUpdate } from '../hooks/useSoftwareUpdate'
import styles from './Misc.module.css'

export function UpdateBanner({ onSettings }: { onSettings: () => void }) {
  const { t } = useTranslation()
  const update = useSoftwareUpdate(true)
  const [dismissed, setDismissed] = useState<string | null>(null)
  if (!['available', 'downloading', 'ready', 'installing'].includes(update.phase) || dismissed === update.version) return null
  return <div className={styles.updateBanner} role="status">
    <span>{t(update.phase === 'available' ? 'update.available' : update.phase === 'ready' || update.phase === 'installing' ? 'update.ready' : 'update.downloading', { version: update.version, percent: update.percent })}</span>
    <div className={styles.updateBannerActions}><button type="button" className="secondary-btn" onClick={onSettings}>{t('studio.settings')}</button>
      <button type="button" className="ghost-btn" onClick={() => setDismissed(update.version)}>{t('common.later')}</button></div>
  </div>
}
