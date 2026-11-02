import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from './fonts'
import {
  defaultKeychainParams,
  keychainParamsSchema,
  type ContentItem,
  type FontStyle,
  type IconContent,
  type KeychainParams,
  type TextContent,
} from './schema'
import { buildKeychain, type BuildKeychainResult } from './buildKeychain'

const TEXT_DEFAULTS = {
  content: 'Novo texto',
  fontStyle: 'bold' as const,
  fontSize: 10,
  offsetX: 0,
  offsetY: 0,
}

const ICON_DEFAULTS = {
  svgIcon: null as string | null,
  iconScale: 1,
  iconLineWidth: 0.3,
  offsetX: 0,
  offsetY: 0,
}

type KeychainAction =
  | { type: 'update'; key: keyof KeychainParams; value: number | string }
  | { type: 'updateContent'; id: string; patch: Partial<TextContent> | Partial<IconContent> }
  | { type: 'setContentType'; id: string; kind: 'text' | 'icon' }
  | { type: 'addContent'; id: string }
  | { type: 'removeContent'; id: string }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  width: { min: 20, max: 80 },
  height: { min: 20, max: 80 },
  borderWidth: { min: 4, max: 10 },
  thickness: { min: 2, max: 6 },
  reliefDepth: { min: 0.4, max: 2 },
  ringInnerDiameter: { min: 3, max: 10 },
  ringEmbedding: { min: 0, max: 3 },
  ringLateralOffset: { min: -10, max: 10 },
  ringRadialOffset: { min: 0, max: 5 },
}

const CONTENT_NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  fontSize: { min: 6, max: 15 },
  iconScale: { min: 0.5, max: 1 },
  iconLineWidth: { min: 0.1, max: 1.5 },
  offsetX: { min: -20, max: 20 },
  offsetY: { min: -20, max: 20 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function clampContentPatch(
  patch: Partial<TextContent> | Partial<IconContent>,
): Partial<TextContent> | Partial<IconContent> {
  const result: Record<string, unknown> = { ...patch }
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value !== 'number') continue
    const range = CONTENT_NUMERIC_RANGES[key]
    if (range) result[key] = Math.min(range.max, Math.max(range.min, value))
  }
  return result as Partial<TextContent> | Partial<IconContent>
}

function freshDefaults(): KeychainParams {
  return {
    ...defaultKeychainParams,
    contents: defaultKeychainParams.contents.map((item): ContentItem => ({ ...item })),
  }
}

function keychainReducer(state: KeychainParams, action: KeychainAction): KeychainParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'updateContent': {
      if (!state.contents.some((item) => item.id === action.id)) return state
      const patch = clampContentPatch(action.patch)
      const nextContents = state.contents.map((item) =>
        item.id === action.id ? ({ ...item, ...patch } as ContentItem) : item,
      )
      const next = { ...state, contents: nextContents }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'setContentType': {
      const target = state.contents.find((item) => item.id === action.id)
      if (!target || target.kind === action.kind) return state
      const nextContents = state.contents.map((item) => {
        if (item.id !== action.id) return item
        if (action.kind === 'text') {
          const replacement: TextContent = {
            id: item.id,
            kind: 'text',
            ...TEXT_DEFAULTS,
            offsetX: item.offsetX,
            offsetY: item.offsetY,
          }
          return replacement
        }
        const replacement: IconContent = {
          id: item.id,
          kind: 'icon',
          ...ICON_DEFAULTS,
          offsetX: item.offsetX,
          offsetY: item.offsetY,
        }
        return replacement
      })
      const next = { ...state, contents: nextContents }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'addContent': {
      if (state.contents.length >= 3) return state
      const newItem: TextContent = {
        id: action.id,
        kind: 'text',
        ...TEXT_DEFAULTS,
        offsetY: state.contents.length === 1 ? -6 : 6,
      }
      const next = { ...state, contents: [...state.contents, newItem] }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'removeContent': {
      if (state.contents.length <= 1) return state
      const next = { ...state, contents: state.contents.filter((item) => item.id !== action.id) }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'reset':
      return freshDefaults()
  }
}

export function useKeychain() {
  const [params, dispatch] = useReducer(keychainReducer, defaultKeychainParams)
  const [fontCache, setFontCache] = useState<Map<FontStyle, Font>>(new Map())
  const [fontError, setFontError] = useState(false)
  const [geometry, setGeometry] = useState<BuildKeychainResult | null>(null)
  const geometryRef = useRef<BuildKeychainResult | null>(null)

  const uniqueStyles = useMemo(() => {
    const styles = new Set<FontStyle>()
    for (const item of params.contents) {
      if (item.kind === 'text') styles.add(item.fontStyle)
    }
    return Array.from(styles)
  }, [params.contents])

  const styleKey = uniqueStyles.join(',')

  useEffect(() => {
    let cancelled = false
    const styles = styleKey.length > 0 ? (styleKey.split(',') as FontStyle[]) : []
    const pending = styles.filter((style) => !fontCache.has(style))
    if (pending.length > 0) setFontError(false)

    for (const style of pending) {
      const loader = new FontLoader()
      loader.load(
        fontUrls[style],
        (font) => {
          if (cancelled) return
          setFontCache((prev) => new Map(prev).set(style, font as unknown as Font))
        },
        undefined,
        () => {
          if (!cancelled) setFontError(true)
        },
      )
    }

    return () => {
      cancelled = true
    }
  }, [styleKey, fontCache])

  const fonts = useMemo(
    () => Object.fromEntries(fontCache) as Partial<Record<FontStyle, Font>>,
    [fontCache],
  )

  const ready = uniqueStyles.every((style) => fontCache.has(style))

  useEffect(() => {
    geometryRef.current = geometry
  }, [geometry])

  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      try {
        const next = buildKeychain({ fonts, params, onError: () => undefined })
        const prev = geometryRef.current
        geometryRef.current = next
        setGeometry(next)
        prev?.base.dispose()
        prev?.content?.dispose()
      } catch {
        // mantém a geometria anterior; onError é opcional
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [ready, fonts, params])

  useEffect(() => {
    return () => {
      geometryRef.current?.base.dispose()
      geometryRef.current?.content?.dispose()
    }
  }, [])

  const updateParam = useCallback((key: keyof KeychainParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const updateContent = useCallback(
    (id: string, patch: Partial<TextContent> | Partial<IconContent>) => {
      dispatch({ type: 'updateContent', id, patch })
    },
    [],
  )

  const setContentType = useCallback((id: string, kind: 'text' | 'icon') => {
    dispatch({ type: 'setContentType', id, kind })
  }, [])

  const addContent = useCallback((): string | null => {
    if (params.contents.length >= 3) return null
    const id = crypto.randomUUID()
    dispatch({ type: 'addContent', id })
    return id
  }, [params.contents.length])

  const removeContent = useCallback((id: string) => {
    dispatch({ type: 'removeContent', id })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => {
    if (params.baseShape === 'name') {
      if (geometry) {
        return {
          width: geometry.pieceBB.maxX - geometry.pieceBB.minX,
          height: geometry.pieceBB.maxY - geometry.pieceBB.minY,
          thickness: params.thickness,
        }
      }
      return { width: 0, height: 0, thickness: params.thickness }
    }
    return { width: params.width, height: params.height, thickness: params.thickness }
  }, [params, geometry])

  return {
    params,
    geometry,
    fontError,
    dimensions,
    updateParam,
    updateContent,
    setContentType,
    addContent,
    removeContent,
    reset,
  }
}
