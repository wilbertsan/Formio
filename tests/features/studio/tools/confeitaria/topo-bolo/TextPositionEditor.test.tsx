import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TextPositionEditor } from '@/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor'
import { defaultCakeTopperParams, type CakeTopperParams } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

const clampParams: CakeTopperParams = {
  ...defaultCakeTopperParams,
  shape: 'circle',
  width: 80,
  height: 50,
  texts: [{ ...defaultCakeTopperParams.texts[0], width: 30, height: 10, offsetX: 0, offsetY: 0 }],
}

function renderEditor(
  overrides?: {
    params?: CakeTopperParams
    selectedTextId?: string
    onSelectText?: (id: string) => void
    onMoveText?: (id: string, x: number, y: number) => void
    onClose?: () => void
  },
) {
  const params = overrides?.params ?? defaultCakeTopperParams
  return render(
    <TextPositionEditor
      params={params}
      selectedTextId={overrides?.selectedTextId ?? params.texts[0].id}
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

  it('expõe o overlay como diálogo modal', () => {
    renderEditor()
    const dialog = screen.getByRole('dialog', { name: 'Posicionamento de textos' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('foca o botão Fechar ao abrir', () => {
    renderEditor()
    expect(screen.getByLabelText('Fechar')).toHaveFocus()
  })

  it('seleciona texto ao clicar sobre ele', () => {
    const onSelectText = vi.fn()
    renderEditor({ selectedTextId: '', onSelectText })
    const canvas = screen.getByLabelText('Área de posicionamento de textos')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    expect(onSelectText).toHaveBeenCalledWith('text-1')
  })

  it('não inicia arraste com botão direito', () => {
    const onSelectText = vi.fn()
    renderEditor({ selectedTextId: '', onSelectText })
    const canvas = screen.getByLabelText('Área de posicionamento de textos')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 2 })
    expect(onSelectText).not.toHaveBeenCalled()
  })

  it('limita o arraste à área útil da placa', () => {
    const onMoveText = vi.fn()
    renderEditor({ params: clampParams, onMoveText })
    const canvas = screen.getByLabelText('Área de posicionamento de textos')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    fireEvent.mouseMove(canvas, { clientX: 300, clientY: 300 })
    // placa circular 80x50 (raio 25), texto 30x10, margem 3 → offsets máximos 7 e 17.
    expect(onMoveText).toHaveBeenCalledWith('text-1', 7, 17)
  })

  it('permite arraste dentro do limite', () => {
    const onMoveText = vi.fn()
    renderEditor({ params: clampParams, onMoveText })
    const canvas = screen.getByLabelText('Área de posicionamento de textos')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    fireEvent.mouseMove(canvas, { clientX: 84, clientY: 54 })
    expect(onMoveText).toHaveBeenCalledWith('text-1', 2, 2)
  })

  it('fecha ao clicar no botão Fechar', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.click(screen.getByLabelText('Fechar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha ao pressionar Escape', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
