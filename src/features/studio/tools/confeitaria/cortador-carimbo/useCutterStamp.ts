import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { cutterStampParamsSchema, defaultCutterStampParams, type CutterStampParams } from './schema'
import { buildCutterStamp, type BuildCutterStampResult } from './buildCutterStamp'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'

type CutterStampAction =
  | { type: 'update'; key: keyof CutterStampParams; value: number | string | null }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  textHeight: { min: 10, max: 60 },
  wallHeight: { min: 15, max: 40 },
  wallThickness: { min: 0.8, max: 2 },
  stampHeight: { min: 15, max: 25 },
  baseMargin: { min: 2, max: 10 },
  reliefHeight: { min: 1, max: 3 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function cutterStampReducer(state: CutterStampParams, action: CutterStampAction): CutterStampParams {
  switch (action.type) {
    case 'update': {
      const value = typeof action.value === 'number' ? clampValue(action.key, action.value) : action.value
      const next = { ...state, [action.key]: value }
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
    const loader = new FontLoader()
    loader.load(fontUrls[params.fontStyle] || fontUrls.bold, (loadedFont) => {
      setFont(loadedFont)
    })
  }, [params.fontStyle])

  useEffect(() => {
    if (!font) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.cutter.dispose()
        prev?.stampBase.dispose()
        prev?.stampRelief.dispose()
        prev?.stampHandle.dispose()
        return buildCutterStamp({ params, font })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [params, font])

  const updateParam = useCallback((key: keyof CutterStampParams, value: number | string | null) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => {
    const height = Number(Math.max(params.wallHeight, params.stampHeight).toFixed(1))
    if (!geometry) {
      return { width: 0, height, thickness: params.wallThickness }
    }

    let minX = Infinity
    let maxX = -Infinity
    for (const piece of [geometry.cutter, geometry.stampBase, geometry.stampRelief, geometry.stampHandle]) {
      piece.computeBoundingBox()
      const bb = piece.boundingBox!
      minX = Math.min(minX, bb.min.x)
      maxX = Math.max(maxX, bb.max.x)
    }

    return {
      width: Number((maxX - minX).toFixed(1)),
      height,
      thickness: params.wallThickness,
    }
  }, [geometry, params.wallHeight, params.stampHeight, params.wallThickness])

  const cameraPosition = useMemo((): [number, number, number] => {
    const span = Math.max(dimensions.width, dimensions.height, params.textHeight)
    return [0, span * 0.6, span * 1.6]
  }, [dimensions.width, dimensions.height, params.textHeight])

  return { params, geometry, dimensions, cameraPosition, updateParam, reset }
}
