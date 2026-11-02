import { Box2, Shape, Path, Vector2 } from 'three'
import { clipperPathsToShapes, createNameOutline, expandShape, shapeToClipperPaths, unionShapes } from '@/features/studio/tools/chaveiros/chaveiro/nameOutline'

describe('createNameOutline', () => {
  it('gera outline com espessura e bounding box da união', () => {
    const shape = new Shape([
      new Vector2(-5, -5), new Vector2(5, -5),
      new Vector2(5, 5), new Vector2(-5, 5),
    ])
    const result = createNameOutline({ shapes: [shape], borderWidth: 4, thickness: 3 })
    result.outline.computeBoundingBox()
    expect(result.outline.boundingBox!.max.z).toBeCloseTo(3)
    expect(result.boundingBox.minX).toBeCloseTo(-9)
    expect(result.boundingBox.maxX).toBeCloseTo(9)
    expect(result.boundingBox.minY).toBeCloseTo(-9)
    expect(result.boundingBox.maxY).toBeCloseTo(9)
  })

  it('une múltiplos shapes antes de dilatar', () => {
    const a = new Shape([
      new Vector2(-10, -5), new Vector2(-2, -5),
      new Vector2(-2, 5), new Vector2(-10, 5),
    ])
    const b = new Shape([
      new Vector2(2, -5), new Vector2(10, -5),
      new Vector2(10, 5), new Vector2(2, 5),
    ])
    const result = createNameOutline({ shapes: [a, b], borderWidth: 2, thickness: 3 })
    result.outline.computeBoundingBox()
    expect(result.boundingBox.minX).toBeCloseTo(-12)
    expect(result.boundingBox.maxX).toBeCloseTo(12)
    expect(result.outline.boundingBox!.min.x).toBeCloseTo(-12)
    expect(result.outline.boundingBox!.max.x).toBeCloseTo(12)
    expect(result.boundingBox.maxX - result.boundingBox.minX).toBeCloseTo(24)
  })

  it('gera geometria cobrindo múltiplas regiões disjuntas', () => {
    const a = new Shape([
      new Vector2(-10, -5), new Vector2(-2, -5),
      new Vector2(-2, 5), new Vector2(-10, 5),
    ])
    const b = new Shape([
      new Vector2(2, -5), new Vector2(10, -5),
      new Vector2(10, 5), new Vector2(2, 5),
    ])
    const single = createNameOutline({ shapes: [a], borderWidth: 2, thickness: 3 })
    const multiple = createNameOutline({ shapes: [a, b], borderWidth: 2, thickness: 3 })

    expect(multiple.outline.getAttribute('position').count).toBeGreaterThan(single.outline.getAttribute('position').count)
  })

  it('aplica offset de borderWidth em milímetros', () => {
    const shape = new Shape([
      new Vector2(-5, -5), new Vector2(5, -5),
      new Vector2(5, 5), new Vector2(-5, 5),
    ])
    const result = createNameOutline({ shapes: [shape], borderWidth: 4, thickness: 3 })
    result.outline.computeBoundingBox()
    const width = result.outline.boundingBox!.max.x - result.outline.boundingBox!.min.x
    expect(width).toBeCloseTo(18, 1)
  })

  it('lida com lista vazia', () => {
    const result = createNameOutline({ shapes: [], borderWidth: 4, thickness: 3 })
    expect(result.outline).toBeDefined()
    expect(result.boundingBox).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 })
    expect(result.outline.getAttribute('position')?.count ?? 0).toBe(0)
  })

  it('converte Shape do Three.js para paths do Clipper', () => {
    const shape = new Shape([
      new Vector2(0, 0),
      new Vector2(10, 0),
      new Vector2(10, 10),
      new Vector2(0, 10),
    ])

    const paths = shapeToClipperPaths(shape)

    expect(paths).toHaveLength(1)
    expect(paths[0]).toHaveLength(4)
    expect(paths[0][0]).toEqual({ X: 0, Y: 0 })
  })

  it('preserva furos na conversão', () => {
    const outer = new Shape([
      new Vector2(0, 0),
      new Vector2(20, 0),
      new Vector2(20, 20),
      new Vector2(0, 20),
    ])
    const hole = new Path([
      new Vector2(5, 5),
      new Vector2(15, 5),
      new Vector2(15, 15),
      new Vector2(5, 15),
    ])
    outer.holes.push(hole)

    const paths = shapeToClipperPaths(outer)

    expect(paths).toHaveLength(2) // outer + 1 hole
  })

  it('une dois shapes em um só', () => {
    const shape1 = new Shape([
      new Vector2(0, 0),
      new Vector2(10, 0),
      new Vector2(10, 10),
      new Vector2(0, 10),
    ])
    const shape2 = new Shape([
      new Vector2(8, 0),
      new Vector2(18, 0),
      new Vector2(18, 10),
      new Vector2(8, 10),
    ])

    const union = unionShapes([shape1, shape2])

    const box = new Box2().setFromPoints(union.flatMap(s => s.getPoints()))
    const width = box.max.x - box.min.x

    // Union of overlapping shapes should span from 0 to 18
    expect(width).toBeCloseTo(18, 0)
  })

  it('une shapes com furos corretamente', () => {
    const shape1 = new Shape([
      new Vector2(0, 0),
      new Vector2(20, 0),
      new Vector2(20, 20),
      new Vector2(0, 20),
    ])
    shape1.holes.push(new Path([
      new Vector2(5, 5),
      new Vector2(15, 5),
      new Vector2(15, 15),
      new Vector2(5, 15),
    ]))

    const union = unionShapes([shape1])

    // Should have one outer contour and one hole
    expect(union).toHaveLength(1)
    expect(union[0].getPoints().length).toBeGreaterThan(0)
    expect(union[0].holes).toHaveLength(1)
  })

  it('associa furo aninhado ao contorno externo correto', () => {
    const toPath = (points: Array<[number, number]>) =>
      points.map(([x, y]) => ({ X: x * 1000, Y: y * 1000 }))

    const shapes = clipperPathsToShapes([
      toPath([[0, 0], [100, 0], [100, 100], [0, 100]]),
      toPath([[20, 20], [20, 80], [80, 80], [80, 20]]),
      toPath([[40, 40], [60, 40], [60, 60], [40, 60]]),
    ])

    const outer = shapes.find(shape => {
      const box = new Box2().setFromPoints(shape.getPoints())
      return box.min.x === 0 && box.max.x === 100
    })
    const island = shapes.find(shape => {
      const box = new Box2().setFromPoints(shape.getPoints())
      return box.min.x === 40 && box.max.x === 60
    })

    expect(outer).toBeDefined()
    expect(outer!.holes).toHaveLength(1)
    expect(island).toBeDefined()
    expect(island!.holes).toHaveLength(0)
  })

  it('expande shape usando offset externo', () => {
    const shape = new Shape([
      new Vector2(0, 0),
      new Vector2(10, 0),
      new Vector2(10, 10),
      new Vector2(0, 10),
    ])

    const expanded = expandShape(shape, 2)

    const box = new Box2().setFromPoints(expanded.flatMap(s => s.getPoints()))
    const expandedWidth = box.max.x - box.min.x
    const originalWidth = 10

    expect(expandedWidth).toBeGreaterThan(originalWidth)
  })

  it('offset externo de 4mm em quadrado de 10mm tem largura 18mm', () => {
    const shape = new Shape([
      new Vector2(0, 0),
      new Vector2(10, 0),
      new Vector2(10, 10),
      new Vector2(0, 10),
    ])

    const expanded = expandShape(shape, 4)

    const box = new Box2().setFromPoints(expanded.flatMap(s => s.getPoints()))
    expect(box.max.x - box.min.x).toBeCloseTo(18, 1)
  })

  it('offset externo mantém forma aproximada', () => {
    const shape = new Shape([
      new Vector2(0, 0),
      new Vector2(20, 0),
      new Vector2(20, 10),
      new Vector2(0, 10),
    ])

    const expanded = expandShape(shape, 1)

    const box = new Box2().setFromPoints(expanded.flatMap(s => s.getPoints()))
    const width = box.max.x - box.min.x
    const height = box.max.y - box.min.y

    expect(width).toBeGreaterThan(20)
    expect(height).toBeGreaterThan(10)
  })
})
