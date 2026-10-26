import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TelemetryDevice, TelemetrySample } from '../hooks/useTelemetry'
import { getPressedControllerCommandSet } from '../utils/controllerStatus'
import { keyboardEventToBinding, mouseButtonToBinding, wheelEventToBinding } from '../keymap/bindings'
import { gameEn, gameZh } from '../i18n/games'
import { CONTROLS, KEY_OPTIONS, createBasicGameProfile, createGameConfig, gameBindingDrift, readGameProfile, updateGameProfile, validateGameProfile, type GameAction, type GameProfile } from '../games/gameProfiles'
import { ControllerStatusSvg } from './ControllerStatusSvg'
import { desktopBridge } from '../platform/desktopBridge'
import { downloadGameProfile, prepareGameProfileExport } from '../games/exportGameProfile'
import { showToast } from '../utils/toast'
import styles from './GameProfilesPage.module.css'

const useCopy = () => { const { i18n } = useTranslation(); return { copy: i18n.resolvedLanguage?.startsWith('zh') ? gameZh : gameEn, zh: i18n.resolvedLanguage?.startsWith('zh') ?? false } }
const controlLabel = (button: string) => CONTROLS.find(([key]) => key === button)?.[1] ?? button
const hideUrl = 'https://github.com/nefarius/HidHide/releases'
const captureButtons = (device?: TelemetryDevice) => {
  const buttons = getPressedControllerCommandSet(device)
  const status = device?.status
  if (status) {
    if (status.triggers.left > 0.55) buttons.add('ZL')
    if (status.triggers.right > 0.55) buttons.add('ZR')
    if (status.leftStick.y > 0.65) buttons.add('LUP')
    if (status.leftStick.y < -0.65) buttons.add('LDOWN')
    if (status.leftStick.x < -0.65) buttons.add('LLEFT')
    if (status.leftStick.x > 0.65) buttons.add('LRIGHT')
  }
  return buttons
}

type Props = {
  configText: string; onChange: (text: string) => void; profileName: string | null
  sample: TelemetrySample | null; hasPendingChanges: boolean; isCalibrating: boolean
  onCreate: (name: string, text: string, applyNow: boolean) => Promise<void>
  onAdvanced: () => void; onSource: () => void; onGyro: () => void
  onLibrary?: () => void
}

function ActionEditor({ action, profile, onSave, onCancel, sample, isNew = false }: { action: GameAction; profile: GameProfile; onSave: (action: GameAction) => void; onCancel: () => void; sample: TelemetrySample | null; isNew?: boolean }) {
  const { copy, zh } = useCopy()
  const [draft, setDraft] = useState(action)
  const [capture, setCapture] = useState<'key' | 'pad' | null>(null)
  const devices = sample?.devices ?? []
  const [handle, setHandle] = useState(devices[0]?.handle ?? -1)
  const device = devices.find(d => d.handle === handle) ?? devices[0]
  const previousButtons = useRef<Set<string>>(new Set())
  const dialog = useRef<HTMLDialogElement>(null)
  const patch = (value: Partial<GameAction>) => setDraft(old => ({ ...old, ...value, confirmed: value.confirmed ?? false }))
  useEffect(() => { dialog.current?.showModal() }, [])
  useEffect(() => {
    if (!capture) return
    const stop = (key: string | null) => { if (key && KEY_OPTIONS.includes(key)) { setDraft(old => ({ ...old, key, confirmed: false })); setCapture(null) } }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setCapture(null); return }
      event.preventDefault(); event.stopPropagation()
      if (capture === 'key') stop(keyboardEventToBinding(event))
    }
    const mouse = (event: MouseEvent) => {
      if (capture !== 'key' || (event.target as HTMLElement).closest('[data-capture-cancel]')) return
      event.preventDefault(); event.stopPropagation(); stop(mouseButtonToBinding(event.button))
    }
    const wheel = (event: WheelEvent) => { if (capture === 'key') { event.preventDefault(); event.stopPropagation(); stop(wheelEventToBinding(event.deltaY)) } }
    window.addEventListener('keydown', keydown, true); window.addEventListener('mousedown', mouse, true); window.addEventListener('wheel', wheel, { capture: true, passive: false })
    return () => { window.removeEventListener('keydown', keydown, true); window.removeEventListener('mousedown', mouse, true); window.removeEventListener('wheel', wheel, true) }
  }, [capture])
  useEffect(() => {
    if (capture !== 'pad') return
    const pressed = captureButtons(device)
    const next = [...pressed].find(button => CONTROLS.some(([key]) => key === button) && !previousButtons.current.has(button))
    previousButtons.current = pressed
    if (next) { setDraft(old => ({ ...old, button: next, confirmed: false })); setCapture(null) }
  }, [capture, device])
  const next = { ...profile, actions: isNew ? [...profile.actions, draft] : profile.actions.map(a => a.id === draft.id ? draft : a) }
  const invalid = validateGameProfile(next).length > 0
  const missingName = !draft.zh.trim() || !draft.en.trim()
  return <dialog ref={dialog} className={styles.dialog} onCancel={event => { event.preventDefault(); if (capture) setCapture(null); else onCancel() }} aria-labelledby="game-action-title">
    <form onSubmit={event => { event.preventDefault(); if (!invalid && !capture) onSave(draft) }}>
      <header><div><small>{isNew ? copy.addAction : copy.edit}</small><h2 id="game-action-title">{isNew ? copy.addAction : zh ? action.zh : action.en}</h2></div><button type="button" className="secondary-btn" onClick={onCancel}>{copy.cancel}</button></header>
      <label>{copy.actionName}<input autoFocus required maxLength={120} value={zh ? draft.zh : draft.en} onChange={e => patch({ zh: e.target.value, en: e.target.value })} /></label>
      <label>{copy.key}<select value={draft.key} onChange={e => patch({ key: e.target.value })}>{KEY_OPTIONS.map(key => <option key={key}>{key}</option>)}</select></label>
      <button type="button" className="secondary-btn" onClick={() => setCapture('key')}>{copy.recordKey}</button>
      <label>{copy.control}<select value={draft.button} onChange={e => patch({ button: e.target.value })}><option value="">{copy.unassigned}</option>{CONTROLS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>{copy.gesture}<select value={draft.gesture} onChange={e => patch({ gesture: e.target.value as GameAction['gesture'] })}>{(['press', 'hold', 'chord'] as const).map(key => <option key={key} value={key}>{copy[key]}</option>)}</select></label>
      {draft.gesture === 'chord' && <label>{copy.modifier}<select value={draft.modifier} onChange={e => patch({ modifier: e.target.value })}><option value="">—</option>{CONTROLS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
      <label>{copy.device}<select value={device?.handle ?? -1} disabled={!devices.length || Boolean(capture)} onChange={e => setHandle(Number(e.target.value))}><option value={-1} disabled>{copy.noDevice}</option>{devices.map(d => <option key={d.handle} value={d.handle}>#{d.handle} · {d.vid?.toString(16)}:{d.pid?.toString(16)}</option>)}</select></label>
      <button type="button" className="secondary-btn" disabled={!device} onClick={() => { previousButtons.current = captureButtons(device); setCapture('pad') }}>{copy.recordPad}</button>
      {capture && <div className={styles.capture} role="status"><p>{capture === 'key' ? copy.capturingKey : copy.capturingPad}</p><button type="button" className="secondary-btn" data-capture-cancel onClick={() => setCapture(null)}>{copy.stopCapture}</button></div>}
      <p className={styles.hint}>{copy.holdHint}</p>
      <label className={styles.check}><input type="checkbox" checked={draft.confirmed} onChange={e => patch({ confirmed: e.target.checked })} />{copy.verifiedLabel}</label>
      {invalid && <p role="alert" className={styles.warning}>{missingName ? copy.nameRequired : copy.conflict}</p>}
      <footer><button type="submit" className="primary-btn" disabled={invalid || Boolean(capture)}>{copy.save}</button></footer>
    </form>
  </dialog>
}

function InlineCapture({ kind, device, onBinding, onCancel }: { kind: 'key' | 'pad'; device: TelemetryDevice; onBinding: (binding: string) => boolean; onCancel: () => void }) {
  const { copy } = useCopy()
  const [conflict, setConflict] = useState(false)
  const latest = useRef({ onBinding, onCancel })
  latest.current = { onBinding, onCancel }
  const previous = useRef({ handle: device.handle, buttons: captureButtons(device) })
  const accept = useRef((binding: string | null) => {
    if (binding && !latest.current.onBinding(binding)) setConflict(true)
  }).current
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      event.preventDefault(); event.stopPropagation()
      if (event.key === 'Escape') latest.current.onCancel()
      else if (kind === 'key' && !event.repeat) accept(keyboardEventToBinding(event))
    }
    const mouse = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-quick-cancel]')) return
      event.preventDefault(); event.stopPropagation()
      if (kind === 'key') accept(mouseButtonToBinding(event.button))
    }
    const wheel = (event: WheelEvent) => { event.preventDefault(); event.stopPropagation(); if (kind === 'key') accept(wheelEventToBinding(event.deltaY)) }
    const blur = () => latest.current.onCancel()
    window.addEventListener('keydown', key, true); window.addEventListener('mousedown', mouse, true)
    window.addEventListener('wheel', wheel, { capture: true, passive: false }); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', key, true); window.removeEventListener('mousedown', mouse, true); window.removeEventListener('wheel', wheel, true); window.removeEventListener('blur', blur) }
  }, [kind, accept])
  useEffect(() => {
    if (kind !== 'pad') return
    const buttons = captureButtons(device)
    if (previous.current.handle === device.handle) {
      const button = [...buttons].find(b => CONTROLS.some(([key]) => key === b) && !previous.current.buttons.has(b))
      if (button) accept(button)
    }
    previous.current = { handle: device.handle, buttons }
  }, [device, kind, accept])
  return <div className={styles.quickCapture} role="status"><div>{kind === 'key' ? copy.capturingKey : copy.capturingPad}{conflict && <p role="alert">{copy.conflict}</p>}</div><button type="button" className="secondary-btn" data-quick-cancel onClick={onCancel}>{copy.stopCapture}</button></div>
}

function Actions({ profile, onChange, sample, disabled = false }: { profile: GameProfile; onChange: (value: GameProfile) => void; sample: TelemetrySample | null; disabled?: boolean }) {
  const { copy, zh } = useCopy()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [newAction, setNewAction] = useState<GameAction | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [quick, setQuick] = useState<{ id: string; kind: 'key' | 'pad' } | null>(null)
  const [handle, setHandle] = useState<number | null>(null)
  const devices = sample?.devices ?? []
  const device = devices.find(d => d.handle === handle) ?? devices[0] ?? { handle: 0, type: 0 }
  const rows = profile.actions.filter(a => `${a.zh} ${a.en} ${a.key} ${controlLabel(a.button)}`.toLowerCase().includes(query.toLowerCase()))
  const selectedAction = profile.actions.find(a => a.id === selected)
  return <>
    <div className={styles.actionLayout}>
      <section className={styles.tableCard}>
        {quick && !disabled && <InlineCapture key={`${quick.id}-${quick.kind}`} kind={quick.kind} device={device} onCancel={() => setQuick(null)} onBinding={binding => {
          const actions = profile.actions.map(a => a.id === quick.id ? { ...a, [quick.kind === 'key' ? 'key' : 'button']: binding, confirmed: false } : a)
          if (validateGameProfile({ ...profile, actions }).length) return false
          onChange({ ...profile, actions }); setQuick(null); return true
        }} />}
        <div className={styles.filters}>{devices.length > 1 && <select aria-label={copy.device} value={device.handle} disabled={Boolean(quick)} onChange={e => setHandle(Number(e.target.value))}>{devices.map(d => <option key={d.handle} value={d.handle}>#{d.handle}</option>)}</select>}<input aria-label={copy.search} placeholder={copy.search} value={query} onChange={e => setQuery(e.target.value)} /><button type="button" className="secondary-btn" disabled={disabled || profile.actions.length >= 80} onClick={() => setNewAction({ id: `action-${crypto.randomUUID()}`, zh: '', en: '', group: 'combat', key: 'NONE', button: '', gesture: 'press', modifier: '', confirmed: false })}>{copy.addAction}</button></div>
        <div className={styles.tableScroll}><table><thead><tr><th>{copy.action}</th><th>{copy.key}</th><th>{copy.control}</th><th>{copy.operations}</th></tr></thead><tbody>{rows.map(a => <tr key={a.id} data-selected={selected === a.id}>
          <td><button type="button" disabled={disabled} onClick={() => { setSelected(a.id); setEditing(a.id) }}>{zh ? a.zh : a.en}</button></td>
          <td><button type="button" className={styles.bindingButton} disabled={disabled} aria-label={`${copy.quickKey} ${zh ? a.zh : a.en}`} title={copy.quickKey} onClick={() => { setSelected(a.id); setQuick({ id: a.id, kind: 'key' }) }}><kbd>{a.key}</kbd></button></td>
          <td><button type="button" className={styles.bindingButton} disabled={disabled || !devices.length} aria-label={`${copy.quickPad} ${zh ? a.zh : a.en}`} title={devices.length ? copy.quickPad : copy.noDevice} onClick={() => { setSelected(a.id); setQuick({ id: a.id, kind: 'pad' }) }}>{a.gesture === 'chord' && `${controlLabel(a.modifier)} + `}{a.button ? `${controlLabel(a.button)} · ${copy[a.gesture]}` : copy.unassigned}</button></td>
          <td><div className={styles.rowActions}>{deleting === a.id ? <><span>{copy.deleteConfirm}</span><button type="button" disabled={disabled} className={styles.deleteButton} onClick={() => { onChange({ ...profile, actions: profile.actions.filter(item => item.id !== a.id) }); setDeleting(null); if (selected === a.id) setSelected(null) }}>{copy.confirmDelete}</button><button type="button" onClick={() => setDeleting(null)}>{copy.cancel}</button></> : <><button type="button" disabled={disabled} aria-label={`${copy.settings} ${zh ? a.zh : a.en}`} onClick={() => { setSelected(a.id); setEditing(a.id) }}>{copy.settings}</button><button type="button" disabled={disabled} className={styles.deleteButton} aria-label={`${copy.delete} ${zh ? a.zh : a.en}`} onClick={() => setDeleting(a.id)}>{copy.delete}</button></>}</div></td>
        </tr>)}</tbody></table>{!rows.length && <p className={styles.hint}>{profile.actions.length ? copy.noResults : copy.noActions}</p>}</div>
      </section>
      <aside className={styles.preview}><h3>{copy.preview}</h3><p className={styles.hint}>{copy.quickHint}</p>
        <ControllerStatusSvg device={device} boundCommands={new Set(profile.actions.filter(a => a.button).map(a => a.button))} selectedCommand={selectedAction?.button} onSelectCommand={disabled ? undefined : button => { const matches = profile.actions.filter(a => a.button === button); const a = matches.find(a => a.id !== selected) ?? matches[0]; if (a) { setSelected(a.id); setEditing(a.id) } }} />
        {selectedAction && <p><strong>{zh ? selectedAction.zh : selectedAction.en}</strong> → <kbd>{selectedAction.key}</kbd></p>}
        <p className={styles.hint}>{copy.holdHint}</p>
      </aside>
    </div>
    {editing && !disabled && <ActionEditor key={editing} action={profile.actions.find(a => a.id === editing)!} profile={profile} sample={sample} onCancel={() => setEditing(null)} onSave={action => { onChange({ ...profile, actions: profile.actions.map(a => a.id === action.id ? action : a) }); setEditing(null) }} />}
    {newAction && !disabled && <ActionEditor key={newAction.id} action={newAction} isNew profile={profile} sample={sample} onCancel={() => setNewAction(null)} onSave={action => { onChange({ ...profile, actions: [...profile.actions, { ...action, zh: action.zh.trim(), en: action.en.trim() }] }); setSelected(action.id); setQuery(''); setNewAction(null) }} />}
  </>
}

function Wizard({ onCreate, onCancel, sample }: { onCreate: Props['onCreate']; onCancel: () => void; sample: Props['sample'] }) {
  const { copy } = useCopy()
  const [step, setStep] = useState(0), [profile, setProfile] = useState(() => createBasicGameProfile())
  const [name, setName] = useState('')
  const [starter, setStarter] = useState<'basic' | 'blank'>('basic')
  const [applyNow, setApplyNow] = useState(false)
  const [activation, setActivation] = useState<'aim' | 'always'>('aim')
  const [sensitivity, setSensitivity] = useState(1), [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const resolvedName = name.trim() || prepareGameProfileExport('', profile.gameName).fileName.replace(/\.txt$/i, '').slice(0, 70)
  const validName = Boolean(resolvedName) && resolvedName.length <= 70 && !/[<>:"/\\|?*]/.test(resolvedName) && ![...resolvedName].some(char => char.charCodeAt(0) < 32) && Boolean(profile.gameName.trim())
  const validActivation = activation === 'always' || Boolean(profile.actions.find(a => a.id === 'aim')?.button)
  const validGyro = Number.isFinite(sensitivity) && sensitivity > 0 && sensitivity <= 100
  return <div className={styles.wizard} aria-busy={busy}>
    <div className={styles.wizardHeader}><h2>{copy.new}</h2><button type="button" className="secondary-btn" disabled={busy} onClick={onCancel}>{copy.cancel}</button></div>
    <ol className={styles.steps}>{copy.steps.map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined}><span>{i + 1}</span>{label}</li>)}</ol>
    {step === 0 && <section className={styles.panel}>
      <h2>{copy.setupGame}</h2><p>{copy.scope}</p>
      <label>{copy.gameName}<input value={profile.gameName} placeholder={copy.gameNameHint} autoFocus maxLength={120} onChange={e => setProfile(old => ({ ...old, gameName: e.target.value }))} required /></label>
      <label>{copy.name}<input value={name} placeholder={copy.nameHint} maxLength={70} onChange={e => setName(e.target.value)} /></label>
      <fieldset><legend>{copy.mode}</legend>{(['keyboardMouse', 'nativeGyro'] as const).map(mode => <label key={mode} className={styles.mode}><input type="radio" name="game-mode" checked={profile.mode === mode} onChange={() => setProfile(old => ({ ...old, mode }))} /><span><strong>{copy[mode]}</strong><small>{copy[`${mode}Hint`]}</small></span></label>)}</fieldset>
      {profile.mode === 'keyboardMouse' && <fieldset><legend>{copy.startFrom}</legend>{(['basic', 'blank'] as const).map(value => <label key={value} className={styles.mode}><input type="radio" name="game-starter" checked={starter === value} onChange={() => { setStarter(value); setProfile(old => ({ ...old, actions: value === 'basic' ? createBasicGameProfile().actions : [] })); setActivation(value === 'basic' ? 'aim' : 'always') }} /><span><strong>{copy[value]}</strong><small>{copy[`${value}Hint`]}</small></span></label>)}</fieldset>}
      <p className={styles.hint}>{copy.createHint}</p>
    </section>}
    {step === 1 && <><p className={styles.notice}>{profile.mode === 'nativeGyro' ? copy.nativeNotice : copy.scope}</p>{profile.mode === 'keyboardMouse' && <Actions profile={profile} onChange={setProfile} sample={sample} />}</>}
    {step === 2 && <section className={styles.panel}>
      <h2>{copy.gyro}</h2><p className={styles.hint}>{copy.axisHint}</p>
      <label>{copy.activation}<select value={activation} onChange={e => setActivation(e.target.value as typeof activation)}><option value="aim" disabled={!profile.actions.find(a => a.id === 'aim')?.button}>{copy.aim}</option><option value="always">{copy.always}</option></select></label>
      {!validActivation && <p className={styles.warning}>{copy.noAim}</p>}
      <label>{copy.sensitivity}<input type="number" min="0.01" max="100" step="0.1" value={Number.isFinite(sensitivity) ? sensitivity : ''} onChange={e => setSensitivity(e.target.value === '' ? NaN : Number(e.target.value))} /></label><p className={styles.hint}>{copy.sensitivityHint}</p>
    </section>}
    {step === 3 && <section className={styles.panel}><h2>{profile.gameName}</h2><dl className={styles.summary}><dt>{copy.name}</dt><dd>{resolvedName}</dd><dt>{copy.mode}</dt><dd>{copy[profile.mode]}</dd><dt>{copy.gyro}</dt><dd>{copy[activation]} · {sensitivity} · Y / X</dd>{profile.mode === 'keyboardMouse' && <><dt>{copy.progress}</dt><dd>{profile.actions.filter(a => a.confirmed).length} / {profile.actions.length}</dd></>}</dl>
      <h3>{copy.checks}</h3>{profile.mode === 'keyboardMouse' && <><p>{copy.hide}</p><button type="button" className="secondary-btn" onClick={() => void desktopBridge.openExternal(hideUrl)}>{copy.download} ↗</button></>}
      <label className={styles.check}><input type="checkbox" checked={applyNow} onChange={e => setApplyNow(e.target.checked)} />{copy.applyAfterSave}</label>
      <p>{copy.holdAim}</p><p>{copy.test}</p><label className={styles.check}><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />{copy.acknowledge}</label><p className={styles.hint}>{copy.createHint}</p>
    </section>}
    {error && <p role="alert" className={styles.warning}>{error}</p>}
    <div className={styles.wizardFooter}><button type="button" className="secondary-btn" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>{copy.back}</button><span>{step + 1} / 4</span>{step < 3 ? <button type="button" className="primary-btn" disabled={!validName || step === 2 && (!validGyro || !validActivation)} onClick={() => setStep(step + 1)}>{copy.next}</button> : <button type="button" className="primary-btn" disabled={!ack || busy || !validName || !validGyro || !validActivation || validateGameProfile(profile).length > 0} onClick={async () => { setBusy(true); setError(''); try { await onCreate(resolvedName, createGameConfig({ ...profile, gameName: profile.gameName.trim() }, { axis: 'standard', activation, sensitivity }), applyNow) } catch (error) { console.error(error); setError(copy.error) } finally { setBusy(false) } }}>{busy ? copy.creating : applyNow ? copy.finishApply : copy.finish}</button>}</div>
  </div>
}

export function GameProfilesPage(props: Props) {
  const { copy } = useCopy()
  const profile = useMemo(() => readGameProfile(props.configText), [props.configText])
  const [wizard, setWizard] = useState(false), [restore, setRestore] = useState(false)
  const drift = profile ? gameBindingDrift(props.configText, profile) : []
  if (wizard) return <Wizard sample={props.sample} onCancel={() => setWizard(false)} onCreate={async (name, text, applyNow) => { await props.onCreate(name, text, applyNow); setWizard(false) }} />
  return <div className={styles.page}>
    <div className={styles.toolbar}><button type="button" className="primary-btn" disabled={props.hasPendingChanges || props.isCalibrating} onClick={() => setWizard(true)}>{copy.new}</button><div>
      <button type="button" className="secondary-btn" title={copy.exportHint} disabled={!props.configText.trim() || props.isCalibrating} onClick={() => { try { downloadGameProfile(props.configText, props.profileName || profile?.gameName || 'JSM-profile') } catch (error) { console.error(error); showToast(copy.exportError, 'error') } }}>{copy.export}</button>
      {props.onLibrary && <button type="button" className="secondary-btn" onClick={props.onLibrary}>{copy.library}</button>}
      <button type="button" className="secondary-btn" onClick={props.onGyro}>{copy.gyro}</button><button type="button" className="secondary-btn" onClick={props.onAdvanced}>{copy.advanced}</button><button type="button" className="secondary-btn" onClick={props.onSource}>{copy.source}</button></div></div>
    <p className={styles.hint}>{copy.share}</p>
    {props.hasPendingChanges && <p className={styles.notice}>{copy.pending}</p>}{props.isCalibrating && <p className={styles.notice}>{copy.locked}</p>}
    {!profile ? <section className={styles.empty}><div className={styles.gameMark} aria-hidden="true">＋</div><h2>{copy.empty}</h2><p>{copy.emptyHint}</p><p className={styles.hint}>{copy.unknown}</p><strong>{copy.template}</strong><p className={styles.hint}>{copy.scope}</p></section> : <>
      <section className={styles.gameHeader}><div className={styles.gameMark}>{profile.gameName.slice(0, 2)}</div><div><small>{copy.current} · {props.profileName}</small><h2>{profile.gameName}</h2><p>{copy[profile.mode]} · {copy.draft}</p></div>{profile.mode === 'keyboardMouse' && <div className={styles.progress}><strong>{profile.actions.filter(a => a.confirmed).length}<small> / {profile.actions.length}</small></strong><span>{copy.progress}</span></div>}</section>
      {drift.length > 0 && <div className={styles.warning}><strong>{copy.drift}{drift.join(', ')}</strong><p>{copy.driftHint}</p>{restore ? <><p>{copy.rebuildConfirm}</p><button type="button" className="primary-btn" disabled={props.isCalibrating} onClick={() => { props.onChange(updateGameProfile(props.configText, profile, profile, true)); setRestore(false) }}>{copy.restore}</button> <button type="button" className="secondary-btn" onClick={() => setRestore(false)}>{copy.cancel}</button></> : <button type="button" className="secondary-btn" onClick={() => setRestore(true)}>{copy.rebuild}</button>}</div>}
      {profile.mode === 'keyboardMouse' ? <Actions profile={profile} sample={props.sample} disabled={props.isCalibrating || Boolean(drift.length)} onChange={next => props.onChange(updateGameProfile(props.configText, profile, next))} /> : <p className={styles.notice}>{copy.nativeNotice}</p>}
      <details className={styles.panel}><summary>{copy.checks}</summary><p>{copy.scope}</p>{profile.mode === 'keyboardMouse' && <><p>{copy.hide}</p><button type="button" className="secondary-btn" onClick={() => void desktopBridge.openExternal(hideUrl)}>{copy.download} ↗</button></>}<p>{copy.holdAim}</p><p>{copy.test}</p></details>
    </>}
  </div>
}
