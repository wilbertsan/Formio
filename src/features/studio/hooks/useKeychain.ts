import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { BufferGeometry } from 'three'
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import fontUrl from '@/assets/fonts/helvetiker_bold.typeface.json?url'
import {
  defaultKeychainParams,
  keychainParamsSchema,
  type KeychainParams,
} from '../keychain/schema'
import { buildKeychain } from '../keychain/buildKeychain'

type KeychainAction =
  | { type: 'update'; key: keyof KeychainParams; value: number | string }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  width: { min: 20, max: 80 },
  height: { min: 20, max: 80 },
  thickness: { min: 2, max: 6 },
  textHeight: { min: 10, max: 24 },
  textDepth: { min: 0.4, max: 2 },
  holeDiameter: { min: 3, max: 8 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function keychainReducer(state: KeychainParams, action: KeychainAction): KeychainParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = keychainParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultKeychainParams
  }
}

export function useKeychain() {
  const [params, dispatch] = useReducer(keychainReducer, defaultKeychainParams)
  const [font, setFont] = useState<Font | null>(null)
  const [fontError, setFontError] = useState(false)
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    new FontLoader().load(
      fontUrl,
      (loaded) => setFont(loaded as unknown as Font),
      undefined,
      () => setFontError(true),
    )
  }, [])

  useEffect(() => {
    if (!font) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        const next = buildKeychain({ font, params, onError: () => undefined })
        prev?.dispose()
        return next
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [font, params])

  const updateParam = useCallback((key: keyof KeychainParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const updateName = useCallback((name: string) => {
    dispatch({ type: 'update', key: 'name', value: name })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(
    () => ({ width: params.width, height: params.height, thickness: params.thickness }),
    [params.width, params.height, params.thickness],
  )

  return { params, geometry, fontError, dimensions, updateParam, updateName, reset }
}
