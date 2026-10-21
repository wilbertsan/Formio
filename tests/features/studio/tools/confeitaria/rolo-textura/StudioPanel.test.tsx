import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('renderiza as dimensões', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Comprimento do rolo')).toBeDefined()
    expect(screen.getByLabelText('Diâmetro do rolo')).toBeDefined()
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

  it('remove o SVG', () => {
    const onSetSvgIcon = vi.fn()
    const params = { ...defaultTextureRollerParams, patternSource: 'svg' as const, svgIcon: '<svg/>' }
    render(<StudioPanel {...defaultProps} params={params} onSetSvgIcon={onSetSvgIcon} />)
    screen.getByText('Remover SVG').click()
    expect(onSetSvgIcon).toHaveBeenCalledWith(null)
  })

  it('lê o SVG enviado', () => {
    const onSetSvgIcon = vi.fn()
    const params = { ...defaultTextureRollerParams, patternSource: 'svg' as const, svgIcon: null }
    class FakeFileReader {
      onload: ((event: { target: { result: string } }) => void) | null = null
      readAsText() { this.onload?.({ target: { result: '<svg/>' } }) }
    }
    const original = globalThis.FileReader
    // @ts-expect-error substituição controlada no teste
    globalThis.FileReader = FakeFileReader
    render(<StudioPanel {...defaultProps} params={params} onSetSvgIcon={onSetSvgIcon} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['<svg/>'], 'icone.svg', { type: 'image/svg+xml' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onSetSvgIcon).toHaveBeenCalledWith('<svg/>')
    globalThis.FileReader = original
  })

  it('usa o primeiro motivo quando o motivo atual é inválido', () => {
    const params = { ...defaultTextureRollerParams, patternFamily: 'floral' as const, patternMotif: 'dots' }
    render(<StudioPanel {...defaultProps} params={params} />)
    const select = screen.getByLabelText('Motivo') as HTMLSelectElement
    expect(select.value).toBe('flower')
  })

  it('chama onReset', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    onReset.mockClear()
    screen.getByText('Restaurar').click()
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
