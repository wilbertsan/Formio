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
})