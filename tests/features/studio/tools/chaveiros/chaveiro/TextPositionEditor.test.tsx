import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import * as THREE from 'three'
import { TextPositionEditor } from '@/features/studio/tools/chaveiros/chaveiro/TextPositionEditor'
import {
  defaultKeychainParams,
  type IconContent,
  type KeychainParams,
} from '@/features/studio/tools/chaveiros/chaveiro/schema'
import type { BuildKeychainResult } from '@/features/studio/tools/chaveiros/chaveiro/buildKeychain'

if (typeof window.PointerEvent === 'undefined') {
  Object.defineProperty(window, 'PointerEvent', {
    value: MouseEvent,
    configurable: true,
    writable: true,
  })
}

const firstContentId = defaultKeychainParams.contents[0].id

function mockGeometry(): BuildKeychainResult {
  return {
    base: new THREE.BufferGeometry(),
    content: new THREE.BufferGeometry(),
    contentItems: [{ id: 'content-1', halfWidth: 5, halfHeight: 2, geometry: null }],
    pieceBB: { minX: -30, maxX: 30, minY: -15, maxY: 15 },
    hole: { x: 0, y: 10, radius: 2.5 },
  }
}

function iconParams(id = 'content-1', offsetX = 0, offsetY = 0): KeychainParams {
  const icon: IconContent = {
    id,
    kind: 'icon',
    svgIcon: null,
    iconScale: 1,
    iconLineWidth: 0.3,
    offsetX,
    offsetY,
  }
  return { ...defaultKeychainParams, contents: [icon] }
}

function renderEditor(overrides: {
  params?: KeychainParams
  geometry?: BuildKeychainResult | null
  selectedContentId?: string
  onSelectContent?: (id: string) => void
  onMoveContent?: (id: string, x: number, y: number) => void
  onClose?: () => void
} = {}) {
  return render(
    <TextPositionEditor
      params={overrides.params ?? defaultKeychainParams}
      geometry={overrides.geometry === undefined ? mockGeometry() : overrides.geometry}
      selectedContentId={overrides.selectedContentId ?? firstContentId}
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
  it('renderiza base, furo, caixa de conteúdo e label', () => {
    renderEditor()

    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-hole')).toBeInTheDocument()
    expect(screen.getByTestId('editor-content-content-1')).toBeInTheDocument()
    expect(screen.getByText('Meu nome')).toBeInTheDocument()
  })

  it('usa área válida retangular para base retangular', () => {
    renderEditor()

    const area = screen.getByTestId('editor-valid-area')
    expect(area.tagName).toBe('rect')
    expect(area).toHaveAttribute('stroke-dasharray', '1,0.5')
  })

  it('usa área válida circular tracejada para base circular', () => {
    const params = { ...defaultKeychainParams, baseShape: 'circle' as const }
    renderEditor({ params })

    const area = screen.getByTestId('editor-valid-area')
    expect(area.tagName).toBe('circle')
    expect(area).toHaveAttribute('stroke-dasharray', '1,0.5')
  })

  it('não move ao clicar sem arrastar', () => {
    const onMoveContent = vi.fn()
    const onSelectContent = vi.fn()
    renderEditor({ onMoveContent, onSelectContent, selectedContentId: '' })

    const element = screen.getByTestId('editor-content-content-1')
    fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
    fireEvent.pointerUp(document, { clientX: 100, clientY: 100 })

    expect(onSelectContent).toHaveBeenCalledWith('content-1')
    expect(onMoveContent).not.toHaveBeenCalled()
  })

  it('dispara onMoveContent ao arrastar e soltar', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })

    dragContent('content-1', 140, 140)

    expect(onMoveContent).toHaveBeenCalledWith('content-1', expect.any(Number), expect.any(Number))
  })

  it('usa o delta do arraste a partir da posição de origem', () => {
    const params: KeychainParams = {
      ...defaultKeychainParams,
      contents: [{ ...defaultKeychainParams.contents[0], offsetX: 5, offsetY: -2 }],
    }
    const onMoveContent = vi.fn()
    const { container } = renderEditor({ params, onMoveContent })
    mockSvgViewport(container, 60, 35)

    const element = screen.getByTestId('editor-content-content-1')
    fireEvent.pointerDown(element, { clientX: 39, clientY: 18.5, button: 0, bubbles: true })
    fireEvent.pointerMove(document, { clientX: 42, clientY: 16.5 })
    fireEvent.pointerUp(document, { clientX: 42, clientY: 16.5 })

    const [id, x, y] = onMoveContent.mock.calls[0]
    expect(id).toBe('content-1')
    expect(x).toBeCloseTo(8, 1)
    expect(y).toBeCloseTo(0, 1)
    expect(x).not.toBeCloseTo(12, 1)
  })

  it('limita o conteúdo exatamente à área útil', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })

    dragContent('content-1', 5000, 5000)

    const [id, x] = onMoveContent.mock.calls[0]
    expect(id).toBe('content-1')
    expect(Math.abs(x - 16)).toBeLessThanOrEqual(0.5)
  })

  it('seleciona o conteúdo ao clicar', () => {
    const onSelectContent = vi.fn()
    renderEditor({ selectedContentId: '', onSelectContent })

    fireEvent.pointerDown(screen.getByTestId('editor-content-content-1'), {
      clientX: 0,
      clientY: 0,
      button: 0,
      bubbles: true,
    })

    expect(onSelectContent).toHaveBeenCalledWith('content-1')
  })

  it('fecha ao clicar em Concluir', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })

    fireEvent.click(screen.getByRole('button', { name: /concluir/i }))

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

  it('usa geometry.pieceBB como base no formato name', () => {
    const params = { ...defaultKeychainParams, baseShape: 'name' as const }
    const { container } = renderEditor({ params })

    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-content-content-1')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-35 -20 70 40')
  })

  it('usa a bbox de fallback para o furo no formato name sem geometria', () => {
    const params = { ...defaultKeychainParams, baseShape: 'name' as const }
    renderEditor({ params, geometry: null })

    expect(screen.getByTestId('editor-hole')).toHaveAttribute('cy', '-3.5')
  })

  it('renderiza base e caixas de fallback sem geometria', () => {
    renderEditor({ geometry: null })

    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-hole')).toBeInTheDocument()
    const rect = screen.getByTestId('editor-content-content-1').querySelector('rect')
    expect(rect).toHaveAttribute('width', '8')
    expect(rect).toHaveAttribute('height', '6')
  })

  it('renderiza placeholder ícone para conteúdo do tipo icon', () => {
    renderEditor({ params: iconParams() })

    expect(screen.getByText('ícone')).toBeInTheDocument()
  })

  it('move conteúdo por teclado com as setas', () => {
    const onMoveContent = vi.fn()
    renderEditor({ params: iconParams('i1'), onMoveContent })

    const element = screen.getByRole('button', { name: /mover ícone/i })
    fireEvent.keyDown(element, { key: 'ArrowRight' })

    const [id, x, y] = onMoveContent.mock.calls[0]
    expect(id).toBe('i1')
    expect(x).toBeCloseTo(1, 1)
    expect(y).toBeCloseTo(0, 1)
  })

  it('calcula viewBox dinamicamente a partir da base', () => {
    const { container: rectContainer } = renderEditor({
      params: { ...defaultKeychainParams, baseShape: 'rect' },
    })
    const rectViewBox = rectContainer.querySelector('svg')?.getAttribute('viewBox')

    const { container: heartContainer } = renderEditor({
      params: { ...defaultKeychainParams, baseShape: 'heart' },
    })
    const heartViewBox = heartContainer.querySelector('svg')?.getAttribute('viewBox')

    expect(rectViewBox).toBeTruthy()
    expect(heartViewBox).toBeTruthy()
    expect(rectViewBox).not.toBe(heartViewBox)
  })
})
