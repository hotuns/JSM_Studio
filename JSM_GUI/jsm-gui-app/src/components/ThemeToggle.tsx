import styles from './ThemeToggle.module.css'
import { useTheme } from '../hooks/useTheme'

type ThemeToggleProps = {
  compact?: boolean
  className?: string
}

export function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'
  const label = isLight ? 'Switch to dark mode' : 'Switch to light mode'
  const iconChar = isLight ? '☀︎' : '☾'

  return (
    <button
      type="button"
      className={`${styles.themeToggle} ${isLight ? styles.on : ''} ${compact ? styles.compact : ''} ${className}`.trim()}
      aria-pressed={isLight}
      aria-label={label}
      onClick={toggle}
    >
      <span className={styles.labelGroup}>
        <span className={styles.icon} aria-hidden="true">
          {iconChar}
        </span>
        {!compact && <span className={styles.text}>{isLight ? 'Light' : 'Dark'}</span>}
      </span>
      <span className={styles.switch} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  )
}
