import * as THREE from 'three'
import {
  createStandGeometry,
  createStandShape,
  getEffectiveDepth,
  getRibBack,
  getRibRun,
  getStandWidth,
} from '@/features/studio/tools/letreiros/suporte-foto/shapes'
import {
  SLOT_GAP,
  defaultPhotoStandParams,
  type PhotoStandParams,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'

const RAD = Math.PI / 180

function profilePoints(params: PhotoStandParams): Array<[number, number]> {
  const { shape } = createStandShape(params).extractPoints(1)
  return shape.map((point) => [
    Number(point.x.toFixed(4)),
    Number(point.y.toFixed(4)),
  ])
}

function vertexKey(x: number, y: number, z: number): string {
  return `${x.toFixed(4)}|${y.toFixed(4)}|${z.toFixed(4)}`
}

function expectClosedManifold(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position')
  const ids = new Map<string, number>()
  const idOf = (index: number): number => {
    const key = vertexKey(position.getX(index), position.getY(index), position.getZ(index))
    const existing = ids.get(key)
    if (existing !== undefined) return existing
    const id = ids.size
    ids.set(key, id)
    return id
  }
  const index = geometry.getIndex()
  const order = index
    ? Array.from(index.array)
    : Array.from({ length: position.count }, (_, i) => i)

  const edges = new Map<string, number>()
  for (let i = 0; i < order.length; i += 3) {
    const triangle = [idOf(order[i]), idOf(order[i + 1]), idOf(order[i + 2])]
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge]
      const b = triangle[(edge + 1) % 3]
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
  }

  for (const count of edges.values()) {
    expect(count).toBe(2)
  }
}

describe('suporte-foto shapes', () => {
  it('deriva a largura da foto e da margem lateral', () => {
    expect(getStandWidth(defaultPhotoStandParams)).toBe(120)
    expect(getStandWidth({ ...defaultPhotoStandParams, photoSize: '15x20', sideMargin: 5 })).toBe(160)
  })

  it('calcula o avanço e o fundo do painel pelo ângulo', () => {
    expect(getRibRun(defaultPhotoStandParams)).toBeCloseTo(
      (25 - 3) / Math.tan(75 * RAD),
      6,
    )
    expect(getRibBack(defaultPhotoStandParams)).toBeCloseTo(
      3 + SLOT_GAP + (25 - 3) / Math.tan(75 * RAD) + 3,
      6,
    )
  })

  it('mantém a profundidade informada quando o perfil cabe', () => {
    expect(getEffectiveDepth(defaultPhotoStandParams)).toBe(40)
  })

  it('amplia a profundidade quando o perfil não cabe', () => {
    const tight: PhotoStandParams = {
      ...defaultPhotoStandParams,
      depth: 30,
      bandHeight: 40,
      thickness: 4,
      angle: 60,
    }
    expect(getEffectiveDepth(tight)).toBeGreaterThan(tight.depth)
    expect(getEffectiveDepth(tight)).toBeCloseTo(getRibBack(tight) + 2, 6)
  })

  it('gera o perfil com faixa, fenda de 2 mm e painel inclinado', () => {
    const params = defaultPhotoStandParams
    const depth = getEffectiveDepth(params)
    const run = getRibRun(params)
    const ribBack = getRibBack(params)
    const points = profilePoints(params)
    const expected: Array<[number, number]> = [
      [0, 0],
      [0, params.bandHeight],
      [-params.thickness, params.bandHeight],
      [-params.thickness, params.thickness],
      [-(params.thickness + SLOT_GAP), params.thickness],
      [-(params.thickness + SLOT_GAP + run), params.bandHeight],
      [-ribBack, params.bandHeight],
      [-ribBack, params.thickness],
      [-depth, params.thickness],
      [-depth, 0],
    ]

    for (const point of expected) {
      expect(points).toContainEqual([
        Number(point[0].toFixed(4)),
        Number(point[1].toFixed(4)),
      ])
    }
  })

  it('extruda na largura e centraliza a peça', () => {
    const geometry = createStandGeometry(defaultPhotoStandParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const size = box.getSize(new THREE.Vector3())

    expect(size.x).toBeCloseTo(120, 3)
    expect(size.y).toBeCloseTo(25, 3)
    expect(size.z).toBeCloseTo(40, 3)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5)
    expect((box.min.y + box.max.y) / 2).toBeCloseTo(0, 5)
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 5)
  })

  it('deixa a face do conteúdo voltada para +Z', () => {
    const geometry = createStandGeometry(defaultPhotoStandParams)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.z).toBeCloseTo(20, 5)
  })

  it('gera uma base fechada (cada aresta em dois triângulos)', () => {
    expectClosedManifold(createStandGeometry(defaultPhotoStandParams))
  })
})
