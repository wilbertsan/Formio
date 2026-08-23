import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PricingSection } from '@/features/landing/components/PricingSection'

function renderPricingSection() {
  return render(
    <MemoryRouter>
      <PricingSection />
    </MemoryRouter>,
  )
}

describe('PricingSection', () => {
  it('renderiza o título da seção', () => {
    renderPricingSection()
    expect(screen.getByRole('heading', { name: /planos para cada etapa/i })).toBeInTheDocument()
  })

  it('renderiza os três planos', () => {
    renderPricingSection()
    expect(screen.getByRole('heading', { name: 'Grátis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Business' })).toBeInTheDocument()
  })

  it('marca exatamente o plano Pro como mais popular', () => {
    renderPricingSection()
    expect(screen.getAllByText('Mais popular')).toHaveLength(1)
  })

  it('aponta todos os CTAs dos planos para /cadastro', () => {
    renderPricingSection()
    const ctas = screen.getAllByRole('link', { name: /começar|assinar/i })
    expect(ctas).toHaveLength(3)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/cadastro')
    }
  })

  it('renderiza as features dos planos', () => {
    renderPricingSection()
    expect(screen.getByText('100 créditos por mês')).toBeInTheDocument()
    expect(screen.getByText('500 créditos por mês')).toBeInTheDocument()
  })
})
