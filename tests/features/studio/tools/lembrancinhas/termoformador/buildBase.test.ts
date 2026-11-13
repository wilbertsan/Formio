import { describe, it, expect } from 'vitest'
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type BufferGeometry,
} from 'three'
import {
  buildBase,
  getBaseDimensions,
} from '@/features/studio/tools/lembrancinhas/termoformador/buildBase'
import {
  defaultThermoformerParams,
  MINIMUM_FEATURE_MM,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

function horizontalHits(
  geometry: BufferGeometry,
  y: number,
  fromX: number,
  dirX: 1 | -1,
  z = 0,
): number[] {
  const material = new MeshBasicMaterial({ side: DoubleSide })
  const mesh = new Mesh(geometry, material)
  const ray = new Raycaster(new Vector3(fromX, y, z), new Vector3(dirX, 0, 0))
  const hits = ray.intersectObject(mesh, false)
  material.dispose()
  return hits.map((hit) => hit.point.x)
}

function innerBoundaryX(geometry: BufferGeometry, y: number, z = 0): number {
  return Math.min(...horizontalHits(geometry, y, 0, 1, z).filter((x) => x > 0))
}

function outerBoundaryX(
  geometry: BufferGeometry,
  y: number,
  outerWidth: number,
  z = 0,
): number {
  return Math.max(
    ...horizontalHits(geometry, y, outerWidth, -1, z).filter((x) => x > 0),
  )
}

function verticalHits(geometry: BufferGeometry, x: number): number {
  const ray = new Raycaster(new Vector3(x, 100, 0), new Vector3(0, -1, 0))
  return ray.intersectObject(new Mesh(geometry), false).length
}

/** Mede o anel do canto da face inferior ao longo da diagonal de 45°. */
function capCornerRing(params: typeof defaultThermoformerParams): number {
  const dims = getBaseDimensions(params)
  const { outer, inner, height, chamfer } = dims

  const flatRing = Math.min(
    (outer.width - inner.width) / 2,
    (outer.depth - inner.depth) / 2,
  )
  const cornerRing = Math.max(0, outer.radius - inner.radius)
  const ringThickness = Math.min(flatRing, cornerRing > 0 ? cornerRing : flatRing)
  const chamferLimit = Math.max(
    0,
    (ringThickness - (MINIMUM_FEATURE_MM + 0.02)) / 2,
  )
  const bevel = Math.max(
    0,
    Math.min(chamfer, height * 0.45, chamferLimit),
  )

  const outerCapHalfW = (outer.width - 2 * bevel) / 2
  const outerCapHalfD = (outer.depth - 2 * bevel) / 2
  const outerCapRadius = Math.min(
    outer.radius - bevel,
    outerCapHalfW,
    outerCapHalfD,
  )
  const cx = outerCapHalfW - outerCapRadius
  const cz = outerCapHalfD - outerCapRadius

  const geometry = buildBase(params)
  const material = new MeshBasicMaterial({ side: DoubleSide })
  const mesh = new Mesh(geometry, material)
  const ray = new Raycaster(
    new Vector3(cx, 0.01, cz),
    new Vector3(1, 0, 1).normalize(),
  )
  const hits = ray.intersectObject(mesh, false)
  material.dispose()

  const distances: number[] = []
  for (const hit of hits) {
    if (!distances.some((distance) => Math.abs(distance - hit.distance) < 1e-4)) {
      distances.push(hit.distance)
    }
  }
  distances.sort((a, b) => a - b)

  expect(distances.length).toBeGreaterThanOrEqual(2)
  return distances[1] - distances[0]
}

describe('getBaseDimensions', () => {
  it('mantém o furo no raio do corpo quando o corpo tem cantos vivos', () => {
    const params = {
      ...defaultThermoformerParams,
      cornerRadius: 0,
      baseCornerRadius: 13,
    }
    const dims = getBaseDimensions(params)

    expect(dims.inner.width).toBeCloseTo(
      params.width + 2 * params.printClearance,
      10,
    )
    expect(dims.inner.depth).toBeCloseTo(
      params.depth + 2 * params.printClearance,
      10,
    )
    expect(dims.inner.radius).toBeLessThanOrEqual(params.printClearance + 1e-6)
  })

  it('limita o furo ao raio do corpo mais a folga de impressão', () => {
    const params = {
      ...defaultThermoformerParams,
      cornerRadius: 10,
      baseCornerRadius: 14,
    }
    const dims = getBaseDimensions(params)

    expect(dims.inner.radius).toBeLessThanOrEqual(
      params.cornerRadius + params.printClearance + 1e-6,
    )
  })

  it('aplica o teto de raio no valor padrão da base', () => {
    const params = {
      ...defaultThermoformerParams,
      cornerRadius: 10,
      baseCornerRadius: 13,
    }
    const dims = getBaseDimensions(params)

    expect(dims.inner.radius).toBeLessThanOrEqual(
      params.cornerRadius + params.printClearance + 1e-6,
    )
  })

  it('garante anel de pelo menos baseThickness quando o pedido permite', () => {
    const params = {
      ...defaultThermoformerParams,
      baseThickness: 6,
      baseCornerRadius: 13,
    }
    const dims = getBaseDimensions(params)

    expect(dims.outer.radius - dims.inner.radius).toBeGreaterThanOrEqual(
      params.baseThickness - 1e-6,
    )
  })
})

describe('buildBase', () => {
  it('gera um anel fechado com as dimensões externas padrão', () => {
    const params = defaultThermoformerParams
    const geometry = buildBase(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.max.x - box.min.x).toBeCloseTo(165.3, 1)
    expect(box.max.z - box.min.z).toBeCloseTo(125.3, 1)
    expect(box.max.y - box.min.y).toBeCloseTo(6, 1)
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('é vazado no centro e sólido no anel', () => {
    const params = defaultThermoformerParams
    const geometry = buildBase(params)

    expect(verticalHits(geometry, 0)).toBe(0)

    const edgeX = params.width / 2 + params.printClearance + params.baseThickness / 2
    expect(verticalHits(geometry, edgeX)).toBeGreaterThan(0)
  })

  it('preserva a abertura nominal no meio da altura', () => {
    const params = defaultThermoformerParams
    const geometry = buildBase(params)
    const innerWidth = params.width + 2 * params.printClearance

    const boundary = innerBoundaryX(geometry, params.baseHeight / 2)
    expect(Math.abs(boundary - innerWidth / 2)).toBeLessThan(0.05)
  })

  it('aceita altura zero com espessura mínima', () => {
    const geometry = buildBase({ ...defaultThermoformerParams, baseHeight: 0 })
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.y).toBeCloseTo(0.2, 2)
    expect(isClosed(geometry)).toBe(true)
  })

  it('fecha a malha com cantos vivos', () => {
    const params = { ...defaultThermoformerParams, baseCornerRadius: 0 }
    const geometry = buildBase(params)
    const innerWidth = params.width + 2 * params.printClearance

    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    const boundary = innerBoundaryX(geometry, params.baseHeight / 2)
    expect(Math.abs(boundary - innerWidth / 2)).toBeLessThan(0.05)
  })

  it('preserva o anel da tampa em parâmetros extremos', () => {
    const params = {
      ...defaultThermoformerParams,
      baseThickness: 6,
      baseCornerRadius: 6,
      edgeChamfer: 3,
      baseHeight: 20,
    }
    const innerWidth = params.width + 2 * params.printClearance
    const outerWidth = innerWidth + 2 * params.baseThickness

    const geometry = buildBase(params)
    const inner = innerBoundaryX(geometry, 0.01)
    const outer = outerBoundaryX(geometry, 0.01, outerWidth)

    expect(outer - inner).toBeGreaterThanOrEqual(MINIMUM_FEATURE_MM - 0.05)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('preserva o anel da tampa em pegada larga e fina', () => {
    const params = {
      ...defaultThermoformerParams,
      width: 300,
      depth: 60,
      printClearance: 0.3,
      baseThickness: 6,
      edgeChamfer: 3,
      baseHeight: 20,
      baseCornerRadius: 40,
    }
    const innerWidth = params.width + 2 * params.printClearance
    const outerWidth = innerWidth + 2 * params.baseThickness

    const geometry = buildBase(params)
    // No formato stadium o raio encosta na metade da profundidade; z=0 é a
    // tangente exata do arco e o raio rasante não intersecta a parede interna.
    const inner = innerBoundaryX(geometry, 0.01, 0.05)
    const outer = outerBoundaryX(geometry, 0.01, outerWidth, 0.05)

    expect(outer - inner).toBeGreaterThanOrEqual(MINIMUM_FEATURE_MM - 0.05)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('preserva o anel do canto da tampa em parâmetros extremos', () => {
    const params = {
      ...defaultThermoformerParams,
      baseThickness: 6,
      baseCornerRadius: 6,
      edgeChamfer: 3,
      baseHeight: 20,
    }
    const geometry = buildBase(params)
    const ring = capCornerRing(params)

    expect(ring).toBeGreaterThanOrEqual(MINIMUM_FEATURE_MM - 0.02)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('preserva o anel do canto da tampa em pegada larga e fina', () => {
    const params = {
      ...defaultThermoformerParams,
      width: 300,
      depth: 60,
      printClearance: 0.3,
      baseThickness: 6,
      edgeChamfer: 3,
      baseHeight: 20,
      baseCornerRadius: 40,
    }
    const geometry = buildBase(params)
    const ring = capCornerRing(params)

    expect(ring).toBeGreaterThanOrEqual(MINIMUM_FEATURE_MM - 0.02)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('fecha a malha sem chanfro e com raio igual à espessura', () => {
    const params = {
      ...defaultThermoformerParams,
      baseThickness: 6,
      baseCornerRadius: 6,
      edgeChamfer: 0,
      baseHeight: 20,
    }
    const geometry = buildBase(params)

    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })
})
