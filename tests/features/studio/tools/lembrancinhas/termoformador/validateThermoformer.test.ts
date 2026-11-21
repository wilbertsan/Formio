import { describe, it, expect } from 'vitest'
import { validateThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/validateThermoformer'
import { getShapeOutline, type ShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
import {
  defaultThermoformerParams,
  type ThermoformerGeometryParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,5 95,95 5,95" fill="#000"/>
</svg>`

/**
 * C de braços finos: o recuo da moldura separa o contorno em duas ilhas.
 * Escalado para 160 mm, o dorso fica com 10 mm e os braços com 20 mm; o recuo
 * de 6 mm elimina o dorso e deixa os braços.
 */
const splitC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="10,10 90,10 90,20 15,20 15,80 90,80 90,90 10,90" fill="#000"/>
</svg>`

/** C grosso: o contorno continua inteiro, mas a pega não cabe na forma. */
const thickC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="10,10 90,10 90,25 25,25 25,75 90,75 90,90 10,90" fill="#000"/>
</svg>`

const tallRectangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 300">
  <rect x="0" y="0" width="40" height="300" fill="#000"/>
</svg>`

function polygonOutline(params: ThermoformerGeometryParams): ShapeOutline {
  const outline = getShapeOutline(params)
  if (!outline || outline.kind !== 'polygon') {
    throw new Error('esperava um contorno poligonal')
  }
  return outline
}

function polygonOutlineWithSvg(
  svg: string,
  params: ThermoformerGeometryParams,
): ShapeOutline {
  const outline = getShapeOutline(params, parseSvg(svg))
  if (!outline || outline.kind !== 'polygon') {
    throw new Error('esperava um contorno SVG poligonal')
  }
  return outline
}

describe('validateThermoformer', () => {
  it('não aponta problemas nos defaults', () => {
    expect(validateThermoformer(defaultThermoformerParams)).toHaveLength(0)
  })

  it('aponta aro que consome o disco', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, diameter: 60, frameWidth: 30 })
    expect(issues.map((issue) => issue.code)).toEqual(['screen-frame'])
    expect(issues[0]).toEqual(
      expect.objectContaining({ code: 'screen-frame', severity: 'error' }),
    )
  })

  it('acumula issue da tela com issue do suporte', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 30,
      fitClearance: 0.1,
    })
    expect(issues.map((issue) => issue.code)).toEqual(['screen-frame', 'support-clearance'])
  })

  it('aponta ausência de favos', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 29.5,
      opening: 3,
    })
    expect(issues.map((issue) => issue.code)).toEqual(['screen-empty'])
  })

  it('aponta abertura maior que o raio interno', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 20,
      opening: 12,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-opening' }))
  })

  it('aponta o limite de favos com a abertura efetiva', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 300,
      frameWidth: 2,
      opening: 3,
      lineWidth: 1.2,
    })
    const density = issues.find((issue) => issue.code === 'screen-density')
    expect(density).toBeDefined()
    expect(density!.message).toMatch(/4000/)
    const pattern = computeScreenPattern({
      ...defaultThermoformerParams,
      diameter: 300,
      frameWidth: 2,
      opening: 3,
      lineWidth: 1.2,
    })
    expect(density!.message).toContain(pattern.effectiveOpening.toFixed(1))
    expect(pattern.effectiveOpening).toBeGreaterThan(3)
  })

  it('aponta linha abaixo do mínimo (defensivo)', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, lineWidth: 0.3 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-line', severity: 'warning' }))
  })

  it('aponta degrau sem sustentação da tela (defensivo)', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 0.3,
      fitClearance: 0.3,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-step', severity: 'error' }))
  })

  it('aponta degrau fino (defensivo)', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 1,
      fitClearance: 0.3,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-step', severity: 'warning' }))
  })

  it('avisa quando o degrau passa do aro sólido da tela', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 8,
      frameWidth: 6,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-step-frame', severity: 'warning' }))
  })

  it('não avisa quando o degrau fica sob o aro sólido', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 6.2,
      frameWidth: 6,
      fitClearance: 0.3,
    })
    expect(issues.some((issue) => issue.code === 'support-step-frame')).toBe(false)
  })

  it('aponta parede e fundo abaixo do mínimo (defensivo)', () => {
    const wall = validateThermoformer({ ...defaultThermoformerParams, wallThickness: 0.5 })
    const bottom = validateThermoformer({ ...defaultThermoformerParams, bottomThickness: 0.5 })
    expect(wall).toContainEqual(expect.objectContaining({ code: 'support-wall', severity: 'error' }))
    expect(bottom).toContainEqual(expect.objectContaining({ code: 'support-bottom', severity: 'error' }))
  })

  it('avisa sobre folga apertada da tela', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, fitClearance: 0.1 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-clearance', severity: 'warning' }))
  })

  it('avisa profundidade inválida (defensivo)', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, bowlDepth: 0 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-depth' }))
  })

  it('avisa quando a profundidade da bacia é limitada', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      wallThickness: 2,
      bowlDepth: 60,
      stepWidth: 2,
      fitClearance: 0.1,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-depth' }))
    const depth = issues.find((issue) => issue.code === 'support-depth')
    expect(depth).toEqual(expect.objectContaining({ severity: 'warning' }))
    expect(depth!.message).toContain('28.1 mm')
  })

  it('aponta macho sem coroa de contato (defensivo)', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      stepWidth: -5,
    })
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'plug-guide', severity: 'error' }),
    )
  })

  it('aponta coroa de largura zero no limite (defensivo)', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      stepWidth: 0.3,
      fitClearance: 0.3,
    })
    const issue = issues.find((item) => item.code === 'plug-guide')
    expect(issue).toEqual(
      expect.objectContaining({ code: 'plug-guide', severity: 'error' }),
    )
    expect(issue!.message).toContain('Aumente a largura do degrau')
  })
})

describe('validateThermoformer nas formas', () => {
  it('avisa quando o degrau é ampliado pela moldura', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
      stepWidth: 5,
      frameWidth: 6,
    }
    const issues = validateThermoformer(params, polygonOutline(params))

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'support-step-clamped', severity: 'warning' }),
    )
    expect(issues.some((issue) => issue.code === 'support-step-frame')).toBe(false)
  })

  it('avisa quando o degrau avança sob a área perfurada sem clampar', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
      stepWidth: 8,
      frameWidth: 6,
    }
    const issues = validateThermoformer(params, polygonOutline(params))

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'support-step-frame', severity: 'warning' }),
    )
    expect(issues.some((issue) => issue.code === 'support-step-clamped')).toBe(false)
  })

  it('avisa sobre o ângulo de saída baixo apenas nas formas de bandeja', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      draftAngle: 1,
      stepWidth: 7,
    }
    const issues = validateThermoformer(params, polygonOutline(params))

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'support-draft', severity: 'warning' }),
    )
    expect(
      validateThermoformer({ ...defaultThermoformerParams, draftAngle: 1 }),
    ).toHaveLength(0)
  })

  it('avisa sobre a ponta pequena da pirâmide', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'pyramid' as const,
      width: 40,
      stepWidth: 7,
    }
    const issues = validateThermoformer(params, polygonOutline(params))

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'support-tip', severity: 'warning' }),
    )
  })

  it('avisa quando a pega é desabilitada para a forma', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'svg' as const,
      svgSize: 160,
    }
    const outline = polygonOutlineWithSvg(thickC, params)

    expect(validateThermoformer(params, outline)).toContainEqual(
      expect.objectContaining({ code: 'plug-grip', severity: 'warning' }),
    )
  })

  it('não avisa a pega em uma forma normal', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 160,
      plugHeight: 10,
    }
    const issues = validateThermoformer(params, polygonOutline(params))

    expect(issues.some((issue) => issue.code === 'plug-grip')).toBe(false)
  })

  it('avisa quando a bandeja limita a profundidade', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 40,
      bowlDepth: 60,
      draftAngle: 15,
    }
    const issues = validateThermoformer(params, polygonOutline(params))

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'support-depth', severity: 'warning' }),
    )
  })
})

describe('validateThermoformer nas telas das formas', () => {
  it('aponta aro que consome o quadrado', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 40,
      frameWidth: 30,
    }
    const issues = validateThermoformer(params, polygonOutline(params))

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'screen-frame', severity: 'error' }),
    )
  })

  it('aponta ausência de favos no quadrado', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 40,
      frameWidth: 15,
      opening: 30,
    }
    const issues = validateThermoformer(params, polygonOutline(params))

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'screen-empty', severity: 'warning' }),
    )
  })

  it('aponta abertura grande no retângulo', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'rectangle' as const,
      width: 40,
      height: 160,
      opening: 15,
    }
    const issues = validateThermoformer(params, polygonOutline(params))

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'screen-opening', severity: 'warning' }),
    )
  })

  it('aponta abertura grande no SVG estreito', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'svg' as const,
      svgSize: 300,
      opening: 15,
    }
    const outline = polygonOutlineWithSvg(tallRectangle, params)
    const issues = validateThermoformer(params, outline)

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'screen-opening', severity: 'warning' }),
    )
  })
})

describe('validateThermoformer no SVG', () => {
  it('sinaliza SVG ausente, ilegível e com contorno inválido', () => {
    const params = { ...defaultThermoformerParams, shape: 'svg' as const }

    expect(
      validateThermoformer(params, null, {
        code: 'svg-missing',
        message: 'Envie um SVG',
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'svg-missing', severity: 'error' }),
    )
    expect(
      validateThermoformer(params, null, {
        code: 'svg-parse',
        message: 'Não foi possível ler o SVG',
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'svg-parse', severity: 'error' }),
    )
    expect(
      validateThermoformer(params, null, {
        code: 'svg-contour',
        message: 'O SVG precisa ter um único contorno fechado',
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'svg-contour', severity: 'error' }),
    )
  })

  it('infere svg-contour quando o contorno não foi derivado', () => {
    const params = { ...defaultThermoformerParams, shape: 'svg' as const }

    expect(validateThermoformer(params, null, null)).toContainEqual(
      expect.objectContaining({ code: 'svg-contour', severity: 'error' }),
    )
  })

  it('sinaliza offsets que dividem a silhueta do SVG', () => {
    const params = { ...defaultThermoformerParams, shape: 'svg' as const }
    const outline = polygonOutlineWithSvg(splitC, params)

    expect(outline.cavityOpening!.length).toBeGreaterThan(1)
    expect(validateThermoformer(params, outline)).toContainEqual(
      expect.objectContaining({ code: 'svg-feature', severity: 'error' }),
    )
  })

  it('sinaliza envelope do SVG acima do máximo da forma', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'svg' as const,
      svgSize: 300,
    }
    const outline = polygonOutlineWithSvg(triangle, params)

    expect(validateThermoformer(params, outline)).toContainEqual(
      expect.objectContaining({ code: 'svg-size', severity: 'error' }),
    )
  })

  it('sinaliza silhueta complexa demais', () => {
    const points = Array.from({ length: 2001 }, (_, index) => {
      const angle = (index / 2001) * Math.PI * 2
      return `${(50 + 40 * Math.cos(angle)).toFixed(3)},${(50 + 40 * Math.sin(angle)).toFixed(3)}`
    }).join(' ')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <polygon points="${points}" fill="#000"/>
    </svg>`
    const params = { ...defaultThermoformerParams, shape: 'svg' as const }
    const outline = polygonOutlineWithSvg(svg, params)

    expect(validateThermoformer(params, outline)).toContainEqual(
      expect.objectContaining({ code: 'svg-feature', severity: 'error' }),
    )
  })
})
