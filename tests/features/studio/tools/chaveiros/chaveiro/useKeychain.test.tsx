import * as THREE from 'three'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useKeychain } from '@/features/studio/tools/chaveiros/chaveiro/useKeychain'
import { defaultKeychainParams } from '@/features/studio/tools/chaveiros/chaveiro/schema'

vi.mock('@/features/studio/tools/chaveiros/chaveiro/buildKeychain', () => ({
  buildKeychain: vi.fn(() => ({
    base: new THREE.BufferGeometry(),
    content: new THREE.BufferGeometry(),
    contentItems: [{ id: 'content-1', halfWidth: 5, halfHeight: 2, geometry: null }],
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
  it('inicia com 1 conteúdo de texto no default', () => {
    const { result } = renderHook(() => useKeychain())
    expect(result.current.params.contents).toHaveLength(1)
    const [first] = result.current.params.contents
    expect(first.kind).toBe('text')
    if (first.kind === 'text') expect(first.content).toBe('Meu nome')
  })

  it('updateParam clampa valores da peça', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('borderWidth', 2))
    expect(result.current.params.borderWidth).toBe(4)
  })

  it('reset restaura defaults e contents com 1 item', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('width', 80))
    act(() => result.current.addContent())
    act(() => result.current.reset())
    expect(result.current.params.width).toBe(defaultKeychainParams.width)
    expect(result.current.params.contents).toHaveLength(1)
  })

  it('addContent adiciona um segundo texto e limita em 3', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.addContent())
    expect(result.current.params.contents).toHaveLength(2)
    const second = result.current.params.contents[1]
    expect(second.kind).toBe('text')
    if (second.kind === 'text') expect(second.content).toBe('Novo texto')

    act(() => result.current.addContent())
    act(() => result.current.addContent())
    expect(result.current.params.contents).toHaveLength(3)
  })

  it('removeContent remove um item adicionado e não remove o último', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.addContent())
    const addedId = result.current.params.contents[1].id
    act(() => result.current.removeContent(addedId))
    expect(result.current.params.contents).toHaveLength(1)

    const lastId = result.current.params.contents[0].id
    act(() => result.current.removeContent(lastId))
    expect(result.current.params.contents).toHaveLength(1)
  })

  it('updateContent patcha o item correto', () => {
    const { result } = renderHook(() => useKeychain())
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { content: 'Novo nome', fontSize: 12, offsetX: 10 }))
    const updated = result.current.params.contents[0]
    expect(updated.kind).toBe('text')
    if (updated.kind === 'text') {
      expect(updated.content).toBe('Novo nome')
      expect(updated.fontSize).toBe(12)
    }
    expect(updated.offsetX).toBe(10)
  })

  it('setContentType alterna texto para ícone preservando id e offsets, e volta', () => {
    const { result } = renderHook(() => useKeychain())
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { offsetX: 7, offsetY: -3 }))
    act(() => result.current.setContentType(id, 'icon'))

    const icon = result.current.params.contents[0]
    expect(icon.id).toBe(id)
    expect(icon.kind).toBe('icon')
    expect(icon.offsetX).toBe(7)
    expect(icon.offsetY).toBe(-3)
    if (icon.kind === 'icon') {
      expect(icon.svgIcon).toBeNull()
      expect(icon.iconScale).toBe(1)
    }

    act(() => result.current.setContentType(id, 'text'))
    const text = result.current.params.contents[0]
    expect(text.id).toBe(id)
    expect(text.kind).toBe('text')
    if (text.kind === 'text') expect(text.content).toBe('Novo texto')
  })

  it('updateContent aceita svgIcon em item de ícone', () => {
    const { result } = renderHook(() => useKeychain())
    const id = result.current.params.contents[0].id
    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: '<svg></svg>' }))
    const icon = result.current.params.contents[0]
    expect(icon.kind).toBe('icon')
    if (icon.kind === 'icon') expect(icon.svgIcon).toBe('<svg></svg>')
  })

  it('carrega fonte e gera geometria', async () => {
    const { result } = renderHook(() => useKeychain())
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.geometry?.base).toBeDefined()
    expect(result.current.geometry?.content).toBeDefined()
  })

  it('dimensions inclui width, height e thickness para retângulo', () => {
    const { result } = renderHook(() => useKeychain())
    expect(result.current.dimensions.width).toBe(defaultKeychainParams.width)
    expect(result.current.dimensions.height).toBe(defaultKeychainParams.height)
    expect(result.current.dimensions.thickness).toBe(defaultKeychainParams.thickness)
  })

  it('dimensions para name usa pieceBB quando a geometria existe', async () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('baseShape', 'name'))
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.dimensions.width).toBe(50)
    expect(result.current.dimensions.height).toBe(25)
  })

  it('height é independente do width e é clampado', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('height', 40))
    expect(result.current.params.height).toBe(40)
    expect(result.current.dimensions.height).toBe(40)

    act(() => result.current.updateParam('height', 10))
    expect(result.current.params.height).toBe(20)
  })

  it('conteúdo somente ícone gera geometria', async () => {
    const { result } = renderHook(() => useKeychain())
    const id = result.current.params.contents[0].id
    act(() => result.current.setContentType(id, 'icon'))
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.geometry?.base).toBeDefined()
  })
})
