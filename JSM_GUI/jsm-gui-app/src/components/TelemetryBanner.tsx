type TelemetryBannerProps = {
  omega: string
  timestamp: string
  sampleHz?: string
}

export function TelemetryBanner({ omega, timestamp, sampleHz }: TelemetryBannerProps) {
  return (
    <section className="telemetry-banner">
      <p className="telemetry-heading">Live packets streaming</p>
      <div className="telemetry-readouts">
        <div className="telemetry-node">
          <span className="telemetry-label">Gyro Speed</span>
          <strong className="telemetry-value">{omega}°/s</strong>
        </div>
        <div className="telemetry-node">
          <span className="telemetry-label">Timestamp</span>
          <strong className="telemetry-value">{timestamp}</strong>
        </div>
        {sampleHz !== undefined && (
          <div className="telemetry-node">
            <span className="telemetry-label">Sample Rate</span>
            <strong className="telemetry-value">{sampleHz} Hz</strong>
          </div>
        )}
      </div>
    </section>
  )
}
