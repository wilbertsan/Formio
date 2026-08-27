import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCakeStand } from '@/features/studio/tools/confeitaria/suporte-bolo/useCakeStand'
import { defaultCakeStandParams, HEIGHT_MAP } from '@/features/studio/tools/confeitaria/suporte-bolo/schema'

// Mock do buildCakeStand
vi.mock('@/features/studio/tools/confeitaria/suporte-bolo/buildCakeStand', () => ({
  buildCakeStand: vi.fn(() => ({
    base: { dispose: vi.fn() },
    column: { dispose: vi.fn() },
    plate: { dispose: vi.fn() },
  })),
}))

describe('useCakeStand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna params padrão', () => {
    const { result } = renderHook(() => useCakeStand())
    
    expect(result.current.params).toEqual(defaultCakeStandParams)
  })

  it('updateParam atualiza baseDiameter', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCakeStand())
    
    act(() => {
      result.current.updateParam('baseDiameter', 180)
    })
    
    expect(result.current.params.baseDiameter).toBe(180)
    vi.useRealTimers()
  })

  it('updateParam atualiza height', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCakeStand())
    
    act(() => {
      result.current.updateParam('height', 'high')
    })
    
    expect(result.current.params.height).toBe('high')
    vi.useRealTimers()
  })

  it('updateParam atualiza plateHasRim', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCakeStand())
    
    act(() => {
      result.current.updateParam('plateHasRim', false)
    })
    
    expect(result.current.params.plateHasRim).toBe(false)
    vi.useRealTimers()
  })

  it('reset volta para defaults', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCakeStand())
    
    act(() => {
      result.current.updateParam('baseDiameter', 180)
    })
    
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.params).toEqual(defaultCakeStandParams)
    vi.useRealTimers()
  })

  it('dimensions retorna valores corretos', () => {
    const { result } = renderHook(() => useCakeStand())
    
    expect(result.current.dimensions).toEqual({
      width: defaultCakeStandParams.baseDiameter,
      height: HEIGHT_MAP[defaultCakeStandParams.height],
      thickness: defaultCakeStandParams.thickness,
    })
  })
})