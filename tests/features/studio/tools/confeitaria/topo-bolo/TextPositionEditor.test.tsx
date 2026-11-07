import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TextPositionEditor } from '@/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor'
import { defaultCakeTopperParams, type CakeTopperParams } from '@/features/studio/tools/confeitaria/topo-bolo/schema'
import { svgBounds } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

const SVG_RECT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'

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
    onMoveIcon?: (x: number, y: number) => void
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
      onMoveIcon={overrides?.onMoveIcon ?? (() => undefined)}
      onClose={overrides?.onClose ?? (() => undefined)}
    />,
  )
}

function expectedIconMaxOffsets(params: CakeTopperParams): { x: number; y: number } {
  const bounds = svgBounds(params.svgIcon!)
  if (!bounds) throw new Error('SVG inválido')
  const maxRadius = (Math.min(params.width, params.height) / 3) * params.iconScale
  const scale = (maxRadius - 0.5) / bounds.farthest
  const halfWidth = (bounds.width / 2) * scale + 0.5
  const halfHeight = (bounds.height / 2) * scale + 0.5
  const radius = Math.min(params.width, params.height) / 2
  return { x: radius - halfWidth - 1, y: radius - halfHeight - 1 }
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
    expect(screen.getByLabelText('Área de posicionamento de conteúdo')).toBeInTheDocument()
  })

  it('expõe o overlay como diálogo modal', () => {
    renderEditor()
    const dialog = screen.getByRole('dialog', { name: 'Posicionamento de conteúdo' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('foca o botão Fechar ao abrir', () => {
    renderEditor()
    expect(screen.getByLabelText('Fechar')).toHaveFocus()
  })

  it('seleciona texto ao clicar sobre ele', () => {
    const onSelectText = vi.fn()
    renderEditor({ selectedTextId: '', onSelectText })
    const canvas = screen.getByLabelText('Área de posicionamento de conteúdo')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    expect(onSelectText).toHaveBeenCalledWith('text-1')
  })

  it('não inicia arraste com botão direito', () => {
    const onSelectText = vi.fn()
    renderEditor({ selectedTextId: '', onSelectText })
    const canvas = screen.getByLabelText('Área de posicionamento de conteúdo')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 2 })
    expect(onSelectText).not.toHaveBeenCalled()
  })

  it('limita o arraste à área útil da placa', () => {
    const onMoveText = vi.fn()
    renderEditor({ params: clampParams, onMoveText })
    const canvas = screen.getByLabelText('Área de posicionamento de conteúdo')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    fireEvent.mouseMove(canvas, { clientX: 300, clientY: 300 })
    // placa circular 80x50 (raio 25), texto 30x10, margem 3 → offsets máximos 7 e 17.
    expect(onMoveText).toHaveBeenCalledWith('text-1', 7, 17)
  })

  it('permite arraste dentro do limite', () => {
    const onMoveText = vi.fn()
    renderEditor({ params: clampParams, onMoveText })
    const canvas = screen.getByLabelText('Área de posicionamento de conteúdo')
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

  it('arrasta o ícone e chama onMoveIcon', () => {
    const onMoveIcon = vi.fn()
    const params: CakeTopperParams = {
      ...defaultCakeTopperParams,
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconOffsetX: 0,
      iconOffsetY: 0,
    }
    renderEditor({ params, onMoveIcon })
    const canvas = screen.getByLabelText('Área de posicionamento de conteúdo')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    fireEvent.mouseMove(canvas, { clientX: 84, clientY: 54 })
    expect(onMoveIcon).toHaveBeenCalledWith(2, 2)
  })

  it('limita o arraste do ícone à área útil da placa', () => {
    const onMoveIcon = vi.fn()
    const params: CakeTopperParams = {
      ...defaultCakeTopperParams,
      shape: 'circle',
      width: 80,
      height: 50,
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconOffsetX: 0,
      iconOffsetY: 0,
    }
    renderEditor({ params, onMoveIcon })
    const canvas = screen.getByLabelText('Área de posicionamento de conteúdo')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    fireEvent.mouseMove(canvas, { clientX: 400, clientY: 400 })
    const [x, y] = onMoveIcon.mock.calls[0] as [number, number]
    const max = expectedIconMaxOffsets(params)
    expect(x).toBeCloseTo(max.x, 5)
    expect(y).toBeCloseTo(max.y, 5)
  })
})
