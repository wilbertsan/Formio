import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import {
  buildHandle,
  buildHandleProfile,
  handlePlacement,
} from '@/features/studio/tools/lembrancinhas/termoformador/buildHandle'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('buildHandle', () => {
  it('perfil começa e termina no eixo', () => {
    const profile = buildHandleProfile(defaultThermoformerParams)
    expect(profile[0].x).toBe(0)
    expect(profile[profile.length - 1].x).toBe(0)
    expect(profile[profile.length - 1].y).toBeCloseTo(defaultThermoformerParams.handleLength, 5)
  })

  it('pino à direita cresce em +X a partir da face', () => {
    const params = defaultThermoformerParams
    const geometry = buildHandle(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.x).toBeCloseTo(params.width / 2, 1)
    expect(box.max.x).toBeCloseTo(params.width / 2 + params.handleLength, 1)
  })

  it('pino no topo cresce em +Y a partir da borda', () => {
    const params = { ...defaultThermoformerParams, handleSide: 'top' as const }
    const geometry = buildHandle(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const bodyTop = params.height + params.rimHeight
    expect(box.min.y).toBeCloseTo(bodyTop, 1)
    expect(box.max.y).toBeCloseTo(bodyTop + params.handleLength, 1)
  })

  it('posiciona o eixo para cada lateral', () => {
    const params = defaultThermoformerParams
    const right = new Vector3(0, 1, 0).applyMatrix4(handlePlacement(params))
    const left = new Vector3(0, 1, 0).applyMatrix4(handlePlacement({ ...params, handleSide: 'left' }))
    const top = new Vector3(0, 1, 0).applyMatrix4(handlePlacement({ ...params, handleSide: 'top' }))
    const bottom = new Vector3(0, 1, 0).applyMatrix4(handlePlacement({ ...params, handleSide: 'bottom' }))
    expect(right.x).toBeGreaterThan(params.width / 2)
    expect(left.x).toBeLessThan(-params.width / 2)
    expect(top.y).toBeGreaterThan(params.height)
    expect(bottom.y).toBeLessThan(0)
  })
})
