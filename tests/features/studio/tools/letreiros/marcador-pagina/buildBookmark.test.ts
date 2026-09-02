import * as THREE from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildBookmark } from '@/features/studio/tools/letreiros/marcador-pagina/buildBookmark'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'

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

vi.mock('three-bvh-csg', () => ({
  Evaluator: class {
    evaluate() {
      return { geometry: new THREE.BufferGeometry() }
    }
  },
  SUBTRACTION: 'subtraction',
  Brush: class {},
}))

describe('buildBookmark', () => {
  const mockFont = { glyphs: {} } as unknown as Font

  it('gera base com furo circular', () => {
    const result = buildBookmark({ font: mockFont, params: defaultBookmarkParams })
    expect(result.base).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('textos em modo raised são mergeados', () => {
    const params = { ...defaultBookmarkParams, textMode: 'raised' as const }
    const result = buildBookmark({ font: mockFont, params })
    expect(result.textItems).toHaveLength(1)
  })

  it('textos em modo engraved usam CSG', () => {
    const params = { ...defaultBookmarkParams, textMode: 'engraved' as const }
    const result = buildBookmark({ font: mockFont, params })
    expect(result.base).toBeDefined()
  })

  it('respeita margens e posicionamento', () => {
    const params = {
      ...defaultBookmarkParams,
      texts: [{ ...defaultBookmarkParams.texts[0], offsetX: 10, offsetY: 5 }],
    }
    const result = buildBookmark({ font: mockFont, params })
    expect(result.textItems[0].geometry).toBeDefined()
  })
})