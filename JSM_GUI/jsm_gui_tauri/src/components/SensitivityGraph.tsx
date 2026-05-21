import { useEffect, useRef, useState } from 'react'
import graphStyles from './Graph.module.css'
import { useTheme } from '../hooks/useTheme'

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

interface CurveComputeParams {
  curveType: string
  minSensX: number
  maxSensX: number
  minThreshold: number
  maxThreshold: number
  naturalVHalf: number
  powerVRef: number
  powerExponent: number
  sigmoidMid: number
  sigmoidWidth: number
  jumpTau: number
}

function computeSensitivityAt(speed: number, p: CurveComputeParams): number {
  if (p.curveType === 'NATURAL') {
    const omegaAdjusted = Math.max(0, speed - p.minThreshold)
    const delta = p.maxSensX - p.minSensX
    const k = Math.log(2) / p.naturalVHalf
    return p.maxSensX - delta * Math.exp(-k * omegaAdjusted)
  }
  if (p.curveType === 'POWER') {
    const omegaAdjusted = Math.max(0, speed - p.minThreshold)
    if (p.powerVRef <= 0 || p.powerExponent <= 0 || omegaAdjusted <= 0) return p.minSensX
    const x = omegaAdjusted / p.powerVRef
    const u = Math.pow(x, p.powerExponent)
    return p.minSensX + (p.maxSensX - p.minSensX) * clamp(1 - Math.exp(-u), 0, 1)
  }
  if (p.curveType === 'QUADRATIC') {
    const omegaAdjusted = Math.max(0, speed - p.minThreshold)
    if (p.maxThreshold <= 0) return p.maxSensX
    const t = clamp(omegaAdjusted / p.maxThreshold, 0, 1)
    return p.minSensX + (p.maxSensX - p.minSensX) * t * t
  }
  if (p.curveType === 'SIGMOID') {
    const omegaAdjusted = Math.max(0, speed - p.minThreshold)
    const w = p.sigmoidWidth > 0 ? p.sigmoidWidth : 1e-6
    const raw = (x: number) => 1 / (1 + Math.exp(-(x - p.sigmoidMid) / w))
    const sigma = raw(omegaAdjusted)
    const sigma0 = raw(0)
    const denom = 1 - sigma0
    const t = clamp(denom > 0 ? (sigma - sigma0) / denom : 0, 0, 1)
    return p.minSensX + (p.maxSensX - p.minSensX) * t
  }
  if (p.curveType === 'JUMP') {
    const omegaAdjusted = Math.max(0, speed - p.minThreshold)
    const vJump = p.maxThreshold
    const tau = p.jumpTau
    if (tau <= 0) return omegaAdjusted < vJump ? p.minSensX : p.maxSensX
    const raw = (x: number) => x >= vJump ? 1 : Math.exp((x - vJump) / tau)
    const raw0 = raw(0)
    const denom = 1 - raw0
    const r = raw(omegaAdjusted)
    const t = denom > 0 ? clamp((r - raw0) / denom, 0, 1) : 0
    return p.minSensX + (p.maxSensX - p.minSensX) * t
  }
  // LINEAR
  const denom = p.maxThreshold - p.minThreshold
  if (denom <= 0) return speed > p.minThreshold ? p.maxSensX : p.minSensX
  return p.minSensX + clamp((speed - p.minThreshold) / denom, 0, 1) * (p.maxSensX - p.minSensX)
}

interface AxisLayout {
  axisMaxX: number
  axisMaxY: number
  graphWidth: number
  graphHeight: number
  paddingLeft: number
  paddingTop: number
}

export function SensitivityGraph(props: SensitivityGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hoverCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const axisRef = useRef<AxisLayout | null>(null)
  const [hoverSpeed, setHoverSpeed] = useState<number | null>(null)
  const { theme } = useTheme()
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
    axisRef.current = null

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

    const styles = getComputedStyle(document.documentElement)
    const bg = styles.getPropertyValue('--bg-input').trim() || '#0f0f0f'
    const grid = styles.getPropertyValue('--border-1').trim() || '#2d2d2d'
    const labelColor = styles.getPropertyValue('--text-mid').trim() || '#aaa'
    const axisColor = styles.getPropertyValue('--text-muted').trim() || '#999'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, baseWidth, baseHeight)
    ctx.strokeStyle = grid
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

    ctx.fillStyle = labelColor
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

    axisRef.current = { axisMaxX, axisMaxY, graphWidth, graphHeight, paddingLeft, paddingTop }

    const toX = (speed: number) => paddingLeft + (graphWidth * (speed / axisMaxX))
    const toY = (sens: number) => paddingTop + graphHeight - (graphHeight * (sens / axisMaxY))

    ctx.strokeStyle = grid
    ctx.lineWidth = 1
    ctx.font = '12px sans-serif'
    ctx.fillStyle = axisColor
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

    const curveParams: CurveComputeParams = {
      curveType,
      minSensX: safeMinSensX,
      maxSensX: safeMaxSensX,
      minThreshold: safeMinThreshold,
      maxThreshold: safeMaxThreshold,
      naturalVHalf: safeNaturalVHalf,
      powerVRef: safePowerVRef,
      powerExponent: safePowerExponent,
      sigmoidMid: safeSigmoidMid,
      sigmoidWidth: safeSigmoidWidth,
      jumpTau: safeJumpTau,
    }

    const drawSensitivityCurve = () => {
      ctx.strokeStyle = accent
      ctx.lineWidth = 2.2
      ctx.beginPath()
      const points = 250
      const speeds = Array.from({ length: points }, (_, i) => (axisMaxX / (points - 1)) * i)
      speeds.forEach((speed, idx) => {
        const sens = computeSensitivityAt(speed, curveParams)
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
      const outputs = speeds.map(speed => speed * computeSensitivityAt(speed, curveParams))
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
          sensX: typeof currentSensX === 'number' ? currentSensX : computeSensitivityAt(omega, curveParams),
        }
      }
      return null
    }

    const live = resolveLive()
    if (live && !disableLiveDot) {
      const speed = clamp(live.speed, 0, axisMaxX)
      const sensX = live.sensX ?? computeSensitivityAt(speed, curveParams)
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
  }, [minThreshold, maxThreshold, minSensX, minSensY, maxSensX, maxSensY, normalized, currentSensX, omega, disableLiveDot, curveType, naturalVHalf, powerVRef, powerExponent, sigmoidMid, sigmoidWidth, jumpTau, theme])

  // Hover overlay
  useEffect(() => {
    const hoverCanvas = hoverCanvasRef.current
    if (!hoverCanvas) return
    const ctx = hoverCanvas.getContext('2d')
    if (!ctx) return

    const ratio = window.devicePixelRatio || 1
    const baseWidth = 800
    const baseHeight = 420
    hoverCanvas.width = baseWidth * ratio
    hoverCanvas.height = baseHeight * ratio
    ctx.resetTransform()
    ctx.scale(ratio, ratio)
    ctx.clearRect(0, 0, baseWidth, baseHeight)

    if (hoverSpeed === null) return
    const axis = axisRef.current
    if (!axis) return

    const { axisMaxX, axisMaxY, graphWidth, graphHeight, paddingLeft, paddingTop } = axis
    const toX = (speed: number) => paddingLeft + (graphWidth * (speed / axisMaxX))
    const toY = (sens: number) => paddingTop + graphHeight - (graphHeight * (sens / axisMaxY))

    const cssStyles = getComputedStyle(document.documentElement)
    const accent = cssStyles.getPropertyValue('--accent').trim() || '#6fa7ff'
    const textMid = cssStyles.getPropertyValue('--text-mid').trim() || '#aaa'
    const bgInput = cssStyles.getPropertyValue('--bg-input').trim() || '#0f0f0f'
    const border1 = cssStyles.getPropertyValue('--border-1').trim() || '#2d2d2d'

    const safeMinSensX = minSensX ?? 0
    const safeMaxSensX = maxSensX ?? safeMinSensX
    const curveParams: CurveComputeParams = {
      curveType,
      minSensX: safeMinSensX,
      maxSensX: safeMaxSensX,
      minThreshold: minThreshold ?? 0,
      maxThreshold: maxThreshold ?? 0,
      naturalVHalf: naturalVHalf ?? 0,
      powerVRef: powerVRef ?? 0,
      powerExponent: powerExponent ?? 0,
      sigmoidMid: sigmoidMid ?? 0,
      sigmoidWidth: sigmoidWidth ?? 0,
      jumpTau: jumpTau ?? 0,
    }

    const sens = computeSensitivityAt(hoverSpeed, curveParams)
    const x = toX(hoverSpeed)
    const y = toY(sens)

    // Vertical dashed line
    ctx.save()
    ctx.strokeStyle = textMid
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(x, paddingTop)
    ctx.lineTo(x, paddingTop + graphHeight)
    ctx.stroke()
    ctx.restore()

    // Dot on curve
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = accent
    ctx.fill()

    // Tooltip box
    ctx.font = '12px sans-serif'
    const line1 = `Sensitivity: ${sens.toFixed(2)}`
    const line2 = `${hoverSpeed.toFixed(0)} \u00b0/s`
    const pad = 8
    const lineHeight = 16
    const tooltipWidth = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) + pad * 2
    const tooltipHeight = lineHeight * 2 + pad * 2
    const graphRight = paddingLeft + graphWidth
    const tooltipOffset = 12
    let tooltipX = x + tooltipOffset
    if (tooltipX + tooltipWidth > graphRight - 4) {
      tooltipX = x - tooltipOffset - tooltipWidth
    }
    const tooltipY = paddingTop + 8

    ctx.beginPath()
    ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4)
    ctx.fillStyle = bgInput
    ctx.fill()
    ctx.strokeStyle = border1
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = textMid
    ctx.textAlign = 'left'
    ctx.fillText(line1, tooltipX + pad, tooltipY + pad + 11)
    ctx.fillText(line2, tooltipX + pad, tooltipY + pad + 11 + lineHeight)
  }, [hoverSpeed, theme, curveType, minSensX, maxSensX, minThreshold, maxThreshold, naturalVHalf, powerVRef, powerExponent, sigmoidMid, sigmoidWidth, jumpTau])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const axis = axisRef.current
    const canvas = canvasRef.current
    if (!axis || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const canvasX = (relX / rect.width) * 800
    const speed = Math.max(0, Math.min(axis.axisMaxX,
      (canvasX - axis.paddingLeft) / axis.graphWidth * axis.axisMaxX))
    setHoverSpeed(speed)
  }

  const handleMouseLeave = () => {
    setHoverSpeed(null)
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        className={graphStyles.legacyCurveCanvas}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      <canvas ref={hoverCanvasRef} className={graphStyles.hoverOverlayCanvas} />
    </div>
  )
}
