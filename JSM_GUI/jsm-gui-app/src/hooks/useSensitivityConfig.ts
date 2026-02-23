import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getKeymapValue, parseSensitivityValues, removeKeymapEntry, updateKeymapEntry } from '../utils/keymap'
import { DEFAULT_HOLD_PRESS_TIME, DEFAULT_WINDOW_SECONDS } from '../constants/defaults'
import { keyName } from '../constants/configKeys'

const SENS_MODE_KEYS = [
  keyName.MIN_GYRO_THRESHOLD,
  keyName.MAX_GYRO_THRESHOLD,
  keyName.MIN_GYRO_SENS,
  keyName.MAX_GYRO_SENS,
  keyName.GYRO_SENS,
  keyName.ROLL_CONTRIBUTION,
  keyName.ACCEL_CURVE,
  keyName.ACCEL_NATURAL_VHALF,
  keyName.ACCEL_POWER_VREF,
  keyName.ACCEL_POWER_EXPONENT,
  keyName.ACCEL_SIGMOID_MID,
  keyName.ACCEL_SIGMOID_WIDTH,
  keyName.ACCEL_JUMP_TAU,
] as const

const prefixedKey = (key: string, prefix?: string) => (prefix ? `${prefix}${key}` : key)

type SensitivityArgs = {
  configText: string
  setConfigText: React.Dispatch<React.SetStateAction<string>>
}

type PendingDual = Record<
  string,
  {
    min?: { x?: string; y?: string }
    max?: { x?: string; y?: string }
    static?: { x?: string; y?: string }
  }
>

const prefixKey = (prefix?: string) => prefix ?? '__base__'

export function useSensitivityConfig({ configText, setConfigText }: SensitivityArgs) {
  const [sensitivityView, setSensitivityView] = useState<'base' | 'modeshift'>('base')
  const [pendingDual, setPendingDual] = useState<PendingDual>({})
  const pendingDualRef = useRef<PendingDual>({})
  const hasPendingSensitivityChanges = Object.keys(pendingDual).length > 0

  useEffect(() => {
    pendingDualRef.current = pendingDual
  }, [pendingDual])

  const sensitivity = useMemo(() => parseSensitivityValues(configText), [configText])
  const SENS_MODE_REGEX = useMemo(
    () =>
      new RegExp(
        `^\\s*([A-Z0-9+\\-_]+)\\s*,\\s*(${[
          keyName.GYRO_SENS,
          keyName.MIN_GYRO_SENS,
          keyName.MAX_GYRO_SENS,
          keyName.MIN_GYRO_THRESHOLD,
          keyName.MAX_GYRO_THRESHOLD,
          keyName.ROLL_CONTRIBUTION,
        ].join('|')})\\s*=`,
        'im'
      ),
    []
  )
  const sensitivityModeshiftButton = useMemo(() => {
    const match = configText.match(SENS_MODE_REGEX)
    return match ? match[1].toUpperCase() : null
  }, [SENS_MODE_REGEX, configText])

  useEffect(() => {
    if (!sensitivityModeshiftButton && sensitivityView === 'modeshift') {
      setSensitivityView('base')
    }
  }, [sensitivityModeshiftButton, sensitivityView])

  useEffect(() => {
    setPendingDual(prev => {
      const allowed = new Set<string>([prefixKey()])
      if (sensitivityModeshiftButton) {
        allowed.add(prefixKey(`${sensitivityModeshiftButton},`))
      }
      const filtered: PendingDual = {}
      Object.entries(prev).forEach(([key, value]) => {
        if (allowed.has(key)) {
          filtered[key] = value
        }
      })
      pendingDualRef.current = filtered
      return filtered
    })
  }, [sensitivityModeshiftButton])

  const modeshiftSensitivity = useMemo(() => {
    if (!sensitivityModeshiftButton) return undefined
    return parseSensitivityValues(configText, { prefix: `${sensitivityModeshiftButton},` })
  }, [configText, sensitivityModeshiftButton])

  const activeSensitivityPrefix = useMemo(() => {
    if (sensitivityView === 'modeshift' && sensitivityModeshiftButton) {
      return `${sensitivityModeshiftButton},`
    }
    return undefined
  }, [sensitivityView, sensitivityModeshiftButton])

  const resolveSensitivityKey = useCallback(
    (key: string) => {
      return activeSensitivityPrefix ? `${activeSensitivityPrefix}${key}` : key
    },
    [activeSensitivityPrefix]
  )

  const handleSensitivityModeshiftButtonChange = useCallback(
    (value: string) => {
      const nextButton = value || null
      setConfigText(prev => {
        let next = prev
        if (sensitivityModeshiftButton) {
          SENS_MODE_KEYS.forEach(key => {
            next = removeKeymapEntry(next, `${sensitivityModeshiftButton},${key}`)
          })
        }
        if (nextButton) {
          const base = parseSensitivityValues(next)
          if (base.gyroSensX !== undefined) {
            next = updateKeymapEntry(next, `${nextButton},${keyName.GYRO_SENS}`, [
              base.gyroSensX,
              base.gyroSensY ?? base.gyroSensX,
            ])
          } else {
            if (base.minSensX !== undefined || base.minSensY !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.MIN_GYRO_SENS}`, [
                base.minSensX ?? 0,
                base.minSensY ?? base.minSensX ?? 0,
              ])
            }
            if (base.maxSensX !== undefined || base.maxSensY !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.MAX_GYRO_SENS}`, [
                base.maxSensX ?? 0,
                base.maxSensY ?? base.maxSensX ?? 0,
              ])
            }
            if (base.minThreshold !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.MIN_GYRO_THRESHOLD}`, [base.minThreshold])
            }
            if (base.maxThreshold !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.MAX_GYRO_THRESHOLD}`, [base.maxThreshold])
            }
            if (base.accelCurve) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.ACCEL_CURVE}`, [base.accelCurve])
            }
            if (base.naturalVHalf !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.ACCEL_NATURAL_VHALF}`, [base.naturalVHalf])
            }
            if (base.powerVRef !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.ACCEL_POWER_VREF}`, [base.powerVRef])
            }
            if (base.powerExponent !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.ACCEL_POWER_EXPONENT}`, [base.powerExponent])
            }
            if (base.sigmoidMid !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.ACCEL_SIGMOID_MID}`, [base.sigmoidMid])
            }
            if (base.sigmoidWidth !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.ACCEL_SIGMOID_WIDTH}`, [base.sigmoidWidth])
            }
            if (base.jumpTau !== undefined) {
              next = updateKeymapEntry(next, `${nextButton},${keyName.ACCEL_JUMP_TAU}`, [base.jumpTau])
            }
          }
        }
        return next
      })
      if (!nextButton) {
        setSensitivityView('base')
      }
      if (nextButton) {
        setSensitivityView('modeshift')
      }
    },
    [sensitivityModeshiftButton, setConfigText]
  )

  const handleThresholdChange = (key: typeof keyName.MIN_GYRO_THRESHOLD | typeof keyName.MAX_GYRO_THRESHOLD) => (value: string) => {
    if (value === '') {
      setConfigText(prev => removeKeymapEntry(prev, resolveSensitivityKey(key)))
      return
    }
    const next = parseFloat(value)
    if (Number.isNaN(next) || next < 0) return
    setConfigText(prev => updateKeymapEntry(prev, resolveSensitivityKey(key), [next]))
  }

  const makeScalarHandler = (key: string) => (value: string) => {
    if (value === '') {
      setConfigText(prev => removeKeymapEntry(prev, key))
      return
    }
    const next = parseFloat(value)
    if (Number.isNaN(next)) return
    setConfigText(prev => updateKeymapEntry(prev, key, [next]))
  }

  const makeStringHandler = (key: string) => (value: string) => {
    if (!value) {
      setConfigText(prev => removeKeymapEntry(prev, key))
      return
    }
    setConfigText(prev => updateKeymapEntry(prev, key, [value]))
  }

  const handleCutoffSpeedChange = makeScalarHandler(keyName.GYRO_CUTOFF_SPEED)
  const handleCutoffRecoveryChange = makeScalarHandler(keyName.GYRO_CUTOFF_RECOVERY)
  const handleSmoothTimeChange = makeScalarHandler(keyName.GYRO_SMOOTH_TIME)
  const handleSmoothThresholdChange = makeScalarHandler(keyName.GYRO_SMOOTH_THRESHOLD)
  const handleSmoothingDecayChange = (value: string) => {
    const upper = value.trim().toUpperCase()
    if (!upper || upper === 'OFF') {
      setConfigText(prev => removeKeymapEntry(prev, keyName.GYRO_SMOOTHING_DECAY))
      return
    }
    setConfigText(prev => updateKeymapEntry(prev, keyName.GYRO_SMOOTHING_DECAY, [upper]))
  }
  const handleAngleSnapChange = makeScalarHandler(keyName.GYRO_ANGLE_SNAP)
  const handleAngleSnapSmoothChange = (value: string) => {
    const upper = value.trim().toUpperCase()
    if (!upper || upper === 'OFF') {
      setConfigText(prev => removeKeymapEntry(prev, keyName.GYRO_ANGLE_SNAP_EASE))
      return
    }
    setConfigText(prev => updateKeymapEntry(prev, keyName.GYRO_ANGLE_SNAP_EASE, [upper]))
  }
  const handleDecelBrakeStrengthChange = makeScalarHandler(keyName.DECEL_BRAKE_STRENGTH)
  const handleDecelBrakeThresholdChange = makeScalarHandler(keyName.DECEL_BRAKE_THRESHOLD)
  const handleTickTimeChange = makeScalarHandler(keyName.TICK_TIME)
  const handleHoldPressTimeChange = makeScalarHandler(keyName.HOLD_PRESS_TIME)
  const makeWindowHandler = (key: typeof keyName.DBL_PRESS_WINDOW | typeof keyName.SIM_PRESS_WINDOW) => (value: string) => {
    if (value === '') {
      setConfigText(prev => removeKeymapEntry(prev, key))
      return
    }
    const seconds = parseFloat(value)
    if (Number.isNaN(seconds)) return
    const millis = Math.max(0, Math.round(seconds * 1000))
    setConfigText(prev => updateKeymapEntry(prev, key, [millis]))
  }
  const handleDoublePressWindowChange = makeWindowHandler(keyName.DBL_PRESS_WINDOW)
  const handleSimPressWindowChange = makeWindowHandler(keyName.SIM_PRESS_WINDOW)

  const handleTriggerThresholdChange = useCallback((value: string) => {
    if (value === '') {
      setConfigText(prev => removeKeymapEntry(prev, keyName.TRIGGER_THRESHOLD))
      return
    }
    const next = parseFloat(value)
    if (Number.isNaN(next)) return
    const clamped = Math.min(1, Math.max(0, next))
    setConfigText(prev => updateKeymapEntry(prev, keyName.TRIGGER_THRESHOLD, [clamped]))
  }, [setConfigText])

  const handleGyroSpaceChange = makeStringHandler(keyName.GYRO_SPACE)
  const handleGyroAxisXChange = (value: string) => {
    if (!value) {
      setConfigText(prev => removeKeymapEntry(prev, keyName.GYRO_AXIS_X))
      return
    }
    setConfigText(prev => updateKeymapEntry(prev, keyName.GYRO_AXIS_X, [value]))
  }
  const handleGyroAxisYChange = (value: string) => {
    if (!value) {
      setConfigText(prev => removeKeymapEntry(prev, keyName.GYRO_AXIS_Y))
      return
    }
    setConfigText(prev => updateKeymapEntry(prev, keyName.GYRO_AXIS_Y, [value]))
  }

  const handleDualSensChange = (key: typeof keyName.MIN_GYRO_SENS | typeof keyName.MAX_GYRO_SENS, index: 0 | 1) => (value: string) => {
    const keyPrefix = prefixKey(activeSensitivityPrefix)
    const axisKey = index === 0 ? 'x' : 'y'
    const nextPending = { ...pendingDual }
    const currentPending = nextPending[keyPrefix] ?? {}
    const nextMin = { ...(currentPending.min ?? {}) }
    const nextMax = { ...(currentPending.max ?? {}) }

    if (value === '') {
      if (key === keyName.MIN_GYRO_SENS) {
        nextMin[axisKey] = ''
      } else {
        nextMax[axisKey] = ''
      }
      nextPending[keyPrefix] = {
        min: Object.keys(nextMin).length ? nextMin : undefined,
        max: Object.keys(nextMax).length ? nextMax : undefined,
      }
      setPendingDual(nextPending)
      return
    }

    const parsedValue = parseFloat(value)
    if (Number.isNaN(parsedValue) || parsedValue < 0) return

    if (key === keyName.MIN_GYRO_SENS) {
      nextMin[axisKey] = value
    } else {
      nextMax[axisKey] = value
    }
    nextPending[keyPrefix] = {
      min: Object.keys(nextMin).length ? nextMin : undefined,
      max: Object.keys(nextMax).length ? nextMax : undefined,
    }
    setPendingDual(nextPending)

    setConfigText(prev => {
      const parsed = parseSensitivityValues(prev, activeSensitivityPrefix ? { prefix: activeSensitivityPrefix } : undefined)
      const pendingForPrefix = nextPending[keyPrefix] ?? {}
      const current =
        key === keyName.MIN_GYRO_SENS
          ? [
              pendingForPrefix.min?.x === '' ? 0 : pendingForPrefix.min?.x !== undefined ? parseFloat(pendingForPrefix.min.x) : parsed.minSensX ?? 0,
              pendingForPrefix.min?.y === '' ? 0 : pendingForPrefix.min?.y !== undefined ? parseFloat(pendingForPrefix.min.y) : parsed.minSensY ?? parsed.minSensX ?? 0,
            ]
          : [
              pendingForPrefix.max?.x === '' ? 0 : pendingForPrefix.max?.x !== undefined ? parseFloat(pendingForPrefix.max.x) : parsed.maxSensX ?? 0,
              pendingForPrefix.max?.y === '' ? 0 : pendingForPrefix.max?.y !== undefined ? parseFloat(pendingForPrefix.max.y) : parsed.maxSensY ?? parsed.maxSensX ?? 0,
            ]
      current[index] = parsedValue
      return updateKeymapEntry(prev, resolveSensitivityKey(key), current)
    })
  }

  const handleStaticSensChange = (index: 0 | 1) => (value: string) => {
    const keyPrefix = prefixKey(activeSensitivityPrefix)
    const axisKey = index === 0 ? 'x' : 'y'
    const nextPending = { ...pendingDual }
    const currentPending = nextPending[keyPrefix] ?? {}
    const nextStatic = { ...(currentPending.static ?? {}) }

    if (value === '') {
      nextStatic[axisKey] = ''
      nextPending[keyPrefix] = { ...currentPending, static: nextStatic }
      setPendingDual(nextPending)
      return
    }

    const parsedValue = parseFloat(value)
    if (Number.isNaN(parsedValue) || parsedValue < 0) return

    nextStatic[axisKey] = value
    nextPending[keyPrefix] = { ...currentPending, static: nextStatic }
    setPendingDual(nextPending)

    setConfigText(prev => {
      const parsed = parseSensitivityValues(prev, activeSensitivityPrefix ? { prefix: activeSensitivityPrefix } : undefined)
      const pendingForPrefix = nextPending[keyPrefix] ?? {}
      const baseX =
        pendingForPrefix.static?.x === ''
          ? 0
          : pendingForPrefix.static?.x !== undefined
            ? parseFloat(pendingForPrefix.static.x)
            : parsed.gyroSensX ?? parsed.minSensX ?? parsed.maxSensX ?? 1
      const baseY =
        pendingForPrefix.static?.y === ''
          ? 0
          : pendingForPrefix.static?.y !== undefined
            ? parseFloat(pendingForPrefix.static.y)
            : parsed.gyroSensY ??
              parsed.minSensY ??
              parsed.minSensX ??
              parsed.maxSensY ??
              parsed.maxSensX ??
              parsed.gyroSensX ??
              1
      const current: [number, number] = [baseX, baseY]
      current[index] = parsedValue
      return updateKeymapEntry(prev, resolveSensitivityKey(keyName.GYRO_SENS), current)
    })
  }

  const handleRollContributionChange = useCallback(
    (value: string) => {
      if (value === '') {
        setConfigText(prev => removeKeymapEntry(prev, resolveSensitivityKey(keyName.ROLL_CONTRIBUTION)))
        return
      }
      const parsed = parseFloat(value)
      if (!Number.isFinite(parsed)) return
      const clamped = Math.max(-100, Math.min(100, Math.round(parsed)))
      setConfigText(prev => updateKeymapEntry(prev, resolveSensitivityKey(keyName.ROLL_CONTRIBUTION), [clamped]))
    },
    [resolveSensitivityKey, setConfigText]
  )

  const handleInGameSensChange = (value: string) => {
    if (value === '') {
      setConfigText(prev => removeKeymapEntry(prev, keyName.IN_GAME_SENS))
      return
    }
    const next = parseFloat(value)
    if (Number.isNaN(next)) return
    setConfigText(prev => updateKeymapEntry(prev, keyName.IN_GAME_SENS, [next]))
  }

  const handleRealWorldCalibrationChange = (value: string) => {
    if (value === '') {
      setConfigText(prev => removeKeymapEntry(prev, keyName.REAL_WORLD_CALIBRATION))
      return
    }
    const next = parseFloat(value)
    if (Number.isNaN(next)) return
    setConfigText(prev => updateKeymapEntry(prev, keyName.REAL_WORLD_CALIBRATION, [next]))
  }

  const switchToStaticMode = (prefix?: string) => {
    setConfigText(prev => {
      const values = parseSensitivityValues(prev, prefix ? { prefix } : undefined)
      const hasExistingStatic = values.gyroSensX !== undefined
      const hasAccelFields =
        values.minSensX !== undefined ||
        values.maxSensX !== undefined ||
        values.minThreshold !== undefined ||
        values.maxThreshold !== undefined ||
        values.accelCurve !== undefined ||
        values.naturalVHalf !== undefined ||
        values.powerVRef !== undefined ||
        values.powerExponent !== undefined ||
        values.sigmoidMid !== undefined ||
        values.sigmoidWidth !== undefined ||
        values.jumpTau !== undefined
      if (!hasExistingStatic && !hasAccelFields) {
        return prev
      }
      const defaultX = values.gyroSensX ?? values.minSensX ?? values.maxSensX ?? 1
      const defaultY = values.gyroSensY ?? values.minSensY ?? values.maxSensY ?? defaultX
      let next = updateKeymapEntry(prev, prefixedKey(keyName.GYRO_SENS, prefix), [defaultX, defaultY])
      ;[
        keyName.MIN_GYRO_SENS,
        keyName.MAX_GYRO_SENS,
        keyName.MIN_GYRO_THRESHOLD,
        keyName.MAX_GYRO_THRESHOLD,
        keyName.ACCEL_CURVE,
        keyName.ACCEL_NATURAL_VHALF,
        keyName.ACCEL_POWER_VREF,
        keyName.ACCEL_POWER_EXPONENT,
        keyName.ACCEL_SIGMOID_MID,
        keyName.ACCEL_SIGMOID_WIDTH,
        keyName.ACCEL_JUMP_TAU,
      ].forEach(key => {
        next = removeKeymapEntry(next, prefixedKey(key, prefix))
      })
      return next
    })
  }

  const handleAccelCurveChange = useCallback(
    (value: string) => {
      const upper = value.trim().toUpperCase()
      setConfigText(prev => {
        let next = prev
        if (!upper || upper === 'LINEAR') {
          next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_CURVE))
          next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
          next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_VREF))
          next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT))
          next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_MID))
          next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_WIDTH))
          next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_JUMP_TAU))
          return next
        }
        if (upper === 'NATURAL' || upper === 'POWER' || upper === 'QUADRATIC' || upper === 'SIGMOID' || upper === 'JUMP') {
          next = updateKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_CURVE), [upper])
          if (upper === 'NATURAL') {
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_VREF))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_MID))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_WIDTH))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_JUMP_TAU))
          } else if (upper === 'POWER') {
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_MID))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_WIDTH))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_JUMP_TAU))
          } else if (upper === 'SIGMOID') {
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_VREF))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_JUMP_TAU))
          } else if (upper === 'JUMP') {
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_VREF))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_MID))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_WIDTH))
          } else {
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_VREF))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_MID))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_WIDTH))
            next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_JUMP_TAU))
          }
        }
        return next
      })
    },
    [resolveSensitivityKey, setConfigText]
  )

  const handleNaturalVHalfChange = useCallback(
    (value: string) => {
      if (value === '') {
        setConfigText(prev => removeKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF)))
        return
      }
      const parsed = parseFloat(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return
      setConfigText(prev => {
        let next = updateKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF), [parsed])
        next = updateKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_CURVE), ['NATURAL'])
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_VREF))
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT))
        return next
      })
    },
    [resolveSensitivityKey, setConfigText]
  )

  const handlePowerVRefChange = useCallback(
    (value: string) => {
      if (value === '') {
        setConfigText(prev => removeKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_POWER_VREF)))
        return
      }
      const parsed = parseFloat(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return
      setConfigText(prev => {
        let next = updateKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_POWER_VREF), [parsed])
        next = updateKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_CURVE), ['POWER'])
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
        return next
      })
    },
    [resolveSensitivityKey, setConfigText]
  )

  const handlePowerExponentChange = useCallback(
    (value: string) => {
      if (value === '') {
        setConfigText(prev => removeKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT)))
        return
      }
      const parsed = parseFloat(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return
      setConfigText(prev => {
        let next = updateKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT), [parsed])
        next = updateKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_CURVE), ['POWER'])
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
        return next
      })
    },
    [resolveSensitivityKey, setConfigText]
  )

  const handleJumpTauChange = useCallback(
    (value: string) => {
      if (value === '') {
        setConfigText(prev => removeKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_JUMP_TAU)))
        return
      }
      const parsed = parseFloat(value)
      if (!Number.isFinite(parsed) || parsed < 0) return
      setConfigText(prev => {
        let next = updateKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_JUMP_TAU), [parsed])
        next = updateKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_CURVE), ['JUMP'])
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_VREF))
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT))
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_MID))
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_SIGMOID_WIDTH))
        return next
      })
    },
    [resolveSensitivityKey, setConfigText]
  )

  const handleSigmoidMidChange = useCallback(
    (value: string) => {
      if (value === '') {
        setConfigText(prev => removeKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_SIGMOID_MID)))
        return
      }
      const parsed = parseFloat(value)
      if (!Number.isFinite(parsed)) return
      setConfigText(prev => {
        let next = updateKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_SIGMOID_MID), [parsed])
        next = updateKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_CURVE), ['SIGMOID'])
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_VREF))
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT))
        return next
      })
    },
    [resolveSensitivityKey, setConfigText]
  )

  const handleSigmoidWidthChange = useCallback(
    (value: string) => {
      if (value === '') {
        setConfigText(prev => removeKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_SIGMOID_WIDTH)))
        return
      }
      const parsed = parseFloat(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return
      setConfigText(prev => {
        let next = updateKeymapEntry(prev, resolveSensitivityKey(keyName.ACCEL_SIGMOID_WIDTH), [parsed])
        next = updateKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_CURVE), ['SIGMOID'])
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_NATURAL_VHALF))
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_VREF))
        next = removeKeymapEntry(next, resolveSensitivityKey(keyName.ACCEL_POWER_EXPONENT))
        return next
      })
    },
    [resolveSensitivityKey, setConfigText]
  )

  const switchToAccelMode = (prefix?: string) => {
    setConfigText(prev => {
      const values = parseSensitivityValues(prev, prefix ? { prefix } : undefined)
      if (values.gyroSensX === undefined) {
        return prev
      }
      const defaultX = values.gyroSensX ?? 1
      const defaultY = values.gyroSensY ?? defaultX
      let next = removeKeymapEntry(prev, prefixedKey(keyName.GYRO_SENS, prefix))
      next = updateKeymapEntry(next, prefixedKey(keyName.MIN_GYRO_SENS, prefix), [
        values.minSensX ?? defaultX,
        values.minSensY ?? defaultY,
      ])
      next = updateKeymapEntry(next, prefixedKey(keyName.MAX_GYRO_SENS, prefix), [
        values.maxSensX ?? defaultX,
        values.maxSensY ?? defaultY,
      ])
      next = updateKeymapEntry(next, prefixedKey(keyName.MIN_GYRO_THRESHOLD, prefix), [values.minThreshold ?? 0])
      next = updateKeymapEntry(next, prefixedKey(keyName.MAX_GYRO_THRESHOLD, prefix), [values.maxThreshold ?? 100])
      next = updateKeymapEntry(next, prefixedKey(keyName.ACCEL_CURVE, prefix), ['LINEAR'])
      next = removeKeymapEntry(next, prefixedKey(keyName.ACCEL_NATURAL_VHALF, prefix))
      next = removeKeymapEntry(next, prefixedKey(keyName.ACCEL_POWER_VREF, prefix))
      next = removeKeymapEntry(next, prefixedKey(keyName.ACCEL_POWER_EXPONENT, prefix))
      next = removeKeymapEntry(next, prefixedKey(keyName.ACCEL_SIGMOID_MID, prefix))
      next = removeKeymapEntry(next, prefixedKey(keyName.ACCEL_SIGMOID_WIDTH, prefix))
      next = removeKeymapEntry(next, prefixedKey(keyName.ACCEL_JUMP_TAU, prefix))
      return next
    })
  }

  const holdPressTimeState = useMemo(() => {
    const raw = getKeymapValue(configText, keyName.HOLD_PRESS_TIME)
    if (raw) {
      const parsed = parseFloat(raw)
      if (Number.isFinite(parsed)) {
        return { value: parsed, isCustom: true }
      }
    }
    return { value: DEFAULT_HOLD_PRESS_TIME, isCustom: false }
  }, [configText])
  const holdPressTimeSeconds = holdPressTimeState.value
  const holdPressTimeIsCustom = holdPressTimeState.isCustom
  const doublePressWindowState = useMemo(() => {
    const raw = getKeymapValue(configText, keyName.DBL_PRESS_WINDOW)
    if (raw) {
      const parsed = parseFloat(raw)
      if (Number.isFinite(parsed)) {
        return { value: parsed / 1000, isCustom: true }
      }
    }
    return { value: DEFAULT_WINDOW_SECONDS, isCustom: false }
  }, [configText])
  const doublePressWindowSeconds = doublePressWindowState.value
  const doublePressWindowIsCustom = doublePressWindowState.isCustom
  const simPressWindowState = useMemo(() => {
    const raw = getKeymapValue(configText, keyName.SIM_PRESS_WINDOW)
    if (raw) {
      const parsed = parseFloat(raw)
      if (Number.isFinite(parsed)) {
        return { value: parsed / 1000, isCustom: true }
      }
    }
    return { value: DEFAULT_WINDOW_SECONDS, isCustom: false }
  }, [configText])
  const simPressWindowSeconds = simPressWindowState.value
  const simPressWindowIsCustom = simPressWindowState.isCustom
  const triggerThresholdValue = useMemo(() => {
    const raw = getKeymapValue(configText, keyName.TRIGGER_THRESHOLD)
    if (raw) {
      const parsed = parseFloat(raw)
      if (Number.isFinite(parsed)) {
        return Math.min(1, Math.max(0, parsed))
      }
    }
    return 0
  }, [configText])

  const hasAccelValues = (values?: ReturnType<typeof parseSensitivityValues>) => {
    if (!values) return false
    return (
      values.minSensX !== undefined ||
      values.minSensY !== undefined ||
      values.maxSensX !== undefined ||
      values.maxSensY !== undefined ||
      values.minThreshold !== undefined ||
      values.maxThreshold !== undefined ||
      values.accelCurve !== undefined ||
      values.naturalVHalf !== undefined ||
      values.powerVRef !== undefined ||
      values.powerExponent !== undefined ||
      values.sigmoidMid !== undefined ||
      values.sigmoidWidth !== undefined ||
      values.jumpTau !== undefined
    )
  }

  const baseMode: 'static' | 'accel' =
    sensitivity.gyroSensX !== undefined ? 'static' : hasAccelValues(sensitivity) ? 'accel' : 'static'
  const modeshiftMode: 'static' | 'accel' =
    modeshiftSensitivity?.gyroSensX !== undefined
      ? 'static'
      : hasAccelValues(modeshiftSensitivity)
        ? 'accel'
        : 'static'

  const baseModeDerivedRef = useRef(baseMode)
  const modeshiftModeDerivedRef = useRef(modeshiftMode)
  const [selectedBaseMode, setSelectedBaseMode] = useState<'static' | 'accel'>(baseMode)
  const [selectedModeshiftMode, setSelectedModeshiftMode] = useState<'static' | 'accel'>(modeshiftMode)

  const displaySensitivity = useMemo(() => {
    const source = activeSensitivityPrefix
      ? modeshiftSensitivity ?? parseSensitivityValues(configText, { prefix: activeSensitivityPrefix })
      : sensitivity
    const clone = { ...source }
    const keyPrefix = prefixKey(activeSensitivityPrefix)
    const pending = pendingDual[keyPrefix] ?? {}
    if (pending.min?.x !== undefined) clone.minSensX = pending.min.x === '' ? undefined : parseFloat(pending.min.x)
    if (pending.min?.y !== undefined) clone.minSensY = pending.min.y === '' ? undefined : parseFloat(pending.min.y)
    if (pending.max?.x !== undefined) clone.maxSensX = pending.max.x === '' ? undefined : parseFloat(pending.max.x)
    if (pending.max?.y !== undefined) clone.maxSensY = pending.max.y === '' ? undefined : parseFloat(pending.max.y)
    if (pending.static?.x !== undefined) clone.gyroSensX = pending.static.x === '' ? undefined : parseFloat(pending.static.x)
    if (pending.static?.y !== undefined) clone.gyroSensY = pending.static.y === '' ? undefined : parseFloat(pending.static.y)
    if (clone.gyroSpace === undefined) clone.gyroSpace = sensitivity.gyroSpace
    return clone
  }, [activeSensitivityPrefix, configText, modeshiftSensitivity, pendingDual, sensitivity])

  const finalizePendingValues = useCallback((): string => {
    let next = configText
    const allowed = new Set<string>([prefixKey()])
    if (sensitivityModeshiftButton) {
      allowed.add(prefixKey(`${sensitivityModeshiftButton},`))
    }
    Object.entries(pendingDualRef.current).forEach(([key, pending]) => {
      if (!allowed.has(key)) return
      const prefix = key === '__base__' ? undefined : key
      const mode = key === '__base__' ? selectedBaseMode : selectedModeshiftMode
      const parsed = parseSensitivityValues(next, prefix ? { prefix } : undefined)
      if (pending.min && mode !== 'static') {
        const clearedX = pending.min.x === ''
        const clearedY = pending.min.y === ''
        if (clearedX && clearedY) {
          next = removeKeymapEntry(next, prefixedKey(keyName.MIN_GYRO_SENS, prefix))
        } else {
          const minX =
            clearedX
              ? 0
              : pending.min.x !== undefined
                ? parseFloat(pending.min.x)
                : parsed.minSensX ?? 0
          const minY =
            clearedY
              ? 0
              : pending.min.y !== undefined
                ? parseFloat(pending.min.y)
                : parsed.minSensY ?? parsed.minSensX ?? 0
          next = updateKeymapEntry(next, prefixedKey(keyName.MIN_GYRO_SENS, prefix), [minX, minY])
        }
      }
      if (pending.max && mode !== 'static') {
        const clearedX = pending.max.x === ''
        const clearedY = pending.max.y === ''
        if (clearedX && clearedY) {
          next = removeKeymapEntry(next, prefixedKey(keyName.MAX_GYRO_SENS, prefix))
        } else {
          const maxX =
            clearedX
              ? 0
              : pending.max.x !== undefined
                ? parseFloat(pending.max.x)
                : parsed.maxSensX ?? 0
          const maxY =
            clearedY
              ? 0
              : pending.max.y !== undefined
                ? parseFloat(pending.max.y)
                : parsed.maxSensY ?? parsed.maxSensX ?? 0
          next = updateKeymapEntry(next, prefixedKey(keyName.MAX_GYRO_SENS, prefix), [maxX, maxY])
        }
      }
      if (pending.static && mode === 'static') {
        const clearedX = pending.static.x === ''
        const clearedY = pending.static.y === ''
        if (clearedX && clearedY) {
          next = removeKeymapEntry(next, prefixedKey(keyName.GYRO_SENS, prefix))
        } else {
          const x =
            clearedX
              ? 0
              : pending.static.x !== undefined
                ? parseFloat(pending.static.x)
                : parsed.gyroSensX ?? parsed.minSensX ?? parsed.maxSensX ?? 0
          const y =
            clearedY
              ? 0
              : pending.static.y !== undefined
                ? parseFloat(pending.static.y)
                : parsed.gyroSensY ??
                  parsed.minSensY ??
                  parsed.minSensX ??
                  parsed.maxSensY ??
                  parsed.maxSensX ??
                  parsed.gyroSensX ??
                  0
          next = updateKeymapEntry(next, prefixedKey(keyName.GYRO_SENS, prefix), [x, y])
        }
      }
    })
    setPendingDual({})
    pendingDualRef.current = {}
    if (next !== configText) {
      setConfigText(next)
    }
    return next
  }, [configText, selectedBaseMode, selectedModeshiftMode, setConfigText])

  const resetPendingSensitivityChanges = useCallback(() => {
    setPendingDual({})
    pendingDualRef.current = {}
  }, [])

  useEffect(() => {
    if (selectedBaseMode === baseModeDerivedRef.current && baseMode !== baseModeDerivedRef.current) {
      setSelectedBaseMode(baseMode)
    }
    baseModeDerivedRef.current = baseMode
  }, [baseMode, selectedBaseMode])

  useEffect(() => {
    if (selectedModeshiftMode === modeshiftModeDerivedRef.current && modeshiftMode !== modeshiftModeDerivedRef.current) {
      setSelectedModeshiftMode(modeshiftMode)
    }
    modeshiftModeDerivedRef.current = modeshiftMode
  }, [modeshiftMode, selectedModeshiftMode])

  const handleModeSelection = (mode: 'static' | 'accel', prefix?: string) => {
    if (mode === 'static') {
      switchToStaticMode(prefix)
      if (prefix) {
        setSelectedModeshiftMode('static')
      } else {
        setSelectedBaseMode('static')
      }
      return
    }
    switchToAccelMode(prefix)
    if (prefix) {
      setSelectedModeshiftMode('accel')
    } else {
      setSelectedBaseMode('accel')
    }
  }

  return {
    sensitivityView,
    setSensitivityView,
    sensitivity: displaySensitivity,
    sensitivityModeshiftButton,
    modeshiftSensitivity,
    activeSensitivityPrefix,
    baseMode,
    modeshiftMode,
    selectedBaseMode,
    selectedModeshiftMode,
    holdPressTimeSeconds,
    holdPressTimeIsCustom,
    doublePressWindowSeconds,
    doublePressWindowIsCustom,
    simPressWindowSeconds,
    simPressWindowIsCustom,
    triggerThresholdValue,
    handleSensitivityModeshiftButtonChange,
    handleThresholdChange,
    handleCutoffSpeedChange,
    handleCutoffRecoveryChange,
    handleSmoothTimeChange,
    handleSmoothThresholdChange,
    handleSmoothingDecayChange,
    handleAngleSnapChange,
    handleAngleSnapSmoothChange,
    handleDecelBrakeStrengthChange,
    handleDecelBrakeThresholdChange,
    handleTickTimeChange,
    handleHoldPressTimeChange,
    handleDoublePressWindowChange,
    handleSimPressWindowChange,
    handleTriggerThresholdChange,
    handleGyroSpaceChange,
    handleGyroAxisXChange,
    handleGyroAxisYChange,
    handleDualSensChange,
    handleStaticSensChange,
    handleRollContributionChange,
    handleModeSelection,
    handleInGameSensChange,
    handleRealWorldCalibrationChange,
    finalizePendingValues,
    switchToStaticMode,
    handleAccelCurveChange,
    handleNaturalVHalfChange,
    handlePowerVRefChange,
    handlePowerExponentChange,
    handleJumpTauChange,
    handleSigmoidMidChange,
    handleSigmoidWidthChange,
    switchToAccelMode,
    hasPendingSensitivityChanges,
    resetPendingSensitivityChanges,
  }
}
