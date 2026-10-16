import * as THREE from 'three'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useCakeTopper } from '@/features/studio/tools/confeitaria/topo-bolo/useCakeTopper'
import { defaultCakeTopperParams, defaultText } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

vi.mock('@/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper', () => ({
  buildCakeTopper: vi.fn(() => ({
    plate: new THREE.BufferGeometry(),
    relief: null,
    support: null,
  })),
  disposeCakeTopperResult: vi.fn(),
}))

vi.mock('@/features/studio/tools/chaveiros/chaveiro/fonts', () => ({
  fontUrls: { normal: '/font-normal.json', bold: '/font-bold.json', serif: '/font-serif.json' },
}))

vi.mock('@/assets/fonts/helvetiker_regular.typeface.json?url', () => ({ default: '/mock-font.json' }))
vi.mock('@/assets/fonts/helvetiker_bold.typeface.json?url', () => ({ default: '/mock-font.json' }))
vi.mock('@/assets/fonts/optimer_regular.typeface.json?url', () => ({ default: '/mock-font.json' }))

vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: class {
    load(_url: string, onLoad: (font: unknown) => void): void {
      onLoad({ glyphs: {} })
    }
  },
}))

describe('useCakeTopper', () => {
  it('inicia com os parâmetros default', () => {
    const { result } = renderHook(() => useCakeTopper())
    expect(result.current.params).toEqual(defaultCakeTopperParams)
  })

  it('updateParam atualiza shape', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('shape', 'oval'))
    expect(result.current.params.shape).toBe('oval')
  })

  it('updateParam clampa width acima do máximo', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('width', 200))
    expect(result.current.params.width).toBe(120)
  })

  it('updateParam atualiza textMode', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('textMode', 'cut'))
    expect(result.current.params.textMode).toBe('cut')
  })

  it('updateParam atualiza supportType', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('supportType', 'base'))
    expect(result.current.params.supportType).toBe('base')
  })

  it('addText adiciona textos até o máximo de 3', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(2)
    expect(result.current.params.texts[1].content).toBe(defaultText.content)
    act(() => result.current.addText())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(3)
  })

  it('addText é no-op ao atingir 3 textos', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.addText())
    act(() => result.current.addText())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(3)
  })

  it('removeText remove um texto', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.addText())
    const id = result.current.params.texts[1].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('removeText não remove abaixo de 1', () => {
    const { result } = renderHook(() => useCakeTopper())
    const id = result.current.params.texts[0].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('updateTextById patcha o texto correto', () => {
    const { result } = renderHook(() => useCakeTopper())
    const id = result.current.params.texts[0].id
    act(() => result.current.updateTextById(id, { content: 'Parabéns' }))
    expect(result.current.params.texts[0].content).toBe('Parabéns')
  })

  it('setSvgIcon define o ícone SVG', () => {
    const { result } = renderHook(() => useCakeTopper())
    const svg = '<svg><path d="M0,0"/></svg>'
    act(() => result.current.setSvgIcon(svg))
    expect(result.current.params.svgIcon).toBe(svg)
  })

  it('setContourSvg define o contorno SVG', () => {
    const { result } = renderHook(() => useCakeTopper())
    const svg = '<svg><path d="M1,1"/></svg>'
    act(() => result.current.setContourSvg(svg))
    expect(result.current.params.contourSvg).toBe(svg)
  })

  it('reset restaura os defaults', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('shape', 'rounded-rect'))
    act(() => result.current.addText())
    act(() => result.current.reset())
    expect(result.current.params).toEqual(defaultCakeTopperParams)
  })

  it('dimensions inclui height com stemLength para haste', () => {
    const { result } = renderHook(() => useCakeTopper())
    expect(result.current.dimensions.width).toBe(defaultCakeTopperParams.width)
    expect(result.current.dimensions.thickness).toBe(defaultCakeTopperParams.thickness)
    expect(result.current.dimensions.height).toBe(
      defaultCakeTopperParams.height + defaultCakeTopperParams.stemLength,
    )
  })

  it('dimensions usa apenas height para base', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('supportType', 'base'))
    expect(result.current.dimensions.height).toBe(defaultCakeTopperParams.height)
  })

  it('gera geometria após carregar a fonte (debounce)', async () => {
    const { result } = renderHook(() => useCakeTopper())
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.geometry?.plate).toBeDefined()
  })

  it('expõe cameraPosition como [0, 0, distance]', () => {
    const { result } = renderHook(() => useCakeTopper())
    const [x, y, z] = result.current.cameraPosition
    const totalHeight = defaultCakeTopperParams.height + defaultCakeTopperParams.stemLength
    expect(x).toBe(0)
    expect(y).toBe(0)
    expect(z).toBe(Math.max(defaultCakeTopperParams.width, totalHeight) * 2)
  })
})
