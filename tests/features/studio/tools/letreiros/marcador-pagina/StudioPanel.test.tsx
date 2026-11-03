import { render, screen, fireEvent } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/letreiros/marcador-pagina/StudioPanel'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'

function createMockProps() {
  return {
    params: defaultBookmarkParams,
    onUpdateText: vi.fn(),
    onUpdatePattern: vi.fn(),
    onUpdateParam: vi.fn(),
    onReset: vi.fn(),
  }
}

describe('StudioPanel', () => {
  it('renderiza sliders e selects', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.getByRole('slider', { name: /comprimento/i })).toBeInTheDocument()
    expect(screen.getAllByRole('slider', { name: /largura/i })).toHaveLength(2)
    expect(screen.getByRole('slider', { name: /^Espessura \d/ })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: /^Espessura da parede \d/ })).toBeInTheDocument()
  })

  it('não mostra adicionar, remover ou posicionar textos', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.queryByText(/adicionar texto/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/posicionar textos/i)).not.toBeInTheDocument()
    expect(screen.queryByText('×')).not.toBeInTheDocument()
  })

  it('dispara onReset ao clicar em Restaurar', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(/restaurar/i))
    expect(mockProps.onReset).toHaveBeenCalled()
  })

  it('renderiza seções do accordion', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.getByRole('heading', { name: 'Texto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Base' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Furo' })).not.toBeInTheDocument()
  })

  it('renderiza o estilo da letra padrão', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.getByDisplayValue(/negrito/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/modo de texto/i)).not.toBeInTheDocument()
  })

  it('dispara onUpdateText ao mudar conteúdo', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    const input = screen.getByLabelText(/conteúdo/i)
    fireEvent.change(input, { target: { value: 'Novo texto' } })
    expect(mockProps.onUpdateText).toHaveBeenCalledWith({ content: 'Novo texto' })
  })

  it('aceita conteúdo longo sem maxLength', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    const input = screen.getByLabelText(/conteúdo/i) as HTMLInputElement
    expect(input.maxLength).toBe(-1)
    const content = 'a'.repeat(200)
    fireEvent.change(input, { target: { value: content } })
    expect(mockProps.onUpdateText).toHaveBeenCalledWith({ content })
  })

  it('dispara onUpdateText ao mudar estilo da letra', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    const select = screen.getByLabelText(/estilo da letra/i)
    fireEvent.change(select, { target: { value: 'normal' } })
    expect(mockProps.onUpdateText).toHaveBeenCalledWith({ fontStyle: 'normal' })
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

  it('renderiza a seção Textura e o tipo padrão', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.getByRole('heading', { name: 'Textura' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Nenhuma')).toBeInTheDocument()
  })

  it('dispara onUpdatePattern ao mudar o tipo de textura', () => {
    const mockProps = createMockProps()
    render(<StudioPanel {...mockProps} />)
    fireEvent.change(screen.getByLabelText(/tipo de textura/i), { target: { value: 'triangles' } })
    expect(mockProps.onUpdatePattern).toHaveBeenCalledWith({ type: 'triangles' })
  })

  it('mostra densidade e profundidade quando há textura', () => {
    const mockProps = createMockProps()
    render(
      <StudioPanel
        {...mockProps}
        params={{
          ...mockProps.params,
          pattern: { ...mockProps.params.pattern, type: 'circles' },
        }}
      />,
    )
    expect(screen.getByLabelText(/densidade/i)).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: /profundidade da textura/i })).toBeInTheDocument()
  })

  it('mostra upload de SVG e dispara onUpdatePattern', () => {
    const mockProps = createMockProps()
    render(
      <StudioPanel
        {...mockProps}
        params={{
          ...mockProps.params,
          pattern: { ...mockProps.params.pattern, type: 'svg' },
        }}
      />,
    )
    expect(screen.getByText('Enviar SVG')).toBeInTheDocument()

    class FakeFileReader {
      onload: ((event: { target: { result: string } }) => void) | null = null
      onerror: (() => void) | null = null
      readAsText() {
        this.onload?.({ target: { result: '<svg/>' } })
      }
    }
    const original = globalThis.FileReader
    globalThis.FileReader = FakeFileReader as never

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['<svg/>'], 'icone.svg', { type: 'image/svg+xml' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(mockProps.onUpdatePattern).toHaveBeenCalledWith({ svg: '<svg/>' })
    globalThis.FileReader = original
  })

  it('remove o SVG', () => {
    const mockProps = createMockProps()
    render(
      <StudioPanel
        {...mockProps}
        params={{
          ...mockProps.params,
          pattern: { ...mockProps.params.pattern, type: 'svg', svg: '<svg/>' },
        }}
      />,
    )
    fireEvent.click(screen.getByText('Remover SVG'))
    expect(mockProps.onUpdatePattern).toHaveBeenCalledWith({ svg: null })
  })

  it('rejeita arquivo que não é SVG', () => {
    const mockProps = createMockProps()
    render(
      <StudioPanel
        {...mockProps}
        params={{
          ...mockProps.params,
          pattern: { ...mockProps.params.pattern, type: 'svg' },
        }}
      />,
    )
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Envie um arquivo SVG')
  })
})
