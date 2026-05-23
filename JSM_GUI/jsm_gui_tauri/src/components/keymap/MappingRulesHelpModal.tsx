import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { STICK_MODE_VALUES, formatStickModeLabel } from '../../constants/sticks'
import keymapStyles from '../Keymap.module.css'

type MappingRulesHelpModalProps = {
  isOpen: boolean
  onClose: () => void
}

const behaviorKeys = ['normal', 'tapOnce', 'toggle', 'releaseOnly'] as const
const fullPullModeKeys = [
  'NO_FULL',
  'NO_SKIP',
  'NO_SKIP_EXCLUSIVE',
  'MUST_SKIP',
  'MAY_SKIP',
  'MUST_SKIP_R',
  'MAY_SKIP_R',
] as const
const scenarioKeys = ['tapHold', 'pressRelease', 'comboTurbo', 'stickShift', 'raw'] as const
const sectionKeys = ['overview', 'scenarios', 'common', 'advanced'] as const

type SectionKey = (typeof sectionKeys)[number]

const triggerGroups = [
  { titleKey: 'keymap.mappingHelpTriggerGroup_basic', keys: ['regular', 'tap', 'hold', 'double', 'release'] },
  { titleKey: 'keymap.mappingHelpTriggerGroup_combo', keys: ['chord', 'simultaneous', 'diagonal'] },
  { titleKey: 'keymap.mappingHelpTriggerGroup_special', keys: ['turbo', 'stickShift'] },
] as const

const outputGroups = [
  { titleKey: 'keymap.mappingHelpOutputGroup_direct', keys: ['keyboard', 'mouse', 'wheel'] },
  { titleKey: 'keymap.mappingHelpOutputGroup_system', keys: ['special', 'command'] },
  { titleKey: 'keymap.mappingHelpOutputGroup_advanced', keys: ['raw'] },
] as const

export function MappingRulesHelpModal({ isOpen, onClose }: MappingRulesHelpModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLElement | null>>>({})

  const setSectionRef = (key: SectionKey) => (node: HTMLElement | null) => {
    sectionRefs.current[key] = node
  }

  const jumpToSection = (key: SectionKey) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const renderRuleList = (keys: readonly string[], prefix: string) => (
    <ul className={keymapStyles.mappingHelpRuleList}>
      {keys.map(key => (
        <li key={key} className={keymapStyles.mappingHelpRuleRow}>
          <strong>{t(`keymap.${prefix}_${key}`)}</strong>
          <span>{t(`keymap.${prefix}_${key}_desc`)}</span>
        </li>
      ))}
    </ul>
  )

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
          <button type="button" className="ghost-btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        <div className={keymapStyles.mappingHelpBody}>
          <div className={keymapStyles.mappingHelpNav} role="navigation" aria-label={t('keymap.mappingHelpTitle')}>
            {sectionKeys.map(key => (
              <button
                key={key}
                type="button"
                className={keymapStyles.mappingHelpNavPill}
                onClick={() => jumpToSection(key)}
              >
                {t(`keymap.mappingHelpSection_${key}`)}
              </button>
            ))}
          </div>

          <section ref={setSectionRef('overview')} className={keymapStyles.mappingHelpSection}>
            <div className={keymapStyles.mappingHelpSectionHeader}>
              <h4>{t('keymap.mappingHelpSection_overview')}</h4>
              <p>{t('keymap.mappingHelpSection_overview_intro')}</p>
            </div>

            <div className={keymapStyles.mappingHelpHero}>
              <p className={keymapStyles.mappingHelpModelNote}>{t('keymap.mappingHelpModelNote')}</p>

              <div className={keymapStyles.mappingHelpModel}>
                <div className={keymapStyles.mappingHelpStep}>
                  <span>{t('keymap.mappingHelpPhysical')}</span>
                  <strong>{t('keymap.mappingHelpPhysicalValue')}</strong>
                </div>
                <div className={keymapStyles.mappingHelpArrow}>-&gt;</div>
                <div className={keymapStyles.mappingHelpStep}>
                  <span>{t('keymap.mappingHelpTrigger')}</span>
                  <strong>{t('keymap.mappingHelpTrigger_tap')}</strong>
                </div>
                <div className={keymapStyles.mappingHelpArrow}>-&gt;</div>
                <div className={keymapStyles.mappingHelpStep}>
                  <span>{t('keymap.mappingHelpOutput')}</span>
                  <strong>R</strong>
                </div>
              </div>

              <div className={keymapStyles.mappingHelpOptionalStrip}>
                <div className={keymapStyles.mappingHelpOptionalItem}>
                  <span>{t('keymap.mappingHelpBehaviorTitle')}</span>
                  <strong>{t('keymap.mappingHelpBehavior_toggle')}</strong>
                </div>
                <div className={keymapStyles.mappingHelpOptionalItem}>
                  <span>{t('keymap.mappingHelpConditionTitle')}</span>
                  <strong>
                    {t('keymap.mappingHelpTrigger_chord')} / {t('keymap.mappingHelpTrigger_simultaneous')}
                  </strong>
                </div>
              </div>

              <div className={keymapStyles.mappingHelpOverviewGrid}>
                <article className={keymapStyles.mappingHelpOverviewCard}>
                  <h5>{t('keymap.mappingHelpRequiredTitle')}</h5>
                  <p>{t('keymap.mappingHelpRequiredDesc')}</p>
                </article>
                <article className={keymapStyles.mappingHelpOverviewCard}>
                  <h5>{t('keymap.mappingHelpOptionalTitle')}</h5>
                  <p>{t('keymap.mappingHelpOptionalDesc')}</p>
                </article>
              </div>
            </div>
          </section>

          <section ref={setSectionRef('scenarios')} className={keymapStyles.mappingHelpSection}>
            <div className={keymapStyles.mappingHelpSectionHeader}>
              <h4>{t('keymap.mappingHelpSection_scenarios')}</h4>
              <p>{t('keymap.mappingHelpSection_scenarios_intro')}</p>
            </div>

            <div className={keymapStyles.mappingHelpScenarioGrid}>
              {scenarioKeys.map(key => (
                <article key={key} className={keymapStyles.mappingHelpScenarioCard}>
                  <h5>{t(`keymap.mappingHelpScenario_${key}_title`)}</h5>
                  <dl className={keymapStyles.mappingHelpScenarioMeta}>
                    <div>
                      <dt>{t('keymap.mappingHelpScenarioGoalLabel')}</dt>
                      <dd>{t(`keymap.mappingHelpScenario_${key}_goal`)}</dd>
                    </div>
                    <div>
                      <dt>{t('keymap.mappingHelpScenarioHowLabel')}</dt>
                      <dd>{t(`keymap.mappingHelpExample_${key}`)}</dd>
                    </div>
                    <div>
                      <dt>{t('keymap.mappingHelpScenarioWhenLabel')}</dt>
                      <dd>{t(`keymap.mappingHelpScenario_${key}_when`)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section ref={setSectionRef('common')} className={keymapStyles.mappingHelpSection}>
            <div className={keymapStyles.mappingHelpSectionHeader}>
              <h4>{t('keymap.mappingHelpSection_common')}</h4>
              <p>{t('keymap.mappingHelpSection_common_intro')}</p>
            </div>

            <div className={keymapStyles.mappingHelpRuleStack}>
              <article className={keymapStyles.mappingHelpRuleBlock}>
                <div className={keymapStyles.mappingHelpRuleBlockHeader}>
                  <h5>{t('keymap.mappingHelpTriggerTitle')}</h5>
                </div>
                <div className={keymapStyles.mappingHelpRuleGroups}>
                  {triggerGroups.map(group => (
                    <section key={group.titleKey} className={keymapStyles.mappingHelpRuleGroup}>
                      <h6>{t(group.titleKey)}</h6>
                      {renderRuleList(group.keys, 'mappingHelpTrigger')}
                    </section>
                  ))}
                </div>
              </article>

              <div className={keymapStyles.mappingHelpRuleSplit}>
                <article className={keymapStyles.mappingHelpRuleBlock}>
                  <div className={keymapStyles.mappingHelpRuleBlockHeader}>
                    <h5>{t('keymap.mappingHelpOutputTitle')}</h5>
                  </div>
                  <div className={keymapStyles.mappingHelpRuleGroups}>
                    {outputGroups.map(group => (
                      <section key={group.titleKey} className={keymapStyles.mappingHelpRuleGroup}>
                        <h6>{t(group.titleKey)}</h6>
                        {renderRuleList(group.keys, 'mappingHelpOutput')}
                      </section>
                    ))}
                  </div>
                </article>

                <article className={keymapStyles.mappingHelpRuleBlock}>
                  <div className={keymapStyles.mappingHelpRuleBlockHeader}>
                    <h5>{t('keymap.mappingHelpBehaviorTitle')}</h5>
                  </div>
                  {renderRuleList(behaviorKeys, 'mappingHelpBehavior')}
                </article>
              </div>
            </div>
          </section>

          <section ref={setSectionRef('advanced')} className={keymapStyles.mappingHelpSection}>
            <div className={keymapStyles.mappingHelpSectionHeader}>
              <h4>{t('keymap.mappingHelpSection_advanced')}</h4>
              <p>{t('keymap.mappingHelpSection_advanced_intro')}</p>
            </div>

            <div className={keymapStyles.mappingHelpAdvancedGrid}>
              <article className={`${keymapStyles.mappingHelpRuleBlock} ${keymapStyles.mappingHelpAdvancedPrimary}`}>
                <div className={keymapStyles.mappingHelpRuleBlockHeader}>
                  <h5>{t('keymap.mappingHelpTriggerModesTitle')}</h5>
                  <p>{t('keymap.mappingHelpTriggerModesIntro')}</p>
                </div>

                <div className={keymapStyles.mappingHelpTriggerRail}>
                  <div className={keymapStyles.mappingHelpTriggerState}>
                    <span>{t('keymap.mappingHelpSoftPull')}</span>
                    <strong>ZL / ZR</strong>
                  </div>
                  <div className={keymapStyles.mappingHelpTriggerRailArrow}>-&gt;</div>
                  <div className={keymapStyles.mappingHelpTriggerState}>
                    <span>{t('keymap.mappingHelpFullPull')}</span>
                    <strong>ZLF / ZRF</strong>
                  </div>
                </div>

                {renderRuleList(fullPullModeKeys, 'mappingHelpTriggerMode')}
              </article>

              <article className={keymapStyles.mappingHelpRuleBlock}>
                <div className={keymapStyles.mappingHelpRuleBlockHeader}>
                  <h5>{t('keymap.mappingHelpStickModesTitle')}</h5>
                </div>
                <ul className={keymapStyles.mappingHelpRuleList}>
                  {STICK_MODE_VALUES.map(mode => (
                    <li key={mode} className={keymapStyles.mappingHelpRuleRow}>
                      <strong>{formatStickModeLabel(mode, t)}</strong>
                      <span>{t(`keymap.mappingHelpStickMode_${mode}_desc`)}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className={keymapStyles.mappingHelpRuleBlock}>
                <div className={keymapStyles.mappingHelpRuleBlockHeader}>
                  <h5>{t('keymap.mappingHelpOutput_raw')}</h5>
                </div>
                <p className={keymapStyles.mappingHelpBlockText}>{t('keymap.mappingHelpOutput_raw_desc')}</p>
              </article>
            </div>

            <div className={keymapStyles.mappingHelpFooterNotes}>
              <p className={keymapStyles.mappingHelpNote}>{t('keymap.mappingHelpTimingNote')}</p>
              <p className={keymapStyles.mappingHelpNote}>{t('keymap.mappingHelpAdvancedNote')}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
