import { StudioIcon } from './StudioIcon'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from './Card'
import styles from './ProfileManager.module.css'

type ProfileManagerProps = {
  currentProfileName: string | null
  hasPendingChanges: boolean
  isCalibrating: boolean
  profileApplied: boolean
  onImportProfile?: (fileName: string, content: string) => void
  libraryProfiles: string[]
  libraryLoading?: boolean
  editedProfileNames: Record<string, string>
  onProfileNameChange: (originalName: string, value: string) => void
  onRenameProfile: (originalName: string) => void
  onDeleteProfile: (name: string) => void
  onAddProfile: () => void
  onLoadLibraryProfile: (name: string) => void
  lockMessage?: string
  onCopyActiveProfile?: () => void
}

export function ProfileManager({
  currentProfileName,
  hasPendingChanges,
  isCalibrating,
  profileApplied,
  onImportProfile,
  libraryProfiles,
  libraryLoading = false,
  editedProfileNames,
  onProfileNameChange,
  onRenameProfile,
  onDeleteProfile,
  onAddProfile,
  onLoadLibraryProfile,
  lockMessage,
  onCopyActiveProfile,
}: ProfileManagerProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const filteredProfiles = libraryProfiles.filter(name => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const [confirmingProfile, setConfirmingProfile] = useState<string | null>(null)

  useEffect(() => {
    setConfirmingProfile(null)
    setEditingProfile(null)
  }, [libraryProfiles])

  return (
    <Card className={`${styles.profileCard} profile-card`} lockable locked={isCalibrating} lockMessage={lockMessage}>
      {hasPendingChanges && (
        <div className={styles.profileFlags}>
          <span className={styles.profileWarning}>{t('profiles.unsavedChangesWarning')}</span>
        </div>
      )}

      <section className={styles.profileLibrary}>
        <div className={styles.profileLibraryHeader}>
          <div>
            <h3>{t('profiles.libraryTitle')}</h3>
            <p>{t('profiles.libraryDescription')}</p>
          </div>
          {libraryLoading && <span className={styles.profileLibraryLoading}>{t('common.refreshing')}</span>}
        </div>
        <div className={styles.profileLibraryActionsRow}>
          <div className="profile-import">
            <input
              type="file"
              accept=".txt,.cfg,.ini,*/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (file && onImportProfile) {
                  const text = await file.text()
                  onImportProfile(file.name, text)
                }
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
            />
            {onImportProfile && (
              <button className="secondary-btn" onClick={() => fileInputRef.current?.click()}>
                {t('profiles.addExistingConfig')}
              </button>
            )}
          </div>
          {onCopyActiveProfile && (
            <button className="secondary-btn" onClick={onCopyActiveProfile}>
              {t('profiles.copyActiveProfile')}
            </button>
          )}
          <button className="primary-btn" onClick={onAddProfile}>
            {t('profiles.addProfile')}
          </button>
        </div>
        <label className={styles.profileSearch}><StudioIcon name="search" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} aria-label={t('studio.searchProfiles')} placeholder={t('studio.searchProfiles')} /><span>{filteredProfiles.length}</span></label>
        {libraryProfiles.length === 0 ? (
          <p className={styles.profileLibraryEmpty}>{t('profiles.empty')}</p>
        ) : (
          <ul className={styles.profileLibraryList}>
            {filteredProfiles.map(profileName => (
              <li
                key={profileName}
                className={`${styles.profileLibraryItem} ${currentProfileName === profileName ? styles.profileLibraryItemActive : ''}`}
              >
                <div className={styles.profileLibraryName}>
                  <span className={styles.profileIcon}><StudioIcon name="profiles" size={22} /></span>
                  {editingProfile === profileName ? <input autoFocus aria-label={t('studio.rename')}
                    type="text" maxLength={80} value={editedProfileNames[profileName] ?? profileName}
                    onChange={event => onProfileNameChange(profileName, event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Escape') { onProfileNameChange(profileName, profileName); setEditingProfile(null) }
                      if (event.key === 'Enter' && (editedProfileNames[profileName] ?? profileName).trim()) onRenameProfile(profileName)
                    }} /> : <strong className={styles.profileNameText}>{profileName}</strong>}
                  {currentProfileName === profileName && <span className={styles.profileLibraryActiveBadge}>{t('profiles.active')}</span>}
                </div>
                <div className={styles.profileLibraryButtons}>
                  {editingProfile === profileName ? <>
                    <button type="button" className="primary-btn" onClick={() => onRenameProfile(profileName)}
                      disabled={!(editedProfileNames[profileName] ?? profileName).trim() || (editedProfileNames[profileName] ?? profileName).trim() === profileName}>{t('common.save')}</button>
                    <button type="button" className="ghost-btn" onClick={() => { onProfileNameChange(profileName, profileName); setEditingProfile(null) }}>{t('common.cancel')}</button>
                  </> : <button type="button" className="ghost-btn" onClick={() => setEditingProfile(profileName)}>{t('studio.rename')}</button>}
                  {confirmingProfile === profileName ? (
                    <>
                      <button className="danger-btn" onClick={() => onDeleteProfile(profileName)}>
                        {t('profiles.confirmDelete')}
                      </button>
                      <button className="ghost-btn" onClick={() => setConfirmingProfile(null)}>
                        {t('common.cancel')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="secondary-btn" onClick={() => onLoadLibraryProfile(profileName)}
                        disabled={currentProfileName === profileName}>
                        {t('studio.loadAndApply')}
                      </button>
                      <button className="danger-btn" onClick={() => setConfirmingProfile(profileName)}>
                        {t('common.delete')}
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

        )}

        {libraryProfiles.length > 0 && !filteredProfiles.length && <p className={styles.profileLibraryEmpty}>{t('studio.noResults')}</p>}
      </section>

      {!profileApplied && <span className={styles.profileNotApplied}>{t('profiles.notRunningYet')}</span>}
    </Card>
  )
}
