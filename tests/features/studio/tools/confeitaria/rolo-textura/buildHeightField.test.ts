import { describe, it, expect } from 'vitest'
import { buildHeightField } from '@/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller'
import {
  DENSITIES, defaultTextureRollerParams, EDGE_MARGIN_MM, MESH_STEP_MM,
  MOTIFS_BY_FAMILY, PATTERN_FAMILIES, RELIEF_BEVEL_MM,
} from '@/features/studio/tools/confeitaria/rolo-textura/schema'
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
  it('campo é exatamente periódico para todas as famílias, motivos e densidades', () => {
    for (const family of PATTERN_FAMILIES) {
      for (const motif of MOTIFS_BY_FAMILY[family]) {
        for (const density of DENSITIES) {
          const params = { ...defaultTextureRollerParams, patternFamily: family, patternMotif: motif, density }
          const { height, cols, cellCols, bodyRows } = buildHeightField(params)
          const cellW = cols / cellCols
          expect(Number.isInteger(cellW)).toBe(true)
          let maxDiff = 0
          for (let r = 0; r < bodyRows; r++) {
            for (let c = 0; c < cols; c++) {
              const mirrored = r * cols + ((c + cellW) % cols)
              maxDiff = Math.max(maxDiff, Math.abs(height[r * cols + c] - height[mirrored]))
            }
          }
          expect(maxDiff, `${family}/${motif}/${density}`).toBeLessThan(1e-4)
        }
      }
    }
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
    const stepU = (Math.PI * defaultTextureRollerParams.diameter) / high.cols
    const stepV = defaultTextureRollerParams.length / high.bodyRows
    expect(stepU).toBeLessThanOrEqual(MESH_STEP_MM * 1.05)
    expect(stepU).toBeGreaterThan(MESH_STEP_MM * 0.8)
    expect(stepV).toBeLessThanOrEqual(MESH_STEP_MM * 1.05)
    expect(high.cellCols).toBeGreaterThan(low.cellCols)
  })
  it('modo svg sem parsedSvg não lança e devolve zeros', () => {
    const { height } = buildHeightField({ ...defaultTextureRollerParams, patternSource: 'svg', svgIcon: '<svg/>' }, null)
    expect(Math.max(...height)).toBe(0)
  })
  it('margem axial física respeita 1mm nas duas pontas', () => {
    const { height, cols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    const step = defaultTextureRollerParams.length / bodyRows
    const marginRows = Math.max(1, Math.ceil(EDGE_MARGIN_MM / step))
    const bevelRows = Math.ceil(RELIEF_BEVEL_MM / step)
    const maxOffset = (marginRows + bevelRows) * step
    const rowHasHeight = (r: number): boolean => {
      for (let c = 0; c < cols; c++) if (height[r * cols + c] !== 0) return true
      return false
    }

    let firstNonZero = -1
    for (let r = 0; r < bodyRows; r++) {
      if (rowHasHeight(r)) {
        firstNonZero = r
        break
      }
    }
    expect(firstNonZero).toBeGreaterThanOrEqual(0)
    for (let r = 0; r < firstNonZero; r++) {
      for (let c = 0; c < cols; c++) expect(height[r * cols + c]).toBe(0)
    }
    const startOffset = firstNonZero * step
    expect(startOffset).toBeGreaterThanOrEqual(EDGE_MARGIN_MM - 1e-9)
    expect(startOffset).toBeLessThanOrEqual(maxOffset + 1e-9)

    let lastNonZero = -1
    for (let r = bodyRows - 1; r >= 0; r--) {
      if (rowHasHeight(r)) {
        lastNonZero = r
        break
      }
    }
    expect(lastNonZero).toBeGreaterThanOrEqual(0)
    for (let r = lastNonZero + 1; r < bodyRows; r++) {
      for (let c = 0; c < cols; c++) expect(height[r * cols + c]).toBe(0)
    }
    const endOffset = (bodyRows - 1 - lastNonZero) * step
    expect(endOffset).toBeGreaterThanOrEqual(EDGE_MARGIN_MM - 1e-9)
    expect(endOffset).toBeLessThanOrEqual(maxOffset + 1e-9)
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
    expect(first.length / cellW).toBeGreaterThan(0.82)
    expect(first.length / cellW).toBeLessThan(0.94)
    expect(runs.length).toBeGreaterThanOrEqual(2)
    expect(runs[1].start - (first.start + first.length)).toBeGreaterThan(0)
  })
  it('feições finas atingem a profundidade nominal na densidade alta', () => {
    for (const patternMotif of ['grid', 'chevrons'] as const) {
      const family = patternMotif === 'grid' ? 'geometric' : 'wave'
      const { height } = buildHeightField({
        ...defaultTextureRollerParams,
        density: 'high',
        patternFamily: family,
        patternMotif,
      })
      expect(Math.max(...height)).toBeCloseTo(defaultTextureRollerParams.reliefDepth, 1)
    }
  })
  it('SVG de traço fino recebe espessura mínima imprimível', () => {
    const parsed: ParsedSvg = {
      fills: [],
      strokes: [{ points: [{ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 }], width: 0.001 }],
    }
    const params = { ...defaultTextureRollerParams, patternSource: 'svg' as const, density: 'high' as const }
    const { height, cols, bodyRows, cellRows } = buildHeightField(params, parsed)
    const cellRow = Math.floor(cellRows / 2)
    const row = Math.min(bodyRows - 1, Math.floor((cellRow + 0.5) * (bodyRows / cellRows)))
    let best = 0
    let current = 0
    for (let c = 0; c <= cols; c++) {
      const inside = c < cols && height[row * cols + c] > 0.5 * params.reliefDepth
      if (inside) current++
      else {
        best = Math.max(best, current)
        current = 0
      }
    }
    const cellWidthMm = (Math.PI * params.diameter) / cols
    expect(best).toBeGreaterThanOrEqual(2)
    expect(best * cellWidthMm).toBeGreaterThanOrEqual(0.8)
  })
  it('une traços SVG sobrepostos (interseção sólida)', () => {
    const parsed: ParsedSvg = {
      fills: [],
      strokes: [
        { points: [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }], width: 0.2 },
        { points: [{ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 }], width: 0.2 },
      ],
    }
    const params = { ...defaultTextureRollerParams, patternSource: 'svg' as const, density: 'low' as const }
    const { height, cols, bodyRows, cellCols, cellRows } = buildHeightField(params, parsed)
    const cellW = cols / cellCols
    const cellH = bodyRows / cellRows
    const row = Math.floor(cellRows / 2)
    const c = Math.floor(0.5 * cellW)
    const r = Math.floor((row + 0.5) * cellH)
    expect(height[r * cols + c]).toBeGreaterThan(0.9 * params.reliefDepth)
  })
})
