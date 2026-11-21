import { describe, it, expect } from 'vitest'
import {
  getTrayDimensions,
  type TrayDimensions,
} from '@/features/studio/tools/lembrancinhas/termoformador/tray'
import {
  getShapeOutline,
  offsetOutlinePaths,
  pointInPaths,
  type ShapeOutline,
} from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import {
  defaultThermoformerParams,
  PLUG_GRIP_MIN_MATERIAL_MM,
  type ThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { pathsBoundingBox } from '@/features/studio/tools/confeitaria/shared/textOutline'

const starSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,3 61,38 98,38 68,59 79,95 50,73 21,95 32,59 2,38 39,38" fill="#000"/>
</svg>`

// Arcos concêntricos em (50, 50): barra de 17 mm, sem orelhas finas nas pontas.
// O C do plano não compartilha o centro entre os arcos e a abertura da cavidade
// se divide em duas ilhas no degrau.
const thickC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M80.31 32.5 A35 35 0 1 0 80.31 67.5 L65.59 59 A18 18 0 1 1 65.59 41 Z" fill="#000"/>
</svg>`

const thinC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M80 30 A35 35 0 1 0 80 70 L73 63 A27 27 0 1 1 73 37 Z" fill="#000"/>
</svg>`

// ro=50, ri=31.5, w=18.5: o encolhimento pelo raio da pega vira uma faixa de
// 0,5 mm, que uma grade de 7×7 no envelope não encontra.
const nearThresholdC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M93.3 25 A50 50 0 1 0 93.3 75 L77.28 65.75 A31.5 31.5 0 1 1 77.28 34.25 Z" fill="#000"/>
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
 * A pega só é segura quando o disco do raio inteiro cabe no material; a margem
 * de 0,5 mm cobre o arredondamento do Clipper.
 */
function expectGripFits(
  outline: ShapeOutline,
  dims: TrayDimensions,
): void {
  expect(dims.gripEnabled).toBe(true)
  expect(pointInPaths(
    dims.gripX,
    dims.gripY,
    offsetOutlinePaths(
      outline.paths!,
      -(dims.gripRadius + 0.5),
      outline.join,
    ),
  )).toBe(true)
}

describe('getTrayDimensions', () => {
  it('deriva bandeja quadrada com degrau efetivo', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.effectiveStep).toBeCloseTo(6.3, 5)
    expect(dims.stepClamped).toBe(true)
    expect(dims.seatY).toBeCloseTo(24, 5)
    expect(dims.height).toBeCloseTo(27, 5)
    expect(dims.bodyTop).toBeCloseTo(53, 5)
    expect(dims.plugTotalHeight).toBeCloseTo(46, 5)
  })

  it('limita a profundidade para o fundo não colapsar', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 40,
      bowlDepth: 60,
      draftAngle: 15,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.depthLimited).toBe(true)
    expect(dims.bottomScale).toBeCloseTo(0.05, 5)
    expect(dims.effectiveDepth).toBeCloseTo(49.64, 2)
  })

  it('usa o fundo da pirâmide', () => {
    const params = { ...defaultThermoformerParams, shape: 'pyramid' as const, width: 120 }
    const dims = getTrayDimensions(params, getShapeOutline(params)!)
    expect(dims.bottomScale).toBeCloseTo(0.1, 5)
    expect(dims.effectiveDepth).toBeCloseTo(20, 5)
  })

  it('usa a abertura da cavidade e não a área perfurada', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 140,
      frameWidth: 3,
      stepWidth: 8,
      draftAngle: 5,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const cavity = pathsBoundingBox(outline.cavityOpening!)
    const minOpening = Math.min(cavity.width, cavity.height)
    expect(dims.stepClamped).toBe(false)
    expect((minOpening * (1 - dims.bottomScale)) / 2)
      .toBeCloseTo(dims.effectiveDepth * Math.tan((5 * Math.PI) / 180), 1)
  })

  it('mantém o fundo reto sem inclinação', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
      draftAngle: 0,
    }
    const dims = getTrayDimensions(params, getShapeOutline(params)!)
    expect(dims.bottomScale).toBe(1)
    expect(dims.draftLow).toBe(true)
  })

  it('avisa quando a ponta da pirâmide fica pequena', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'pyramid' as const,
      width: 40,
    }
    const dims = getTrayDimensions(params, getShapeOutline(params)!)
    expect(dims.tipSmall).toBe(true)
  })

  it('rejeita contorno circular', () => {
    const outline = getShapeOutline(defaultThermoformerParams)!
    expect(() => getTrayDimensions(defaultThermoformerParams, outline))
      .toThrow('getTrayDimensions só aceita contornos poligonais')
  })
})

describe('getTrayDimensions pega', () => {
  it('centraliza a pega no quadrado e mantém a profundidade', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripX).toBeCloseTo(0, 5)
    expect(dims.gripY).toBeCloseTo(0, 5)
    expect(dims.gripRadius).toBeCloseTo(23.4, 5)
    expect(dims.gripDepth).toBeCloseTo(28.08, 5)
    expectGripFits(outline, dims)
  })

  it('centraliza a pega no retângulo', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'rectangle' as const,
      width: 120,
      height: 80,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expectGripFits(outline, dims)
  })

  it('mantém a pega dentro da estrela sobre a cavidade', () => {
    const { params, outline } = svgOutline(starSvg, { plugHeight: 10 })
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripDepth).toBeCloseTo(10.8, 5)
    expectGripFits(outline, dims)
  })

  it('desabilita a estrela quando o raio passa da nervura central', () => {
    const { params, outline } = svgOutline(starSvg)
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripEnabled).toBe(false)
    expect(dims.gripDepth).toBe(0)
  })

  it('move a pega do C grosso para a barra de material', () => {
    const { params, outline } = svgOutline(thickC, {
      frameWidth: 2,
      stepWidth: 2,
      plugHeight: 10,
    })
    const dims = getTrayDimensions(params, outline)
    const centerX = (outline.bounds.minX + outline.bounds.maxX) / 2
    const centerY = (outline.bounds.minY + outline.bounds.maxY) / 2
    expect(pointInPaths(centerX, centerY, outline.paths!)).toBe(false)
    expectGripFits(outline, dims)
  })

  it('acha a pega na faixa fina do C perto do limite', () => {
    const { params, outline } = svgOutline(nearThresholdC, {
      plugHeight: 10,
    })
    const dims = getTrayDimensions(params, outline)
    // O encolhimento de 9 mm deixa uma faixa de 0,5 mm; a grade de 7×7 no
    // envelope não a encontra, o baricentro do maior triângulo encontra.
    expectGripFits(outline, dims)
  })

  it('encurta a pega fora da cavidade para não furar a face de contato', () => {
    const { params, outline } = svgOutline(thickC, {
      frameWidth: 2,
      stepWidth: 12,
      plugHeight: 10,
      draftAngle: 2,
    })
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripEnabled).toBe(true)
    expect(dims.gripDepth).toBeGreaterThan(0)
    expect(dims.gripDepth).toBeLessThanOrEqual(
      params.plugHeight - PLUG_GRIP_MIN_MATERIAL_MM,
    )
    expect(dims.gripRadius).toBeCloseTo(dims.gripDepth / 1.2, 5)
    expectGripFits(outline, dims)
  })

  it('desabilita a pega quando o C é fino demais para o raio', () => {
    const { params, outline } = svgOutline(thinC, {
      frameWidth: 2,
      stepWidth: 2,
      plugHeight: 10,
    })
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripEnabled).toBe(false)
    expect(dims.gripDepth).toBe(0)
    expect(
      offsetOutlinePaths(outline.paths!, -dims.gripRadius, outline.join),
    ).toHaveLength(0)
  })
})
