import { describe, it, expect } from 'vitest'
import {
  computePanelPattern,
  isInsideRoundedRect,
} from '@/features/studio/tools/lembrancinhas/caixa-personalizada/panelPattern'
import {
  MAX_PANEL_OPENINGS,
  defaultBoxParams,
} from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'

describe('isInsideRoundedRect', () => {
  const halfWidth = 147
  const halfHeight = 147
  const radius = 37

  it('aceita pontos sobre e dentro do raio do canto', () => {
    expect(
      isInsideRoundedRect(136.16, 136.16, halfWidth, halfHeight, radius),
    ).toBe(true)
    expect(
      isInsideRoundedRect(0, 146, halfWidth, halfHeight, radius),
    ).toBe(true)
  })

  it('rejeita pontos fora do raio ou do contorno', () => {
    expect(
      isInsideRoundedRect(136.18, 136.18, halfWidth, halfHeight, radius),
    ).toBe(false)
    expect(
      isInsideRoundedRect(146.5, 146.5, halfWidth, halfHeight, radius),
    ).toBe(false)
  })

  it('trata raio zero como retângulo puro', () => {
    expect(isInsideRoundedRect(146, 146, halfWidth, halfHeight, 0)).toBe(true)
  })

  it('mantém o limite exato do arco com tolerância numérica', () => {
    const cornerOffset = halfWidth - radius + radius / Math.sqrt(2)
    expect(
      isInsideRoundedRect(cornerOffset, cornerOffset, halfWidth, halfHeight, radius),
    ).toBe(true)
    expect(
      isInsideRoundedRect(
        cornerOffset + 1e-3,
        cornerOffset + 1e-3,
        halfWidth,
        halfHeight,
        radius,
      ),
    ).toBe(false)
  })
})

describe('computePanelPattern', () => {
  it('gera furos dentro da região interna por padrão', () => {
    const pattern = computePanelPattern(defaultBoxParams)
    expect(pattern.holes).toHaveLength(175)
    expect(pattern.rows).toBe(7)
    expect(pattern.cols).toBe(25)
    expect(pattern.latticeRows * pattern.latticeCols).toBeLessThanOrEqual(MAX_PANEL_OPENINGS)
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
      ...defaultBoxParams,
      frontPanelWidth: 40,
      frontPanelHeight: 40,
      borderWidth: 20,
    })
    expect(pattern.holes).toHaveLength(0)
    expect(pattern.rows).toBe(0)
    expect(pattern.cols).toBe(0)
    expect(pattern.innerRadius).toBe(0)
    expect(pattern.effectiveSize).toBe(0)
  })

  it('limita a quantidade de aberturas', () => {
    const pattern = computePanelPattern({
      ...defaultBoxParams,
      frontPanelWidth: 300,
      frontPanelHeight: 300,
      borderWidth: 3,
      holeSpacingX: 1,
      holeSpacingY: 1,
    })
    expect(pattern.capped).toBe(true)
    expect(pattern.latticeRows * pattern.latticeCols).toBeLessThanOrEqual(MAX_PANEL_OPENINGS)
    expect(pattern.effectiveSpacingX).toBeGreaterThan(1)
    expect(pattern.holes.length).toBeLessThanOrEqual(MAX_PANEL_OPENINGS)
  })

  it('muda o tipo e o ângulo conforme o padrão', () => {
    const grid = computePanelPattern({ ...defaultBoxParams, pattern: 'grid', gridAngle: 30 })
    const mesh = computePanelPattern({ ...defaultBoxParams, pattern: 'mesh', gridAngle: 0 })
    expect(grid.holes.every((hole) => hole.kind === 'square')).toBe(true)
    expect(mesh.holes.every((hole) => hole.kind === 'diamond')).toBe(true)
    expect(grid.holes[0].angle).toBeCloseTo(Math.PI / 6, 5)
    expect(mesh.holes[0].angle).toBeCloseTo(Math.PI / 4, 5)

    const halfWidth = grid.innerWidth / 2
    const halfHeight = grid.innerHeight / 2
    for (const hole of grid.holes) {
      const projection = Math.abs(Math.cos(hole.angle)) + Math.abs(Math.sin(hole.angle))
      const half = (hole.size * projection) / 2
      expect(Math.abs(hole.x) + half).toBeLessThanOrEqual(halfWidth + 1e-6)
      expect(Math.abs(hole.y) + half).toBeLessThanOrEqual(halfHeight + 1e-6)
    }
  })

  it('mantém todos os furos dentro do contorno arredondado', () => {
    const pattern = computePanelPattern({
      ...defaultBoxParams,
      frontPanelWidth: 300,
      frontPanelHeight: 300,
      borderWidth: 3,
      frontPanelCornerRadius: 40,
      holeSpacingX: 5,
      holeSpacingY: 5,
    })
    expect(pattern.holes.length).toBeGreaterThan(0)
    expect(pattern.holes.length).toBeLessThan(pattern.latticeRows * pattern.latticeCols)
    const halfWidth = pattern.innerWidth / 2
    const halfHeight = pattern.innerHeight / 2
    const projection =
      Math.abs(Math.cos(pattern.holes[0].angle)) + Math.abs(Math.sin(pattern.holes[0].angle))
    for (const hole of pattern.holes) {
      const half = (hole.size * projection) / 2
      expect(isInsideRoundedRect(hole.x - half, hole.y - half, halfWidth, halfHeight, pattern.innerRadius)).toBe(true)
      expect(isInsideRoundedRect(hole.x + half, hole.y - half, halfWidth, halfHeight, pattern.innerRadius)).toBe(true)
      expect(isInsideRoundedRect(hole.x - half, hole.y + half, halfWidth, halfHeight, pattern.innerRadius)).toBe(true)
      expect(isInsideRoundedRect(hole.x + half, hole.y + half, halfWidth, halfHeight, pattern.innerRadius)).toBe(true)
    }
  })

  it('distingue linhas/colunas da malha das efetivamente usadas', () => {
    const pattern = computePanelPattern({
      ...defaultBoxParams,
      frontPanelWidth: 100,
      frontPanelHeight: 100,
      borderWidth: 8,
      holeSpacingX: 6,
      holeSpacingY: 6,
    })
    expect(pattern.latticeRows).toBe(15)
    expect(pattern.latticeCols).toBe(15)
    expect(pattern.rows).toBe(13)
    expect(pattern.cols).toBe(13)
    expect(pattern.holes.length).toBeGreaterThan(0)
  })

  it('reduz o furo para preservar a nervura', () => {
    const pattern = computePanelPattern({
      ...defaultBoxParams,
      frontPanelWidth: 100,
      frontPanelHeight: 100,
      borderWidth: 8,
      holeDiameter: 6,
      holeSpacingX: 6,
      holeSpacingY: 6,
      gridThickness: 1.2,
    })
    expect(pattern.effectiveSize).toBeLessThan(6)
    expect(pattern.effectiveRib).toBeGreaterThanOrEqual(1.2 - 1e-6)
    expect(pattern.capped).toBe(false)
  })
})
