import { render, screen } from '@testing-library/react'
import { StudioStatusBar } from '@/features/studio/components/StudioStatusBar'
import { defaultParameters } from '@/features/studio/config/parameters'

describe('StudioStatusBar', () => {
  it('exibe as dimensões atuais em mm', () => {
    render(<StudioStatusBar parameters={defaultParameters} />)
    expect(screen.getByText('60 × 40 × 30 mm')).toBeInTheDocument()
  })
  it('exibe a dica de navegação', () => {
    render(<StudioStatusBar parameters={defaultParameters} />)
    expect(screen.getByText(/arraste para girar • scroll para zoom • botão direito para pan/i)).toBeInTheDocument()
  })
  it('reflete mudanças nos parâmetros', () => {
    render(<StudioStatusBar parameters={{ ...defaultParameters, width: 100, height: 10, depth: 50 }} />)
    expect(screen.getByText('100 × 10 × 50 mm')).toBeInTheDocument()
  })
})
