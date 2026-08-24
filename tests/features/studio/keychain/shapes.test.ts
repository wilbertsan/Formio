import * as THREE from 'three'
import { createBaseShape, createReinforcementRing, getRingPosition } from '@/features/studio/keychain/shapes'
import { defaultKeychainParams, RING_EDGE_MARGIN, type RingPosition } from '@/features/studio/keychain/schema'

const baseParams = { ...defaultKeychainParams }

function getRing(position: RingPosition) {
  return {
    position,
    innerDiameter: baseParams.ringInnerDiameter,
    thickness: baseParams.ringThickness,
    embedding: baseParams.ringEmbedding,
    lateralOffset: baseParams.ringLateralOffset,
    radialOffset: baseParams.ringRadialOffset,
  }
}

function boundingBox(shape: THREE.Shape): THREE.Box3 {
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.computeBoundingBox()
  return geometry.boundingBox!
}

describe('getRingPosition', () => {
  it('posiciona furo no topo com margem de 2mm da borda', () => {
    const pos = getRingPosition('rect', 50, 25, getRing('top'))
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(25 / 2 - RING_EDGE_MARGIN - baseParams.ringInnerDiameter / 2)
  })

  it('posiciona furo na base', () => {
    const pos = getRingPosition('rect', 50, 25, getRing('bottom'))
    expect(pos.y).toBeCloseTo(-25 / 2 + RING_EDGE_MARGIN + baseParams.ringInnerDiameter / 2)
  })

  it('posiciona furo à direita', () => {
    const pos = getRingPosition('rect', 50, 25, getRing('right'))
    expect(pos.x).toBeCloseTo(50 / 2 - RING_EDGE_MARGIN - baseParams.ringInnerDiameter / 2)
  })

  it('ajuste lateral move o furo na direção perpendicular', () => {
    const base = getRingPosition('rect', 50, 25, { ...getRing('top'), lateralOffset: 0 })
    const shifted = getRingPosition('rect', 50, 25, { ...getRing('top'), lateralOffset: 5 })
    expect(shifted.x).toBeCloseTo(base.x + 5)
    expect(shifted.y).toBeCloseTo(base.y)
  })

  it('ajuste radial move o furo para dentro da peça', () => {
    const base = getRingPosition('rect', 50, 25, { ...getRing('top'), radialOffset: 0 })
    const adjusted = getRingPosition('rect', 50, 25, { ...getRing('top'), radialOffset: 3 })
    expect(adjusted.y).toBeCloseTo(base.y - 3)
  })

  it('encaixe empurra o centro para dentro', () => {
    const noEmbed = getRingPosition('rect', 50, 25, { ...getRing('top'), embedding: 0 })
    const withEmbed = getRingPosition('rect', 50, 25, { ...getRing('top'), embedding: 2 })
    expect(withEmbed.y).toBeCloseTo(noEmbed.y - 2)
  })

  it('funciona para círculo', () => {
    const pos = getRingPosition('circle', 50, 50, getRing('top'))
    const r = 50 / 2
    expect(pos.y).toBeCloseTo(r - RING_EDGE_MARGIN - baseParams.ringInnerDiameter / 2)
  })
})

describe('createBaseShape', () => {
  it('gera furo dentro da peça com margem mínima de 2mm', () => {
    for (const baseShape of ['rect', 'circle', 'heart'] as const) {
      const shape = createBaseShape(baseShape, 50, 50, getRing('top'))
      const baseBB = boundingBox(shape)
      const hole = shape.holes[0]
      expect(hole).toBeDefined()
      const holeBB = new THREE.Box3().setFromPoints(hole.getPoints(32))
      const marginX = Math.min(
        holeBB.min.x - baseBB.min.x,
        baseBB.max.x - holeBB.max.x,
      )
      const marginY = Math.min(
        holeBB.min.y - baseBB.min.y,
        baseBB.max.y - holeBB.max.y,
      )
      expect(Math.min(marginX, marginY)).toBeGreaterThanOrEqual(RING_EDGE_MARGIN - 0.5)
    }
  })

  it('furo em todos os lados mantém margem mínima', () => {
    for (const position of ['top', 'bottom', 'left', 'right'] as const) {
      const shape = createBaseShape('rect', 50, 50, getRing(position))
      const baseBB = boundingBox(shape)
      const hole = shape.holes[0]
      const holeBB = new THREE.Box3().setFromPoints(hole.getPoints(32))
      const marginX = Math.min(holeBB.min.x - baseBB.min.x, baseBB.max.x - holeBB.max.x)
      const marginY = Math.min(holeBB.min.y - baseBB.min.y, baseBB.max.y - holeBB.max.y)
      expect(Math.min(marginX, marginY)).toBeGreaterThanOrEqual(RING_EDGE_MARGIN - 0.5)
    }
  })
})

describe('createReinforcementRing', () => {
  it('gera anel com furo interno', () => {
    const ringShape = createReinforcementRing(getRing('top'))
    expect(ringShape.holes).toHaveLength(1)
  })

  it('anel externo maior que furo interno', () => {
    const ringShape = createReinforcementRing(getRing('top'))
    const outerBB = boundingBox(ringShape)
    const holeBB = new THREE.Box3().setFromPoints(ringShape.holes[0].getPoints(32))
    const outerRadius = (outerBB.max.x - outerBB.min.x) / 2
    const holeRadius = (holeBB.max.x - holeBB.min.x) / 2
    expect(outerRadius).toBeGreaterThan(holeRadius)
  })
})
