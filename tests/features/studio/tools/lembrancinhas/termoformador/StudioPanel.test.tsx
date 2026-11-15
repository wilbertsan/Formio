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
    expect(screen.getByText('Tela')).toBeDefined()
    expect(screen.getByText('Malha')).toBeDefined()
    expect(screen.getByText('Aparência')).toBeDefined()
    expect(screen.getByText('Validação')).toBeDefined()
  })

  it('expõe nome acessível nos sliders', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByRole('slider', { name: 'Diâmetro' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Espessura' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Abertura do favo' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Espessura da linha' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Largura do aro' })).toBeDefined()
  })

  it('renderiza a seção Suporte e os sliders', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Suporte')).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Parede do suporte' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Fundo do suporte' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Profundidade da bacia' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Largura do degrau' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Folga da tela' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Chanfro do suporte' })).toBeDefined()
  })

  it('mostra as métricas do suporte', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText(/Diâmetro externo 168\.6 mm/)).toBeDefined()
    expect(screen.getByText(/Altura 27\.0 mm/)).toBeDefined()
  })

  it('atualiza a parede do suporte', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Parede do suporte' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenCalledWith('wallThickness', 4.5)
  })

  it('atualiza o diâmetro ao usar o teclado no slider', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Diâmetro' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenCalledWith('diameter', 165)
  })

  it('atualiza a espessura da linha', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Espessura da linha' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenCalledWith('lineWidth', 0.6)
  })

  it('troca a cor PLA', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.click(screen.getByLabelText('#ef4444'))
    expect(onUpdateParam).toHaveBeenCalledWith('color', '#ef4444')
  })

  it('restaura os padrões', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('lista as issues de validação', () => {
    render(
      <StudioPanel
        {...defaultProps}
        issues={[
          {
            code: 'screen-frame',
            severity: 'error',
            message: 'O aro consome todo o diâmetro da tela.',
          },
        ]}
      />,
    )
    expect(screen.getByText('O aro consome todo o diâmetro da tela.')).toBeDefined()
  })

  it('marca a cor selecionada', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('#14b8a6')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('#ef4444')).toHaveAttribute('aria-pressed', 'false')
  })

  it('mostra estado vazio de validação', () => {
    render(<StudioPanel {...defaultProps} issues={[]} />)
    expect(screen.getByText('Nenhum problema encontrado.')).toBeDefined()
  })

  it('mostra aviso e erro com severidade textual', () => {
    const { rerender } = render(
      <StudioPanel
        {...defaultProps}
        issues={[
          { code: 'screen-empty', severity: 'warning', message: 'Aviso de teste' },
        ]}
      />,
    )
    expect(screen.getByText('Aviso de teste')).toBeDefined()
    expect(screen.getByText('Aviso')).toBeDefined()

    rerender(
      <StudioPanel
        {...defaultProps}
        issues={[
          { code: 'screen-frame', severity: 'error', message: 'Erro de teste' },
        ]}
      />,
    )
    expect(screen.getByText('Erro de teste')).toBeDefined()
    expect(screen.getByText('Erro')).toBeDefined()
  })

  it('mostra a contagem de favos e o aro sólido efetivo', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText(/439 favos/)).toBeDefined()
    expect(screen.getByText(/9\.5 mm/)).toBeDefined()
  })

  it('não permite diâmetro abaixo do mínimo', () => {
    const onUpdateParam = vi.fn()
    render(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultThermoformerParams, diameter: 65 }}
        onUpdateParam={onUpdateParam}
      />,
    )
    const slider = screen.getByRole('slider', { name: 'Diâmetro' })
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })

    const values = onUpdateParam.mock.calls
      .filter(([key]) => key === 'diameter')
      .map(([, value]) => value as number)
    expect(values).toContain(60)
    expect(values.every((value) => value >= 60)).toBe(true)
  })
})
