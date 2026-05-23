import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TelemetryDevice } from '../hooks/useTelemetry'
import { controllerButtonLabel, getPressedControllerButtons } from '../utils/controllerStatus'
import { controllerLabel, formatVidPid } from '../utils/controllers'
import { Card } from './Card'
import { ControllerStatusSvg } from './ControllerStatusSvg'
import styles from './ControllerStatusPage.module.css'

type ControllerStatusPageProps = {
  devices?: TelemetryDevice[]
  ignoredDevices?: string[]
}

type ControllerStatusDeviceCardProps = {
  device: TelemetryDevice
  ignoredDevices?: string[]
}

type MeterRowProps = {
  label: string
  value?: number
  digits?: number
  mode?: 'signed' | 'unsigned'
  maxAbs?: number
}

const formatValue = (value: number | undefined, digits = 2) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '0.00'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function MeterRow({ label, value = 0, digits = 2, mode = 'signed', maxAbs = 1 }: MeterRowProps) {
  const normalizedValue = Number.isFinite(value) ? value : 0
  const safeMaxAbs = maxAbs > 0 ? maxAbs : 1
  const fillWidth =
    mode === 'unsigned'
      ? `${clamp(normalizedValue / safeMaxAbs, 0, 1) * 100}%`
      : `${clamp(Math.abs(normalizedValue) / safeMaxAbs, 0, 1) * 50}%`

  const fillStyle: CSSProperties =
    mode === 'unsigned'
      ? { width: fillWidth }
      : normalizedValue >= 0
        ? { left: '50%', width: fillWidth }
        : { right: '50%', width: fillWidth }

  return (
    <div className={styles.metricRow}>
      <div className={styles.metricHeader}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles.metricValue}>{formatValue(normalizedValue, digits)}</span>
      </div>
      <div className={styles.meterTrack}>
        {mode === 'signed' && <span className={styles.meterCenterLine} />}
        <span
          className={`${styles.meterFill} ${
            mode === 'unsigned'
              ? styles.meterFillUnsigned
              : normalizedValue >= 0
                ? styles.meterFillPositive
                : styles.meterFillNegative
          }`}
          style={fillStyle}
        />
      </div>
    </div>
  )
}

function ControllerStatusDeviceCard({ device, ignoredDevices }: ControllerStatusDeviceCardProps) {
  const { t } = useTranslation()

  const vidPid = formatVidPid(device.vid, device.pid)
  const ignoreKey = vidPid.toLowerCase()
  const isIgnored = Boolean(vidPid) && ignoredDevices?.includes(ignoreKey)
  const pressedButtons = getPressedControllerButtons(device)
  const hasLeftSide = device.split !== 2
  const hasRightSide = device.split !== 1

  return (
    <Card className={styles.deviceCard}>
      <div className={styles.deviceHeader}>
        <div className={styles.deviceHeading}>
          <h3>{controllerLabel(device.type, t)}</h3>
          <div className={styles.deviceMeta}>
            <span>{t('controllerStatus.handleLabel', { handle: device.handle })}</span>
            {vidPid && <span>{t('controllerStatus.vidPidLabel', { value: vidPid })}</span>}
          </div>
        </div>
        <span className={`${styles.statusBadge} ${isIgnored ? styles.statusIgnored : styles.statusNormal}`}>
          {isIgnored ? t('controllerStatus.ignoredGyro') : t('controllerStatus.normalStatus')}
        </span>
      </div>

      {!device.status ? (
        <div className={styles.emptyInline}>{t('controllerStatus.noLiveStatus')}</div>
      ) : (
        <div className={styles.statusLayout}>
          <section className={`${styles.panel} ${styles.visualPanel}`}>
            <div className={styles.visualPanelHeader}>
              <div className={styles.panelTitle}>{t('controllerStatus.title')}</div>
            </div>
            <ControllerStatusSvg device={device} />
          </section>

          <div className={styles.detailPanels}>
            <section className={`${styles.panel} ${styles.buttonsPanel}`}>
              <div className={styles.panelTitle}>{t('controllerStatus.buttons')}</div>
              {pressedButtons.length > 0 ? (
                <div className={styles.buttonList}>
                  {pressedButtons.map(button => (
                    <span key={button.command} className={styles.buttonChip}>
                      {controllerButtonLabel(button)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyInline}>{t('controllerStatus.noButtons')}</div>
              )}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTitle}>{t('controllerStatus.sticks')}</div>
              <div className={styles.metricGrid}>
                {hasLeftSide && (
                  <>
                    <MeterRow label={t('controllerStatus.leftStickX')} value={device.status.leftStick.x} />
                    <MeterRow label={t('controllerStatus.leftStickY')} value={device.status.leftStick.y} />
                  </>
                )}
                {hasRightSide && (
                  <>
                    <MeterRow label={t('controllerStatus.rightStickX')} value={device.status.rightStick.x} />
                    <MeterRow label={t('controllerStatus.rightStickY')} value={device.status.rightStick.y} />
                  </>
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTitle}>{t('controllerStatus.triggers')}</div>
              <div className={styles.metricGrid}>
                {hasLeftSide && (
                  <MeterRow
                    label={t('controllerStatus.leftTrigger')}
                    value={device.status.triggers.left}
                    mode="unsigned"
                  />
                )}
                {hasRightSide && (
                  <MeterRow
                    label={t('controllerStatus.rightTrigger')}
                    value={device.status.triggers.right}
                    mode="unsigned"
                  />
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTitle}>{t('controllerStatus.gyro')}</div>
              <div className={styles.metricGrid}>
                <MeterRow label={t('controllerStatus.gyroX')} value={device.status.gyro.x} maxAbs={360} />
                <MeterRow label={t('controllerStatus.gyroY')} value={device.status.gyro.y} maxAbs={360} />
                <MeterRow label={t('controllerStatus.gyroZ')} value={device.status.gyro.z} maxAbs={360} />
              </div>
            </section>
          </div>
        </div>
      )}
    </Card>
  )
}

export function ControllerStatusPage({
  devices,
  ignoredDevices,
}: ControllerStatusPageProps) {
  const { t } = useTranslation()

  if (!devices || devices.length === 0) {
    return (
      <Card className={styles.pageCard}>
        <h2>{t('controllerStatus.title')}</h2>
        <p className="field-description">{t('controllerStatus.description')}</p>
        <div className={styles.emptyState}>
          <strong>{t('controllerStatus.noControllersTitle')}</strong>
          <p>{t('controllerStatus.noControllersDescription')}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className={styles.page}>
      <Card className={styles.pageCard}>
        <h2>{t('controllerStatus.title')}</h2>
        <p className="field-description">{t('controllerStatus.description')}</p>
      </Card>
      {devices.map(device => (
        <ControllerStatusDeviceCard key={device.handle} device={device} ignoredDevices={ignoredDevices} />
      ))}
    </div>
  )
}
