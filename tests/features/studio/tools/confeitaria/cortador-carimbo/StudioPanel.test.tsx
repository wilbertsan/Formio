import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/confeitaria/cortador-carimbo/StudioPanel'
import { defaultCutterStampParams } from '@/features/studio/tools/confeitaria/cortador-carimbo/schema'

const defaultProps = {
  params: defaultCutterStampParams,
  onUpdateParam: vi.fn(),
  onReset: vi.fn(),
}

describe('StudioPanel', () => {
  it('renders the heading and reset button', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Cortador + Carimbo')).toBeDefined()
    expect(screen.getByText('Restaurar')).toBeDefined()
  })

  it('renders the four sections', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Texto')).toBeDefined()
    expect(screen.getByText('Cortador')).toBeDefined()
    expect(screen.getByText('Carimbo')).toBeDefined()
    expect(screen.getByText('Aparência')).toBeDefined()
  })

  it('renders the text fields', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Conteúdo')).toBeDefined()
    expect(screen.getByLabelText('Estilo da fonte')).toBeDefined()
    expect(screen.getByLabelText('Altura da letra')).toBeDefined()
  })

  it('renders the cutter fields', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Altura da parede')).toBeDefined()
    expect(screen.getByLabelText('Espessura da parede')).toBeDefined()
  })

  it('renders the stamp fields', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Altura do carimbo')).toBeDefined()
    expect(screen.getByLabelText('Margem da base')).toBeDefined()
    expect(screen.getByLabelText('Altura do relevo')).toBeDefined()
  })

  it('calls onReset when the reset button is clicked', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    onReset.mockClear()
    screen.getByText('Restaurar').click()
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
