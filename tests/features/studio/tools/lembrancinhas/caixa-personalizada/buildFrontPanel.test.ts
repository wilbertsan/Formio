import { describe, it, expect } from 'vitest'
import { buildFrontPanel } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/buildFrontPanel'
import { computePanelPattern } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/panelPattern'
import { defaultBoxParams } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildFrontPanel', () => {
  it('gera placa fechada com as dimensões e espessura', () => {
    const params = defaultBoxParams
    const geometry = buildFrontPanel(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-params.frontPanelWidth / 2, 1)
    expect(box.max.x).toBeCloseTo(params.frontPanelWidth / 2, 1)
    expect(box.min.y).toBeCloseTo(-params.frontPanelHeight / 2, 1)
    expect(box.max.y).toBeCloseTo(params.frontPanelHeight / 2, 1)
    expect(box.min.z).toBeCloseTo(0, 1)
    expect(box.max.z).toBeCloseTo(params.frontPanelThickness, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('furos aumentam a contagem de vértices em relação a uma placa sem furos', () => {
    const withHoles = buildFrontPanel(defaultBoxParams)
    const withoutHoles = buildFrontPanel({
      ...defaultBoxParams,
      frontPanelWidth: 40,
      frontPanelHeight: 40,
      borderWidth: 20,
    })
    expect(withHoles.getAttribute('position').count)
      .toBeGreaterThan(withoutHoles.getAttribute('position').count)
  })

  it('curvatura convexa empurra só a face frontal', () => {
    const flat = buildFrontPanel(defaultBoxParams)
    const convex = buildFrontPanel({ ...defaultBoxParams, surfaceCurvature: 'slightly_convex' })
    const concave = buildFrontPanel({ ...defaultBoxParams, surfaceCurvature: 'slightly_concave' })

    flat.computeBoundingBox()
    convex.computeBoundingBox()
    concave.computeBoundingBox()

    expect(convex.boundingBox!.max.z).toBeGreaterThan(flat.boundingBox!.max.z)
    expect(concave.boundingBox!.max.z).toBeLessThan(flat.boundingBox!.max.z)
    expect(convex.boundingBox!.min.z).toBeCloseTo(0, 3)
    expect(concave.boundingBox!.min.z).toBeCloseTo(0, 3)
  })

  it('o padrão default gera furos', () => {
    expect(computePanelPattern(defaultBoxParams).holes.length).toBeGreaterThan(0)
  })

  it('grade quadrada sem rotação gera malha fechada', () => {
    const geometry = buildFrontPanel({
      ...defaultBoxParams,
      pattern: 'grid',
      gridAngle: 0,
      surfaceCurvature: 'flat',
    })

    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('grade losango sem rotação gera malha fechada', () => {
    const geometry = buildFrontPanel({
      ...defaultBoxParams,
      pattern: 'mesh',
      gridAngle: 0,
      surfaceCurvature: 'flat',
    })

    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })
})
