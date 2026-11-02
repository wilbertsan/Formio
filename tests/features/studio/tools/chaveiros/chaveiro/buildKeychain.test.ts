import * as THREE from 'three'
import {
  buildKeychain,
  type BuildKeychainInput,
} from '@/features/studio/tools/chaveiros/chaveiro/buildKeychain'
import {
  defaultKeychainParams,
  type IconContent,
  type KeychainParams,
  type TextContent,
} from '@/features/studio/tools/chaveiros/chaveiro/schema'

const SVG_RECT =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>'

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

const textItem: TextContent = {
  id: 'content-1',
  kind: 'text',
  content: 'Meu nome',
  fontStyle: 'bold',
  fontSize: 10,
  offsetX: 0,
  offsetY: 0,
}

const iconItem: IconContent = {
  id: 'i1',
  kind: 'icon',
  svgIcon: SVG_RECT,
  iconScale: 1,
  iconLineWidth: 0.3,
  offsetX: 0,
  offsetY: 0,
}

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

const { csgCalls, csgState } = vi.hoisted(() => {
  const csgCalls: Array<{ base: THREE.BufferGeometry; text: THREE.BufferGeometry }> = []
  const csgState = { shouldThrow: false }
  return { csgCalls, csgState }
})

vi.mock('three-bvh-csg', () => ({
  Brush: class { constructor(public geometry: THREE.BufferGeometry) {} },
  Evaluator: class {
    evaluate(a: { geometry: THREE.BufferGeometry }, b: { geometry: THREE.BufferGeometry }) {
      if (csgState.shouldThrow) throw new Error('CSG falhou')
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

function makeInput(
  params: Partial<KeychainParams> = {},
  extra: Partial<BuildKeychainInput> = {},
): BuildKeychainInput {
  return {
    font: fontStub,
    fonts: { bold: fontStub, normal: fontStub, serif: fontStub },
    params: { ...defaultKeychainParams, ...params },
    onError: () => undefined,
    ...extra,
  }
}

function boundsOf(geometry: THREE.BufferGeometry | null): THREE.Box3 {
  if (!geometry) throw new Error('geometria ausente')
  geometry.computeBoundingBox()
  if (!geometry.boundingBox) throw new Error('bounding box ausente')
  return geometry.boundingBox
}

function size(geometry: THREE.BufferGeometry | null): { width: number; height: number } {
  const bb = boundsOf(geometry)
  return { width: bb.max.x - bb.min.x, height: bb.max.y - bb.min.y }
}

describe('buildKeychain', () => {
  beforeEach(() => {
    csgCalls.length = 0
    csgState.shouldThrow = false
  })

  it('retorna base, content e contentItems', () => {
    const result = buildKeychain(makeInput())
    expect(result.base).toBeDefined()
    expect(result.content).not.toBeNull()
    expect(result.contentItems).toHaveLength(1)
    expect(result.content!.getAttribute('position')).toBeDefined()
  })

  it('raised: content acima da espessura da base', () => {
    const result = buildKeychain(makeInput())
    expect(boundsOf(result.content).max.z).toBeGreaterThan(defaultKeychainParams.thickness)
  })

  it('engraved: exatamente um CSG com brush na faixa gravada', () => {
    csgCalls.length = 0
    const result = buildKeychain(makeInput({ textMode: 'engraved' }))
    expect(result.base).toBeDefined()
    expect(csgCalls).toHaveLength(1)

    const surfaceTop = defaultKeychainParams.thickness + 0.2
    const bb = boundsOf(csgCalls[0].text)
    const lower = surfaceTop - defaultKeychainParams.reliefDepth - 0.21
    const upper = surfaceTop + 0.21
    expect(bb.min.z).toBeGreaterThanOrEqual(lower)
    expect(bb.max.z).toBeLessThanOrEqual(upper)
  })

  it('raised regular: fundo do content no topo biselado', () => {
    const result = buildKeychain(makeInput())
    expect(boundsOf(result.content).min.z).toBeCloseTo(
      defaultKeychainParams.thickness + 0.19,
      1,
    )
  })

  it('auto-fit: content cabe em width - 2*borderWidth', () => {
    const result = buildKeychain(makeInput({ width: 50, borderWidth: 10 }))
    expect(size(result.content).width).toBeLessThanOrEqual(50 - 2 * 10 + 1)
  })

  it('fontSize 15 gera content mais alto que 6', () => {
    const small = buildKeychain(makeInput({
      contents: [{ ...textItem, fontSize: 6 }],
    }))
    const large = buildKeychain(makeInput({
      contents: [{ ...textItem, fontSize: 15 }],
    }))
    expect(size(large.content).height).toBeGreaterThan(size(small.content).height)
  })

  it('ícone SVG gera content e contentItems', () => {
    const result = buildKeychain(makeInput({ contents: [iconItem] }))
    expect(result.content).not.toBeNull()
    expect(result.contentItems[0].halfWidth).toBeGreaterThan(0)
  })

  it('ícone sem SVG gera content nulo e base válida', () => {
    const result = buildKeychain(makeInput({ contents: [{ ...iconItem, svgIcon: null }] }))
    expect(result.content).toBeNull()
    expect(result.base).toBeDefined()
    expect(result.contentItems[0].geometry).toBeNull()
  })

  it('texto vazio gera base válida e content nulo', () => {
    const result = buildKeychain(makeInput({ contents: [{ ...textItem, content: '' }] }))
    expect(result.base).toBeDefined()
    expect(result.content).toBeNull()
    expect(result.contentItems[0].geometry).toBeNull()
  })

  it('texto vazio não exige fonte no formato regular nem no nome', () => {
    const regular = buildKeychain(makeInput(
      { contents: [{ ...textItem, content: '' }] },
      { font: undefined, fonts: {} },
    ))
    expect(regular.base).toBeDefined()
    expect(regular.content).toBeNull()

    const name = buildKeychain(makeInput(
      { baseShape: 'name', contents: [{ ...textItem, content: '' }] },
      { font: undefined, fonts: {} },
    ))
    expect(name.base).toBeDefined()
    expect(name.content).toBeNull()
  })

  it('offsetX move o content', () => {
    const centered = buildKeychain(makeInput({
      width: 80,
      contents: [{ ...textItem, fontSize: 6, offsetX: 0 }],
    }))
    const shifted = buildKeychain(makeInput({
      width: 80,
      contents: [{ ...textItem, fontSize: 6, offsetX: 10 }],
    }))
    expect(boundsOf(shifted.content).max.x).toBeGreaterThan(boundsOf(centered.content).max.x)
  })

  it('dois contents com offsetY distintos ocupam Y > 10', () => {
    const result = buildKeychain(makeInput({
      contents: [
        { ...textItem, offsetY: 3 },
        { ...textItem, id: 'c2', content: 'Outro', offsetY: -3 },
      ],
    }))
    expect(size(result.content).height).toBeGreaterThan(10)
  })

  it('base retangular tem as dimensões dos parâmetros', () => {
    const result = buildKeychain(makeInput({ width: 60, height: 30 }))
    const bb = boundsOf(result.base)
    expect(bb.max.x - bb.min.x).toBeCloseTo(60, 0)
    expect(bb.max.y - bb.min.y).toBeCloseTo(30, 0)
  })

  it('engraved com dois contents usa um único CSG', () => {
    csgCalls.length = 0
    buildKeychain(makeInput({
      textMode: 'engraved',
      contents: [
        { ...textItem, offsetY: 3 },
        { ...textItem, id: 'c2', content: 'Dois', offsetY: -3 },
      ],
    }))
    expect(csgCalls).toHaveLength(1)
  })

  it('name: somente texto gera base, content, pieceBB e hole', () => {
    const result = buildKeychain(makeInput({
      baseShape: 'name',
      contents: [{ ...textItem, content: 'A' }],
    }))
    expect(result.base).toBeDefined()
    expect(result.content).not.toBeNull()
    expect(result.pieceBB.minX).toBeLessThan(result.pieceBB.maxX)
    expect(result.hole.radius).toBeGreaterThan(0)
  })

  it('name: texto + ícone aumenta a área unida do content', () => {
    const textOnly = buildKeychain(makeInput({
      baseShape: 'name',
      contents: [{ ...textItem, content: 'A' }],
    }))
    const withIcon = buildKeychain(makeInput({
      baseShape: 'name',
      contents: [
        { ...textItem, content: 'A' },
        { ...iconItem, id: 'i2' },
      ],
    }))

    const textSize = size(textOnly.content)
    const iconSize = size(withIcon.content)
    expect(iconSize.width).toBeGreaterThan(textSize.width)
    expect(iconSize.width * iconSize.height).toBeGreaterThan(textSize.width * textSize.height)
    expect(withIcon.base).toBeDefined()
  })

  it('name: furo da argola é vazado na base e no content', () => {
    const result = buildKeychain(makeInput({
      baseShape: 'name',
      contents: [{ ...textItem, content: 'A' }],
    }))

    expect(result.content).not.toBeNull()
    const baseMesh = new THREE.Mesh(result.base)
    const contentMesh = new THREE.Mesh(result.content!)
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(result.hole.x, result.hole.y, 100),
      new THREE.Vector3(0, 0, -1),
    )
    expect(raycaster.intersectObject(baseMesh)).toHaveLength(0)
    expect(raycaster.intersectObject(contentMesh)).toHaveLength(0)
  })

  it('name: com embedding zero o centro do furo fica fora da bbox do content', () => {
    const result = buildKeychain(makeInput({
      baseShape: 'name',
      ringEmbedding: 0,
      contents: [{ ...textItem, content: 'A' }],
    }))

    const contentBB = boundsOf(result.content)
    const outside =
      result.hole.x < contentBB.min.x ||
      result.hole.x > contentBB.max.x ||
      result.hole.y < contentBB.min.y ||
      result.hole.y > contentBB.max.y
    expect(outside).toBe(true)
  })

  it('name: ringPosition bottom posiciona o furo abaixo do centro', () => {
    const result = buildKeychain(makeInput({
      baseShape: 'name',
      ringPosition: 'bottom',
      contents: [{ ...textItem, content: 'A' }],
    }))
    expect(result.hole.y).toBeLessThan(0)
  })

  it('name: engraved usa um CSG com brush na faixa gravada', () => {
    const result = buildKeychain(makeInput({
      baseShape: 'name',
      textMode: 'engraved',
      contents: [{ ...textItem, content: 'A' }],
    }))

    expect(result.base).toBeDefined()
    expect(csgCalls).toHaveLength(1)
    const bb = boundsOf(csgCalls[0].text)
    const lower = defaultKeychainParams.thickness - defaultKeychainParams.reliefDepth - 0.21
    const upper = defaultKeychainParams.thickness + 0.21
    expect(bb.min.z).toBeGreaterThanOrEqual(lower)
    expect(bb.max.z).toBeLessThanOrEqual(upper)
    expect(bb.max.z).toBeCloseTo(defaultKeychainParams.thickness + 0.2, 1)
  })

  it('name: somente ícone funciona sem fonte', () => {
    const result = buildKeychain(
      makeInput({ baseShape: 'name', contents: [iconItem] }, { font: undefined, fonts: {} }),
    )
    expect(result.content).not.toBeNull()
    expect(result.base).toBeDefined()
  })

  it('name: raio do furo igual a ringInnerDiameter / 2', () => {
    const result = buildKeychain(makeInput({
      baseShape: 'name',
      ringInnerDiameter: 8,
      contents: [{ ...textItem, content: 'A' }],
    }))
    expect(result.hole.radius).toBeCloseTo(4)
  })

  it('engraved: fallback recoloca o content em relevo e avisa', () => {
    csgState.shouldThrow = true
    const onError = vi.fn()
    const result = buildKeychain(makeInput({ textMode: 'engraved' }, { onError }))

    expect(onError).toHaveBeenCalledWith('Falha na gravação; usando relevo')
    expect(boundsOf(result.content).max.z).toBeGreaterThan(defaultKeychainParams.thickness)
  })

  it('fontes mistas normal e bold constroem sem lançar', () => {
    expect(() => buildKeychain(makeInput(
      {
        contents: [
          { ...textItem, id: 'normal', fontStyle: 'normal' },
          { ...textItem, id: 'bold', content: 'Outro', fontStyle: 'bold', offsetY: -3 },
        ],
      },
      { fonts: { normal: fontStub, bold: fontStub } },
    ))).not.toThrow()
  })

  it('name: somente ícone sem SVG avisa e ainda gera base', () => {
    const onError = vi.fn()
    const result = buildKeychain(makeInput(
      { baseShape: 'name', contents: [{ ...iconItem, svgIcon: null }] },
      { onError },
    ))

    expect(onError).toHaveBeenCalled()
    expect(result.base).toBeDefined()
  })
})
