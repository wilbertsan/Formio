import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from '@/features/studio/tools/chaveiros/chaveiro/fonts'
import { defaultPhotoStandParams, photoStandParamsSchema, type PhotoStandParams, type FontStyle } from './schema'
import { buildPhotoStand, type BuildPhotoStandResult } from './buildPhotoStand'

type PhotoStandAction =
  | { type: 'update'; key: keyof PhotoStandParams; value: number | string }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  baseHeight: { min: 50, max: 120 },
  baseThickness: { min: 2, max: 4 },
  baseMinWidth: { min: 40, max: 100 },
  baseDepth: { min: 30, max: 60 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function photoStandReducer(state: PhotoStandParams, action: PhotoStandAction): PhotoStandParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = photoStandParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultPhotoStandParams
  }
}

export function usePhotoStand() {
  const [params, dispatch] = useReducer(photoStandReducer, defaultPhotoStandParams)
  const [fontCache, setFontCache] = useState<Map<FontStyle, Font>>(new Map())
  const [geometry, setGeometry] = useState<BuildPhotoStandResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fontStyle = params.fontStyle

  useEffect(() => {
    if (fontCache.has(fontStyle)) return
    const loader = new FontLoader()
    loader.load(
      fontUrls[fontStyle],
      (font) => {
        setFontCache((prev) => new Map(prev).set(fontStyle, font as unknown as Font))
      },
    )
  }, [fontStyle, fontCache])

  const font = fontCache.get(fontStyle) ?? null

  useEffect(() => {
    if (!font) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.leftText.dispose()
        prev?.rightText.dispose()
        prev?.base.dispose()
        return buildPhotoStand({ params, font })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [font, params])

  const updateParam = useCallback((key: keyof PhotoStandParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    width: params.baseMinWidth,
    height: params.baseHeight,
    depth: params.baseDepth,
  }), [params.baseMinWidth, params.baseHeight, params.baseDepth])

  return { params, geometry, dimensions, updateParam, reset }
}
