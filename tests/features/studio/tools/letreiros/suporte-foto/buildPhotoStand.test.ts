import * as THREE from 'three'
import { buildPhotoStand, type BuildPhotoStandInput } from '@/features/studio/tools/letreiros/suporte-foto/buildPhotoStand'
import {
  CONTENT_DEPTH,
  defaultPhotoStandParams,
  type PhotoStandContent,
  type PhotoStandParams,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'
import { getEffectiveDepth } from '@/features/studio/tools/letreiros/suporte-foto/shapes'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

const SVG_RECT =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>'

const fontStub = { glyphs: {} } as never

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

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: (geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    if (geos.length === 1) return geos[0].clone()
    const merged = new THREE.BufferGeometry()
    const posArrays: Float32Array[] = []
    const idxArrays: number[][] = []
    let vertexOffset = 0
    for (const geo of geos) {
      const pos = geo.getAttribute('position') as THREE.BufferAttribute
      posArrays.push(new Float32Array(pos.array))
      const idx = geo.getIndex()
      if (idx) idxArrays.push(Array.from(idx.array).map((value) => value + vertexOffset))
      vertexOffset += pos.count
    }
    const allPos = new Float32Array(posArrays.reduce((sum, array) => sum + array.length, 0))
    let offset = 0
    for (const array of posArrays) {
      allPos.set(array, offset)
      offset += array.length
    }
    merged.setAttribute('position', new THREE.BufferAttribute(allPos, 3))
    if (idxArrays.length > 0) merged.setIndex(idxArrays.flat())
    return merged
  },
}))

function makeInput(
  params: Partial<PhotoStandParams> = {},
  extra: Partial<BuildPhotoStandInput> = {},
): BuildPhotoStandInput {
  return {
    fonts: { bold: fontStub, normal: fontStub, serif: fontStub },
    params: { ...defaultPhotoStandParams, ...params },
    onError: () => undefined,
    ...extra,
  }
}

function boundsOf(geometry: THREE.BufferGeometry | null): THREE.Box3 {
  if (!geometry) throw new Error('geometria ausente')
  geometry.computeBoundingBox()
  return geometry.boundingBox!
}

function textItem(overrides: Partial<PhotoStandContent> = {}): PhotoStandContent {
  return {
    id: 'content-1',
    kind: 'text',
    content: 'Nome',
    fontStyle: 'bold',
    fontSize: 8,
    offsetX: 0,
    offsetY: 0,
    ...overrides,
  } as PhotoStandContent
}

describe('buildPhotoStand', () => {
  it('gera base com largura, altura e profundidade corretas', () => {
    const result = buildPhotoStand(makeInput())
    const bb = boundsOf(result.base)
    expect(bb.max.x - bb.min.x).toBeCloseTo(120, 0)
    expect(bb.max.y - bb.min.y).toBeCloseTo(25, 0)
    expect(bb.max.z - bb.min.z).toBeCloseTo(40, 1)
    expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(0, 5)
    expect((bb.min.y + bb.max.y) / 2).toBeCloseTo(0, 5)
  })

  it('acompanha foto, margem, faixa e espessura', () => {
    const result = buildPhotoStand(makeInput({
      photoSize: '15x20',
      sideMargin: 5,
      bandHeight: 40,
      thickness: 4,
      depth: 50,
    }))
    const bb = boundsOf(result.base)
    expect(bb.max.x - bb.min.x).toBeCloseTo(160, 0)
    expect(bb.max.y - bb.min.y).toBeCloseTo(40, 0)
    expect(bb.max.z - bb.min.z).toBeCloseTo(50, 1)
  })

  it('usa a profundidade efetiva quando a informada é pequena', () => {
    const params = {
      ...defaultPhotoStandParams,
      depth: 30,
      bandHeight: 40,
      thickness: 4,
      angle: 60,
    }
    const result = buildPhotoStand(makeInput(params))
    const bb = boundsOf(result.base)
    expect(bb.max.z - bb.min.z).toBeCloseTo(getEffectiveDepth(params), 3)
  })

  it('muda a base quando o ângulo muda', () => {
    const a = buildPhotoStand(makeInput({ angle: 65 })).base
    const b = buildPhotoStand(makeInput({ angle: 85 })).base
    expect(Array.from(a.getAttribute('position').array))
      .not.toEqual(Array.from(b.getAttribute('position').array))
  })

  it('sem fontes gera base e nenhum conteúdo', () => {
    const result = buildPhotoStand(makeInput({}, { fonts: {} }))
    expect(result.content).toBeNull()
    expect(result.contentItems).toHaveLength(1)
    expect(result.contentItems[0].halfWidth).toBe(0)
  })

  it('gera conteúdo de texto com relevo fixo de 1 mm sobre a face frontal', () => {
    const result = buildPhotoStand(makeInput())
    expect(result.content).not.toBeNull()
    const bb = boundsOf(result.content)
    expect(bb.min.z).toBeCloseTo(20 - 0.01, 2)
    expect(bb.max.z - bb.min.z).toBeCloseTo(CONTENT_DEPTH, 1)
    expect(result.contentItems[0].halfWidth).toBeGreaterThan(0)
    expect(result.contentItems[0].halfHeight).toBeGreaterThan(0)
  })

  it('aplica offset X e Y no conteúdo', () => {
    const result = buildPhotoStand(makeInput({
      contents: [textItem({ offsetX: 10, offsetY: -5 })],
    }))
    const bb = boundsOf(result.content)
    expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(10, 1)
    expect((bb.min.y + bb.max.y) / 2).toBeCloseTo(-5, 1)
  })

  it('clampa o offset à área útil', () => {
    const result = buildPhotoStand(makeInput({
      contents: [textItem({ fontSize: 4, offsetX: 100 })],
    }))
    const bb = boundsOf(result.content)
    expect(bb.max.x).toBeLessThanOrEqual(57.01)
  })

  it('gera conteúdo de ícone a partir do SVG parseado', () => {
    const icon: PhotoStandContent = {
      id: 'icon-1',
      kind: 'icon',
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    const parsed = parseSvg(SVG_RECT)
    const result = buildPhotoStand(makeInput(
      { contents: [icon] },
      { parsedSvgs: { 'icon-1': parsed } },
    ))
    expect(result.content).not.toBeNull()
    expect(result.contentItems[0].halfWidth).toBeGreaterThan(0)
    const bb = boundsOf(result.content)
    expect(bb.max.z - bb.min.z).toBeCloseTo(CONTENT_DEPTH, 2)
  })

  it('ignora texto vazio', () => {
    const result = buildPhotoStand(makeInput({ contents: [textItem({ content: '' })] }))
    expect(result.content).toBeNull()
    expect(result.contentItems[0].halfWidth).toBe(0)
  })
})
