import { describe, it, expect } from 'vitest'
import { Mesh, Raycaster, Vector3, type BufferGeometry } from 'three'
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

  it('aceita altura zero com espessura mínima', () => {
    const geometry = buildBase({ ...defaultThermoformerParams, baseHeight: 0 })
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.y).toBeCloseTo(0.2, 2)
  })
})
