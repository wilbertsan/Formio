import { describe, it, expect } from 'vitest'
import { buildHeightField } from '@/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller'
import { defaultTextureRollerParams, EDGE_MARGIN_MM } from '@/features/studio/tools/confeitaria/rolo-textura/schema'
import type { ParsedSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

describe('buildHeightField', () => {
  it('gera máscara com picos na profundidade e zeros nas margens axiais', () => {
    const { height, cols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    expect(cols).toBeGreaterThan(20)
    expect(bodyRows).toBeGreaterThan(20)
    expect(Math.max(...height)).toBeCloseTo(defaultTextureRollerParams.reliefDepth, 2)
    expect(height[0]).toBe(0)
    expect(height[(bodyRows - 1) * cols]).toBe(0)
  })
  it('fecha a costura sem degrau', () => {
    const { height, cols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    for (let r = 0; r < bodyRows; r++) {
      const base = r * cols
      const seam = Math.abs(height[base] - height[base + cols - 1])
      const local = Math.max(
        Math.abs(height[base + 1] - height[base]),
        Math.abs(height[base + cols - 1] - height[base + cols - 2]),
      )
      expect(seam).toBeLessThanOrEqual(local + 1e-6)
    }
  })
  it('motivo staggered cruza a emenda de forma simétrica', () => {
    const { height, cols, bodyRows, cellRows } = buildHeightField(defaultTextureRollerParams)
    // linha ímpar (stagger) no meio do corpo, longe das margens axiais
    const cellRow = Math.max(1, Math.floor(cellRows / 2) | 1)
    const row = Math.min(bodyRows - 2, Math.max(3, Math.floor((cellRow + 0.5) * (bodyRows / cellRows)) | 1))
    expect(cellRows).toBeGreaterThan(2)
    const base = row * cols
    const seam = height[base]
    expect(seam).toBeGreaterThan(0.5 * defaultTextureRollerParams.reliefDepth)
    expect(height[base + 1]).toBeGreaterThan(0)
    expect(height[base + cols - 1]).toBeGreaterThan(0)
    expect(Math.abs(height[base + 1] - height[base + cols - 1])).toBeLessThan(0.02)
  })
  it('muda com a densidade (alta tem mais células)', () => {
    const low = buildHeightField({ ...defaultTextureRollerParams, density: 'low' })
    const high = buildHeightField({ ...defaultTextureRollerParams, density: 'high' })
    expect(high.cellCols).toBeGreaterThan(low.cellCols)
    expect(high.cols).toBe(low.cols)
    expect(high.bodyRows).toBe(low.bodyRows)
  })
  it('modo svg sem parsedSvg não lança e devolve zeros', () => {
    const { height } = buildHeightField({ ...defaultTextureRollerParams, patternSource: 'svg', svgIcon: '<svg/>' }, null)
    expect(Math.max(...height)).toBe(0)
  })
  it('zera a altura em toda a faixa de margem axial de 1mm', () => {
    const { height, cols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    const marginRows = Math.max(1, Math.ceil(EDGE_MARGIN_MM / (defaultTextureRollerParams.length / bodyRows)))
    for (let r = 0; r < marginRows; r++) {
      for (let c = 0; c < cols; c++) {
        expect(height[r * cols + c]).toBe(0)
        expect(height[(bodyRows - 1 - r) * cols + c]).toBe(0)
      }
    }
  })
  it('normaliza SVG de qualquer escala para ~88% da célula', () => {
    const parsed: ParsedSvg = {
      fills: [{ outer: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], holes: [] }],
      strokes: [],
    }
    const params = { ...defaultTextureRollerParams, patternSource: 'svg' as const, density: 'low' as const }
    const { height, cols, bodyRows, cellCols, cellRows } = buildHeightField(params, parsed)
    const cellRow = Math.floor(cellRows / 2)
    const row = Math.min(bodyRows - 1, Math.floor((cellRow + 0.5) * (bodyRows / cellRows)))
    let run = 0
    let started = false
    for (let c = 0; c < cols; c++) {
      if (height[row * cols + c] > 0.5 * defaultTextureRollerParams.reliefDepth) {
        started = true
        run++
      } else if (started) {
        break
      }
    }
    const cellW = cols / cellCols
    expect(run / cellW).toBeGreaterThan(0.85)
    expect(run / cellW).toBeLessThan(1.1)
  })
})
