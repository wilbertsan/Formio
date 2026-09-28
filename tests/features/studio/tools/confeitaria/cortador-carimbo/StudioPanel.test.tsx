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
  it('renders the panel heading', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Cortador + Carimbo')).toBeDefined()
  })

  it('renders reset button', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Restaurar')).toBeDefined()
  })

  it('renders text input', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Conteúdo')).toBeDefined()
  })

  it('renders outer shape selector', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Formato externo')).toBeDefined()
  })

  it('shows diameter slider for circle shape', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'circle' as const }
    render(<StudioPanel {...defaultProps} params={params} />)
    expect(screen.getByLabelText('Diâmetro')).toBeDefined()
  })

  it('shows width and height sliders for rectangle shape', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'rectangle' as const }
    render(<StudioPanel {...defaultProps} params={params} />)
    expect(screen.getByLabelText('Largura')).toBeDefined()
    expect(screen.getByLabelText('Altura')).toBeDefined()
  })

  it('shows diameter slider for star shape', () => {
    const params = { ...defaultCutterStampParams, outerShape: 'star' as const }
    render(<StudioPanel {...defaultProps} params={params} />)
    expect(screen.getByLabelText('Diâmetro')).toBeDefined()
  })

  it('calls onReset when reset button is clicked', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    onReset.mockClear()
    const resetButton = screen.getByText('Restaurar')
    resetButton.click()
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
