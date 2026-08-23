import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  it('renderiza o hero com a headline principal', () => {
    renderLandingPage()
    expect(
      screen.getByRole('heading', { level: 1, name: /modelos 3d personalizados em segundos/i }),
    ).toBeInTheDocument()
  })

  it('renderiza as seções de preços e FAQ', () => {
    renderLandingPage()
    expect(screen.getByRole('heading', { name: /planos para cada etapa/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /perguntas frequentes/i })).toBeInTheDocument()
  })

  it('renderiza navbar e footer', () => {
    renderLandingPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
