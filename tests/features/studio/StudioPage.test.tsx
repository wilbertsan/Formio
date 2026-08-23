import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudioPage } from '@/features/studio/StudioPage'

function renderStudioPage() {
  return render(
    <MemoryRouter>
      <StudioPage />
    </MemoryRouter>,
  )
}

describe('StudioPage', () => {
  it('renderiza o topo com o nome do projeto', () => {
    renderStudioPage()
    expect(screen.getByText('3DFormio')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /nome do projeto/i })).toBeInTheDocument()
  })

  it('renderiza os controles de ferramentas', () => {
    renderStudioPage()
    expect(screen.getByRole('navigation', { name: /ferramentas do studio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /selecionar/i })).toBeInTheDocument()
  })

  it('renderiza a seção de parâmetros', () => {
    renderStudioPage()
    expect(screen.getByRole('complementary', { name: /parâmetros do modelo/i })).toBeInTheDocument()
    expect(screen.getByText('Parâmetros')).toBeInTheDocument()
  })

  it('renderiza a viewport 3d', () => {
    renderStudioPage()
    expect(screen.getByRole('img', { name: /visualização 3d do modelo/i })).toBeInTheDocument()
  })

  it('renderiza a barra de status', () => {
    renderStudioPage()
    expect(screen.getByText(/arraste para girar/i)).toBeInTheDocument()
  })
})
