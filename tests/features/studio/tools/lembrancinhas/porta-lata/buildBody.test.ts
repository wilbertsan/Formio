import { describe, it, expect } from 'vitest'
import { Vector2 } from 'three'
import { buildBody } from '@/features/studio/tools/lembrancinhas/porta-lata/buildBody'
import {
  bodyProfile,
  dedupePoints,
  getBodyOuterRadius,
  getEffectiveRimChamfer,
  getInnerRadius,
} from '@/features/studio/tools/lembrancinhas/porta-lata/shapes'
import {
  MINIMUM_WALL_MM,
  defaultCanHolderParams,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

function pointsAtHeight(points: Vector2[], y: number): Vector2[] {
  return points.filter((point) => Math.abs(point.y - y) < 1e-6)
}

describe('buildBody', () => {
  it('gera corpo fechado com volume positivo e altura correta', () => {
    const geometry = buildBody(defaultCanHolderParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(defaultCanHolderParams.height, 3)
    expect(box.max.x).toBeCloseTo(defaultCanHolderParams.diameterTop / 2, 2)
    expect(isClosed(geometry)).toBe(true)

    const volume = signedVolume(geometry)
    expect(volume).toBeGreaterThan(55_000)
    expect(volume).toBeLessThan(70_000)
    geometry.dispose()
  })

  it('preserva os atributos exigidos pelo CSG', () => {
    const geometry = buildBody(defaultCanHolderParams)

    expect(geometry.getIndex()).not.toBeNull()
    expect(geometry.getAttribute('position')).toBeDefined()
    expect(geometry.getAttribute('normal')).toBeDefined()
    expect(geometry.getAttribute('uv')).toBeDefined()
    geometry.dispose()
  })

  it('a cavidade interna respeita a parede', () => {
    const { bottomThickness, height, wallThickness } = defaultCanHolderParams

    expect(getInnerRadius(defaultCanHolderParams, bottomThickness))
      .toBeCloseTo(getBodyOuterRadius(defaultCanHolderParams, bottomThickness) - wallThickness, 6)
    expect(getInnerRadius(defaultCanHolderParams, height))
      .toBeCloseTo(defaultCanHolderParams.diameterTop / 2 - wallThickness, 6)
  })

  it('o raio externo interpola até o fim do chanfro, não até a altura total', () => {
    const params = { ...defaultCanHolderParams, wallThickness: 4, rimChamfer: 2 }
    const wallTop = params.height - getEffectiveRimChamfer(params)

    expect(getEffectiveRimChamfer(params)).toBeCloseTo(params.rimChamfer, 9)
    expect(getBodyOuterRadius(params, wallTop)).toBeCloseTo(params.diameterTop / 2, 6)
    expect(getInnerRadius(params, wallTop))
      .toBeCloseTo(params.diameterTop / 2 - params.wallThickness, 6)
  })

  it('o chanfro efetivo nunca come o anel mínimo da parede', () => {
    const params = { ...defaultCanHolderParams, wallThickness: MINIMUM_WALL_MM, rimChamfer: 2 }
    expect(getEffectiveRimChamfer(params)).toBe(0)
  })

  it('o perfil é fechado e começa/termina no eixo', () => {
    const points = bodyProfile(defaultCanHolderParams)
    expect(points[0].x).toBeCloseTo(0, 6)
    expect(points[points.length - 1].x).toBeCloseTo(0, 6)
  })

  it('o perfil usa o mesmo raio interno de getInnerRadius', () => {
    const points = bodyProfile(defaultCanHolderParams)

    const bottom = pointsAtHeight(points, defaultCanHolderParams.bottomThickness)
    expect(Math.max(...bottom.map((point) => point.x)))
      .toBeCloseTo(getInnerRadius(defaultCanHolderParams, defaultCanHolderParams.bottomThickness), 6)

    const rim = pointsAtHeight(points, defaultCanHolderParams.height)
    expect(Math.min(...rim.map((point) => point.x)))
      .toBeCloseTo(getInnerRadius(defaultCanHolderParams, defaultCanHolderParams.height), 6)
  })

  it('o chanfro da borda não fura a parede', () => {
    const geometry = buildBody({ ...defaultCanHolderParams, rimChamfer: 2 })
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })

  it.each([
    { wallThickness: 1.8, rimChamfer: 2 },
    { wallThickness: 4, rimChamfer: 2 },
  ])(
    'mantém o anel da borda com a parede mínima (parede $wallThickness, chanfro $rimChamfer)',
    ({ wallThickness, rimChamfer }) => {
      const params = { ...defaultCanHolderParams, wallThickness, rimChamfer }
      const rim = pointsAtHeight(bodyProfile(params), params.height)
      const land = Math.max(...rim.map((point) => point.x))
        - Math.min(...rim.map((point) => point.x))

      expect(land).toBeGreaterThanOrEqual(MINIMUM_WALL_MM - 1e-9)
    },
  )

  it('fecha o corpo no chanfro zero', () => {
    const geometry = buildBody({ ...defaultCanHolderParams, rimChamfer: 0 })
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
      const geometry = buildBody({ ...defaultCanHolderParams, wallThickness, rimChamfer })

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
