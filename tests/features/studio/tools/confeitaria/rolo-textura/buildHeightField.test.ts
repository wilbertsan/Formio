import { describe, it, expect } from 'vitest'
import { buildHeightField } from '@/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller'
import { defaultTextureRollerParams } from '@/features/studio/tools/confeitaria/rolo-textura/schema'

describe('buildHeightField', () => {
  it('gera máscara com picos na profundidade e zeros nas margens axiais', () => {
    const { height, cols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    expect(cols).toBeGreaterThan(20)
    expect(bodyRows).toBeGreaterThan(20)
    expect(Math.max(...height)).toBeCloseTo(defaultTextureRollerParams.reliefDepth, 2)
    expect(height[0]).toBe(0)
    expect(height[(bodyRows - 1) * cols]).toBe(0)
  })
  it('fecha a costura: emenda sem degrau maior que a variação entre colunas vizinhas', () => {
    const { height, cols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    for (let r = 0; r < bodyRows; r++) {
      let maxNeighborDelta = 0
      for (let c = 0; c + 1 < cols; c++) {
        maxNeighborDelta = Math.max(maxNeighborDelta, Math.abs(height[r * cols + c + 1] - height[r * cols + c]))
      }
      const seamDelta = Math.abs(height[r * cols] - height[r * cols + cols - 1])
      expect(seamDelta).toBeLessThanOrEqual(maxNeighborDelta + 1e-6)
    }
  })
  it('muda com a densidade (alta tem mais células)', () => {
    const low = buildHeightField({ ...defaultTextureRollerParams, density: 'low' })
    const high = buildHeightField({ ...defaultTextureRollerParams, density: 'high' })
    expect(high.cellCols).toBeGreaterThan(low.cellCols)
  })
  it('modo svg sem parsedSvg não lança e devolve zeros', () => {
    const { height } = buildHeightField({ ...defaultTextureRollerParams, patternSource: 'svg', svgIcon: '<svg/>' }, null)
    expect(Math.max(...height)).toBe(0)
  })
})
