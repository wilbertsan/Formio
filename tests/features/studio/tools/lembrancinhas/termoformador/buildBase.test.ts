import { describe, it, expect } from 'vitest'
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type BufferGeometry,
} from 'three'
import { buildBase } from '@/features/studio/tools/lembrancinhas/termoformador/buildBase'
import {
  defaultThermoformerParams,
  MINIMUM_FEATURE_MM,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

function innerBoundaryX(geometry: BufferGeometry, y: number): number {
  const ray = new Raycaster(new Vector3(0, y, 0), new Vector3(1, 0, 0))
  const hits = ray.intersectObject(new Mesh(geometry), false)
  expect(hits.length).toBeGreaterThan(0)
  return hits[0].point.x
}

function outerBoundaryX(geometry: BufferGeometry, y: number, outerWidth: number): number {
  const ray = new Raycaster(new Vector3(outerWidth, y, 0), new Vector3(-1, 0, 0))
  const hits = ray.intersectObject(new Mesh(geometry), false)
  expect(hits.length).toBeGreaterThan(0)
  return hits[0].point.x
}

describe('buildBase', () => {
  it('gera um anel fechado com folga em volta do corpo', () => {
    const params = defaultThermoformerParams
    const geometry = buildBase(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const outerWidth = params.width + 2 * (params.printClearance + params.baseThickness)
    const outerDepth = params.depth + 2 * (params.printClearance + params.baseThickness)

    expect(box.max.x - box.min.x).toBeCloseTo(outerWidth, 1)
    expect(box.max.z - box.min.z).toBeCloseTo(outerDepth, 1)
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(box.max.y).toBeCloseTo(params.baseHeight, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('é vazado no centro', () => {
    const params = defaultThermoformerParams
    const geometry = buildBase(params)
    const centerRay = new Raycaster(new Vector3(0, 100, 0), new Vector3(0, -1, 0))
    expect(centerRay.intersectObject(new Mesh(geometry), false)).toHaveLength(0)

    const edgeRay = new Raycaster(
      new Vector3((params.width / 2) + params.printClearance + params.baseThickness / 2, 100, 0),
      new Vector3(0, -1, 0),
    )
    expect(edgeRay.intersectObject(new Mesh(geometry), false).length).toBeGreaterThan(0)
  })

  it('preserva a abertura nominal no meio da altura', () => {
    const params = defaultThermoformerParams
    const geometry = buildBase(params)
    const innerWidth = params.width + 2 * params.printClearance

    const boundary = innerBoundaryX(geometry, params.baseHeight / 2)
    expect(Math.abs(boundary - innerWidth / 2)).toBeLessThan(0.05)
  })

  it('mantém o anel da tampa acima da espessura mínima', () => {
    const params = {
      ...defaultThermoformerParams,
      baseThickness: 1.2,
      edgeChamfer: 3,
      baseHeight: 20,
    }
    const geometry = buildBase(params)
    const outerWidth = params.width + 2 * (params.printClearance + params.baseThickness)

    const inner = innerBoundaryX(geometry, 0.01)
    const outer = outerBoundaryX(geometry, 0.01, outerWidth)
    expect(outer - inner).toBeGreaterThanOrEqual(MINIMUM_FEATURE_MM - 1e-3)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
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
    const geometry = buildBase(params)
    const outerWidth = params.width + 2 * (params.printClearance + params.baseThickness)

    const inner = innerBoundaryX(geometry, 0.01)
    const outer = outerBoundaryX(geometry, 0.01, outerWidth)
    expect(outer - inner).toBeGreaterThanOrEqual(MINIMUM_FEATURE_MM - 1e-3)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('preserva o anel de canto da tampa em canto interno vivo', () => {
    const params = {
      ...defaultThermoformerParams,
      baseThickness: 6,
      baseCornerRadius: 6,
      edgeChamfer: 3,
      baseHeight: 20,
    }

    // Mesmo clamp aplicado em buildBase: canto interno vivo (0) com bevel
    // limitado para o anel de canto não colapsar na diagonal da tampa.
    const innerWidth = params.width + 2 * params.printClearance
    const innerDepth = params.depth + 2 * params.printClearance
    const outerWidth = innerWidth + 2 * params.baseThickness
    const outerDepth = innerDepth + 2 * params.baseThickness
    const innerRadius = Math.max(
      0,
      Math.min(
        params.baseCornerRadius - params.baseThickness,
        innerWidth / 2 - 0.1,
        innerDepth / 2 - 0.1,
      ),
    )
    const height = Math.max(0.2, params.baseHeight)
    const sharpInner = innerRadius <= 0.01
    const maxBevelByRing = Math.max(
      0,
      (params.baseThickness - MINIMUM_FEATURE_MM) / 2 - 0.15,
    )
    const cornerBevelLimit = sharpInner
      ? Math.max(0, (params.baseCornerRadius - MINIMUM_FEATURE_MM) / (1 + Math.SQRT2))
      : Number.POSITIVE_INFINITY
    const bevel = Math.min(
      params.edgeChamfer,
      height * 0.4,
      params.baseThickness * 0.5,
      maxBevelByRing,
      cornerBevelLimit,
    )

    const outerCapHalfW = (outerWidth - 2 * bevel) / 2
    const outerCapHalfD = (outerDepth - 2 * bevel) / 2
    const outerCapRadius = Math.min(
      params.baseCornerRadius - bevel,
      outerCapHalfW,
      outerCapHalfD,
    )
    const cx = outerCapHalfW - outerCapRadius
    const cz = outerCapHalfD - outerCapRadius
    const y = 0.01

    const geometry = buildBase(params)
    const ray = new Raycaster(
      new Vector3(cx, y, cz),
      new Vector3(1, 0, 1).normalize(),
    )
    // DoubleSide: o raio parte do furo e sai pela parede externa, cuja normal
    // aponta para fora do sólido (face traseira para o raio).
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }))
    const hits = ray
      .intersectObject(mesh, false)
      .filter((hit) => Math.abs(hit.point.y - y) < 0.02)
      .sort((a, b) => a.distance - b.distance)
      // O arco externo é atingido por duas faces no mesmo ponto; colapsamos
      // duplicatas para ficar com exatamente a parede interna e a externa.
      .filter((hit, index, all) => index === 0 || hit.distance - all[index - 1].distance > 1e-4)

    expect(hits.length).toBeGreaterThanOrEqual(2)
    const cornerRing = hits[1].distance - hits[0].distance
    expect(cornerRing).toBeGreaterThanOrEqual(MINIMUM_FEATURE_MM - 0.05)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('aceita altura zero com espessura mínima', () => {
    const geometry = buildBase({ ...defaultThermoformerParams, baseHeight: 0 })
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.y).toBeCloseTo(0.2, 2)
  })
})
