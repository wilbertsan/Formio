import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/confeitaria/rolo-textura/StudioPanel'
import { defaultTextureRollerParams } from '@/features/studio/tools/confeitaria/rolo-textura/schema'

vi.setConfig({ testTimeout: 15000 })

const defaultProps = {
  params: defaultTextureRollerParams,
  onUpdateParam: vi.fn(),
  onSetSvgIcon: vi.fn(),
  onReset: vi.fn(),
}

describe('StudioPanel (rolo-textura)', () => {
  it('renderiza heading e restaurar', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Rolo de Textura')).toBeDefined()
    expect(screen.getByText('Restaurar')).toBeDefined()
  })

  it('renderiza as três seções', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Padrão')).toBeDefined()
    expect(screen.getByText('Dimensões')).toBeDefined()
    expect(screen.getByText('Aparência')).toBeDefined()
  })

  it('renderiza os campos do padrão', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Família')).toBeDefined()
    expect(screen.getByLabelText('Motivo')).toBeDefined()
    expect(screen.getByLabelText('Profundidade do relevo')).toBeDefined()
    expect(screen.getByText('Losangos')).toBeDefined()
  })

  it('lista apenas motivos da família atual', () => {
    const params = { ...defaultTextureRollerParams, patternFamily: 'floral' as const, patternMotif: 'flower' as const }
    render(<StudioPanel {...defaultProps} params={params} />)
    expect(screen.getByText('Flor')).toBeDefined()
    expect(screen.queryByText('Losangos')).toBeNull()
  })

  it('renderiza dimensões e comprimento total', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Comprimento do rolo')).toBeDefined()
    expect(screen.getByLabelText('Diâmetro do rolo')).toBeDefined()
    expect(screen.getByText(/Comprimento total: 150/)).toBeDefined()
  })

  it('mostra upload quando a origem é SVG', () => {
    const params = { ...defaultTextureRollerParams, patternSource: 'svg' as const, svgIcon: null }
    render(<StudioPanel {...defaultProps} params={params} />)
    expect(screen.getByText('Upload SVG')).toBeDefined()
    expect(screen.getByText(/repetido como motivo/i)).toBeDefined()
  })

  it('mostra remover quando há SVG', () => {
    const params = { ...defaultTextureRollerParams, patternSource: 'svg' as const, svgIcon: '<svg/>' }
    render(<StudioPanel {...defaultProps} params={params} />)
    expect(screen.getByText('Remover SVG')).toBeDefined()
  })

  it('chama onReset', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    onReset.mockClear()
    screen.getByText('Restaurar').click()
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
