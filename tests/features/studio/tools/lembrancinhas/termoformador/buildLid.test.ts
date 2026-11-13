import { describe, it, expect } from 'vitest'
import { Mesh, Raycaster, Vector3 } from 'three'
import {
  buildLid,
  getLidDimensions,
} from '@/features/studio/tools/lembrancinhas/termoformador/buildLid'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildLid', () => {
  it('tampa externa envolve o corpo e é fechada', () => {
    const params = defaultThermoformerParams
    const dims = getLidDimensions(params)
    const geometry = buildLid(params)

    expect(dims.outer.width).toBeCloseTo(params.width + 2 * (params.lidClearance + params.lidThickness), 3)
    expect(dims.outer.depth).toBeCloseTo(params.depth + 2 * (params.lidClearance + params.lidThickness), 3)
    expect(dims.bottomY).toBeCloseTo(params.height + params.rimHeight - params.lidFitDepth, 3)
    expect(dims.totalHeight).toBeCloseTo(params.lidFitDepth + params.lidHeight + params.lidThickness, 3)

    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 1)
    expect(geometry.boundingBox!.max.y).toBeCloseTo(dims.totalHeight, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('tampa interna encaixa na abertura do rim', () => {
    const params = { ...defaultThermoformerParams, fitType: 'internal' as const }
    const dims = getLidDimensions(params)
    const rimThickness = Math.max(params.wallThickness, params.rimThickness)
    expect(dims.outer.width).toBeCloseTo(params.width - 2 * rimThickness - 2 * params.lidClearance, 3)
    expect(isClosed(buildLid(params))).toBe(true)
    expect(signedVolume(buildLid(params))).toBeGreaterThan(0)
  })

  it('tem cavidade: raio de baixo atinge o teto interno', () => {
    const params = defaultThermoformerParams
    const dims = getLidDimensions(params)
    const geometry = buildLid(params)
    const raycaster = new Raycaster(new Vector3(0, -50, 0), new Vector3(0, 1, 0))
    const hits = raycaster.intersectObject(new Mesh(geometry), false)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].point.y).toBeCloseTo(dims.plateBottom, 1)
  })
})
