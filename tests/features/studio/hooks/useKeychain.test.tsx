import * as THREE from 'three'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useKeychain } from '@/features/studio/hooks/useKeychain'
import { defaultKeychainParams } from '@/features/studio/keychain/schema'

vi.mock('@/features/studio/keychain/buildKeychain', () => ({
  buildKeychain: vi.fn(() => ({
    base: new THREE.BufferGeometry(),
    text: new THREE.BufferGeometry(),
  })),
}))

vi.mock('@/features/studio/keychain/fonts', () => ({
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
  it('inicia com defaults do schema novo', () => {
    const { result } = renderHook(() => useKeychain())
    expect(result.current.params).toEqual(defaultKeychainParams)
  })

  it('updateParam clampa borderWidth mínimo 4', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('borderWidth', 2))
    expect(result.current.params.borderWidth).toBe(4)
  })

  it('updateParam clampa ringRadialOffset mínimo 0', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('ringRadialOffset', -1))
    expect(result.current.params.ringRadialOffset).toBe(0)
  })

  it('updateName aceita nome válido', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateName('Ana'))
    expect(result.current.params.name).toBe('Ana')
  })

  it('updateName rejeita nome inválido', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateName(''))
    expect(result.current.params.name).toBe(defaultKeychainParams.name)
  })

  it('reset restaura defaults', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('width', 80))
    act(() => result.current.reset())
    expect(result.current.params).toEqual(defaultKeychainParams)
  })

  it('carrega fonte e gera geometria com base e texto', async () => {
    const { result } = renderHook(() => useKeychain())
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.geometry?.base).toBeDefined()
    expect(result.current.geometry?.text).toBeDefined()
  })

  it('trocar fontStyle não rebuilda geometria (mesmo objeto)', async () => {
    const { result } = renderHook(() => useKeychain())
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    act(() => result.current.updateParam('fontStyle', 'serif'))
    await waitFor(() => {
      expect(result.current.params.fontStyle).toBe('serif')
    })
    expect(result.current.geometry).toBeDefined()
  })

  it('trocar cor NÃO rebuilda geometria', async () => {
    const { result } = renderHook(() => useKeychain())
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    const prevGeometry = result.current.geometry
    act(() => result.current.updateParam('baseColor', '#ef4444'))
    expect(result.current.geometry).toBe(prevGeometry)
  })
})
