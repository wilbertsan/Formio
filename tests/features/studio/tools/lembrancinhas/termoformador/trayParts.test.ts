import { describe, it, expect } from 'vitest'
import {
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type BufferGeometry,
} from 'three'
import { buildTraySupport } from '@/features/studio/tools/lembrancinhas/termoformador/trayParts'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { getTrayDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/tray'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { pathsBoundingBox } from '@/features/studio/tools/confeitaria/shared/textOutline'
import { isClosed, signedVolume, countZeroAreaTriangles } from './geometryTestUtils'

const starSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,3 61,38 98,38 68,59 79,95 50,73 21,95 32,59 2,38 39,38" fill="#000"/>
</svg>`

/**
 * Alturas das faces sob um raio vertical em (x, z). Um raio que passa na
 * aresta compartilhada por dois triângulos do mesmo cap conta os dois; a
 * altura é única.
 */
function supportHits(
  support: BufferGeometry,
  x: number,
  z: number,
): number[] {
  const material = new MeshBasicMaterial()
  const mesh = new Mesh(support, material)
  const ray = new Raycaster(new Vector3(x, 100, z), new Vector3(0, -1, 0))
  const heights: number[] = []
  for (const hit of ray.intersectObject(mesh)) {
    if (!heights.some((height) => Math.abs(height - hit.point.y) < 1e-4)) {
      heights.push(hit.point.y)
    }
  }
  material.dispose()
  return heights.sort((a, b) => a - b)
}

describe('buildTraySupport', () => {
  it('suporte quadrado ocupa o envelope e fica apoiado', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const support = buildTraySupport(params, outline)
    support.computeBoundingBox()
    const box = support.boundingBox!
    expect(box.min.y).toBeCloseTo(0, 2)
    expect(box.max.y).toBeCloseTo(dims.height, 2)
    expect(box.min.x).toBeCloseTo(dims.outerBounds.minX, 1)
    expect(box.max.x).toBeCloseTo(dims.outerBounds.maxX, 1)
    expect(box.min.z).toBeCloseTo(-dims.outerBounds.maxY, 1)
    expect(box.max.z).toBeCloseTo(-dims.outerBounds.minY, 1)
    expect(isClosed(support)).toBe(true)
    // Prisma maciço seria ~446.500 mm³; a cavidade derruba o volume para isso.
    expect(signedVolume(support)).toBeCloseTo(177090.22, 0)
    expect(countZeroAreaTriangles(support)).toBe(0)
    support.dispose()
  })

  it('cavidade é oca, degrau fica sob a moldura e topo na altura', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.effectiveStep).toBeCloseTo(params.frameWidth + params.fitClearance, 5)
    expect(dims.stepClamped).toBe(true)

    const cavityBounds = pathsBoundingBox(outline.cavityOpening!)
    const recessBounds = pathsBoundingBox(outline.recess!)
    const stepX = (cavityBounds.maxX + recessBounds.maxX) / 2
    const topX = (recessBounds.maxX + dims.outerBounds.maxX) / 2

    const support = buildTraySupport(params, outline)
    expect(supportHits(support, 0, 0)).toEqual([params.bottomThickness])
    expect(supportHits(support, stepX, 0)).toEqual([dims.seatY])
    expect(supportHits(support, topX, 0)).toEqual([dims.height])
    support.dispose()
  })

  it('suporte da pirâmide fecha e ocupa o envelope', () => {
    const params = { ...defaultThermoformerParams, shape: 'pyramid' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const support = buildTraySupport(params, outline)
    support.computeBoundingBox()
    const box = support.boundingBox!
    expect(box.min.y).toBeCloseTo(0, 2)
    expect(box.max.y).toBeCloseTo(dims.height, 2)
    expect(box.min.x).toBeCloseTo(dims.outerBounds.minX, 1)
    expect(box.max.x).toBeCloseTo(dims.outerBounds.maxX, 1)
    expect(box.min.z).toBeCloseTo(-dims.outerBounds.maxY, 1)
    expect(box.max.z).toBeCloseTo(-dims.outerBounds.minY, 1)
    expect(isClosed(support)).toBe(true)
    expect(signedVolume(support)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(support)).toBe(0)
    support.dispose()
  })

  it('suporte retangular ocupa o envelope assimétrico', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'rectangle' as const,
      width: 120,
      height: 80,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const support = buildTraySupport(params, outline)
    support.computeBoundingBox()
    const box = support.boundingBox!
    expect(box.min.x).toBeCloseTo(-64.3, 1)
    expect(box.max.x).toBeCloseTo(64.3, 1)
    expect(box.min.z).toBeCloseTo(-44.3, 1)
    expect(box.max.z).toBeCloseTo(44.3, 1)
    expect(box.min.y).toBeCloseTo(0, 2)
    expect(box.max.y).toBeCloseTo(dims.height, 2)
    expect(isClosed(support)).toBe(true)
    expect(signedVolume(support)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(support)).toBe(0)
    support.dispose()
  })

  it('mapeia o eixo z e não espelha o contorno do SVG', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'svg' as const,
      svgSize: 100,
      svg: starSvg,
    }
    const outline = getShapeOutline(params, parseSvg(starSvg))!
    // Uma ponta da estrela e um ponto interior dela no eixo vertical. O espelho
    // em z cai no vão inferior, fora do suporte.
    const tip = outline.points.reduce(
      (best, point) => (point.y > best.y ? point : best),
      outline.points[0],
    )
    const inside = { x: tip.x, y: tip.y * 0.75 }
    const support = buildTraySupport(params, outline)
    expect(supportHits(support, inside.x, -inside.y)).toHaveLength(1)
    expect(supportHits(support, inside.x, inside.y)).toHaveLength(0)
    support.dispose()
  })

  it('rejeita contorno circular com erro de forma', () => {
    const params = defaultThermoformerParams
    expect(() =>
      buildTraySupport(params, getShapeOutline(params)!),
    ).toThrow(/poligonais/)
  })
})
