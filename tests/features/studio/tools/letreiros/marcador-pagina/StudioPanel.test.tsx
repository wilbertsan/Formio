import { render, screen, fireEvent } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/letreiros/marcador-pagina/StudioPanel'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'

describe('StudioPanel', () => {
  const mockProps = {
    params: defaultBookmarkParams,
    selectedTextId: defaultBookmarkParams.texts[0].id,
    onSelectText: vi.fn(),
    onUpdateText: vi.fn(),
    onAddText: vi.fn(),
    onRemoveText: vi.fn(),
    onUpdateParam: vi.fn(),
    onReset: vi.fn(),
    onOpenEditor: vi.fn(),
  }

  it('renderiza sliders e selects', () => {
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByLabelText(/comprimento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Largura$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/diâmetro/i)).toBeInTheDocument()
  })

  it('mostra botão adicionar texto', () => {
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByText(/adicionar texto/i)).toBeInTheDocument()
  })

  it('dispara onAddText ao clicar', () => {
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(/adicionar texto/i))
    expect(mockProps.onAddText).toHaveBeenCalled()
  })

  it('dispara onReset ao clicar em Restaurar', () => {
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(/restaurar/i))
    expect(mockProps.onReset).toHaveBeenCalled()
  })

  it('dispara onSelectText ao clicar em um texto', () => {
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(mockProps.params.texts[0].content))
    expect(mockProps.onSelectText).toHaveBeenCalledWith(mockProps.params.texts[0].id)
  })

  it('dispara onOpenEditor ao clicar em Posicionar textos', () => {
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(/posicionar textos/i))
    expect(mockProps.onOpenEditor).toHaveBeenCalled()
  })

  it('dispara onRemoveText ao clicar em ×', () => {
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
    const removeButton = screen.getByText('×')
    fireEvent.click(removeButton)
    expect(mockProps.onRemoveText).toHaveBeenCalledWith(mockProps.params.texts[0].id)
  })

  it('botão adicionar texto desabilitado quando 3 textos', () => {
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
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByRole('heading', { name: 'Texto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Base' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Furo' })).toBeInTheDocument()
  })

  it('renderiza selects corretos', () => {
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByDisplayValue(/negrito/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/relevo/i)).toBeInTheDocument()
  })

  it('renderiza botão posicionar textos', () => {
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByText(/posicionar textos/i)).toBeInTheDocument()
  })
})