import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TelemetryDevice } from '../hooks/useTelemetry'
import {
  desktopBridge,
  type ControllerCandidate,
  type HidHideDevice,
  type HidHideStatus,
} from '../platform/desktopBridge'
import { controllerButtonLabel, getPressedControllerButtons } from '../utils/controllerStatus'
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

type HidHidePanelProps = {
  telemetryDevices?: TelemetryDevice[]
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

const getTelemetryMatchKey = (device: Pick<TelemetryDevice, 'vid' | 'pid'>) =>
  device.vid && device.pid ? `${device.vid}:${device.pid}` : null

const getHidHideMatchKey = (device: Pick<HidHideDevice, 'vendorId' | 'productId'>) =>
  device.vendorId && device.productId ? `${device.vendorId}:${device.productId}` : null

const getCandidateMatchKey = (device: Pick<ControllerCandidate, 'vendorId' | 'productId'>) =>
  device.vendorId && device.productId ? `${device.vendorId}:${device.productId}` : null

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

function ControllerConnectionPanel({ connectedDevices, priority = false }: ControllerConnectionPanelProps) {
  const { t } = useTranslation()
  const [candidates, setCandidates] = useState<ControllerCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingId, setConnectingId] = useState<number | null>(null)
  const [connectedCandidateIds, setConnectedCandidateIds] = useState<Set<number>>(() => new Set())
  const [error, setError] = useState<string | null>(null)

  const connectedKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const device of connectedDevices ?? []) {
      const key = getTelemetryMatchKey(device)
      if (key) {
        keys.add(key)
      }
    }
    return keys
  }, [connectedDevices])

  const refreshCandidates = async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true)
    }
    try {
      const nextCandidates = await desktopBridge.listJsmControllers()
      setCandidates(nextCandidates)
      setError(null)
    } catch (refreshError) {
      const message = getErrorMessage(refreshError)
      setError(message)
      showToast(t('messages.controllerListFailed', { error: message }), 'error')
    } finally {
      if (showSpinner) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void refreshCandidates()
  }, [])

  const connectCandidate = (candidate: ControllerCandidate) => {
    if (connectingId !== null) {
      return
    }

    setConnectingId(candidate.deviceId)
    void desktopBridge.connectJsmControllers([candidate.deviceId])
      .then(() => {
        setError(null)
        setConnectedCandidateIds(previous => new Set(previous).add(candidate.deviceId))
        showToast(t('messages.controllerConnected', { name: candidate.name }))
      })
      .catch(connectError => {
        const message = getErrorMessage(connectError)
        setError(message)
        showToast(t('messages.controllerConnectFailed', { error: message }), 'error')
      })
      .finally(() => {
        setConnectingId(null)
      })
  }

  const connectedCount = connectedDevices?.length ?? 0
  const connecting = connectingId !== null

  return (
    <Card className={`${styles.pageCard} ${styles.connectionCard} ${priority ? styles.connectionCardPriority : ''}`}>
      <div className={styles.connectionHeader}>
        <div className={styles.connectionHeading}>
          <h2>
            {priority
              ? t('controllerStatus.connectionRequiredTitle')
              : t('controllerStatus.connectionTitle')}
          </h2>
          <p className="field-description">
            {priority
              ? t('controllerStatus.connectionRequiredDescription')
              : t('controllerStatus.connectionDescription')}
          </p>
        </div>
        <div className={styles.connectionActions}>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void refreshCandidates()}
            disabled={loading || connecting}
          >
            {loading ? t('common.refreshing') : t('controllerStatus.connectionRefresh')}
          </button>
        </div>
      </div>

      <div className={styles.connectionSummary}>
        <span className={`${styles.hidHideChip} ${connectedCount > 0 ? styles.hidHideChipPositive : styles.hidHideChipMuted}`}>
          {t('controllerStatus.connectionConnectedCount', { count: connectedCount })}
        </span>
        <span className={`${styles.hidHideChip} ${styles.hidHideChipMuted}`}>
          {t('controllerStatus.connectionCandidateCount', { count: candidates.length })}
        </span>
      </div>

      {error && (
        <div className={`${styles.hidHideNotice} ${styles.hidHideNoticeError}`}>
          {t('controllerStatus.connectionError', { error })}
        </div>
      )}

      {loading && candidates.length === 0 ? (
        <div className={styles.emptyInline}>{t('common.refreshing')}</div>
      ) : candidates.length === 0 ? (
        <div className={`${styles.hidHideNotice} ${styles.hidHideNoticeMuted}`}>
          {t('controllerStatus.connectionNoCandidates')}
        </div>
      ) : (
        <div className={styles.connectionList}>
          {candidates.map(candidate => {
            const isConnecting = connectingId === candidate.deviceId
            const matchKey = getCandidateMatchKey(candidate)
            const isConnected = connectedCandidateIds.has(candidate.deviceId) || (matchKey ? connectedKeys.has(matchKey) : false)
            const vidPid = formatVidPid(candidate.vendorId ?? undefined, candidate.productId ?? undefined)
            return (
              <button
                type="button"
                key={candidate.deviceId}
                className={`${styles.connectionRow} ${
                  isConnected || isConnecting ? styles.connectionRowSelected : ''
                } ${isConnected ? styles.connectionRowConnected : ''}`}
                onClick={() => connectCandidate(candidate)}
                disabled={connecting || isConnected}
              >
                <span className={styles.connectionCheckmark} />
                <span className={styles.connectionDeviceMain}>
                  <span className={styles.connectionDeviceTitle}>
                    <strong>{candidate.name}</strong>
                    <span className={`${styles.hidHidePill} ${isConnecting ? styles.hidHidePillWarn : styles.hidHidePillMuted}`}>
                      {isConnecting
                        ? t('controllerStatus.connectionConnecting')
                        : isConnected
                          ? t('controllerStatus.connectionConnected')
                        : t('controllerStatus.connectionClickToConnect')}
                    </span>
                  </span>
                  <span className={styles.connectionDeviceMeta}>
                    <span>{t('controllerStatus.connectionDeviceId', { id: candidate.deviceId })}</span>
                    {vidPid && <span>{t('controllerStatus.vidPidLabel', { value: vidPid })}</span>}
                    <span>
                      {candidate.isGamepad
                        ? t('controllerStatus.connectionGamepad')
                        : t('controllerStatus.connectionJoystick')}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function HidHidePanel({ telemetryDevices }: HidHidePanelProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<HidHideStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const telemetryKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const device of telemetryDevices ?? []) {
      const key = getTelemetryMatchKey(device)
      if (key) {
        keys.add(key)
      }
    }
    return keys
  }, [telemetryDevices])

  const decoratedDevices = useMemo(() => {
    if (!status) {
      return []
    }
    return status.devices.map(device => {
      const matchKey = getHidHideMatchKey(device)
      const likelyCurrentController = matchKey
        ? telemetryKeys.has(matchKey)
        : device.likelyCurrentController
      return {
        ...device,
        likelyCurrentController,
      }
    })
  }, [status, telemetryKeys])

  const heuristicAmbiguous = useMemo(() => {
    const counts = new Map<string, number>()
    for (const device of decoratedDevices) {
      if (!device.likelyCurrentController) {
        continue
      }
      const matchKey = getHidHideMatchKey(device)
      if (!matchKey) {
        continue
      }
      counts.set(matchKey, (counts.get(matchKey) ?? 0) + 1)
    }
    return Array.from(counts.values()).some(count => count > 1)
  }, [decoratedDevices])

  const refreshStatus = async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true)
    }
    try {
      const nextStatus = await desktopBridge.getHidHideStatus()
      setStatus(nextStatus)
      setError(null)
    } catch (refreshError) {
      setError(getErrorMessage(refreshError))
    } finally {
      if (showSpinner) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void refreshStatus()
  }, [])

  const runStatusAction = async (
    actionKey: string,
    action: () => Promise<HidHideStatus>,
    successMessage?: string,
  ) => {
    setBusyKey(actionKey)
    try {
      const nextStatus = await action()
      setStatus(nextStatus)
      setError(null)
      if (successMessage) {
        showToast(successMessage)
      }
    } catch (actionError) {
      const message = getErrorMessage(actionError)
      setError(message)
      showToast(t('messages.hidHideUpdateFailed', { error: message }), 'error')
    } finally {
      setBusyKey(null)
      setLoading(false)
    }
  }

  const handleToggleActive = () => {
    if (!status) {
      return
    }
    const nextActive = !status.active
    void runStatusAction(
      'hidhide:active',
      () => desktopBridge.setHidHideActive(nextActive),
      nextActive ? t('messages.hidHideEnabled') : t('messages.hidHideDisabled'),
    )
  }

  const handleRepairWhitelist = () => {
    void runStatusAction(
      'hidhide:whitelist',
      () => desktopBridge.syncHidHideWhitelist(),
      t('messages.hidHideWhitelistSynced'),
    )
  }

  const handleToggleDevice = (device: HidHideDevice) => {
    if (device.hidden && !device.managedByApp && !device.stale) {
      return
    }

    const nextHidden = device.stale ? false : !device.hidden
    const successMessage = nextHidden
      ? t('messages.hidHideDeviceHidden', { name: device.displayName })
      : t('messages.hidHideDeviceVisible', { name: device.displayName })

    void runStatusAction(
      `hidhide:${device.instanceId}`,
      () => desktopBridge.setHidHideDeviceHidden(device.instanceId, nextHidden),
      successMessage,
    )
  }

  const openInstallGuide = () => {
    void desktopBridge.openExternal(HIDHIDE_RELEASES_URL)
  }

  const handleInstallHidHide = () => {
    setBusyKey('hidhide:install')
    void desktopBridge.installBundledHidHide()
      .then(result => {
        setStatus(result.status)
        setError(null)
        showToast(
          result.status.installed
            ? t('messages.hidHideInstallCompleted')
            : t('messages.hidHideInstallNeedsRefresh'),
        )
        void refreshStatus(false)
      })
      .catch(installError => {
        const message = getErrorMessage(installError)
        setError(message)
        showToast(t('messages.hidHideUpdateFailed', { error: message }), 'error')
      })
      .finally(() => {
        setBusyKey(null)
        setLoading(false)
      })
  }

  const handleOpenHidHide = () => {
    setBusyKey('hidhide:open')
    void desktopBridge.openHidHideClient()
      .then(() => {
        setError(null)
        showToast(t('messages.hidHideClientOpened'))
      })
      .catch(openError => {
        const message = getErrorMessage(openError)
        setError(message)
        showToast(t('messages.hidHideOpenFailed', { error: message }), 'error')
      })
      .finally(() => {
        setBusyKey(null)
      })
  }

  const hasActionInFlight = busyKey !== null
  const hidHideControlsLocked = hasActionInFlight || status?.requiresElevation === true
  const hidHideInstallBusy = busyKey === 'hidhide:install'
  const hidHideOpenBusy = busyKey === 'hidhide:open'

  return (
    <Card className={`${styles.pageCard} ${styles.hidHideCard}`}>
      <div className={styles.hidHideHeader}>
        <div className={styles.hidHideHeading}>
          <h2>{t('controllerStatus.hidHideTitle')}</h2>
          <p className="field-description">{t('controllerStatus.hidHideDescription')}</p>
        </div>
        <div className={styles.hidHideActions}>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void refreshStatus()}
            disabled={loading || hasActionInFlight}
          >
            {loading ? t('common.refreshing') : t('controllerStatus.hidHideRefresh')}
          </button>
          {status?.installed && (
            <button
              type="button"
              className="secondary-btn"
              onClick={handleOpenHidHide}
              disabled={hasActionInFlight}
            >
              {hidHideOpenBusy ? t('common.refreshing') : t('controllerStatus.hidHideOpenClient')}
            </button>
          )}
          {status?.installed && (
            <button
              type="button"
              className="secondary-btn"
              onClick={handleRepairWhitelist}
              disabled={hidHideControlsLocked}
            >
              {t('controllerStatus.hidHideRepairWhitelist')}
            </button>
          )}
          {status?.installed && (
            <button
              type="button"
              className={status.active ? 'secondary-btn' : 'primary-btn'}
              onClick={handleToggleActive}
              disabled={hidHideControlsLocked}
            >
              {status.active
                ? t('controllerStatus.hidHideDisableHiding')
                : t('controllerStatus.hidHideEnableHiding')}
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className={styles.hidHideSummary}>
          <span
            className={`${styles.hidHideChip} ${
              status.installed ? styles.hidHideChipPositive : styles.hidHideChipMuted
            }`}
          >
            {status.installed
              ? t('controllerStatus.hidHideInstalled')
              : t('controllerStatus.hidHideNotInstalled')}
          </span>
          <span
            className={`${styles.hidHideChip} ${
              status.active ? styles.hidHideChipPositive : styles.hidHideChipMuted
            }`}
          >
            {status.active
              ? t('controllerStatus.hidHideActive')
              : t('controllerStatus.hidHideInactive')}
          </span>
          <span
            className={`${styles.hidHideChip} ${
              status.whitelistSynced ? styles.hidHideChipPositive : styles.hidHideChipWarn
            }`}
          >
            {status.whitelistSynced
              ? t('controllerStatus.hidHideWhitelistReady')
              : t('controllerStatus.hidHideWhitelistNeedsRepair')}
          </span>
          <span className={`${styles.hidHideChip} ${styles.hidHideChipMuted}`}>
            {t('controllerStatus.hidHideManagedCount', { count: status.managedInstanceIds.length })}
          </span>
        </div>
      )}

      {error && (
        <div className={`${styles.hidHideNotice} ${styles.hidHideNoticeError}`}>
          {t('controllerStatus.hidHideError', { error })}
        </div>
      )}

      {loading && !status ? (
        <div className={styles.emptyInline}>{t('common.refreshing')}</div>
      ) : !status ? null : !status.supported ? (
        <div className={`${styles.hidHideNotice} ${styles.hidHideNoticeMuted}`}>
          {t('controllerStatus.hidHideUnsupported')}
        </div>
      ) : status.requiresElevation ? (
        <div className={`${styles.hidHideNotice} ${styles.hidHideNoticeWarn}`}>
          <div className={styles.hidHideNoticeTitle}>{t('controllerStatus.hidHideElevationTitle')}</div>
          <p>{t('controllerStatus.hidHideElevationBody')}</p>
        </div>
      ) : !status.installed ? (
        <div className={`${styles.hidHideNotice} ${styles.hidHideNoticeMuted}`}>
          <div className={styles.hidHideNoticeTitle}>{t('controllerStatus.hidHidePrerequisiteTitle')}</div>
          <p>{t('controllerStatus.hidHidePrerequisiteBody')}</p>
          <div className={styles.hidHideNoticeActions}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleInstallHidHide}
              disabled={hidHideInstallBusy}
            >
              {hidHideInstallBusy ? t('common.refreshing') : t('controllerStatus.hidHideInstallButton')}
            </button>
            <button type="button" className="ghost-btn" onClick={openInstallGuide} disabled={hasActionInFlight}>
              {t('controllerStatus.hidHideDownloadButton')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {heuristicAmbiguous && (
            <div className={`${styles.hidHideNotice} ${styles.hidHideNoticeWarn}`}>
              {t('controllerStatus.hidHideHeuristicWarning')}
            </div>
          )}

          {decoratedDevices.length === 0 ? (
            <div className={`${styles.hidHideNotice} ${styles.hidHideNoticeMuted}`}>
              {t('controllerStatus.hidHideNoDevices')}
            </div>
          ) : (
            <div className={styles.hidHideDeviceList}>
              {decoratedDevices.map(device => {
                const actionBusy = busyKey === `hidhide:${device.instanceId}`
                const actionDisabled = actionBusy || hidHideControlsLocked
                const actionLabel = device.stale
                  ? t('controllerStatus.hidHideClearStale')
                  : device.hidden
                    ? t('controllerStatus.hidHideUnhideDevice')
                    : t('controllerStatus.hidHideHideDevice')

                return (
                  <div key={device.instanceId} className={styles.hidHideDeviceRow}>
                    <div className={styles.hidHideDeviceMain}>
                      <div className={styles.hidHideDeviceTitleRow}>
                        <strong>{device.displayName}</strong>
                        <div className={styles.hidHideDeviceBadges}>
                          <span
                            className={`${styles.hidHidePill} ${
                              device.hidden ? styles.hidHidePillWarn : styles.hidHidePillMuted
                            }`}
                          >
                            {device.hidden
                              ? t('controllerStatus.hidHideHidden')
                              : t('controllerStatus.hidHideVisible')}
                          </span>
                          <span
                            className={`${styles.hidHidePill} ${
                              device.present ? styles.hidHidePillPositive : styles.hidHidePillMuted
                            }`}
                          >
                            {device.present
                              ? t('controllerStatus.hidHidePresent')
                              : t('controllerStatus.hidHideSavedOnly')}
                          </span>
                          {device.likelyCurrentController && (
                            <span className={`${styles.hidHidePill} ${styles.hidHidePillPositive}`}>
                              {t('controllerStatus.hidHideLikelyCurrent')}
                            </span>
                          )}
                          {device.managedByApp ? (
                            <span className={`${styles.hidHidePill} ${styles.hidHidePillMuted}`}>
                              {t('controllerStatus.hidHideManagedByApp')}
                            </span>
                          ) : device.hidden ? (
                            <span className={`${styles.hidHidePill} ${styles.hidHidePillMuted}`}>
                              {t('controllerStatus.hidHideManagedExternally')}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className={styles.hidHideDeviceMeta}>
                        {device.vendor && <span>{device.vendor}</span>}
                        {device.product && <span>{device.product}</span>}
                        {device.serialNumber && (
                          <span>{t('controllerStatus.hidHideSerialLabel', { value: device.serialNumber })}</span>
                        )}
                      </div>
                      <code className={styles.hidHideInstanceId}>{device.instanceId}</code>
                    </div>

                    <div className={styles.hidHideDeviceActions}>
                      {device.hidden && !device.managedByApp && !device.stale ? (
                        <button type="button" className="ghost-btn" disabled>
                          {t('controllerStatus.hidHideHiddenExternally')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={device.hidden || device.stale ? 'secondary-btn' : 'primary-btn'}
                          onClick={() => handleToggleDevice(device)}
                          disabled={actionDisabled}
                        >
                          {actionBusy ? t('common.refreshing') : actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export function ControllerStatusPage({
  devices,
  ignoredDevices,
}: ControllerStatusPageProps) {
  const { t } = useTranslation()
  const hasConnectedDevices = Boolean(devices?.length)

  if (!hasConnectedDevices) {
    return (
      <div className={styles.page}>
        <ControllerConnectionPanel connectedDevices={devices} priority />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Card className={`${styles.pageCard} ${styles.introCard}`}>
        <h2>{t('controllerStatus.title')}</h2>
        <p className="field-description">{t('controllerStatus.description')}</p>
      </Card>

      <ControllerConnectionPanel connectedDevices={devices} />

      <HidHidePanel telemetryDevices={devices} />

      {devices?.map(device => (
        <ControllerStatusDeviceCard key={device.handle} device={device} ignoredDevices={ignoredDevices} />
      ))}
    </div>
  )
}
