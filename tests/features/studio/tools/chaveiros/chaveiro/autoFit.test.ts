import * as THREE from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  buildContentShapes,
  clampOffset,
  fitGeometryToRegion,
  getUsableRegion,
  resolveContentGeometry,
  type FitContext,
} from '@/features/studio/tools/chaveiros/chaveiro/autoFit'
import {
  defaultKeychainParams,
  type IconContent,
  type TextContent,
} from '@/features/studio/tools/chaveiros/chaveiro/schema'

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text: string, parameters: { size: number; depth: number }) {
      super()
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            -w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
            -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d,
          ],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

const SVG_RECT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'

const textItem: TextContent = {
  id: 'text-1',
  kind: 'text',
  content: 'ANA',
  fontStyle: 'bold',
  fontSize: 10,
  offsetX: 0,
  offsetY: 0,
}

const iconItem: IconContent = {
  id: 'icon-1',
  kind: 'icon',
  svgIcon: SVG_RECT,
  iconScale: 1,
  iconLineWidth: 0.3,
  offsetX: 0,
  offsetY: 0,
}

const fontStub = {
  glyphs: {},
  generateShapes: (_text: string, size: number) => {
    const s = size / 10
    return [new THREE.Shape([
      new THREE.Vector2(2 * s, 1 * s),
      new THREE.Vector2(12 * s, 1 * s),
      new THREE.Vector2(12 * s, 5 * s),
      new THREE.Vector2(2 * s, 5 * s),
    ])]
  },
} as unknown as Font

function boundingBox(geometry: THREE.BufferGeometry): THREE.Box3 {
  geometry.computeBoundingBox()
  return geometry.boundingBox!
}

function shapeBounds(shapes: THREE.Shape[]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const shape of shapes) {
    for (const point of shape.getPoints()) {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }
  }
  return { minX, maxX, minY, maxY }
}

function baseContext(overrides: Partial<FitContext> = {}): FitContext {
  return {
    region: getUsableRegion(defaultKeychainParams),
    params: defaultKeychainParams,
    font: fontStub,
    referenceSize: 10,
    ...overrides,
  }
}

it('retângulo usa área interna à borda', () => {
  const region = getUsableRegion({ ...defaultKeychainParams, borderWidth: 4, width: 50, height: 25 })!
  expect(region).toEqual({ kind: 'rect', minX: -21, maxX: 21, minY: -8.5, maxY: 8.5 })
})

it('círculo usa raio interno', () => {
  const region = getUsableRegion({
    ...defaultKeychainParams, baseShape: 'circle', width: 40, borderWidth: 5,
  })!
  expect(region).toEqual({ kind: 'circle', cx: 0, cy: 0, radius: 15 })
})

it('retângulo com borda igual à metade nunca colapsa', () => {
  const region = getUsableRegion({
    ...defaultKeychainParams, baseShape: 'rect', width: 20, height: 20, borderWidth: 10,
  })!
  expect(region).toEqual({ kind: 'rect', minX: -0.5, maxX: 0.5, minY: -0.5, maxY: 0.5 })

  const geometry = new THREE.BoxGeometry(10, 10, 1)
  fitGeometryToRegion(geometry, region)
  const bb = boundingBox(geometry)
  expect(bb.max.x - bb.min.x).toBeGreaterThan(0)
  expect(bb.max.y - bb.min.y).toBeGreaterThan(0)
})

it('nunca aumenta e centraliza', () => {
  const geo = new THREE.BoxGeometry(100, 20, 1)
  fitGeometryToRegion(geo, { kind: 'rect', minX: -10, maxX: 10, minY: -10, maxY: 10 })
  const bb = boundingBox(geo)
  expect(bb.max.x - bb.min.x).toBeLessThanOrEqual(20.01)
  expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(0)
  expect(bb.min.z).toBeCloseTo(0)
})

it('círculo centraliza no centro da região', () => {
  const geo = new THREE.BoxGeometry(10, 10, 1)
  fitGeometryToRegion(geo, { kind: 'circle', cx: 4, cy: -3, radius: 20 })
  const bb = boundingBox(geo)
  expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(4)
  expect((bb.min.y + bb.max.y) / 2).toBeCloseTo(-3)
  expect(bb.min.z).toBeCloseTo(0)
})

it('name não tem região de auto-fit', () => {
  expect(getUsableRegion({ ...defaultKeychainParams, baseShape: 'name' })).toBeNull()
})

it('coração usa centro real da bounding box', () => {
  const region = getUsableRegion({
    ...defaultKeychainParams, baseShape: 'heart', width: 50, height: 25, borderWidth: 4,
  })!
  expect(region.kind).toBe('circle')
  if (region.kind !== 'circle') throw new Error('região inesperada')
  expect(region.cy).not.toBeCloseTo(0, 1)
  expect(region.radius).toBeGreaterThan(4)
})

describe('clampOffset', () => {
  it('limita X e Y no retângulo', () => {
    const result = clampOffset(
      { kind: 'rect', minX: -10, maxX: 10, minY: -5, maxY: 5 },
      2,
      1,
      { x: 20, y: -20 },
    )
    expect(result).toEqual({ x: 8, y: -4 })
  })

  it('retorna delta em relação ao centro do círculo', () => {
    const region = { kind: 'circle' as const, cx: 5, cy: -2, radius: 10 }
    const result = clampOffset(region, 0, 0, { x: 25, y: -2 })
    expect(result.x).toBeCloseTo(10)
    expect(result.y).toBeCloseTo(0)
    expect(Math.hypot(result.x, result.y)).toBeLessThanOrEqual(10)
  })

  it('delta clampado cabe no raio descontando o conteúdo', () => {
    const region = { kind: 'circle' as const, cx: 5, cy: -2, radius: 10 }
    const halfWidth = 4
    const halfHeight = 3
    const result = clampOffset(region, halfWidth, halfHeight, { x: 100, y: 100 })
    const maxCenter = region.radius - Math.hypot(halfWidth, halfHeight)
    expect(Math.hypot(result.x, result.y)).toBeLessThanOrEqual(maxCenter + 1e-9)
  })
})

it('compõe centro do coração sem duplicar deslocamento', () => {
  const region = getUsableRegion({
    ...defaultKeychainParams, baseShape: 'heart', width: 50, height: 25, borderWidth: 4,
  })!
  if (region.kind !== 'circle') throw new Error('região inesperada')

  const fitted = resolveContentGeometry(textItem, baseContext({ region }))!
  fitted.geometry.translate(fitted.x, fitted.y, 0)

  const bb = boundingBox(fitted.geometry)
  expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(region.cx)
  expect((bb.min.y + bb.max.y) / 2).toBeCloseTo(region.cy)
})

describe('resolveContentGeometry', () => {
  it('texto retorna geometria válida com base em Z = 0', () => {
    const fitted = resolveContentGeometry(textItem, baseContext())!
    expect(fitted).not.toBeNull()
    expect(fitted.halfWidth).toBeGreaterThan(0)
    expect(boundingBox(fitted.geometry).min.z).toBeCloseTo(0)
  })

  it('texto sem fonte retorna null', () => {
    expect(resolveContentGeometry(textItem, baseContext({ font: undefined }))).toBeNull()
  })

  it('ícone sem SVG retorna null', () => {
    const item: IconContent = { ...iconItem, svgIcon: null }
    expect(resolveContentGeometry(item, baseContext())).toBeNull()
  })

  it('ícone funciona sem fonte', () => {
    const fitted = resolveContentGeometry(iconItem, baseContext({ font: undefined }))!
    expect(fitted).not.toBeNull()
    expect(fitted.halfWidth).toBeGreaterThan(0)
    expect(boundingBox(fitted.geometry).min.z).toBeCloseTo(0)
  })

  it('empurra conteúdo para fora do furo', () => {
    const item: TextContent = { ...textItem, fontSize: 6, offsetX: 0, offsetY: 0 }
    const fitted = resolveContentGeometry(item, baseContext({
      region: null,
      pieceBB: { minX: -25, maxX: 25, minY: -12.5, maxY: 12.5 },
      hole: { x: 0, y: 0, radius: 3 },
    }))!
    expect(fitted).not.toBeNull()
    expect(Math.hypot(fitted.x, fitted.y)).toBeGreaterThanOrEqual(4 - 0.0001)
  })
})

describe('buildContentShapes', () => {
  it('centraliza o texto em torno do offset', () => {
    const item: TextContent = { ...textItem, offsetX: 7, offsetY: -3 }
    const shapes = buildContentShapes(item, fontStub, 10)
    const bb = shapeBounds(shapes)
    expect((bb.minX + bb.maxX) / 2).toBeCloseTo(7)
    expect((bb.minY + bb.maxY) / 2).toBeCloseTo(-3)
  })

  it('centraliza o ícone em torno do offset', () => {
    const item: IconContent = { ...iconItem, offsetX: 3, offsetY: -2 }
    const shapes = buildContentShapes(item, fontStub, 10)
    expect(shapes.length).toBeGreaterThan(0)
    const bb = shapeBounds(shapes)
    expect((bb.minX + bb.maxX) / 2).toBeCloseTo(3)
    expect((bb.minY + bb.maxY) / 2).toBeCloseTo(-2)
  })

  it('ícone funciona sem fonte', () => {
    const shapes = buildContentShapes(iconItem, undefined, 10)
    expect(shapes.length).toBeGreaterThan(0)
  })

  it('texto sem fonte retorna vazio', () => {
    expect(buildContentShapes(textItem, undefined, 10)).toEqual([])
  })
})
