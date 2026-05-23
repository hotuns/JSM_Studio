import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from './Card'
import styles from './AiMappingPage.module.css'
import {
  desktopBridge,
  type AiConversationMessage,
  type AiGenerateResponse,
  type AiSettings,
} from '../platform/desktopBridge'
import { ensureHeaderLines } from '../utils/config'
import { showToast } from '../utils/toast'

type AiMappingPageProps = {
  configText: string
  currentProfileName: string | null
  hasPendingChanges: boolean
  onReplaceConfig: (value: string) => void
  onApplyGeneratedConfig: (value: string) => Promise<void>
}

type ChatEntry = {
  id: string
  role: 'user' | 'assistant'
  content: string
  result?: AiGenerateResponse
}

const DEFAULT_SETTINGS: AiSettings = {
  apiKey: '',
  model: '',
  baseUrl: '',
  temperature: 0.2,
}

const createEntryId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const formatAssistantHistoryContent = (result: AiGenerateResponse) => {
  const sections = [result.summary.trim()].filter(Boolean)

  if (result.assumptions.length > 0) {
    sections.push(`Assumptions:\n${result.assumptions.map(item => `- ${item}`).join('\n')}`)
  }

  if (result.warnings.length > 0) {
    sections.push(`Warnings:\n${result.warnings.map(item => `- ${item}`).join('\n')}`)
  }

  return sections.join('\n\n').trim()
}

const toConversationHistory = (entries: ChatEntry[]): AiConversationMessage[] =>
  entries.map(entry => ({
    role: entry.role,
    content: entry.role === 'assistant' && entry.result ? formatAssistantHistoryContent(entry.result) : entry.content,
  }))

export function AiMappingPage({
  configText,
  currentProfileName,
  hasPendingChanges,
  onReplaceConfig,
  onApplyGeneratedConfig,
}: AiMappingPageProps) {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS)
  const [composer, setComposer] = useState('')
  const [includeCurrentConfig, setIncludeCurrentConfig] = useState(true)
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [workingConfig, setWorkingConfig] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [applying, setApplying] = useState(false)
  const chatViewportRef = useRef<HTMLDivElement | null>(null)

  const hasAssistantDraft = messages.some(message => message.role === 'assistant' && message.result)

  useEffect(() => {
    let disposed = false
    void desktopBridge.getAiSettings()
      .then(nextSettings => {
        if (!disposed) {
          setSettings(nextSettings)
          setSettingsLoaded(true)
        }
      })
      .catch(error => {
        if (!disposed) {
          console.error('Failed to load AI settings', error)
          setErrorMessage(error instanceof Error ? error.message : String(error))
          setSettingsLoaded(true)
        }
      })

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    if (!hasAssistantDraft) {
      setWorkingConfig(configText)
    }
  }, [configText, hasAssistantDraft])

  useEffect(() => {
    const viewport = chatViewportRef.current
    if (!viewport) return
    viewport.scrollTop = viewport.scrollHeight
  }, [messages, generating])

  const previewConfig = useMemo(() => {
    const source = hasAssistantDraft ? workingConfig : configText
    return ensureHeaderLines(source)
  }, [configText, hasAssistantDraft, workingConfig])

  const currentConfigForRequest = useMemo(() => {
    if (hasAssistantDraft) {
      return previewConfig
    }
    return includeCurrentConfig ? configText : undefined
  }, [configText, hasAssistantDraft, includeCurrentConfig, previewConfig])

  const persistSettings = async () => {
    setSavingSettings(true)
    setErrorMessage(null)
    try {
      const persisted = await desktopBridge.saveAiSettings(settings)
      setSettings(persisted)
      showToast(t('messages.aiSettingsSaved'))
    } catch (error) {
      console.error('Failed to save AI settings', error)
      const message = t('messages.aiSettingsFailed', {
        error: error instanceof Error ? error.message : String(error),
      })
      setErrorMessage(message)
      showToast(message, 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSend = async () => {
    const userPrompt = composer.trim()
    if (!userPrompt) {
      const message = t('ai.requestRequired')
      setErrorMessage(message)
      showToast(message, 'error')
      return
    }
    if (!settings.apiKey.trim()) {
      const message = t('ai.apiKeyRequired')
      setErrorMessage(message)
      showToast(message, 'error')
      return
    }
    if (!settings.model.trim()) {
      const message = t('ai.modelRequired')
      setErrorMessage(message)
      showToast(message, 'error')
      return
    }
    if (!settings.baseUrl.trim()) {
      const message = t('ai.baseUrlRequired')
      setErrorMessage(message)
      showToast(message, 'error')
      return
    }

    const nextUserEntry: ChatEntry = {
      id: createEntryId(),
      role: 'user',
      content: userPrompt,
    }

    const priorMessages = messages
    setMessages(current => [...current, nextUserEntry])
    setComposer('')
    setGenerating(true)
    setErrorMessage(null)

    try {
      const persistedSettings = await desktopBridge.saveAiSettings(settings)
      setSettings(persistedSettings)

      const nextResult = await desktopBridge.generateAiMapping({
        userPrompt,
        currentConfig: currentConfigForRequest,
        currentProfileName,
        includeCurrentConfig,
        conversationHistory: toConversationHistory(priorMessages),
        locale: i18n.language,
      })

      setWorkingConfig(nextResult.configText)
      setMessages(current => [
        ...current,
        {
          id: createEntryId(),
          role: 'assistant',
          content: nextResult.summary || t('ai.emptySummary'),
          result: nextResult,
        },
      ])
    } catch (error) {
      console.error('Failed to generate AI mapping', error)
      const message = t('messages.aiGenerationFailed', {
        error: error instanceof Error ? error.message : String(error),
      })
      setErrorMessage(message)
      showToast(message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleReplaceEditor = () => {
    onReplaceConfig(previewConfig)
    showToast(t('messages.aiEditorReplaced'))
  }

  const handleApplyGeneratedConfig = async () => {
    setApplying(true)
    try {
      await onApplyGeneratedConfig(previewConfig)
    } finally {
      setApplying(false)
    }
  }

  const handleResetConversation = () => {
    setMessages([])
    setWorkingConfig(configText)
    setErrorMessage(null)
  }

  return (
    <div className={styles.page}>
      <Card className={styles.toolbarCard}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarTitle}>
            <h2>{t('ai.title')}</h2>
            <p className="field-description">{t('ai.description')}</p>
          </div>

          <label className={styles.toolbarField}>
            <span>{t('ai.apiKeyLabel')}</span>
            <input
              className={styles.compactInput}
              type="password"
              placeholder={t('ai.apiKeyPlaceholder')}
              value={settings.apiKey}
              onChange={event => setSettings(current => ({ ...current, apiKey: event.target.value }))}
            />
          </label>

          <label className={styles.toolbarField}>
            <span>{t('ai.modelLabel')}</span>
            <input
              className={styles.compactInput}
              type="text"
              placeholder={t('ai.modelPlaceholder')}
              value={settings.model}
              onChange={event => setSettings(current => ({ ...current, model: event.target.value }))}
            />
          </label>

          <label className={styles.toolbarField}>
            <span>{t('ai.baseUrlLabel')}</span>
            <input
              className={styles.compactInput}
              type="url"
              placeholder={t('ai.baseUrlPlaceholder')}
              value={settings.baseUrl}
              onChange={event => setSettings(current => ({ ...current, baseUrl: event.target.value }))}
            />
          </label>

          <label className={`${styles.toolbarField} ${styles.temperatureField}`}>
            <span>{t('ai.temperatureLabel')}</span>
            <input
              className={styles.compactInput}
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={event => {
                const nextValue = Number.parseFloat(event.target.value)
                setSettings(current => ({
                  ...current,
                  temperature: Number.isFinite(nextValue) ? nextValue : current.temperature,
                }))
              }}
            />
          </label>

          <button
            type="button"
            className={`secondary-btn ${styles.compactButton}`}
            onClick={() => void persistSettings()}
            disabled={savingSettings}
          >
            {savingSettings ? t('ai.savingSettings') : t('ai.saveSettings')}
          </button>
        </div>
      </Card>

      {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

      <div className={styles.workspace}>
        <Card className={`${styles.chatCard} control-panel`}>
          <div className={styles.panelHeader}>
            <div>
              <h3>{t('ai.conversationTitle')}</h3>
              <p className="field-description">{t('ai.conversationDescription')}</p>
            </div>
            <div className={styles.panelMeta}>
              {hasAssistantDraft && <span className="pill pill--success">{t('ai.configUpdated')}</span>}
              <button type="button" className="ghost-btn" onClick={handleResetConversation}>
                {t('ai.newConversation')}
              </button>
            </div>
          </div>

          <div className={styles.chatControls}>
            <label className={styles.baseToggle}>
              <input
                type="checkbox"
                checked={includeCurrentConfig}
                onChange={event => setIncludeCurrentConfig(event.target.checked)}
              />
              <div>
                <div className={styles.baseToggleTitle}>{t('ai.useCurrentProfile')}</div>
                <div className="field-description">
                  {hasAssistantDraft
                    ? t('ai.followupUsesDraft')
                    : configText.trim()
                      ? t('ai.useCurrentProfileHint', {
                          profileName: currentProfileName ?? t('app.profileSummary.unsavedProfile'),
                        })
                      : t('ai.useCurrentProfileUnavailable')}
                </div>
                {!hasAssistantDraft && includeCurrentConfig && hasPendingChanges && (
                  <div className={styles.inlineWarning}>{t('ai.includePendingChanges')}</div>
                )}
              </div>
            </label>
            {!settingsLoaded && <span className="field-description">{t('ai.loadingSettings')}</span>}
          </div>

          <div ref={chatViewportRef} className={styles.chatViewport}>
            {messages.length === 0 && !generating ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateTitle}>{t('ai.emptyConversationTitle')}</div>
                <p className="field-description">{t('ai.emptyConversationDescription')}</p>
              </div>
            ) : (
              messages.map(message => (
                <article
                  key={message.id}
                  className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
                >
                  <div className={styles.messageRole}>
                    {message.role === 'user' ? t('ai.userRole') : t('ai.assistantRole')}
                  </div>
                  <div className={styles.messageContent}>{message.content}</div>
                  {message.role === 'assistant' && message.result && (
                    <div className={styles.messageDetails}>
                      {message.result.assumptions.length > 0 && (
                        <div className={styles.messageBlock}>
                          <div className={styles.messageBlockTitle}>{t('ai.assumptions')}</div>
                          <ul className={styles.messageList}>
                            {message.result.assumptions.map((item, index) => (
                              <li key={`${message.id}-assumption-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {message.result.warnings.length > 0 && (
                        <div className={styles.messageBlock}>
                          <div className={styles.messageBlockTitle}>{t('ai.warnings')}</div>
                          <ul className={styles.messageList}>
                            {message.result.warnings.map((item, index) => (
                              <li key={`${message.id}-warning-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))
            )}

            {generating && (
              <article className={`${styles.message} ${styles.assistantMessage} ${styles.pendingMessage}`}>
                <div className={styles.messageRole}>{t('ai.assistantRole')}</div>
                <div className={styles.messageContent}>{t('ai.generating')}</div>
              </article>
            )}
          </div>

          <div className={styles.composer}>
            <label className={styles.composerLabel}>
              <span>{t('ai.promptLabel')}</span>
              <textarea
                className={styles.promptInput}
                value={composer}
                placeholder={t('ai.promptPlaceholder')}
                onChange={event => setComposer(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    if (!generating) {
                      void handleSend()
                    }
                  }
                }}
              />
            </label>

            <div className={styles.composerActions}>
              <span className="field-description">{t('ai.providerNote')}</span>
              <button
                type="button"
                className="primary-btn"
                onClick={() => void handleSend()}
                disabled={!settingsLoaded || generating}
              >
                {generating ? t('ai.generating') : t('ai.send')}
              </button>
            </div>
          </div>
        </Card>

        <Card className={`${styles.previewCard} control-panel`}>
          <div className={styles.panelHeader}>
            <div>
              <h3>{t('ai.currentDraftTitle')}</h3>
              <p className="field-description">
                {hasAssistantDraft ? t('ai.currentDraftDescription') : t('ai.currentEditorDescription')}
              </p>
            </div>
            <div className={styles.previewMeta}>
              {settings.model && hasAssistantDraft && <span className="pill pill--success">{t('ai.modelUsed', { model: settings.model })}</span>}
            </div>
          </div>

          <div className={styles.previewActions}>
            <button type="button" className="secondary-btn" onClick={handleReplaceEditor}>
              {t('ai.replaceEditor')}
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => void handleApplyGeneratedConfig()}
              disabled={applying}
            >
              {applying ? t('ai.applyingToJsm') : t('ai.applyToJsm')}
            </button>
          </div>

          <label className={styles.previewLabel}>
            <span>{t('ai.currentConfigPreview')}</span>
            <textarea className={styles.resultPreview} value={previewConfig} readOnly />
          </label>
        </Card>
      </div>
    </div>
  )
}
