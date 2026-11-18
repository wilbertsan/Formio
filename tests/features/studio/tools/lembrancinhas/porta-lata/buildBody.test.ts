import { describe, it, expect } from 'vitest'
import { Vector2 } from 'three'
import { buildBody } from '@/features/studio/tools/lembrancinhas/porta-lata/buildBody'
import { bodyProfile, dedupePoints } from '@/features/studio/tools/lembrancinhas/porta-lata/shapes'
import {
  BASE_CHAMFER_MM,
  CAN_DIAMETER,
  MIN_TOP_LAND_MM,
  defaultCanHolderParams,
  getEffectiveRingProtrusion,
  getEffectiveRimChamfer,
  getInnerDiameter,
  getMaxOuterDiameter,
  getOuterHeight,
  getOuterRadius,
  getTopLand,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'

function pointsAtHeight(points: Vector2[], y: number): Vector2[] {
  return points.filter((point) => Math.abs(point.y - y) < 1e-6)
}

describe('can holder body', () => {
  it('gera corpo fechado, single-shell, com o furo passante', () => {
    const geometry = buildBody(defaultCanHolderParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(getOuterHeight(defaultCanHolderParams), 3)
    expect(box.max.x).toBeCloseTo(getMaxOuterDiameter(defaultCanHolderParams) / 2, 2)
    expect(isClosed(geometry)).toBe(true)
    expect(countShells(geometry)).toBe(1)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
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

  it('a cavidade aceita a lata com a folga pedida', () => {
    expect(getInnerDiameter(defaultCanHolderParams)).toBeCloseTo(CAN_DIAMETER + 1.6, 5)
    const points = bodyProfile(defaultCanHolderParams)
    const inner = getInnerDiameter(defaultCanHolderParams) / 2
    expect(points.some((point) => Math.abs(point.x - inner) < 1e-6)).toBe(true)
  })

  it('o furo de ventilação tem o diâmetro pedido', () => {
    const points = bodyProfile(defaultCanHolderParams)
    const vent = defaultCanHolderParams.ventHoleDiameter / 2
    expect(points.some((point) => Math.abs(point.x - vent) < 1e-6)).toBe(true)
  })

  it('a borda de entrada deixa parede mínima no topo', () => {
    const geometry = buildBody(defaultCanHolderParams)
    const points = bodyProfile(defaultCanHolderParams)
    const top = pointsAtHeight(points, getOuterHeight(defaultCanHolderParams))
    expect(top.length).toBeGreaterThanOrEqual(2)

    const land = Math.max(...top.map((point) => point.x))
      - Math.min(...top.map((point) => point.x))
    expect(land).toBeCloseTo(getTopLand(defaultCanHolderParams), 6)
    expect(land).toBeGreaterThanOrEqual(MIN_TOP_LAND_MM - 1e-9)
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })

  it('o perfil começa e termina no furo, sem tocar o eixo', () => {
    const points = bodyProfile(defaultCanHolderParams)
    const vent = defaultCanHolderParams.ventHoleDiameter / 2

    expect(points[0].x).toBeCloseTo(vent, 6)
    expect(points[points.length - 1].x).toBeCloseTo(vent, 6)
    expect(points.every((point) => point.x > 0)).toBe(true)
  })

  it('gera os anéis decorativos colados na base e no topo', () => {
    const params = defaultCanHolderParams
    const protrusion = getEffectiveRingProtrusion(params)
    const outerRadius = getOuterRadius(params)
    const ringRadius = outerRadius + protrusion
    const height = getOuterHeight(params)
    const points = bodyProfile(params)

    expect(protrusion).toBeGreaterThan(0)
    const ringPoints = points
      .filter((point) => Math.abs(point.x - ringRadius) < 1e-6)
      .map((point) => point.y)

    expect(ringPoints).toHaveLength(4)
    expect(ringPoints[0]).toBeCloseTo(BASE_CHAMFER_MM, 6)
    expect(ringPoints[1]).toBeCloseTo(params.edgeRimWidth - protrusion, 6)
    expect(ringPoints[2]).toBeCloseTo(height - params.edgeRimWidth + protrusion, 6)
    expect(ringPoints[3]).toBeCloseTo(height - getEffectiveRimChamfer(params), 6)

    // Os dois flancos que ligam o raio do anel à parede ficam a 45°: avançam e
    // sobem o mesmo tanto, então |Δr| === Δy === protrusion.
    const isRing = (radius: number) => Math.abs(radius - ringRadius) < 1e-6
    const isWall = (radius: number) => Math.abs(radius - outerRadius) < 1e-6
    const flanks = points
      .slice(0, -1)
      .map((point, index) => [point, points[index + 1]] as const)
      .filter(([from, to]) => (
        (isRing(from.x) && isWall(to.x)) || (isWall(from.x) && isRing(to.x))
      ))

    expect(flanks).toHaveLength(2)
    for (const [from, to] of flanks) {
      const deltaRadius = Math.abs(to.x - from.x)
      const deltaHeight = Math.abs(to.y - from.y)
      expect(deltaRadius).toBeCloseTo(protrusion, 6)
      expect(deltaHeight).toBeCloseTo(protrusion, 6)
    }
  })

  it('sem anéis, o perfil volta ao corpo reto', () => {
    const params = { ...defaultCanHolderParams, edgeRimEnabled: false }
    const radius = getOuterRadius(params)
    const points = bodyProfile(params)

    expect(points).toHaveLength(10)
    expect(points.some((point) => point.x > radius + 1e-6)).toBe(false)
    expect(points.some((point) => Math.abs(point.x - radius) < 1e-6)).toBe(true)
  })

  it.each([
    { name: 'cavidade rasa', params: { cavityDepth: 80 } },
    { name: 'cavidade profunda', params: { cavityDepth: 116 } },
    { name: 'folga mínima', params: { canClearance: 0.5 } },
    { name: 'folga máxima', params: { canClearance: 1.2 } },
    { name: 'parede mínima', params: { wallThickness: 1.8 } },
    { name: 'parede máxima', params: { wallThickness: 4 } },
    { name: 'furo mínimo', params: { ventHoleDiameter: 6 } },
    { name: 'furo máximo', params: { ventHoleDiameter: 14 } },
    { name: 'fundo mínimo', params: { bottomThickness: 2 } },
    { name: 'fundo máximo', params: { bottomThickness: 6 } },
    { name: 'borda de entrada mínima', params: { rimLeadIn: 0.5 } },
    { name: 'borda de entrada máxima', params: { rimLeadIn: 2 } },
    { name: 'chanfro zero', params: { rimChamfer: 0 } },
    { name: 'chanfro máximo', params: { rimChamfer: 1.5, wallThickness: 4 } },
    { name: 'bordas desligadas', params: { edgeRimEnabled: false } },
    { name: 'bordas mínimas', params: { edgeRimProtrusion: 0.4, edgeRimWidth: 4 } },
    { name: 'bordas máximas', params: { edgeRimProtrusion: 1.5, edgeRimWidth: 14 } },
    { name: 'bordas máximas com corpo mínimo', params: { edgeRimWidth: 14, edgeRimProtrusion: 1.5, cavityDepth: 80, bottomThickness: 2 } },
    { name: 'bordas máximas com parede e borda mínimas', params: { edgeRimWidth: 4, edgeRimProtrusion: 1.5, wallThickness: 1.8, rimLeadIn: 2, rimChamfer: 1.5 } },
  ])('fecha e mantém volume positivo nos extremos ($name)', ({ params }) => {
    const merged = { ...defaultCanHolderParams, ...params }
    const geometry = buildBody(merged)

    expect(isClosed(geometry)).toBe(true)
    expect(countShells(geometry)).toBe(1)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })
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
