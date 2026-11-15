import { describe, it, expect } from 'vitest'
import { validateThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/validateThermoformer'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('validateThermoformer', () => {
  it('não aponta problemas nos defaults', () => {
    expect(validateThermoformer(defaultThermoformerParams)).toHaveLength(0)
  })

  it('aponta aro que consome o disco', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, diameter: 60, frameWidth: 30 })
    expect(issues.map((issue) => issue.code)).toEqual(['screen-frame'])
    expect(issues[0]).toEqual(
      expect.objectContaining({ code: 'screen-frame', severity: 'error' }),
    )
  })

  it('acumula issue da tela com issue do suporte', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 30,
      fitClearance: 0.1,
    })
    expect(issues.map((issue) => issue.code)).toEqual(['screen-frame', 'support-clearance'])
  })

  it('aponta ausência de favos', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 29.5,
      opening: 3,
    })
    expect(issues.map((issue) => issue.code)).toEqual(['screen-empty'])
  })

  it('aponta abertura maior que o raio interno', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 20,
      opening: 12,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-opening' }))
  })

  it('aponta o limite de favos com a abertura efetiva', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 300,
      frameWidth: 2,
      opening: 3,
      lineWidth: 1.2,
    })
    const density = issues.find((issue) => issue.code === 'screen-density')
    expect(density).toBeDefined()
    expect(density!.message).toMatch(/4000/)
    const pattern = computeScreenPattern({
      ...defaultThermoformerParams,
      diameter: 300,
      frameWidth: 2,
      opening: 3,
      lineWidth: 1.2,
    })
    expect(density!.message).toContain(pattern.effectiveOpening.toFixed(1))
    expect(pattern.effectiveOpening).toBeGreaterThan(3)
  })

  it('aponta linha abaixo do mínimo (defensivo)', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, lineWidth: 0.3 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-line', severity: 'warning' }))
  })

  it('aponta degrau sem sustentação da tela (defensivo)', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 0.3,
      fitClearance: 0.3,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-step', severity: 'error' }))
  })

  it('aponta degrau fino (defensivo)', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 1,
      fitClearance: 0.3,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-step', severity: 'warning' }))
  })

  it('avisa quando o degrau passa do aro sólido da tela', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 8,
      frameWidth: 6,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-step-frame', severity: 'warning' }))
  })

  it('não avisa quando o degrau fica sob o aro sólido', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 6.2,
      frameWidth: 6,
      fitClearance: 0.3,
    })
    expect(issues.some((issue) => issue.code === 'support-step-frame')).toBe(false)
  })

  it('aponta parede e fundo abaixo do mínimo (defensivo)', () => {
    const wall = validateThermoformer({ ...defaultThermoformerParams, wallThickness: 0.5 })
    const bottom = validateThermoformer({ ...defaultThermoformerParams, bottomThickness: 0.5 })
    expect(wall).toContainEqual(expect.objectContaining({ code: 'support-wall', severity: 'error' }))
    expect(bottom).toContainEqual(expect.objectContaining({ code: 'support-bottom', severity: 'error' }))
  })

  it('avisa sobre folga apertada da tela', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, fitClearance: 0.1 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-clearance', severity: 'warning' }))
  })

  it('avisa profundidade inválida (defensivo)', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, bowlDepth: 0 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-depth' }))
  })

  it('avisa quando a profundidade da bacia é limitada', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      wallThickness: 2,
      bowlDepth: 60,
      stepWidth: 2,
      fitClearance: 0.1,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-depth' }))
    const depth = issues.find((issue) => issue.code === 'support-depth')
    expect(depth).toEqual(expect.objectContaining({ severity: 'warning' }))
    expect(depth!.message).toContain('45.1 mm')
  })
})
