import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  defaultCardParams,
  cardParamsSchema,
  type CardContent,
  type CardParams,
  type FontStyle,
  type IconContent,
  type TextContent,
} from './schema'
import type { BuildCardResult } from './buildCard'
import { parseSvg, type ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { deserializeCardResult, type SerializedCardResult } from './workerGeometry'
import { createCardWorker, type CardWorker } from './workerClient'

const TEXT_DEFAULTS = {
  content: 'Novo texto',
  fontStyle: 'normal' as const,
  fontSize: 5,
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

type CardAction =
  | { type: 'update'; key: keyof CardParams; value: number | string }
  | { type: 'updateContent'; id: string; patch: Partial<TextContent> | Partial<IconContent> }
  | { type: 'setContentType'; id: string; kind: 'text' | 'icon' }
  | { type: 'addContent'; id: string }
  | { type: 'removeContent'; id: string }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  width: { min: 50, max: 90 },
  height: { min: 30, max: 60 },
  thickness: { min: 1, max: 3 },
  cornerRadius: { min: 0, max: 10 },
}

const CONTENT_NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  fontSize: { min: 3, max: 12 },
  iconScale: { min: 0.5, max: 1 },
  iconLineWidth: { min: 0.1, max: 1.5 },
  offsetX: { min: -40, max: 40 },
  offsetY: { min: -40, max: 40 },
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

function freshDefaults(): CardParams {
  return {
    ...defaultCardParams,
    contents: defaultCardParams.contents.map((item) => ({ ...item })),
  }
}

function cardReducer(state: CardParams, action: CardAction): CardParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'updateContent': {
      if (!state.contents.some((item) => item.id === action.id)) return state
      const patch = clampContentPatch(action.patch)
      const nextContents = state.contents.map((item) =>
        item.id === action.id ? ({ ...item, ...patch } as CardContent) : item,
      )
      const next = { ...state, contents: nextContents }
      const parsed = cardParamsSchema.safeParse(next)
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
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'addContent': {
      if (state.contents.length >= 3) return state
      const newItem: TextContent = {
        id: action.id,
        kind: 'text',
        ...TEXT_DEFAULTS,
        offsetY: state.contents.length === 1 ? -12 : 12,
      }
      const next = { ...state, contents: [...state.contents, newItem] }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'removeContent': {
      if (state.contents.length <= 1) return state
      const next = { ...state, contents: state.contents.filter((item) => item.id !== action.id) }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'reset':
      return freshDefaults()
  }
}

const PARSE_CACHE_LIMIT = 20

function parseSvgCached(cache: Map<string, ParsedSvg | null>, svg: string): ParsedSvg | null {
  if (!cache.has(svg)) {
    try {
      cache.set(svg, parseSvg(svg))
    } catch {
      cache.set(svg, null)
    }
    if (cache.size > PARSE_CACHE_LIMIT) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
  }
  return cache.get(svg) ?? null
}

export interface UseCardOptions {
  workerFactory?: () => CardWorker
}

export function useCard(options: UseCardOptions = {}) {
  const workerFactory = options.workerFactory ?? createCardWorker
  const [params, dispatch] = useReducer(cardReducer, defaultCardParams)
  const [geometry, setGeometry] = useState<BuildCardResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const geometryRef = useRef<BuildCardResult | null>(null)
  const workerRef = useRef<CardWorker | null>(null)
  const workerFactoryRef = useRef(workerFactory)
  const parseCacheRef = useRef<Map<string, ParsedSvg | null>>(new Map())
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    workerFactoryRef.current = workerFactory
  }, [workerFactory])

  // Cor não altera a geometria: o build só depende destes campos.
  // Serializa em ordem fixa (arrays) para não depender da ordem das chaves do Zod.
  const buildKey = useMemo(() => JSON.stringify({
    width: params.width,
    height: params.height,
    thickness: params.thickness,
    cornerRadius: params.cornerRadius,
    contents: params.contents.map((item) => item.kind === 'text'
      ? ['text', item.id, item.content, item.fontStyle, item.fontSize, item.offsetX, item.offsetY]
      : ['icon', item.id, item.svgIcon, item.iconScale, item.iconLineWidth, item.offsetX, item.offsetY]),
  }), [
    params.width,
    params.height,
    params.thickness,
    params.cornerRadius,
    params.contents,
  ])

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = paramsRef.current
      const parsedSvgs: Record<string, ParsedSvg | null> = {}
      for (const item of current.contents) {
        if (item.kind !== 'icon' || !item.svgIcon) continue
        const parsed = parseSvgCached(parseCacheRef.current, item.svgIcon)
        if (!parsed) {
          setIsBuilding(false)
          setError('Não foi possível ler o SVG')
          return
        }
        parsedSvgs[item.id] = parsed
      }
      setError(null)

      const styles = new Set<FontStyle>()
      for (const item of current.contents) {
        if (item.kind === 'text' && item.content.trim()) styles.add(item.fontStyle)
      }
      const styleList = Array.from(styles)
      let worker: CardWorker
      try {
        worker = workerFactoryRef.current()
      } catch {
        setIsBuilding(false)
        setError('Não foi possível iniciar a geração')
        return
      }
      workerRef.current = worker
      setIsBuilding(true)

      try {
        worker.build({ params: current, parsedSvgs, styles: styleList }, (data: SerializedCardResult) => {
          if (workerRef.current !== worker) return
          let next: BuildCardResult
          try {
            next = deserializeCardResult(data)
          } catch {
            workerRef.current = null
            worker.terminate()
            setIsBuilding(false)
            setError('Falha ao gerar a peça')
            return
          }
          workerRef.current = null
          worker.terminate()
          const previous = geometryRef.current
          geometryRef.current = next
          setGeometry(next)
          previous?.base.dispose()
          previous?.content?.dispose()
          setIsBuilding(false)
          setError(null)
        }, (message) => {
          if (workerRef.current !== worker) return
          workerRef.current = null
          worker.terminate()
          setIsBuilding(false)
          setError(message)
        })
      } catch {
        worker.terminate()
        if (workerRef.current === worker) workerRef.current = null
        setIsBuilding(false)
        setError('Falha ao gerar a peça')
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [buildKey])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      geometryRef.current?.base.dispose()
      geometryRef.current?.content?.dispose()
    }
  }, [])

  const updateParam = useCallback((key: keyof CardParams, value: number | string) => {
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

  const dimensions = useMemo(() => ({
    width: params.width,
    height: params.height,
    thickness: params.thickness,
  }), [params.width, params.height, params.thickness])

  return {
    params,
    geometry,
    isBuilding,
    error,
    dimensions,
    updateParam,
    updateContent,
    setContentType,
    addContent,
    removeContent,
    reset,
  }
}
