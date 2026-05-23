import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { desktopBridge, type AutoloadRule } from '../platform/desktopBridge'
import { showToast } from '../utils/toast'
import styles from './AutoloadManager.module.css'

type AutoloadManagerProps = {
  libraryProfiles: string[]
  autoloadEnabled: boolean
  runtimeBusy: boolean
  onAutoloadEnabledChange: (enabled: boolean) => Promise<void> | void
  onClose: () => void
}

export function AutoloadManager({
  libraryProfiles,
  autoloadEnabled,
  runtimeBusy,
  onAutoloadEnabledChange,
  onClose,
}: AutoloadManagerProps) {
  const { t } = useTranslation()
  const [rules, setRules] = useState<AutoloadRule[]>([])
  const [loading, setLoading] = useState(true)
  const [busyRule, setBusyRule] = useState<string | null>(null)
  const [processName, setProcessName] = useState('')
  const [profileName, setProfileName] = useState('')
  const [selectedProfiles, setSelectedProfiles] = useState<Record<string, string>>({})

  const defaultProfile = libraryProfiles[0] ?? ''

  useEffect(() => {
    if (!profileName && defaultProfile) {
      setProfileName(defaultProfile)
    }
  }, [defaultProfile, profileName])

  const refreshRules = useCallback(async () => {
    setLoading(true)
    try {
      const nextRules = await desktopBridge.listAutoloadRules()
      setRules(nextRules)
      setSelectedProfiles(prev => {
        const next = { ...prev }
        nextRules.forEach(rule => {
          if (rule.kind === 'profile') {
            next[rule.processName] = rule.profileName ?? defaultProfile
          }
        })
        return next
      })
    } catch (error) {
      console.error('Failed to load AutoLoad rules', error)
      showToast(t('messages.autoloadRuleFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [defaultProfile, t])

  useEffect(() => {
    void refreshRules()
  }, [refreshRules])

  const sortedProfiles = useMemo(
    () => [...libraryProfiles].sort((left, right) => left.localeCompare(right)),
    [libraryProfiles]
  )

  const handleSaveRule = async (targetProcess: string, targetProfile: string) => {
    if (!targetProcess.trim() || !targetProfile) return
    setBusyRule(targetProcess)
    try {
      await desktopBridge.saveAutoloadRule(targetProcess, targetProfile)
      await refreshRules()
      showToast(t('messages.autoloadRuleSaved'))
      if (targetProcess === processName) {
        setProcessName('')
      }
    } catch (error) {
      console.error('Failed to save AutoLoad rule', error)
      showToast(t('messages.autoloadRuleFailed'), 'error')
    } finally {
      setBusyRule(null)
    }
  }

  const handleDeleteRule = async (targetProcess: string) => {
    setBusyRule(targetProcess)
    try {
      await desktopBridge.deleteAutoloadRule(targetProcess)
      await refreshRules()
      showToast(t('messages.autoloadRuleDeleted'))
    } catch (error) {
      console.error('Failed to delete AutoLoad rule', error)
      showToast(t('messages.autoloadRuleFailed'), 'error')
    } finally {
      setBusyRule(null)
    }
  }

  const renderStatus = (rule: AutoloadRule) => {
    if (rule.kind !== 'profile') {
      return <span className={styles.statusAdvanced}>{t('autoload.advancedRule')}</span>
    }
    if (rule.missingProfile) {
      return <span className={styles.statusWarning}>{t('autoload.missingProfile')}</span>
    }
    return <span className={styles.statusOk}>{t('autoload.profileRule')}</span>
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className={`modal-card ${styles.modal}`} onMouseDown={event => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{t('autoload.title')}</h3>
            <p className="modal-description">{t('autoload.description')}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        <section className={styles.switchPanel}>
          <div>
            <div className={styles.switchTitle}>{t('autoload.toggleLabel')}</div>
            <p>{t('autoload.toggleDescription')}</p>
          </div>
          <button
            type="button"
            className={`${styles.switchButton} ${autoloadEnabled ? styles.switchButtonOn : ''}`}
            onClick={() => void onAutoloadEnabledChange(!autoloadEnabled)}
            disabled={runtimeBusy}
            aria-pressed={autoloadEnabled}
          >
            {autoloadEnabled ? t('autoload.enabled') : t('autoload.disabled')}
          </button>
        </section>

        <section className={styles.rulesPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <h4>{t('autoload.rulesTitle')}</h4>
              <p>{t('autoload.rulesDescription')}</p>
            </div>
            <button type="button" className="secondary-btn" onClick={() => void refreshRules()} disabled={loading}>
              {t('autoload.refresh')}
            </button>
          </div>

          {loading ? (
            <div className={styles.emptyState}>{t('autoload.loading')}</div>
          ) : rules.length === 0 ? (
            <div className={styles.emptyState}>{t('autoload.empty')}</div>
          ) : (
            <div className={styles.ruleList}>
              {rules.map(rule => {
                const selectedProfile = selectedProfiles[rule.processName] ?? rule.profileName ?? defaultProfile
                const isBusy = busyRule === rule.processName
                return (
                  <div className={styles.ruleRow} key={rule.fileName}>
                    <div className={styles.ruleProgram}>
                      <span>{rule.processName}.exe</span>
                      <small>{rule.fileName}</small>
                    </div>
                    <div className={styles.ruleProfile}>
                      {rule.kind === 'profile' ? (
                        <select
                          className="app-select"
                          value={selectedProfile}
                          disabled={!sortedProfiles.length || isBusy}
                          onChange={event => {
                            setSelectedProfiles(prev => ({ ...prev, [rule.processName]: event.target.value }))
                          }}
                        >
                          {sortedProfiles.map(profile => (
                            <option key={profile} value={profile}>
                              {profile}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={styles.advancedNote}>{t('autoload.advancedNote')}</span>
                      )}
                    </div>
                    <div className={styles.ruleStatus}>{renderStatus(rule)}</div>
                    <div className={styles.ruleActions}>
                      {rule.kind === 'profile' && (
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={!selectedProfile || isBusy}
                          onClick={() => void handleSaveRule(rule.processName, selectedProfile)}
                        >
                          {t('common.save')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="danger-btn"
                        disabled={isBusy}
                        onClick={() => void handleDeleteRule(rule.processName)}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className={styles.addPanel}>
          <h4>{t('autoload.addRule')}</h4>
          <div className={styles.addForm}>
            <label>
              {t('autoload.program')}
              <input
                value={processName}
                placeholder={t('autoload.processPlaceholder')}
                onChange={event => setProcessName(event.target.value)}
              />
            </label>
            <label>
              {t('autoload.profile')}
              <select
                className="app-select"
                value={profileName}
                disabled={!sortedProfiles.length}
                onChange={event => setProfileName(event.target.value)}
              >
                {!sortedProfiles.length && <option value="">{t('autoload.selectProfile')}</option>}
                {sortedProfiles.map(profile => (
                  <option key={profile} value={profile}>
                    {profile}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="primary-btn"
              disabled={!processName.trim() || !profileName || busyRule !== null}
              onClick={() => void handleSaveRule(processName, profileName)}
            >
              {t('autoload.addRule')}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
