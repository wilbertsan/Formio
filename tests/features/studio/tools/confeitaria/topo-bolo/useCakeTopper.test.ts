import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCakeTopper } from '@/features/studio/tools/confeitaria/topo-bolo/useCakeTopper'
import { defaultCakeTopperParams } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

// Mock FontLoader
vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((url, onLoad) => {
      onLoad({ type: 'font' })
    }),
  })),
  Font: vi.fn(),
}))

describe('useCakeTopper', () => {
  it('returns default params initially', () => {
    const { result } = renderHook(() => useCakeTopper())
    expect(result.current.params).toEqual(defaultCakeTopperParams)
  })

  it('updates param correctly', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => {
      result.current.updateParam('text', 'Novo Texto')
    })
    expect(result.current.params.text).toBe('Novo Texto')
  })

  it('clamps numeric values', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => {
      result.current.updateParam('width', 200) // Acima do max (120)
    })
    expect(result.current.params.width).toBe(120)
  })

  it('resets to default', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => {
      result.current.updateParam('text', 'Teste')
      result.current.reset()
    })
    expect(result.current.params.text).toBe(defaultCakeTopperParams.text)
  })

  it('sets SVG icon', () => {
    const { result } = renderHook(() => useCakeTopper())
    const svg = '<svg><path d="M0,0"/></svg>'
    act(() => {
      result.current.setSvgIcon(svg)
    })
    expect(result.current.params.svgIcon).toBe(svg)
  })

  it('returns dimensions', () => {
    const { result } = renderHook(() => useCakeTopper())
    expect(result.current.dimensions).toHaveProperty('width')
    expect(result.current.dimensions).toHaveProperty('height')
    expect(result.current.dimensions).toHaveProperty('thickness')
  })
})
