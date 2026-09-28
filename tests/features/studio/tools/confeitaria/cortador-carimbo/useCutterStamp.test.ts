import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCutterStamp } from '@/features/studio/tools/confeitaria/cortador-carimbo/useCutterStamp'
import { defaultCutterStampParams } from '@/features/studio/tools/confeitaria/cortador-carimbo/schema'

// Mock FontLoader
vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((_url: string, callback: (font: unknown) => void) => {
      callback({})
    }),
  })),
  Font: vi.fn(),
}))

// Mock buildCutterStamp
vi.mock('@/features/studio/tools/confeitaria/cortador-carimbo/buildCutterStamp', () => ({
  buildCutterStamp: vi.fn(() => ({
    wall: { dispose: vi.fn(), computeBoundingBox: vi.fn() },
    text: null,
    centralShape: null,
  })),
}))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCutterStamp', () => {
  it('returns default params', () => {
    const { result } = renderHook(() => useCutterStamp())
    expect(result.current.params).toEqual(defaultCutterStampParams)
  })

  it('returns null geometry initially', () => {
    const { result } = renderHook(() => useCutterStamp())
    expect(result.current.geometry).toBeNull()
  })

  it('returns dimensions from params', () => {
    const { result } = renderHook(() => useCutterStamp())
    expect(result.current.dimensions).toEqual({
      width: defaultCutterStampParams.diameter,
      height: defaultCutterStampParams.wallHeight,
      thickness: defaultCutterStampParams.wallThickness,
    })
  })

  it('updates a parameter', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      result.current.updateParam('diameter', 60)
    })
    expect(result.current.params.diameter).toBe(60)
  })

  it('clamps diameter to valid range', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      result.current.updateParam('diameter', 100)
    })
    expect(result.current.params.diameter).toBe(80)
  })

  it('clamps stampHeight to be below wallHeight', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      result.current.updateParam('wallHeight', 20)
      result.current.updateParam('stampHeight', 25)
    })
    expect(result.current.params.stampHeight).toBeLessThan(result.current.params.wallHeight)
  })

  it('resets to default params', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      result.current.updateParam('diameter', 60)
      result.current.reset()
    })
    expect(result.current.params).toEqual(defaultCutterStampParams)
  })

  it('generates geometry after debounce', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      result.current.updateParam('diameter', 60)
    })
    expect(result.current.geometry).toBeNull()

    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.wall).toBeDefined()
  })

  it('returns correct camera position', () => {
    const { result } = renderHook(() => useCutterStamp())
    expect(result.current.cameraPosition).toEqual([0, 0, 100])
  })
})
