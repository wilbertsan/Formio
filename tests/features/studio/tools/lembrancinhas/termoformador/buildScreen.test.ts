import { describe, it, expect } from 'vitest'
import { ShapeUtils } from 'three'
import { buildScreen } from '@/features/studio/tools/lembrancinhas/termoformador/buildScreen'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
import {
  MAX_SCREEN_OPENINGS,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildScreen', () => {
  it('ocupa o diâmetro, a espessura e fica deitada na mesa', () => {
    const params = defaultThermoformerParams
    const outline = getShapeOutline(params)!
    const geometry = buildScreen(params, outline)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-params.diameter / 2, 1)
    expect(box.max.x).toBeCloseTo(params.diameter / 2, 1)
    expect(box.min.z).toBeCloseTo(-params.diameter / 2, 1)
    expect(box.max.z).toBeCloseTo(params.diameter / 2, 1)
    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(params.thickness, 3)
    geometry.dispose()
  })

  it('gera malha fechada e com volume positivo', () => {
    const params = defaultThermoformerParams
    const geometry = buildScreen(params, getShapeOutline(params)!)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('os favos aumentam a contagem de vértices', () => {
    const solidParams = {
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 30,
      opening: 30,
    }
    const withCells = buildScreen(
      defaultThermoformerParams,
      getShapeOutline(defaultThermoformerParams)!,
    )
    const solid = buildScreen(solidParams, getShapeOutline(solidParams)!)

    expect(computeScreenPattern(defaultThermoformerParams).cells.length).toBeGreaterThan(0)
    expect(computeScreenPattern({ ...defaultThermoformerParams, diameter: 60, frameWidth: 30 }).cells).toHaveLength(0)
    expect(withCells.getAttribute('position').count)
      .toBeGreaterThan(solid.getAttribute('position').count)

    withCells.dispose()
    solid.dispose()
  })

  it('spike: malha densa (~1.800 favos) permanece fechada', () => {
    const params = {
      ...defaultThermoformerParams,
      diameter: 160,
      frameWidth: 2,
      opening: 3,
      lineWidth: 0.4,
    }
    const pattern = computeScreenPattern(params)
    expect(pattern.cells.length).toBeGreaterThan(1500)
    expect(pattern.cells.length).toBeLessThanOrEqual(MAX_SCREEN_OPENINGS)

    const geometry = buildScreen(params, getShapeOutline(params)!)
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })

  it('gera tela quadrada fechada, no tamanho correto e perfurada', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const geometry = buildScreen(params, outline)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const volume = signedVolume(geometry)
    expect(box.min.x).toBeCloseTo(-60, 0)
    expect(box.max.x).toBeCloseTo(60, 0)
    expect(box.min.z).toBeCloseTo(-60, 0)
    expect(box.max.z).toBeCloseTo(60, 0)
    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(params.thickness, 3)
    expect(isClosed(geometry)).toBe(true)
    expect(volume).toBeGreaterThan(0)
    expect(volume).toBeLessThan(0.5 * (120 * 120 * params.thickness))
    geometry.dispose()
  })

  it('gera tela retangular fechada, no tamanho correto e perfurada', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'rectangle' as const,
      width: 120,
      height: 80,
    }
    const outline = getShapeOutline(params)!
    const geometry = buildScreen(params, outline)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const volume = signedVolume(geometry)
    expect(box.min.x).toBeCloseTo(-60, 0)
    expect(box.max.x).toBeCloseTo(60, 0)
    expect(box.min.z).toBeCloseTo(-40, 0)
    expect(box.max.z).toBeCloseTo(40, 0)
    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(params.thickness, 3)
    expect(isClosed(geometry)).toBe(true)
    expect(volume).toBeGreaterThan(0)
    expect(volume).toBeLessThan(0.5 * (120 * 80 * params.thickness))
    geometry.dispose()
  })

  it('gera tela de pirâmide fechada, no tamanho correto e perfurada', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'pyramid' as const,
      width: 120,
      height: 80,
    }
    const outline = getShapeOutline(params)!
    const geometry = buildScreen(params, outline)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const volume = signedVolume(geometry)
    expect(box.min.x).toBeCloseTo(-60, 0)
    expect(box.max.x).toBeCloseTo(60, 0)
    expect(box.min.z).toBeCloseTo(-60, 0)
    expect(box.max.z).toBeCloseTo(60, 0)
    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(params.thickness, 3)
    expect(isClosed(geometry)).toBe(true)
    expect(volume).toBeGreaterThan(0)
    expect(volume).toBeLessThan(0.5 * (120 * 120 * params.thickness))
    geometry.dispose()
  })

  it('não muta o contorno ao construir duas telas', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const first = buildScreen(params, outline)
    const second = buildScreen(params, outline)
    expect(second.getAttribute('position').count).toBe(first.getAttribute('position').count)
    expect(isClosed(second)).toBe(true)
    expect(outline.shape.holes).toHaveLength(0)
    first.dispose()
    second.dispose()
  })

  it('gera tela SVG fechada no tamanho e com material removido', () => {
    const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="50,5 95,95 5,95" fill="#000"/>
    </svg>`
    const parsed = parseSvg(triangle)!
    const params = {
      ...defaultThermoformerParams,
      shape: 'svg' as const,
      svgSize: 100,
      svg: triangle,
    }
    const outline = getShapeOutline(params, parsed)!
    const solidVolume =
      Math.abs(ShapeUtils.area(outline.shape.getPoints())) * params.thickness
    const geometry = buildScreen(params, outline)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const volume = signedVolume(geometry)
    expect(box.min.x).toBeGreaterThanOrEqual(-50)
    expect(box.max.x).toBeLessThanOrEqual(50)
    expect(box.min.z).toBeGreaterThanOrEqual(-50)
    expect(box.max.z).toBeLessThanOrEqual(50)
    expect(isClosed(geometry)).toBe(true)
    expect(volume).toBeGreaterThan(0)
    // O triângulo tem inraio pequeno; com moldura de 6 mm e favos inteiros,
    // 69 favos removem ~43% do volume (não os 50% teóricos).
    expect(volume).toBeLessThan(0.65 * solidVolume)
    geometry.dispose()
  })

  it('gera tela SVG côncava (L) fechada e com volume positivo', () => {
    const lShape = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="5,5 95,5 95,55 55,55 55,95 5,95" fill="#000"/>
    </svg>`
    const parsed = parseSvg(lShape)!
    const params = {
      ...defaultThermoformerParams,
      shape: 'svg' as const,
      svgSize: 100,
      svg: lShape,
    }
    const outline = getShapeOutline(params, parsed)!
    const geometry = buildScreen(params, outline)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })
})
