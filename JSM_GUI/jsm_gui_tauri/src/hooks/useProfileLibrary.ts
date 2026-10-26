import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { desktopBridge } from '../platform/desktopBridge'
import { ensureHeaderLines, sanitizeImportedConfig } from '../utils/config'
import { parseConfigText, serializeConfig } from '../utils/configSerializer'
import { showToast } from '../utils/toast'

type ApplyConfigOptions = {
  profileNameOverride?: string
  textOverride?: string
  profilePathOverride?: string
  normalize?: boolean
}

type UseProfileLibraryParams = {
  configText: string
  setConfigText: (value: string) => void
  setAppliedConfig: (value: string) => void
  setStatusMessage: (value: string | null) => void
  resetPendingSensitivityChanges: () => void
}

export function useProfileLibrary({
  configText,
  setConfigText,
  setAppliedConfig,
  setStatusMessage,
  resetPendingSensitivityChanges,
}: UseProfileLibraryParams) {
  const { t } = useTranslation()
  const [savedConfig, setSavedConfig] = useState('')
  const [libraryProfiles, setLibraryProfiles] = useState<string[]>([])
  const [isLibraryLoading, setIsLibraryLoading] = useState(false)
  const [editedLibraryNames, setEditedLibraryNames] = useState<Record<string, string>>({})
  const [currentLibraryProfile, setCurrentLibraryProfile] = useState<string | null>(null)
  const [activeProfilePath, setActiveProfilePath] = useState<string>('')

  const unsavedProfileLabel = useMemo(() => t('app.profileSummary.unsavedProfile'), [t])
  const clearStatusLater = useCallback(() => {
    setTimeout(() => setStatusMessage(null), 3000)
  }, [setStatusMessage])

  const refreshActiveProfile = useCallback(async () => {
    try {
      const result = await desktopBridge.getActiveProfile()
      if (result) {
        resetPendingSensitivityChanges()
        setConfigText(result.content ?? '')
        setAppliedConfig(result.content ?? '')
        setSavedConfig(result.content ?? '')
        setCurrentLibraryProfile(result.name ?? null)
        setActiveProfilePath(result.path ?? '')
      }
    } catch (err) {
      console.error('Failed to load active profile', err)
    }
  }, [resetPendingSensitivityChanges, setAppliedConfig, setConfigText])

  const refreshLibraryProfiles = useCallback(async (): Promise<string[]> => {
    setIsLibraryLoading(true)
    try {
      const entries = await desktopBridge.listLibraryProfiles()
      const sorted = entries ?? []
      setLibraryProfiles(sorted)
      setEditedLibraryNames(prev => {
        const next: Record<string, string> = {}
        sorted.forEach(name => {
          next[name] = prev[name] ?? name
        })
        return next
      })
      return sorted
    } catch (err) {
      console.error('Failed to load profile library', err)
      setLibraryProfiles([])
      setEditedLibraryNames({})
      return []
    } finally {
      setIsLibraryLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshLibraryProfiles()
  }, [refreshLibraryProfiles])

  useEffect(() => {
    refreshActiveProfile()
  }, [refreshActiveProfile])

  const applyConfig = useCallback(
    async (options?: ApplyConfigOptions) => {
      const sourceText = options?.textOverride ?? configText
      const sanitizedConfig = ensureHeaderLines(sourceText)
      const shouldNormalize = options?.normalize !== false
      const normalizedConfig = shouldNormalize ? serializeConfig(parseConfigText(sanitizedConfig)) : sanitizedConfig
      if (options?.textOverride !== undefined) {
        setConfigText(normalizedConfig)
      } else if (normalizedConfig !== configText) {
        setConfigText(normalizedConfig)
      }
      try {
        const targetPath = options?.profilePathOverride ?? activeProfilePath
        const result = await desktopBridge.applyProfile(targetPath, normalizedConfig)
        if (!result) throw new Error('Could not apply profile')
        if (result?.path) {
          setActiveProfilePath(result.path)
        }
        const profileName = options?.profileNameOverride ?? currentLibraryProfile ?? unsavedProfileLabel
        const appliedMessage =
          result?.mappingEnabled === false
            ? t('messages.mappingSavedWhilePaused', { profileName })
            : result?.restarted
              ? t('messages.profileAppliedRestarted', { profileName })
              : t('messages.profileApplied', { profileName })
        setStatusMessage(appliedMessage)
        showToast(appliedMessage)
        setAppliedConfig(normalizedConfig)
        setSavedConfig(normalizedConfig)
        clearStatusLater()
        return true
      } catch (err) {
        console.error(err)
        const message = t('messages.applyKeymapFailed')
        setStatusMessage(message)
        showToast(message, 'error')
        return false
      }
    },
    [
      activeProfilePath,
      clearStatusLater,
      configText,
      currentLibraryProfile,
      setAppliedConfig,
      setConfigText,
      setStatusMessage,
      t,
      unsavedProfileLabel,
    ]
  )

  const handleLoadProfileFromLibrary = useCallback(
    async (name: string): Promise<string | null> => {
      try {
        const result = await desktopBridge.activateLibraryProfile(name)
        if (result?.content !== undefined) {
          const profileContent = result.content ?? ''
          const profileName = result.name ?? name
          const profilePath = result.path ?? ''
          resetPendingSensitivityChanges()
          setConfigText(profileContent)
          setSavedConfig(profileContent)
          setCurrentLibraryProfile(profileName)
          setActiveProfilePath(profilePath)
          await applyConfig({
            profileNameOverride: profileName,
            textOverride: profileContent,
            profilePathOverride: profilePath,
          })
          return result.content
        }
      } catch (err) {
        console.error('Failed to load profile from library', err)
        const message = t('messages.loadProfileFailed')
        setStatusMessage(message)
        showToast(message, 'error')
        clearStatusLater()
        refreshLibraryProfiles()
      }
      return null
    },
    [
      applyConfig,
      clearStatusLater,
      refreshLibraryProfiles,
      resetPendingSensitivityChanges,
      setConfigText,
      setStatusMessage,
      t,
    ]
  )

  const handleLibraryProfileNameChange = useCallback((originalName: string, value: string) => {
    setEditedLibraryNames(prev => ({
      ...prev,
      [originalName]: value,
    }))
  }, [])

  const handleCreateProfile = useCallback(async () => {
    try {
      const result = await desktopBridge.createLibraryProfile(t('profiles.defaultProfileBaseName'))
      if (result) {
        const profileContent = result.content ?? ''
        const profileName = result.name ?? null
        const profilePath = result.path ?? ''
        resetPendingSensitivityChanges()
        setConfigText(profileContent)
        setSavedConfig(profileContent)
        setCurrentLibraryProfile(profileName)
        setActiveProfilePath(profilePath)
        setEditedLibraryNames(prev => ({
          ...prev,
          [profileName ?? '']: profileName ?? '',
        }))
        await applyConfig({
          profileNameOverride: profileName ?? unsavedProfileLabel,
          textOverride: profileContent,
          profilePathOverride: profilePath,
        })
        refreshLibraryProfiles()
      }
    } catch (err) {
      console.error('Failed to create profile', err)
      const message = t('messages.createProfileFailed')
      setStatusMessage(message)
      clearStatusLater()
    }
  }, [
    applyConfig,
    clearStatusLater,
    refreshLibraryProfiles,
    resetPendingSensitivityChanges,
    setConfigText,
    setStatusMessage,
    t,
    unsavedProfileLabel,
  ])

  const handleRenameProfile = useCallback(
    async (originalName: string): Promise<boolean> => {
      const pendingName = (editedLibraryNames[originalName] ?? originalName).trim()
      if (!pendingName) {
        const message = t('messages.emptyProfileName')
        setStatusMessage(message)
        showToast(message, 'error')
        clearStatusLater()
        return false
      }
      try {
        const result = await desktopBridge.renameLibraryProfile(originalName, pendingName)
        if (!result) throw new Error('Could not rename profile')
        if (currentLibraryProfile === originalName) {
          setCurrentLibraryProfile(result.name ?? originalName)
          setActiveProfilePath(result.path ?? activeProfilePath)
        }
        setEditedLibraryNames(prev => {
          const next = { ...prev }
          delete next[originalName]
          next[result.name ?? originalName] = result.name ?? originalName
          return next
        })
        await refreshLibraryProfiles()
        showToast(t('profileCreation.renamed', { name: result.name ?? pendingName }))
        return true
      } catch (err) {
        console.error('Failed to rename profile', err)
        const message = t('messages.renameProfileFailed')
        setStatusMessage(message)
        showToast(message, 'error')
        clearStatusLater()
        return false
      }
    },
    [
      activeProfilePath,
      clearStatusLater,
      currentLibraryProfile,
      editedLibraryNames,
      refreshLibraryProfiles,
      setStatusMessage,
      t,
    ]
  )

  const handleDeleteLibraryProfile = useCallback(
    async (name: string) => {
      try {
        const response = await desktopBridge.deleteLibraryProfile(name)
        const entries = (await refreshLibraryProfiles()) ?? []
        setEditedLibraryNames(prev => {
          const next = { ...prev }
          delete next[name]
          if (response.fallback?.name) {
            next[response.fallback.name] = response.fallback.name
          }
          return next
        })
        if (currentLibraryProfile === name) {
          const fallback = response.fallback
          if (fallback) {
            resetPendingSensitivityChanges()
            setCurrentLibraryProfile(fallback.name ?? null)
            setConfigText(fallback.content ?? '')
            setSavedConfig(fallback.content ?? '')
            setActiveProfilePath(fallback.path ?? '')
            await applyConfig({
              profileNameOverride: fallback.name ?? unsavedProfileLabel,
              textOverride: fallback.content ?? '',
              profilePathOverride: fallback.path ?? '',
            })
          } else if (entries.length > 0) {
            const fallbackName = entries[0]
            const content = await handleLoadProfileFromLibrary(fallbackName)
            if (content !== null) {
              const relativePath = `profiles-library/${fallbackName}.txt`
              resetPendingSensitivityChanges()
              setCurrentLibraryProfile(fallbackName)
              setActiveProfilePath(relativePath)
              await applyConfig({
                profileNameOverride: fallbackName,
                textOverride: content,
                profilePathOverride: relativePath,
              })
            }
          } else {
            resetPendingSensitivityChanges()
            setCurrentLibraryProfile(null)
            setConfigText('')
            setSavedConfig('')
            setActiveProfilePath('')
            await applyConfig({ profileNameOverride: unsavedProfileLabel, textOverride: '', profilePathOverride: '' })
          }
        }
        const message = t('messages.profileDeleted', { profileName: name })
        setStatusMessage(message)
        showToast(message)
        clearStatusLater()
      } catch (err) {
        console.error('Failed to delete profile', err)
        const message = t('messages.deleteProfileFailed')
        setStatusMessage(message)
        showToast(message, 'error')
        clearStatusLater()
      }
    },
    [
      applyConfig,
      clearStatusLater,
      currentLibraryProfile,
      handleLoadProfileFromLibrary,
      refreshLibraryProfiles,
      resetPendingSensitivityChanges,
      setConfigText,
      setStatusMessage,
      t,
      unsavedProfileLabel,
    ]
  )

  const handleImportProfile = useCallback(
    async (fileName: string, fileContent: string) => {
      if (!fileContent) return
      const baseName = fileName.replace(/\.[^/.]+$/, '') || fileName || t('profiles.defaultProfileBaseName')
      try {
        const sanitized = sanitizeImportedConfig(fileContent)
        const result = await desktopBridge.saveLibraryProfile(baseName, sanitized)
        const savedName = result?.name ?? baseName
        resetPendingSensitivityChanges()
        await handleLoadProfileFromLibrary(savedName)
        const message = t('messages.profileImported', { profileName: savedName })
        setStatusMessage(message)
        showToast(message)
        clearStatusLater()
        refreshLibraryProfiles()
      } catch (err) {
        console.error('Failed to import profile', err)
        const message = t('messages.importProfileFailed')
        setStatusMessage(message)
        showToast(message, 'error')
        clearStatusLater()
      }
    },
    [clearStatusLater, handleLoadProfileFromLibrary, refreshLibraryProfiles, resetPendingSensitivityChanges, setStatusMessage, t]
  )

  const handleCopyActiveProfile = useCallback(async () => {
    try {
      const result = await desktopBridge.copyActiveProfile()
      if (result) {
        const profileName = result.name ?? t('profiles.defaultProfileBaseName')
        resetPendingSensitivityChanges()
        setConfigText(result.content ?? '')
        setSavedConfig(result.content ?? '')
        setCurrentLibraryProfile(profileName)
        setActiveProfilePath(result.path ?? '')
        const message = t('messages.profileCopied', { profileName })
        setStatusMessage(message)
        showToast(message)
        clearStatusLater()
        refreshLibraryProfiles()
        return result
      }
    } catch (err) {
      console.error('Failed to copy active profile', err)
      const message = t('messages.copyProfileFailed')
      setStatusMessage(message)
      showToast(message, 'error')
      clearStatusLater()
    }
    return null
  }, [clearStatusLater, refreshLibraryProfiles, resetPendingSensitivityChanges, setConfigText, setStatusMessage, t])

  const saveConfig = async (text: string) => {
    if (!currentLibraryProfile) throw new Error('Select a profile before saving')
    const normalized = serializeConfig(parseConfigText(ensureHeaderLines(text)))
    setConfigText(normalized)
    resetPendingSensitivityChanges()
    const saved = await desktopBridge.saveLibraryProfile(currentLibraryProfile, normalized)
    if (!saved) throw new Error('Could not save profile')
    setSavedConfig(normalized)
    showToast(t('studio.fileSaved'))
  }

  const handleCreateGameProfile = async (name: string, content: string, applyNow = false) => {
    const normalized = serializeConfig(parseConfigText(ensureHeaderLines(content)))
    const result = await desktopBridge.createSavedProfile(name, normalized)
    if (!result?.name || !result.path) throw new Error('Could not save game profile')
    await refreshLibraryProfiles()
    if (applyNow) {
      resetPendingSensitivityChanges()
      setCurrentLibraryProfile(result.name)
      setActiveProfilePath(result.path)
      setConfigText(normalized)
      setSavedConfig(normalized)
      await applyConfig({ textOverride: normalized, profileNameOverride: result.name, profilePathOverride: result.path })
    } else {
      showToast(t('studio.gameSavedOffline', { name: result.name }))
    }
  }

  const handleCreatePreset = async (name: string, content: string, load: boolean) => {
    const normalized = serializeConfig(parseConfigText(ensureHeaderLines(content)))
    const result = await desktopBridge.createSavedProfile(name, normalized)
    if (!result?.name || !result.path) throw new Error(t('messages.createProfileFailed'))
    await refreshLibraryProfiles()
    if (load) {
      resetPendingSensitivityChanges()
      setCurrentLibraryProfile(result.name)
      setActiveProfilePath(result.path)
      setConfigText(normalized)
      setSavedConfig(normalized)
    }
    showToast(t('studio.gameSavedOffline', { name: result.name }))
  }

  return {
    savedConfig,
    saveConfig,
    libraryProfiles,
    isLibraryLoading,
    editedLibraryNames,
    currentLibraryProfile,
    activeProfilePath,
    setCurrentLibraryProfile,
    setActiveProfilePath,
    refreshLibraryProfiles,
    applyConfig,
    handleLoadProfileFromLibrary,
    handleLibraryProfileNameChange,
    handleCreateProfile,
    handleCreatePreset,
    handleRenameProfile,
    handleDeleteLibraryProfile,
    handleImportProfile,
    handleCopyActiveProfile,
    handleCreateGameProfile,
    setEditedLibraryNames,
    refreshActiveProfile,
  }
}
