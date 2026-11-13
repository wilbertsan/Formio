import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/StudioPanel'
import { defaultBoxParams } from '@/features/studio/tools/lembrancinhas/caixa-personalizada/schema'

const defaultProps = {
  params: defaultBoxParams,
  issues: [],
  onUpdateParam: vi.fn(),
  onReset: vi.fn(),
}

describe('StudioPanel (caixa-personalizada)', () => {
  it('renderiza heading, restaurar e seções', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Caixa Personalizada')).toBeDefined()
    expect(screen.getByText('Restaurar')).toBeDefined()
    expect(screen.getByText('Dimensões')).toBeDefined()
    expect(screen.getByText('Acabamento')).toBeDefined()
    expect(screen.getByText('Painel decorativo')).toBeDefined()
    expect(screen.getByText('Tampa')).toBeDefined()
    expect(screen.getByText('Puxador lateral')).toBeDefined()
    expect(screen.getByText('Base')).toBeDefined()
    expect(screen.getByText('Impressão')).toBeDefined()
    expect(screen.getByText('Aparência')).toBeDefined()
    expect(screen.getByText('Validação')).toBeDefined()
  })

  it('renderiza os campos principais', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Largura')).toBeDefined()
    expect(screen.getByLabelText('Profundidade')).toBeDefined()
    expect(screen.getByLabelText('Altura')).toBeDefined()
    expect(screen.getByLabelText('Largura do painel')).toBeDefined()
    expect(screen.getByLabelText('Habilitar tampa')).toBeDefined()
    expect(screen.getByLabelText('Habilitar puxador')).toBeDefined()
    expect(screen.getByLabelText('Habilitar base')).toBeDefined()
  })

  it('expõe nome acessível nos sliders', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByRole('slider', { name: 'Largura' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Altura' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Tamanho da abertura' })).toBeDefined()
  })

  it('atualiza a largura ao usar o teclado no slider', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Largura' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenCalledWith('width', 165)
  })

  it('esconde campos da tampa quando desabilitada', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultBoxParams, lidEnabled: false }}
      />,
    )
    expect(screen.queryByLabelText('Espessura da tampa')).toBeNull()
  })

  it('esconde campos do puxador e da base quando desabilitados', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={{
          ...defaultBoxParams,
          handleEnabled: false,
          baseEnabled: false,
        }}
      />,
    )
    expect(screen.queryByLabelText('Diâmetro do puxador')).toBeNull()
    expect(screen.queryByLabelText('Altura da base')).toBeNull()
  })

  it('mostra o ângulo só para grade e malha', () => {
    const { rerender } = render(<StudioPanel {...defaultProps} />)
    expect(screen.queryByLabelText('Ângulo da grade')).toBeNull()
    rerender(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultBoxParams, pattern: 'grid' as const }}
      />,
    )
    expect(screen.getByLabelText('Ângulo da grade')).toBeDefined()
    rerender(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultBoxParams, pattern: 'mesh' as const }}
      />,
    )
    expect(screen.getByLabelText('Ângulo da grade')).toBeDefined()
    rerender(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultBoxParams, pattern: 'perforated' as const }}
      />,
    )
    expect(screen.queryByLabelText('Ângulo da grade')).toBeNull()
  })

  it('desliga tampa, puxador e base pelos switches', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.click(screen.getByLabelText('Habilitar tampa'))
    fireEvent.click(screen.getByLabelText('Habilitar puxador'))
    fireEvent.click(screen.getByLabelText('Habilitar base'))
    expect(onUpdateParam).toHaveBeenCalledWith('lidEnabled', false)
    expect(onUpdateParam).toHaveBeenCalledWith('handleEnabled', false)
    expect(onUpdateParam).toHaveBeenCalledWith('baseEnabled', false)
  })

  it('atualiza as cores pelos swatches agrupados', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    const bodyGroup = within(screen.getByRole('group', { name: 'Cor do corpo' }))
    const accentGroup = within(screen.getByRole('group', { name: 'Cor de destaque' }))
    fireEvent.click(bodyGroup.getByRole('button', { name: '#ef4444' }))
    fireEvent.click(accentGroup.getByRole('button', { name: '#ef4444' }))
    expect(onUpdateParam).toHaveBeenCalledWith('bodyColor', '#ef4444')
    expect(onUpdateParam).toHaveBeenCalledWith('accentColor', '#ef4444')
  })

  it('atualiza o padrão e o fit type', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.change(screen.getByLabelText('Padrão'), { target: { value: 'mesh' } })
    fireEvent.change(screen.getByLabelText('Encaixe'), { target: { value: 'internal' } })
    expect(onUpdateParam).toHaveBeenCalledWith('pattern', 'mesh')
    expect(onUpdateParam).toHaveBeenCalledWith('fitType', 'internal')
  })

  it('mostra estado vazio de validação', () => {
    render(<StudioPanel {...defaultProps} issues={[]} />)
    expect(screen.getByText('Sem problemas para impressão.')).toBeDefined()
  })

  it('mostra issues de validação', () => {
    render(
      <StudioPanel
        {...defaultProps}
        issues={[{ code: 'panel-overhang', severity: 'warning', message: 'Aviso de teste' }]}
      />,
    )
    expect(screen.getByText('Aviso de teste')).toBeDefined()
    expect(screen.getByText('Aviso')).toBeDefined()
  })

  it('mostra erro de validação', () => {
    render(
      <StudioPanel
        {...defaultProps}
        issues={[{ code: 'panel-border', severity: 'error', message: 'Erro de teste' }]}
      />,
    )
    expect(screen.getByText('Erro de teste')).toBeDefined()
    expect(screen.getByText('Erro')).toBeDefined()
  })

  it('chama reset', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    onReset.mockClear()
    screen.getByText('Restaurar').click()
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
