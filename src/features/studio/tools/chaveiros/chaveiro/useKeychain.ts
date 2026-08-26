import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from './fonts'
import { defaultKeychainParams, keychainParamsSchema, textItemSchema, type KeychainParams, type FontStyle, type TextItem } from './schema'
import { buildKeychain, type BuildKeychainResult } from './buildKeychain'

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

type KeychainAction =
  | { type: 'update'; key: keyof KeychainParams; value: number | string }
  | { type: 'updateText'; textKey: string; value: number | string }
  | { type: 'addText' }
  | { type: 'removeText'; id: string }
  | { type: 'updateTextById'; id: string; patch: Partial<TextItem> }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  width: { min: 20, max: 80 },
  borderWidth: { min: 4, max: 10 },
  thickness: { min: 2, max: 6 },
  letterHeight: { min: 0.4, max: 2 },
  ringInnerDiameter: { min: 3, max: 10 },
  ringEmbedding: { min: 0, max: 3 },
  ringLateralOffset: { min: -10, max: 10 },
  ringRadialOffset: { min: 0, max: 5 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function keychainReducer(state: KeychainParams, action: KeychainAction): KeychainParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'updateText': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.textKey, action.value)
        : action.value
      const nextTexts = [...state.texts]
      nextTexts[0] = { ...nextTexts[0], [action.textKey]: clamped }
      const next = { ...state, texts: nextTexts }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'addText': {
      if (state.texts.length >= 3) return state
      const newItem: TextItem = { id: crypto.randomUUID(), ...TEXT_ITEM_DEFAULTS }
      const next = { ...state, texts: [...state.texts, newItem] }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'removeText': {
      if (state.texts.length <= 1) return state
      const next = { ...state, texts: state.texts.filter((t) => t.id !== action.id) }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'updateTextById': {
      const patchResult = textItemSchema.partial().safeParse(action.patch)
      if (!patchResult.success) return state
      const nextTexts = state.texts.map((t) =>
        t.id === action.id ? { ...t, ...action.patch } : t,
      )
      const next = { ...state, texts: nextTexts }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultKeychainParams
  }
}

function deriveHeight(shape: string, width: number): number {
  switch (shape) {
    case 'circle': return width
    case 'heart': return width * 14 / 16
    case 'rect':
    default: return width / 2
  }
}

export function useKeychain() {
  const [params, dispatch] = useReducer(keychainReducer, defaultKeychainParams)
  const [fontCache, setFontCache] = useState<Map<FontStyle, Font>>(new Map())
  const [fontError, setFontError] = useState(false)
  const [geometry, setGeometry] = useState<BuildKeychainResult | null>(null)
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
        return buildKeychain({ font, params, onError: () => undefined })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [font, params])

  const updateParam = useCallback((key: keyof KeychainParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const updateName = useCallback((content: string) => {
    dispatch({ type: 'updateText', textKey: 'content', value: content })
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
    const height = deriveHeight(params.baseShape, params.width)
    return { width: params.width, height, thickness: params.thickness }
  }, [params.width, params.baseShape, params.thickness])

  return { params, geometry, fontError, dimensions, updateParam, updateName, addText, removeText, updateText, reset }
}
