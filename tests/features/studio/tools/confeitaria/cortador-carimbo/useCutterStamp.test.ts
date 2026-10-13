import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCutterStamp } from '@/features/studio/tools/confeitaria/cortador-carimbo/useCutterStamp'
import { defaultCutterStampParams } from '@/features/studio/tools/confeitaria/cortador-carimbo/schema'

vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((_url: string, callback: (font: unknown) => void) => {
      callback({})
    }),
  })),
  Font: vi.fn(),
}))

function mockGeometry(minX: number, maxX: number, depth: number) {
  const boundingBox = { min: { x: minX, y: -5, z: 0 }, max: { x: maxX, y: 5, z: depth } }
  return {
    dispose: vi.fn(),
    computeBoundingBox: vi.fn(function (this: { boundingBox: unknown }) {
      this.boundingBox = boundingBox
    }),
    boundingBox,
  }
}

vi.mock('@/features/studio/tools/confeitaria/cortador-carimbo/buildCutterStamp', () => ({
  buildCutterStamp: vi.fn(() => ({
    cutter: mockGeometry(-26.2, 26.2, 25),
    stampBase: mockGeometry(5, 54.2, 8),
    stampRelief: mockGeometry(10, 45, 2),
    stampHandle: mockGeometry(20, 40, 12),
  })),
}))

import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(FontLoader).mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCutterStamp', () => {
  it('retorna os parâmetros padrão', () => {
    const { result } = renderHook(() => useCutterStamp())
    expect(result.current.params).toEqual(defaultCutterStampParams)
  })

  it('começa sem geometria', () => {
    const { result } = renderHook(() => useCutterStamp())
    expect(result.current.geometry).toBeNull()
  })

  it('atualiza um parâmetro', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      result.current.updateParam('textHeight', 40)
    })
    expect(result.current.params.textHeight).toBe(40)
  })

  it('faz clamp dos parâmetros numéricos', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      result.current.updateParam('textHeight', 100)
      result.current.updateParam('stampHeight', 30)
      result.current.updateParam('baseMargin', 20)
      result.current.updateParam('reliefHeight', 5)
    })
    expect(result.current.params.textHeight).toBe(60)
    expect(result.current.params.stampHeight).toBe(25)
    expect(result.current.params.baseMargin).toBe(10)
    expect(result.current.params.reliefHeight).toBe(3)
  })

  it('carrega a fonte para o conteúdo de texto', () => {
    renderHook(() => useCutterStamp())
    expect(FontLoader).toHaveBeenCalled()
  })

  it('reseta para os padrões', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      result.current.updateParam('textHeight', 40)
      result.current.reset()
    })
    expect(result.current.params).toEqual(defaultCutterStampParams)
  })

  it('gera a geometria após o debounce', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      result.current.updateParam('textHeight', 40)
    })
    expect(result.current.geometry).toBeNull()

    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.cutter).toBeDefined()
    expect(result.current.geometry!.stampBase).toBeDefined()
    expect(result.current.geometry!.stampHandle).toBeDefined()
  })

  it('reporta dimensões após a geometria', () => {
    const { result } = renderHook(() => useCutterStamp())
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.dimensions.width).toBeCloseTo(80.4, 1)
    expect(result.current.dimensions.height).toBe(25)
    expect(result.current.dimensions.thickness).toBe(defaultCutterStampParams.wallThickness)
  })

  it('posiciona a câmera para a largura combinada', () => {
    const { result } = renderHook(() => useCutterStamp())
    const [x, y, z] = result.current.cameraPosition
    expect(x).toBe(0)
    expect(y).toBeGreaterThan(0)
    expect(z).toBeGreaterThan(0)
  })
})
