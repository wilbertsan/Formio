import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioParameters } from '@/features/studio/components/StudioParameters'
import { defaultParameters } from '@/features/studio/config/parameters'

const renderParameters = (
  onUpdate = () => undefined,
  onReset = () => undefined,
) =>
  render(
    <StudioParameters
      parameters={defaultParameters}
      onUpdateParameter={onUpdate}
      onResetParameters={onReset}
    />,
  )

describe('StudioParameters', () => {
  it('renderiza o título e os cinco parâmetros', () => {
    renderParameters()
    expect(screen.getByRole('heading', { name: 'Parâmetros' })).toBeInTheDocument()
    expect(screen.getByLabelText('Largura')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura')).toBeInTheDocument()
    expect(screen.getByLabelText('Profundidade')).toBeInTheDocument()
    expect(screen.getByLabelText('Raio de arredondamento')).toBeInTheDocument()
    expect(screen.getByLabelText('Segmentos')).toBeInTheDocument()
  })

  it('exibe o valor atual em mm ao lado do label', () => {
    renderParameters()
    expect(screen.getByText('60 mm')).toBeInTheDocument()
    expect(screen.getByText('40 mm')).toBeInTheDocument()
    expect(screen.getByText('30 mm')).toBeInTheDocument()
  })

  it('dispara onUpdateParameter ao alterar um slider', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    renderParameters(onUpdate)
    const sliderThumbs = screen.getAllByRole('slider')
    const widthThumb = sliderThumbs[0]
    await user.click(widthThumb)
    await user.keyboard('{ArrowRight}')
    expect(onUpdate).toHaveBeenCalledWith('width', 61)
  })

  it('dispara onResetParameters ao clicar em restaurar', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    renderParameters(undefined, onReset)
    await user.click(screen.getByRole('button', { name: /restaurar padrão/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
