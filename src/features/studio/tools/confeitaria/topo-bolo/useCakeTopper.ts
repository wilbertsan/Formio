import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { defaultCakeTopperParams, cakeTopperParamsSchema, type CakeTopperParams } from './schema'
import { buildCakeTopper, type BuildCakeTopperResult } from './buildCakeTopper'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'

type CakeTopperAction =
  | { type: 'update'; key: keyof CakeTopperParams; value: number | string | boolean | null }
  | { type: 'setSvg'; svg: string | null }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  fontSize: { min: 8, max: 20 },
  width: { min: 50, max: 120 },
  height: { min: 30, max: 80 },
  thickness: { min: 2, max: 4 },
  iconScale: { min: 0.5, max: 2.0 },
  legHeight: { min: 30, max: 60 },
  legWidth: { min: 3, max: 8 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function cakeTopperReducer(state: CakeTopperParams, action: CakeTopperAction): CakeTopperParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = cakeTopperParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'setSvg': {
      const next = { ...state, svgIcon: action.svg }
      const parsed = cakeTopperParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultCakeTopperParams
  }
}

export function useCakeTopper() {
  const [params, dispatch] = useReducer(cakeTopperReducer, defaultCakeTopperParams)
  const [geometry, setGeometry] = useState<BuildCakeTopperResult | null>(null)
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
        prev?.plate.dispose()
        prev?.text?.dispose()
        prev?.icon?.dispose()
        prev?.leg?.dispose()
        return buildCakeTopper({ params, font })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [params, font])

  const updateParam = useCallback((key: keyof CakeTopperParams, value: number | string | boolean | null) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const setSvgIcon = useCallback((svg: string | null) => {
    dispatch({ type: 'setSvg', svg })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    width: params.width,
    height: params.height + params.legHeight,
    thickness: params.thickness,
  }), [params.width, params.height, params.legHeight, params.thickness])

  const cameraPosition = useMemo((): [number, number, number] => {
    const totalHeight = params.height + params.legHeight
    const distance = Math.max(params.width, totalHeight) * 2
    return [0, 0, distance]
  }, [params.width, params.height, params.legHeight])

  return { params, geometry, dimensions, cameraPosition, updateParam, setSvgIcon, reset }
}
