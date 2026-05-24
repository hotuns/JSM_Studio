import { ReactNode } from 'react'
import styles from './Keymap.module.css'

type KeymapSectionProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function KeymapSection({ title, description, action, children }: KeymapSectionProps) {
  return (
    <section className={styles.keymapSection}>
      <div className={styles.keymapSectionHeader}>
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

