import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioParameters } from '@/features/studio/components/StudioParameters'
import { defaultKeychainParams } from '@/features/studio/keychain/schema'

function renderParameters(
  onUpdate = () => undefined,
  onName = () => undefined,
  onReset = () => undefined,
) {
  return render(
    <StudioParameters
      params={defaultKeychainParams}
      onUpdateParam={onUpdate}
      onUpdateName={onName}
      onReset={onReset}
    />,
  )
}

describe('StudioParameters', () => {
  it('renderiza título, campo de nome e seletores', () => {
    renderParameters()
    expect(screen.getByRole('heading', { name: 'Parâmetros' })).toBeInTheDocument()
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retângulo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /círculo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /coração/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/relevo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gravado/i)).toBeInTheDocument()
  })

  it('renderiza os seis sliders', () => {
    renderParameters()
    expect(screen.getByLabelText('Largura')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura')).toBeInTheDocument()
    expect(screen.getByLabelText('Espessura')).toBeInTheDocument()
    expect(screen.getByLabelText('Tamanho do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Profundidade do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Diâmetro do furo')).toBeInTheDocument()
  })

  it('dispara onUpdateName ao digitar', async () => {
    const user = userEvent.setup()
    const onName = vi.fn()
    renderParameters(undefined, onName)
    await user.type(screen.getByLabelText(/nome/i), 'a')
    expect(onName).toHaveBeenCalled()
  })

  it('seleciona forma clicando no botão', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    renderParameters(onUpdate)
    await user.click(screen.getByRole('button', { name: /círculo/i }))
    expect(onUpdate).toHaveBeenCalledWith('shape', 'circle')
  })

  it('seleciona modo de texto', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    renderParameters(onUpdate)
    await user.click(screen.getByLabelText(/gravado/i))
    expect(onUpdate).toHaveBeenCalledWith('textMode', 'engraved')
  })

  it('restaura padrão', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    renderParameters(undefined, undefined, onReset)
    await user.click(screen.getByRole('button', { name: /restaurar padrão/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
