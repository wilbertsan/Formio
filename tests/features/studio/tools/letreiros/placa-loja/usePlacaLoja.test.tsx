import * as THREE from 'three'
import { act, renderHook, waitFor } from '@testing-library/react'
import { usePlacaLoja } from '@/features/studio/tools/letreiros/placa-loja/usePlacaLoja'
import { defaultPlacaLojaParams, defaultText } from '@/features/studio/tools/letreiros/placa-loja/schema'

vi.mock('@/features/studio/tools/letreiros/placa-loja/buildPlacaLoja', () => ({
  buildPlacaLoja: vi.fn(() => ({
    base: new THREE.BufferGeometry(),
    text: new THREE.BufferGeometry(),
    textItems: [{ id: 'text-1', geometry: new THREE.BufferGeometry() }],
  })),
}))

vi.mock('@/features/studio/tools/letreiros/placa-loja/fonts', () => ({
  fontUrls: { normal: '/font-normal.json', bold: '/font-bold.json', serif: '/font-serif.json' },
}))

vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: class {
    load(_url: string, onLoad: (font: unknown) => void): void {
      onLoad({ glyphs: {} })
    }
  },
}))

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor() { super() }
  },
}))

describe('usePlacaLoja', () => {
  it('inicia com 1 texto no default', () => {
    const { result } = renderHook(() => usePlacaLoja())
    expect(result.current.params.texts).toHaveLength(1)
    expect(result.current.params.texts[0].content).toBe(defaultText.content)
  })

  it('updateParam clampa valores da placa', () => {
    const { result } = renderHook(() => usePlacaLoja())
    act(() => result.current.updateParam('width', 50))
    expect(result.current.params.width).toBe(100)
  })

  it('updateParam clampa valor maximo', () => {
    const { result } = renderHook(() => usePlacaLoja())
    act(() => result.current.updateParam('width', 500))
    expect(result.current.params.width).toBe(300)
  })

  it('reset restaura defaults', () => {
    const { result } = renderHook(() => usePlacaLoja())
    act(() => result.current.updateParam('width', 300))
    act(() => result.current.reset())
    expect(result.current.params.width).toBe(defaultPlacaLojaParams.width)
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('addText adiciona um segundo texto com defaultText', () => {
    const { result } = renderHook(() => usePlacaLoja())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(2)
    expect(result.current.params.texts[1].content).toBe(defaultText.content)
  })

  it('addText não adiciona além de 5', () => {
    const { result } = renderHook(() => usePlacaLoja())
    act(() => result.current.addText())
    act(() => result.current.addText())
    act(() => result.current.addText())
    act(() => result.current.addText())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(5)
  })

  it('removeText remove um texto', () => {
    const { result } = renderHook(() => usePlacaLoja())
    act(() => result.current.addText())
    const id = result.current.params.texts[1].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('removeText não remove se só tem 1', () => {
    const { result } = renderHook(() => usePlacaLoja())
    const id = result.current.params.texts[0].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('updateTextById patcha o texto correto', () => {
    const { result } = renderHook(() => usePlacaLoja())
    const id = result.current.params.texts[0].id
    act(() => result.current.updateTextById(id, { content: 'Novo nome', offsetX: 10 }))
    expect(result.current.params.texts[0].content).toBe('Novo nome')
    expect(result.current.params.texts[0].offsetX).toBe(10)
  })

  it('carrega fonte e gera geometria', async () => {
    const { result } = renderHook(() => usePlacaLoja())
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.geometry?.base).toBeDefined()
    expect(result.current.geometry?.text).toBeDefined()
  })

  it('dimensions inclui width, height e thickness', () => {
    const { result } = renderHook(() => usePlacaLoja())
    expect(result.current.dimensions.width).toBe(defaultPlacaLojaParams.width)
    expect(result.current.dimensions.height).toBe(defaultPlacaLojaParams.height)
    expect(result.current.dimensions.thickness).toBe(defaultPlacaLojaParams.thickness)
  })
})
