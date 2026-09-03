import { render, screen, fireEvent } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/letreiros/placa-loja/StudioPanel'
import { defaultPlacaLojaParams } from '@/features/studio/tools/letreiros/placa-loja/schema'

describe('StudioPanel', () => {
  const createMockProps = () => ({
    params: defaultPlacaLojaParams,
    selectedTextId: defaultPlacaLojaParams.texts[0].id,
    onSelectText: vi.fn(),
    onUpdateText: vi.fn(),
    onAddText: vi.fn(),
    onRemoveText: vi.fn(),
    onUpdateParam: vi.fn(),
    onReset: vi.fn(),
    onOpenEditor: vi.fn(),
  })

  it('renderiza sliders e selects', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    expect(screen.getAllByRole('slider').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByRole('slider', { name: /espessura/i })).toBeInTheDocument()
  })

  it('mostra botão adicionar texto', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByText(/adicionar texto/i)).toBeInTheDocument()
  })

  it('dispara onAddText ao clicar', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(/adicionar texto/i))
    expect(mockProps.onAddText).toHaveBeenCalled()
  })

  it('dispara onReset ao clicar em Restaurar', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(/restaurar/i))
    expect(mockProps.onReset).toHaveBeenCalled()
  })

  it('dispara onSelectText ao clicar em um texto', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(mockProps.params.texts[0].content))
    expect(mockProps.onSelectText).toHaveBeenCalledWith(mockProps.params.texts[0].id)
  })

  it('dispara onOpenEditor ao clicar em Posicionar textos', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(/posicionar textos/i))
    expect(mockProps.onOpenEditor).toHaveBeenCalled()
  })

  it('dispara onRemoveText ao clicar em ×', () => {
    const mockProps = createMockProps()
    const propsWithTwoTexts = {
      ...mockProps,
      params: {
        ...mockProps.params,
        texts: [
          mockProps.params.texts[0],
          { ...mockProps.params.texts[0], id: 'text-2', content: 'Texto 2' },
        ],
      },
    }
    render(<StudioPanel {...propsWithTwoTexts} />)
    const removeButton = screen.getByLabelText('Remover texto Texto 2')
    fireEvent.click(removeButton)
    expect(mockProps.onRemoveText).toHaveBeenCalledWith('text-2')
  })

  it('botão adicionar texto desabilitado quando 5 textos', () => {
    const mockProps = createMockProps()
    const propsWithFiveTexts = {
      ...mockProps,
      params: {
        ...mockProps.params,
        texts: [
          mockProps.params.texts[0],
          { ...mockProps.params.texts[0], id: 'text-2', content: 'Texto 2' },
          { ...mockProps.params.texts[0], id: 'text-3', content: 'Texto 3' },
          { ...mockProps.params.texts[0], id: 'text-4', content: 'Texto 4' },
          { ...mockProps.params.texts[0], id: 'text-5', content: 'Texto 5' },
        ],
      },
    }
    render(<StudioPanel {...propsWithFiveTexts} />)
    const addButton = screen.getByText(/adicionar texto/i)
    expect(addButton).toBeDisabled()
  })

  it('renderiza seções do accordion', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByRole('heading', { name: 'Texto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Base' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fixação' })).toBeInTheDocument()
  })

  it('renderiza selects corretos', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByDisplayValue(/negrito/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/relevo/i)).toBeInTheDocument()
  })

  it('renderiza botão posicionar textos', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByText(/posicionar textos/i)).toBeInTheDocument()
  })

  it('dispara onUpdateText ao mudar conteúdo', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    const input = screen.getByLabelText(/conteúdo/i)
    fireEvent.change(input, { target: { value: 'Novo texto' } })
    expect(mockProps.onUpdateText).toHaveBeenCalledWith(mockProps.params.texts[0].id, { content: 'Novo texto' })
  })

  it('dispara onUpdateText ao mudar estilo da letra', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    const select = screen.getByLabelText(/estilo da letra/i)
    fireEvent.change(select, { target: { value: 'normal' } })
    expect(mockProps.onUpdateText).toHaveBeenCalledWith(mockProps.params.texts[0].id, { fontStyle: 'normal' })
  })

  it('dispara onUpdateParam ao mudar modo de texto', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    const select = screen.getByLabelText(/modo de texto/i)
    fireEvent.change(select, { target: { value: 'engraved' } })
    expect(mockProps.onUpdateParam).toHaveBeenCalledWith('textMode', 'engraved')
  })

  it('dispara onUpdateParam ao clicar em cor da base', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    const colorButtons = screen.getAllByLabelText('#ef4444')
    fireEvent.click(colorButtons[0])
    expect(mockProps.onUpdateParam).toHaveBeenCalledWith('baseColor', '#ef4444')
  })

  it('dispara onUpdateParam ao clicar em cor das letras', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    const colorButtons = screen.getAllByLabelText('#14b8a6')
    fireEvent.click(colorButtons[1])
    expect(mockProps.onUpdateParam).toHaveBeenCalledWith('letterColor', '#14b8a6')
  })

  it('renderiza slider de raio de borda quando formato é arredondado', () => {
    const mockProps = createMockProps()
    const roundedParams = { ...mockProps.params, shape: 'rounded' as const }
    render(<StudioPanel {...mockProps} params={roundedParams} />)
    expect(screen.getByRole('slider', { name: /raio de borda/i })).toBeInTheDocument()
  })

  it('não renderiza slider de raio de borda quando formato é retangular', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    expect(screen.queryByRole('slider', { name: /raio de borda/i })).not.toBeInTheDocument()
  })

  it('dispara onUpdateParam ao mudar formato', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    const select = screen.getByLabelText(/formato/i)
    fireEvent.change(select, { target: { value: 'rounded' } })
    expect(mockProps.onUpdateParam).toHaveBeenCalledWith('shape', 'rounded')
  })

  it('renderiza sliders de fixação', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByRole('slider', { name: /diâmetro do furo/i })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: /margem do furo/i })).toBeInTheDocument()
  })
})
