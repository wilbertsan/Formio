import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioPanel } from '@/features/studio/tools/chaveiros/chaveiro/StudioPanel'
import { defaultKeychainParams } from '@/features/studio/tools/chaveiros/chaveiro/schema'

const firstTextId = defaultKeychainParams.texts[0].id

function renderPanel(overrides?: {
  selectedTextId?: string
  onUpdateParam?: () => void
  onUpdateText?: () => void
  onAddText?: () => void
  onRemoveText?: () => void
  onReset?: () => void
  onOpenEditor?: () => void
}) {
  return render(
    <StudioPanel
      params={defaultKeychainParams}
      selectedTextId={overrides?.selectedTextId ?? firstTextId}
      onSelectText={() => undefined}
      onUpdateText={overrides?.onUpdateText ?? (() => undefined)}
      onAddText={overrides?.onAddText ?? (() => undefined)}
      onRemoveText={overrides?.onRemoveText ?? (() => undefined)}
      onUpdateParam={overrides?.onUpdateParam ?? (() => undefined)}
      onReset={overrides?.onReset ?? (() => undefined)}
      onOpenEditor={overrides?.onOpenEditor ?? (() => undefined)}
    />,
  )
}

describe('StudioPanel', () => {
  it('renderiza bloco Texto com chip do primeiro texto selecionado', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /meu nome/i })).toBeInTheDocument()
  })

  it('renderiza botão + para adicionar texto', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeInTheDocument()
  })

  it('dispara onAddText ao clicar em +', async () => {
    const user = userEvent.setup()
    const onAddText = vi.fn()
    renderPanel({ onAddText })
    await user.click(screen.getByRole('button', { name: /adicionar texto/i }))
    expect(onAddText).toHaveBeenCalledTimes(1)
  })

  it('renderiza controles do texto selecionado (conteúdo, estilo, toggle, relevo)', () => {
    renderPanel()
    expect(screen.getByLabelText(/conteúdo/i)).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: /estilo da letra/i })).toBeInTheDocument()
    expect(screen.getByText(/proporcional à peça/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Altura do relevo')).toBeInTheDocument()
  })

  it('não renderiza sliders de posição X/Y', () => {
    renderPanel()
    expect(screen.queryByLabelText('Posição X')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Posição Y')).not.toBeInTheDocument()
  })

  it('renderiza botão de posicionar textos', async () => {
    const user = userEvent.setup()
    const onOpenEditor = vi.fn()
    renderPanel({ onOpenEditor })
    await user.click(screen.getByRole('button', { name: /posicionar textos/i }))
    expect(onOpenEditor).toHaveBeenCalledTimes(1)
  })

  it('esconde sliders de largura/altura quando proporcional está ligado', () => {
    const params = {
      ...defaultKeychainParams,
      texts: [{ ...defaultKeychainParams.texts[0], proportional: true }],
    }
    render(
      <StudioPanel
        params={params}
        selectedTextId={firstTextId}
        onSelectText={() => undefined}
        onUpdateText={() => undefined}
        onAddText={() => undefined}
        onRemoveText={() => undefined}
        onUpdateParam={() => undefined}
        onReset={() => undefined}
        onOpenEditor={() => undefined}
      />,
    )
    expect(screen.queryByLabelText('Largura do texto')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Altura do texto')).not.toBeInTheDocument()
  })

  it('mostra sliders de largura/altura quando proporcional está desligado', () => {
    renderPanel()
    expect(screen.getByLabelText('Largura do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura do texto')).toBeInTheDocument()
  })

  it('dispara onUpdateText ao trocar conteúdo', async () => {
    const user = userEvent.setup()
    const onUpdateText = vi.fn()
    renderPanel({ onUpdateText })
    await user.type(screen.getByLabelText(/conteúdo/i), '!')
    expect(onUpdateText).toHaveBeenCalledWith(firstTextId, { content: expect.any(String) })
  })

  it('dispara onUpdateText ao trocar estilo de letra', async () => {
    const user = userEvent.setup()
    const onUpdateText = vi.fn()
    renderPanel({ onUpdateText })
    await user.selectOptions(screen.getByRole('listbox', { name: /estilo da letra/i }), 'normal')
    expect(onUpdateText).toHaveBeenCalledWith(firstTextId, { fontStyle: 'normal' })
  })

  it('renderiza bloco Base com comprimento, altura, espessura e borda', () => {
    renderPanel()
    expect(screen.getByLabelText('Comprimento')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura da peça')).toBeInTheDocument()
    expect(screen.getByLabelText('Espessura')).toBeInTheDocument()
    expect(screen.getByLabelText('Borda')).toBeInTheDocument()
  })

  it('renderiza seletor de formato na aba Base', () => {
    renderPanel()
    expect(screen.getByRole('listbox', { name: /formato/i })).toBeInTheDocument()
  })

  it('renderiza sliders de comprimento e altura na aba Base', () => {
    renderPanel()
    expect(screen.getByLabelText('Comprimento')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura da peça')).toBeInTheDocument()
  })

  it('oculta slider de altura quando formato é circular', () => {
    const params = { ...defaultKeychainParams, baseShape: 'circle' as const }
    render(
      <StudioPanel
        params={params}
        selectedTextId={firstTextId}
        onSelectText={() => undefined}
        onUpdateText={() => undefined}
        onAddText={() => undefined}
        onRemoveText={() => undefined}
        onUpdateParam={() => undefined}
        onReset={() => undefined}
        onOpenEditor={() => undefined}
      />,
    )
    expect(screen.queryByLabelText('Altura da peça')).not.toBeInTheDocument()
  })

  it('mostra slider de altura quando formato é retangular', () => {
    const params = { ...defaultKeychainParams, baseShape: 'rect' as const }
    render(
      <StudioPanel
        params={params}
        selectedTextId={firstTextId}
        onSelectText={() => undefined}
        onUpdateText={() => undefined}
        onAddText={() => undefined}
        onRemoveText={() => undefined}
        onUpdateParam={() => undefined}
        onReset={() => undefined}
        onOpenEditor={() => undefined}
      />,
    )
    expect(screen.getByLabelText('Altura da peça')).toBeInTheDocument()
  })

  it('mostra slider de altura quando formato é coração', () => {
    const params = { ...defaultKeychainParams, baseShape: 'heart' as const }
    render(
      <StudioPanel
        params={params}
        selectedTextId={firstTextId}
        onSelectText={() => undefined}
        onUpdateText={() => undefined}
        onAddText={() => undefined}
        onRemoveText={() => undefined}
        onUpdateParam={() => undefined}
        onReset={() => undefined}
        onOpenEditor={() => undefined}
      />,
    )
    expect(screen.getByLabelText('Altura da peça')).toBeInTheDocument()
  })

  it('dispara onUpdateParam ao trocar formato', async () => {
    const user = userEvent.setup()
    const onUpdateParam = vi.fn()
    renderPanel({ onUpdateParam })
    await user.selectOptions(screen.getByRole('listbox', { name: /formato/i }), 'circle')
    expect(onUpdateParam).toHaveBeenCalledWith('baseShape', 'circle')
  })

  it('renderiza bloco Argola com position dropdown', () => {
    renderPanel()
    expect(screen.getByRole('listbox', { name: /posição/i })).toBeInTheDocument()
  })

  it('restaura padrão', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    renderPanel({ onReset })
    await user.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('SelectField tem opção Contorno do Nome', () => {
    renderPanel()
    const select = screen.getByRole('listbox', { name: /formato/i })
    expect(within(select).getByRole('option', { name: /contorno do nome/i })).toBeInTheDocument()
  })

  it('oculta sliders de dimensão quando baseShape é name', () => {
    const params = { ...defaultKeychainParams, baseShape: 'name' as const }
    render(
      <StudioPanel
        params={params}
        selectedTextId={firstTextId}
        onSelectText={() => undefined}
        onUpdateText={() => undefined}
        onAddText={() => undefined}
        onRemoveText={() => undefined}
        onUpdateParam={() => undefined}
        onReset={() => undefined}
        onOpenEditor={() => undefined}
      />,
    )
    expect(screen.queryByLabelText('Comprimento')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Altura da peça')).not.toBeInTheDocument()
  })

  it('mostra hint quando baseShape é name', () => {
    const params = { ...defaultKeychainParams, baseShape: 'name' as const }
    render(
      <StudioPanel
        params={params}
        selectedTextId={firstTextId}
        onSelectText={() => undefined}
        onUpdateText={() => undefined}
        onAddText={() => undefined}
        onRemoveText={() => undefined}
        onUpdateParam={() => undefined}
        onReset={() => undefined}
        onOpenEditor={() => undefined}
      />,
    )
    expect(screen.getByText(/tamanho controlado/i)).toBeInTheDocument()
  })
})
