import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { defaultCutterStampParams, cutterStampParamsSchema, type CutterStampParams } from './schema'
import { buildCutterStamp, type BuildCutterStampResult } from './buildCutterStamp'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'

type CutterStampAction =
  | { type: 'update'; key: keyof CutterStampParams; value: number | string | boolean | null }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  diameter: { min: 30, max: 80 },
  rectWidth: { min: 30, max: 80 },
  rectHeight: { min: 30, max: 80 },
  wallHeight: { min: 15, max: 40 },
  wallThickness: { min: 0.8, max: 2 },
  stampHeight: { min: 5, max: 20 },
  fontSize: { min: 5, max: 15 },
  shapeScale: { min: 0.5, max: 2.0 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function cutterStampReducer(state: CutterStampParams, action: CutterStampAction): CutterStampParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }

      // Enforce stampHeight < wallHeight
      if (action.key === 'wallHeight' && typeof clamped === 'number') {
        if (next.stampHeight >= clamped) {
          next.stampHeight = Math.max(5, clamped - 1)
        }
      }
      if (action.key === 'stampHeight' && typeof clamped === 'number') {
        if (clamped >= state.wallHeight) {
          next.stampHeight = state.wallHeight - 1
        }
      }

      const parsed = cutterStampParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultCutterStampParams
  }
}

export function useCutterStamp() {
  const [params, dispatch] = useReducer(cutterStampReducer, defaultCutterStampParams)
  const [geometry, setGeometry] = useState<BuildCutterStampResult | null>(null)
  const [font, setFont] = useState<Font | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!params.text) {
      setFont(null)
      return
    }
    const loader = new FontLoader()
    const fontStyle = params.fontStyle
    const url = fontUrls[fontStyle] || fontUrls.bold

    loader.load(url, (loadedFont) => {
      setFont(loadedFont)
    })
  }, [params.fontStyle, params.text])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.wall.dispose()
        prev?.text?.dispose()
        prev?.centralShape?.dispose()
        return buildCutterStamp({ params, font })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [params, font])

  const updateParam = useCallback((key: keyof CutterStampParams, value: number | string | boolean | null) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    width: params.outerShape === 'rectangle' ? params.rectWidth : params.diameter,
    height: params.wallHeight,
    thickness: params.wallThickness,
  }), [params.outerShape, params.diameter, params.rectWidth, params.wallHeight, params.wallThickness])

  const cameraPosition = useMemo((): [number, number, number] => {
    const size = params.outerShape === 'rectangle'
      ? Math.max(params.rectWidth, params.rectHeight)
      : params.diameter
    const distance = size * 2
    return [0, 0, distance]
  }, [params.outerShape, params.diameter, params.rectWidth, params.rectHeight])

  return { params, geometry, dimensions, cameraPosition, updateParam, reset }
}
