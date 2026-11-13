import { describe, it, expect } from 'vitest'
import { validateBox } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/validateBox'
import { defaultBoxParams } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'

describe('validateBox', () => {
  it('defaults não têm problemas', () => {
    expect(validateBox(defaultBoxParams)).toEqual([])
  })

  it('avisa painel maior que o corpo', () => {
    const issues = validateBox({ ...defaultBoxParams, frontPanelWidth: 300 })
    expect(issues.some((issue) => issue.code === 'panel-overhang')).toBe(true)
  })

  it('erra quando a moldura consome toda a área', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      frontPanelWidth: 40,
      frontPanelHeight: 40,
      borderWidth: 20,
    })
    expect(issues.some((issue) => issue.code === 'panel-border' && issue.severity === 'error')).toBe(true)
    expect(issues.some((issue) => issue.code === 'panel-rib')).toBe(false)
    expect(issues.some((issue) => issue.code === 'panel-hole')).toBe(false)
  })

  it('erra quando o raio dos cantos excede metade da menor dimensão', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      width: 60,
      depth: 60,
      cornerRadius: 40,
    })
    expect(issues.some((issue) => issue.code === 'corner-radius')).toBe(true)
  })

  it('avisa quando nenhum furo cabe na região interna', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      frontPanelWidth: 60,
      frontPanelHeight: 40,
      borderWidth: 3,
      holeSpacingX: 1,
      holeSpacingY: 1,
      gridThickness: 4,
      holeDiameter: 0.8,
    })
    expect(issues.some((issue) => issue.code === 'panel-empty')).toBe(true)
  })

  it('avisa painel mais alto que o corpo', () => {
    const issues = validateBox({ ...defaultBoxParams, frontPanelHeight: 300 })
    expect(issues.some((issue) => issue.code === 'panel-height')).toBe(true)
  })

  it('erra quando o raio do painel excede metade da menor dimensão', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      frontPanelWidth: 40,
      frontPanelHeight: 40,
      frontPanelCornerRadius: 40,
      borderWidth: 3,
    })
    expect(issues.some((issue) => issue.code === 'panel-radius')).toBe(true)
  })

  it('avisa quando a grade é limitada', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      frontPanelWidth: 300,
      frontPanelHeight: 300,
      borderWidth: 3,
      holeSpacingX: 1,
      holeSpacingY: 1,
    })
    expect(issues.some((issue) => issue.code === 'panel-density')).toBe(true)
  })

  it('avisa folga da tampa menor que a folga de impressão', () => {
    const issues = validateBox({ ...defaultBoxParams, lidClearance: 0.1 })
    expect(issues.some((issue) => issue.code === 'lid-clearance')).toBe(true)
  })

  it('avisa base mais alta que o corpo', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      height: 20,
      rimHeight: 0,
      baseHeight: 30,
    })
    expect(issues.some((issue) => issue.code === 'base-height')).toBe(true)
  })

  it('avisa base mais fina que o mínimo mesmo com altura zero', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      baseEnabled: true,
      baseHeight: 0,
    })
    expect(issues.some((issue) => issue.code === 'base-thin')).toBe(true)
  })

  it('avisa encaixe interno limitado pelo fundo do corpo', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      fitType: 'internal',
      height: 20,
      rimHeight: 0,
      bottomThickness: 6,
      lidFitDepth: 20,
    })
    expect(issues.some((issue) => issue.code === 'lid-fit-depth')).toBe(true)
  })

  it('avisa furos efetivos abaixo do mínimo', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      frontPanelWidth: 60,
      frontPanelHeight: 60,
      borderWidth: 3,
      holeDiameter: 6,
      holeSpacingX: 2,
      holeSpacingY: 2,
      gridThickness: 1.9,
    })
    expect(issues.some((issue) => issue.code === 'panel-hole')).toBe(true)
  })

  it('não avisa nervuras abaixo do mínimo no limite exato de 0,8 mm', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      holeSpacingX: 3,
      holeSpacingY: 3,
      gridThickness: 0.8,
    })
    expect(issues.some((issue) => issue.code === 'panel-rib')).toBe(false)
  })

  it('avisa ponta do pino maior que o raio da haste', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      handleDiameter: 3,
      handleTipRadius: 5,
    })
    expect(issues.some((issue) => issue.code === 'handle-tip')).toBe(true)
  })

  it('avisa base do pino menor que a haste', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      handleDiameter: 20,
      handleBaseDiameter: 4,
    })
    expect(issues.some((issue) => issue.code === 'handle-base')).toBe(true)
  })

  it('avisa flange do pino maior que a lateral disponível', () => {
    const issues = validateBox({
      ...defaultBoxParams,
      height: 20,
      rimHeight: 0,
      handleBaseDiameter: 30,
      handleSide: 'right',
    })
    expect(issues.some((issue) => issue.code === 'handle-flange')).toBe(true)
  })

  it('avisa painel invadindo a base', () => {
    const issues = validateBox({ ...defaultBoxParams, baseHeight: 7 })
    expect(issues.some((issue) => issue.code === 'panel-base')).toBe(true)
  })

  it('avisa painel invadindo a saia da tampa', () => {
    const issues = validateBox({ ...defaultBoxParams, lidFitDepth: 7 })
    expect(issues.some((issue) => issue.code === 'panel-lid')).toBe(true)
  })

  it('avisa pino no topo ou no fundo sem apoio sólido', () => {
    const issues = validateBox({ ...defaultBoxParams, handleSide: 'top' })
    expect(issues.some((issue) => issue.code === 'handle-side')).toBe(true)
  })

  it('avisa flange do pino invadindo a base', () => {
    const issues = validateBox({ ...defaultBoxParams, handleHeight: 0 })
    expect(issues.some((issue) => issue.code === 'handle-base-collision')).toBe(true)
  })

  it('avisa flange do pino invadindo a tampa', () => {
    const issues = validateBox({ ...defaultBoxParams, handleHeight: 1 })
    expect(issues.some((issue) => issue.code === 'handle-lid-collision')).toBe(true)
  })
})
