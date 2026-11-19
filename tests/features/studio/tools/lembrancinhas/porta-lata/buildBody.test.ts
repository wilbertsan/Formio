import { describe, it, expect } from 'vitest'
import { Vector2 } from 'three'
import {
  buildBody,
  findOuterWall,
} from '@/features/studio/tools/lembrancinhas/porta-lata/buildBody'
import { bodyProfile, dedupePoints } from '@/features/studio/tools/lembrancinhas/porta-lata/shapes'
import {
  BASE_CHAMFER_MM,
  CAN_DIAMETER,
  MIN_TOP_LAND_MM,
  TEXTURE_STYLES,
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

  it('encontra a parede externa no perfil com e sem anéis', () => {
    const params = defaultCanHolderParams
    const innerRadius = getInnerDiameter(params) / 2
    const withRings = findOuterWall(bodyProfile(params), innerRadius)
    expect(withRings.min).toBeCloseTo(params.edgeRimWidth, 6)
    expect(withRings.max).toBeCloseTo(getOuterHeight(params) - params.edgeRimWidth, 6)
    expect(withRings.radius).toBeCloseTo(getOuterRadius(params), 6)

    const withoutRings = { ...params, edgeRimEnabled: false }
    const wall = findOuterWall(bodyProfile(withoutRings), getInnerDiameter(withoutRings) / 2)
    expect(wall.radius).toBeCloseTo(getOuterRadius(withoutRings), 6)
    expect(wall.max).toBeCloseTo(
      getOuterHeight(withoutRings) - getEffectiveRimChamfer(withoutRings),
      6,
    )
  })

  it.each(TEXTURE_STYLES.filter((style) => style !== 'none'))(
    'fecha o corpo texturizado (%s)',
    (style) => {
      const params = { ...defaultCanHolderParams, textureStyle: style, textureDepth: 1.5 }
      const geometry = buildBody(params)
      geometry.computeBoundingBox()
      const box = geometry.boundingBox!
      const outerR = getOuterRadius(params)
      const position = geometry.getAttribute('position')
      let maxRadius = 0

      // `box.max.x` é ponderado por cos(θ): o pico do padrão não precisa estar
      // no eixo X. O raio máximo mede o deslocamento radial real do padrão.
      for (let i = 0; i < position.count; i++) {
        maxRadius = Math.max(
          maxRadius,
          Math.hypot(position.getX(i), position.getZ(i)),
        )
      }

      expect(isClosed(geometry)).toBe(true)
      expect(countShells(geometry)).toBe(1)
      expect(signedVolume(geometry)).toBeGreaterThan(0)
      expect(box.max.y).toBeCloseTo(getOuterHeight(params), 3)
      expect(maxRadius).toBeGreaterThan(outerR + 1.5 * 0.9)
      expect(maxRadius).toBeLessThanOrEqual(outerR + 1.5 + 1e-3)
      geometry.dispose()
    },
  )

  it('mantém a faixa da abraçadeira lisa', () => {
    const params = {
      ...defaultCanHolderParams,
      textureStyle: 'wood' as const,
      textureDepth: 1.5,
    }
    const geometry = buildBody(params)
    const position = geometry.getAttribute('position')
    const outerR = getOuterRadius(params)
    const innerR = getInnerDiameter(params) / 2
    const bandMin = params.handleHeight - params.handleWidth / 2
    const bandMax = params.handleHeight + params.handleWidth / 2
    let checked = 0

    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i)
      if (y <= bandMin || y >= bandMax) continue
      const radius = Math.hypot(position.getX(i), position.getZ(i))
      if (radius < innerR + 0.5) continue
      checked += 1
      expect.soft(radius, `vértice ${i} em y=${y}`).toBeCloseTo(outerR, 4)
    }
    expect(checked).toBeGreaterThan(500)
    geometry.dispose()
  })

  it('mantém as facetas da parede abaixo de 45 graus', () => {
    for (const style of TEXTURE_STYLES.filter((value) => value !== 'none')) {
      for (const textureScale of [4, 6, 8]) {
        const params = {
          ...defaultCanHolderParams,
          textureStyle: style,
          textureDepth: 1.5,
          textureScale,
        }
        const geometry = buildBody(params)
        const position = geometry.getAttribute('position')
        const index = geometry.getIndex()
        const wall = findOuterWall(bodyProfile(params), getInnerDiameter(params) / 2)
        const outerR = getOuterRadius(params)
        const wallVertex = (i: number): boolean => {
          const y = position.getY(i)
          if (y < wall.min - 1e-3 || y > wall.max + 1e-3) return false
          return Math.hypot(position.getX(i), position.getZ(i)) >= outerR - 1e-4
        }
        let checked = 0

        const triangleAt = (a: number, b: number, c: number): void => {
          if (!wallVertex(a) || !wallVertex(b) || !wallVertex(c)) return
          const ax = position.getX(a)
          const ay = position.getY(a)
          const az = position.getZ(a)
          const bx = position.getX(b)
          const by = position.getY(b)
          const bz = position.getZ(b)
          const cx = position.getX(c)
          const cy = position.getY(c)
          const cz = position.getZ(c)
          const abx = bx - ax
          const aby = by - ay
          const abz = bz - az
          const acx = cx - ax
          const acy = cy - ay
          const acz = cz - az
          const nx = aby * acz - abz * acy
          const ny = abz * acx - abx * acz
          const nz = abx * acy - aby * acx
          const horizontal = Math.hypot(nx, nz)
          if (horizontal < 1e-9) return
          checked += 1
          expect
            .soft(Math.abs(ny) / horizontal, `${style}/${textureScale} em y=${ay}`)
            .toBeLessThanOrEqual(1 + 1e-2)
        }

        if (index) {
          for (let i = 0; i < index.count; i += 3) {
            triangleAt(index.getX(i), index.getX(i + 1), index.getX(i + 2))
          }
        } else {
          for (let i = 0; i < position.count; i += 3) triangleAt(i, i + 1, i + 2)
        }
        expect.soft(checked, `${style}/${textureScale}`).toBeGreaterThan(1000)
        geometry.dispose()
      }
    }
  })

  it('mantém posições e normais contínuas na emenda da textura', () => {
    const params = {
      ...defaultCanHolderParams,
      textureStyle: 'wood' as const,
      textureDepth: 1.2,
    }
    const geometry = buildBody(params)
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    const rows = new Map<
      string,
      { radius: number; normal: [number, number, number] }[]
    >()

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const z = position.getZ(i)
      // O LatheGeometry fecha a emenda em φ = 0 e φ = 2π, isto é, x ≈ 0 e
      // z > 0 (não no eixo X como a textura usa em θ = 0).
      if (Math.abs(x) > 1e-4 || z <= 0) continue
      const key = position.getY(i).toFixed(3)
      const entry = rows.get(key) ?? []
      entry.push({
        radius: Math.hypot(x, z),
        normal: [normal.getX(i), normal.getY(i), normal.getZ(i)],
      })
      rows.set(key, entry)
    }

    let pairs = 0
    for (const entry of rows.values()) {
      if (entry.length < 2) continue
      // Em alturas repetidas no perfil, os dois maiores raios são o par da
      // emenda, pois todo ponto do perfil aparece nas duas colunas.
      const [a, b] = [...entry].sort((left, right) => right.radius - left.radius)
      pairs += 1
      expect(a.radius).toBeCloseTo(b.radius, 4)
      expect(a.normal[0]).toBeCloseTo(b.normal[0], 4)
      expect(a.normal[1]).toBeCloseTo(b.normal[1], 4)
      expect(a.normal[2]).toBeCloseTo(b.normal[2], 4)
    }
    expect(pairs).toBeGreaterThan(50)
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
