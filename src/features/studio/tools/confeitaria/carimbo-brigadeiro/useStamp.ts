import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { defaultStampParams, stampParamsSchema, type StampParams } from './schema'
import { buildStamp, type BuildStampResult } from './buildStamp'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'

type StampAction =
  | { type: 'update'; key: keyof StampParams; value: number | string | boolean | null }
  | { type: 'setSvg'; svg: string | null }
  | { type: 'reset' }

// Ângulo (graus) da câmera de reset, no plano XZ em torno do eixo vertical (Y).
const RESET_CAMERA_ANGLE_DEGREES = 240
// Inclinação (graus) da câmera de reset em torno do eixo X.
const RESET_CAMERA_TILT_DEGREES = 30

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  fontSize: { min: 6, max: 15 },
  diameter: { min: 10, max: 30 },
  height: { min: 15, max: 25 },
  iconScale: { min: 0.5, max: 1.0 },
  iconLineWidth: { min: 0.1, max: 1.5 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function stampReducer(state: StampParams, action: StampAction): StampParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = stampParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'setSvg': {
      const next = { ...state, svgIcon: action.svg }
      const parsed = stampParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultStampParams
  }
}

export function useStamp() {
  const [params, dispatch] = useReducer(stampReducer, defaultStampParams)
  const [geometry, setGeometry] = useState<BuildStampResult | null>(null)
  const [font, setFont] = useState<Font | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const loader = new FontLoader()
    const fontStyle = params.fontStyle
    const url = fontUrls[fontStyle] || fontUrls.bold

    loader.load(url, (loadedFont) => {
      setFont(loadedFont)
    })
  }, [params.fontStyle])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.base.dispose()
        prev?.handle.dispose()
        prev?.text?.dispose()
        prev?.icon?.dispose()
        return buildStamp({ params, font })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [params, font])

  const updateParam = useCallback((key: keyof StampParams, value: number | string | boolean | null) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const setSvgIcon = useCallback((svg: string | null) => {
    dispatch({ type: 'setSvg', svg })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    width: params.diameter,
    height: params.height,
    thickness: params.diameter,
  }), [params.diameter, params.height])

  // Posição da câmera de reset: 240° no plano XZ (eixo Y) e 20° de inclinação (eixo X).
  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = params.diameter * 2
    const azimuth = (RESET_CAMERA_ANGLE_DEGREES * Math.PI) / 180
    const tilt = (RESET_CAMERA_TILT_DEGREES * Math.PI) / 180
    const x = distance * Math.sin(azimuth)
    const z = distance * Math.cos(azimuth)
    return [x, -z * Math.sin(tilt), z * Math.cos(tilt)]
  }, [params.diameter])

  return { params, geometry, dimensions, cameraPosition, updateParam, setSvgIcon, reset }
}
