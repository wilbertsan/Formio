import * as THREE from 'three'
import { buildBookmark } from '@/features/studio/tools/letreiros/marcador-pagina/buildBookmark'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(text?: string, parameters?: { size: number; depth: number }) {
      super()
      if (!parameters) return
      const w = parameters.size * (text?.length ?? 1) * 0.6
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
      // TextGeometry real é não indexado; o mock também precisa ser.
      this.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(8 * 3).fill(0), 3))
      this.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(8 * 2).fill(0), 2))
    }
  },
}))

const font = {
  glyphs: {},
  generateShapes: () => [],
} as never

describe('buildBookmark', () => {
  it('gera base com contorno retangular de 50 x 100 mm', () => {
    const result = buildBookmark({ font, params: defaultBookmarkParams })
    result.base.computeBoundingBox()
    const box = result.base.boundingBox!
    expect(box.max.x - box.min.x).toBeCloseTo(50)
    expect(box.max.y - box.min.y).toBeCloseTo(100)
  })

  it('deixa o texto em pé, formando um L com a base', () => {
    const result = buildBookmark({ font, params: defaultBookmarkParams })
    result.text.computeBoundingBox()
    const box = result.text.boundingBox!

    expect(box.max.x - box.min.x).toBeCloseTo(4.5)
    expect(box.max.y - box.min.y).toBeCloseTo(40)
    expect(box.max.z - box.min.z).toBeCloseTo(10, 3)
    expect(box.min.z).toBeCloseTo(-4.5, 3)
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0.5)
  })

  it('centraliza o nome ao longo do comprimento', () => {
    const result = buildBookmark({ font, params: defaultBookmarkParams })
    result.text.computeBoundingBox()
    const box = result.text.boundingBox!

    expect((box.min.y + box.max.y) / 2).toBeCloseTo(0)
    expect(box.min.y).toBeCloseTo(-20)
    expect(box.max.y).toBeCloseTo(20)
  })

  it('separa a base na traseira do texto com folga de 0,2mm', () => {
    const result = buildBookmark({ font, params: defaultBookmarkParams })
    result.base.computeBoundingBox()
    result.text.computeBoundingBox()
    const baseBox = result.base.boundingBox!
    const textBox = result.text.boundingBox!

    expect(baseBox.max.x - baseBox.min.x).toBeCloseTo(50)
    expect(baseBox.max.x).toBeCloseTo(-0.2)
    expect(textBox.min.x).toBeCloseTo(-1.5)
    expect(baseBox.max.x - textBox.min.x).toBeCloseTo(1.3)
  })

  it('reduz textos longos para a largura alvo', () => {
    const params = {
      ...defaultBookmarkParams,
      text: { ...defaultBookmarkParams.text, content: 'a'.repeat(200), width: 40 },
    }
    const result = buildBookmark({ font, params })
    result.text.computeBoundingBox()
    const box = result.text.boundingBox!
    expect(box.max.y - box.min.y).toBeCloseTo(40)
  })

  it('não devolve itens de texto (texto único)', () => {
    const result = buildBookmark({ font, params: defaultBookmarkParams })
    expect('textItems' in result).toBe(false)
    expect(result.base).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('sem textura, o topo da base fica na espessura', () => {
    const result = buildBookmark({ font, params: defaultBookmarkParams })
    result.base.computeBoundingBox()
    expect(result.base.boundingBox!.max.z).toBeCloseTo(1)
  })

  it('aplica textura em relevo acima da base', () => {
    const params = {
      ...defaultBookmarkParams,
      pattern: { ...defaultBookmarkParams.pattern, type: 'triangles' as const, depth: 1 },
    }
    const result = buildBookmark({ font, params })
    result.base.computeBoundingBox()
    expect(result.base.boundingBox!.max.z).toBeGreaterThan(params.thickness)
  })

  it('aplica textura a partir de um SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
    const params = {
      ...defaultBookmarkParams,
      pattern: { ...defaultBookmarkParams.pattern, type: 'svg' as const, svg, depth: 1 },
    }
    const result = buildBookmark({ font, params, parsedSvg: parseSvg(svg) })
    result.base.computeBoundingBox()
    expect(result.base.boundingBox!.max.z).toBeGreaterThan(params.thickness)
  })
})
