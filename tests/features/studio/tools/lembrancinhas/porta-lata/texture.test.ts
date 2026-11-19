import { describe, it, expect } from 'vitest'
import {
  textureDisplacement,
  textureHeight,
  textureMask,
} from '@/features/studio/tools/lembrancinhas/porta-lata/texture'
import {
  TEXTURE_STYLES,
  defaultCanHolderParams,
  type CanHolderGeometryParams,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'

function withParams(overrides: Partial<CanHolderGeometryParams>): CanHolderGeometryParams {
  return { ...defaultCanHolderParams, ...overrides }
}

const WALL_MIN = 6
const WALL_MAX = 105.2
const TAU = Math.PI * 2

describe('texturas do porta-lata', () => {
  it('devolve 0 para o estilo none', () => {
    for (const theta of [0, 1, 3]) {
      for (const y of [10, 60, 100]) {
        expect(textureHeight(defaultCanHolderParams, theta, y)).toBe(0)
        expect(textureDisplacement(defaultCanHolderParams, theta, y, WALL_MIN, WALL_MAX)).toBe(0)
      }
    }
  })

  it('mantém todos os estilos em 0..profundidade, periódicos e determinísticos', () => {
    for (const style of TEXTURE_STYLES.filter((value) => value !== 'none')) {
      const params = withParams({ textureStyle: style, textureDepth: 1.5 })
      for (let i = 0; i < 24; i++) {
        const theta = (i / 24) * TAU
        for (const y of [12, 40, 70, 100]) {
          const height = textureHeight(params, theta, y)
          expect.soft(height, `${style} em ${theta}/${y}`).toBeGreaterThanOrEqual(0)
          expect.soft(height, `${style} em ${theta}/${y}`).toBeLessThanOrEqual(1.5 + 1e-9)
          expect(textureHeight(params, theta, y)).toBeCloseTo(height, 12)
        }
        expect.soft(textureHeight(params, theta, 60), `${style} em 0`).toBeCloseTo(
          textureHeight(params, theta + TAU, 60),
          9,
        )
      }
    }
  })

  it('gera padrões diferentes por estilo', () => {
    const samples = TEXTURE_STYLES.filter((style) => style !== 'none').map((style) => {
      const params = withParams({ textureStyle: style })
      return [20, 50, 80].map((y) => textureHeight(params, 1.3, y).toFixed(4)).join('|')
    })
    expect(new Set(samples).size).toBe(samples.length)
  })

  it('zera a máscara nas bordas da parede', () => {
    // Sem alça: o meio da parede (55,6 mm) cai na faixa da abraçadeira.
    const params = withParams({ textureStyle: 'wood', handleEnabled: false })
    expect(textureMask(params, WALL_MIN, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, WALL_MAX, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, (WALL_MIN + WALL_MAX) / 2, WALL_MIN, WALL_MAX)).toBeCloseTo(1, 6)
  })

  it('zera a máscara na faixa da abraçadeira', () => {
    const params = withParams({ textureStyle: 'wood', handleHeight: 60, handleWidth: 12 })
    const bandMin = 60 - 6 - 1
    const bandMax = 60 + 6 + 1
    expect(textureMask(params, bandMin, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, bandMax, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, 60, WALL_MIN, WALL_MAX)).toBe(0)

    const noHandle = withParams({ ...params, handleEnabled: false })
    expect(textureMask(noHandle, 60, WALL_MIN, WALL_MAX)).toBeGreaterThan(0)
  })

  it('nunca desloca mais que a profundidade', () => {
    for (const style of TEXTURE_STYLES.filter((value) => value !== 'none')) {
      const params = withParams({ textureStyle: style, textureDepth: 1.5 })
      for (let i = 0; i < 48; i++) {
        const theta = (i / 48) * TAU
        for (const y of [10, 30, 60, 90]) {
          const h = textureDisplacement(params, theta, y, WALL_MIN, WALL_MAX)
          expect.soft(h, `${style} em ${y}`).toBeGreaterThanOrEqual(0)
          expect.soft(h, `${style} em ${y}`).toBeLessThanOrEqual(1.5 + 1e-9)
        }
      }
    }
  })
})
