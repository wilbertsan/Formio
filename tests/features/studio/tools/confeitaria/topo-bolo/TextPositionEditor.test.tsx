import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import * as THREE from 'three'
import { TextPositionEditor } from '@/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor'
import {
  defaultCakeTopperParams,
  type CakeTopperParams,
} from '@/features/studio/tools/confeitaria/topo-bolo/schema'
import type { BuildCakeTopperResult } from '@/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper'

if (typeof window.PointerEvent === 'undefined') {
  Object.defineProperty(window, 'PointerEvent', {
    value: MouseEvent,
    configurable: true,
    writable: true,
  })
}

const SVG_RECT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'
const firstTextId = defaultCakeTopperParams.texts[0].id

function mockGeometry(): BuildCakeTopperResult {
  return {
    plate: new THREE.BufferGeometry(),
    relief: null,
    support: null,
    contentItems: [
      { id: firstTextId, kind: 'text', halfWidth: 5, halfHeight: 2 },
    ],
  }
}

function renderEditor(overrides: {
  params?: CakeTopperParams
  geometry?: BuildCakeTopperResult | null
  selectedContentId?: string
  onSelectContent?: (id: string) => void
  onMoveContent?: (id: string, x: number, y: number) => void
  onClose?: () => void
} = {}) {
  return render(
    <TextPositionEditor
      params={overrides.params ?? defaultCakeTopperParams}
      geometry={overrides.geometry === undefined ? mockGeometry() : overrides.geometry}
      selectedContentId={overrides.selectedContentId ?? firstTextId}
      onSelectContent={overrides.onSelectContent ?? (() => undefined)}
      onMoveContent={overrides.onMoveContent ?? (() => undefined)}
      onClose={overrides.onClose ?? (() => undefined)}
    />,
  )
}

function dragContent(id: string, clientX: number, clientY: number): void {
  const element = screen.getByTestId(`editor-content-${id}`)
  fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
  fireEvent.pointerMove(document, { clientX, clientY })
  fireEvent.pointerUp(document, { clientX, clientY })
}

function mockSvgViewport(container: HTMLElement, width: number, height: number): void {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('svg não encontrado')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('TextPositionEditor', () => {
  it('renderiza a placa, a área útil e a caixa do texto', () => {
    renderEditor()
    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-valid-area')).toBeInTheDocument()
    expect(screen.getByTestId(`editor-content-${firstTextId}`)).toBeInTheDocument()
    expect(screen.getByText('Texto')).toBeInTheDocument()
  })

  it('seleciona o conteúdo ao clicar', () => {
    const onSelectContent = vi.fn()
    renderEditor({ selectedContentId: '', onSelectContent })
    fireEvent.pointerDown(screen.getByTestId(`editor-content-${firstTextId}`), {
      clientX: 0,
      clientY: 0,
      button: 0,
      bubbles: true,
    })
    expect(onSelectContent).toHaveBeenCalledWith(firstTextId)
  })

  it('não move ao clicar sem arrastar', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent, selectedContentId: '' })
    const element = screen.getByTestId(`editor-content-${firstTextId}`)
    fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
    fireEvent.pointerUp(document, { clientX: 100, clientY: 100 })
    expect(onMoveContent).not.toHaveBeenCalled()
  })

  it('não inicia arraste com botão direito', () => {
    const onMoveContent = vi.fn()
    const onSelectContent = vi.fn()
    renderEditor({ onMoveContent, onSelectContent, selectedContentId: '' })
    const element = screen.getByTestId(`editor-content-${firstTextId}`)
    fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 2, bubbles: true })
    fireEvent.pointerMove(document, { clientX: 140, clientY: 140 })
    fireEvent.pointerUp(document, { clientX: 140, clientY: 140 })
    expect(onSelectContent).not.toHaveBeenCalled()
    expect(onMoveContent).not.toHaveBeenCalled()
  })

  it('dispara onMoveContent ao arrastar e soltar', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    dragContent(firstTextId, 140, 140)
    expect(onMoveContent).toHaveBeenCalledWith(firstTextId, expect.any(Number), expect.any(Number))
  })

  it('cancela o arraste sem mover', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    const element = screen.getByTestId(`editor-content-${firstTextId}`)
    fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
    fireEvent.pointerMove(document, { clientX: 140, clientY: 140 })
    fireEvent.pointerCancel(document)
    fireEvent.pointerUp(document, { clientX: 140, clientY: 140 })
    expect(onMoveContent).not.toHaveBeenCalled()
  })

  it('usa o delta do arraste a partir da posição de origem', () => {
    const params: CakeTopperParams = {
      ...defaultCakeTopperParams,
      texts: [{ ...defaultCakeTopperParams.texts[0], offsetX: 5, offsetY: -2 }],
    }
    const onMoveContent = vi.fn()
    const { container } = renderEditor({ params, onMoveContent })
    const svg = container.querySelector('svg')!
    const [, , vbWidth, vbHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number)
    mockSvgViewport(container, vbWidth, vbHeight)

    const element = screen.getByTestId(`editor-content-${firstTextId}`)
    fireEvent.pointerDown(element, { clientX: 39, clientY: 18.5, button: 0, bubbles: true })
    fireEvent.pointerMove(document, { clientX: 42, clientY: 16.5 })
    fireEvent.pointerUp(document, { clientX: 42, clientY: 16.5 })

    const [id, x, y] = onMoveContent.mock.calls[0]
    expect(id).toBe(firstTextId)
    expect(x).toBeCloseTo(8, 1)
    expect(y).toBeCloseTo(0, 1)
    expect(x).not.toBeCloseTo(12, 1)
  })

  it('limita o arraste à placa', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    dragContent(firstTextId, 5000, 5000)
    const [id, x, y] = onMoveContent.mock.calls[0]
    expect(id).toBe(firstTextId)
    expect(Math.abs(x)).toBeLessThanOrEqual(40)
    expect(Math.abs(y)).toBeLessThanOrEqual(25)
  })

  it('limita o arraste aos limites úteis da placa', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    dragContent(firstTextId, 5000, 5000)
    const [, x, y] = onMoveContent.mock.calls[0]
    expect(x).toBeCloseTo(31, 5)
    expect(y).toBeCloseTo(-19, 5)
  })

  it('respeita a escala do viewport no fallback de coordenadas', () => {
    const onMoveContent = vi.fn()
    const { container } = renderEditor({ onMoveContent })
    const svg = container.querySelector('svg')!
    const [, , vbWidth, vbHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number)
    mockSvgViewport(container, vbWidth * 2, vbHeight * 2)
    const element = screen.getByTestId(`editor-content-${firstTextId}`)
    fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
    fireEvent.pointerMove(document, { clientX: 104, clientY: 96 })
    fireEvent.pointerUp(document, { clientX: 104, clientY: 96 })
    const [, x, y] = onMoveContent.mock.calls[0]
    expect(x).toBeCloseTo(2, 1)
    expect(y).toBeCloseTo(2, 1)
  })

  it('usa getScreenCTM quando disponível', () => {
    const onMoveContent = vi.fn()
    const { container } = renderEditor({ onMoveContent })
    const svg = container.querySelector('svg')!
    Object.defineProperty(svg, 'getScreenCTM', {
      value: () => ({ inverse: () => ({}) }),
      configurable: true,
    })
    Object.defineProperty(svg, 'createSVGPoint', {
      value: () => ({
        x: 0,
        y: 0,
        matrixTransform() { return { x: this.x / 2, y: -this.y / 2 } },
      }),
      configurable: true,
    })
    const element = screen.getByTestId(`editor-content-${firstTextId}`)
    fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
    fireEvent.pointerMove(document, { clientX: 120, clientY: 80 })
    fireEvent.pointerUp(document, { clientX: 120, clientY: 80 })
    const [, x, y] = onMoveContent.mock.calls[0]
    expect(x).toBeCloseTo(10, 1)
    expect(y).toBeCloseTo(-10, 1)
  })

  it('move conteúdo por teclado com as setas', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    fireEvent.keyDown(screen.getByRole('button', { name: /mover texto/i }), { key: 'ArrowRight' })
    expect(onMoveContent).toHaveBeenCalledWith(firstTextId, 1, 0)
  })

  it('fecha ao clicar em Concluir', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha ao clicar no fundo', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.pointerDown(screen.getByTestId('text-editor'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha ao pressionar Escape', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('foca o botão fechar ao montar', () => {
    renderEditor()
    expect(screen.getByRole('button', { name: /fechar/i })).toHaveFocus()
  })

  it('expõe diálogo modal rotulado pelo título', () => {
    renderEditor()
    const dialog = screen.getByRole('dialog')
    const heading = screen.getByRole('heading', { name: /posicionar conteúdos/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id)
  })

  it('usa tamanhos de fallback sem geometria', () => {
    renderEditor({ geometry: null })
    const rect = screen.getByTestId(`editor-content-${firstTextId}`).querySelector('rect')
    expect(rect).toHaveAttribute('width', '72')
    expect(rect).toHaveAttribute('height', '14')
  })

  it('renderiza o ícone quando configurado', () => {
    const params: CakeTopperParams = {
      ...defaultCakeTopperParams,
      svgIcon: SVG_RECT,
      iconOffsetX: 0,
      iconOffsetY: 0,
    }
    const geometry: BuildCakeTopperResult = {
      ...mockGeometry(),
      contentItems: [
        ...mockGeometry().contentItems!,
        { id: 'icon', kind: 'icon', halfWidth: 3, halfHeight: 3 },
      ],
    }
    renderEditor({ params, geometry })
    expect(screen.getByTestId('editor-content-icon')).toBeInTheDocument()
    expect(screen.getByText('Ícone')).toBeInTheDocument()
  })

  it('arrasta o ícone e envia id icon', () => {
    const params: CakeTopperParams = {
      ...defaultCakeTopperParams,
      svgIcon: SVG_RECT,
      iconOffsetX: 0,
      iconOffsetY: 0,
    }
    const geometry: BuildCakeTopperResult = {
      ...mockGeometry(),
      contentItems: [
        ...mockGeometry().contentItems!,
        { id: 'icon', kind: 'icon', halfWidth: 3, halfHeight: 3 },
      ],
    }
    const onMoveContent = vi.fn()
    renderEditor({ params, geometry, onMoveContent })
    dragContent('icon', 120, 120)
    expect(onMoveContent).toHaveBeenCalledWith('icon', expect.any(Number), expect.any(Number))
  })
})
