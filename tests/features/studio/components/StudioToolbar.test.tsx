import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioToolbar, StudioTool } from '@/features/studio/components/StudioToolbar'

const renderToolbar = (overrides?: Partial<{ activeTool: StudioTool }>) =>
  render(
    <StudioToolbar
      activeTool={overrides?.activeTool ?? 'select'}
      onSelectTool={() => undefined}
      onResetCamera={() => undefined}
    />,
  )

describe('StudioToolbar', () => {
  it('renderiza as cinco ferramentas', () => {
    renderToolbar()
    expect(screen.getByRole('button', { name: 'Selecionar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mover' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rotacionar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resetar câmera' })).toBeInTheDocument()
  })

  it('marca a ferramenta ativa com aria-pressed', () => {
    renderToolbar({ activeTool: 'move' })
    expect(screen.getByRole('button', { name: 'Mover' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Selecionar' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('dispara onSelectTool ao clicar em uma ferramenta', async () => {
    const user = userEvent.setup()
    const onSelectTool = vi.fn()
    render(
      <StudioToolbar
        activeTool="select"
        onSelectTool={onSelectTool}
        onResetCamera={() => undefined}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Rotacionar' }))
    expect(onSelectTool).toHaveBeenCalledWith('rotate')
  })

  it('dispara onResetCamera ao clicar em resetar', async () => {
    const user = userEvent.setup()
    const onResetCamera = vi.fn()
    render(
      <StudioToolbar
        activeTool="select"
        onSelectTool={() => undefined}
        onResetCamera={onResetCamera}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Resetar câmera' }))
    expect(onResetCamera).toHaveBeenCalledTimes(1)
  })
})
