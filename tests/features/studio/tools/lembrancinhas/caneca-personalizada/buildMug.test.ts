import { describe, it, expect } from 'vitest'
import { FontLoader, type Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import helvetikerRegular from '@/assets/fonts/helvetiker_regular.typeface.json'
import {
  buildMug,
  disposeMugResult,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'

function realFont(): Font {
  return new FontLoader().parse(helvetikerRegular as unknown as FontData)
}

describe('buildMug', () => {
  it('une o relevo ao corpo e devolve a alça separada', () => {
    const started = performance.now()
    const result = buildMug({ ...defaultMugParams, text: 'Festa' }, realFont())
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

    disposeMugResult(result)
  })

  it('a união do relevo adiciona material ao corpo', () => {
    const withText = buildMug({ ...defaultMugParams, text: 'Festa' }, realFont())
    const withoutText = buildMug({ ...defaultMugParams, text: '' }, realFont())
    const reliefVolume = signedVolume(withText.body) - signedVolume(withoutText.body)

    expect(reliefVolume).toBeGreaterThan(0)
    // O relevo visível é 1 mm sobre a parede: o volume extra fica na mesma
    // ordem de grandeza da área do texto, não de uma subtração.
    expect(reliefVolume).toBeLessThan(1000)

    disposeMugResult(withText)
    disposeMugResult(withoutText)
  })

  it('sem texto devolve só o corpo de revolução', () => {
    const result = buildMug({ ...defaultMugParams, text: '' }, realFont())
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(result.handle).not.toBeNull()
    disposeMugResult(result)
  })

  it('alça desligada devolve handle nulo', () => {
    const result = buildMug({ ...defaultMugParams, handleEnabled: false }, realFont())
    expect(result.handle).toBeNull()
    disposeMugResult(result)
  })
})
