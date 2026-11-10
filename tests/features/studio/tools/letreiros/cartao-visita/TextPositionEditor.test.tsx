import { fireEvent, render, screen } from '@testing-library/react'
import * as THREE from 'three'
import { TextPositionEditor } from '@/features/studio/tools/letreiros/cartao-visita/TextPositionEditor'
import {
  defaultCardParams,
  type CardParams,
  type IconContent,
} from '@/features/studio/tools/letreiros/cartao-visita/schema'
import type { BuildCardResult } from '@/features/studio/tools/letreiros/cartao-visita/buildCard'

if (typeof window.PointerEvent === 'undefined') {
  Object.defineProperty(window, 'PointerEvent', {
    value: MouseEvent,
    configurable: true,
    writable: true,
  })
}

const firstId = defaultCardParams.contents[0].id

function mockGeometry(): BuildCardResult {
  return {
    base: new THREE.BufferGeometry(),
    content: new THREE.BufferGeometry(),
    contentItems: [{ id: firstId, halfWidth: 5, halfHeight: 2, geometry: null }],
  }
}

function iconParams(offsetX = 0, offsetY = 0): CardParams {
  const icon: IconContent = {
    id: 'icon-1',
    kind: 'icon',
    svgIcon: null,
    iconScale: 1,
    iconLineWidth: 0.3,
    offsetX,
    offsetY,
  }
  return { ...defaultCardParams, contents: [icon] }
}

function renderEditor(overrides: {
  params?: CardParams
  geometry?: BuildCardResult | null
  selectedContentId?: string
  onSelectContent?: (id: string) => void
  onMoveContent?: (id: string, x: number, y: number) => void
  onClose?: () => void
} = {}) {
  return render(
    <TextPositionEditor
      params={overrides.params ?? defaultCardParams}
      geometry={overrides.geometry === undefined ? mockGeometry() : overrides.geometry}
      selectedContentId={overrides.selectedContentId ?? firstId}
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

describe('TextPositionEditor', () => {
  it('renderiza base, área útil e caixa de conteúdo', () => {
    renderEditor()
    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-valid-area')).toBeInTheDocument()
    expect(screen.getByTestId(`editor-content-${firstId}`)).toBeInTheDocument()
    expect(screen.getByText('Seu Nome')).toBeInTheDocument()
  })

  it('usa viewBox do cartão com padding', () => {
    const { container } = renderEditor()
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-47.5 -32.5 95 65')
  })

  it('não move ao clicar sem arrastar e seleciona', () => {
    const onMoveContent = vi.fn()
    const onSelectContent = vi.fn()
    renderEditor({ onMoveContent, onSelectContent, selectedContentId: '' })
    const element = screen.getByTestId(`editor-content-${firstId}`)
    fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
    fireEvent.pointerUp(document, { clientX: 100, clientY: 100 })
    expect(onSelectContent).toHaveBeenCalledWith(firstId)
    expect(onMoveContent).not.toHaveBeenCalled()
  })

  it('dispara onMoveContent ao arrastar', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    dragContent(firstId, 140, 140)
    expect(onMoveContent).toHaveBeenCalledWith(firstId, expect.any(Number), expect.any(Number))
  })

  it('clampa o conteúdo à área útil', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    dragContent(firstId, 5000, 5000)
    const [, x, y] = onMoveContent.mock.calls[0]
    expect(x).toBeCloseTo(34.5, 1)
    expect(y).toBeCloseTo(-22.5, 1)
  })

  it('move com as setas do teclado', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    fireEvent.keyDown(screen.getByTestId(`editor-content-${firstId}`), { key: 'ArrowRight' })
    expect(onMoveContent).toHaveBeenCalledWith(firstId, 1, 10)
  })

  it('fecha por Concluir, fundo e Escape', () => {
    const onClose = vi.fn()
    const { container } = renderEditor({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(container.firstChild as Element)
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('foca o botão fechar e expõe diálogo modal', () => {
    renderEditor()
    expect(screen.getByRole('button', { name: /fechar/i })).toHaveFocus()
    const dialog = screen.getByRole('dialog')
    const heading = screen.getByRole('heading', { name: /posicionar conteúdos/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id)
  })

  it('usa caixas de fallback sem geometria', () => {
    renderEditor({ geometry: null })
    const rect = screen.getByTestId(`editor-content-${firstId}`).querySelector('rect')
    expect(rect).toHaveAttribute('width', '8')
    expect(rect).toHaveAttribute('height', '6')
  })

  it('mostra placeholder de ícone', () => {
    renderEditor({ params: iconParams() })
    expect(screen.getByText('ícone')).toBeInTheDocument()
  })

  it('usa "Texto" como label para conteúdo vazio', () => {
    const first = defaultCardParams.contents[0]
    if (first.kind !== 'text') throw new Error('conteúdo inesperado')
    const params: CardParams = {
      ...defaultCardParams,
      contents: [{ ...first, content: '' }],
    }
    renderEditor({ params })
    expect(screen.getByText('Texto')).toBeInTheDocument()
  })
})
