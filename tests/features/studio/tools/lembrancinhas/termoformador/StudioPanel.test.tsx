import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/lembrancinhas/termoformador/StudioPanel'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

const defaultProps = {
  params: defaultThermoformerParams,
  issues: [],
  onUpdateParam: vi.fn(),
  onReset: vi.fn(),
}

describe('StudioPanel (termoformador)', () => {
  it('renderiza heading, restaurar e seções', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Termoformador')).toBeDefined()
    expect(screen.getByText('Restaurar')).toBeDefined()
    expect(screen.getByText('Dimensões')).toBeDefined()
    expect(screen.getByText('Painel frontal')).toBeDefined()
    expect(screen.getByText('Tampa')).toBeDefined()
    expect(screen.getByText('Pino lateral')).toBeDefined()
    expect(screen.getByText('Base')).toBeDefined()
    expect(screen.getByText('Validação')).toBeDefined()
  })

  it('renderiza os campos principais', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Largura')).toBeDefined()
    expect(screen.getByLabelText('Profundidade')).toBeDefined()
    expect(screen.getByLabelText('Altura')).toBeDefined()
    expect(screen.getByLabelText('Largura do painel')).toBeDefined()
    expect(screen.getByLabelText('Habilitar tampa')).toBeDefined()
    expect(screen.getByLabelText('Habilitar pino')).toBeDefined()
    expect(screen.getByLabelText('Habilitar base')).toBeDefined()
  })

  it('esconde campos da tampa quando desabilitada', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultThermoformerParams, lidEnabled: false }}
      />,
    )
    expect(screen.queryByLabelText('Espessura da tampa')).toBeNull()
  })

  it('esconde campos do pino e da base quando desabilitados', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={{
          ...defaultThermoformerParams,
          handleEnabled: false,
          baseEnabled: false,
        }}
      />,
    )
    expect(screen.queryByLabelText('Diâmetro do pino')).toBeNull()
    expect(screen.queryByLabelText('Altura da base')).toBeNull()
  })

  it('mostra o ângulo só para grade e malha', () => {
    const { rerender } = render(<StudioPanel {...defaultProps} />)
    expect(screen.queryByLabelText('Ângulo da grade')).toBeNull()
    rerender(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultThermoformerParams, pattern: 'grid' as const }}
      />,
    )
    expect(screen.getByLabelText('Ângulo da grade')).toBeDefined()
  })

  it('atualiza o padrão e o fit type', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.change(screen.getByLabelText('Padrão'), { target: { value: 'mesh' } })
    fireEvent.change(screen.getByLabelText('Encaixe'), { target: { value: 'internal' } })
    expect(onUpdateParam).toHaveBeenCalledWith('pattern', 'mesh')
    expect(onUpdateParam).toHaveBeenCalledWith('fitType', 'internal')
  })

  it('mostra issues de validação', () => {
    render(
      <StudioPanel
        {...defaultProps}
        issues={[{ code: 'panel-overhang', severity: 'warning', message: 'Aviso de teste' }]}
      />,
    )
    expect(screen.getByText('Aviso de teste')).toBeDefined()
  })

  it('chama reset', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    onReset.mockClear()
    screen.getByText('Restaurar').click()
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
