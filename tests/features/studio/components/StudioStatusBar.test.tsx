import { render, screen } from '@testing-library/react'
import { StudioStatusBar } from '@/features/studio/components/StudioStatusBar'

const defaultDimensions = { width: 50, height: 25, thickness: 3 }

describe('StudioStatusBar', () => {
  it('exibe as dimensões atuais em mm', () => {
    render(<StudioStatusBar dimensions={defaultDimensions} />)
    expect(screen.getByText('50 × 25 × 3 mm')).toBeInTheDocument()
  })
  it('exibe a dica de navegação', () => {
    render(<StudioStatusBar dimensions={defaultDimensions} />)
    expect(screen.getByText(/arraste para girar • scroll para zoom • botão direito para pan/i)).toBeInTheDocument()
  })
  it('reflete mudanças nos parâmetros', () => {
    render(<StudioStatusBar dimensions={{ width: 80, height: 60, thickness: 4 }} />)
    expect(screen.getByText('80 × 60 × 4 mm')).toBeInTheDocument()
  })
})
