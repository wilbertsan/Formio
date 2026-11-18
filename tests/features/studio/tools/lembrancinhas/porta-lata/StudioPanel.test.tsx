import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/lembrancinhas/porta-lata/StudioPanel'
import { defaultCanHolderParams } from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import type { ValidationIssue } from '@/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder'

const defaultProps = {
  params: defaultCanHolderParams,
  issues: [] as ValidationIssue[],
  capacityMl: 338,
  onUpdateParam: vi.fn(),
  onReset: vi.fn(),
}

const SLIDER_RANGES = [
  { name: 'Diâmetro do topo', min: 70, max: 100 },
  { name: 'Diâmetro da base', min: 60, max: 95 },
  { name: 'Altura', min: 80, max: 115 },
  { name: 'Espessura da parede', min: 1.8, max: 4 },
  { name: 'Espessura do fundo', min: 2, max: 6 },
  { name: 'Chanfro da borda', min: 0, max: 2 },
  { name: 'Altura da alça', min: 35, max: 85 },
  { name: 'Abertura da mão', min: 24, max: 40 },
  { name: 'Alcance da alça', min: 30, max: 50 },
  { name: 'Banda da alça', min: 5, max: 10 },
  { name: 'Largura da alça', min: 8, max: 16 },
  { name: 'Folga da alça', min: 0.2, max: 0.5 },
  { name: 'Tamanho do texto', min: 6, max: 18 },
  { name: 'Altura do texto', min: 20, max: 90 },
] as const

const HANDLE_SLIDERS = [
  'Altura da alça',
  'Abertura da mão',
  'Alcance da alça',
  'Banda da alça',
  'Largura da alça',
  'Folga da alça',
] as const

const HANDLE_DISABLED_HINT = 'Ligue a alça para ajustar os parâmetros.'

describe('StudioPanel (porta-lata)', () => {
  it('renderiza heading, restaurar e as cinco seções', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Porta-lata')).toBeDefined()
    expect(screen.getByText('Restaurar')).toBeDefined()
    expect(screen.getByText('Corpo')).toBeDefined()
    expect(screen.getByText('Alça')).toBeDefined()
    expect(screen.getByText('Personalização')).toBeDefined()
    expect(screen.getByText('Aparência')).toBeDefined()
    expect(screen.getByText('Validação')).toBeDefined()
  })

  it('expõe nome acessível nos sliders', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByRole('slider', { name: 'Diâmetro do topo' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Diâmetro da base' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Altura' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Espessura da parede' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Espessura do fundo' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Chanfro da borda' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Altura da alça' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Abertura da mão' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Alcance da alça' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Banda da alça' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Largura da alça' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Folga da alça' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Tamanho do texto' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Altura do texto' })).toBeDefined()
  })

  it('expõe aria-valuemin e aria-valuemax dos 14 sliders', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(SLIDER_RANGES).toHaveLength(14)
    for (const { name, min, max } of SLIDER_RANGES) {
      const slider = screen.getByRole('slider', { name })
      expect.soft(slider, name).toHaveAttribute('aria-valuemin', String(min))
      expect.soft(slider, name).toHaveAttribute('aria-valuemax', String(max))
    }
  })

  it('incrementa pelos passos decimais dos sliders', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)

    fireEvent.keyDown(screen.getByRole('slider', { name: 'Espessura da parede' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenLastCalledWith('wallThickness', 2.5)

    fireEvent.keyDown(screen.getByRole('slider', { name: 'Banda da alça' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenLastCalledWith('handleBand', 7)

    fireEvent.keyDown(screen.getByRole('slider', { name: 'Tamanho do texto' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenLastCalledWith('textSize', 10.5)

    fireEvent.keyDown(screen.getByRole('slider', { name: 'Folga da alça' }), {
      key: 'ArrowRight',
    })
    const [key, value] = onUpdateParam.mock.calls.at(-1) ?? []
    expect(key).toBe('handleClearance')
    expect(value as number).toBeCloseTo(0.35, 5)
  })

  it('mostra a capacidade aproximada', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Capacidade aproximada: 338 ml')).toBeDefined()
  })

  it('atualiza o diâmetro do topo', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Diâmetro do topo' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenCalledWith('diameterTop', 81)
  })

  it('atualiza o texto', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'Ana' } })
    expect(onUpdateParam).toHaveBeenCalledWith('text', 'Ana')
  })

  it('atualiza a fonte', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.change(screen.getByLabelText('Fonte'), { target: { value: 'bold' } })
    expect(onUpdateParam).toHaveBeenCalledWith('fontStyle', 'bold')
  })

  it('ignora um valor de fonte desconhecido', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.change(screen.getByLabelText('Fonte'), { target: { value: 'italic' } })
    expect(onUpdateParam).not.toHaveBeenCalled()
  })

  it('desabilita todos os sliders da alça quando ela está desligada', () => {
    const onUpdateParam = vi.fn()
    const { rerender } = render(
      <StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />,
    )
    for (const name of HANDLE_SLIDERS) {
      expect.soft(screen.getByRole('slider', { name }), name).not.toHaveAttribute(
        'data-disabled',
      )
    }
    expect(screen.queryByText(HANDLE_DISABLED_HINT)).toBeNull()

    fireEvent.click(screen.getByLabelText('Habilitar alça'))
    expect(onUpdateParam).toHaveBeenCalledWith('handleEnabled', false)

    onUpdateParam.mockClear()
    rerender(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultCanHolderParams, handleEnabled: false }}
        onUpdateParam={onUpdateParam}
      />,
    )
    for (const name of HANDLE_SLIDERS) {
      expect.soft(screen.getByRole('slider', { name }), name).toHaveAttribute(
        'data-disabled',
      )
    }
    expect(screen.getByText(HANDLE_DISABLED_HINT)).toBeDefined()

    fireEvent.keyDown(screen.getByRole('slider', { name: 'Altura da alça' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).not.toHaveBeenCalled()
  })

  it('atualiza as cores pelos swatches agrupados', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    const bodyGroup = within(screen.getByRole('group', { name: 'Cor do corpo' }))
    const accentGroup = within(screen.getByRole('group', { name: 'Cor da alça' }))
    fireEvent.click(bodyGroup.getByRole('button', { name: '#ef4444' }))
    fireEvent.click(accentGroup.getByRole('button', { name: '#3b82f6' }))
    expect(onUpdateParam).toHaveBeenCalledWith('bodyColor', '#ef4444')
    expect(onUpdateParam).toHaveBeenCalledWith('accentColor', '#3b82f6')
  })

  it('marca a cor selecionada e acompanha o rerender', () => {
    const { rerender } = render(<StudioPanel {...defaultProps} />)

    expect(
      within(screen.getByRole('group', { name: 'Cor do corpo' })).getByRole('button', {
        name: '#14b8a6',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(screen.getByRole('group', { name: 'Cor da alça' })).getByRole('button', {
        name: '#f5f5f5',
      }),
    ).toHaveAttribute('aria-pressed', 'true')

    rerender(
      <StudioPanel
        {...defaultProps}
        params={{
          ...defaultCanHolderParams,
          bodyColor: '#ef4444',
          accentColor: '#3b82f6',
        }}
      />,
    )

    const bodyGroup = within(screen.getByRole('group', { name: 'Cor do corpo' }))
    const accentGroup = within(screen.getByRole('group', { name: 'Cor da alça' }))
    expect(bodyGroup.getByRole('button', { name: '#ef4444' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(bodyGroup.getByRole('button', { name: '#14b8a6' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(accentGroup.getByRole('button', { name: '#3b82f6' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(accentGroup.getByRole('button', { name: '#f5f5f5' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('mostra erro e aviso com as mensagens', () => {
    render(
      <StudioPanel
        {...defaultProps}
        issues={[
          {
            code: 'can-rim',
            severity: 'error',
            message: 'A parede do topo precisa ter pelo menos 0.8 mm.',
          },
          {
            code: 'can-cavity',
            severity: 'warning',
            message: 'A cavidade deixa pouca lata exposta.',
          },
        ]}
      />,
    )
    expect(
      screen.getByText('A parede do topo precisa ter pelo menos 0.8 mm.'),
    ).toBeDefined()
    expect(screen.getByText('A cavidade deixa pouca lata exposta.')).toBeDefined()
    expect(screen.getByText('Erro')).toBeDefined()
    expect(screen.getByText('Aviso')).toBeDefined()
  })

  it('mostra o estado vazio de validação', () => {
    render(<StudioPanel {...defaultProps} issues={[]} />)
    expect(screen.getByText('Sem avisos')).toBeDefined()
  })

  it('restaura os padrões', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
