import { describe, it, expect } from 'vitest'
import { buildBody } from '@/features/studio/tools/lembrancinhas/porta-lata/buildBody'
import {
  IMPORTED_TEXTURE_IDS,
  IMPORTED_TEXTURES,
} from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import {
  defaultCanHolderParams,
  getOuterRadius,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'

// Os 14 builds importados somam ~12 s; ficam em arquivo separado para não
// estourar o watchdog de 60 s do Vitest em máquinas lentas.
describe('can holder body com texturas importadas', () => {
  it.each(IMPORTED_TEXTURE_IDS)('fecha o corpo importado (%s)', (style) => {
    const params = { ...defaultCanHolderParams, textureStyle: style }
    const geometry = buildBody(params)
    const position = geometry.getAttribute('position')
    const outerR = getOuterRadius(params)
    let maxRadius = 0
    for (let i = 0; i < position.count; i++) {
      maxRadius = Math.max(maxRadius, Math.hypot(position.getX(i), position.getZ(i)))
    }
    expect(isClosed(geometry)).toBe(true)
    expect(countShells(geometry)).toBe(1)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    expect(maxRadius).toBeGreaterThan(outerR + IMPORTED_TEXTURES[style].nativeDepth * 0.95)
    expect(maxRadius).toBeLessThanOrEqual(outerR + IMPORTED_TEXTURES[style].nativeDepth + 1e-3)
    geometry.dispose()
  })
})
