import { describe, it, expect } from 'vitest'
import { FontLoader, type Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import helvetikerRegular from '@/assets/fonts/helvetiker_regular.typeface.json'
import {
  buildCanHolder,
  disposeCanHolderResult,
} from '@/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder'
import { defaultCanHolderParams } from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'

function realFont(): Font {
  return new FontLoader().parse(helvetikerRegular as unknown as FontData)
}

describe('buildCanHolder', () => {
  it('une o relevo ao corpo e devolve a alça separada', () => {
    const started = performance.now()
    const result = buildCanHolder({ ...defaultCanHolderParams, text: 'Festa' }, realFont())
    const elapsed = performance.now() - started

    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(0)
    expect(result.handle).not.toBeNull()
    expect(isClosed(result.handle!)).toBe(true)
    expect(countShells(result.handle!)).toBe(1)
    // Default medido em ≈1,2–1,6 s (primeiro build, sem JIT quente). A meta de
    // projeto é <1,5 s; o gate de 4 s cobre máquinas de CI mais lentas.
    expect(elapsed).toBeLessThan(4000)

    disposeCanHolderResult(result)
  })

  it('a união do relevo adiciona material ao corpo', () => {
    const withText = buildCanHolder({ ...defaultCanHolderParams, text: 'Festa' }, realFont())
    const withoutText = buildCanHolder({ ...defaultCanHolderParams, text: '' }, realFont())
    const reliefVolume = signedVolume(withText.body) - signedVolume(withoutText.body)

    // Relevo visível de 1 mm sobre a parede: o delta fica na ordem da área do
    // texto. Uma faixa estreita pega tanto subtração quanto relevo quase raso.
    expect(reliefVolume).toBeGreaterThanOrEqual(80)
    expect(reliefVolume).toBeLessThanOrEqual(300)

    disposeCanHolderResult(withText)
    disposeCanHolderResult(withoutText)
  })

  it('sem texto devolve só o corpo de revolução', () => {
    const result = buildCanHolder({ ...defaultCanHolderParams, text: '' }, realFont())
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(result.handle).not.toBeNull()
    disposeCanHolderResult(result)
  })

  it('alça desligada devolve handle nulo', () => {
    const result = buildCanHolder({ ...defaultCanHolderParams, handleEnabled: false }, realFont())
    expect(result.handle).toBeNull()
    disposeCanHolderResult(result)
  })

  it.each([
    {
      name: 'corpo grande',
      params: { diameterTop: 100, diameterBottom: 95, height: 115 },
    },
    {
      name: 'corpo pequeno',
      params: { diameterTop: 70, diameterBottom: 60, height: 80 },
    },
    {
      name: 'parede mínima, texto grande e centro clampado',
      params: {
        diameterTop: 70,
        diameterBottom: 60,
        height: 80,
        wallThickness: 1.8,
        rimChamfer: 2,
        textSize: 18,
        textCenterY: 90,
      },
    },
  ])('fecha o corpo nos extremos de tamanho ($name)', ({ params }) => {
    const result = buildCanHolder({ ...defaultCanHolderParams, ...params }, realFont())

    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(0)
    disposeCanHolderResult(result)
  })
})
