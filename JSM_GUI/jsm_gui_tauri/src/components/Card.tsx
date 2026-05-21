import { ReactNode } from 'react'
import miscStyles from './Misc.module.css'

type CardProps = {
  children: ReactNode
  className?: string
  lockable?: boolean
  locked?: boolean
  lockMessage?: string
}

export function Card({ children, className = '', lockable = false, locked = false, lockMessage }: CardProps) {
  const classes = ['app-card']
  if (lockable) classes.push(miscStyles.lockable)
  if (locked) classes.push(miscStyles.locked)
  if (className) classes.push(className)

  return (
    <section className={classes.join(' ')}>
      {lockable && lockMessage && <div className={miscStyles.lockedOverlay}>{lockMessage}</div>}
      {children}
    </section>
  )
}
