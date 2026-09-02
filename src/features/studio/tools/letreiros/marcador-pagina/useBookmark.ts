import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from './fonts'
import { defaultBookmarkParams, defaultText, bookmarkParamsSchema, textItemSchema, type BookmarkParams, type FontStyle, type TextItem } from './schema'
import { buildBookmark, type BuildBookmarkResult } from './buildBookmark'

const DEBOUNCE_MS = 200

type BookmarkAction =
  | { type: 'update'; key: keyof BookmarkParams; value: number | string }
  | { type: 'addText' }
  | { type: 'removeText'; id: string }
  | { type: 'updateTextById'; id: string; patch: Partial<TextItem> }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  length: { min: 50, max: 150 },
  width: { min: 30, max: 50 },
  holeDiameter: { min: 3, max: 8 },
  holeMargin: { min: 5, max: 15 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function bookmarkReducer(state: BookmarkParams, action: BookmarkAction): BookmarkParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'addText': {
      if (state.texts.length >= 3) return state
      const newItem: TextItem = { ...defaultText, id: crypto.randomUUID() }
      const next = { ...state, texts: [...state.texts, newItem] }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'removeText': {
      if (state.texts.length <= 1) return state
      const next = { ...state, texts: state.texts.filter((t) => t.id !== action.id) }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'updateTextById': {
      const patchResult = textItemSchema.partial().safeParse(action.patch)
      if (!patchResult.success) return state
      const nextTexts = state.texts.map((t) =>
        t.id === action.id ? { ...t, ...action.patch } : t,
      )
      const next = { ...state, texts: nextTexts }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultBookmarkParams
  }
}

export function useBookmark() {
  const [params, dispatch] = useReducer(bookmarkReducer, defaultBookmarkParams)
  const [fontError, setFontError] = useState(false)
  const [geometry, setGeometry] = useState<BuildBookmarkResult | null>(null)
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

  const font = fontCacheRef.current.get(params.texts[0]?.fontStyle ?? 'bold') ?? null

  useEffect(() => {
    if (!font) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.textItems.forEach((ti) => ti.geometry.dispose())
        prev?.base.dispose()
        prev?.text.dispose()
        return buildBookmark({ font, params, onError: () => undefined })
      })
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [font, params])

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current)
      setGeometry((prev) => {
        prev?.textItems.forEach((ti) => ti.geometry.dispose())
        prev?.base.dispose()
        prev?.text.dispose()
        return null
      })
    }
  }, [])

  const updateParam = useCallback((key: keyof BookmarkParams, value: number | string) => {
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
      length: params.length,
      width: params.width,
      thickness: params.thickness,
    }
  }, [params.length, params.width, params.thickness])

  return { params, geometry, fontError, dimensions, updateParam, addText, removeText, updateTextById, reset }
}
