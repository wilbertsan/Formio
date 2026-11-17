import { describe, it, expect } from 'vitest'
import { Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  buildRelief,
  fitRelief,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildRelief'
import {
  CONTENT_DEPTH,
  MAX_TEXT_ARC,
  RELIEF_EMBED,
  defaultMugParams,
  getOuterRadius,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { isClosed } from './geometryTestUtils'

/** Posições são Float32Array: ~1e-6 de erro absoluto em coordenadas de mm. */
const POSITION_EPSILON = 1e-5

function rectangleFont(width: number, height: number): Font {
  return {
    data: { glyphs: {} },
    generateShapes: () => {
      const shape = new Shape()
      shape.moveTo(-width / 2, -height / 2)
      shape.lineTo(width / 2, -height / 2)
      shape.lineTo(width / 2, height / 2)
      shape.lineTo(-width / 2, height / 2)
      shape.closePath()
      return [shape]
    },
  } as unknown as Font
}

describe('buildRelief', () => {
  it('curva o texto no raio do corpo e mantém 1 mm de relevo', () => {
    const params = { ...defaultMugParams, text: 'Festa' }
    const geometry = buildRelief(rectangleFont(20, 10), params)!
    const position = geometry.getAttribute('position')
    // O relevo acompanha a conicidade do corpo: cada vértice fica entre
    // RELIEF_EMBED dentro da parede e CONTENT_DEPTH acima dela, no próprio y.
    let minOffset = Infinity
    let maxOffset = -Infinity

    for (let i = 0; i < position.count; i++) {
      const offset = Math.hypot(position.getX(i), position.getZ(i))
        - getOuterRadius(params, position.getY(i))
      minOffset = Math.min(minOffset, offset)
      maxOffset = Math.max(maxOffset, offset)
    }

    expect(minOffset).toBeCloseTo(-RELIEF_EMBED, 5)
    expect(maxOffset).toBeCloseTo(CONTENT_DEPTH, 5)
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })

  it('centraliza o texto em 180° (lado oposto à alça)', () => {
    const params = { ...defaultMugParams, text: 'Festa' }
    const geometry = buildRelief(rectangleFont(10, 8), params)!
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeLessThan(0)
    expect(geometry.boundingBox!.min.y).toBeGreaterThan(params.textCenterY - params.textSize / 2 - 2)
    expect(geometry.boundingBox!.max.y).toBeLessThan(params.textCenterY + params.textSize / 2 + 2)
    geometry.dispose()
  })

  it('clampa o texto para dentro da parede quando o centro pede a borda', () => {
    const params = { ...defaultMugParams, textCenterY: 88 }
    const geometry = buildRelief(rectangleFont(10, 4), params)!
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.y).toBeGreaterThanOrEqual(params.bottomThickness + 2 - POSITION_EPSILON)
    expect(box.max.y).toBeLessThanOrEqual(
      params.height - params.rimChamfer - 2 + POSITION_EPSILON,
    )
    geometry.dispose()
  })

  it('reduz textos longos para não passar do arco máximo', () => {
    const params = { ...defaultMugParams, textSize: 18 }
    const geometry = buildRelief(rectangleFont(400, 18), params)!
    const position = geometry.getAttribute('position')
    let minAngle = Infinity
    let maxAngle = -Infinity

    for (let i = 0; i < position.count; i++) {
      const angle = Math.atan2(position.getZ(i), position.getX(i))
      const centered = angle > 0 ? angle - Math.PI * 2 : angle
      minAngle = Math.min(minAngle, centered)
      maxAngle = Math.max(maxAngle, centered)
    }

    expect(maxAngle - minAngle).toBeLessThanOrEqual(MAX_TEXT_ARC + 0.02)
    geometry.dispose()
  })

  it('texto vazio não gera geometria', () => {
    expect(buildRelief(rectangleFont(10, 10), { ...defaultMugParams, text: '   ' })).toBeNull()
  })
})

describe('fitRelief', () => {
  it('mantém escala 1 quando o texto cabe no arco', () => {
    expect(fitRelief(10, 40)).toBe(1)
  })

  it('reduz proporcionalmente quando o texto excede o arco', () => {
    expect(fitRelief(200, 40)).toBeCloseTo(MAX_TEXT_ARC / (200 / 40), 9)
  })

  it('não divide por zero em entradas degeneradas', () => {
    expect(fitRelief(0, 40)).toBe(1)
    expect(fitRelief(10, 0)).toBe(1)
  })
})
