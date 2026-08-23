import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FaqSection } from '@/features/landing/components/FaqSection'

describe('FaqSection', () => {
  it('renderiza o título e todas as perguntas', () => {
    render(<FaqSection />)
    expect(screen.getByRole('heading', { name: /perguntas frequentes/i })).toBeInTheDocument()
    expect(screen.getByText(/preciso instalar algo/i)).toBeInTheDocument()
    expect(screen.getByText(/o que são créditos/i)).toBeInTheDocument()
    expect(screen.getByText(/posso cancelar quando quiser/i)).toBeInTheDocument()
  })

  it('exibe a resposta ao expandir uma pergunta', async () => {
    const user = userEvent.setup()
    render(<FaqSection />)
    await user.click(screen.getByText(/o que são créditos/i))
    expect(screen.getByText(/créditos são a moeda do 3dformio/i)).toBeInTheDocument()
  })
})
