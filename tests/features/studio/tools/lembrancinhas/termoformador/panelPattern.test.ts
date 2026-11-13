import { describe, it, expect } from 'vitest'
import { computePanelPattern } from '@/features/studio/tools/lembrancinhas/termoformador/panelPattern'
import {
  MAX_PANEL_OPENINGS,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('computePanelPattern', () => {
  it('gera furos dentro da região interna por padrão', () => {
    const pattern = computePanelPattern(defaultThermoformerParams)
    expect(pattern.holes.length).toBeGreaterThan(0)
    expect(pattern.capped).toBe(false)
    const halfWidth = pattern.innerWidth / 2
    const halfHeight = pattern.innerHeight / 2
    for (const hole of pattern.holes) {
      const half = hole.size / 2
      expect(Math.abs(hole.x) + half).toBeLessThanOrEqual(halfWidth + 1e-6)
      expect(Math.abs(hole.y) + half).toBeLessThanOrEqual(halfHeight + 1e-6)
    }
  })

  it('não gera furos quando a moldura consome a área', () => {
    const pattern = computePanelPattern({
      ...defaultThermoformerParams,
      frontPanelWidth: 40,
      frontPanelHeight: 40,
      borderWidth: 20,
    })
    expect(pattern.holes).toHaveLength(0)
  })

  it('limita a quantidade de aberturas', () => {
    const pattern = computePanelPattern({
      ...defaultThermoformerParams,
      frontPanelWidth: 300,
      frontPanelHeight: 300,
      borderWidth: 3,
      holeSpacingX: 1,
      holeSpacingY: 1,
    })
    expect(pattern.capped).toBe(true)
    expect(pattern.holes.length).toBeLessThanOrEqual(MAX_PANEL_OPENINGS)
  })

  it('muda o tipo e o ângulo conforme o padrão', () => {
    const grid = computePanelPattern({ ...defaultThermoformerParams, pattern: 'grid', gridAngle: 30 })
    const mesh = computePanelPattern({ ...defaultThermoformerParams, pattern: 'mesh', gridAngle: 0 })
    expect(grid.holes.every((hole) => hole.kind === 'square')).toBe(true)
    expect(mesh.holes.every((hole) => hole.kind === 'diamond')).toBe(true)
    expect(mesh.holes[0].angle).toBeCloseTo(Math.PI / 4, 5)
  })

  it('reduz o furo para preservar a nervura', () => {
    const pattern = computePanelPattern({
      ...defaultThermoformerParams,
      holeDiameter: 6,
      holeSpacingX: 2,
      holeSpacingY: 2,
      gridThickness: 1.2,
    })
    expect(pattern.effectiveSize).toBeLessThan(6)
    expect(pattern.effectiveRib).toBeGreaterThanOrEqual(1.2 - 1e-6)
  })
})
