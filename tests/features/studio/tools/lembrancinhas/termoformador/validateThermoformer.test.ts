import { describe, it, expect } from 'vitest'
import { validateThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/validateThermoformer'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('validateThermoformer', () => {
  it('defaults não têm problemas', () => {
    expect(validateThermoformer(defaultThermoformerParams)).toEqual([])
  })

  it('avisa painel maior que o corpo', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, frontPanelWidth: 300 })
    expect(issues.some((issue) => issue.code === 'panel-overhang')).toBe(true)
  })

  it('erra quando a moldura consome toda a área', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      frontPanelWidth: 40,
      frontPanelHeight: 40,
      borderWidth: 20,
    })
    expect(issues.some((issue) => issue.code === 'panel-border' && issue.severity === 'error')).toBe(true)
    expect(issues.some((issue) => issue.code === 'panel-rib')).toBe(false)
  })

  it('avisa quando a grade é limitada', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      frontPanelWidth: 300,
      frontPanelHeight: 300,
      borderWidth: 3,
      holeSpacingX: 1,
      holeSpacingY: 1,
    })
    expect(issues.some((issue) => issue.code === 'panel-density')).toBe(true)
  })

  it('avisa folga da tampa menor que a folga de impressão', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, lidClearance: 0.1 })
    expect(issues.some((issue) => issue.code === 'lid-clearance')).toBe(true)
  })

  it('avisa base mais alta que o corpo', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, baseHeight: 90 })
    expect(issues.some((issue) => issue.code === 'base-height')).toBe(true)
  })

  it('avisa base mais fina que o mínimo mesmo com altura zero', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      baseEnabled: true,
      baseHeight: 0,
    })
    expect(issues.some((issue) => issue.code === 'base-thin')).toBe(true)
  })

  it('avisa encaixe interno limitado pelo fundo do corpo', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      fitType: 'internal',
      height: 20,
      rimHeight: 0,
      bottomThickness: 6,
      lidFitDepth: 20,
    })
    expect(issues.some((issue) => issue.code === 'lid-fit-depth')).toBe(true)
  })
})
