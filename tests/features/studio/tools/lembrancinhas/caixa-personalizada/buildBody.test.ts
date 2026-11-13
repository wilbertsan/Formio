import { describe, it, expect } from 'vitest'
import { Mesh, Raycaster, Vector3 } from 'three'
import { buildBody } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/buildBody'
import { defaultBoxParams } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildBody', () => {
  it('ocupa as dimensões externas e é fechado', () => {
    const params = defaultBoxParams
    const geometry = buildBody(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-params.width / 2, 1)
    expect(box.max.x).toBeCloseTo(params.width / 2, 1)
    expect(box.min.z).toBeCloseTo(-params.depth / 2, 1)
    expect(box.max.z).toBeCloseTo(params.depth / 2, 1)
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(box.max.y).toBeCloseTo(params.height + params.rimHeight, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('tem cavidade: o raio central atinge o fundo interno', () => {
    const params = defaultBoxParams
    const geometry = buildBody(params)
    const raycaster = new Raycaster(
      new Vector3(0, params.height + 50, 0),
      new Vector3(0, -1, 0),
    )
    const hits = raycaster.intersectObject(new Mesh(geometry), false)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].point.y).toBeCloseTo(params.bottomThickness, 1)
  })

  it('tem rim acima da parede', () => {
    const params = { ...defaultBoxParams, rimHeight: 8 }
    const geometry = buildBody(params)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.y).toBeCloseTo(params.height + 8, 1)
  })
})
