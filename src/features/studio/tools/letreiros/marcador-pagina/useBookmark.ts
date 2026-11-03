import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  defaultBookmarkParams,
  bookmarkParamsSchema,
  textSchema,
  patternSchema,
  type BookmarkParams,
  type FontStyle,
  type PatternParams,
  type TextParams,
} from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { parseSvg } from '../../confeitaria/shared/svgToIconShape'
import type { BuildBookmarkResult } from './buildBookmark'
import { deserializeBookmarkResult, type SerializedBookmarkResult } from './workerGeometry'
import { createBookmarkWorker, type BookmarkWorker } from './workerClient'

const DEBOUNCE_MS = 200

type BookmarkAction =
  | { type: 'update'; key: keyof BookmarkParams; value: number | string }
  | { type: 'updateText'; patch: Partial<TextParams> }
  | { type: 'updatePattern'; patch: Partial<PatternParams> }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  length: { min: 50, max: 150 },
  width: { min: 30, max: 50 },
  thickness: { min: 1, max: 2 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function freshDefaults(): BookmarkParams {
  return {
    ...defaultBookmarkParams,
    text: { ...defaultBookmarkParams.text },
    pattern: { ...defaultBookmarkParams.pattern },
  }
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
      const patchResult = textSchema.partial().safeParse(action.patch)
      if (!patchResult.success) return state
      const next = { ...state, text: { ...state.text, ...action.patch } }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'updatePattern': {
      const patchResult = patternSchema.partial().safeParse(action.patch)
      if (!patchResult.success) return state
      const next = { ...state, pattern: { ...state.pattern, ...action.patch } }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return freshDefaults()
  }
}

export interface UseBookmarkOptions {
  workerFactory?: () => BookmarkWorker
}

export function useBookmark(options: UseBookmarkOptions = {}) {
  const workerFactory = options.workerFactory ?? createBookmarkWorker
  const [params, dispatch] = useReducer(bookmarkReducer, defaultBookmarkParams)
  const [geometry, setGeometry] = useState<BuildBookmarkResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const geometryRef = useRef<BuildBookmarkResult | null>(null)
  const workerRef = useRef<BookmarkWorker | null>(null)
  const workerFactoryRef = useRef(workerFactory)
  const parseCacheRef = useRef<Map<string, ParsedSvg | null>>(new Map())

  useEffect(() => {
    workerFactoryRef.current = workerFactory
  }, [workerFactory])

  const styleKey = useMemo(
    () => (params.text.content.trim() ? params.text.fontStyle : ''),
    [params.text.content, params.text.fontStyle],
  )

  const parsedSvg = useMemo(() => {
    if (params.pattern.type !== 'svg' || !params.pattern.svg) return null
    const cache = parseCacheRef.current
    if (!cache.has(params.pattern.svg)) {
      try {
        cache.set(params.pattern.svg, parseSvg(params.pattern.svg, 32))
      } catch {
        cache.set(params.pattern.svg, null)
      }
    }
    return cache.get(params.pattern.svg) ?? null
  }, [params.pattern.type, params.pattern.svg])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (params.pattern.type === 'svg' && params.pattern.svg && !parsedSvg) {
        setIsBuilding(false)
        setError('Não foi possível ler o SVG')
        return
      }

      let worker: BookmarkWorker
      try {
        worker = workerFactoryRef.current()
      } catch {
        setIsBuilding(false)
        setError('Não foi possível iniciar a geração')
        return
      }
      workerRef.current = worker
      setIsBuilding(true)
      setError(null)

      try {
        worker.build(
          {
            params,
            styles: styleKey ? [styleKey as FontStyle] : [],
            parsedSvg,
          },
          (data: SerializedBookmarkResult) => {
            if (workerRef.current !== worker) return
            let next: BuildBookmarkResult
            try {
              next = deserializeBookmarkResult(data)
            } catch {
              workerRef.current = null
              worker.terminate()
              setIsBuilding(false)
              setError('Falha ao gerar a peça')
              return
            }
            workerRef.current = null
            worker.terminate()
            const prev = geometryRef.current
            geometryRef.current = next
            setGeometry(next)
            prev?.base.dispose()
            prev?.text.dispose()
            setIsBuilding(false)
            setError(null)
          },
          (message) => {
            if (workerRef.current !== worker) return
            workerRef.current = null
            worker.terminate()
            setIsBuilding(false)
            setError(message)
          },
        )
      } catch {
        worker.terminate()
        if (workerRef.current === worker) workerRef.current = null
        setIsBuilding(false)
        setError('Falha ao gerar a peça')
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [params, styleKey, parsedSvg])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      geometryRef.current?.base.dispose()
      geometryRef.current?.text.dispose()
    }
  }, [])

  const updateParam = useCallback((key: keyof BookmarkParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const updateText = useCallback((patch: Partial<TextParams>) => {
    dispatch({ type: 'updateText', patch })
  }, [])

  const updatePattern = useCallback((patch: Partial<PatternParams>) => {
    dispatch({ type: 'updatePattern', patch })
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

  return {
    params,
    geometry,
    isBuilding,
    error,
    dimensions,
    updateParam,
    updateText,
    updatePattern,
    reset,
  }
}
