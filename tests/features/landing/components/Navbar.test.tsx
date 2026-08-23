import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from '@/features/landing/components/Navbar'

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('Navbar', () => {
  it('exibe a logo 3DFormio com link para a home', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: '3DFormio' })).toHaveAttribute('href', '/')
  })

  it('exibe link de criar conta apontando para /cadastro', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
  })

  it('exibe links de âncora para preços e FAQ', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Preços' })).toHaveAttribute('href', '#precos')
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq')
  })

  it('exibe link de acesso ao Studio 3D', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Studio 3D' })).toHaveAttribute('href', '/studio')
  })
})
