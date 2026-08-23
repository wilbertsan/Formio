import { plans } from '@/features/landing/config/plans'

describe('plans', () => {
  it('contém exatamente 3 planos', () => {
    expect(plans).toHaveLength(3)
  })

  it('destaca exatamente o plano Pro', () => {
    const highlighted = plans.filter((plan) => plan.highlighted)
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]?.id).toBe('pro')
  })

  it('todo plano possui campos obrigatórios preenchidos e CTA para /cadastro', () => {
    for (const plan of plans) {
      expect(plan.id.trim()).not.toBe('')
      expect(plan.name.trim()).not.toBe('')
      expect(plan.price.trim()).not.toBe('')
      expect(plan.period.trim()).not.toBe('')
      expect(plan.description.trim()).not.toBe('')
      expect(plan.features.length).toBeGreaterThan(0)
      expect(plan.ctaLabel.trim()).not.toBe('')
      expect(plan.ctaHref).toBe('/cadastro')
    }
  })

  it('lista apenas features não vazias', () => {
    for (const plan of plans) {
      for (const feature of plan.features) {
        expect(feature.trim()).not.toBe('')
      }
    }
  })
})
