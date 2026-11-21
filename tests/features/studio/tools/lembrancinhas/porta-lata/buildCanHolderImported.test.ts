import { describe, it, expect } from 'vitest'
import {
  buildCanHolder,
  disposeCanHolderResult,
} from '@/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder'
import { defaultCanHolderParams } from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'
import { realFont } from './canHolderTestUtils'

// Arquivo separado: os builds completos importados (corpo + texto + alça) são
// caros e, somados ao arquivo principal, estouravam o watchdog de RPC do
// Vitest (`onTaskUpdate`) sob carga.
describe('buildCanHolder com texturas importadas', () => {
  it('fecha corpo e alça com textura importada', { timeout: 60_000 }, () => {
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
})
