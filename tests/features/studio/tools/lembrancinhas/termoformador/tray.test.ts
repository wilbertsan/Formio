import { describe, it, expect } from 'vitest'
import { getTrayDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/tray'
import {
  getShapeOutline,
  pointInPaths,
} from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
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

function svgOutline(svg: string, overrides: Record<string, number> = {}) {
  const params = {
    ...defaultThermoformerParams,
    shape: 'svg' as const,
    svgSize: 100,
    svg,
    ...overrides,
  }
  return { params, outline: getShapeOutline(params, parseSvg(svg))! }
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
  it('centraliza a pega no quadrado', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripEnabled).toBe(true)
    expect(dims.gripX).toBeCloseTo(0, 5)
    expect(dims.gripY).toBeCloseTo(0, 5)
    expect(pointInPaths(dims.gripX, dims.gripY, outline.paths!)).toBe(true)
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
    expect(dims.gripEnabled).toBe(true)
    expect(pointInPaths(dims.gripX, dims.gripY, outline.paths!)).toBe(true)
  })

  it('mantém a pega dentro da estrela', () => {
    const { params, outline } = svgOutline(starSvg, { plugHeight: 10 })
    const dims = getTrayDimensions(params, outline)
    expect(dims.gripEnabled).toBe(true)
    expect(pointInPaths(dims.gripX, dims.gripY, outline.paths!)).toBe(true)
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
    expect(dims.gripEnabled).toBe(true)
    expect(pointInPaths(dims.gripX, dims.gripY, outline.paths!)).toBe(true)
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
  })
})
