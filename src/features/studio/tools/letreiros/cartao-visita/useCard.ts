import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from '@/features/studio/tools/chaveiros/chaveiro/fonts'
import { defaultCardParams, cardParamsSchema, textBlockSchema, type CardParams, type FontStyle, type TextBlock } from './schema'
import { buildCard, type BuildCardResult } from './buildCard'

const TEXT_BLOCK_DEFAULTS = {
  content: 'Novo texto',
  fontStyle: 'normal' as const,
  fontSize: 5,
  relief: 0.8,
  offsetX: 0,
  offsetY: 0,
}

type CardAction =
  | { type: 'update'; key: keyof CardParams; value: number | string }
  | { type: 'updateBlock'; id: string; patch: Partial<TextBlock> }
  | { type: 'addBlock' }
  | { type: 'removeBlock'; id: string }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  width: { min: 50, max: 90 },
  height: { min: 30, max: 60 },
  thickness: { min: 1, max: 3 },
  cornerRadius: { min: 0, max: 10 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function cardReducer(state: CardParams, action: CardAction): CardParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'updateBlock': {
      const patchResult = textBlockSchema.partial().safeParse(action.patch)
      if (!patchResult.success) return state
      const nextBlocks = state.blocks.map((b) =>
        b.id === action.id ? { ...b, ...action.patch } : b,
      )
      const next = { ...state, blocks: nextBlocks }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'addBlock': {
      if (state.blocks.length >= 3) return state
      const newBlock: TextBlock = { id: crypto.randomUUID(), ...TEXT_BLOCK_DEFAULTS }
      const next = { ...state, blocks: [...state.blocks, newBlock] }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'removeBlock': {
      if (state.blocks.length <= 1) return state
      const next = { ...state, blocks: state.blocks.filter((b) => b.id !== action.id) }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultCardParams
  }
}

export function useCard() {
  const [params, dispatch] = useReducer(cardReducer, defaultCardParams)
  const [fontCache, setFontCache] = useState<Map<FontStyle, Font>>(new Map())
  const [, setFontError] = useState(false)
  const [geometry, setGeometry] = useState<BuildCardResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const uniqueStyles = useMemo(() => {
    const styles = new Set(params.blocks.map((b) => b.fontStyle))
    return Array.from(styles)
  }, [params.blocks])

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

  const font = fontCache.get(params.blocks[0]?.fontStyle ?? 'normal') ?? null

  useEffect(() => {
    if (!font) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.base.dispose()
        prev?.text?.dispose()
        return buildCard({ font, params })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [font, params])

  const updateParam = useCallback((key: keyof CardParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const updateBlock = useCallback((id: string, patch: Partial<TextBlock>) => {
    dispatch({ type: 'updateBlock', id, patch })
  }, [])

  const addBlock = useCallback(() => {
    dispatch({ type: 'addBlock' })
  }, [])

  const removeBlock = useCallback((id: string) => {
    dispatch({ type: 'removeBlock', id })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    width: params.width,
    height: params.height,
    thickness: params.thickness,
  }), [params.width, params.height, params.thickness])

  return { params, geometry, dimensions, updateParam, updateBlock, addBlock, removeBlock, reset }
}