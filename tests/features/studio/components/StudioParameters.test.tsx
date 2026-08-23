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
  it('renderiza título e campo de nome', () => {
    renderParameters()
    expect(screen.getByRole('heading', { name: 'Parâmetros' })).toBeInTheDocument()
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
  })

  it('não renderiza controles de forma e modo (movidos para a toolbar)', () => {
    renderParameters()
    expect(screen.queryByRole('button', { name: /retângulo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /coração/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/relevo/i)).not.toBeInTheDocument()
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

  it('exibe o valor em mm ao lado de cada slider', () => {
    renderParameters()
    expect(screen.getByText('50 mm')).toBeInTheDocument()
    expect(screen.getByText('25 mm')).toBeInTheDocument()
    expect(screen.getByText('3 mm')).toBeInTheDocument()
  })

  it('dispara onUpdateName ao digitar', async () => {
    const user = userEvent.setup()
    const onName = vi.fn()
    renderParameters(undefined, onName)
    await user.type(screen.getByLabelText(/nome/i), 'a')
    expect(onName).toHaveBeenCalled()
  })

  it('restaura padrão', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    renderParameters(undefined, undefined, onReset)
    await user.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
