import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  defaultMotifForFamily, defaultTextureRollerParams,
  textureRollerParamsSchema, type PatternFamily, type TextureRollerParams,
} from './schema'
import type { BuildTextureRollerResult } from './buildTextureRoller'
import { deserializeBuildResult, type SerializedBuildResult } from './workerGeometry'
import { createGeometryWorker, type GeometryWorker } from './workerClient'
import { parseSvg, type ParsedSvg } from '../shared/svgToIconShape'

type TextureRollerAction =
  | { type: 'update'; key: keyof TextureRollerParams; value: number | string | null }
  | { type: 'setSvg'; svg: string | null }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  length: { min: 50, max: 150 },
  diameter: { min: 20, max: 40 },
  reliefDepth: { min: 0.5, max: 2 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function textureRollerReducer(state: TextureRollerParams, action: TextureRollerAction): TextureRollerParams {
  switch (action.type) {
    case 'update': {
      const value = typeof action.value === 'number' ? clampValue(action.key, action.value) : action.value
      const next = { ...state, [action.key]: value }
      if (action.key === 'patternFamily') {
        next.patternMotif = defaultMotifForFamily(value as PatternFamily)
        return next
      }
      // Origem e motivo podem ficar transitórios (ex.: svg antes do upload).
      if (action.key === 'patternSource' || action.key === 'patternMotif') return next
      const candidate = next.patternSource === 'svg' && next.svgIcon === null
        ? { ...next, patternSource: 'motif' as const }
        : next
      const parsed = textureRollerParamsSchema.safeParse(candidate)
      return parsed.success ? next : state
    }
    case 'setSvg': {
      const next = { ...state, svgIcon: action.svg }
      if (action.svg === null) return next
      const parsed = textureRollerParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultTextureRollerParams
  }
}

function disposeResult(result: BuildTextureRollerResult | null): void {
  result?.roller.dispose()
}

function parseSvgCached(cache: Map<string, ParsedSvg | null>, svg: string): ParsedSvg | null {
  if (!cache.has(svg)) cache.set(svg, parseSvg(svg))
  return cache.get(svg) ?? null
}

export interface UseTextureRollerOptions {
  workerFactory?: () => GeometryWorker
}

export function useTextureRoller(options: UseTextureRollerOptions = {}) {
  const workerFactory = options.workerFactory ?? createGeometryWorker
  const [params, dispatch] = useReducer(textureRollerReducer, defaultTextureRollerParams)
  const [geometry, setGeometry] = useState<BuildTextureRollerResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const workerRef = useRef<GeometryWorker | null>(null)
  const geometryRef = useRef<BuildTextureRollerResult | null>(null)
  const parseCacheRef = useRef<Map<string, ParsedSvg | null>>(new Map())

  const clearGeometry = useCallback(() => {
    setGeometry((prev) => {
      disposeResult(prev)
      return null
    })
  }, [])

  const {
    productType, length, diameter, patternFamily, patternMotif,
    patternSource, svgIcon, reliefDepth, density,
  } = params

  const buildParams = useMemo<TextureRollerParams>(
    () => ({
      productType,
      length,
      diameter,
      patternFamily,
      patternMotif,
      patternSource,
      svgIcon,
      reliefDepth,
      density,
      rollerColor: defaultTextureRollerParams.rollerColor,
      reliefColor: defaultTextureRollerParams.reliefColor,
    }),
    [productType, length, diameter, patternFamily, patternMotif, patternSource, svgIcon, reliefDepth, density],
  )

  useEffect(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      let parsedSvg: ParsedSvg | null = null
      if (buildParams.patternSource === 'svg') {
        if (!buildParams.svgIcon) {
          setIsBuilding(false)
          setError(null)
          clearGeometry()
          return
        }
        try {
          parsedSvg = parseSvgCached(parseCacheRef.current, buildParams.svgIcon)
        } catch {
          parsedSvg = null
        }
        if (!parsedSvg) {
          setIsBuilding(false)
          setError('Não foi possível ler o SVG')
          clearGeometry()
          return
        }
      }
      setError(null)

      const worker = workerFactory()
      workerRef.current = worker
      setIsBuilding(true)

      worker.build(buildParams, parsedSvg, (data: SerializedBuildResult) => {
        if (workerRef.current !== worker) return
        const next = deserializeBuildResult(data)
        setGeometry((prev) => {
          disposeResult(prev)
          return next
        })
        setIsBuilding(false)
      }, () => {
        if (workerRef.current !== worker) return
        setIsBuilding(false)
        setError('Falha ao gerar a geometria')
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [buildParams, workerFactory, clearGeometry])

  useEffect(() => {
    geometryRef.current = geometry
  }, [geometry])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
    disposeResult(geometryRef.current)
    geometryRef.current = null
  }, [])

  const updateParam = useCallback((key: keyof TextureRollerParams, value: number | string | null) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const setSvgIcon = useCallback((svg: string | null) => {
    dispatch({ type: 'setSvg', svg })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => {
    if (!geometry) {
      const fallbackHeight = Number((params.diameter + 2 * params.reliefDepth).toFixed(1))
      return {
        width: Number((params.length).toFixed(1)),
        height: fallbackHeight,
        thickness: fallbackHeight,
      }
    }
    geometry.roller.computeBoundingBox()
    const bb = geometry.roller.boundingBox!
    return {
      width: Number((bb.max.x - bb.min.x).toFixed(1)),
      height: Number((bb.max.y - bb.min.y).toFixed(1)),
      thickness: Number((bb.max.z - bb.min.z).toFixed(1)),
    }
  }, [geometry, params.length, params.diameter, params.reliefDepth])

  const objectBounds = useMemo(() => {
    if (!geometry) {
      const fallback = Math.max(params.length, params.diameter + 2 * params.reliefDepth, 1)
      return { width: fallback, height: fallback, depth: fallback }
    }
    geometry.roller.computeBoundingBox()
    const bb = geometry.roller.boundingBox!
    return { width: bb.max.x - bb.min.x, height: bb.max.y - bb.min.y, depth: bb.max.z - bb.min.z }
  }, [geometry, params.length, params.diameter, params.reliefDepth])

  const fitRadius = useMemo(
    () => Math.max(1, 0.5 * Math.hypot(objectBounds.width, objectBounds.height, objectBounds.depth)),
    [objectBounds],
  )

  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = fitRadius * 2.2
    const elevation = (25 * Math.PI) / 180
    const azimuth = (210 * Math.PI) / 180
    const x = distance * Math.sin(azimuth) * Math.cos(elevation)
    const z = distance * Math.cos(azimuth) * Math.cos(elevation)
    const y = distance * Math.sin(elevation)
    return [Number(x.toFixed(1)), Number(y.toFixed(1)), Number(z.toFixed(1))]
  }, [fitRadius])

  return { params, geometry, isBuilding, error, dimensions, cameraPosition, fitRadius, updateParam, setSvgIcon, reset }
}
