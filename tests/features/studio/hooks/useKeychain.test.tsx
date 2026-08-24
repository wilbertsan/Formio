import * as THREE from 'three'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useKeychain } from '@/features/studio/hooks/useKeychain'
import { defaultKeychainParams } from '@/features/studio/keychain/schema'

vi.mock('@/features/studio/keychain/buildKeychain', () => ({
  buildKeychain: vi.fn(() => ({ base: new THREE.BufferGeometry(), text: new THREE.BufferGeometry() })),
}))

vi.mock('@/assets/fonts/helvetiker_bold.typeface.json?url', () => ({
  default: '/mock-font.json',
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

describe('useKeychain', () => {
  it('inicia com params padrão', () => {
    const { result } = renderHook(() => useKeychain())
    expect(result.current.params).toEqual(defaultKeychainParams)
  })

  it('updateParam atualiza parâmetro numérico com clamp', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('width', 90))
    expect(result.current.params.width).toBe(80)
  })

  it('updateName atualiza o nome', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateName('Ana'))
    expect(result.current.params.name).toBe('Ana')
  })

  it('updateName ignora nomes inválidos', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateName(''))
    expect(result.current.params.name).toBe(defaultKeychainParams.name)
  })

  it('reset restaura padrões', () => {
    const { result } = renderHook(() => useKeychain())
    act(() => result.current.updateParam('width', 30))
    act(() => result.current.reset())
    expect(result.current.params).toEqual(defaultKeychainParams)
  })

  it('carrega fonte e gera geometria', async () => {
    const { result } = renderHook(() => useKeychain())
    await waitFor(() => expect(result.current.keychainResult).not.toBeNull())
    expect(result.current.fontError).toBe(false)
  })
})
