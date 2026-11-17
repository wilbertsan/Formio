import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Box3, Vector3 } from 'three'
import { disposeMugResult, type BuildMugResult } from './buildMug'
import {
  defaultMugParams,
  getCapacityMl,
  MAX_TEXT_LENGTH,
  mugParamsSchema,
  type MugGeometryParams,
  type MugParams,
} from './schema'
import { validateMug, type ValidationIssue } from './validateMug'
import {
  deserializeBuildResult,
  type SerializedBuildResult,
} from './workerGeometry'
import { createMugWorker, type MugWorker } from './workerClient'

type MugAction =
  | { type: 'update'; key: keyof MugParams; value: number | string | boolean }
  | { type: 'reset' }

const NUMERIC_RANGES: Partial<Record<keyof MugParams, { min: number; max: number }>> = {
  diameterTop: { min: 70, max: 100 },
  diameterBottom: { min: 60, max: 95 },
  height: { min: 80, max: 115 },
  wallThickness: { min: 1.8, max: 4 },
  bottomThickness: { min: 2, max: 6 },
  rimChamfer: { min: 0, max: 2 },
  handleHeight: { min: 35, max: 85 },
  handleGap: { min: 24, max: 40 },
  handleReach: { min: 30, max: 50 },
  handleBand: { min: 5, max: 10 },
  handleWidth: { min: 8, max: 16 },
  handleClearance: { min: 0.2, max: 0.5 },
  textSize: { min: 6, max: 18 },
  textCenterY: { min: 20, max: 90 },
}

const BUILD_ERROR = 'Falha ao gerar a geometria'
const DEBOUNCE_MS = 250

function clampValue(key: keyof MugParams, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function mugReducer(
  state: MugParams,
  action: MugAction,
): MugParams {
  switch (action.type) {
    case 'update': {
      let value: number | string | boolean = action.value
      if (action.key === 'text' && typeof value === 'string') {
        value = value.slice(0, MAX_TEXT_LENGTH)
      }
      if (typeof value === 'number') {
        value = clampValue(action.key, value)
      }
      const next = { ...state, [action.key]: value }
      const parsed = mugParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultMugParams
  }
}

export interface UseMugOptions {
  workerFactory?: () => MugWorker
}

export interface UseMugResult {
  params: MugParams
  geometry: BuildMugResult | null
  builtParams: MugGeometryParams | null
  isBuilding: boolean
  error: string | null
  issues: ValidationIssue[]
  capacityMl: number
  dimensions: { width: number; height: number; thickness: number }
  cameraPosition: [number, number, number]
  fitRadius: number
  updateParam: (key: keyof MugParams, value: number | string | boolean) => void
  reset: () => void
}

export function useMug(
  options: UseMugOptions = {},
): UseMugResult {
  const workerFactory = options.workerFactory ?? createMugWorker
  const workerFactoryRef = useRef(workerFactory)
  workerFactoryRef.current = workerFactory
  const [params, dispatch] = useReducer(mugReducer, defaultMugParams)
  const [builtParams, setBuiltParams] = useState<MugGeometryParams | null>(null)
  const [geometry, setGeometry] = useState<BuildMugResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const workerRef = useRef<MugWorker | null>(null)

  const {
    productType, diameterTop, diameterBottom, height, wallThickness,
    bottomThickness, rimChamfer, handleEnabled, handleHeight, handleGap,
    handleReach, handleBand, handleWidth, handleClearance, text, textSize,
    fontStyle, textCenterY,
  } = params

  const buildParams = useMemo<MugGeometryParams>(() => ({
    productType, diameterTop, diameterBottom, height, wallThickness,
    bottomThickness, rimChamfer, handleEnabled, handleHeight, handleGap,
    handleReach, handleBand, handleWidth, handleClearance, text, textSize,
    fontStyle, textCenterY,
  }), [
    productType, diameterTop, diameterBottom, height, wallThickness,
    bottomThickness, rimChamfer, handleEnabled, handleHeight, handleGap,
    handleReach, handleBand, handleWidth, handleClearance, text, textSize,
    fontStyle, textCenterY,
  ])

  useEffect(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setError(null)
      try {
        const worker = workerFactoryRef.current()
        workerRef.current = worker
        setIsBuilding(true)

        worker.build(buildParams, (data: SerializedBuildResult) => {
          // Só a resposta do worker corrente vale; builds antigos são descartados.
          if (workerRef.current !== worker) return
          setGeometry(deserializeBuildResult(data))
          setBuiltParams(buildParams)
          setIsBuilding(false)
        }, () => {
          if (workerRef.current !== worker) return
          setIsBuilding(false)
          setError(BUILD_ERROR)
        })
      } catch {
        setIsBuilding(false)
        setError(BUILD_ERROR)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [buildParams])

  useEffect(() => () => {
    if (geometry) disposeMugResult(geometry)
  }, [geometry])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const issues: ValidationIssue[] = useMemo(
    () => validateMug(buildParams),
    [buildParams],
  )

  const capacityMl = useMemo(() => getCapacityMl(buildParams), [buildParams])

  const fallbackDimensions = useMemo(() => ({
    width: Number(diameterTop.toFixed(1)),
    height: Number(height.toFixed(1)),
    thickness: Number(wallThickness.toFixed(1)),
  }), [diameterTop, height, wallThickness])

  const fallbackFitRadius = useMemo(() => {
    const handleExtra = handleEnabled ? 2 * handleReach : 0
    return Math.max(
      1,
      0.5 * Math.hypot(diameterTop + handleExtra, height, diameterTop),
    )
  }, [diameterTop, height, handleEnabled, handleReach])

  const sizes = useMemo(() => {
    if (!geometry) return null
    geometry.body.computeBoundingBox()
    const body = geometry.body.boundingBox?.getSize(new Vector3()) ?? null
    const union = new Box3()
    if (geometry.body.boundingBox) union.union(geometry.body.boundingBox)
    if (geometry.handle) {
      geometry.handle.computeBoundingBox()
      if (geometry.handle.boundingBox) union.union(geometry.handle.boundingBox)
    }
    return { body, union: union.getSize(new Vector3()) }
  }, [geometry])

  const dimensions = useMemo(() => {
    if (!sizes?.body) return fallbackDimensions
    return {
      width: Number(sizes.body.x.toFixed(1)),
      height: Number(sizes.body.y.toFixed(1)),
      thickness: fallbackDimensions.thickness,
    }
  }, [sizes, fallbackDimensions])

  const fitRadius = useMemo(() => {
    if (!sizes) return fallbackFitRadius
    return Math.max(1, 0.5 * Math.hypot(sizes.union.x, sizes.union.y, sizes.union.z))
  }, [sizes, fallbackFitRadius])

  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = fitRadius * 2.2
    const elevation = (25 * Math.PI) / 180
    // Azimute 210° olha o lado do texto, oposto à alça em +X.
    const azimuth = (210 * Math.PI) / 180
    return [
      Number((distance * Math.sin(azimuth) * Math.cos(elevation)).toFixed(1)),
      Number((distance * Math.sin(elevation)).toFixed(1)),
      Number((distance * Math.cos(azimuth) * Math.cos(elevation)).toFixed(1)),
    ]
  }, [fitRadius])

  const updateParam = useCallback(
    (key: keyof MugParams, value: number | string | boolean) => {
      dispatch({ type: 'update', key, value })
    },
    [],
  )

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  return {
    params,
    geometry,
    builtParams,
    isBuilding,
    error,
    issues,
    capacityMl,
    dimensions,
    cameraPosition,
    fitRadius,
    updateParam,
    reset,
  }
}
