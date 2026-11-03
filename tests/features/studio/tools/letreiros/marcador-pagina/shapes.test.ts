import {
  createBookmarkShape,
  buildBookmarkBase,
} from '@/features/studio/tools/letreiros/marcador-pagina/shapes'

const input = { length: 100, width: 50, thickness: 1 }

describe('createBookmarkShape', () => {
  it('cria contorno retangular sem furo, em pé', () => {
    const shape = createBookmarkShape(input)
    expect(shape.holes).toHaveLength(0)
    const points = shape.getPoints(4)
    expect(Math.min(...points.map((p) => p.x))).toBeCloseTo(-25)
    expect(Math.max(...points.map((p) => p.x))).toBeCloseTo(25)
    expect(Math.min(...points.map((p) => p.y))).toBeCloseTo(-50)
    expect(Math.max(...points.map((p) => p.y))).toBeCloseTo(50)
  })
})

describe('buildBookmarkBase', () => {
  it('extruda a base com largura no X, comprimento no Y e espessura no Z', () => {
    const geometry = buildBookmarkBase(input)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.max.x - box.min.x).toBeCloseTo(50)
    expect(box.max.y - box.min.y).toBeCloseTo(100)
    expect(box.max.z - box.min.z).toBeCloseTo(1)
  })

  it('desloca o contorno conforme centerX', () => {
    const shape = createBookmarkShape({ ...input, centerX: -25.2 })
    const points = shape.getPoints(4)
    expect(Math.min(...points.map((p) => p.x))).toBeCloseTo(-50.2)
    expect(Math.max(...points.map((p) => p.x))).toBeCloseTo(-0.2)
  })
})
