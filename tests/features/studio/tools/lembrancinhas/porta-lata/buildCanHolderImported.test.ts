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

// Arquivo separado: os builds completos importados (corpo + texto + alça) são
// caros e, somados ao arquivo principal, estouravam o watchdog de RPC do
// Vitest (`onTaskUpdate`) sob carga.
describe('buildCanHolder com texturas importadas', () => {
  it('fecha corpo e alça com textura importada', () => {
    const result = buildCanHolder(
      { ...defaultCanHolderParams, textureStyle: 'paralelepipedos' },
      realFont(),
    )

    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(0)
    expect(result.handle).not.toBeNull()
    expect(isClosed(result.handle!)).toBe(true)
    expect(countShells(result.handle!)).toBe(1)
    expect(signedVolume(result.handle!)).toBeGreaterThan(0)
    disposeCanHolderResult(result)
  })

  it('une o texto a um corpo com textura importada', () => {
    const params = { ...defaultCanHolderParams, textureStyle: 'pedra_hexagonal' as const }
    const result = buildCanHolder(params, realFont())
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(0)
    expect(result.handle).not.toBeNull()
    expect(isClosed(result.handle!)).toBe(true)
    expect(countShells(result.handle!)).toBe(1)
    expect(signedVolume(result.handle!)).toBeGreaterThan(0)
    disposeCanHolderResult(result)
  })
})
