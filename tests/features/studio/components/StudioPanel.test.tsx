import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioPanel } from '@/features/studio/components/StudioPanel'
import { defaultKeychainParams, PLA_COLORS } from '@/features/studio/keychain/schema'

function renderPanel(
  onUpdate = () => undefined,
  onName = () => undefined,
  onReset = () => undefined,
) {
  return render(
    <StudioPanel
      params={defaultKeychainParams}
      onUpdateParam={onUpdate}
      onUpdateName={onName}
      onReset={onReset}
    />,
  )
}

describe('StudioPanel', () => {
  it('renderiza dropdown de produto e 3 blocos', () => {
    renderPanel()
    expect(screen.getByRole('heading', { name: /produto/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /texto/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /base/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /argola/i })).toBeInTheDocument()
  })

  it('renderiza campo de nome e dropdown de estilo de letra', () => {
    renderPanel()
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: /estilo da letra/i })).toBeInTheDocument()
  })

  it('renderiza swatches de cor de base e letras', () => {
    renderPanel()
    for (const color of PLA_COLORS.slice(0, 3)) {
      const buttons = screen.getAllByRole('button', { name: new RegExp(color) })
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('renderiza controles de argola (posição, sliders)', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /cima/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /baixo/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/diâmetro interno/i)).toBeInTheDocument()
  })

  it('dispara onUpdateParam ao trocar estilo de letra', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    renderPanel(onUpdate)
    await user.selectOptions(screen.getByRole('listbox', { name: /estilo da letra/i }), 'normal')
    expect(onUpdate).toHaveBeenCalledWith('fontStyle', 'normal')
  })

  it('renderiza sliders de largura do texto, altura do texto e altura do relevo no bloco Texto', () => {
    renderPanel()
    expect(screen.getByLabelText('Largura do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura do relevo')).toBeInTheDocument()
  })

  it('renderiza slider de largura da peça no bloco Base', () => {
    renderPanel()
    expect(screen.getByLabelText('Largura da peça')).toBeInTheDocument()
  })

  it('não renderiza botões soltos de estilo', () => {
    renderPanel()
    expect(screen.queryByRole('button', { name: /^negrito$/i })).not.toBeInTheDocument()
  })

  it('dispara onUpdateName ao digitar nome', async () => {
    const user = userEvent.setup()
    const onName = vi.fn()
    renderPanel(undefined, onName)
    await user.type(screen.getByLabelText(/nome/i), 'a')
    expect(onName).toHaveBeenCalled()
  })

  it('restaura padrão', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    renderPanel(undefined, undefined, onReset)
    await user.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
