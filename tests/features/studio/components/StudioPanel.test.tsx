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
  it('renderiza dropdown de produto e 4 blocos', () => {
    renderPanel()
    expect(screen.getByRole('heading', { name: /produto/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /texto/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /base/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /argola/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /relevo/i })).toBeInTheDocument()
  })

  it('renderiza campo de nome e estilo de letra', () => {
    renderPanel()
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /negrito/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /normal/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /serifada/i })).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: /normal/i }))
    expect(onUpdate).toHaveBeenCalledWith('fontStyle', 'normal')
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
