import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStamp } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp'
import { defaultStampParams } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/schema'

// Mock FontLoader
vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((_url, callback) => {
      callback({})
    }),
  })),
  Font: vi.fn(),
}))

describe('useStamp', () => {
  it('initializes with default params', () => {
    const { result } = renderHook(() => useStamp())
    expect(result.current.params).toEqual(defaultStampParams)
  })

  it('updates param correctly', () => {
    const { result } = renderHook(() => useStamp())

    act(() => {
      result.current.updateParam('diameter', 25)
    })

    expect(result.current.params.diameter).toBe(25)
  })

  it('clamps diameter to max 30mm', () => {
    const { result } = renderHook(() => useStamp())

    act(() => {
      result.current.updateParam('diameter', 35)
    })

    expect(result.current.params.diameter).toBe(30)
  })

  it('clamps diameter to min 10mm', () => {
    const { result } = renderHook(() => useStamp())

    act(() => {
      result.current.updateParam('diameter', 5)
    })

    expect(result.current.params.diameter).toBe(10)
  })

  it('resets to default params', () => {
    const { result } = renderHook(() => useStamp())

    act(() => {
      result.current.updateParam('diameter', 25)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.params).toEqual(defaultStampParams)
  })

  it('sets SVG icon', () => {
    const { result } = renderHook(() => useStamp())
    const svgString = '<svg><circle cx="10" cy="10" r="5"/></svg>'

    act(() => {
      result.current.setSvgIcon(svgString)
    })

    expect(result.current.params.svgIcon).toBe(svgString)
  })

  it('returns correct dimensions', () => {
    const { result } = renderHook(() => useStamp())

    expect(result.current.dimensions).toEqual({
      diameter: 20,
      height: 20,
    })
  })

  it('returns camera position based on diameter', () => {
    const { result } = renderHook(() => useStamp())

    expect(result.current.cameraPosition).toEqual([0, 0, 40])
  })
})
