import { ReactNode } from 'react'
import keymapStyles from '../Keymap.module.css'

type ButtonMappingCardProps = {
  title: string
  description: string
  isCapturing: boolean
  commands: ReactNode
  addControl: ReactNode
  extras?: ReactNode
}

export function ButtonMappingCard({
  title,
  description,
  isCapturing,
  commands,
  addControl,
  extras,
}: ButtonMappingCardProps) {
  return (
    <div className={`${keymapStyles.keymapRow} ${isCapturing ? keymapStyles.keymapRowCapturing : ''}`}>
      <div className={keymapStyles.keymapLabel}>
        <span className={keymapStyles.buttonName}>{title}</span>
        <span className={keymapStyles.buttonMeta}>{description}</span>
      </div>
      <div className={keymapStyles.commandList}>
        {commands}
        {addControl}
        {extras}
      </div>
    </div>
  )
}
