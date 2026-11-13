import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Box3, Vector3 } from 'three'
import {
  defaultThermoformerParams,
  thermoformerParamsSchema,
  type ThermoformerGeometryParams,
  type ThermoformerParams,
} from './schema'
import {
  validateThermoformer,
  type ValidationIssue,
} from './validateThermoformer'
import {
  disposeThermoformerResult,
  type BuildThermoformerResult,
} from './buildThermoformer'
import {
  deserializeBuildResult,
  type SerializedBuildResult,
} from './workerGeometry'
import {
  createThermoformerWorker,
  type ThermoformerWorker,
} from './workerClient'

type ThermoformerAction =
  | { type: 'update'; key: keyof ThermoformerParams; value: number | string | boolean }
  | { type: 'reset' }

const NUMERIC_RANGES: Partial<Record<keyof ThermoformerParams, { min: number; max: number }>> = {
  width: { min: 60, max: 300 },
  depth: { min: 60, max: 300 },
  height: { min: 20, max: 120 },
  cornerRadius: { min: 0, max: 40 },
  wallThickness: { min: 1.2, max: 6 },
  bottomThickness: { min: 1.2, max: 6 },
  rimHeight: { min: 0, max: 10 },
  rimThickness: { min: 1.2, max: 6 },
  edgeChamfer: { min: 0, max: 3 },
  lidThickness: { min: 1.2, max: 6 },
  lidHeight: { min: 0, max: 30 },
  lidClearance: { min: 0.1, max: 0.6 },
  lidCornerRadius: { min: 0, max: 40 },
  lidFitDepth: { min: 2, max: 20 },
  frontPanelWidth: { min: 40, max: 300 },
  frontPanelHeight: { min: 40, max: 300 },
  frontPanelThickness: { min: 1, max: 5 },
  frontPanelCornerRadius: { min: 0, max: 40 },
  borderWidth: { min: 3, max: 20 },
  holeDiameter: { min: 0.8, max: 6 },
  holeSpacingX: { min: 1, max: 10 },
  holeSpacingY: { min: 1, max: 10 },
  gridThickness: { min: 0.8, max: 4 },
  gridAngle: { min: 0, max: 90 },
  handleDiameter: { min: 3, max: 20 },
  handleLength: { min: 5, max: 60 },
  handleBaseDiameter: { min: 4, max: 30 },
  handleTipRadius: { min: 0, max: 5 },
  handleHeight: { min: 0, max: 1 },
  baseHeight: { min: 0, max: 30 },
  baseThickness: { min: 1.2, max: 6 },
  baseCornerRadius: { min: 0, max: 40 },
  printClearance: { min: 0.2, max: 0.3 },
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
    case 'reset':
      return defaultThermoformerParams
  }
}

export interface UseThermoformerOptions {
  workerFactory?: () => ThermoformerWorker
}

export interface UseThermoformerResult {
  params: ThermoformerParams
  geometry: BuildThermoformerResult | null
  isBuilding: boolean
  error: string | null
  issues: ValidationIssue[]
  dimensions: { width: number; height: number; thickness: number }
  cameraPosition: [number, number, number]
  fitRadius: number
  updateParam: (key: keyof ThermoformerParams, value: number | string | boolean) => void
  reset: () => void
}

export function useThermoformer(
  options: UseThermoformerOptions = {},
): UseThermoformerResult {
  const workerFactory = options.workerFactory ?? createThermoformerWorker
  const workerFactoryRef = useRef(workerFactory)
  workerFactoryRef.current = workerFactory
  const [params, dispatch] = useReducer(thermoformerReducer, defaultThermoformerParams)
  const [geometry, setGeometry] = useState<BuildThermoformerResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const workerRef = useRef<ThermoformerWorker | null>(null)

  const {
    productType, width, depth, height, cornerRadius, wallThickness,
    bottomThickness, rimHeight, rimThickness, edgeChamfer,
    lidEnabled, lidThickness, lidHeight, lidClearance, lidCornerRadius,
    lidFitDepth, fitType, frontPanelWidth, frontPanelHeight,
    frontPanelThickness, frontPanelCornerRadius, borderWidth,
    surfaceCurvature, pattern, holeDiameter, holeSpacingX, holeSpacingY,
    gridThickness, gridAngle, handleEnabled, handleDiameter, handleLength,
    handleBaseDiameter, handleTipRadius, handleSide, handleHeight,
    baseEnabled, baseHeight, baseThickness, baseCornerRadius, printClearance,
  } = params

  const buildParams = useMemo<ThermoformerGeometryParams>(() => ({
    productType, width, depth, height, cornerRadius, wallThickness,
    bottomThickness, rimHeight, rimThickness, edgeChamfer,
    lidEnabled, lidThickness, lidHeight, lidClearance, lidCornerRadius,
    lidFitDepth, fitType, frontPanelWidth, frontPanelHeight,
    frontPanelThickness, frontPanelCornerRadius, borderWidth,
    surfaceCurvature, pattern, holeDiameter, holeSpacingX, holeSpacingY,
    gridThickness, gridAngle, handleEnabled, handleDiameter, handleLength,
    handleBaseDiameter, handleTipRadius, handleSide, handleHeight,
    baseEnabled, baseHeight, baseThickness, baseCornerRadius, printClearance,
  }), [
    productType, width, depth, height, cornerRadius, wallThickness,
    bottomThickness, rimHeight, rimThickness, edgeChamfer,
    lidEnabled, lidThickness, lidHeight, lidClearance, lidCornerRadius,
    lidFitDepth, fitType, frontPanelWidth, frontPanelHeight,
    frontPanelThickness, frontPanelCornerRadius, borderWidth,
    surfaceCurvature, pattern, holeDiameter, holeSpacingX, holeSpacingY,
    gridThickness, gridAngle, handleEnabled, handleDiameter, handleLength,
    handleBaseDiameter, handleTipRadius, handleSide, handleHeight,
    baseEnabled, baseHeight, baseThickness, baseCornerRadius, printClearance,
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
          if (workerRef.current !== worker) return
          setGeometry(deserializeBuildResult(data))
          setIsBuilding(false)
        }, () => {
          if (workerRef.current !== worker) return
          setIsBuilding(false)
          setError('Falha ao gerar a geometria')
        })
      } catch {
        setIsBuilding(false)
        setError('Falha ao gerar a geometria')
      }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [buildParams])

  useEffect(() => () => {
    disposeThermoformerResult(geometry)
  }, [geometry])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const issues: ValidationIssue[] = useMemo(
    () => validateThermoformer(buildParams),
    [buildParams],
  )

  const fallbackDimensions = useMemo(() => {
    const baseExtra = params.baseEnabled
      ? 2 * (params.baseThickness + params.printClearance)
      : 0
    const handleExtra = params.handleEnabled
      && (params.handleSide === 'left' || params.handleSide === 'right')
      ? params.handleLength
      : 0
    const lidExtra = params.lidEnabled
      ? params.lidHeight + params.lidThickness
      : 0
    const handleTopExtra = params.handleEnabled && params.handleSide === 'top'
      ? params.handleLength
      : 0
    return {
      width: Number((Math.max(params.width + baseExtra, params.width + handleExtra)).toFixed(1)),
      height: Number((params.height + params.rimHeight + Math.max(lidExtra, handleTopExtra)).toFixed(1)),
      thickness: Number((Math.max(params.depth + baseExtra, params.depth + params.frontPanelThickness)).toFixed(1)),
    }
  }, [
    params.width, params.depth, params.height, params.rimHeight,
    params.baseEnabled, params.baseThickness, params.printClearance,
    params.handleEnabled, params.handleSide, params.handleLength,
    params.lidEnabled, params.lidHeight, params.lidThickness,
    params.frontPanelThickness,
  ])

  const bounds = useMemo(() => {
    if (!geometry) return null
    const box = new Box3()
    for (const part of [
      geometry.body, geometry.lid, geometry.frontPanel,
      geometry.handle, geometry.base,
    ]) {
      if (!part) continue
      part.computeBoundingBox()
      if (part.boundingBox) box.union(part.boundingBox)
    }
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
    if (!bounds) {
      return Math.max(
        1,
        0.5 * Math.hypot(
          fallbackDimensions.width,
          fallbackDimensions.height,
          fallbackDimensions.thickness,
        ),
      )
    }
    return Math.max(1, 0.5 * Math.hypot(bounds.x, bounds.y, bounds.z))
  }, [bounds, fallbackDimensions])

  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = fitRadius * 2.2
    const elevation = (25 * Math.PI) / 180
    const azimuth = (210 * Math.PI) / 180
    return [
      Number((distance * Math.sin(azimuth) * Math.cos(elevation)).toFixed(1)),
      Number((distance * Math.sin(elevation)).toFixed(1)),
      Number((distance * Math.cos(azimuth) * Math.cos(elevation)).toFixed(1)),
    ]
  }, [fitRadius])

  const updateParam = useCallback(
    (key: keyof ThermoformerParams, value: number | string | boolean) => {
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
    isBuilding,
    error,
    issues,
    dimensions,
    cameraPosition,
    fitRadius,
    updateParam,
    reset,
  }
}
