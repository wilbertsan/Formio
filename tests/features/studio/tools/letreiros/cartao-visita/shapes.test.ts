import { createCardShape } from '@/features/studio/tools/letreiros/cartao-visita/shapes'

function bounds(shape: ReturnType<typeof createCardShape>) {
  const points = shape.getPoints(64)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    points,
  }
}

describe('createCardShape', () => {
  it('respeita as dimensões externas', () => {
    const result = bounds(createCardShape(85, 55, 3))
    expect(result.width).toBeCloseTo(85, 1)
    expect(result.height).toBeCloseTo(55, 1)
  })

  it('gera mais pontos com cantos arredondados', () => {
    const sharp = createCardShape(85, 55, 0).getPoints(8)
    const rounded = createCardShape(85, 55, 3).getPoints(8)
    expect(rounded.length).toBeGreaterThan(sharp.length)
  })

  it('clampa o raio à metade do menor lado', () => {
    const result = bounds(createCardShape(50, 20, 100))
    expect(result.width).toBeCloseTo(50, 1)
    expect(result.height).toBeCloseTo(20, 1)
  })
})
