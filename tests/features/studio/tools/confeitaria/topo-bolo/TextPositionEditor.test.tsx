import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TextPositionEditor } from '@/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor'
import { defaultCakeTopperParams } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

function renderEditor(overrides?: {
  selectedTextId?: string
  onSelectText?: (id: string) => void
  onMoveText?: (id: string, x: number, y: number) => void
  onClose?: () => void
}) {
  return render(
    <TextPositionEditor
      params={defaultCakeTopperParams}
      selectedTextId={overrides?.selectedTextId ?? defaultCakeTopperParams.texts[0].id}
      onSelectText={overrides?.onSelectText ?? (() => undefined)}
      onMoveText={overrides?.onMoveText ?? (() => undefined)}
      onClose={overrides?.onClose ?? (() => undefined)}
    />,
  )
}

describe('TextPositionEditor', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza o editor com canvas acessível', () => {
    renderEditor()
    expect(screen.getByTestId('text-editor')).toBeInTheDocument()
    expect(screen.getByLabelText('Área de posicionamento de textos')).toBeInTheDocument()
  })

  it('seleciona texto ao clicar sobre ele', () => {
    const onSelectText = vi.fn()
    renderEditor({ selectedTextId: '', onSelectText })
    const canvas = screen.getByLabelText('Área de posicionamento de textos')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    expect(onSelectText).toHaveBeenCalledWith('text-1')
  })

  it('dispara onMoveText ao arrastar', () => {
    const onMoveText = vi.fn()
    renderEditor({ onMoveText })
    const canvas = screen.getByLabelText('Área de posicionamento de textos')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 70 })
    expect(onMoveText).toHaveBeenCalledWith('text-1', expect.any(Number), expect.any(Number))
  })

  it('fecha ao clicar no botão Fechar', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.click(screen.getByLabelText('Fechar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
