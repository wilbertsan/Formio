import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from './fonts'
import { defaultPlacaLojaParams, defaultText, placaLojaParamsSchema, textItemSchema, type PlacaLojaParams, type TextItem } from './schema'
import { buildPlacaLoja, type BuildPlacaLojaResult } from './buildPlacaLoja'

const DEBOUNCE_MS = 200

type FontStyle = 'normal' | 'bold' | 'serif'

type PlacaLojaAction =
  | { type: 'update'; key: keyof PlacaLojaParams; value: number | string }
  | { type: 'addText' }
  | { type: 'removeText'; id: string }
  | { type: 'updateTextById'; id: string; patch: Partial<TextItem> }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  width: { min: 100, max: 300 },
  height: { min: 50, max: 150 },
  thickness: { min: 3, max: 8 },
  cornerRadius: { min: 5, max: 20 },
  screwHoleDiameter: { min: 4, max: 6 },
  screwHoleMargin: { min: 5, max: 15 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function placaLojaReducer(state: PlacaLojaParams, action: PlacaLojaAction): PlacaLojaParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = placaLojaParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'addText': {
      if (state.texts.length >= 5) return state
      const newItem: TextItem = { ...defaultText, id: crypto.randomUUID() }
      const next = { ...state, texts: [...state.texts, newItem] }
      const parsed = placaLojaParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'removeText': {
      if (state.texts.length <= 1) return state
      const next = { ...state, texts: state.texts.filter((t) => t.id !== action.id) }
      const parsed = placaLojaParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'updateTextById': {
      const patchResult = textItemSchema.partial().safeParse(action.patch)
      if (!patchResult.success) return state
      const nextTexts = state.texts.map((t) =>
        t.id === action.id ? { ...t, ...action.patch } : t,
      )
      const next = { ...state, texts: nextTexts }
      const parsed = placaLojaParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultPlacaLojaParams
  }
}

export function usePlacaLoja() {
  const [params, dispatch] = useReducer(placaLojaReducer, defaultPlacaLojaParams)
  const [fontError, setFontError] = useState(false)
  const [geometry, setGeometry] = useState<BuildPlacaLojaResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const fontCacheRef = useRef<Map<FontStyle, Font>>(new Map())
  const [, setFontCacheVersion] = useState(0)

  const uniqueStyles = useMemo(() => {
    const styles = new Set(params.texts.map((t) => t.fontStyle))
    return Array.from(styles)
  }, [params.texts])

  useEffect(() => {
    for (const style of uniqueStyles) {
      if (fontCacheRef.current.has(style)) continue
      const loader = new FontLoader()
      loader.load(
        fontUrls[style],
        (font) => {
          fontCacheRef.current.set(style, font as unknown as Font)
          setFontCacheVersion((v) => v + 1)
        },
        undefined,
        () => setFontError(true),
      )
    }
  }, [uniqueStyles])

  const hasAllFonts = uniqueStyles.every((style) => fontCacheRef.current.has(style))

  useEffect(() => {
    if (!hasAllFonts) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const fontsMap: Record<string, Font> = {}
      fontCacheRef.current.forEach((font, style) => {
        fontsMap[style] = font
      })
      setGeometry((prev) => {
        prev?.base.dispose()
        prev?.text.dispose()
        prev?.textItems.forEach((ti) => ti.geometry.dispose())
        return buildPlacaLoja({ fonts: fontsMap, params, onError: () => undefined })
      })
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [hasAllFonts, params])

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current)
      setGeometry((prev) => {
        prev?.base.dispose()
        prev?.text.dispose()
        prev?.textItems.forEach((ti) => ti.geometry.dispose())
        return null
      })
    }
  }, [])

  const updateParam = useCallback((key: keyof PlacaLojaParams, value: number | string) => {
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

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => {
    return {
      width: params.width,
      height: params.height,
      thickness: params.thickness,
    }
  }, [params.width, params.height, params.thickness])

  return { params, geometry, fontError, dimensions, updateParam, addText, removeText, updateTextById, reset }
}
