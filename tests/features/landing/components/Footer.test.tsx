import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Footer } from '@/features/landing/components/Footer'

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  )
}

describe('Footer', () => {
  it('renderiza como rodapé semântico com a marca', () => {
    renderFooter()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByText('Modelos 3D personalizados para impressão.')).toBeInTheDocument()
  })

  it('exibe links de termos e privacidade como rotas', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/termos')
    expect(screen.getByRole('link', { name: 'Privacidade' })).toHaveAttribute(
      'href',
      '/privacidade',
    )
  })

  it('exibe o copyright com o ano corrente', () => {
    renderFooter()
    const year = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`© ${year} 3DFormio`))).toBeInTheDocument()
  })
})
