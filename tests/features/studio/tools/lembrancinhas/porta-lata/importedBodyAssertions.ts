import { expect } from 'vitest'
import { buildBody } from '@/features/studio/tools/lembrancinhas/porta-lata/buildBody'
import { IMPORTED_TEXTURES, type ImportedTextureId } from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import {
  defaultCanHolderParams,
  getOuterRadius,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'

/**
 * Corpo importado fechado, single-shell e na resolução de alta definição
 * (512 segmentos × passo de 0,4 mm). As asserções de manifold dominam o custo
 * do caso (~9,5 s), por isso os 14 estilos ficam em cinco arquivos (3/3/3/3/2).
 */
export function expectImportedBody(style: ImportedTextureId): void {
  const params = { ...defaultCanHolderParams, textureStyle: style }
  const geometry = buildBody(params)
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const outerR = getOuterRadius(params)
  let maxRadius = 0
  for (let i = 0; i < position.count; i++) {
    maxRadius = Math.max(maxRadius, Math.hypot(position.getX(i), position.getZ(i)))
  }
  expect(isClosed(geometry)).toBe(true)
  expect(countShells(geometry)).toBe(1)
  expect(position.count).toBeGreaterThan(120_000)
  expect(index).not.toBeNull()
  expect(index!.count / 3).toBeGreaterThan(250_000)
  expect(signedVolume(geometry)).toBeGreaterThan(0)
  expect(maxRadius).toBeGreaterThan(outerR + IMPORTED_TEXTURES[style].nativeDepth * 0.95)
  expect(maxRadius).toBeLessThanOrEqual(outerR + IMPORTED_TEXTURES[style].nativeDepth + 1e-3)
  geometry.dispose()
}
