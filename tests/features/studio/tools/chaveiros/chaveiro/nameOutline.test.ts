import { Box2, Shape, Path, Vector2 } from 'three'
import { createNameOutline, expandShape, shapeToClipperPaths, unionShapes } from '@/features/studio/tools/chaveiros/chaveiro/nameOutline'

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
    expect(result.boundingBox.minX).toBeCloseTo(-12)
    expect(result.boundingBox.maxX).toBeCloseTo(12)
  })

  it('lida com lista vazia', () => {
    const result = createNameOutline({ shapes: [], borderWidth: 4, thickness: 3 })
    expect(result.outline).toBeDefined()
    expect(result.boundingBox).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 })
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

    const box = new Box2().setFromPoints(union.getPoints())
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
    expect(union.getPoints().length).toBeGreaterThan(0)
    expect(union.holes).toHaveLength(1)
  })

  it('expande shape usando offset externo', () => {
    const shape = new Shape([
      new Vector2(0, 0),
      new Vector2(10, 0),
      new Vector2(10, 10),
      new Vector2(0, 10),
    ])

    const expanded = expandShape(shape, 2)

    const box = new Box2().setFromPoints(expanded.getPoints())
    const expandedWidth = box.max.x - box.min.x
    const originalWidth = 10

    expect(expandedWidth).toBeGreaterThan(originalWidth)
  })

  it('offset externo mantém forma aproximada', () => {
    const shape = new Shape([
      new Vector2(0, 0),
      new Vector2(20, 0),
      new Vector2(20, 10),
      new Vector2(0, 10),
    ])

    const expanded = expandShape(shape, 1)

    const box = new Box2().setFromPoints(expanded.getPoints())
    const width = box.max.x - box.min.x
    const height = box.max.y - box.min.y

    expect(width).toBeGreaterThan(20)
    expect(height).toBeGreaterThan(10)
  })
})
