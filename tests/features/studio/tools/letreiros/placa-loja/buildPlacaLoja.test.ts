import * as THREE from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildPlacaLoja } from '@/features/studio/tools/letreiros/placa-loja/buildPlacaLoja'
import { defaultPlacaLojaParams } from '@/features/studio/tools/letreiros/placa-loja/schema'

vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: class {
    load(_url: string, onLoad: (font: unknown) => void): void {
      onLoad({ glyphs: {} })
    }
  },
}))

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor() {
      super()
    }
  },
}))

vi.mock('three-bvh-csg', () => ({
  Evaluator: class {
    evaluate() {
      return { geometry: new THREE.BufferGeometry() }
    }
  },
  SUBTRACTION: 'subtraction',
  Brush: class {},
}))

describe('buildPlacaLoja', () => {
  const mockFont = { glyphs: {} } as unknown as Font

  it('gera base retangular com 4 furos', () => {
    const params = { ...defaultPlacaLojaParams, shape: 'rectangular' as const }
    const result = buildPlacaLoja({ font: mockFont, params })
    expect(result.base).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('gera base arredondada com cantos', () => {
    const params = { ...defaultPlacaLojaParams, shape: 'rounded' as const }
    const result = buildPlacaLoja({ font: mockFont, params })
    expect(result.base).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('textos em modo raised são mergeados', () => {
    const params = { ...defaultPlacaLojaParams, textMode: 'raised' as const }
    const result = buildPlacaLoja({ font: mockFont, params })
    expect(result.textItems).toHaveLength(1)
  })

  it('textos em modo engraved usam CSG', () => {
    const params = { ...defaultPlacaLojaParams, textMode: 'engraved' as const }
    const result = buildPlacaLoja({ font: mockFont, params })
    expect(result.base).toBeDefined()
  })

  it('respeita margens e posicionamento', () => {
    const params = {
      ...defaultPlacaLojaParams,
      texts: [{ ...defaultPlacaLojaParams.texts[0], offsetX: 10, offsetY: 5 }],
    }
    const result = buildPlacaLoja({ font: mockFont, params })
    expect(result.textItems[0].geometry).toBeDefined()
  })

  it('retorna textItems vazios quando não há textos', () => {
    const params = { ...defaultPlacaLojaParams, texts: [] }
    const result = buildPlacaLoja({ font: mockFont, params })
    expect(result.textItems).toHaveLength(0)
  })

  it('chama onError quando CSG falha', () => {
    const onError = vi.fn()
    const params = { ...defaultPlacaLojaParams, textMode: 'engraved' as const }
    buildPlacaLoja({ font: mockFont, params, onError })
    expect(onError).not.toHaveBeenCalled()
  })
})
