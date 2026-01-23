import { SensitivityValues } from '../utils/keymap'
import { SensitivityGraph } from './SensitivityGraph'
import graphStyles from './Graph.module.css'
import { TelemetrySample } from '../hooks/useTelemetry'

type CurvePreviewProps = {
  sensitivity: SensitivityValues
  sample: TelemetrySample | null
  hasPendingChanges: boolean
  telemetry: {
    omega: string
    sensX: string
    sensY: string
    timestamp: string
  }
}

export function CurvePreview({ sensitivity, sample, hasPendingChanges, telemetry }: CurvePreviewProps) {
  const asNumber = (value: unknown) => (typeof value === 'number' ? value : undefined)
  const curveType = (sensitivity.accelCurve ?? 'LINEAR').toUpperCase() as 'LINEAR' | 'NATURAL' | 'POWER' | 'QUADRATIC' | 'SIGMOID' | 'JUMP'
  return (
    <div className={graphStyles.graphPanel}>
      <div className={graphStyles.graphLegend}>
        <span><span className={`${graphStyles.legendDot} ${graphStyles.legendDotSensitivity}`} /> Sensitivity</span>
        <span><span className={`${graphStyles.legendDot} ${graphStyles.legendDotVelocity}`} /> Normalized output velocity</span>
      </div>
      <SensitivityGraph
        minThreshold={sensitivity.minThreshold}
        maxThreshold={sensitivity.maxThreshold}
        minSensX={sensitivity.minSensX}
        minSensY={sensitivity.minSensY}
        maxSensX={sensitivity.maxSensX}
        maxSensY={sensitivity.maxSensY}
        curveType={curveType}
        naturalVHalf={sensitivity.naturalVHalf}
        powerVRef={sensitivity.powerVRef}
        powerExponent={sensitivity.powerExponent}
        sigmoidMid={sensitivity.sigmoidMid}
        sigmoidWidth={sensitivity.sigmoidWidth}
        jumpTau={sensitivity.jumpTau}
        normalized={asNumber(sample?.t)}
        currentSensX={asNumber(sample?.sensX)}
        omega={asNumber(sample?.omega)}
        disableLiveDot={hasPendingChanges}
      />
      <div className={graphStyles.graphLiveReadout}>
        <span>Gyro Speed: <strong>{telemetry.omega}°/s</strong></span>
        <span>Active Sens: <strong>{telemetry.sensX}/{telemetry.sensY}</strong></span>
      </div>
    </div>
  )
}
