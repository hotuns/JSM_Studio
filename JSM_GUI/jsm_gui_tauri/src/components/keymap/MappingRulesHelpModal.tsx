import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import keymapStyles from '../Keymap.module.css'

type MappingRulesHelpModalProps = {
  isOpen: boolean
  onClose: () => void
}

const triggerKeys = [
  'regular',
  'tap',
  'hold',
  'double',
  'release',
  'turbo',
  'chord',
  'simultaneous',
  'diagonal',
  'stickShift',
] as const

const outputKeys = ['keyboard', 'mouse', 'wheel', 'special', 'command', 'raw'] as const
const behaviorKeys = ['normal', 'tapOnce', 'toggle', 'releaseOnly'] as const
const exampleKeys = ['tapHold', 'pressRelease', 'comboTurbo', 'stickShift', 'raw'] as const

export function MappingRulesHelpModal({ isOpen, onClose }: MappingRulesHelpModalProps) {
  const { t } = useTranslation()
  const titleId = useId()

  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={`modal-card ${keymapStyles.mappingHelpModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 id={titleId}>{t('keymap.mappingHelpTitle')}</h3>
            <p className={keymapStyles.mappingHelpIntro}>{t('keymap.mappingHelpIntro')}</p>
          </div>
          <button type="button" className="secondary-btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        <div className={keymapStyles.mappingHelpModel}>
          <div className={keymapStyles.mappingHelpStep}>
            <span>{t('keymap.mappingHelpPhysical')}</span>
            <strong>{t('keymap.mappingHelpPhysicalValue')}</strong>
          </div>
          <div className={keymapStyles.mappingHelpArrow}>-&gt;</div>
          <div className={keymapStyles.mappingHelpStep}>
            <span>{t('keymap.mappingHelpTrigger')}</span>
            <strong>{t('keymap.commandTriggerTap')}</strong>
          </div>
          <div className={keymapStyles.mappingHelpArrow}>-&gt;</div>
          <div className={keymapStyles.mappingHelpStep}>
            <span>{t('keymap.mappingHelpOutput')}</span>
            <strong>R</strong>
          </div>
        </div>

        <div className={keymapStyles.mappingHelpGrid}>
          <section className={keymapStyles.mappingHelpCard}>
            <h4>{t('keymap.mappingHelpTriggerTitle')}</h4>
            <ul className={keymapStyles.mappingHelpList}>
              {triggerKeys.map(key => (
                <li key={key}>
                  <strong>{t(`keymap.mappingHelpTrigger_${key}`)}</strong>
                  <span>{t(`keymap.mappingHelpTrigger_${key}_desc`)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={keymapStyles.mappingHelpCard}>
            <h4>{t('keymap.mappingHelpOutputTitle')}</h4>
            <ul className={keymapStyles.mappingHelpList}>
              {outputKeys.map(key => (
                <li key={key}>
                  <strong>{t(`keymap.mappingHelpOutput_${key}`)}</strong>
                  <span>{t(`keymap.mappingHelpOutput_${key}_desc`)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={keymapStyles.mappingHelpCard}>
            <h4>{t('keymap.mappingHelpBehaviorTitle')}</h4>
            <ul className={keymapStyles.mappingHelpList}>
              {behaviorKeys.map(key => (
                <li key={key}>
                  <strong>{t(`keymap.mappingHelpBehavior_${key}`)}</strong>
                  <span>{t(`keymap.mappingHelpBehavior_${key}_desc`)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={keymapStyles.mappingHelpCard}>
            <h4>{t('keymap.mappingHelpExamplesTitle')}</h4>
            <ul className={keymapStyles.mappingHelpExamples}>
              {exampleKeys.map(key => (
                <li key={key}>{t(`keymap.mappingHelpExample_${key}`)}</li>
              ))}
            </ul>
          </section>
        </div>

        <p className={keymapStyles.mappingHelpNote}>{t('keymap.mappingHelpTimingNote')}</p>
        <p className={keymapStyles.mappingHelpNote}>{t('keymap.mappingHelpAdvancedNote')}</p>
      </div>
    </div>
  )
}
