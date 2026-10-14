import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/confeitaria/cortador-carimbo/StudioPanel'
import { defaultCutterStampParams } from '@/features/studio/tools/confeitaria/cortador-carimbo/schema'

// O RadioGroupField do Amplify torna o render inicial custoso no jsdom.
vi.setConfig({ testTimeout: 15000 })

const defaultProps = {
  params: defaultCutterStampParams,
  onUpdateParam: vi.fn(),
  onSetSvgIcon: vi.fn(),
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
    expect(screen.getByText('Forma')).toBeDefined()
    expect(screen.getByText('Cortador')).toBeDefined()
    expect(screen.getByText('Carimbo')).toBeDefined()
    expect(screen.getByText('Aparência')).toBeDefined()
  })

  it('renders the shape type radio', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Texto')).toBeDefined()
    expect(screen.getByText('Ícone SVG')).toBeDefined()
  })

  it('renders the text fields by default', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Conteúdo')).toBeDefined()
    expect(screen.getByLabelText('Estilo da fonte')).toBeDefined()
    expect(screen.getByLabelText('Altura da letra')).toBeDefined()
  })

  it('renders the svg controls for svg content', () => {
    const params = { ...defaultCutterStampParams, contentType: 'svg' as const }
    render(<StudioPanel {...defaultProps} params={params} />)
    expect(screen.getByText('Upload SVG')).toBeDefined()
    expect(screen.getByLabelText('Escala do ícone')).toBeDefined()
    expect(screen.getByLabelText('Espessura da linha')).toBeDefined()
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
