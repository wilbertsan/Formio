import { describe, it, expect } from 'vitest'
import { Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  toClipperPaths,
  unionPaths,
  offsetPaths,
  subtractPaths,
  scalePaths,
  translatePaths,
  pathsBoundingBox,
  pathsToShapes,
  shapesToGeometry,
  textToShapes,
  outerPaths,
  clipPathsToRect,
} from '@/features/studio/tools/confeitaria/shared/textOutline'

function rect(x: number, y: number, w: number, h: number): Shape {
  return new Shape([
    new Vector2(x, y),
    new Vector2(x + w, y),
    new Vector2(x + w, y + h),
    new Vector2(x, y + h),
  ])
}

function rectWithHole(): Shape {
  const shape = rect(0, 0, 20, 20)
  shape.holes.push(new Path([
    new Vector2(5, 5),
    new Vector2(15, 5),
    new Vector2(15, 15),
    new Vector2(5, 15),
  ]))
  return shape
}

describe('pathsToShapes', () => {
  it('converte um retângulo simples em um Shape', () => {
    const shapes = pathsToShapes(toClipperPaths([rect(0, 0, 10, 10)]))
    expect(shapes).toHaveLength(1)
    expect(shapes[0].holes).toHaveLength(0)
  })

  it('reconhece um furo interno', () => {
    const shapes = pathsToShapes(toClipperPaths([rectWithHole()]))
    expect(shapes).toHaveLength(1)
    expect(shapes[0].holes).toHaveLength(1)
  })

  it('trata componentes desconexos como Shapes separados', () => {
    const shapes = pathsToShapes(unionPaths(toClipperPaths([rect(0, 0, 10, 10), rect(30, 0, 10, 10)])))
    expect(shapes).toHaveLength(2)
    expect(shapes.every(s => s.holes.length === 0)).toBe(true)
  })
})

describe('offsetPaths', () => {
  it('cresce o contorno em mm', () => {
    const base = toClipperPaths([rect(0, 0, 10, 10)])
    const grown = offsetPaths(base, 2)
    const bb = pathsBoundingBox(grown)
    expect(bb.width).toBeGreaterThan(13)
    expect(bb.width).toBeLessThan(15)
  })

  it('encolhe o contorno com valor negativo', () => {
    const base = toClipperPaths([rect(0, 0, 20, 20)])
    const shrunk = offsetPaths(base, -2)
    const bb = pathsBoundingBox(shrunk)
    expect(bb.width).toBeLessThan(17)
  })
})

describe('outerPaths', () => {
  it('remove furos internos (preenche counters)', () => {
    const paths = toClipperPaths([rectWithHole()])
    const outers = outerPaths(paths)
    expect(outers).toHaveLength(1)
    expect(pathsToShapes(outers)[0].holes).toHaveLength(0)
  })

  it('mantém componentes externos desconexos', () => {
    const outers = outerPaths(unionPaths(toClipperPaths([rect(0, 0, 10, 10), rect(30, 0, 10, 10)])))
    expect(outers).toHaveLength(2)
  })
})

describe('subtractPaths', () => {
  it('gera uma faixa (anel) entre o expandido e o original', () => {
    const base = toClipperPaths([rect(0, 0, 10, 10)])
    const ring = subtractPaths(offsetPaths(base, 2), base)
    const shapes = pathsToShapes(ring)
    // região anelar → um contorno externo com um furo
    expect(shapes).toHaveLength(1)
    expect(shapes[0].holes).toHaveLength(1)
  })
})

describe('scalePaths / translatePaths / pathsBoundingBox', () => {
  it('escala em torno da origem', () => {
    const bb = pathsBoundingBox(scalePaths(toClipperPaths([rect(0, 0, 10, 10)]), 2))
    expect(bb.width).toBeCloseTo(20, 1)
  })

  it('translada em mm', () => {
    const bb = pathsBoundingBox(translatePaths(toClipperPaths([rect(0, 0, 10, 10)]), 5, -3))
    expect(bb.minX).toBeCloseTo(5, 1)
    expect(bb.minY).toBeCloseTo(-3, 1)
  })
})

describe('shapesToGeometry', () => {
  it('extruda e mescla as shapes', () => {
    const geometry = shapesToGeometry(pathsToShapes(unionPaths(toClipperPaths([
      rect(0, 0, 10, 10),
      rect(30, 0, 10, 10),
    ]))), 3, false)
    expect(geometry.attributes.position).toBeDefined()
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
  })
})

describe('textToShapes', () => {
  it('usa generateShapes da fonte', () => {
    const font = {
      generateShapes: () => [rect(0, 0, 10, 10)],
    } as unknown as Font
    expect(textToShapes(font, 'AB', 10)).toHaveLength(1)
  })

  it('retorna vazio para texto em branco', () => {
    const font = { generateShapes: () => [rect(0, 0, 10, 10)] } as unknown as Font
    expect(textToShapes(font, '   ', 10)).toHaveLength(0)
  })

  it('tenta normalizar acentos quando generateShapes falha', () => {
    const generateShapes = (text: string) => {
      if (Array.from(text).some(ch => ch.charCodeAt(0) > 127)) throw new Error('missing glyph')
      return [rect(0, 0, 10, 10)]
    }
    const font = { generateShapes } as unknown as Font
    expect(textToShapes(font, 'Parabéns', 10)).toHaveLength(1)
  })

  it('remove acentos antes de gerar quando a fonte não tem os glifos', () => {
    const calls: string[] = []
    const font = {
      data: { glyphs: { P: {}, a: {}, r: {}, b: {}, e: {}, n: {}, s: {} } },
      generateShapes: (text: string) => {
        calls.push(text)
        return [rect(0, 0, 10, 10)]
      },
    } as unknown as Font
    textToShapes(font, 'Parabéns', 10)
    expect(calls).toEqual(['Parabens'])
  })

  it('preserva acentos quando a fonte tem todos os glifos', () => {
    const calls: string[] = []
    const chars = Array.from('Parabéns')
    const glyphs = Object.fromEntries(chars.map(c => [c, {}]))
    const font = {
      data: { glyphs },
      generateShapes: (text: string) => {
        calls.push(text)
        return [rect(0, 0, 10, 10)]
      },
    } as unknown as Font
    textToShapes(font, 'Parabéns', 10)
    expect(calls).toEqual(['Parabéns'])
  })
})

describe('clipPathsToRect', () => {
  it('recorta paths no retângulo preservando a área', () => {
    const square = new Shape([
      new Vector2(0, 0), new Vector2(10, 0), new Vector2(10, 10), new Vector2(0, 10),
    ])
    const clipped = clipPathsToRect(toClipperPaths([square]), 2, 2, 8, 8)
    const shapes = pathsToShapes(clipped)
    expect(shapes).toHaveLength(1)
    const points = shapes[0].getPoints()
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    expect(Math.min(...xs)).toBeCloseTo(2, 2)
    expect(Math.max(...xs)).toBeCloseTo(8, 2)
    expect(Math.min(...ys)).toBeCloseTo(2, 2)
    expect(Math.max(...ys)).toBeCloseTo(8, 2)
  })
})
