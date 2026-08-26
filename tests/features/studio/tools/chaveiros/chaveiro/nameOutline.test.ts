import { Box2, Shape, Path, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { createNameOutline, expandShape, shapeToClipperPaths, unionShapes } from '@/features/studio/tools/chaveiros/chaveiro/nameOutline'
import { type TextItem } from '@/features/studio/tools/chaveiros/chaveiro/schema'

const createMockFont = (): Font => ({
  glyphs: {},
  data: { ascender: 0, descender: 0, underlinePosition: 0, underlineThickness: 0 },
  computeBoundingBox: () => ({ minX: 0, maxX: 10, minY: -5, maxY: 5 }),
  generateShapes: (_text: string, size: number) => {
    const s = size / 10
    const shape = new Shape([
      new Vector2(-5 * s, -5 * s),
      new Vector2(5 * s, -5 * s),
      new Vector2(5 * s, 5 * s),
      new Vector2(-5 * s, 5 * s),
    ])
    return [shape]
  },
} as unknown as Font)

const defaultText: TextItem = {
  id: 'text-1',
  content: 'A',
  fontStyle: 'bold',
  width: 20,
  height: 10,
  relief: 1,
  proportional: false,
  offsetX: 0,
  offsetY: 0,
}

describe('createNameOutline', () => {
  it('gera outline e fill como geometrias válidas', () => {
    const result = createNameOutline({
      font: createMockFont(),
      texts: [defaultText],
      borderWidth: 2,
    })

    expect(result.outline).toBeDefined()
    expect(result.fill).toBeDefined()
    expect(result.boundingBox).toBeDefined()
  })

  it('bounding box tem dimensões positivas', () => {
    const result = createNameOutline({
      font: createMockFont(),
      texts: [defaultText],
      borderWidth: 2,
    })

    const width = result.boundingBox.maxX - result.boundingBox.minX
    const height = result.boundingBox.maxY - result.boundingBox.minY
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })

  it('outline é maior que fill por borderWidth', () => {
    const result = createNameOutline({
      font: createMockFont(),
      texts: [{ ...defaultText, content: 'Hello' }],
      borderWidth: 2,
    })

    result.outline.computeBoundingBox()
    result.fill.computeBoundingBox()

    const outlineWidth = result.outline.boundingBox!.max.x - result.outline.boundingBox!.min.x
    const fillWidth = result.fill.boundingBox!.max.x - result.fill.boundingBox!.min.x

    expect(outlineWidth).toBeGreaterThan(fillWidth)
  })

  it('gera geometrias para múltiplos textos', () => {
    const result = createNameOutline({
      font: createMockFont(),
      texts: [
        { ...defaultText, id: 't1', content: 'A' },
        { ...defaultText, id: 't2', content: 'B', offsetX: 20 },
      ],
      borderWidth: 1,
    })

    expect(result.outline).toBeDefined()
    expect(result.fill).toBeDefined()
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
