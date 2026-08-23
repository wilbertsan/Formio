import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioToolbar } from '@/features/studio/components/StudioToolbar'
import type { KeychainParams } from '@/features/studio/keychain/schema'

function renderToolbar(overrides?: {
  activeShape?: KeychainParams['shape']
  textMode?: KeychainParams['textMode']
}) {
  return render(
    <StudioToolbar
      activeShape={overrides?.activeShape ?? 'rect'}
      textMode={overrides?.textMode ?? 'raised'}
      onSelectShape={() => undefined}
      onSelectTextMode={() => undefined}
      onResetCamera={() => undefined}
    />,
  )
}

describe('StudioToolbar', () => {
  it('renderiza formas, modos de texto e reset de câmera', () => {
    renderToolbar()
    expect(screen.getByRole('button', { name: 'Retângulo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Círculo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coração' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Relevo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gravado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resetar câmera' })).toBeInTheDocument()
  })

  it('não renderiza botões de câmera decorativos antigos', () => {
    renderToolbar()
    expect(screen.queryByRole('button', { name: 'Selecionar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mover' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rotacionar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zoom' })).not.toBeInTheDocument()
  })

  it('marca a forma ativa com aria-pressed', () => {
    renderToolbar({ activeShape: 'heart' })
    expect(screen.getByRole('button', { name: 'Coração' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Retângulo' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('marca o modo de texto ativo com aria-pressed', () => {
    renderToolbar({ textMode: 'engraved' })
    expect(screen.getByRole('button', { name: 'Gravado' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Relevo' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('dispara onSelectShape ao clicar em uma forma', async () => {
    const user = userEvent.setup()
    const onSelectShape = vi.fn()
    render(
      <StudioToolbar
        activeShape="rect"
        textMode="raised"
        onSelectShape={onSelectShape}
        onSelectTextMode={() => undefined}
        onResetCamera={() => undefined}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Círculo' }))
    expect(onSelectShape).toHaveBeenCalledWith('circle')
  })

  it('dispara onSelectTextMode ao clicar em um modo', async () => {
    const user = userEvent.setup()
    const onSelectTextMode = vi.fn()
    render(
      <StudioToolbar
        activeShape="rect"
        textMode="raised"
        onSelectShape={() => undefined}
        onSelectTextMode={onSelectTextMode}
        onResetCamera={() => undefined}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Gravado' }))
    expect(onSelectTextMode).toHaveBeenCalledWith('engraved')
  })

  it('dispara onResetCamera ao clicar em resetar', async () => {
    const user = userEvent.setup()
    const onResetCamera = vi.fn()
    render(
      <StudioToolbar
        activeShape="rect"
        textMode="raised"
        onSelectShape={() => undefined}
        onSelectTextMode={() => undefined}
        onResetCamera={onResetCamera}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Resetar câmera' }))
    expect(onResetCamera).toHaveBeenCalledTimes(1)
  })
})
