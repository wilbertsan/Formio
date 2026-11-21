import { describe, it, expect } from 'vitest'
import {
  buildCanHolder,
  disposeCanHolderResult,
} from '@/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder'
import { defaultCanHolderParams } from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'
import { realFont, seamGroups } from './canHolderTestUtils'

// Arquivo separado do build importado raso: o texto + a textura profunda fazem
// o build mais caro do conjunto e não devem competir com os demais no watchdog
// de RPC do Vitest sob carga.
describe('buildCanHolder com textura importada profunda', () => {
  it('une o texto a um corpo com textura importada', { timeout: 60_000 }, () => {
    const params = { ...defaultCanHolderParams, textureStyle: 'pedra_hexagonal' as const }
    const result = buildCanHolder(params, realFont())
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(0)
    expect(result.handle).not.toBeNull()
    expect(isClosed(result.handle!)).toBe(true)
    expect(countShells(result.handle!)).toBe(1)
    expect(signedVolume(result.handle!)).toBeGreaterThan(0)

    // O weld pós-CSG precisa soldar a emenda com os 512 segmentos importados.
    const normal = result.body.getAttribute('normal')
    const groups = seamGroups(result.body, params)
    let pairs = 0
    for (const indices of groups.values()) {
      if (indices.length < 2) continue
      const [a, b] = indices
      expect(normal.getX(a)).toBeCloseTo(normal.getX(b), 3)
      expect(normal.getY(a)).toBeCloseTo(normal.getY(b), 3)
      expect(normal.getZ(a)).toBeCloseTo(normal.getZ(b), 3)
      pairs += 1
    }
    expect(pairs).toBeGreaterThan(50)

    disposeCanHolderResult(result)
  })
})
