import { describe, it, expect } from 'vitest'
import { Vector2 } from 'three'
import { buildBody } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody'
import {
  bodyProfile,
  dedupePoints,
  getBodyOuterRadius,
  getEffectiveRimChamfer,
  getInnerRadius,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/shapes'
import {
  MINIMUM_WALL_MM,
  defaultMugParams,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

function pointsAtHeight(points: Vector2[], y: number): Vector2[] {
  return points.filter((point) => Math.abs(point.y - y) < 1e-6)
}

describe('buildBody', () => {
  it('gera corpo fechado com volume positivo e altura correta', () => {
    const geometry = buildBody(defaultMugParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(defaultMugParams.height, 3)
    expect(box.max.x).toBeCloseTo(defaultMugParams.diameterTop / 2, 2)
    expect(isClosed(geometry)).toBe(true)

    const volume = signedVolume(geometry)
    expect(volume).toBeGreaterThan(55_000)
    expect(volume).toBeLessThan(70_000)
    geometry.dispose()
  })

  it('preserva os atributos exigidos pelo CSG', () => {
    const geometry = buildBody(defaultMugParams)

    expect(geometry.getIndex()).not.toBeNull()
    expect(geometry.getAttribute('position')).toBeDefined()
    expect(geometry.getAttribute('normal')).toBeDefined()
    expect(geometry.getAttribute('uv')).toBeDefined()
    geometry.dispose()
  })

  it('a cavidade interna respeita a parede', () => {
    const { bottomThickness, height, wallThickness } = defaultMugParams

    expect(getInnerRadius(defaultMugParams, bottomThickness))
      .toBeCloseTo(getBodyOuterRadius(defaultMugParams, bottomThickness) - wallThickness, 6)
    expect(getInnerRadius(defaultMugParams, height))
      .toBeCloseTo(defaultMugParams.diameterTop / 2 - wallThickness, 6)
  })

  it('o raio externo interpola até o fim do chanfro, não até a altura total', () => {
    const params = { ...defaultMugParams, wallThickness: 4, rimChamfer: 2 }
    const wallTop = params.height - getEffectiveRimChamfer(params)

    expect(getEffectiveRimChamfer(params)).toBeCloseTo(params.rimChamfer, 9)
    expect(getBodyOuterRadius(params, wallTop)).toBeCloseTo(params.diameterTop / 2, 6)
    expect(getInnerRadius(params, wallTop))
      .toBeCloseTo(params.diameterTop / 2 - params.wallThickness, 6)
  })

  it('o chanfro efetivo nunca come o anel mínimo da parede', () => {
    const params = { ...defaultMugParams, wallThickness: MINIMUM_WALL_MM, rimChamfer: 2 }
    expect(getEffectiveRimChamfer(params)).toBe(0)
  })

  it('o perfil é fechado e começa/termina no eixo', () => {
    const points = bodyProfile(defaultMugParams)
    expect(points[0].x).toBeCloseTo(0, 6)
    expect(points[points.length - 1].x).toBeCloseTo(0, 6)
  })

  it('o perfil usa o mesmo raio interno de getInnerRadius', () => {
    const points = bodyProfile(defaultMugParams)

    const bottom = pointsAtHeight(points, defaultMugParams.bottomThickness)
    expect(Math.max(...bottom.map((point) => point.x)))
      .toBeCloseTo(getInnerRadius(defaultMugParams, defaultMugParams.bottomThickness), 6)

    const rim = pointsAtHeight(points, defaultMugParams.height)
    expect(Math.min(...rim.map((point) => point.x)))
      .toBeCloseTo(getInnerRadius(defaultMugParams, defaultMugParams.height), 6)
  })

  it('o chanfro da borda não fura a parede', () => {
    const geometry = buildBody({ ...defaultMugParams, rimChamfer: 2 })
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })

  it.each([
    { wallThickness: 1.8, rimChamfer: 2 },
    { wallThickness: 4, rimChamfer: 2 },
  ])(
    'mantém o anel da borda com a parede mínima (parede $wallThickness, chanfro $rimChamfer)',
    ({ wallThickness, rimChamfer }) => {
      const params = { ...defaultMugParams, wallThickness, rimChamfer }
      const rim = pointsAtHeight(bodyProfile(params), params.height)
      const land = Math.max(...rim.map((point) => point.x))
        - Math.min(...rim.map((point) => point.x))

      expect(land).toBeGreaterThanOrEqual(MINIMUM_WALL_MM - 1e-9)
    },
  )

  it('fecha o corpo no chanfro zero', () => {
    const geometry = buildBody({ ...defaultMugParams, rimChamfer: 0 })
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it.each([
    { wallThickness: 1.8, rimChamfer: 0 },
    { wallThickness: 1.8, rimChamfer: 2 },
    { wallThickness: 4, rimChamfer: 0 },
    { wallThickness: 4, rimChamfer: 2 },
  ])(
    'fecha e mantém volume positivo nos extremos (parede $wallThickness, chanfro $rimChamfer)',
    ({ wallThickness, rimChamfer }) => {
      const geometry = buildBody({ ...defaultMugParams, wallThickness, rimChamfer })

      expect(isClosed(geometry)).toBe(true)
      expect(signedVolume(geometry)).toBeGreaterThan(0)
      geometry.dispose()
    },
  )
})

describe('dedupePoints', () => {
  it('remove pontos consecutivos coincidentes', () => {
    const points = [
      new Vector2(0, 0),
      new Vector2(0, 0),
      new Vector2(1, 0),
      new Vector2(1, 0),
      new Vector2(0, 1),
    ]

    const deduped = dedupePoints(points)
    expect(deduped).toHaveLength(3)
    expect(deduped.map((point) => [point.x, point.y])).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
    ])
  })
})
