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
  it('campo é exatamente periódico em uma volta (sem costura)', () => {
    const { height, cols, cellCols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    const cellW = cols / cellCols
    expect(Number.isInteger(cellW)).toBe(true)
    let maxDiff = 0
    for (let r = 0; r < bodyRows; r++) {
      for (let c = 0; c < cols; c++) {
        const mirrored = r * cols + ((c + cellW) % cols)
        maxDiff = Math.max(maxDiff, Math.abs(height[r * cols + c] - height[mirrored]))
      }
    }
    expect(maxDiff).toBeLessThan(1e-4)
  })
  it('periodicidade detecta um degrau artificial na emenda', () => {
    const { height, cols, cellCols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    const cellW = cols / cellCols
    const row = Math.floor(bodyRows / 2)
    const mutated = height.slice()
    mutated[row * cols] += 0.5
    let maxDiff = 0
    for (let c = 0; c < cols; c++) {
      const mirrored = row * cols + ((c + cellW) % cols)
      maxDiff = Math.max(maxDiff, Math.abs(mutated[row * cols + c] - mutated[mirrored]))
    }
    expect(maxDiff).toBeGreaterThan(0.4)
  })
  it('muda com a densidade (alta tem mais células)', () => {
    const low = buildHeightField({ ...defaultTextureRollerParams, density: 'low' })
    const high = buildHeightField({ ...defaultTextureRollerParams, density: 'high' })
    expect(high.cellCols).toBeGreaterThan(low.cellCols)
    expect(Math.abs(high.cols - low.cols)).toBeLessThanOrEqual(low.cellCols)
    expect(Math.abs(high.bodyRows - low.bodyRows)).toBeLessThanOrEqual(low.cellRows)
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
  it('normaliza SVG de qualquer escala e preserva a espessura física', () => {
    const parsed: ParsedSvg = {
      fills: [{ outer: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], holes: [] }],
      strokes: [],
    }
    const params = { ...defaultTextureRollerParams, patternSource: 'svg' as const, density: 'low' as const }
    const { height, cols, bodyRows, cellCols, cellRows } = buildHeightField(params, parsed)
    const cellRow = Math.floor(cellRows / 2)
    const row = Math.min(bodyRows - 1, Math.floor((cellRow + 0.5) * (bodyRows / cellRows)))
    const threshold = 0.5 * params.reliefDepth
    const runs: Array<{ start: number; length: number }> = []
    let start = -1
    for (let c = 0; c <= cols; c++) {
      const filled = c < cols && height[row * cols + c] > threshold
      if (filled && start < 0) start = c
      if (!filled && start >= 0) {
        runs.push({ start, length: c - start })
        start = -1
      }
    }
    const cellW = cols / cellCols
    const first = runs[0]
    expect(first).toBeDefined()
    expect(first.length / cellW).toBeGreaterThan(0.6)
    expect(first.length / cellW).toBeLessThan(0.86)
    expect(runs.length).toBeGreaterThanOrEqual(2)
    expect(runs[1].start - (first.start + first.length)).toBeGreaterThan(0)
  })
})
