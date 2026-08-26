import { Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { createNameOutline } from '@/features/studio/tools/chaveiros/chaveiro/nameOutline'
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
})
