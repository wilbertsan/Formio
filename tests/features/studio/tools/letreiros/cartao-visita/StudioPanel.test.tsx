import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioPanel } from '@/features/studio/tools/letreiros/cartao-visita/StudioPanel'
import {
  defaultCardParams,
  type CardParams,
  type IconContent,
} from '@/features/studio/tools/letreiros/cartao-visita/schema'

type PanelProps = ComponentProps<typeof StudioPanel>

const firstId = defaultCardParams.contents[0].id

function createPanelProps(overrides: Partial<PanelProps> = {}): PanelProps {
  return {
    params: defaultCardParams,
    selectedContentId: firstId,
    onSelectContent: vi.fn(),
    onUpdateContent: vi.fn(),
    onSetContentType: vi.fn(),
    onAddContent: vi.fn(),
    onRemoveContent: vi.fn(),
    onUpdateParam: vi.fn(),
    onReset: vi.fn(),
    onOpenEditor: vi.fn(),
    ...overrides,
  }
}

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const props = createPanelProps(overrides)
  render(<StudioPanel {...props} />)
  return props
}

function iconParams(svgIcon: string | null = null): CardParams {
  const icon: IconContent = {
    id: 'icon-1',
    kind: 'icon',
    svgIcon,
    iconScale: 1,
    iconLineWidth: 0.3,
    offsetX: 0,
    offsetY: 0,
  }
  return { ...defaultCardParams, contents: [icon] }
}

function getSlider(label: string): HTMLElement {
  return within(screen.getByLabelText(label)).getByRole('slider')
}

describe('StudioPanel', () => {
  it('renderiza título, chips, adicionar e tipo de conteúdo', () => {
    renderPanel()
    expect(screen.getByRole('heading', { level: 2, name: 'Cartão de Visita' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seu nome/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Texto' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Ícone' })).not.toBeChecked()
  })

  it('usa "Texto" no chip quando o conteúdo está vazio', () => {
    const first = defaultCardParams.contents[0]
    if (first.kind !== 'text') throw new Error('conteúdo inesperado')
    const params: CardParams = {
      ...defaultCardParams,
      contents: [{ ...first, content: '' }],
    }
    renderPanel({ params })
    expect(screen.getByRole('button', { name: 'Texto' })).toBeInTheDocument()
  })

  it('desabilita Adicionar texto com três conteúdos', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeDisabled()
  })

  it('seleciona, adiciona e remove conteúdos', async () => {
    const user = userEvent.setup()
    const props = renderPanel({
      params: {
        ...defaultCardParams,
        contents: [defaultCardParams.contents[0], defaultCardParams.contents[1]],
      },
    })
    await user.click(screen.getByRole('button', { name: /seu cargo/i }))
    expect(props.onSelectContent).toHaveBeenCalledWith(defaultCardParams.contents[1].id)

    await user.click(screen.getByRole('button', { name: /adicionar texto/i }))
    expect(props.onAddContent).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Remover conteúdo' }))
    expect(props.onRemoveContent).toHaveBeenCalledWith(firstId)
  })

  it('não mostra remover com um único conteúdo', () => {
    renderPanel({ params: { ...defaultCardParams, contents: [defaultCardParams.contents[0]] } })
    expect(screen.queryByRole('button', { name: 'Remover conteúdo' })).not.toBeInTheDocument()
  })

  it('edita texto sem limite de caracteres e dispara callbacks', async () => {
    const user = userEvent.setup()
    const props = renderPanel()
    expect(screen.getByLabelText('Conteúdo')).not.toHaveAttribute('maxlength')

    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'Maria' } })
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstId, { content: 'Maria' })

    await user.selectOptions(screen.getByLabelText('Estilo da letra'), 'serif')
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstId, { fontStyle: 'serif' })

    fireEvent.keyDown(getSlider('Tamanho da fonte'), { key: 'ArrowRight' })
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstId, { fontSize: 7.5 })
  })

  it('alterna para ícone e mostra upload', async () => {
    const user = userEvent.setup()
    const props = renderPanel()
    await user.click(screen.getByRole('radio', { name: 'Ícone' }))
    expect(props.onSetContentType).toHaveBeenCalledWith(firstId, 'icon')
  })

  it('faz upload de SVG e chama onUpdateContent', async () => {
    const props = renderPanel({ params: iconParams() })
    const file = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>'],
      'logo.svg',
      { type: 'image/svg+xml' },
    )
    fireEvent.change(screen.getByTestId('icon-upload'), { target: { files: [file] } })
    await waitFor(() => {
      expect(props.onUpdateContent).toHaveBeenCalledWith('icon-1', {
        svgIcon: expect.stringContaining('<svg'),
      })
    })
  })

  it('rejeita arquivo que não é SVG', async () => {
    renderPanel({ params: iconParams() })
    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('icon-upload'), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Envie um arquivo SVG de até 1 MB.')
  })

  it('rejeita SVG maior que 1 MB', async () => {
    renderPanel({ params: iconParams() })
    const file = new File(
      [new Uint8Array(1024 * 1024 + 1)],
      'grande.svg',
      { type: 'image/svg+xml' },
    )
    fireEvent.change(screen.getByTestId('icon-upload'), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Envie um arquivo SVG de até 1 MB.')
  })

  it('desabilita sliders do ícone sem SVG', () => {
    renderPanel({ params: iconParams(null) })
    expect(screen.getByLabelText('Escala do ícone')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByLabelText('Espessura da linha do ícone')).toHaveAttribute('aria-disabled', 'true')
  })

  it('atualiza parâmetros do cartão', () => {
    const props = renderPanel()
    fireEvent.keyDown(getSlider('Largura'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('width', 86)
    fireEvent.keyDown(getSlider('Altura'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('height', 56)
    fireEvent.keyDown(getSlider('Espessura'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('thickness', 2.5)
    fireEvent.keyDown(getSlider('Cantos arredondados'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('cornerRadius', 3.5)
  })

  it('abre o editor e restaura defaults', async () => {
    const user = userEvent.setup()
    const props = renderPanel()
    await user.click(screen.getByRole('button', { name: /posicionar conteúdos/i }))
    expect(props.onOpenEditor).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(props.onReset).toHaveBeenCalledTimes(1)
  })

  it('não exibe seções Layout ou Relevo', () => {
    renderPanel()
    expect(screen.queryByText('Layout')).not.toBeInTheDocument()
    expect(screen.queryByText('Relevo')).not.toBeInTheDocument()
    expect(screen.getByText(/elevados em 1 mm/i)).toBeInTheDocument()
  })
})
