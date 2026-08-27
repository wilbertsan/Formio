import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { defaultCakeStandParams, cakeStandParamsSchema, type CakeStandParams, HEIGHT_MAP } from './schema'
import { buildCakeStand, type BuildCakeStandResult } from './buildCakeStand'

type CakeStandAction =
  | { type: 'update'; key: keyof CakeStandParams; value: number | string | boolean }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  baseDiameter: { min: 80, max: 200 },
  thickness: { min: 3, max: 6 },
  rimHeight: { min: 5, max: 15 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function cakeStandReducer(state: CakeStandParams, action: CakeStandAction): CakeStandParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = cakeStandParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultCakeStandParams
  }
}

export function useCakeStand() {
  const [params, dispatch] = useReducer(cakeStandReducer, defaultCakeStandParams)
  const [geometry, setGeometry] = useState<BuildCakeStandResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.base.dispose()
        prev?.column.dispose()
        prev?.plate.dispose()
        return buildCakeStand({ params })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [params])

  const updateParam = useCallback((key: keyof CakeStandParams, value: number | string | boolean) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    width: params.baseDiameter,
    height: HEIGHT_MAP[params.height],
    thickness: params.thickness,
  }), [params.baseDiameter, params.height, params.thickness])

  return { params, geometry, dimensions, updateParam, reset }
}