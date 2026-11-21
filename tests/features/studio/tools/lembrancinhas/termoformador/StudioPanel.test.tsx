import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/lembrancinhas/termoformador/StudioPanel'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import {
  defaultThermoformerParams,
  SVG_MAX_LENGTH,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

const defaultProps = {
  params: defaultThermoformerParams,
  outline: getShapeOutline(defaultThermoformerParams),
  svgError: null,
  issues: [],
  onUpdateParam: vi.fn(),
  onSetSvg: vi.fn(),
  onReset: vi.fn(),
}

const squareParams = {
  ...defaultThermoformerParams,
  shape: 'square' as const,
}
const rectangleParams = {
  ...defaultThermoformerParams,
  shape: 'rectangle' as const,
}
const pyramidParams = {
  ...defaultThermoformerParams,
  shape: 'pyramid' as const,
}
const svgParams = {
  ...defaultThermoformerParams,
  shape: 'svg' as const,
}

function makeSvgFile(name: string, content: string) {
  const file = new File([content], name, { type: 'image/svg+xml' })
  // O jsdom ainda não implementa Blob.text(); simulamos a leitura do browser.
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(content),
  })
  return file
}

describe('StudioPanel (termoformador)', () => {
  it('renderiza heading, restaurar e seções', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Termoformador')).toBeDefined()
    expect(screen.getByText('Restaurar')).toBeDefined()
    expect(screen.getByText('Tela')).toBeDefined()
    expect(screen.getByText('Malha')).toBeDefined()
    expect(screen.getByText('Macho')).toBeDefined()
    expect(screen.getByText('Aparência')).toBeDefined()
    expect(screen.getByText('Validação')).toBeDefined()
  })

  it('renderiza o acordeão Forma e as cinco opções', () => {
    render(<StudioPanel {...defaultProps} />)
    const select = screen.getByLabelText('Forma') as HTMLSelectElement
    expect(select.value).toBe('circle')
    expect(screen.getByRole('option', { name: 'Círculo' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Quadrado' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Retângulo' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Pirâmide' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'SVG' })).toBeDefined()
  })

  it('mostra o diâmetro apenas no círculo', () => {
    const { rerender } = render(<StudioPanel {...defaultProps} />)
    expect(screen.getByRole('slider', { name: 'Diâmetro' })).toBeDefined()
    expect(screen.queryByRole('slider', { name: 'Lado' })).toBeNull()

    rerender(
      <StudioPanel
        {...defaultProps}
        params={squareParams}
        outline={getShapeOutline(squareParams)}
      />,
    )
    expect(screen.queryByRole('slider', { name: 'Diâmetro' })).toBeNull()
    expect(screen.getByRole('slider', { name: 'Lado' })).toBeDefined()
  })

  it('mostra largura e altura no retângulo', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={rectangleParams}
        outline={getShapeOutline(rectangleParams)}
      />,
    )
    expect(screen.getByRole('slider', { name: 'Largura' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Altura' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Ângulo de saída' })).toBeDefined()
  })

  it('mostra a base e o fundo da pirâmide', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={pyramidParams}
        outline={getShapeOutline(pyramidParams)}
      />,
    )
    expect(screen.getByRole('slider', { name: 'Lado da base' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Fundo da pirâmide' })).toBeDefined()
    expect(screen.queryByRole('slider', { name: 'Ângulo de saída' })).toBeNull()
    expect(screen.getByText(/10 %/)).toBeDefined()
    expect(
      screen.getByRole('slider', { name: 'Fundo da pirâmide' }),
    ).toHaveAttribute('aria-valuetext', '10 %')
  })

  it('mostra o tamanho e o upload no SVG', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
      />,
    )
    expect(screen.getByRole('slider', { name: 'Tamanho do SVG' })).toBeDefined()
    expect(screen.getByLabelText('Arquivo SVG')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Enviar SVG' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Remover SVG' })).toBeNull()
  })

  it('atualiza a forma selecionada', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.change(screen.getByLabelText('Forma'), {
      target: { value: 'square' },
    })
    expect(onUpdateParam).toHaveBeenCalledWith('shape', 'square')
  })

  it('lê o SVG enviado e chama onSetSvg', async () => {
    const onSetSvg = vi.fn()
    render(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
        onSetSvg={onSetSvg}
      />,
    )
    const file = makeSvgFile('contorno.svg', '<svg></svg>')
    fireEvent.change(screen.getByLabelText('Arquivo SVG'), {
      target: { files: [file] },
    })
    await waitFor(() => expect(onSetSvg).toHaveBeenCalledWith('<svg></svg>'))
    expect(screen.getByText('contorno.svg')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Trocar SVG' })).toBeDefined()
  })

  it('mostra erro quando a leitura do arquivo falha', async () => {
    const onSetSvg = vi.fn()
    render(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
        onSetSvg={onSetSvg}
      />,
    )
    const file = new File(['<svg/>'], 'contorno.svg', {
      type: 'image/svg+xml',
    })
    Object.defineProperty(file, 'text', {
      value: () => Promise.reject(new Error('falha')),
    })
    fireEvent.change(screen.getByLabelText('Arquivo SVG'), {
      target: { files: [file] },
    })
    await waitFor(() =>
      expect(screen.getByText('Não foi possível ler o arquivo.')).toBeDefined(),
    )
    expect(onSetSvg).not.toHaveBeenCalled()
    expect(screen.queryByText('contorno.svg')).toBeNull()
  })

  it('rejeita arquivo que não é SVG', async () => {
    const onSetSvg = vi.fn()
    render(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
        onSetSvg={onSetSvg}
      />,
    )
    const file = new File(['png'], 'icone.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Arquivo SVG'), {
      target: { files: [file] },
    })
    await waitFor(() =>
      expect(screen.getByText('Envie um arquivo SVG.')).toBeDefined(),
    )
    expect(onSetSvg).not.toHaveBeenCalled()
    expect(screen.queryByText('icone.png')).toBeNull()
  })

  it('rejeita arquivo maior que 2 MB', async () => {
    const onSetSvg = vi.fn()
    render(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
        onSetSvg={onSetSvg}
      />,
    )
    const file = new File(['<svg/>'], 'grande.svg', {
      type: 'image/svg+xml',
    })
    Object.defineProperty(file, 'size', {
      value: 2 * 1024 * 1024 + 1,
    })
    fireEvent.change(screen.getByLabelText('Arquivo SVG'), {
      target: { files: [file] },
    })
    await waitFor(() =>
      expect(
        screen.getByText('O SVG deve ter no máximo 2 MB.'),
      ).toBeDefined(),
    )
    expect(onSetSvg).not.toHaveBeenCalled()
  })

  it('rejeita texto acima do limite do schema', async () => {
    const onSetSvg = vi.fn()
    render(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
        onSetSvg={onSetSvg}
      />,
    )
    const file = makeSvgFile('grande.svg', 'a'.repeat(SVG_MAX_LENGTH + 1))
    fireEvent.change(screen.getByLabelText('Arquivo SVG'), {
      target: { files: [file] },
    })
    await waitFor(() =>
      expect(
        screen.getByText('O SVG deve ter no máximo 2 MB.'),
      ).toBeDefined(),
    )
    expect(onSetSvg).not.toHaveBeenCalled()
  })

  it('mostra o erro do SVG', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
        svgError={{
          code: 'svg-parse',
          message: 'Não foi possível ler o SVG',
        }}
      />,
    )
    expect(screen.getByText('Erro no SVG')).toBeDefined()
    expect(screen.getByText('Não foi possível ler o SVG')).toBeDefined()
  })

  it('remove o SVG carregado e esconde o upload', async () => {
    const onSetSvg = vi.fn()
    const { rerender } = render(
      <StudioPanel
        {...defaultProps}
        params={{ ...svgParams, svg: '<svg/>' }}
        outline={null}
        onSetSvg={onSetSvg}
      />,
    )
    expect(screen.getByText('SVG carregado')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Remover SVG' }))
    expect(onSetSvg).toHaveBeenCalledWith(null)

    rerender(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
        onSetSvg={onSetSvg}
      />,
    )
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Remover SVG' })).toBeNull(),
    )
    expect(screen.getByRole('button', { name: 'Enviar SVG' })).toBeDefined()
  })

  it('limpa o nome do arquivo quando o SVG é alterado externamente', async () => {
    const onSetSvg = vi.fn()
    const { rerender } = render(
      <StudioPanel
        {...defaultProps}
        params={{ ...svgParams, svg: '<svg/>' }}
        outline={null}
        onSetSvg={onSetSvg}
      />,
    )
    fireEvent.change(screen.getByLabelText('Arquivo SVG'), {
      target: { files: [makeSvgFile('contorno.svg', '<svg></svg>')] },
    })
    await waitFor(() => expect(screen.getByText('contorno.svg')).toBeDefined())

    rerender(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
        onSetSvg={onSetSvg}
      />,
    )
    await waitFor(() =>
      expect(screen.queryByText('contorno.svg')).toBeNull(),
    )
    expect(screen.getByRole('button', { name: 'Enviar SVG' })).toBeDefined()
  })

  it('mostra as métricas da forma quadrada', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={squareParams}
        outline={getShapeOutline(squareParams)}
      />,
    )
    expect(screen.getByText(/Suporte 168\.6 × 168\.6 mm/)).toBeDefined()
    expect(screen.getByText(/Altura 27\.0 mm/)).toBeDefined()
    expect(screen.getByText(/Degrau efetivo 6\.3 mm/)).toBeDefined()
    expect(screen.getByText(/ampliado pela moldura/)).toBeDefined()
    expect(screen.getByText(/Parede da cavidade 10\.3 mm/)).toBeDefined()
    expect(screen.getByText(/Tela 160\.0 × 160\.0 mm/)).toBeDefined()
    expect(screen.getByText(/Guia 160\.0 × 160\.0 mm/)).toBeDefined()
    expect(screen.getByText(/Altura total 46\.0 mm/)).toBeDefined()
    expect(screen.getByText(/Pega Ø46\.8 × 28\.1 mm/)).toBeDefined()
    expect(
      screen.getByText(/A tela é exportada plana; aqueça e pressione/),
    ).toBeDefined()
  })

  it('mostra a contagem de favos própria do quadrado', () => {
    const params = { ...squareParams, width: 120 }
    render(
      <StudioPanel
        {...defaultProps}
        params={params}
        outline={getShapeOutline(params)}
      />,
    )
    expect(screen.getByText(/295 favos/)).toBeDefined()
    expect(screen.queryByText(/439 favos/)).toBeNull()
  })

  it('não mostra métricas do círculo sem contorno válido', () => {
    render(
      <StudioPanel
        {...defaultProps}
        params={svgParams}
        outline={null}
      />,
    )
    expect(screen.getAllByText('Aguardando contorno válido.')).toHaveLength(2)
    expect(screen.queryByText(/Diâmetro externo/)).toBeNull()
    expect(screen.queryByText(/Diâmetro 160\.0 mm/)).toBeNull()
    expect(screen.queryByText(/favos/)).toBeNull()
  })

  it('esconde a nota do degrau quando a largura já comporta a moldura', () => {
    const params = { ...squareParams, stepWidth: 7 }
    render(
      <StudioPanel
        {...defaultProps}
        params={params}
        outline={getShapeOutline(params)}
      />,
    )
    expect(screen.getByText(/Degrau efetivo 7\.0 mm/)).toBeDefined()
    expect(screen.queryByText(/ampliado pela moldura/)).toBeNull()
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
    expect(screen.getByText(/Parede da bacia 9\.0 mm/)).toBeDefined()
  })

  it('atualiza a parede do suporte', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Parede do suporte' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenCalledWith('wallThickness', 4.5)
  })

  it('renderiza a seção Macho e o slider', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Macho')).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Altura do corpo' })).toBeDefined()
  })

  it('mostra as métricas do macho', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText(/Diâmetro 160\.0 mm/)).toBeDefined()
    expect(screen.getByText(/Altura total 46\.0 mm/)).toBeDefined()
    expect(screen.getByText(/Pega Ø46\.8 × 28\.1 mm/)).toBeDefined()
    expect(
      screen.getByText(/A tela é exportada plana; aqueça e pressione/),
    ).toBeDefined()
  })

  it('atualiza a altura do corpo do macho', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(
      screen.getByRole('slider', { name: 'Altura do corpo' }),
      { key: 'ArrowRight' },
    )
    expect(onUpdateParam).toHaveBeenCalledWith('plugHeight', 27)
  })

  it('recalcula as métricas com a altura do corpo', () => {
    const { rerender } = render(<StudioPanel {...defaultProps} />)
    rerender(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultThermoformerParams, plugHeight: 40 }}
      />,
    )
    expect(screen.getByText(/Altura total 60\.0 mm/)).toBeDefined()
    expect(screen.getByText(/Pega Ø60\.0 × 36\.0 mm/)).toBeDefined()
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
