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

/** Cobre o recuo do embutimento e a variação de raio ao longo do glifo. */
const RADIAL_TOLERANCE = 0.5
const EPSILON = 1e-6

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
    geometry.computeBoundingBox()
    const position = geometry.getAttribute('position')
    let minRadius = Infinity
    let maxRadius = 0

    for (let i = 0; i < position.count; i++) {
      const radius = Math.hypot(position.getX(i), position.getZ(i))
      minRadius = Math.min(minRadius, radius)
      maxRadius = Math.max(maxRadius, radius)
    }

    const radius = getOuterRadius(params, params.textCenterY)
    // O relevo acompanha a conicidade do corpo, então o raio varia ao longo da
    // altura do glifo além de recuar RELIEF_EMBED na parede.
    expect(minRadius).toBeGreaterThan(radius - RADIAL_TOLERANCE)
    expect(maxRadius).toBeGreaterThan(radius + CONTENT_DEPTH - RADIAL_TOLERANCE)

    // Invariante exato: cada vértice fica entre RELIEF_EMBED dentro da parede e
    // CONTENT_DEPTH - RELIEF_EMBED acima dela, no próprio y.
    for (let i = 0; i < position.count; i++) {
      const offset = Math.hypot(position.getX(i), position.getZ(i))
        - getOuterRadius(params, position.getY(i))
      expect(offset).toBeGreaterThanOrEqual(-RELIEF_EMBED - EPSILON)
      expect(offset).toBeLessThanOrEqual(CONTENT_DEPTH - RELIEF_EMBED + EPSILON)
    }

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
