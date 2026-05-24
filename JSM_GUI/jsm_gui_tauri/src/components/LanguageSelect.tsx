import { useTranslation } from 'react-i18next'
import { useAppLanguage } from '../hooks/useAppLanguage'
import { type AppLanguage } from '../i18n/language'

type LanguageSelectProps = {
  className?: string
}

const LANGUAGE_OPTIONS: AppLanguage[] = ['en', 'zh-CN']

export function LanguageSelect({ className = '' }: LanguageSelectProps) {
  const { t } = useTranslation()
  const { language, setLanguage } = useAppLanguage()

  return (
    <label className={className}>
      <span className="language-select-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M4 5h10" />
          <path d="M9 3v2" />
          <path d="M6 9c1.2 2.4 3.1 4 6 5" />
          <path d="M12 5c-.7 3.8-2.7 6.8-6 9" />
          <path d="M13 19l4-9 4 9" />
          <path d="M14.4 16h5.2" />
        </svg>
      </span>
      <select
        className="app-select"
        aria-label={t('language.label')}
        value={language}
        onChange={(event) => {
          void setLanguage(event.target.value as AppLanguage)
        }}
      >
        {LANGUAGE_OPTIONS.map(option => (
          <option key={option} value={option}>
            {option === 'en' ? t('language.english') : t('language.simplifiedChinese')}
          </option>
        ))}
      </select>
    </label>
  )
}
