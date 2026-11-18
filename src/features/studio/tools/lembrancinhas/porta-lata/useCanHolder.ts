import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Box3, Vector3 } from 'three'
import { disposeCanHolderResult, type CanHolderBuildResult } from './buildCanHolder'
import {
  defaultCanHolderParams,
  getOuterDiameter,
  getOuterHeight,
  MAX_TEXT_LENGTH,
  MINIMUM_BOTTOM_MM,
  MINIMUM_WALL_MM,
  canHolderParamsSchema,
  type CanHolderGeometryParams,
  type CanHolderParams,
} from './schema'
import { validateCanHolder, type ValidationIssue } from './validateCanHolder'
import {
  deserializeBuildResult,
  type CanHolderErrorCode,
  type SerializedBuildResult,
} from './workerGeometry'
import { createCanHolderWorker, type CanHolderWorker } from './workerClient'

type CanHolderAction =
  | { type: 'update'; key: keyof CanHolderParams; value: number | string | boolean }
  | { type: 'reset' }

const NUMERIC_RANGES: Partial<Record<keyof CanHolderParams, { min: number; max: number }>> = {
  cavityDepth: { min: 80, max: 118 },
  canClearance: { min: 0.5, max: 1.2 },
  wallThickness: { min: MINIMUM_WALL_MM, max: 4 },
  bottomThickness: { min: MINIMUM_BOTTOM_MM, max: 6 },
  ventHoleDiameter: { min: 6, max: 14 },
  rimLeadIn: { min: 0.5, max: 2 },
  rimChamfer: { min: 0, max: 1.5 },
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

const ERROR_MESSAGES: Record<CanHolderErrorCode, string> = {
  'can-csg': 'Falha ao gerar o relevo. Tente outro texto.',
  'can-font': 'Falha ao carregar a fonte.',
  'can-invalid': 'Parâmetros inválidos.',
  'can-build': BUILD_ERROR,
}

function errorMessage(code?: CanHolderErrorCode): string {
  return (code ? ERROR_MESSAGES[code] : undefined) ?? BUILD_ERROR
}

function clampValue(key: keyof CanHolderParams, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function canHolderReducer(
  state: CanHolderParams,
  action: CanHolderAction,
): CanHolderParams {
  switch (action.type) {
    case 'update': {
      let value: number | string | boolean = action.value
      if (action.key === 'text' && typeof value === 'string') {
        value = Array.from(value).slice(0, MAX_TEXT_LENGTH).join('')
      }
      if (typeof value === 'number') {
        value = clampValue(action.key, value)
      }
      const next = { ...state, [action.key]: value }
      const parsed = canHolderParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return { ...defaultCanHolderParams }
  }
}

function isFiniteSize(size: Vector3): boolean {
  return Number.isFinite(size.x) && Number.isFinite(size.y) && Number.isFinite(size.z)
}

export interface UseCanHolderOptions {
  /**
   * Fábrica de workers usada a cada build. Deve devolver um worker novo a cada
   * chamada: o hook encerra o worker anterior e descarta respostas obsoletas.
   */
  workerFactory?: () => CanHolderWorker
}

export interface UseCanHolderResult {
  params: CanHolderParams
  geometry: CanHolderBuildResult | null
  builtParams: CanHolderGeometryParams | null
  isBuilding: boolean
  error: string | null
  issues: ValidationIssue[]
  dimensions: { width: number; height: number; thickness: number }
  cameraPosition: [number, number, number]
  fitRadius: number
  updateParam: (key: keyof CanHolderParams, value: number | string | boolean) => void
  reset: () => void
}

export function useCanHolder(
  options: UseCanHolderOptions = {},
): UseCanHolderResult {
  const workerFactory = options.workerFactory ?? createCanHolderWorker
  const workerFactoryRef = useRef(workerFactory)
  workerFactoryRef.current = workerFactory
  const [params, dispatch] = useReducer(canHolderReducer, { ...defaultCanHolderParams })
  const [builtParams, setBuiltParams] = useState<CanHolderGeometryParams | null>(null)
  const [geometry, setGeometry] = useState<CanHolderBuildResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const workerRef = useRef<CanHolderWorker | null>(null)

  const {
    productType, cavityDepth, canClearance, wallThickness, bottomThickness,
    ventHoleDiameter, rimLeadIn, rimChamfer, handleEnabled, handleHeight,
    handleGap, handleReach, handleBand, handleWidth, handleClearance,
    text, textSize, fontStyle, textCenterY,
  } = params

  const buildParams = useMemo<CanHolderGeometryParams>(() => ({
    productType, cavityDepth, canClearance, wallThickness, bottomThickness,
    ventHoleDiameter, rimLeadIn, rimChamfer, handleEnabled, handleHeight,
    handleGap, handleReach, handleBand, handleWidth, handleClearance,
    text, textSize, fontStyle, textCenterY,
  }), [
    productType, cavityDepth, canClearance, wallThickness, bottomThickness,
    ventHoleDiameter, rimLeadIn, rimChamfer, handleEnabled, handleHeight,
    handleGap, handleReach, handleBand, handleWidth, handleClearance,
    text, textSize, fontStyle, textCenterY,
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
          try {
            const next = deserializeBuildResult(data)
            setGeometry(next)
            setBuiltParams(buildParams)
            setIsBuilding(false)
          } catch {
            setIsBuilding(false)
            setError(BUILD_ERROR)
          }
        }, (code) => {
          if (workerRef.current !== worker) return
          setIsBuilding(false)
          setError(errorMessage(code))
        })
      } catch {
        setIsBuilding(false)
        setError(BUILD_ERROR)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [buildParams])

  useEffect(() => () => {
    if (geometry) disposeCanHolderResult(geometry)
  }, [geometry])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const issues: ValidationIssue[] = useMemo(
    () => validateCanHolder(buildParams),
    [buildParams],
  )

  const nominalParams = builtParams ?? buildParams

  const fallbackFitRadius = useMemo(() => {
    const handleExtra = handleEnabled ? 2 * handleReach : 0
    return Math.max(
      1,
      0.5 * Math.hypot(
        getOuterDiameter(nominalParams) + handleExtra,
        getOuterHeight(nominalParams),
        getOuterDiameter(nominalParams),
      ),
    )
  }, [nominalParams, handleEnabled, handleReach])

  const unionSize = useMemo(() => {
    if (!geometry) return null
    geometry.body.computeBoundingBox()
    const union = new Box3()
    if (geometry.body.boundingBox) union.union(geometry.body.boundingBox)
    if (geometry.handle) {
      geometry.handle.computeBoundingBox()
      if (geometry.handle.boundingBox) union.union(geometry.handle.boundingBox)
    }
    const size = union.getSize(new Vector3())
    // Uma malha corrompida pode gerar caixa vazia (Infinity/-Infinity).
    return isFiniteSize(size) ? size : null
  }, [geometry])

  const dimensions = useMemo(() => {
    // O bbox do corpo inclui 1 mm de relevo a 180°; o status bar usa as
    // dimensões nominais do snapshot que gerou a geometria.
    return {
      width: Number(getOuterDiameter(nominalParams).toFixed(1)),
      height: Number(getOuterHeight(nominalParams).toFixed(1)),
      thickness: Number(nominalParams.wallThickness.toFixed(1)),
    }
  }, [nominalParams])

  const fitRadius = useMemo(() => {
    if (!unionSize) return fallbackFitRadius
    return Math.max(1, 0.5 * Math.hypot(unionSize.x, unionSize.y, unionSize.z))
  }, [unionSize, fallbackFitRadius])

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
    (key: keyof CanHolderParams, value: number | string | boolean) => {
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
    dimensions,
    cameraPosition,
    fitRadius,
    updateParam,
    reset,
  }
}
