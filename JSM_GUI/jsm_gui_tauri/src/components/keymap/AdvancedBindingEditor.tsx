import { useTranslation } from 'react-i18next'
import {
  BindingActionModifier,
  BindingEventModifier,
  BindingToken,
  BindingTokenKind,
} from '../../utils/keymap'
import keymapStyles from '../Keymap.module.css'

type AdvancedBindingEditorProps = {
  tokens: BindingToken[]
  captureLabel: string
  canSwitchToSimple: boolean
  onSwitchToSimple?: () => void
  isCapturingToken: (index: number) => boolean
  onCaptureToken: (index: number) => void
  onCancelCapture: () => void
  onTokenKindChange: (index: number, kind: BindingTokenKind) => void
  onTokenValueChange: (index: number, value: string) => void
  onTokenActionModifierChange: (index: number, value: BindingActionModifier) => void
  onTokenEventModifierChange: (index: number, value: BindingEventModifier) => void
  onMoveToken: (index: number, direction: -1 | 1) => void
  onRemoveToken: (index: number) => void
  onAddToken: () => void
  specialOptions: Array<{ value: string; label: string }>
}

const TOKEN_KIND_OPTIONS: Array<{ value: BindingTokenKind; labelKey: string }> = [
  { value: 'input', labelKey: 'keymap.advancedTokenInput' },
  { value: 'mouse', labelKey: 'keymap.advancedTokenMouse' },
  { value: 'wheel', labelKey: 'keymap.advancedTokenWheel' },
  { value: 'special', labelKey: 'keymap.advancedTokenSpecial' },
  { value: 'console_command', labelKey: 'keymap.advancedTokenCommand' },
  { value: 'raw_literal', labelKey: 'keymap.advancedTokenRaw' },
]

const ACTION_OPTIONS: Array<{ value: BindingActionModifier; labelKey: string; fallback: string }> = [
  { value: '', labelKey: 'keymap.advancedActionDefault', fallback: 'Default' },
  { value: '^', labelKey: 'keymap.advancedActionToggle', fallback: '^ Toggle' },
  { value: '!', labelKey: 'keymap.advancedActionInstant', fallback: '! Instant' },
  { value: '-', labelKey: 'keymap.advancedActionRelease', fallback: '- Release' },
]

const EVENT_OPTIONS: Array<{ value: BindingEventModifier; labelKey: string; fallback: string }> = [
  { value: '', labelKey: 'keymap.advancedEventDefault', fallback: 'Default' },
  { value: '\\', labelKey: 'keymap.advancedEventStart', fallback: '\\ Start' },
  { value: '/', labelKey: 'keymap.advancedEventRelease', fallback: '/ Release' },
  { value: "'", labelKey: 'keymap.advancedEventTap', fallback: "' Tap" },
  { value: '_', labelKey: 'keymap.advancedEventHold', fallback: '_ Hold' },
  { value: '+', labelKey: 'keymap.advancedEventTurbo', fallback: '+ Turbo' },
]

const mouseOptions = ['LMOUSE', 'MMOUSE', 'RMOUSE', 'BMOUSE', 'FMOUSE']
const wheelOptions = ['SCROLLUP', 'SCROLLDOWN']

const tokenCaptureAllowed = (kind: BindingTokenKind) => kind === 'input' || kind === 'mouse' || kind === 'wheel'

export const AdvancedBindingEditor = ({
  tokens,
  captureLabel,
  canSwitchToSimple,
  onSwitchToSimple,
  isCapturingToken,
  onCaptureToken,
  onCancelCapture,
  onTokenKindChange,
  onTokenValueChange,
  onTokenActionModifierChange,
  onTokenEventModifierChange,
  onMoveToken,
  onRemoveToken,
  onAddToken,
  specialOptions,
}: AdvancedBindingEditorProps) => {
  const { t } = useTranslation()

  return (
    <div className={keymapStyles.advancedEditor} data-capture-ignore="true">
      <div className={keymapStyles.advancedEditorHeader}>
        <span className={keymapStyles.advancedEditorBadge}>{t('keymap.advancedEditorLabel')}</span>
        {canSwitchToSimple && onSwitchToSimple && (
          <button type="button" className="link-btn" onClick={onSwitchToSimple}>
            {t('keymap.useSimpleEditor')}
          </button>
        )}
      </div>

      <div className={keymapStyles.advancedTokenList}>
        {tokens.map((token, index) => {
          const isCapturing = isCapturingToken(index)
          return (
            <div key={`${token.raw || token.value || token.kind}-${index}`} className={keymapStyles.advancedTokenRow}>
              <div className={keymapStyles.advancedTokenToolbar}>
                <select
                  className="app-select"
                  value={token.kind}
                  onChange={(event) => onTokenKindChange(index, event.target.value as BindingTokenKind)}
                >
                  {TOKEN_KIND_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>

                <select
                  className="app-select"
                  value={token.actionModifier}
                  onChange={(event) => onTokenActionModifierChange(index, event.target.value as BindingActionModifier)}
                >
                  {ACTION_OPTIONS.map(option => (
                    <option key={option.value || 'default'} value={option.value}>
                      {t(option.labelKey, { defaultValue: option.fallback })}
                    </option>
                  ))}
                </select>

                <select
                  className="app-select"
                  value={token.eventModifier}
                  onChange={(event) => onTokenEventModifierChange(index, event.target.value as BindingEventModifier)}
                >
                  {EVENT_OPTIONS.map(option => (
                    <option key={option.value || 'default'} value={option.value}>
                      {t(option.labelKey, { defaultValue: option.fallback })}
                    </option>
                  ))}
                </select>
              </div>

              <div className={keymapStyles.advancedTokenValueRow}>
                {token.kind === 'special' ? (
                  <select
                    className="app-select"
                    value={token.value}
                    onChange={(event) => onTokenValueChange(index, event.target.value)}
                  >
                    {specialOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : token.kind === 'mouse' ? (
                  <select
                    className="app-select"
                    value={token.value}
                    onChange={(event) => onTokenValueChange(index, event.target.value)}
                  >
                    {mouseOptions.map(value => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                ) : token.kind === 'wheel' ? (
                  <select
                    className="app-select"
                    value={token.value}
                    onChange={(event) => onTokenValueChange(index, event.target.value)}
                  >
                    {wheelOptions.map(value => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={token.value}
                    onChange={(event) => onTokenValueChange(index, event.target.value)}
                    placeholder={
                      token.kind === 'console_command' ? t('keymap.advancedCommandPlaceholder') : t('keymap.advancedValuePlaceholder')
                    }
                  />
                )}

                {tokenCaptureAllowed(token.kind) && (
                  <button type="button" className={keymapStyles.advancedCaptureBtn} onClick={() => onCaptureToken(index)}>
                    {isCapturing ? captureLabel : t('keymap.captureToken')}
                  </button>
                )}
                {isCapturing && (
                  <button type="button" className="link-btn" onClick={onCancelCapture}>
                    {t('common.cancel')}
                  </button>
                )}
              </div>

              <div className={keymapStyles.advancedTokenActions}>
                <button type="button" className="link-btn" onClick={() => onMoveToken(index, -1)} disabled={index === 0}>
                  {t('keymap.moveTokenUp')}
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => onMoveToken(index, 1)}
                  disabled={index === tokens.length - 1}
                >
                  {t('keymap.moveTokenDown')}
                </button>
                <button type="button" className={keymapStyles.advancedRemoveBtn} onClick={() => onRemoveToken(index)}>
                  {t('keymap.removeToken')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className={keymapStyles.advancedEditorFooter}>
        <button type="button" className="secondary-btn" onClick={onAddToken}>
          {t('keymap.addToken')}
        </button>
      </div>
    </div>
  )
}
