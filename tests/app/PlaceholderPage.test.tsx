import { render, screen } from '@testing-library/react'
import { PlaceholderPage } from '@/app/PlaceholderPage'

describe('PlaceholderPage', () => {
  it('renderiza sem crash', () => {
    render(<PlaceholderPage />)
    expect(screen.getByText('Página em construção')).toBeInTheDocument()
  })

  it('exibe mensagem informativa', () => {
    render(<PlaceholderPage />)
    expect(screen.getByText(/em breve/i)).toBeInTheDocument()
  })
})
