import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Box3, Sphere, Vector3 } from 'three'
import {
  parseSvg,
  type ParsedSvg,
} from '../../confeitaria/shared/svgToIconShape'
import type { BuildThermoformerResult } from './buildThermoformer'
import { getSupportDimensions } from './buildSupport'
import { getShapeOutline, type ShapeOutline } from './outline'
import { getTrayDimensions } from './tray'
import {
  defaultThermoformerParams,
  MAXIMUM_DRAFT_ANGLE,
  MAXIMUM_PYRAMID_TIP,
  MAXIMUM_SHAPE_MM,
  MAXIMUM_SVG_SIZE_MM,
  MINIMUM_DRAFT_ANGLE,
  MINIMUM_PYRAMID_TIP,
  MINIMUM_SHAPE_MM,
  MINIMUM_SVG_SIZE_MM,
  PLUG_PREVIEW_GAP_MM,
  thermoformerParamsSchema,
  type ThermoformerGeometryParams,
  type ThermoformerParams,
} from './schema'
import { validateThermoformer, type ValidationIssue } from './validateThermoformer'
import {
  deserializeThermoformerResult,
  type SerializedThermoformerResult,
} from './workerGeometry'
import { createScreenWorker, type ScreenWorker } from './workerClient'

type ThermoformerAction =
  | { type: 'update'; key: keyof ThermoformerParams; value: number | string }
  | { type: 'setSvg'; value: string | null }
  | { type: 'reset' }

export type SvgErrorCode = 'svg-missing' | 'svg-parse' | 'svg-contour'

export interface SvgError {
  code: SvgErrorCode
  message: string
}

const NUMERIC_RANGES: Partial<Record<keyof ThermoformerParams, { min: number; max: number }>> = {
  diameter: { min: 60, max: 300 },
  thickness: { min: 1.2, max: 6 },
  frameWidth: { min: 2, max: 30 },
  lineWidth: { min: 0.4, max: 4 },
  opening: { min: 3, max: 30 },
  wallThickness: { min: 2, max: 10 },
  bottomThickness: { min: 2, max: 10 },
  bowlDepth: { min: 5, max: 60 },
  stepWidth: { min: 2, max: 15 },
  fitClearance: { min: 0.1, max: 0.6 },
  edgeChamfer: { min: 0, max: 3 },
  plugHeight: { min: 10, max: 40 },
  width: { min: MINIMUM_SHAPE_MM, max: MAXIMUM_SHAPE_MM },
  height: { min: MINIMUM_SHAPE_MM, max: MAXIMUM_SHAPE_MM },
  svgSize: { min: MINIMUM_SVG_SIZE_MM, max: MAXIMUM_SVG_SIZE_MM },
  draftAngle: { min: MINIMUM_DRAFT_ANGLE, max: MAXIMUM_DRAFT_ANGLE },
  pyramidTip: { min: MINIMUM_PYRAMID_TIP, max: MAXIMUM_PYRAMID_TIP },
}

function clampValue(key: keyof ThermoformerParams, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function thermoformerReducer(
  state: ThermoformerParams,
  action: ThermoformerAction,
): ThermoformerParams {
  switch (action.type) {
    case 'update': {
      const value = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: value }
      const parsed = thermoformerParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'setSvg': {
      const next = { ...state, svg: action.value ?? '' }
      const parsed = thermoformerParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultThermoformerParams
  }
}

export interface UseThermoformerOptions {
  workerFactory?: () => ScreenWorker
}

export interface UseThermoformerResult {
  params: ThermoformerParams
  geometry: BuildThermoformerResult | null
  outline: ShapeOutline | null
  svgError: SvgError | null
  seatY: number
  plugLift: number
  isBuilding: boolean
  error: string | null
  issues: ValidationIssue[]
  dimensions: { width: number; height: number; thickness: number }
  cameraPosition: [number, number, number]
  fitRadius: number
  updateParam: (key: keyof ThermoformerParams, value: number | string) => void
  setSvg: (svg: string | null) => void
  reset: () => void
}

export function useThermoformer(
  options: UseThermoformerOptions = {},
): UseThermoformerResult {
  const workerFactory = options.workerFactory ?? createScreenWorker
  const workerFactoryRef = useRef(workerFactory)
  workerFactoryRef.current = workerFactory
  const [params, dispatch] = useReducer(thermoformerReducer, defaultThermoformerParams)
  const [geometry, setGeometry] = useState<BuildThermoformerResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const workerRef = useRef<ScreenWorker | null>(null)
  const svgCacheRef = useRef<{ svg: string; parsed: ParsedSvg | null } | null>(null)

  const {
    productType,
    shape,
    diameter,
    width,
    height,
    svgSize,
    draftAngle,
    pyramidTip,
    svg,
    thickness,
    frameWidth,
    lineWidth,
    opening,
    wallThickness,
    bottomThickness,
    bowlDepth,
    stepWidth,
    fitClearance,
    edgeChamfer,
    plugHeight,
  } = params

  const buildParams = useMemo<ThermoformerGeometryParams>(() => ({
    productType,
    shape,
    diameter,
    width,
    height,
    svgSize,
    draftAngle,
    pyramidTip,
    svg,
    thickness,
    frameWidth,
    lineWidth,
    opening,
    wallThickness,
    bottomThickness,
    bowlDepth,
    stepWidth,
    fitClearance,
    edgeChamfer,
    plugHeight,
  }), [
    productType,
    shape,
    diameter,
    width,
    height,
    svgSize,
    draftAngle,
    pyramidTip,
    svg,
    thickness,
    frameWidth,
    lineWidth,
    opening,
    wallThickness,
    bottomThickness,
    bowlDepth,
    stepWidth,
    fitClearance,
    edgeChamfer,
    plugHeight,
  ])

  // O SVGLoader depende de DOMParser, que só existe na main thread. O parse é
  // cacheado pelo conteúdo para não repetir a leitura a cada render.
  const parsedSvg = useMemo<ParsedSvg | null>(() => {
    if (shape !== 'svg' || svg.length === 0) return null
    const cached = svgCacheRef.current
    if (cached && cached.svg === svg) return cached.parsed
    let parsed: ParsedSvg | null = null
    try {
      parsed = parseSvg(svg)
    } catch {
      parsed = null
    }
    svgCacheRef.current = { svg, parsed }
    return parsed
  }, [shape, svg])

  const outline = useMemo<ShapeOutline | null>(
    () => getShapeOutline(buildParams, parsedSvg),
    [buildParams, parsedSvg],
  )

  const svgError = useMemo<SvgError | null>(() => {
    if (shape !== 'svg') return null
    if (svg.length === 0) {
      return { code: 'svg-missing', message: 'Envie um SVG' }
    }
    if (!parsedSvg) {
      return { code: 'svg-parse', message: 'Não foi possível ler o SVG' }
    }
    if (!outline) {
      return {
        code: 'svg-contour',
        message: 'O SVG precisa ter um único contorno fechado',
      }
    }
    return null
  }, [shape, svg, parsedSvg, outline])

  useEffect(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    clearTimeout(debounceRef.current)

    if (svgError) {
      setError(null)
      setIsBuilding(false)
      setGeometry(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      setError(null)
      try {
        const worker = workerFactoryRef.current()
        workerRef.current = worker
        setIsBuilding(true)

        worker.build(buildParams, parsedSvg, (data: SerializedThermoformerResult) => {
          if (workerRef.current !== worker) return
          const next = deserializeThermoformerResult(data)
          setGeometry(next)
          setIsBuilding(false)
        }, (reason?: string) => {
          if (workerRef.current !== worker) return
          setIsBuilding(false)
          setError(
            reason === 'invalid-outline'
              ? 'Contorno inválido para a forma selecionada'
              : 'Falha ao gerar a geometria',
          )
        })
      } catch {
        setIsBuilding(false)
        setError('Falha ao gerar a geometria')
      }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [buildParams, parsedSvg, svgError])

  useEffect(() => () => {
    geometry?.screen.dispose()
    geometry?.support.dispose()
    geometry?.plug.dispose()
  }, [geometry])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const issues = useMemo(
    () => validateThermoformer(buildParams),
    [buildParams],
  )

  const supportDims = useMemo(
    () => getSupportDimensions(buildParams),
    [buildParams],
  )

  const trayDims = useMemo(
    () => (
      shape === 'circle' || outline?.kind !== 'polygon'
        ? null
        : getTrayDimensions(buildParams, outline)
    ),
    [shape, buildParams, outline],
  )

  const plugLift = useMemo(() => {
    const depth = shape === 'circle'
      ? supportDims.effectiveBowlDepth
      : trayDims?.effectiveDepth ?? 0
    return depth + PLUG_PREVIEW_GAP_MM
  }, [shape, supportDims.effectiveBowlDepth, trayDims])

  const fallbackDimensions = useMemo(() => {
    if (!trayDims) {
      return {
        width: Number((supportDims.outerRadius * 2).toFixed(1)),
        height: Number(supportDims.height.toFixed(1)),
        thickness: Number((supportDims.outerRadius * 2).toFixed(1)),
      }
    }
    return {
      width: Number(trayDims.outerBounds.width.toFixed(1)),
      height: Number(trayDims.height.toFixed(1)),
      thickness: Number(trayDims.outerBounds.height.toFixed(1)),
    }
  }, [
    trayDims,
    supportDims.outerRadius,
    supportDims.height,
  ])

  const bounds = useMemo(() => {
    if (!geometry) return null
    geometry.support.computeBoundingBox()
    const box = new Box3()
    if (geometry.support.boundingBox) box.union(geometry.support.boundingBox)
    return box.getSize(new Vector3())
  }, [geometry])

  const dimensions = useMemo(() => {
    if (!bounds) return fallbackDimensions
    return {
      width: Number(bounds.x.toFixed(1)),
      height: Number(bounds.y.toFixed(1)),
      thickness: Number(bounds.z.toFixed(1)),
    }
  }, [bounds, fallbackDimensions])

  const fitRadius = useMemo(() => {
    if (!geometry) {
      return Math.max(
        1,
        0.5 * Math.hypot(
          fallbackDimensions.width,
          fallbackDimensions.height,
          fallbackDimensions.thickness,
        ),
      )
    }

    geometry.support.computeBoundingBox()
    geometry.plug.computeBoundingBox()
    const box = new Box3()
    if (geometry.support.boundingBox) box.union(geometry.support.boundingBox)
    if (geometry.plug.boundingBox) {
      const plugBox = geometry.plug.boundingBox.clone()
      plugBox.translate(new Vector3(0, plugLift, 0))
      box.union(plugBox)
    }

    const sphere = box.getBoundingSphere(new Sphere())
    return Math.max(1, sphere.center.length() + sphere.radius)
  }, [geometry, plugLift, fallbackDimensions])

  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = fitRadius * 2.2
    const elevation = (25 * Math.PI) / 180
    const azimuth = (30 * Math.PI) / 180
    return [
      Number((distance * Math.sin(azimuth) * Math.cos(elevation)).toFixed(1)),
      Number((distance * Math.sin(elevation)).toFixed(1)),
      Number((distance * Math.cos(azimuth) * Math.cos(elevation)).toFixed(1)),
    ]
  }, [fitRadius])

  const updateParam = useCallback(
    (key: keyof ThermoformerParams, value: number | string) => {
      dispatch({ type: 'update', key, value })
    },
    [],
  )

  const setSvg = useCallback((next: string | null) => {
    dispatch({ type: 'setSvg', value: next })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const seatY = geometry?.seatY ?? 0

  return {
    params,
    geometry,
    outline,
    svgError,
    seatY,
    plugLift,
    isBuilding,
    error,
    issues,
    dimensions,
    cameraPosition,
    fitRadius,
    updateParam,
    setSvg,
    reset,
  }
}
