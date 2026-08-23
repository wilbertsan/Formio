import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioTopbar } from '@/features/studio/components/StudioTopbar'

const renderTopbar = (overrides?: Partial<{ projectName: string }>) =>
  render(
    <StudioTopbar
      projectName={overrides?.projectName ?? 'Projeto sem título'}
      onProjectNameChange={() => undefined}
    />,
  )

describe('StudioTopbar', () => {
  it('renderiza como header com a marca', () => {
    renderTopbar()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('3DFormio')).toBeInTheDocument()
  })

  it('exibe o nome do projeto em campo editável', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <StudioTopbar projectName="Projeto sem título" onProjectNameChange={handleChange} />,
    )
    const input = screen.getByRole('textbox', { name: /nome do projeto/i })
    expect(input).toHaveValue('Projeto sem título')
    await user.type(input, '!')
    expect(handleChange).toHaveBeenCalled()
  })

  it('exibe botões Salvar e Exportar STL desabilitados', () => {
    renderTopbar()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Exportar STL' })).toBeDisabled()
  })
})
