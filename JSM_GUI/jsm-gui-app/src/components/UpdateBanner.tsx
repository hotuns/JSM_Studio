import { useEffect, useState } from 'react'
import styles from './Misc.module.css'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'downloading'; version: string }
  | { phase: 'ready' }

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const removeAvailable = window.electronAPI?.onUpdateAvailable?.((version) => {
      setUpdate({ phase: 'downloading', version })
      setDismissed(false)
    })
    const removeDownloaded = window.electronAPI?.onUpdateDownloaded?.(() => {
      setUpdate({ phase: 'ready' })
      setDismissed(false)
    })
    return () => {
      removeAvailable?.()
      removeDownloaded?.()
    }
  }, [])

  if (update.phase === 'idle' || dismissed) return null

  return (
    <div className={styles.updateBanner}>
      {update.phase === 'downloading' && (
        <span>Update v{update.version} available — downloading in the background…</span>
      )}
      {update.phase === 'ready' && (
        <>
          <span>Update ready to install.</span>
          <div className={styles.updateBannerActions}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => window.electronAPI?.installUpdate?.()}
            >
              Restart Now
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setDismissed(true)}
            >
              Later
            </button>
          </div>
        </>
      )}
    </div>
  )
}
