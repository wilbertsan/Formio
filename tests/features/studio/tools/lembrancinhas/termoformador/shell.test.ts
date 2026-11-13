import { describe, it, expect } from 'vitest'
import {
  buildBodyShell,
  buildLidShell,
  buildRingShell,
} from '@/features/studio/tools/lembrancinhas/termoformador/shell'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('shell', () => {
  it('corpo é fechado e respeita as dimensões externas', () => {
    const geometry = buildBodyShell({
      outer: { width: 100, depth: 60, radius: 10 },
      inner: { width: 95.2, depth: 55.2, radius: 7.6 },
      rimInner: { width: 94, depth: 54, radius: 7 },
      bottomThickness: 2.4,
      height: 60,
      rimHeight: 3,
      chamfer: 0.4,
      segments: 64,
    })

    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.x).toBeCloseTo(-50, 1)
    expect(box.max.x).toBeCloseTo(50, 1)
    expect(box.min.z).toBeCloseTo(-30, 1)
    expect(box.max.z).toBeCloseTo(30, 1)
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(box.max.y).toBeCloseTo(63, 1)
    expect(geometry.getAttribute('position').count).toBeGreaterThan(1000)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('corpo sem chanfro e sem borda mantém a altura', () => {
    const geometry = buildBodyShell({
      outer: { width: 100, depth: 60, radius: 10 },
      inner: { width: 95.2, depth: 55.2, radius: 7.6 },
      rimInner: { width: 94, depth: 54, radius: 7 },
      bottomThickness: 2.4,
      height: 60,
      rimHeight: 0,
      chamfer: 0,
      segments: 64,
    })

    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.max.y).toBeCloseTo(60, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('tampa é fechada e tem a altura total', () => {
    const geometry = buildLidShell({
      outer: { width: 106, depth: 66, radius: 13 },
      inner: { width: 100.8, depth: 60.8, radius: 10.3 },
      totalHeight: 14.4,
      plateThickness: 2.4,
      chamfer: 0.4,
      segments: 64,
    })

    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(box.max.y).toBeCloseTo(14.4, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('tampa não cresce quando a placa é mais espessa que a altura', () => {
    const geometry = buildLidShell({
      outer: { width: 106, depth: 66, radius: 13 },
      inner: { width: 100.8, depth: 60.8, radius: 10.3 },
      totalHeight: 14.4,
      plateThickness: 20,
      chamfer: 0.4,
      segments: 64,
    })

    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.max.y).toBeCloseTo(14.4, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('tampa sem chanfro continua fechada', () => {
    const geometry = buildLidShell({
      outer: { width: 106, depth: 66, radius: 13 },
      inner: { width: 100.8, depth: 60.8, radius: 10.3 },
      totalHeight: 14.4,
      plateThickness: 2.4,
      chamfer: 0,
      segments: 64,
    })

    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.max.y).toBeCloseTo(14.4, 1)
    expect(isClosed(geometry)).toBe(true)
  })

  it('anel sem chanfro é fechado e tem volume positivo', () => {
    const geometry = buildRingShell({
      outer: { width: 100, depth: 60, radius: 10 },
      inner: { width: 90, depth: 50, radius: 5 },
      height: 20,
      chamfer: 0,
      segments: 128,
    })

    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('anel com chanfro grande é fechado e tem volume positivo', () => {
    const geometry = buildRingShell({
      outer: { width: 100, depth: 60, radius: 10 },
      inner: { width: 90, depth: 50, radius: 5 },
      height: 20,
      chamfer: 10,
      segments: 128,
    })

    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(box.max.y).toBeCloseTo(20, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })
})
