import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from './fonts'
import { defaultBookmarkParams, bookmarkParamsSchema, textItemSchema, type BookmarkParams, type FontStyle, type TextItem } from './schema'
import { buildBookmark, type BuildBookmarkResult } from './buildBookmark'

const TEXT_ITEM_DEFAULTS = {
  content: 'Novo texto',
  fontStyle: 'bold' as const,
  width: 30,
  height: 8,
  relief: 1,
  proportional: false,
  offsetX: 0,
  offsetY: 0,
}

type BookmarkAction =
  | { type: 'update'; key: keyof BookmarkParams; value: number | string }
  | { type: 'updateText'; textKey: string; value: number | string }
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
    case 'updateText': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.textKey, action.value)
        : action.value
      const nextTexts = [...state.texts]
      nextTexts[0] = { ...nextTexts[0], [action.textKey]: clamped }
      const next = { ...state, texts: nextTexts }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'addText': {
      if (state.texts.length >= 3) return state
      const newItem: TextItem = { id: crypto.randomUUID(), ...TEXT_ITEM_DEFAULTS }
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
  const [fontCache, setFontCache] = useState<Map<FontStyle, Font>>(new Map())
  const [fontError, setFontError] = useState(false)
  const [geometry, setGeometry] = useState<BuildBookmarkResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const uniqueStyles = useMemo(() => {
    const styles = new Set(params.texts.map((t) => t.fontStyle))
    return Array.from(styles)
  }, [params.texts])

  useEffect(() => {
    for (const style of uniqueStyles) {
      if (fontCache.has(style)) continue
      const loader = new FontLoader()
      loader.load(
        fontUrls[style],
        (font) => {
          setFontCache((prev) => new Map(prev).set(style, font as unknown as Font))
        },
        undefined,
        () => setFontError(true),
      )
    }
  }, [uniqueStyles, fontCache])

  const font = fontCache.get(params.texts[0]?.fontStyle ?? 'bold') ?? null

  useEffect(() => {
    if (!font) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.base.dispose()
        prev?.text.dispose()
        return buildBookmark({ font, params, onError: () => undefined })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [font, params])

  const updateParam = useCallback((key: keyof BookmarkParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const addText = useCallback(() => {
    dispatch({ type: 'addText' })
  }, [])

  const removeText = useCallback((id: string) => {
    dispatch({ type: 'removeText', id })
  }, [])

  const updateText = useCallback((id: string, patch: Partial<TextItem>) => {
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

  return { params, geometry, fontError, dimensions, updateParam, addText, removeText, updateText, reset }
}