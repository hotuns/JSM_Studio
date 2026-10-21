import { type CSSProperties, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TelemetryDevice } from '../hooks/useTelemetry'
import { desktopBridge } from '../platform/desktopBridge'
import { EXTENDED_CONTROLLER_BUTTONS, controllerButtonLabel, getPressedControllerButtons } from '../utils/controllerStatus'
import { controllerLabel, formatVidPid } from '../utils/controllers'
import { showToast } from '../utils/toast'
import { Card } from './Card'
import { ControllerStatusSvg } from './ControllerStatusSvg'
import styles from './ControllerStatusPage.module.css'

const HIDHIDE_RELEASES_URL = 'https://github.com/nefarius/HidHide/releases/latest'

type ControllerStatusPageProps = {
  devices?: TelemetryDevice[]
  ignoredDevices?: string[]
}

type ControllerStatusDeviceCardProps = {
  device: TelemetryDevice
  ignoredDevices?: string[]
}

type ControllerConnectionPanelProps = {
  connectedDevices?: TelemetryDevice[]
  priority?: boolean
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

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

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
  const pressedCommands = new Set(pressedButtons.map(button => button.command))
  const pressedExtendedCount = EXTENDED_CONTROLLER_BUTTONS.filter(button => pressedCommands.has(button.command)).length
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
            <section className={styles.extendedInputs} aria-label={t('controllerStatus.extendedButtons')}>
              <div className={styles.extendedHeader}>
                <h4 className={styles.panelTitle}>{t('controllerStatus.extendedButtons')}</h4>
                <span className={styles.cardMetric}>
                  {t('controllerStatus.extendedPressedCount', { count: pressedExtendedCount })}
                </span>
              </div>
              <p className={styles.extendedHint}>{t('controllerStatus.extendedButtonsHint')}</p>
              <div className={styles.extendedGrid}>
                {EXTENDED_CONTROLLER_BUTTONS.map(button => {
                  const pressed = pressedCommands.has(button.command)
                  return (
                    <div
                      key={button.command}
                      className={`${styles.extendedInput} ${pressed ? styles.extendedInputPressed : ''}`}
                      aria-label={`${button.command}: ${t(button.descriptionKey)}, ${t(pressed ? 'controllerStatus.inputPressed' : 'controllerStatus.inputReleased')}`}
                    >
                      <div className={styles.extendedInputTop}>
                        <strong>{button.command}</strong>
                        <span className={styles.extendedIndicator} aria-hidden="true" />
                      </div>
                      <span className={styles.extendedInputDescription}>{t(button.descriptionKey)}</span>
                    </div>
                  )
                })}
              </div>
            </section>
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

function ControllerConnectionStatusPanel({ connectedDevices, priority = false }: ControllerConnectionPanelProps) {
  const { t } = useTranslation()
  const [reconnecting, setReconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectedCount = connectedDevices?.length ?? 0
  const connected = connectedCount > 0

  const reconnectControllers = () => {
    if (reconnecting) {
      return
    }

    setReconnecting(true)
    void desktopBridge.reconnectJsmControllers()
      .then(result => {
        setError(null)
        showToast(
          result.restarted
            ? t('messages.controllerReconnectRestarted')
            : t('messages.controllerReconnectRequested'),
        )
      })
      .catch(reconnectError => {
        const message = getErrorMessage(reconnectError)
        setError(message)
        showToast(t('messages.controllerReconnectFailed', { error: message }), 'error')
      })
      .finally(() => {
        setReconnecting(false)
      })
  }

  return (
    <Card className={`${styles.pageCard} ${styles.connectionCard} ${priority ? styles.connectionCardPriority : ''}`}>
      <div className={styles.connectionHeader}>
        <div className={styles.connectionHeading}>
          <h2>
            {connected
              ? t('controllerStatus.connectionConnectedTitle')
              : t('controllerStatus.connectionRequiredTitle')}
          </h2>
          <span className={`${styles.cardMetric} ${connected ? styles.cardMetricSuccess : styles.cardMetricWarn}`}>
            {connected
              ? t('controllerStatus.connectionConnectedCount', { count: connectedCount })
              : t('controllerStatus.connectionDisconnected')}
          </span>
        </div>
        <div className={styles.connectionActions}>
          <button
            type="button"
            className={connected ? 'secondary-btn' : 'primary-btn'}
            onClick={reconnectControllers}
            disabled={reconnecting}
          >
            {reconnecting ? t('controllerStatus.connectionReconnecting') : t('controllerStatus.connectionReconnect')}
          </button>
        </div>
      </div>

      <div className={`${styles.connectionStateBox} ${connected ? styles.connectionStateConnected : styles.connectionStateMissing}`}>
        <div className={styles.connectionStateTitle}>
          {connected
            ? t('controllerStatus.connectionConnectedStateTitle', { count: connectedCount })
            : t('controllerStatus.connectionMissingStateTitle')}
        </div>
        <p>
          {connected
            ? t('controllerStatus.connectionConnectedStateBody')
            : t('controllerStatus.connectionMissingStateBody')}
        </p>
      </div>

      {error && (
        <div className={`${styles.hidHideNotice} ${styles.hidHideNoticeError}`}>
          {t('controllerStatus.connectionError', { error })}
        </div>
      )}
    </Card>
  )
}

function HidHidePanel() {
  const { t } = useTranslation()
  return (
    <Card className={`${styles.pageCard} ${styles.hidHideCard}`}>
      <div className={styles.hidHideHeader}>
        <div className={styles.hidHideHeading}>
          <h2>{t('controllerStatus.hidHideTitle')}</h2>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => void desktopBridge.openExternal(HIDHIDE_RELEASES_URL)
            .catch(error => showToast(t('messages.hidHideOpenFailed', { error: getErrorMessage(error) }), 'error'))}
        >
          {t('controllerStatus.hidHideDownloadButton')}
        </button>
      </div>
      <p>{t('controllerStatus.hidHideDescription')}</p>
    </Card>
  )
}

export function ControllerStatusPage({
  devices,
  ignoredDevices,
}: ControllerStatusPageProps) {
  const hasConnectedDevices = Boolean(devices?.length)

  if (!hasConnectedDevices) {
    return (
      <div className={styles.page}>
        <div className={styles.controlGrid}>
          <ControllerConnectionStatusPanel connectedDevices={devices} priority />
          <HidHidePanel />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.controlGrid}>
        <ControllerConnectionStatusPanel connectedDevices={devices} />
        <HidHidePanel />
      </div>

      {devices?.map(device => (
        <ControllerStatusDeviceCard key={device.handle} device={device} ignoredDevices={ignoredDevices} />
      ))}
    </div>
  )
}
