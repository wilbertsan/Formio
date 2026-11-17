import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/StudioPanel'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import type { ValidationIssue } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug'

const defaultProps = {
  params: defaultMugParams,
  issues: [] as ValidationIssue[],
  capacityMl: 338,
  onUpdateParam: vi.fn(),
  onReset: vi.fn(),
}

describe('StudioPanel (caneca-personalizada)', () => {
  it('renderiza heading, restaurar e as cinco seções', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Caneca Personalizada')).toBeDefined()
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

  it('desabilita os sliders da alça quando ela está desligada', () => {
    const onUpdateParam = vi.fn()
    const { rerender } = render(
      <StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />,
    )
    fireEvent.click(screen.getByLabelText('Habilitar alça'))
    expect(onUpdateParam).toHaveBeenCalledWith('handleEnabled', false)

    onUpdateParam.mockClear()
    rerender(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultMugParams, handleEnabled: false }}
        onUpdateParam={onUpdateParam}
      />,
    )
    const heightSlider = screen.getByRole('slider', { name: 'Altura da alça' })
    expect(heightSlider).toHaveAttribute('data-disabled')
    expect(screen.getByRole('slider', { name: 'Folga da alça' })).toHaveAttribute(
      'data-disabled',
    )
    fireEvent.keyDown(heightSlider, { key: 'ArrowRight' })
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

  it('mostra erro e aviso com as mensagens', () => {
    render(
      <StudioPanel
        {...defaultProps}
        issues={[
          {
            code: 'mug-taper',
            severity: 'error',
            message: 'O diâmetro do topo precisa ser maior ou igual ao da base.',
          },
          {
            code: 'mug-capacity',
            severity: 'warning',
            message: 'A capacidade aproximada está fora da faixa.',
          },
        ]}
      />,
    )
    expect(
      screen.getByText('O diâmetro do topo precisa ser maior ou igual ao da base.'),
    ).toBeDefined()
    expect(screen.getByText('A capacidade aproximada está fora da faixa.')).toBeDefined()
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
