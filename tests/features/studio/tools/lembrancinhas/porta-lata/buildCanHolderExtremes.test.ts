import { describe, it, expect } from 'vitest'
import {
  buildCanHolder,
  disposeCanHolderResult,
} from '@/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder'
import {
  defaultCanHolderParams,
  type CanHolderGeometryParams,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'
import { realFont } from './canHolderTestUtils'

// Arquivo separado: cada extremo faz um build completo (corpo + texto + alça) e
// a soma dos casos estourava o watchdog de RPC do Vitest sob carga. Esta parte
// cobre os extremos geométricos; texturas e bordas ficam no arquivo irmão.
describe('buildCanHolder nos extremos geométricos', () => {
  it.each<{ name: string; params: Partial<CanHolderGeometryParams> }>([
    { name: 'cavidade rasa', params: { cavityDepth: 80 } },
    { name: 'cavidade profunda', params: { cavityDepth: 116 } },
    { name: 'folga mínima da lata', params: { canClearance: 0.5 } },
    { name: 'folga máxima da lata', params: { canClearance: 1.2 } },
    { name: 'parede mínima', params: { wallThickness: 1.8 } },
    { name: 'parede máxima', params: { wallThickness: 4 } },
  ])('fecha corpo e alça nos extremos ($name)', { timeout: 60_000 }, ({ params }) => {
    const result = buildCanHolder({ ...defaultCanHolderParams, ...params }, realFont())

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
