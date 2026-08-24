import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TextPositionEditor } from '@/features/studio/components/TextPositionEditor'
import { defaultKeychainParams } from '@/features/studio/keychain/schema'

function renderEditor(overrides?: {
  selectedTextId?: string
  onMoveText?: (id: string, x: number, y: number) => void
  onClose?: () => void
}) {
  return render(
    <TextPositionEditor
      params={defaultKeychainParams}
      selectedTextId={overrides?.selectedTextId ?? defaultKeychainParams.texts[0].id}
      onSelectText={() => undefined}
      onMoveText={overrides?.onMoveText ?? (() => undefined)}
      onClose={overrides?.onClose ?? (() => undefined)}
    />,
  )
}

describe('TextPositionEditor', () => {
  it('renderiza SVG com base, furo e rects de texto', () => {
    renderEditor()
    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-hole')).toBeInTheDocument()
    expect(screen.getByTestId('editor-text-text-1')).toBeInTheDocument()
  })

  it('mostra o conteúdo do texto como label', () => {
    renderEditor()
    expect(screen.getByText(/meu nome/i)).toBeInTheDocument()
  })

  it('dispara onMoveText ao arrastar e soltar', () => {
    const onMoveText = vi.fn()
    renderEditor({ onMoveText })
    const textEl = screen.getByTestId('editor-text-text-1')
    fireEvent.pointerDown(textEl, { clientX: 100, clientY: 100, button: 0, bubbles: true })
    fireEvent.pointerMove(document, { clientX: 120, clientY: 140 })
    fireEvent.pointerUp(document, { clientX: 120, clientY: 140 })
    expect(onMoveText).toHaveBeenCalledWith('text-1', expect.any(Number), expect.any(Number))
  })

  it('seleciona texto ao clicar', () => {
    const onSelectText = vi.fn()
    render(
      <TextPositionEditor
        params={defaultKeychainParams}
        selectedTextId=""
        onSelectText={onSelectText}
        onMoveText={() => undefined}
        onClose={() => undefined}
      />,
    )
    fireEvent.pointerDown(screen.getByTestId('editor-text-text-1'), { clientX: 0, clientY: 0, button: 0, bubbles: true })
    expect(onSelectText).toHaveBeenCalledWith('text-1')
  })

  it('fecha ao clicar em Concluir', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
