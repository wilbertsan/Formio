import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { StudioPanel } from '@/features/studio/tools/confeitaria/topo-bolo/StudioPanel'
import { defaultCakeTopperParams } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

describe('StudioPanel', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createMockProps = () => ({
    params: defaultCakeTopperParams,
    onUpdateParam: vi.fn(),
    onAddText: vi.fn(),
    onRemoveText: vi.fn(),
    onUpdateTextById: vi.fn(),
    onSetSvgIcon: vi.fn(),
    onSetContourSvg: vi.fn(),
    onReset: vi.fn(),
  })

  it('renderiza o cabeçalho', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.getByRole('heading', { name: 'Topo de Bolo' })).toBeInTheDocument()
  })

  it('renderiza as seções do accordion', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.getByRole('heading', { name: 'Texto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Formato' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ícone' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fixação' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aparência' })).toBeInTheDocument()
  })

  it('dispara onUpdateParam ao mudar a forma', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.change(screen.getByLabelText('Forma'), { target: { value: 'oval' } })
    expect(props.onUpdateParam).toHaveBeenCalledWith('shape', 'oval')
  })

  it('dispara onUpdateParam ao mudar o tipo de fixação', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.change(screen.getByLabelText('Tipo de fixação'), { target: { value: 'base' } })
    expect(props.onUpdateParam).toHaveBeenCalledWith('supportType', 'base')
  })

  it('dispara onAddText ao clicar em Adicionar texto', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.click(screen.getByText(/adicionar texto/i))
    expect(props.onAddText).toHaveBeenCalled()
  })

  it('dispara onRemoveText ao clicar em ×', () => {
    const props = createMockProps()
    const params = {
      ...defaultCakeTopperParams,
      texts: [
        defaultCakeTopperParams.texts[0],
        { ...defaultCakeTopperParams.texts[0], id: 'text-2', content: 'Texto 2' },
      ],
    }
    render(<StudioPanel {...props} params={params} />)
    fireEvent.click(screen.getByLabelText('Remover texto Texto 2'))
    expect(props.onRemoveText).toHaveBeenCalledWith('text-2')
  })

  it('botão adicionar texto desabilitado quando há 3 textos', () => {
    const props = createMockProps()
    const params = {
      ...defaultCakeTopperParams,
      texts: [
        defaultCakeTopperParams.texts[0],
        { ...defaultCakeTopperParams.texts[0], id: 'text-2', content: 'Texto 2' },
        { ...defaultCakeTopperParams.texts[0], id: 'text-3', content: 'Texto 3' },
      ],
    }
    render(<StudioPanel {...props} params={params} />)
    expect(screen.getByText(/adicionar texto/i)).toBeDisabled()
  })

  it('dispara onUpdateTextById ao mudar o conteúdo', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'Novo texto' } })
    expect(props.onUpdateTextById).toHaveBeenCalledWith('text-1', { content: 'Novo texto' })
  })

  it('dispara onUpdateParam ao clicar em uma cor da base', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.click(screen.getAllByLabelText('#ef4444')[0])
    expect(props.onUpdateParam).toHaveBeenCalledWith('baseColor', '#ef4444')
  })

  it('abre o editor de posição ao clicar em Posicionar textos', () => {
    render(<StudioPanel {...createMockProps()} />)
    fireEvent.click(screen.getByText(/posicionar textos/i))
    expect(screen.getByTestId('text-editor')).toBeInTheDocument()
  })

  it('dispara onReset ao clicar em Restaurar', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.click(screen.getByText(/restaurar/i))
    expect(props.onReset).toHaveBeenCalled()
  })

  it('remove desabilitado quando há apenas 1 texto', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.getByLabelText('Remover texto Feliz Aniversário')).toBeDisabled()
  })

  it('seleciona automaticamente o texto recém-adicionado', () => {
    const props = createMockProps()
    const { rerender } = render(<StudioPanel {...props} />)
    expect(screen.getByText('Feliz Aniversário')).toHaveAttribute('aria-pressed', 'true')

    const params = {
      ...defaultCakeTopperParams,
      texts: [
        ...defaultCakeTopperParams.texts,
        { ...defaultCakeTopperParams.texts[0], id: 'text-2', content: 'Texto 2' },
      ],
    }
    rerender(<StudioPanel {...props} params={params} />)
    expect(screen.getByText('Texto 2')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Feliz Aniversário')).toHaveAttribute('aria-pressed', 'false')
  })

  it('dispara onUpdateTextById ao mover o slider de largura', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    const slider = screen.getByRole('slider', { name: /largura do texto/i })
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(props.onUpdateTextById).toHaveBeenCalledWith('text-1', { width: 91 })
  })

  it('dispara onUpdateParam ao clicar em uma cor das letras', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.click(screen.getAllByLabelText('#3b82f6')[1])
    expect(props.onUpdateParam).toHaveBeenCalledWith('letterColor', '#3b82f6')
  })

  it('mostra sliders de base quando supportType é base', () => {
    const props = createMockProps()
    render(
      <StudioPanel {...props} params={{ ...defaultCakeTopperParams, supportType: 'base' }} />,
    )
    expect(screen.getByRole('slider', { name: /largura da base/i })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: /profundidade do encaixe/i })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tipo de fixação'), { target: { value: 'base' } })
    expect(props.onUpdateParam).toHaveBeenCalledWith('supportType', 'base')
  })

  it('carrega ícone SVG e chama onSetSvgIcon', async () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    const file = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' })
    fireEvent.change(screen.getByLabelText('Carregar ícone SVG'), { target: { files: [file] } })
    await waitFor(() => expect(props.onSetSvgIcon).toHaveBeenCalledWith('<svg></svg>'))
  })

  it('carrega contorno SVG no formato personalizado', async () => {
    const props = createMockProps()
    render(<StudioPanel {...props} params={{ ...defaultCakeTopperParams, shape: 'custom' }} />)
    const file = new File(['<svg id="c"></svg>'], 'contour.svg', { type: 'image/svg+xml' })
    fireEvent.change(screen.getByLabelText('Carregar contorno SVG'), { target: { files: [file] } })
    await waitFor(() => expect(props.onSetContourSvg).toHaveBeenCalledWith('<svg id="c"></svg>'))
  })

  it('fecha o editor ao pressionar Escape', () => {
    render(<StudioPanel {...createMockProps()} />)
    fireEvent.click(screen.getByText(/posicionar textos/i))
    expect(screen.getByTestId('text-editor')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('text-editor')).not.toBeInTheDocument()
  })
})
