import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToolSelector } from '@/features/studio/components/ToolSelector'

describe('ToolSelector', () => {
  it('renderiza as seções na ordem Confeitaria e Letreiros', () => {
    render(<ToolSelector onSelect={vi.fn()} />)
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual(['Confeitaria', 'Letreiros'])
  })

  it('agrupa as ferramentas nas categorias corretas', () => {
    render(<ToolSelector onSelect={vi.fn()} />)
    const confeitaria = screen.getByRole('heading', { name: 'Confeitaria' }).closest('section')
    const letreiros = screen.getByRole('heading', { name: 'Letreiros' }).closest('section')
    expect(confeitaria).not.toBeNull()
    expect(letreiros).not.toBeNull()
    expect(within(confeitaria as HTMLElement).getAllByRole('button')).toHaveLength(5)
    expect(within(letreiros as HTMLElement).getAllByRole('button')).toHaveLength(5)
  })

  it('coloca Chaveiro na seção Letreiros', () => {
    render(<ToolSelector onSelect={vi.fn()} />)
    const letreiros = screen.getByRole('heading', { name: 'Letreiros' }).closest('section')
    expect(within(letreiros as HTMLElement).getByRole('button', { name: /chaveiro/i })).toBeInTheDocument()
  })

  it('coloca Rolo de Textura na seção Confeitaria e emite o id', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<ToolSelector onSelect={onSelect} />)
    const confeitaria = screen.getByRole('heading', { name: 'Confeitaria' }).closest('section')!
    const card = within(confeitaria).getByRole('button', { name: /rolo de textura/i })
    await user.click(card)
    expect(onSelect).toHaveBeenCalledWith('rolo-textura')
  })

  it('chama onSelect com o id da ferramenta clicada', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<ToolSelector onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: /topo de bolo/i }))
    expect(onSelect).toHaveBeenCalledWith('topo-bolo')
  })
})
