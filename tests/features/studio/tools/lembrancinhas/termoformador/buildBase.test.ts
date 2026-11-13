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

function horizontalHits(geometry: BufferGeometry, y: number, fromX: number, dirX: 1 | -1): number[] {
  const material = new MeshBasicMaterial({ side: DoubleSide })
  const mesh = new Mesh(geometry, material)
  const ray = new Raycaster(new Vector3(fromX, y, 0), new Vector3(dirX, 0, 0))
  const hits = ray.intersectObject(mesh, false)
  material.dispose()
  return hits.map((hit) => hit.point.x)
}

function innerBoundaryX(geometry: BufferGeometry, y: number): number {
  return Math.min(...horizontalHits(geometry, y, 0, 1).filter((x) => x > 0))
}

function outerBoundaryX(geometry: BufferGeometry, y: number, outerWidth: number): number {
  return Math.max(...horizontalHits(geometry, y, outerWidth, -1).filter((x) => x > 0))
}

function verticalHits(geometry: BufferGeometry, x: number): number {
  const ray = new Raycaster(new Vector3(x, 100, 0), new Vector3(0, -1, 0))
  return ray.intersectObject(new Mesh(geometry), false).length
}

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
    const inner = innerBoundaryX(geometry, 0.01)
    const outer = outerBoundaryX(geometry, 0.01, outerWidth)

    expect(outer - inner).toBeGreaterThanOrEqual(MINIMUM_FEATURE_MM - 0.05)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })
})
