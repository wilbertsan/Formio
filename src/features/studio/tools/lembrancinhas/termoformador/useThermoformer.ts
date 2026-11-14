import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Box3, Vector3, type BufferGeometry } from 'three'
import {
  defaultThermoformerParams,
  thermoformerParamsSchema,
  type ThermoformerGeometryParams,
  type ThermoformerParams,
} from './schema'
import { validateScreen, type ValidationIssue } from './validateScreen'
import { deserializeGeometry, type SerializedGeometry } from './workerGeometry'
import { createScreenWorker, type ScreenWorker } from './workerClient'

type ThermoformerAction =
  | { type: 'update'; key: keyof ThermoformerParams; value: number | string }
  | { type: 'reset' }

const NUMERIC_RANGES: Partial<Record<keyof ThermoformerParams, { min: number; max: number }>> = {
  diameter: { min: 60, max: 300 },
  thickness: { min: 1.2, max: 6 },
  frameWidth: { min: 2, max: 30 },
  lineWidth: { min: 1.2, max: 4 },
  opening: { min: 3, max: 30 },
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
  workerFactory?: () => ScreenWorker
}

export interface UseThermoformerResult {
  params: ThermoformerParams
  geometry: BufferGeometry | null
  isBuilding: boolean
  error: string | null
  issues: ValidationIssue[]
  dimensions: { width: number; height: number; thickness: number }
  cameraPosition: [number, number, number]
  fitRadius: number
  updateParam: (key: keyof ThermoformerParams, value: number | string) => void
  reset: () => void
}

export function useThermoformer(
  options: UseThermoformerOptions = {},
): UseThermoformerResult {
  const workerFactory = options.workerFactory ?? createScreenWorker
  const workerFactoryRef = useRef(workerFactory)
  workerFactoryRef.current = workerFactory
  const [params, dispatch] = useReducer(thermoformerReducer, defaultThermoformerParams)
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const workerRef = useRef<ScreenWorker | null>(null)

  const {
    productType,
    diameter,
    thickness,
    frameWidth,
    lineWidth,
    opening,
  } = params

  const buildParams = useMemo<ThermoformerGeometryParams>(() => ({
    productType,
    diameter,
    thickness,
    frameWidth,
    lineWidth,
    opening,
  }), [productType, diameter, thickness, frameWidth, lineWidth, opening])

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

        worker.build(buildParams, (data: SerializedGeometry) => {
          if (workerRef.current !== worker) return
          setGeometry(deserializeGeometry(data))
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
    geometry?.dispose()
  }, [geometry])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const issues = useMemo(
    () => validateScreen(buildParams),
    [buildParams],
  )

  const fallbackDimensions = useMemo(() => ({
    width: Number(diameter.toFixed(1)),
    height: Number(diameter.toFixed(1)),
    thickness: Number(thickness.toFixed(1)),
  }), [diameter, thickness])

  const bounds = useMemo(() => {
    if (!geometry) return null
    geometry.computeBoundingBox()
    const box = new Box3()
    if (geometry.boundingBox) box.union(geometry.boundingBox)
    return box.getSize(new Vector3())
  }, [geometry])

  const dimensions = useMemo(() => {
    if (!bounds) return fallbackDimensions
    return {
      width: Number(bounds.x.toFixed(1)),
      height: Number(bounds.z.toFixed(1)),
      thickness: Number(bounds.y.toFixed(1)),
    }
  }, [bounds, fallbackDimensions])

  const fitRadius = useMemo(() => {
    if (!geometry) {
      return Math.max(
        1,
        0.5 * Math.hypot(
          fallbackDimensions.width,
          fallbackDimensions.thickness,
          fallbackDimensions.height,
        ),
      )
    }
    geometry.computeBoundingSphere()
    return Math.max(1, geometry.boundingSphere?.radius ?? 1)
  }, [geometry, fallbackDimensions])

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
