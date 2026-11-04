import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TermsPage } from '@/features/legal/TermsPage'

function renderTermsPage() {
  return render(
    <MemoryRouter initialEntries={['/termos']}>
      <TermsPage />
    </MemoryRouter>,
  )
}

describe('TermsPage', () => {
  it('renderiza a página com navbar, título e footer', () => {
    renderTermsPage()

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /termos de uso/i })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('exibe o índice com link direto para o reembolso', () => {
    renderTermsPage()

    const toc = screen.getByRole('navigation', { name: /índice dos termos/i })
    expect(
      within(toc).getByRole('link', { name: /cancelamento, devolução e reembolso/i }),
    ).toHaveAttribute('href', '#reembolso')
  })

  it('renderiza o tópico de reembolso com a âncora e os direitos principais', () => {
    renderTermsPage()

    const refundSection = document.getElementById('reembolso')
    expect(refundSection).not.toBeNull()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /10\. cancelamento, devolução e reembolso/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/7 dias corridos/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/10\.8/i)).toBeInTheDocument()
  })

  it('exibe os contatos placeholder e o link para a política de privacidade', () => {
    renderTermsPage()

    expect(screen.getAllByText(/\[e-mail de contato\]/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\[e-mail de reembolso\]/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /política de privacidade/i })).toHaveAttribute(
      'href',
      '/privacidade',
    )
  })
})
