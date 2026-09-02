import { render, screen, fireEvent } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/letreiros/marcador-pagina/StudioPanel'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'

describe('StudioPanel', () => {
  const createMockProps = () => ({
    params: defaultBookmarkParams,
    selectedTextId: defaultBookmarkParams.texts[0].id,
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
    expect(screen.getByRole('slider', { name: /comprimento/i })).toBeInTheDocument()
    expect(screen.getAllByRole('slider', { name: /largura/i })).toHaveLength(2)
    expect(screen.getByRole('slider', { name: /diâmetro/i })).toBeInTheDocument()
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
    const removeButton = screen.getByLabelText('Remover texto')
    fireEvent.click(removeButton)
    expect(mockProps.onRemoveText).toHaveBeenCalledWith(mockProps.params.texts[0].id)
  })

  it('botão adicionar texto desabilitado quando 3 textos', () => {
    const mockProps = createMockProps()
    const propsWithThreeTexts = {
      ...mockProps,
      params: {
        ...mockProps.params,
        texts: [
          mockProps.params.texts[0],
          { ...mockProps.params.texts[0], id: 'text-2', content: 'Texto 2' },
          { ...mockProps.params.texts[0], id: 'text-3', content: 'Texto 3' },
        ],
      },
    }
    render(<StudioPanel {...propsWithThreeTexts} />)
    const addButton = screen.getByText(/adicionar texto/i)
    expect(addButton).toBeDisabled()
  })

  it('renderiza seções do accordion', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByRole('heading', { name: 'Texto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Base' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Furo' })).toBeInTheDocument()
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
})