import { describe, it, expect } from 'vitest'
import { validateScreen } from '@/features/studio/tools/lembrancinhas/termoformador/validateScreen'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('validateScreen', () => {
  it('não aponta problemas nos defaults', () => {
    expect(validateScreen(defaultThermoformerParams)).toHaveLength(0)
  })

  it('aponta aro que consome o disco', () => {
    const issues = validateScreen({ ...defaultThermoformerParams, diameter: 60, frameWidth: 30 })
    expect(issues.map((issue) => issue.code)).toEqual(['screen-frame'])
    expect(issues[0]).toEqual(
      expect.objectContaining({ code: 'screen-frame', severity: 'error' }),
    )
  })

  it('aponta ausência de favos', () => {
    const issues = validateScreen({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 29.5,
      opening: 3,
    })
    expect(issues.map((issue) => issue.code)).toEqual(['screen-empty'])
  })

  it('aponta abertura maior que o raio interno', () => {
    const issues = validateScreen({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 20,
      opening: 12,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-opening' }))
  })

  it('aponta o limite de favos com a abertura efetiva', () => {
    const issues = validateScreen({
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
    const issues = validateScreen({ ...defaultThermoformerParams, lineWidth: 0.5 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-line', severity: 'warning' }))
  })
})
