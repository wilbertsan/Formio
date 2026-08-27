import { renderHook, act } from '@testing-library/react'
import { useCard } from '@/features/studio/tools/letreiros/cartao-visita/useCard'
import { defaultCardParams, type TextBlock } from '@/features/studio/tools/letreiros/cartao-visita/schema'

vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: class {
    load(_url: string, onLoad: (font: never) => void) {
      setTimeout(() => {
        onLoad({
          glyphs: {},
          generateShapes: () => [],
        } as never)
      }, 0)
    }
  },
}))

vi.mock('@/features/studio/tools/letreiros/cartao-visita/buildCard', () => ({
  buildCard: vi.fn().mockReturnValue({
    base: { dispose: vi.fn() },
    text: { dispose: vi.fn() },
    textBlocks: [],
  }),
}))

describe('useCard', () => {
  it('returns default params on mount', () => {
    const { result } = renderHook(() => useCard())
    expect(result.current.params).toEqual(defaultCardParams)
  })

  it('updateParam changes layout', async () => {
    const { result } = renderHook(() => useCard())

    act(() => {
      result.current.updateParam('layout', 'left')
    })

    expect(result.current.params.layout).toBe('left')
  })

  it('updateBlock changes block content', async () => {
    const { result } = renderHook(() => useCard())
    const blockId = defaultCardParams.blocks[0].id

    act(() => {
      result.current.updateBlock(blockId, { content: 'João Silva' })
    })

    const updatedBlock = result.current.params.blocks.find((b: TextBlock) => b.id === blockId)
    expect(updatedBlock?.content).toBe('João Silva')
  })

  it('addBlock adds new block when below limit', async () => {
    const { result } = renderHook(() => useCard())
    const blockId = result.current.params.blocks[1].id

    act(() => {
      result.current.removeBlock(blockId)
    })

    const afterRemove = result.current.params.blocks.length

    act(() => {
      result.current.addBlock()
    })

    expect(result.current.params.blocks.length).toBe(afterRemove + 1)
    expect(result.current.params.blocks[afterRemove]).toHaveProperty('id')
  })

  it('addBlock does not exceed 3 blocks', async () => {
    const { result } = renderHook(() => useCard())

    act(() => {
      result.current.addBlock()
    })

    expect(result.current.params.blocks.length).toBe(3)
  })

  it('removeBlock removes block', async () => {
    const { result } = renderHook(() => useCard())
    const blockId = defaultCardParams.blocks[1].id

    act(() => {
      result.current.removeBlock(blockId)
    })

    expect(result.current.params.blocks.find((b: TextBlock) => b.id === blockId)).toBeUndefined()
  })

  it('reset restores defaults', async () => {
    const { result } = renderHook(() => useCard())

    act(() => {
      result.current.updateParam('layout', 'left')
      result.current.updateParam('width', 70)
    })

    expect(result.current.params.layout).toBe('left')
    expect(result.current.params.width).toBe(70)

    act(() => {
      result.current.reset()
    })

    expect(result.current.params).toEqual(defaultCardParams)
  })
})