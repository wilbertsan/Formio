import * as THREE from 'three'
import { buildKeychain, type BuildKeychainInput } from '@/features/studio/tools/chaveiros/chaveiro/buildKeychain'
import { defaultKeychainParams, type KeychainParams } from '@/features/studio/tools/chaveiros/chaveiro/schema'

const fontStub = {
  glyphs: {},
  generateShapes: (text: string, size: number) => {
    const w = size * text.length * 0.6
    const h = size
    const shape = new THREE.Shape([
      new THREE.Vector2(-w / 2, -h / 2),
      new THREE.Vector2(w / 2, -h / 2),
      new THREE.Vector2(w / 2, h / 2),
      new THREE.Vector2(-w / 2, h / 2),
    ])
    return [shape]
  },
} as never

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text?: string, parameters?: { size: number; depth: number }) {
      super()
      if (!parameters) return
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
           -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

const { csgCalls } = vi.hoisted(() => {
  const csgCalls: Array<{ base: THREE.BufferGeometry; text: THREE.BufferGeometry }> = []
  return { csgCalls }
})

vi.mock('three-bvh-csg', () => ({
  Brush: class { constructor(public geometry: THREE.BufferGeometry) {} },
  Evaluator: class {
    evaluate(a: { geometry: THREE.BufferGeometry }, b: { geometry: THREE.BufferGeometry }) {
      csgCalls.push({ base: a.geometry, text: b.geometry })
      return { geometry: a.geometry.clone() }
    }
  },
  SUBTRACTION: 2,
}))

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: (geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    if (geos.length === 1) return geos[0].clone()
    const merged = new THREE.BufferGeometry()
    const posArrays: Float32Array[] = []
    const idxArrays: number[][] = []
    let vertexOffset = 0
    for (const geo of geos) {
      geo.computeBoundingBox()
      const pos = geo.getAttribute('position') as THREE.BufferAttribute
      const arr = new Float32Array(pos.array)
      posArrays.push(arr)
      const idx = geo.getIndex()
      if (idx) {
        const shifted = Array.from(idx.array).map((v: number) => v + vertexOffset)
        idxArrays.push(shifted)
      }
      vertexOffset += pos.count
    }
    const allPos = new Float32Array(posArrays.reduce((s, a) => s + a.length, 0))
    let offset = 0
    for (const a of posArrays) { allPos.set(a, offset); offset += a.length }
    merged.setAttribute('position', new THREE.BufferAttribute(allPos, 3))
    if (idxArrays.length > 0) {
      const allIdx = idxArrays.flat()
      merged.setIndex(allIdx)
    }
    return merged
  },
}))

function makeInput(overrides?: Partial<BuildKeychainInput>): BuildKeychainInput {
  return {
    font: fontStub,
    fonts: { bold: fontStub, normal: fontStub, serif: fontStub },
    params: { ...defaultKeychainParams, ...overrides?.params },
    onError: () => undefined,
  }
}

describe('buildKeychain', () => {
  it('retorna base e texto como BufferGeometry separados', () => {
    const result = buildKeychain(makeInput())
    expect(result.base).toBeDefined()
    expect(result.text).toBeDefined()
    expect(result.base.getAttribute('position')).toBeDefined()
    expect(result.text.getAttribute('position')).toBeDefined()
  })

  it('raised: texto acima da espessura da base', () => {
    const result = buildKeychain(makeInput())
    result.text.computeBoundingBox()
    expect(result.text.boundingBox?.max.z).toBeGreaterThan(defaultKeychainParams.thickness)
  })

  it('engraved: CSG subtrai do base', () => {
    csgCalls.length = 0
    const result = buildKeychain(makeInput({ params: { textMode: 'engraved' } as KeychainParams }))
    expect(result.base).toBeDefined()
    expect(csgCalls).toHaveLength(1)
  })

  it('engraved: verso da base intacto (gravação rasa)', () => {
    csgCalls.length = 0
    const result = buildKeychain(makeInput({ params: { textMode: 'engraved' } as KeychainParams }))
    result.base.computeBoundingBox()
    expect(result.base.boundingBox?.min.z).toBeGreaterThan(-0.3)
  })

  it('texto não excede largura disponível (width - 2 * borderWidth)', () => {
    const result = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        borderWidth: 10,
        width: 50,
        texts: [{ ...defaultKeychainParams.texts[0], width: 50 }],
      } as KeychainParams,
    }))
    result.text.computeBoundingBox()
    const textWidth = (result.text.boundingBox?.max.x ?? 0) - (result.text.boundingBox?.min.x ?? 0)
    expect(textWidth).toBeLessThanOrEqual(50 - 2 * 10 + 1)
  })

  it('textSize define a altura das letras', () => {
    const small = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        texts: [{ ...defaultKeychainParams.texts[0], height: 8 }],
      } as KeychainParams,
    }))
    const large = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        texts: [{ ...defaultKeychainParams.texts[0], height: 16 }],
      } as KeychainParams,
    }))
    small.text.computeBoundingBox()
    large.text.computeBoundingBox()
    const hSmall = (small.text.boundingBox?.max.y ?? 0) - (small.text.boundingBox?.min.y ?? 0)
    const hLarge = (large.text.boundingBox?.max.y ?? 0) - (large.text.boundingBox?.min.y ?? 0)
    expect(hLarge).toBeGreaterThan(hSmall)
  })

  it('textWidth limita a largura do texto sem exceder a área útil', () => {
    const result = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        width: 50,
        borderWidth: 4,
        texts: [{ ...defaultKeychainParams.texts[0], width: 60 }],
      } as KeychainParams,
    }))
    result.text.computeBoundingBox()
    const w = (result.text.boundingBox?.max.x ?? 0) - (result.text.boundingBox?.min.x ?? 0)
    expect(w).toBeLessThanOrEqual(50 - 2 * 4 + 1)
  })

  it('textWidth menor reduz a largura do texto', () => {
    const wide = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        texts: [{ ...defaultKeychainParams.texts[0], width: 40 }],
      } as KeychainParams,
    }))
    const narrow = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        texts: [{ ...defaultKeychainParams.texts[0], width: 12 }],
      } as KeychainParams,
    }))
    wide.text.computeBoundingBox()
    narrow.text.computeBoundingBox()
    const wWide = (wide.text.boundingBox?.max.x ?? 0) - (wide.text.boundingBox?.min.x ?? 0)
    const wNarrow = (narrow.text.boundingBox?.max.x ?? 0) - (narrow.text.boundingBox?.min.x ?? 0)
    expect(wWide).toBeGreaterThan(wNarrow)
  })

  it('usando borderWidth menor resulta em texto maior', () => {
    const result4 = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        borderWidth: 4,
        width: 28,
        texts: [{ ...defaultKeychainParams.texts[0], relief: 2 }],
      } as KeychainParams,
    }))
    const result10 = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        borderWidth: 10,
        width: 28,
        texts: [{ ...defaultKeychainParams.texts[0], relief: 2 }],
      } as KeychainParams,
    }))
    result4.text.computeBoundingBox()
    result10.text.computeBoundingBox()
    const w4 = (result4.text.boundingBox?.max.x ?? 0) - (result4.text.boundingBox?.min.x ?? 0)
    const w10 = (result10.text.boundingBox?.max.x ?? 0) - (result10.text.boundingBox?.min.x ?? 0)
    expect(w4).toBeGreaterThan(w10)
  })

  it('dois textos empilhados têm bboxes Y distintos', () => {
    const result = buildKeychain(makeInput({
      fonts: { bold: fontStub },
      params: {
        ...defaultKeychainParams,
        texts: [
          { ...defaultKeychainParams.texts[0], offsetY: 3 },
          { ...defaultKeychainParams.texts[0], id: 'text-2', content: 'Outro', offsetY: -3 },
        ],
      },
    }))
    result.text.computeBoundingBox()
    const textBB = result.text.boundingBox
    expect(textBB).not.toBeNull()
    const textHeight = (textBB!.max.y - textBB!.min.y)
    expect(textHeight).toBeGreaterThan(10)
  })

  it('offsetX move o texto', () => {
    const centered = buildKeychain(makeInput({
      fonts: { bold: fontStub },
      params: { ...defaultKeychainParams, texts: [{ ...defaultKeychainParams.texts[0], offsetX: 0 }] },
    }))
    const shifted = buildKeychain(makeInput({
      fonts: { bold: fontStub },
      params: { ...defaultKeychainParams, texts: [{ ...defaultKeychainParams.texts[0], offsetX: 10 }] },
    }))
    centered.text.computeBoundingBox()
    shifted.text.computeBoundingBox()
    expect(shifted.text.boundingBox?.max.x).toBeGreaterThan(centered.text.boundingBox!.max.x)
  })

  it('respeita os offsets do usuário no posicionamento do texto', () => {
    const result = buildKeychain(makeInput({
      fonts: { bold: fontStub },
      params: {
        ...defaultKeychainParams,
        texts: [{ ...defaultKeychainParams.texts[0], offsetX: 10, offsetY: -2 }],
      },
    }))
    result.text.computeBoundingBox()
    expect(result.text.boundingBox?.max.x).toBeGreaterThan(5)
  })

  it('height independente de width define dimensões da base', () => {
    const result = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        width: 60,
        height: 30,
      },
    }))
    result.base.computeBoundingBox()
    const bb = result.base.boundingBox!
    const w = bb.max.x - bb.min.x
    const h = bb.max.y - bb.min.y
    expect(w).toBeCloseTo(60, 0)
    expect(h).toBeCloseTo(30, 0)
  })

  it('gravado subtrai todos os textos com um único CSG', () => {
    csgCalls.length = 0
    buildKeychain(makeInput({
      fonts: { bold: fontStub },
      params: {
        ...defaultKeychainParams,
        textMode: 'engraved',
        texts: [
          { ...defaultKeychainParams.texts[0], offsetY: 3 },
          { ...defaultKeychainParams.texts[0], id: 't2', content: 'Dois', offsetY: -3 },
        ],
      },
    }))
    expect(csgCalls).toHaveLength(1)
  })

  it('baseShape name gera contorno e preenchimento', () => {
    const result = buildKeychain(makeInput({
      params: {
        ...defaultKeychainParams,
        baseShape: 'name',
        texts: [{ ...defaultKeychainParams.texts[0], content: 'A' }],
      },
    }))
    
    expect(result.base).toBeDefined()
    expect(result.text).toBeDefined()
    expect(result.pieceBB).toBeDefined()
    expect(result.pieceBB.minX).toBeDefined()
  })
})
