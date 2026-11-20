import { describe, it, expect } from 'vitest'
import {
  importedTextureHeight,
  textureDisplacement,
  textureHeight,
  textureMask,
} from '@/features/studio/tools/lembrancinhas/porta-lata/texture'
import {
  IMPORTED_TEXTURE_IDS,
  IMPORTED_TEXTURES,
} from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import {
  PROCEDURAL_TEXTURE_STYLES,
  TEXTURE_EDGE_FADE_MM,
  defaultCanHolderParams,
  getEffectiveTextureDepth,
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
    for (const style of PROCEDURAL_TEXTURE_STYLES.filter((value) => value !== 'none')) {
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
    const samples = PROCEDURAL_TEXTURE_STYLES.filter((style) => style !== 'none').map((style) => {
      const params = withParams({ textureStyle: style })
      return [20, 50, 80].map((y) => textureHeight(params, 1.3, y).toFixed(4)).join('|')
    })
    expect(new Set(samples).size).toBe(samples.length)
  })

  it('limita a profundidade efetiva a um quarto da escala', () => {
    const params = withParams({ textureStyle: 'wood', textureDepth: 1.5, textureScale: 4 })
    expect(getEffectiveTextureDepth(params)).toBeCloseTo(1, 6)
    for (let i = 0; i < 24; i++) {
      expect(textureHeight(params, (i / 24) * TAU, 60)).toBeLessThanOrEqual(1 + 1e-9)
    }
    expect(getEffectiveTextureDepth({ ...params, textureStyle: 'none' })).toBe(0)
  })

  it('mantém o campo contínuo e com flancos imprimíveis', () => {
    for (const style of PROCEDURAL_TEXTURE_STYLES.filter((value) => value !== 'none')) {
      for (const textureScale of [4, 8, 16]) {
        const params = withParams({ textureStyle: style, textureDepth: 1.5, textureScale })
        for (const theta of [0, 0.7, 1.9, 3.1, 4.4, 5.8]) {
          let previous = textureHeight(params, theta, WALL_MIN + 0.5)
          for (let y = WALL_MIN + 0.6; y <= WALL_MAX - 0.5; y += 0.1) {
            const height = textureHeight(params, theta, y)
            expect.soft(
              Math.abs(height - previous) / 0.1,
              `${style}/${textureScale} em θ=${theta}/y=${y}`,
            ).toBeLessThanOrEqual(1)
            previous = height
          }
        }
      }
    }
  })

  it('zera a máscara nas bordas da parede', () => {
    // Com a alça desligada a faixa lisa (53–67 mm) não existe, então o meio da
    // parede (55,6 mm) não é mascarado.
    const params = withParams({ textureStyle: 'wood', handleEnabled: false })
    const fade = Math.max(TEXTURE_EDGE_FADE_MM, 3 * params.textureDepth)
    expect(textureMask(params, WALL_MIN, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, WALL_MAX, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, WALL_MIN + fade / 2, WALL_MIN, WALL_MAX)).toBeCloseTo(0.5, 2)
    expect(textureMask(params, (WALL_MIN + WALL_MAX) / 2, WALL_MIN, WALL_MAX)).toBeCloseTo(1, 6)
  })

  it('zera a máscara na faixa da abraçadeira', () => {
    const params = withParams({ textureStyle: 'wood', handleHeight: 60, handleWidth: 12 })
    const bandMin = 60 - 6 - 1
    const bandMax = 60 + 6 + 1
    expect(textureMask(params, bandMin, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, bandMax, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, 60, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureDisplacement(params, 1, 60, WALL_MIN, WALL_MAX)).toBe(0)

    const noHandle = withParams({ ...params, handleEnabled: false })
    expect(textureMask(noHandle, 60, WALL_MIN, WALL_MAX)).toBeGreaterThan(0)
  })

  it('nunca desloca mais que a profundidade', () => {
    for (const style of PROCEDURAL_TEXTURE_STYLES.filter((value) => value !== 'none')) {
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

  it('amostra o mapa importado com período em u e faixa nativa', () => {
    const params = { ...defaultCanHolderParams, textureStyle: 'paralelepipedos' as const }
    const meta = IMPORTED_TEXTURES.paralelepipedos
    const a = textureDisplacement(params, 0.2, 40, WALL_MIN, WALL_MAX)
    const b = textureDisplacement(params, 0.2 + TAU, 40, WALL_MIN, WALL_MAX)
    const c = textureDisplacement(params, 0.2, 88, WALL_MIN, WALL_MAX)
    expect(a).toBeCloseTo(b, 6)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(meta.nativeDepth + 1e-9)
    expect(c).toBeGreaterThanOrEqual(0)
    expect(c).toBeLessThanOrEqual(meta.nativeDepth + 1e-9)
    expect(a).not.toBeCloseTo(c, 3)
  })

  it('mantém o amostrador importado periódico em u e clampado em v', () => {
    const meta = IMPORTED_TEXTURES.paralelepipedos
    for (const v of [0, 0.25, 0.5, 0.9, 1]) {
      const height = importedTextureHeight('paralelepipedos', 0.3, v)
      expect(height).toBeGreaterThanOrEqual(0)
      expect(height).toBeLessThanOrEqual(meta.nativeDepth + 1e-9)
      expect(importedTextureHeight('paralelepipedos', 1.3, v)).toBeCloseTo(height, 9)
      expect(importedTextureHeight('paralelepipedos', -0.7, v)).toBeCloseTo(height, 9)
    }
    expect(importedTextureHeight('paralelepipedos', 0.3, -1)).toBeCloseTo(
      importedTextureHeight('paralelepipedos', 0.3, 0),
      9,
    )
    expect(importedTextureHeight('paralelepipedos', 0.3, 2)).toBeCloseTo(
      importedTextureHeight('paralelepipedos', 0.3, 1),
      9,
    )
  })

  it('fecha o mapa importado em u com período de uma volta', () => {
    for (const style of IMPORTED_TEXTURE_IDS) {
      for (const v of [0, 0.3, 0.5, 0.8, 1]) {
        expect(importedTextureHeight(style, 0, v)).toBeCloseTo(
          importedTextureHeight(style, 1, v),
          9,
        )
      }
    }
  })

  it('mantém o deslocamento importado entre 0 e a profundidade nativa', () => {
    for (const style of IMPORTED_TEXTURE_IDS) {
      const params = withParams({ textureStyle: style })
      const depth = IMPORTED_TEXTURES[style].nativeDepth
      for (const theta of [0.2, 1.3, 3.4, 5.9]) {
        for (const y of [9, 25, 45, 72, 100]) {
          const height = textureDisplacement(params, theta, y, WALL_MIN, WALL_MAX)
          expect.soft(height, `${style} em ${theta}/${y}`).toBeGreaterThanOrEqual(0)
          expect
            .soft(height, `${style} em ${theta}/${y}`)
            .toBeLessThanOrEqual(depth + 1e-9)
        }
      }
    }
  })

  it('deixa a altura procedural zerada nos estilos importados', () => {
    for (const style of IMPORTED_TEXTURE_IDS) {
      const params = withParams({ textureStyle: style })
      for (const theta of [0, 1, 3]) {
        for (const y of [10, 60, 100]) {
          expect(textureHeight(params, theta, y)).toBe(0)
        }
      }
    }
  })

  it('mantém a faixa da abraçadeira lisa com textura importada', () => {
    const params = { ...defaultCanHolderParams, textureStyle: 'paralelepipedos' as const }
    expect(textureDisplacement(params, 1, 60, WALL_MIN, WALL_MAX)).toBe(0)
  })
})
