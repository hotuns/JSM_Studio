import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TelemetrySample } from '../hooks/useTelemetry'
import type { SensitivityValues } from '../utils/keymap'
import { controllerLabel } from '../utils/controllers'
import { getPressedControllerButtons, controllerButtonLabel } from '../utils/controllerStatus'
import { ControllerStatusSvg } from './ControllerStatusSvg'
import { StudioIcon } from './StudioIcon'
import type { StudioPage } from './StudioShell'
import styles from './StudioOverview.module.css'

type Props = {
  sample: TelemetrySample | null; profile: string | null; sensitivity: SensitivityValues
  sampleHz: string; mappingEnabled: boolean; onNavigate: (page: StudioPage) => void
}
const format = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—'

export function StudioOverview({ sample, profile, sensitivity, sampleHz, mappingEnabled, onNavigate }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<number | null>(null)
  const devices = sample?.devices ?? []
  const device = devices.find(device => device.handle === selected) ?? devices[0]
  const pressed = device ? getPressedControllerButtons(device) : []
  return <div className={styles.overview}>
    <div className={styles.metrics}>
      <div><span>{t('studio.controllerStatus')}</span><strong>{devices.length.toString().padStart(2, '0')}<small>{t(devices.length ? 'studio.connected' : 'studio.waiting')}</small></strong></div>
      <div title={t('studio.frequencyHelp')}><span>{t('studio.frequency')}</span><strong>{devices.length ? sampleHz : '—'}<small>Hz</small></strong></div>
      <div><span>{t('studio.profile')}</span><strong className={styles.profileMetric}>{profile || '—'}</strong></div>
      <div><span>{t('app.profileSummary.mappingOutput')}</span><strong className={styles.stateMetric}><i className={mappingEnabled ? styles.online : ''} />{t(mappingEnabled ? 'studio.outputOn' : 'studio.outputOff')}</strong></div>
    </div>
    <section className={styles.quickActions} aria-label={t('studio.start')}>
      {([{ page: 'games', title: 'configureGame' }, { page: 'gyro', title: 'configureMotion' }, { page: 'profiles', title: 'manageProfiles' }] as const).map(({ page, title }) =>
        <button type="button" key={page} onClick={() => onNavigate(page)}><span className={styles.actionIcon}><StudioIcon name={page} size={23} /></span><span><strong>{t(`studio.${title}`)}</strong><small>{t(`studio.${title}Desc`)}</small></span><StudioIcon name="arrow" size={18} /></button>)}
    </section>
    <div className={styles.dashboard}>
      <section className={styles.liveCard}>
        <div className={styles.cardHeading}><div><span className={styles.eyebrow}>INPUT MONITOR</span><h2>{t('studio.live')}</h2></div>
          <button type="button" className={styles.textButton} onClick={() => onNavigate('controllerStatus')}>{t('studio.inspect')}<StudioIcon name="arrow" size={16} /></button></div>
        {device ? <>
          <div className={styles.deviceLabel}><span className={styles.onlineDot} />
            {devices.length > 1 ? <select aria-label={t('studio.deviceSelector')} value={device.handle} onChange={event => setSelected(Number(event.target.value))}>
              {devices.map(item => <option key={item.handle} value={item.handle}>{controllerLabel(item.type, t)} · #{item.handle}</option>)}
            </select> : <strong>{controllerLabel(device.type, t)}</strong>}
            <span className={styles.deviceId}>#{device.handle}</span>
          </div>
          <div className={styles.controllerStage}><ControllerStatusSvg device={device} /></div>
          <div className={styles.inputReadout}>
            <div><span>{t('controllerStatus.gyroX')}</span><strong>{format(device.status?.gyro.x)}</strong></div>
            <div><span>{t('controllerStatus.gyroY')}</span><strong>{format(device.status?.gyro.y)}</strong></div>
            <div><span>{t('controllerStatus.gyroZ')}</span><strong>{format(device.status?.gyro.z)}</strong></div>
            <small>°/s</small>
          </div>
          <div className={styles.pressedRow}>{pressed.length ? pressed.slice(0, 10).map(button => <span key={button.command}>{controllerButtonLabel(button)}</span>) : <p>{t(device.status ? 'studio.liveHint' : 'studio.notAvailable')}</p>}
            {pressed.length > 10 && <span>+{pressed.length - 10}</span>}</div>
        </> : <div className={styles.emptyState}><span className={styles.emptyIcon}><StudioIcon name="controllerStatus" size={72} /></span>
          <h3>{t('studio.waiting')}</h3><p>{t('studio.waitingDesc')}</p><button type="button" className="primary-btn" onClick={() => onNavigate('controllerStatus')}>{t('studio.controllerStatus')}<StudioIcon name="arrow" size={16} /></button></div>}
      </section>
      <div className={styles.rightColumn}>
        <section className={styles.sessionCard}><span className={styles.eyebrow}>PROFILE SNAPSHOT</span><h2>{t('studio.session')}</h2>
          <div className={styles.sessionProfile}><StudioIcon name="profiles" /><span>{profile || t('studio.noProfile')}</span></div>
          <dl><div><dt>{t('studio.sensitivity')}</dt><dd>{format(sensitivity.gyroSensX ?? sensitivity.minSensX)} / {format(sensitivity.gyroSensY ?? sensitivity.minSensY)}</dd></div>
            <div><dt>{t('studio.filter')}</dt><dd>{t(sensitivity.oneEuroFilter ? 'studio.enabled' : 'studio.disabled')}</dd></div>
            <div><dt>{t('gyro.gyroSpace')}</dt><dd>{sensitivity.gyroSpace || 'LOCAL'}</dd></div></dl>
          <button className={styles.textButton} type="button" onClick={() => onNavigate('profiles')}>{t('studio.manageProfiles')}<StudioIcon name="arrow" size={16} /></button>
        </section>
        <section className={styles.guideCard}><h2>{t('studio.guide')}</h2><ol>{(['controllerStatus', 'gyro', 'profiles'] as const).map((page, index) =>
          <li key={page}><span>{index + 1}</span><button type="button" onClick={() => onNavigate(page)}><strong>{t(`studio.guide${index + 1}`)}</strong><small>{t(`studio.guide${index + 1}Desc`)}</small></button></li>)}</ol></section>
      </div>
    </div>

  </div>
}
