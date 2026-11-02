import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioPanel } from '@/features/studio/tools/chaveiros/chaveiro/StudioPanel'
import {
  defaultKeychainParams,
  type IconContent,
  type KeychainParams,
} from '@/features/studio/tools/chaveiros/chaveiro/schema'

type PanelProps = ComponentProps<typeof StudioPanel>

const firstContentId = defaultKeychainParams.contents[0].id

const iconContent: IconContent = {
  id: 'i1',
  kind: 'icon',
  svgIcon: null,
  iconScale: 1,
  iconLineWidth: 0.3,
  offsetX: 0,
  offsetY: 0,
}

function iconParams(svgIcon: string | null = null): KeychainParams {
  return {
    ...defaultKeychainParams,
    contents: [{ ...iconContent, svgIcon }],
  }
}

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const props: PanelProps = {
    params: defaultKeychainParams,
    selectedContentId: firstContentId,
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

  render(<StudioPanel {...props} />)
  return props
}

function getSlider(label: string): HTMLElement {
  return within(screen.getByLabelText(label)).getByRole('slider')
}

describe('StudioPanel', () => {
  it('renderiza o primeiro conteúdo, botão de adicionar e tipo de conteúdo', () => {
    renderPanel()

    expect(screen.getByRole('button', { name: /meu nome/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Texto' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Ícone' })).not.toBeChecked()
  })

  it('chama onAddContent ao clicar em Adicionar texto', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('button', { name: /adicionar texto/i }))

    expect(props.onAddContent).toHaveBeenCalledTimes(1)
  })

  it('chama onSelectContent ao clicar em outro chip', async () => {
    const user = userEvent.setup()
    const second = { ...defaultKeychainParams.contents[0], id: 'content-2', content: 'Outro' }
    const props = renderPanel({
      params: { ...defaultKeychainParams, contents: [defaultKeychainParams.contents[0], second] },
    })

    await user.click(screen.getByRole('button', { name: 'Outro' }))

    expect(props.onSelectContent).toHaveBeenCalledWith('content-2')
  })

  it('mostra botão de remover apenas com mais de um conteúdo', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <StudioPanel
        {...{
          params: defaultKeychainParams,
          selectedContentId: firstContentId,
          onSelectContent: vi.fn(),
          onUpdateContent: vi.fn(),
          onSetContentType: vi.fn(),
          onAddContent: vi.fn(),
          onRemoveContent: vi.fn(),
          onUpdateParam: vi.fn(),
          onReset: vi.fn(),
          onOpenEditor: vi.fn(),
        }}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Remover conteúdo' })).not.toBeInTheDocument()
    unmount()

    const onRemoveContent = vi.fn()
    const second = { ...defaultKeychainParams.contents[0], id: 'content-2', content: 'Outro' }
    renderPanel({
      params: { ...defaultKeychainParams, contents: [defaultKeychainParams.contents[0], second] },
      onRemoveContent,
    })
    await user.click(screen.getByRole('button', { name: 'Remover conteúdo' }))
    expect(onRemoveContent).toHaveBeenCalledWith(firstContentId)
  })

  it('renderiza controles de texto e dispara onUpdateContent', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    expect(screen.getByLabelText('Conteúdo')).toBeInTheDocument()
    expect(screen.getByLabelText('Estilo da letra')).toBeInTheDocument()
    expect(screen.getByLabelText('Tamanho da fonte')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'Novo' } })
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstContentId, { content: 'Novo' })

    await user.selectOptions(screen.getByLabelText('Estilo da letra'), 'serif')
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstContentId, { fontStyle: 'serif' })

    fireEvent.keyDown(getSlider('Tamanho da fonte'), { key: 'ArrowRight' })
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstContentId, { fontSize: 11 })
  })

  it('chama onSetContentType ao selecionar Ícone', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('radio', { name: 'Ícone' }))

    expect(props.onSetContentType).toHaveBeenCalledWith(firstContentId, 'icon')
  })

  it('renderiza controles de ícone sem svg carregado', () => {
    renderPanel({ params: iconParams(null), selectedContentId: 'i1' })

    expect(screen.getByRole('button', { name: /upload svg/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remover ícone/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Escala do ícone')).toBeInTheDocument()
    expect(screen.getByLabelText('Espessura da linha do ícone')).toBeInTheDocument()
  })

  it('renderiza estado de ícone carregado e permite removê-lo', async () => {
    const user = userEvent.setup()
    const props = renderPanel({ params: iconParams('<svg></svg>'), selectedContentId: 'i1' })

    expect(screen.getByText('Ícone carregado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upload svg/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remover ícone/i }))

    expect(props.onUpdateContent).toHaveBeenCalledWith('i1', { svgIcon: null })
  })

  it('carrega arquivo SVG e envia seu conteúdo', async () => {
    const user = userEvent.setup()
    const props = renderPanel({ params: iconParams(null), selectedContentId: 'i1' })
    const file = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' })

    await user.upload(screen.getByTestId('icon-upload'), file)

    await waitFor(() =>
      expect(props.onUpdateContent).toHaveBeenCalledWith('i1', { svgIcon: '<svg></svg>' }),
    )
  })

  it('dispara onOpenEditor ao clicar em Posicionar textos', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('button', { name: /posicionar textos/i }))

    expect(props.onOpenEditor).toHaveBeenCalledTimes(1)
  })

  it('renderiza as seções Conteúdo, Formato, Relevo, Argola e Aparência', () => {
    renderPanel()

    for (const section of ['Conteúdo', 'Formato', 'Relevo', 'Argola', 'Aparência']) {
      expect(screen.getByRole('heading', { name: section })).toBeInTheDocument()
    }
  })

  it('mostra comprimento e altura no formato retangular', () => {
    renderPanel({ params: defaultKeychainParams })

    expect(screen.getByLabelText('Comprimento')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura da peça')).toBeInTheDocument()
  })

  it('oculta altura no formato circular', () => {
    renderPanel({ params: { ...defaultKeychainParams, baseShape: 'circle' } })

    expect(screen.getByLabelText('Comprimento')).toBeInTheDocument()
    expect(screen.queryByLabelText('Altura da peça')).not.toBeInTheDocument()
  })

  it('oculta comprimento e altura no formato contorno do nome', () => {
    renderPanel({ params: { ...defaultKeychainParams, baseShape: 'name' } })

    expect(screen.queryByLabelText('Comprimento')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Altura da peça')).not.toBeInTheDocument()
    expect(screen.getByText(/tamanho controlado/i)).toBeInTheDocument()
  })

  it('mostra comprimento e altura no formato coração', () => {
    renderPanel({ params: { ...defaultKeychainParams, baseShape: 'heart' } })

    expect(screen.getByLabelText('Comprimento')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura da peça')).toBeInTheDocument()
  })

  it('dispara onUpdateParam ao trocar formato e espessura', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.selectOptions(screen.getByLabelText('Formato'), 'circle')
    expect(props.onUpdateParam).toHaveBeenCalledWith('baseShape', 'circle')

    fireEvent.keyDown(getSlider('Espessura'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('thickness', 3.5)
  })

  it('dispara onUpdateParam ao alterar relevo', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.selectOptions(screen.getByLabelText('Modo de relevo'), 'engraved')
    expect(props.onUpdateParam).toHaveBeenCalledWith('textMode', 'engraved')

    fireEvent.keyDown(getSlider('Profundidade do relevo'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('reliefDepth', 1.1)
  })

  it('dispara onUpdateParam ao alterar controles da argola', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.selectOptions(screen.getByLabelText('Posição'), 'left')
    expect(props.onUpdateParam).toHaveBeenCalledWith('ringPosition', 'left')

    fireEvent.keyDown(getSlider('Diâmetro interno'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('ringInnerDiameter', 5.5)

    fireEvent.keyDown(getSlider('Embutimento'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('ringEmbedding', 0.5)

    fireEvent.keyDown(getSlider('Deslocamento radial'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('ringRadialOffset', 0.5)

    fireEvent.keyDown(getSlider('Deslocamento lateral'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('ringLateralOffset', 0.5)
  })

  it('dispara onUpdateParam ao escolher cores da base e das letras', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getAllByLabelText('#ef4444')[0])
    expect(props.onUpdateParam).toHaveBeenCalledWith('baseColor', '#ef4444')

    await user.click(screen.getAllByLabelText('#3b82f6')[1])
    expect(props.onUpdateParam).toHaveBeenCalledWith('letterColor', '#3b82f6')
  })

  it('restaura os padrões', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('button', { name: /restaurar/i }))

    expect(props.onReset).toHaveBeenCalledTimes(1)
  })
})
