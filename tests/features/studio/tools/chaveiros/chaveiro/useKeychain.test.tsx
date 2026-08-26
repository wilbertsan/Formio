import * as THREE from 'three'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useKeychain } from '@/features/studio/tools/chaveiros/chaveiro/useKeychain'
import { defaultKeychainParams } from '@/features/studio/tools/chaveiros/chaveiro/schema'

vi.mock('@/features/studio/tools/chaveiros/chaveiro/buildKeychain', () => ({
  buildKeychain: vi.fn(() => ({
    base: new THREE.BufferGeometry(),
    text: new THREE.BufferGeometry(),
    textItems: [{ id: 'text-1', geometry: new THREE.BufferGeometry() }],
    pieceBB: { minX: -25, maxX: 25, minY: -12.5, maxY: 12.5 },
    hole: { x: 0, y: 10, radius: 4.5 },
  })),
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

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor() { super() }
  },
}))

describe('useKeychain', () => {
  it('inicia com 1 texto no default', () => {
    const { result } = renderHook(() => useKeychain())
    expect(result.current.params.texts).toHaveLength(1)
    expect(result.current.params.texts[0].content).toBe('Meu nome')
  })

  it('updateParam clampa valores da peça', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('borderWidth', 2))
    expect(result.current.params.borderWidth).toBe(4)
  })

  it('reset restaura defaults', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('width', 80))
    act(() => result.current.reset())
    expect(result.current.params.width).toBe(defaultKeychainParams.width)
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('addText adiciona um segundo texto', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(2)
    expect(result.current.params.texts[1].content).toBe('Novo texto')
  })

  it('addText não adiciona além de 3', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.addText())
    act(() => result.current.addText())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(3)
  })

  it('removeText remove um texto', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.addText())
    const id = result.current.params.texts[1].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('removeText não remove se só tem 1', () => {
    const { result } = renderHook(() => useKeychain())
    const id = result.current.params.texts[0].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('updateText patcha o texto correto', () => {
    const { result } = renderHook(() => useKeychain())
    const id = result.current.params.texts[0].id
    act(() => result.current.updateText(id, { content: 'Novo nome', offsetX: 10 }))
    expect(result.current.params.texts[0].content).toBe('Novo nome')
    expect(result.current.params.texts[0].offsetX).toBe(10)
  })

  it('carrega fonte e gera geometria', async () => {
    const { result } = renderHook(() => useKeychain())
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.geometry?.base).toBeDefined()
    expect(result.current.geometry?.text).toBeDefined()
  })

  it('dimensions inclui width, height e thickness', () => {
    const { result } = renderHook(() => useKeychain())
    expect(result.current.dimensions.width).toBe(defaultKeychainParams.width)
    expect(result.current.dimensions.height).toBeDefined()
    expect(result.current.dimensions.thickness).toBe(defaultKeychainParams.thickness)
  })

  it('height é independente do width', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('height', 40))
    expect(result.current.params.height).toBe(40)
    expect(result.current.dimensions.height).toBe(40)
  })

  it('updateParam clampa height', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('height', 10))
    expect(result.current.params.height).toBe(20)
  })
})
