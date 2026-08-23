import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Hero } from '@/features/landing/components/Hero'

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  )
}

describe('Hero', () => {
  it('exibe a headline principal', () => {
    renderHero()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Modelos 3D personalizados em segundos' }),
    ).toBeInTheDocument()
  })

  it('exibe CTA primário apontando para /cadastro', () => {
    renderHero()
    expect(screen.getByRole('link', { name: 'Começar grátis' })).toHaveAttribute(
      'href',
      '/cadastro',
    )
  })

  it('exibe CTA secundário apontando para a seção de preços', () => {
    renderHero()
    expect(screen.getByRole('link', { name: 'Ver preços' })).toHaveAttribute('href', '#precos')
  })

  it('renderiza o visual com rótulo acessível', () => {
    renderHero()
    expect(screen.getByRole('img', { name: /ilustração de modelos 3d/i })).toBeInTheDocument()
  })

  it('exibe CTA terciário para o Studio', () => {
    renderHero()
    expect(screen.getByRole('link', { name: /abrir o studio/i })).toHaveAttribute(
      'href',
      '/studio',
    )
  })
})
