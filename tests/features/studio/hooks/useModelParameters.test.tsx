import { act, renderHook } from '@testing-library/react'
import { useModelParameters } from '@/features/studio/hooks/useModelParameters'
import { defaultParameters } from '@/features/studio/config/parameters'

describe('useModelParameters', () => {
  it('inicia com os parâmetros padrão', () => {
    const { result } = renderHook(() => useModelParameters())
    expect(result.current.parameters).toEqual(defaultParameters)
  })

  it('updateParameter atualiza um parâmetro', () => {
    const { result } = renderHook(() => useModelParameters())
    act(() => result.current.updateParameter('width', 80))
    expect(result.current.parameters.width).toBe(80)
  })

  it('updateParameter clampa valores inválidos', () => {
    const { result } = renderHook(() => useModelParameters())
    act(() => result.current.updateParameter('width', 500))
    expect(result.current.parameters.width).toBe(100)
    act(() => result.current.updateParameter('radius', -5))
    expect(result.current.parameters.radius).toBe(0)
  })

  it('resetParameters restaura os padrões', () => {
    const { result } = renderHook(() => useModelParameters())
    act(() => result.current.updateParameter('height', 90))
    act(() => result.current.resetParameters())
    expect(result.current.parameters).toEqual(defaultParameters)
  })
})
