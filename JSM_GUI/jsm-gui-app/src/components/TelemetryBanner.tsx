import styles from './Telemetry.module.css'

type TelemetryBannerProps = {
  omega: string
  timestamp: string
  sampleHz?: string
}

export function TelemetryBanner({ omega, timestamp, sampleHz }: TelemetryBannerProps) {
  return (
    <section className={styles.telemetryBanner}>
      <p className={styles.telemetryHeading}>Live packets streaming</p>
      <div className={styles.telemetryReadouts}>
        <div className={styles.telemetryNode}>
          <span className={styles.telemetryLabel}>Gyro Speed</span>
          <strong className={styles.telemetryValue}>{omega}°/s</strong>
        </div>
        <div className={styles.telemetryNode}>
          <span className={styles.telemetryLabel}>Timestamp</span>
          <strong className={styles.telemetryValue}>{timestamp}</strong>
        </div>
        {sampleHz !== undefined && (
          <div className={styles.telemetryNode}>
            <span className={styles.telemetryLabel}>Sample Rate</span>
            <strong className={styles.telemetryValue}>{sampleHz} Hz</strong>
          </div>
        )}
      </div>
    </section>
  )
}
