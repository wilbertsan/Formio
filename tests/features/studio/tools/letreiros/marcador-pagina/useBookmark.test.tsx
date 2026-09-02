import * as THREE from 'three'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useBookmark } from '@/features/studio/tools/letreiros/marcador-pagina/useBookmark'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'

vi.mock('@/features/studio/tools/letreiros/marcador-pagina/buildBookmark', () => ({
  buildBookmark: vi.fn(() => ({
    base: new THREE.BufferGeometry(),
    text: new THREE.BufferGeometry(),
    textItems: [{ id: 'text-1', geometry: new THREE.BufferGeometry() }],
  })),
}))

vi.mock('@/features/studio/tools/letreiros/marcador-pagina/fonts', () => ({
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

describe('useBookmark', () => {
  it('inicia com 1 texto no default', () => {
    const { result } = renderHook(() => useBookmark())
    expect(result.current.params.texts).toHaveLength(1)
    expect(result.current.params.texts[0].content).toBe('Meu nome')
  })

  it('updateParam clampa valores da peça', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.updateParam('length', 40))
    expect(result.current.params.length).toBe(50)
  })

  it('reset restaura defaults', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.updateParam('length', 150))
    act(() => result.current.reset())
    expect(result.current.params.length).toBe(defaultBookmarkParams.length)
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('addText adiciona um segundo texto', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(2)
    expect(result.current.params.texts[1].content).toBe('Novo texto')
  })

  it('addText não adiciona além de 3', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.addText())
    act(() => result.current.addText())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(3)
  })

  it('removeText remove um texto', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.addText())
    const id = result.current.params.texts[1].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('removeText não remove se só tem 1', () => {
    const { result } = renderHook(() => useBookmark())
    const id = result.current.params.texts[0].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('updateText patcha o texto correto', () => {
    const { result } = renderHook(() => useBookmark())
    const id = result.current.params.texts[0].id
    act(() => result.current.updateText(id, { content: 'Novo nome', offsetX: 10 }))
    expect(result.current.params.texts[0].content).toBe('Novo nome')
    expect(result.current.params.texts[0].offsetX).toBe(10)
  })

  it('carrega fonte e gera geometria', async () => {
    const { result } = renderHook(() => useBookmark())
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.geometry?.base).toBeDefined()
    expect(result.current.geometry?.text).toBeDefined()
  })

  it('dimensions inclui length, width e thickness', () => {
    const { result } = renderHook(() => useBookmark())
    expect(result.current.dimensions.length).toBe(defaultBookmarkParams.length)
    expect(result.current.dimensions.width).toBe(defaultBookmarkParams.width)
    expect(result.current.dimensions.thickness).toBe(defaultBookmarkParams.thickness)
  })
})