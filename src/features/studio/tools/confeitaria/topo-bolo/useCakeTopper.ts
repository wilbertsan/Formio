import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'
import {
  defaultCakeTopperParams,
  defaultText,
  cakeTopperParamsSchema,
  textItemSchema,
  type CakeTopperParams,
  type FontStyle,
  type TextItem,
} from './schema'
import {
  buildCakeTopper,
  disposeCakeTopperResult,
  type BuildCakeTopperResult,
} from './buildCakeTopper'

const DEBOUNCE_MS = 200
const MAX_TEXTS = 3
const MIN_TEXTS = 1

type CakeTopperAction =
  | { type: 'update'; key: keyof CakeTopperParams; value: number | string | null }
  | { type: 'addText' }
  | { type: 'removeText'; id: string }
  | { type: 'updateTextById'; id: string; patch: Partial<TextItem> }
  | { type: 'reset' }

type NumericRanges = Record<string, { min: number; max: number }>

const NUMERIC_RANGES: NumericRanges = {
  width: { min: 50, max: 120 },
  height: { min: 30, max: 80 },
  thickness: { min: 2, max: 4 },
  cornerRadius: { min: 3, max: 15 },
  iconScale: { min: 0.5, max: 2 },
  stemDiameter: { min: 3, max: 8 },
  stemLength: { min: 20, max: 60 },
  slotWidth: { min: 2.4, max: 4.5 },
  slotDepth: { min: 5, max: 20 },
  baseWidth: { min: 30, max: 60 },
  baseDepth: { min: 20, max: 40 },
}

const TEXT_NUMERIC_RANGES: NumericRanges = {
  width: { min: 10, max: 110 },
  height: { min: 5, max: 50 },
  relief: { min: 0.4, max: 3 },
  offsetX: { min: -55, max: 55 },
  offsetY: { min: -35, max: 35 },
}

function clampWith(ranges: NumericRanges, key: string, value: number): number {
  const range = ranges[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function clampTextPatch(patch: Partial<TextItem>): Partial<TextItem> {
  const clamped: Partial<TextItem> = { ...patch }
  for (const key of Object.keys(clamped)) {
    const value = clamped[key as keyof TextItem]
    if (typeof value === 'number') {
      ;(clamped as Record<string, unknown>)[key] = clampWith(TEXT_NUMERIC_RANGES, key, value)
    }
  }
  return clamped
}

function cakeTopperReducer(state: CakeTopperParams, action: CakeTopperAction): CakeTopperParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampWith(NUMERIC_RANGES, action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = cakeTopperParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'addText': {
      if (state.texts.length >= MAX_TEXTS) return state
      const newItem: TextItem = { ...defaultText, id: crypto.randomUUID() }
      const next = { ...state, texts: [...state.texts, newItem] }
      const parsed = cakeTopperParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'removeText': {
      if (state.texts.length <= MIN_TEXTS) return state
      const next = { ...state, texts: state.texts.filter((t) => t.id !== action.id) }
      const parsed = cakeTopperParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'updateTextById': {
      const patch = clampTextPatch(action.patch)
      const patchResult = textItemSchema.partial().safeParse(patch)
      if (!patchResult.success) return state
      const nextTexts = state.texts.map((t) => (t.id === action.id ? { ...t, ...patch } : t))
      const next = { ...state, texts: nextTexts }
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
  const [fontError, setFontError] = useState(false)
  const [fontCacheVersion, setFontCacheVersion] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const fontCacheRef = useRef<Map<FontStyle, Font>>(new Map())
  const geometryRef = useRef<BuildCakeTopperResult | null>(null)

  const uniqueStyles = useMemo(() => {
    const styles = new Set(params.texts.map((t) => t.fontStyle))
    return Array.from(styles)
  }, [params.texts])

  // A geometria só depende da fonte primária; estilos ausentes são ignorados
  // pelo próprio builder, que reporta o erro via `onError`.
  const primaryStyle = params.texts[0]?.fontStyle ?? 'bold'
  const primaryFont = fontCacheRef.current.get(primaryStyle) ?? null

  useEffect(() => {
    for (const style of uniqueStyles) {
      if (fontCacheRef.current.has(style)) continue
      const loader = new FontLoader()
      loader.load(
        fontUrls[style],
        (loaded) => {
          fontCacheRef.current.set(style, loaded as unknown as Font)
          setFontError(false)
          setFontCacheVersion((v) => v + 1)
        },
        undefined,
        () => setFontError(true),
      )
    }
  }, [uniqueStyles])

  const handleBuildError = useCallback((message: string) => {
    if (message.startsWith('Fonte indisponível')) setFontError(true)
  }, [])

  useEffect(() => {
    if (!primaryFont) return
    // `fontCacheVersion` invalida o cache em ref quando uma fonte tardia chega.
    void fontCacheVersion
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const fonts: Partial<Record<FontStyle, Font>> = {}
      for (const style of uniqueStyles) {
        const cached = fontCacheRef.current.get(style)
        if (cached) fonts[style] = cached
      }
      if (geometryRef.current) {
        disposeCakeTopperResult(geometryRef.current)
        geometryRef.current = null
      }
      const result = buildCakeTopper({ params, fonts, onError: handleBuildError })
      geometryRef.current = result
      setGeometry(result)
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [primaryFont, uniqueStyles, params, fontCacheVersion, handleBuildError])

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current)
      if (geometryRef.current) {
        disposeCakeTopperResult(geometryRef.current)
        geometryRef.current = null
      }
    }
  }, [])

  const updateParam = useCallback((key: keyof CakeTopperParams, value: number | string | null) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const addText = useCallback(() => {
    dispatch({ type: 'addText' })
  }, [])

  const removeText = useCallback((id: string) => {
    dispatch({ type: 'removeText', id })
  }, [])

  const updateTextById = useCallback((id: string, patch: Partial<TextItem>) => {
    dispatch({ type: 'updateTextById', id, patch })
  }, [])

  const setSvgIcon = useCallback((svg: string | null) => {
    dispatch({ type: 'update', key: 'svgIcon', value: svg })
  }, [])

  const setContourSvg = useCallback((svg: string | null) => {
    dispatch({ type: 'update', key: 'contourSvg', value: svg })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const totalHeight = useMemo(
    () => params.height + (params.supportType === 'haste' ? params.stemLength : 0),
    [params.height, params.supportType, params.stemLength],
  )

  const dimensions = useMemo(() => {
    return {
      width: params.width,
      height: totalHeight,
      thickness: params.thickness,
    }
  }, [params.width, totalHeight, params.thickness])

  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = Math.max(params.width, totalHeight) * 2
    return [0, 0, distance]
  }, [params.width, totalHeight])

  return {
    params,
    geometry,
    fontError,
    dimensions,
    cameraPosition,
    updateParam,
    addText,
    removeText,
    updateTextById,
    setSvgIcon,
    setContourSvg,
    reset,
  }
}
