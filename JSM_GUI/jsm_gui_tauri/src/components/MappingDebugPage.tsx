import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from './Card'
import styles from './MappingDebugPage.module.css'
import { desktopBridge, type InputDebugEvent, type InputDebugHookStatus } from '../platform/desktopBridge'

type MappingDebugPageProps = {
  configText: string
  appliedConfig: string
  hasPendingChanges: boolean
}

type ActiveInputMap = Record<string, InputDebugEvent>

const MAX_EVENTS = 100

const fallbackStatus: InputDebugHookStatus = {
  supported: true,
  running: false,
  platform: 'windows',
}

export function MappingDebugPage({ configText, appliedConfig, hasPendingChanges }: MappingDebugPageProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<InputDebugHookStatus>(fallbackStatus)
  const [events, setEvents] = useState<InputDebugEvent[]>([])
  const [activeInputs, setActiveInputs] = useState<ActiveInputMap>({})
  const [isBusy, setIsBusy] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [injectedOnly, setInjectedOnly] = useState(true)
  const activeInputsRef = useRef<ActiveInputMap>({})
  const runningRef = useRef(false)
  const localEventIdRef = useRef(-1)
  const lastGlobalKeyboardEventRef = useRef<Record<string, number>>({})
  const hasPendingConfigText = hasPendingChanges || configText !== appliedConfig

  useEffect(() => {
    let disposed = false
    void desktopBridge.getInputDebugHookStatus().then(nextStatus => {
      if (!disposed) {
        runningRef.current = nextStatus.running
        setStatus(nextStatus)
      }
    }).catch(error => {
      if (!disposed) {
        setStatus({
          supported: false,
          running: false,
          platform: 'unknown',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    })

    return () => {
      disposed = true
      if (runningRef.current) {
        void desktopBridge.stopInputDebugHook()
      }
    }
  }, [])

  useEffect(() => {
    runningRef.current = status.running
    if (!status.running) return undefined

    return desktopBridge.onInputDebugEvent(event => {
      if (event.source === 'keyboard') {
        lastGlobalKeyboardEventRef.current[globalKeyboardDedupKey(event)] = Date.now()
      }
      const shouldLog = applyActiveInputEvent(event, activeInputsRef)
      setActiveInputs(activeInputsRef.current)
      if (!isPaused && shouldLog) {
        setEvents(current => [event, ...current].slice(0, MAX_EVENTS))
      }
    })
  }, [isPaused, status.running])

  useEffect(() => {
    if (!status.running) return undefined

    const handleKeyEvent = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      event.stopPropagation()

      const action = event.type === 'keydown' ? 'down' : 'up'
      const keyCode = event.keyCode || event.which || undefined
      const keyLabel = keyboardEventLabel(event)
      const debugEvent: InputDebugEvent = {
        id: localEventIdRef.current--,
        timestamp: Date.now(),
        source: 'keyboard',
        action,
        keyCode,
        keyLabel,
        injected: false,
        captureSource: 'appWindow',
        summary: `App window keyboard ${keyLabel} ${action}`,
      }

      const dedupKey = globalKeyboardDedupKey(debugEvent)
      const lastGlobalEventAt = lastGlobalKeyboardEventRef.current[dedupKey] ?? 0
      if (Date.now() - lastGlobalEventAt < 120) {
        return
      }

      const shouldLog = applyActiveInputEvent(debugEvent, activeInputsRef)
      setActiveInputs(activeInputsRef.current)
      if (!isPaused && shouldLog) {
        setEvents(current => [debugEvent, ...current].slice(0, MAX_EVENTS))
      }
    }

    window.addEventListener('keydown', handleKeyEvent, true)
    window.addEventListener('keyup', handleKeyEvent, true)
    return () => {
      window.removeEventListener('keydown', handleKeyEvent, true)
      window.removeEventListener('keyup', handleKeyEvent, true)
    }
  }, [isPaused, status.running])

  const visibleEvents = events.filter(event => isVisibleInCurrentFilter(event, injectedOnly))
  const visibleActiveInputs = Object.values(activeInputs).filter(event => isVisibleInCurrentFilter(event, injectedOnly))
  const statusLabel = status.running ? t('mappingDebug.running') : t('mappingDebug.stopped')

  const handleStart = async () => {
    setIsBusy(true)
    try {
      const nextStatus = await desktopBridge.startInputDebugHook()
      runningRef.current = nextStatus.running
      setStatus(nextStatus)
    } finally {
      setIsBusy(false)
    }
  }

  const handleStop = async () => {
    setIsBusy(true)
    try {
      const nextStatus = await desktopBridge.stopInputDebugHook()
      runningRef.current = nextStatus.running
      activeInputsRef.current = {}
      setActiveInputs({})
      setStatus(nextStatus)
    } finally {
      setIsBusy(false)
    }
  }

  const handleClear = () => {
    setEvents([])
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h2>{t('mappingDebug.title')}</h2>
            <p className={styles.description}>{t('mappingDebug.description')}</p>
          </div>
          <span className={`${styles.statusBadge} ${status.running ? styles.statusRunning : styles.statusStopped}`}>
            {statusLabel}
          </span>
        </div>
        <p className={styles.description}>{t('mappingDebug.limitDescription')}</p>
        {hasPendingConfigText && <div className={styles.warning}>{t('mappingDebug.pendingConfigWarning')}</div>}
        {status.supported && status.message && <div className={styles.warning}>{status.message}</div>}
        {!status.supported ? (
          <div className={styles.unsupported}>
            <strong>{t('mappingDebug.unsupportedTitle')}</strong>
            <p className={styles.description}>{t('mappingDebug.unsupportedDescription', { platform: status.platform })}</p>
          </div>
        ) : (
          <>
            <div className={styles.controls}>
              <button type="button" className="primary-btn" onClick={handleStart} disabled={isBusy || status.running}>
                {t('mappingDebug.startCapture')}
              </button>
              <button type="button" className="secondary-btn" onClick={handleStop} disabled={isBusy || !status.running}>
                {t('mappingDebug.stopCapture')}
              </button>
              <button type="button" className="secondary-btn" onClick={() => setIsPaused(value => !value)} disabled={!status.running}>
                {isPaused ? t('mappingDebug.resumeLogging') : t('mappingDebug.pauseLogging')}
              </button>
              <button type="button" className="ghost-btn" onClick={handleClear} disabled={events.length === 0}>
                {t('mappingDebug.clearLog')}
              </button>
            </div>
            <div className={styles.filterGroup} role="group" aria-label={t('mappingDebug.filterLabel')}>
              <button
                type="button"
                className={`${styles.filterButton} ${injectedOnly ? styles.filterButtonActive : ''}`}
                onClick={() => setInjectedOnly(true)}
              >
                {t('mappingDebug.filterInjected')}
              </button>
              <button
                type="button"
                className={`${styles.filterButton} ${!injectedOnly ? styles.filterButtonActive : ''}`}
                onClick={() => setInjectedOnly(false)}
              >
                {t('mappingDebug.filterAll')}
              </button>
            </div>
          </>
        )}
      </Card>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>{t('mappingDebug.activeTitle')}</div>
            <div className={styles.panelMeta}>{t('mappingDebug.activeCount', { count: visibleActiveInputs.length })}</div>
          </div>
          {visibleActiveInputs.length === 0 ? (
            <div className={styles.empty}>
              {status.running ? t('mappingDebug.noActiveInputs') : t('mappingDebug.captureNotStarted')}
            </div>
          ) : (
            <div className={styles.activeList}>
              {visibleActiveInputs.map(event => (
                <DebugEventItem key={eventIdentity(event)} event={event} compact />
              ))}
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>{t('mappingDebug.logTitle')}</div>
            <div className={styles.panelMeta}>{t('mappingDebug.logCount', { count: visibleEvents.length, max: MAX_EVENTS })}</div>
          </div>
          {visibleEvents.length === 0 ? (
            <div className={styles.empty}>
              {status.running ? t('mappingDebug.noEvents') : t('mappingDebug.captureNotStarted')}
            </div>
          ) : (
            <div className={styles.eventList}>
              {visibleEvents.map(event => (
                <DebugEventItem key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

type DebugEventItemProps = {
  event: InputDebugEvent
  compact?: boolean
}

function DebugEventItem({ event, compact = false }: DebugEventItemProps) {
  const { t } = useTranslation()
  const output = describeOutput(event, t)
  const source = t(`mappingDebug.source.${event.source}`)
  const action = t(`mappingDebug.action.${event.action}`)
  const origin = event.captureSource === 'appWindow'
    ? t('mappingDebug.appWindowEvent')
    : event.injected
      ? t('mappingDebug.injectedEvent')
      : t('mappingDebug.systemEvent')
  const captureSource = t(`mappingDebug.captureSource.${event.captureSource ?? 'globalHook'}`)

  return (
    <article className={`${styles.eventItem} ${event.injected ? styles.eventItemInjected : ''}`}>
      <div className={styles.eventTopLine}>
        <div className={styles.eventTitle}>{t('mappingDebug.eventSummary', { source, output, action })}</div>
        {!compact && <time className={styles.eventTime}>{formatEventTime(event.timestamp)}</time>}
      </div>
      <div className={styles.eventDetails}>
        <span className={styles.tag}>{source}</span>
        <span className={styles.tag}>{action}</span>
        <span className={`${styles.tag} ${event.injected ? styles.tagInjected : styles.tagSystem}`}>{origin}</span>
        <span className={styles.tag}>{captureSource}</span>
        {event.lowerIntegrityInjected && <span className={styles.tag}>{t('mappingDebug.lowerIntegrityInjected')}</span>}
        {event.position && <span className={styles.tag}>x{event.position.x}, y{event.position.y}</span>}
      </div>
      {!compact && <div className={styles.rawSummary}>{event.summary}</div>}
    </article>
  )
}

function applyActiveInputEvent(event: InputDebugEvent, activeInputsRef: MutableRefObject<ActiveInputMap>) {
  const key = eventIdentity(event)
  const current = activeInputsRef.current
  const wasActive = Boolean(current[key])

  if (event.action === 'down') {
    activeInputsRef.current = { ...current, [key]: event }
    return !wasActive
  }

  if (event.action === 'up') {
    const next = { ...current }
    delete next[key]
    activeInputsRef.current = next
    return wasActive
  }

  return true
}

function eventIdentity(event: InputDebugEvent) {
  if (event.source === 'keyboard') return `keyboard:${event.keyCode ?? event.scanCode ?? event.keyLabel ?? 'unknown'}`
  if (event.source === 'mouse') return `mouse:${event.mouseButton ?? 'unknown'}`
  return `wheel:${event.id}`
}

function isVisibleInCurrentFilter(event: InputDebugEvent, injectedOnly: boolean) {
  return !injectedOnly || event.injected || event.captureSource === 'appWindow'
}

function globalKeyboardDedupKey(event: InputDebugEvent) {
  return `${event.action}:${event.keyCode ?? event.scanCode ?? event.keyLabel ?? 'unknown'}`
}

function keyboardEventLabel(event: KeyboardEvent) {
  if (event.key && event.key.length === 1) return event.key.toUpperCase()
  if (event.key && event.key !== 'Unidentified') return event.key
  if (event.code) return event.code.replace(/^Key/, '').replace(/^Digit/, '')
  return `VK ${event.keyCode || event.which || '?'}`
}

function describeOutput(event: InputDebugEvent, t: (key: string, options?: Record<string, unknown>) => string) {
  if (event.source === 'keyboard') {
    return event.keyLabel ?? t('mappingDebug.unknownKey', { code: event.keyCode ?? '?' })
  }

  if (event.source === 'mouse') {
    const key = `mappingDebug.mouseButton.${event.mouseButton ?? 'unknown'}`
    return t(key)
  }

  return t('mappingDebug.wheelDelta', { delta: formatSignedNumber(event.wheelDelta ?? 0) })
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

function formatEventTime(timestamp: number) {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}
