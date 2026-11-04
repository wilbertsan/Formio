import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrivacyPage } from '@/features/legal/PrivacyPage'

function renderPrivacyPage() {
  return render(
    <MemoryRouter initialEntries={['/privacidade']}>
      <PrivacyPage />
    </MemoryRouter>,
  )
}

describe('PrivacyPage', () => {
  it('renderiza a página com navbar, título e footer', () => {
    renderPrivacyPage()

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /política de privacidade/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('exibe o índice com link direto para cookies e retenção', () => {
    renderPrivacyPage()

    const toc = screen.getByRole('navigation', { name: /índice da política de privacidade/i })
    expect(within(toc).getByRole('link', { name: /cookies e publicidade/i })).toHaveAttribute(
      'href',
      '#cookies',
    )
    expect(within(toc).getByRole('link', { name: /por quanto tempo/i })).toHaveAttribute(
      'href',
      '#retencao',
    )
  })

  it('renderiza as seções principais com âncoras', () => {
    renderPrivacyPage()

    expect(document.getElementById('introducao')).not.toBeNull()
    expect(document.getElementById('cookies')).not.toBeNull()
    expect(document.getElementById('direitos')).not.toBeNull()
    expect(
      screen.getByRole('heading', { level: 2, name: /7\. cookies e publicidade/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/LGPD/i).length).toBeGreaterThan(0)
  })

  it('exibe os contatos placeholder e o link para os termos de uso', () => {
    renderPrivacyPage()

    expect(screen.getAllByText(/\[e-mail de privacidade\]/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\[e-mail de atendimento\]/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /termos de uso/i })).toHaveAttribute(
      'href',
      '/termos',
    )
  })
})
