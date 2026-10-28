import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { cutterStampParamsSchema, defaultCutterStampParams, type CutterStampParams } from './schema'
import type { BuildCutterStampResult } from './buildCutterStamp'
import { deserializeBuildResult } from './workerGeometry'
import { createGeometryWorker, type GeometryWorker } from './workerClient'
import { parseSvg, type ParsedSvg } from '../shared/svgToIconShape'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'

type CutterStampAction =
  | { type: 'update'; key: keyof CutterStampParams; value: number | string | null }
  | { type: 'setSvg'; svg: string | null }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  textHeight: { min: 10, max: 60 },
  iconScale: { min: 0.5, max: 1.0 },
  iconLineWidth: { min: 0.1, max: 1.5 },
  wallHeight: { min: 15, max: 40 },
  wallThickness: { min: 0.8, max: 2 },
  stampHeight: { min: 15, max: 25 },
  baseMargin: { min: 2, max: 10 },
  reliefHeight: { min: 1, max: 3 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function cutterStampReducer(state: CutterStampParams, action: CutterStampAction): CutterStampParams {
  switch (action.type) {
    case 'update': {
      const value = typeof action.value === 'number' ? clampValue(action.key, action.value) : action.value
      const next = { ...state, [action.key]: value }
      // Trocar o tipo de forma é permitido mesmo antes de enviar o SVG.
      if (action.key === 'contentType') return next
      const parsed = cutterStampParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'setSvg': {
      const next = { ...state, svgIcon: action.svg }
      // Remover o ícone (null) é permitido mesmo com contentType 'svg' (estado transitório).
      if (action.svg === null) return next
      const parsed = cutterStampParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultCutterStampParams
  }
}

function disposeResult(result: BuildCutterStampResult | null): void {
  result?.cutter.dispose()
  result?.stampBase.dispose()
  result?.stampRelief.dispose()
}

// O parse do SVG usa DOMParser (só na main thread) e é cacheado por conteúdo.
function parseSvgCached(cache: Map<string, ParsedSvg | null>, svg: string): ParsedSvg | null {
  if (!cache.has(svg)) cache.set(svg, parseSvg(svg))
  return cache.get(svg) ?? null
}

export interface UseCutterStampOptions {
  workerFactory?: () => GeometryWorker
}

export function useCutterStamp(options: UseCutterStampOptions = {}) {
  const workerFactory = options.workerFactory ?? createGeometryWorker
  const [params, dispatch] = useReducer(cutterStampReducer, defaultCutterStampParams)
  const [geometry, setGeometry] = useState<BuildCutterStampResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const workerRef = useRef<GeometryWorker | null>(null)
  const parseCacheRef = useRef<Map<string, ParsedSvg | null>>(new Map())

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // SVG precisa ser achatado na main thread (o worker não tem DOMParser).
      let parsedSvg: ParsedSvg | null = null
      if (params.contentType === 'svg') {
        if (!params.svgIcon) {
          setError(null)
          return
        }
        parsedSvg = parseSvgCached(parseCacheRef.current, params.svgIcon)
        if (!parsedSvg) {
          setError('Não foi possível ler o SVG')
          return
        }
      }
      setError(null)

      // Cancela o build anterior (termina o worker) e inicia um novo.
      workerRef.current?.terminate()
      const worker = workerFactory()
      workerRef.current = worker
      setIsBuilding(true)

      const fontUrl = fontUrls[params.fontStyle] ?? fontUrls.bold
      worker.build(params, fontUrl, parsedSvg, (data) => {
        const next = deserializeBuildResult(data)
        setGeometry((prev) => {
          disposeResult(prev)
          return next
        })
        setIsBuilding(false)
      }, () => {
        setIsBuilding(false)
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [params, workerFactory])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const updateParam = useCallback((key: keyof CutterStampParams, value: number | string | null) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const setSvgIcon = useCallback((svg: string | null) => {
    dispatch({ type: 'setSvg', svg })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => {
    const height = Number(Math.max(params.wallHeight, params.stampHeight).toFixed(1))
    if (!geometry) {
      return { width: 0, height, thickness: params.wallThickness }
    }

    let minX = Infinity
    let maxX = -Infinity
    for (const piece of [geometry.cutter, geometry.stampBase, geometry.stampRelief]) {
      piece.computeBoundingBox()
      const bb = piece.boundingBox!
      minX = Math.min(minX, bb.min.x)
      maxX = Math.max(maxX, bb.max.x)
    }

    return {
      width: Number((maxX - minX).toFixed(1)),
      height,
      thickness: params.wallThickness,
    }
  }, [geometry, params.wallHeight, params.stampHeight, params.wallThickness])

  // Caixa do conjunto (todas as peças), para enquadrar a câmera.
  const objectBounds = useMemo(() => {
    if (!geometry) {
      const fallback = Math.max(params.textHeight, params.wallHeight, params.stampHeight, 1)
      return { width: fallback, height: fallback, depth: fallback }
    }

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const piece of [geometry.cutter, geometry.stampBase, geometry.stampRelief]) {
      piece.computeBoundingBox()
      const bb = piece.boundingBox!
      minX = Math.min(minX, bb.min.x)
      maxX = Math.max(maxX, bb.max.x)
      minY = Math.min(minY, bb.min.y)
      maxY = Math.max(maxY, bb.max.y)
      minZ = Math.min(minZ, bb.min.z)
      maxZ = Math.max(maxZ, bb.max.z)
    }

    return { width: maxX - minX, height: maxY - minY, depth: maxZ - minZ }
  }, [geometry, params.textHeight, params.wallHeight, params.stampHeight])

  // Raio da esfera envolvente do objeto (usado para enquadrar na tela).
  const fitRadius = useMemo(
    () => Math.max(1, 0.5 * Math.hypot(objectBounds.width, objectBounds.height, objectBounds.depth)),
    [objectBounds],
  )

  // Posição inicial aproximada; o reset reenquadra com o aspect real do viewport.
  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = fitRadius * 2.2
    const elevation = (25 * Math.PI) / 180
    const azimuth = (210 * Math.PI) / 180 // giro de 210° no eixo Y
    const x = distance * Math.sin(azimuth) * Math.cos(elevation)
    const z = distance * Math.cos(azimuth) * Math.cos(elevation)
    const y = distance * Math.sin(elevation)
    return [Number(x.toFixed(1)), Number(y.toFixed(1)), Number(z.toFixed(1))]
  }, [fitRadius])

  return { params, geometry, isBuilding, error, dimensions, cameraPosition, fitRadius, updateParam, setSvgIcon, reset }
}
