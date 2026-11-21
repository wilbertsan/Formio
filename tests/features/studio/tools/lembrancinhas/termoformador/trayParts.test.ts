import { describe, it, expect } from 'vitest'
import {
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type BufferGeometry,
} from 'three'
import {
  buildTrayPlug,
  buildTraySupport,
} from '@/features/studio/tools/lembrancinhas/termoformador/trayParts'
import {
  getShapeOutline,
  pointInPaths,
  type ShapeOutline,
} from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { getTrayDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/tray'
import {
  defaultThermoformerParams,
  PLUG_GRIP_MIN_MATERIAL_MM,
  PLUG_GRIP_OVERLAP_MM,
  type ThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { pathsBoundingBox } from '@/features/studio/tools/confeitaria/shared/textOutline'
import { isClosed, signedVolume, countZeroAreaTriangles } from './geometryTestUtils'

const starSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,3 61,38 98,38 68,59 79,95 50,73 21,95 32,59 2,38 39,38" fill="#000"/>
</svg>`

// Arcos concêntricos em (50, 50): barra de 17 mm, sem orelhas finas nas pontas.
const thickC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M80.31 32.5 A35 35 0 1 0 80.31 67.5 L65.59 59 A18 18 0 1 1 65.59 41 Z" fill="#000"/>
</svg>`

const thinC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M80 30 A35 35 0 1 0 80 70 L73 63 A27 27 0 1 1 73 37 Z" fill="#000"/>
</svg>`

type SvgOverrides = Partial<
  Omit<ThermoformerParams, 'productType' | 'shape' | 'svg'>
>

function svgOutline(svg: string, overrides: SvgOverrides = {}) {
  const params = {
    ...defaultThermoformerParams,
    shape: 'svg' as const,
    svgSize: 100,
    svg,
    ...overrides,
  }
  return { params, outline: getShapeOutline(params, parseSvg(svg))! }
}

/**
 * Alturas das faces sob um raio vertical em (x, z). Um raio que passa na
 * aresta compartilhada por dois triângulos do mesmo cap conta os dois; a
 * altura é única.
 */
function verticalHits(
  geometry: BufferGeometry,
  x: number,
  z: number,
  fromBelow = false,
): number[] {
  const material = new MeshBasicMaterial()
  const mesh = new Mesh(geometry, material)
  const direction = fromBelow ? 1 : -1
  const ray = new Raycaster(
    new Vector3(x, fromBelow ? -100 : 100, z),
    new Vector3(0, direction, 0),
  )
  const heights: number[] = []
  for (const hit of ray.intersectObject(mesh)) {
    if (!heights.some((height) => Math.abs(height - hit.point.y) < 1e-4)) {
      heights.push(hit.point.y)
    }
  }
  material.dispose()
  return heights.sort((a, b) => a - b)
}

/** Confere uma face única sem depender da precisão do float32 do STL. */
function expectSingleHit(hits: number[], expected: number): void {
  expect(hits).toHaveLength(1)
  expect(hits[0]).toBeCloseTo(expected, 2)
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
    expect(verticalHits(support, 0, 0)).toEqual([params.bottomThickness])
    expect(verticalHits(support, stepX, 0)).toEqual([dims.seatY])
    expect(verticalHits(support, topX, 0)).toEqual([dims.height])
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
    expect(verticalHits(support, inside.x, -inside.y)).toHaveLength(1)
    expect(verticalHits(support, inside.x, inside.y)).toHaveLength(0)
    support.dispose()
  })

  it('rejeita contorno circular com erro de forma', () => {
    const params = defaultThermoformerParams
    expect(() =>
      buildTraySupport(params, getShapeOutline(params)!),
    ).toThrow(/poligonais/)
  })
})

function interiorPoint(outline: ShapeOutline): { x: number; y: number } {
  const bounds = outline.bounds
  for (let ix = 1; ix < 8; ix++) {
    for (let iy = 1; iy < 8; iy++) {
      const x = bounds.minX + (bounds.width * ix) / 8
      const y = bounds.minY + (bounds.height * iy) / 8
      if (pointInPaths(x, y, outline.paths!)) return { x, y }
    }
  }
  throw new Error('sem ponto interno no contorno')
}

describe('buildTrayPlug', () => {
  it('macho quadrado ocupa o contorno da tela e apoia a coroa no contato', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const plug = buildTrayPlug(params, outline)
    plug.computeBoundingBox()
    const box = plug.boundingBox!
    expect(box.min.y).toBeCloseTo(params.bottomThickness + params.thickness, 2)
    expect(box.max.y).toBeCloseTo(dims.bodyTop, 2)
    expect(box.min.x).toBeCloseTo(-60, 2)
    expect(box.max.x).toBeCloseTo(60, 2)
    expect(box.min.z).toBeCloseTo(-60, 2)
    expect(box.max.z).toBeCloseTo(60, 2)
    expect(isClosed(plug)).toBe(true)
    expect(signedVolume(plug)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(plug)).toBe(0)
    plug.dispose()
  })

  it('coroa de contato fica no aro e a protrusão desce no centro', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const plug = buildTrayPlug(params, outline)

    // Fora da abertura da cavidade o corpo começa em contactY.
    expectSingleHit(verticalHits(plug, 57, 0, true), dims.contactY)
    // No centro a protrusão desce até o fundo deslocado pela tela; a pega abre
    // o topo até a ponta do cone, que começa 0,1 mm acima de bodyTop no CSG.
    expectSingleHit(
      verticalHits(plug, 0, 0, true),
      params.bottomThickness + params.thickness,
    )
    expectSingleHit(
      verticalHits(plug, 0, 0),
      dims.bodyTop + PLUG_GRIP_OVERLAP_MM - dims.gripDepth,
    )
    plug.dispose()
  })

  it('macho da estrela fecha e a pega fica no material', () => {
    const { params, outline } = svgOutline(starSvg, { plugHeight: 10 })
    const dims = getTrayDimensions(params, outline)
    expect(pointInPaths(dims.gripX, dims.gripY, outline.paths!)).toBe(true)

    const plug = buildTrayPlug(params, outline)
    plug.computeBoundingBox()
    expect(plug.boundingBox!.max.y).toBeCloseTo(dims.bodyTop, 2)
    expect(isClosed(plug)).toBe(true)
    expect(signedVolume(plug)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(plug)).toBe(0)

    expectSingleHit(
      verticalHits(plug, dims.gripX, -dims.gripY, true),
      params.bottomThickness + params.thickness,
    )
    expectSingleHit(
      verticalHits(plug, dims.gripX, -dims.gripY),
      dims.bodyTop + PLUG_GRIP_OVERLAP_MM - dims.gripDepth,
    )
    plug.dispose()
  })

  it('macho do C grosso fecha e tira a pega do vazio', () => {
    const { params, outline } = svgOutline(thickC, {
      frameWidth: 2,
      stepWidth: 2,
      plugHeight: 10,
    })
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripEnabled).toBe(true)
    expect(pointInPaths(dims.gripX, dims.gripY, outline.paths!)).toBe(true)

    const plug = buildTrayPlug(params, outline)
    expect(isClosed(plug)).toBe(true)
    expect(signedVolume(plug)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(plug)).toBe(0)

    // O centro do envelope do C é vazio; a pega segura fica na barra.
    expect(verticalHits(plug, 0, 0)).toHaveLength(0)
    expectSingleHit(
      verticalHits(plug, dims.gripX, -dims.gripY, true),
      params.bottomThickness + params.thickness,
    )
    expectSingleHit(
      verticalHits(plug, dims.gripX, -dims.gripY),
      dims.bodyTop + PLUG_GRIP_OVERLAP_MM - dims.gripDepth,
    )
    plug.dispose()
  })

  it('não fura a face de contato com a pega fora da cavidade', () => {
    const { params, outline } = svgOutline(thickC, {
      frameWidth: 2,
      stepWidth: 12,
      plugHeight: 10,
      draftAngle: 2,
    })
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripDepth).toBeLessThanOrEqual(
      params.plugHeight - PLUG_GRIP_MIN_MATERIAL_MM,
    )

    const plug = buildTrayPlug(params, outline)
    expect(isClosed(plug)).toBe(true)
    expect(signedVolume(plug)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(plug)).toBe(0)

    // Antes do limite a pega atravessava a face de contato e os dois raios
    // ficavam vazios. Agora o eixo tem topo (recesso) e fundo (material).
    const inside = dims.gripEnabled
      ? { x: dims.gripX, y: dims.gripY }
      : interiorPoint(outline)
    expect(verticalHits(plug, inside.x, -inside.y)).not.toHaveLength(0)
    expect(
      verticalHits(plug, inside.x, -inside.y, true),
    ).not.toHaveLength(0)
    plug.dispose()
  })

  it('macho do C fino constrói sem pega e com topo plano', () => {
    const { params, outline } = svgOutline(thinC, {
      frameWidth: 2,
      stepWidth: 2,
      plugHeight: 10,
    })
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripEnabled).toBe(false)

    const plug = buildTrayPlug(params, outline)
    plug.computeBoundingBox()
    expect(plug.boundingBox!.max.y).toBeCloseTo(dims.bodyTop, 2)
    expect(isClosed(plug)).toBe(true)
    expect(signedVolume(plug)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(plug)).toBe(0)

    const inside = interiorPoint(outline)
    const hits = verticalHits(plug, inside.x, -inside.y)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[hits.length - 1]).toBeCloseTo(dims.bodyTop, 2)
    plug.dispose()
  })

  it('macho da pirâmide fecha e ocupa o envelope', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'pyramid' as const,
      width: 120,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const plug = buildTrayPlug(params, outline)
    plug.computeBoundingBox()
    expect(plug.boundingBox!.max.y).toBeCloseTo(dims.bodyTop, 2)
    expect(isClosed(plug)).toBe(true)
    expect(signedVolume(plug)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(plug)).toBe(0)
    plug.dispose()
  })

  it('macho retangular fecha e ocupa o envelope assimétrico', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'rectangle' as const,
      width: 120,
      height: 80,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const plug = buildTrayPlug(params, outline)
    plug.computeBoundingBox()
    const box = plug.boundingBox!
    expect(box.min.x).toBeCloseTo(-60, 2)
    expect(box.max.x).toBeCloseTo(60, 2)
    expect(box.min.z).toBeCloseTo(-40, 2)
    expect(box.max.z).toBeCloseTo(40, 2)
    expect(box.max.y).toBeCloseTo(dims.bodyTop, 2)
    expect(isClosed(plug)).toBe(true)
    expect(signedVolume(plug)).toBeGreaterThan(0)
    expect(countZeroAreaTriangles(plug)).toBe(0)
    plug.dispose()
  })
})
