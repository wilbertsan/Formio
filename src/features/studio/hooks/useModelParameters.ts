import { useCallback, useReducer } from 'react'
import {
  clampParameter,
  defaultParameters,
  type ModelParameters,
  type ParameterKey,
} from '../config/parameters'

type ModelParametersAction =
  | { type: 'update'; key: ParameterKey; value: number }
  | { type: 'reset' }

function modelParametersReducer(
  state: ModelParameters,
  action: ModelParametersAction,
): ModelParameters {
  switch (action.type) {
    case 'update':
      return { ...state, [action.key]: clampParameter(action.key, action.value) }
    case 'reset':
      return defaultParameters
  }
}

export function useModelParameters() {
  const [parameters, dispatch] = useReducer(modelParametersReducer, defaultParameters)

  const updateParameter = useCallback((key: ParameterKey, value: number) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const resetParameters = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  return { parameters, updateParameter, resetParameters }
}
