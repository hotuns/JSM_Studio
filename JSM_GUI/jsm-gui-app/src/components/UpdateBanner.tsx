import { useEffect, useState } from 'react'
import styles from './Misc.module.css'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading' }
  | { phase: 'ready' }

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' })
  const [dismissed, setDismissed] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const removeAvailable = window.electronAPI?.onUpdateAvailable?.((version) => {
      setUpdate({ phase: 'available', version })
      setDismissed(false)
    })
    const removeProgress = window.electronAPI?.onUpdateDownloadProgress?.((percent) => {
      setProgress(percent)
    })
    const removeDownloaded = window.electronAPI?.onUpdateDownloaded?.(() => {
      setUpdate({ phase: 'ready' })
      setDismissed(false)
    })
    return () => {
      removeAvailable?.()
      removeProgress?.()
      removeDownloaded?.()
    }
  }, [])

  if (update.phase === 'idle' || dismissed) return null

  return (
    <div className={styles.updateBanner}>
      {update.phase === 'available' && (
        <>
          <span>Update v{update.version} available.</span>
          <div className={styles.updateBannerActions}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setUpdate({ phase: 'downloading' })
                window.electronAPI?.downloadUpdate?.()
              }}
            >
              Download Now
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
      {update.phase === 'downloading' && (
        <span>Downloading update… {progress}%</span>
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
