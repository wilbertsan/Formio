import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioPanel } from '@/features/studio/components/StudioPanel'
import { defaultKeychainParams, PLA_COLORS } from '@/features/studio/keychain/schema'

function renderPanel(overrides?: {
  params?: typeof defaultKeychainParams
  selectedTextId?: string
  onSelectText?: () => void
  onUpdateText?: () => void
  onAddText?: () => void
  onRemoveText?: () => void
  onReset?: () => void
}) {
  const params = overrides?.params ?? defaultKeychainParams
  return render(
    <StudioPanel
      params={params}
      selectedTextId={overrides?.selectedTextId ?? params.texts[0].id}
      onSelectText={overrides?.onSelectText ?? (() => undefined)}
      onUpdateText={overrides?.onUpdateText ?? (() => undefined)}
      onAddText={overrides?.onAddText ?? (() => undefined)}
      onRemoveText={overrides?.onRemoveText ?? (() => undefined)}
      onUpdateParam={() => undefined}
      onReset={overrides?.onReset ?? (() => undefined)}
    />,
  )
}

describe('StudioPanel — Texto', () => {
  it('renderiza chip do texto selecionado com aria-pressed', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /Meu nome/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('renderiza botão de adicionar texto', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeInTheDocument()
  })

  it('renderiza controles do texto selecionado', () => {
    renderPanel()
    expect(screen.getByLabelText(/conteúdo/i)).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: /estilo da letra/i })).toBeInTheDocument()
  })

  it('dispara onAddText ao clicar em adicionar', async () => {
    const user = userEvent.setup()
    const onAddText = vi.fn()
    renderPanel({ onAddText })
    await user.click(screen.getByRole('button', { name: /adicionar texto/i }))
    expect(onAddText).toHaveBeenCalledTimes(1)
  })

  it('botão adicionar desabilitado com 3 textos', () => {
    const params = {
      ...defaultKeychainParams,
      texts: [
        defaultKeychainParams.texts[0],
        { ...defaultKeychainParams.texts[0], id: 't2', content: 'Dois' },
        { ...defaultKeychainParams.texts[0], id: 't3', content: 'Três' },
      ],
    }
    renderPanel({ params })
    expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeDisabled()
  })

  it('renderiza toggle de proporcional', () => {
    renderPanel()
    expect(screen.getByRole('switch', { name: /proporcional/i })).toBeInTheDocument()
  })

  it('renderiza sliders de largura e altura do texto', () => {
    renderPanel()
    expect(screen.getByLabelText('Largura do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura do texto')).toBeInTheDocument()
  })

  it('dispara onUpdateText ao trocar conteúdo', async () => {
    const user = userEvent.setup()
    const onUpdateText = vi.fn()
    renderPanel({ onUpdateText })
    const id = defaultKeychainParams.texts[0].id
    await user.type(screen.getByLabelText(/conteúdo/i), 'X')
    expect(onUpdateText).toHaveBeenCalledWith(id, { content: expect.stringContaining('X') })
  })

  it('dispara onUpdateText ao trocar estilo', async () => {
    const user = userEvent.setup()
    const onUpdateText = vi.fn()
    renderPanel({ onUpdateText })
    const id = defaultKeychainParams.texts[0].id
    await user.selectOptions(screen.getByRole('listbox', { name: /estilo da letra/i }), 'serif')
    expect(onUpdateText).toHaveBeenCalledWith(id, { fontStyle: 'serif' })
  })

  it('não renderiza controles de texto quando não há textos', () => {
    renderPanel({ params: { ...defaultKeychainParams, texts: [] }, selectedTextId: '' })
    expect(screen.queryByLabelText(/conteúdo/i)).not.toBeInTheDocument()
  })
})

describe('StudioPanel — Base/Argola', () => {
  it('renderiza blocos Base e Argola', () => {
    renderPanel()
    expect(screen.getByRole('heading', { name: /base/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /argola/i })).toBeInTheDocument()
  })

  it('renderiza dropdown de posição e swatches de cor', () => {
    renderPanel()
    expect(screen.getByRole('listbox', { name: /posição/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: PLA_COLORS[0] }).length).toBeGreaterThanOrEqual(1)
  })

  it('restaura padrão', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    renderPanel({ onReset })
    await user.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
