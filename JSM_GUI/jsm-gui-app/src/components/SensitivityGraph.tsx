import { useEffect, useRef } from 'react'
import graphStyles from './Graph.module.css'

interface SensitivityGraphProps {
  minThreshold?: number
  maxThreshold?: number
  minSensX?: number
  maxSensX?: number
  minSensY?: number
  maxSensY?: number
  curveType?: 'LINEAR' | 'NATURAL' | 'POWER' | 'QUADRATIC' | 'SIGMOID' | 'JUMP'
  naturalVHalf?: number
  powerVRef?: number
  powerExponent?: number
  sigmoidMid?: number
  sigmoidWidth?: number
  jumpTau?: number
  normalized?: number
  currentSensX?: number
  omega?: number
  disableLiveDot?: boolean
}

const MAX_OMEGA = 500

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
export function SensitivityGraph(props: SensitivityGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const {
    minThreshold,
    maxThreshold,
    minSensX,
  maxSensX,
  minSensY,
  maxSensY,
  curveType = 'LINEAR',
  naturalVHalf,
  powerVRef,
  powerExponent,
  sigmoidMid,
  sigmoidWidth,
  jumpTau,
  normalized,
  currentSensX,
  omega,
  disableLiveDot,
} = props

  useEffect(() => {

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ratio = window.devicePixelRatio || 1
    const baseWidth = 800
    const baseHeight = 420
    canvas.width = baseWidth * ratio
    canvas.height = baseHeight * ratio
    canvas.style.width = '100%'
    canvas.style.height = `${(baseHeight / baseWidth) * 100}%`
    ctx.resetTransform()
    ctx.scale(ratio, ratio)

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6fa7ff'
    const liveSensColor = accent
    const liveOutputColor = '#5bc7d7'

    ctx.fillStyle = '#0f0f0f'
    ctx.fillRect(0, 0, baseWidth, baseHeight)
    ctx.strokeStyle = '#2d2d2d'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, baseWidth, baseHeight)

    const isNatural = curveType === 'NATURAL'
    const isPower = curveType === 'POWER'
    const isQuadratic = curveType === 'QUADRATIC'
    const isSigmoid = curveType === 'SIGMOID'
    const isJump = curveType === 'JUMP'

    const hasThresholdInputs =
      minThreshold !== undefined && maxThreshold !== undefined && minSensX !== undefined && maxSensX !== undefined
    const hasNaturalInputs =
      minThreshold !== undefined && minSensX !== undefined && maxSensX !== undefined && naturalVHalf !== undefined && naturalVHalf > 0
    const hasPowerInputs =
      minThreshold !== undefined &&
      minSensX !== undefined &&
      maxSensX !== undefined &&
      powerVRef !== undefined &&
      powerVRef > 0 &&
      powerExponent !== undefined &&
      powerExponent > 0
    const hasSigmoidInputs =
      minThreshold !== undefined &&
      minSensX !== undefined &&
      maxSensX !== undefined &&
      sigmoidMid !== undefined &&
      sigmoidWidth !== undefined &&
      sigmoidWidth > 0
    const hasJumpInputs =
      minThreshold !== undefined &&
      maxThreshold !== undefined &&
      minSensX !== undefined &&
      maxSensX !== undefined &&
      jumpTau !== undefined &&
      jumpTau >= 0

    if (
      (isNatural && !hasNaturalInputs) ||
      (isPower && !hasPowerInputs) ||
      (isQuadratic && !hasThresholdInputs) ||
      (isSigmoid && !hasSigmoidInputs) ||
      (isJump && !hasJumpInputs) ||
      (!isNatural && !isPower && !isQuadratic && !isSigmoid && !isJump && !hasThresholdInputs)
    ) {
      ctx.fillStyle = '#777'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Provide required sensitivity + curve inputs to preview.', baseWidth / 2, baseHeight / 2)
      return
    }

    const paddingLeft = 55
    const paddingRight = 25
    const paddingTop = 25
    const paddingBottom = 60
    const graphWidth = baseWidth - paddingLeft - paddingRight
    const graphHeight = baseHeight - paddingTop - paddingBottom

    ctx.fillStyle = '#ddd'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Threshold (°/s)', paddingLeft + graphWidth / 2, baseHeight - 10)
    ctx.save()
    ctx.translate(18, paddingTop + graphHeight / 2 + 20)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('RWS', 0, 0)
    ctx.restore()

    const safeMinSensX = minSensX ?? 0
    const safeMaxSensX = maxSensX ?? safeMinSensX
    const safeMinThreshold = minThreshold ?? 0
    const safeMaxThreshold = maxThreshold ?? 0
    const safeNaturalVHalf = naturalVHalf ?? 0
    const safePowerVRef = powerVRef ?? 0
    const safePowerExponent = powerExponent ?? 0
    const safeSigmoidMid = sigmoidMid ?? 0
    const safeSigmoidWidth = sigmoidWidth ?? 0
    const safeJumpTau = jumpTau ?? 0

    const axisMaxX = Math.max(MAX_OMEGA, safeMaxThreshold, safePowerVRef, safeSigmoidMid + safeSigmoidWidth)
    const axisMaxY = Math.max(safeMinSensX, safeMaxSensX, 2)

    const toX = (speed: number) => paddingLeft + (graphWidth * (speed / axisMaxX))
    const toY = (sens: number) => paddingTop + graphHeight - (graphHeight * (sens / axisMaxY))

    ctx.strokeStyle = '#3b3b3b'
    ctx.lineWidth = 1
    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#aaa'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 6; i++) {
      const value = (axisMaxY / 6) * i
      const y = paddingTop + graphHeight - (graphHeight / 6) * i
      ctx.beginPath()
      ctx.moveTo(paddingLeft, y)
      ctx.lineTo(baseWidth - paddingRight, y)
      ctx.stroke()
      ctx.fillText(value.toFixed(2), paddingLeft - 10, y + 4)
    }
    ctx.textAlign = 'center'
    for (let i = 0; i <= 10; i++) {
      const value = (axisMaxX / 10) * i
      const x = paddingLeft + (graphWidth / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, paddingTop)
      ctx.lineTo(x, paddingTop + graphHeight)
      ctx.stroke()
      ctx.fillText(value.toFixed(0), x, paddingTop + graphHeight + 30)
    }

    const naturalSensitivityAt = (speed: number) => {
      const vHalf = safeNaturalVHalf
      const omegaAdjusted = Math.max(0, speed - safeMinThreshold)
      const delta = safeMaxSensX - safeMinSensX
      const k = Math.log(2) / vHalf
      return safeMaxSensX - delta * Math.exp(-k * omegaAdjusted)
    }

    const quadraticSensitivityAt = (speed: number) => {
      const omegaAdjusted = Math.max(0, speed - safeMinThreshold)
      const vCap = safeMaxThreshold
      if (vCap <= 0) return safeMaxSensX
      const t = clamp(omegaAdjusted / vCap, 0, 1)
      return safeMinSensX + (safeMaxSensX - safeMinSensX) * t * t
    }

    const powerSensitivityAt = (speed: number) => {
      const vRef = safePowerVRef
      const exponent = safePowerExponent
      const omegaAdjusted = Math.max(0, speed - safeMinThreshold)
      if (vRef <= 0 || exponent <= 0 || omegaAdjusted <= 0) return safeMinSensX
      const x = omegaAdjusted / vRef
      const u = Math.pow(x, exponent)
      const t = clamp(1 - Math.exp(-u), 0, 1)
      return safeMinSensX + (safeMaxSensX - safeMinSensX) * t
    }

    const sigmoidSensitivityAt = (speed: number) => {
      const omegaAdjusted = Math.max(0, speed - safeMinThreshold)
      const vMid = safeSigmoidMid
      const width = safeSigmoidWidth
      const w = width > 0 ? width : 1e-6
      const raw = (x: number) => {
        const z = (x - vMid) / w
        return 1 / (1 + Math.exp(-z))
      }
      const sigma = raw(omegaAdjusted)
      const sigma0 = raw(0)
      const denom = 1 - sigma0
      let t = denom > 0 ? (sigma - sigma0) / denom : 0
      t = clamp(t, 0, 1)
      return safeMinSensX + (safeMaxSensX - safeMinSensX) * t
    }

    const jumpSensitivityAt = (speed: number) => {
      const omegaAdjusted = Math.max(0, speed - safeMinThreshold)
      const vJump = safeMaxThreshold
      const tau = safeJumpTau
      if (tau <= 0) {
        return omegaAdjusted < vJump ? safeMinSensX : safeMaxSensX
      }
      const raw = (x: number) => {
        if (x >= vJump) return 1
        const z = (x - vJump) / tau
        return Math.exp(z)
      }
      const raw0 = raw(0)
      const denom = 1 - raw0
      const r = raw(omegaAdjusted)
      const t = denom > 0 ? clamp((r - raw0) / denom, 0, 1) : 0
      return safeMinSensX + (safeMaxSensX - safeMinSensX) * t
    }

    const sensitivityAt = (speed: number) => {
      if (isNatural) {
        return naturalSensitivityAt(speed)
      }
      if (isPower) {
        return powerSensitivityAt(speed)
      }
      if (isQuadratic) {
        return quadraticSensitivityAt(speed)
      }
      if (isSigmoid) {
        return sigmoidSensitivityAt(speed)
      }
      if (isJump) {
        return jumpSensitivityAt(speed)
      }
      const denom = safeMaxThreshold - safeMinThreshold
      if (denom <= 0) {
        return speed > safeMinThreshold ? safeMaxSensX : safeMinSensX
      }
      const progress = clamp((speed - safeMinThreshold) / denom, 0, 1)
      return safeMinSensX + progress * (safeMaxSensX - safeMinSensX)
    }

    const drawSensitivityCurve = () => {
      ctx.strokeStyle = accent
      ctx.lineWidth = 2.2
      ctx.beginPath()
      const points = 250
      const speeds = Array.from({ length: points }, (_, i) => (axisMaxX / (points - 1)) * i)
      speeds.forEach((speed, idx) => {
        const sens = sensitivityAt(speed)
        const x = toX(speed)
        const y = toY(sens)
        if (idx === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    drawSensitivityCurve()

    const drawVelocityCurve = () => {
      const points = 250
      const speeds = Array.from({ length: points }, (_, i) => (axisMaxX / (points - 1)) * i)
      const outputs = speeds.map(speed => speed * sensitivityAt(speed))
      const maxOutput = Math.max(...outputs, 1)
      ctx.strokeStyle = liveOutputColor
      ctx.setLineDash([6, 6])
      ctx.lineWidth = 2
      ctx.beginPath()
      outputs.forEach((output, idx) => {
        const normalized = (output / maxOutput) * axisMaxY
        const x = toX(speeds[idx])
        const y = toY(normalized)
        if (idx === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    drawVelocityCurve()

    const resolveLive = () => {
      if (typeof omega === 'number' && Number.isFinite(omega)) {
        return {
          speed: clamp(omega, 0, axisMaxX),
          sensX: typeof currentSensX === 'number' ? currentSensX : sensitivityAt(omega),
        }
      }
      return null
    }

    const live = resolveLive()
    if (live && !disableLiveDot) {
      const speed = clamp(live.speed, 0, axisMaxX)
      const sensX = live.sensX ?? sensitivityAt(speed)
      const output = speed * sensX
      const maxOutput = axisMaxX * safeMaxSensX
      const normalizedOutput = (output / maxOutput) * axisMaxY

      const drawDot = (value: number, color: string) => {
        ctx.beginPath()
        ctx.arc(toX(speed), toY(value), 5, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }
      drawDot(sensX, liveSensColor)
      drawDot(normalizedOutput, liveOutputColor)
    }

    ctx.textAlign = 'center'
  }, [minThreshold, maxThreshold, minSensX, minSensY, maxSensX, maxSensY, normalized, currentSensX, omega, disableLiveDot, curveType, naturalVHalf, powerVRef, powerExponent, sigmoidMid, sigmoidWidth, jumpTau])

  return <canvas ref={canvasRef} className={graphStyles.legacyCurveCanvas} />
}
