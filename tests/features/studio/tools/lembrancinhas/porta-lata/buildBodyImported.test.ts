import { describe, it, expect } from 'vitest'
import { buildBody } from '@/features/studio/tools/lembrancinhas/porta-lata/buildBody'
import { IMPORTED_TEXTURE_IDS } from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import { defaultCanHolderParams } from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { expectImportedBody } from './importedBodyAssertions'

// Cada caso importado leva ~9,5 s (build + asserções de manifold), então os 14
// estilos são divididos em cinco arquivos para ficar bem abaixo do watchdog de
// 60 s do Vitest. As fatias cobrem a lista inteira, sem estilo repetido ou
// omitido. O timeout explícito protege os casos sob carga.
describe('can holder body com texturas importadas', () => {
  it.each(IMPORTED_TEXTURE_IDS.slice(0, 3))(
    'fecha o corpo importado (%s)',
    { timeout: 60_000 },
    expectImportedBody,
  )
})

// Uma amostra basta: a emenda do lathe é a mesma para os 14 mapas, que são
// periódicos em u. Roda só com `azulejos` para não somar 14 checagens caras.
describe('emenda da textura importada', () => {
  it('mantém posições e normais contínuas em 512 segmentos', { timeout: 60_000 }, () => {
    const params = { ...defaultCanHolderParams, textureStyle: 'azulejos' as const }
    const geometry = buildBody(params)
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    const rows = new Map<
      string,
      { radius: number; normal: [number, number, number] }[]
    >()

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const z = position.getZ(i)
      // O LatheGeometry fecha a emenda em φ = 0 e φ = 2π, isto é, x ≈ 0 e
      // z > 0 (não no eixo X como a textura usa em θ = 0).
      if (Math.abs(x) > 1e-4 || z <= 0) continue
      const key = position.getY(i).toFixed(3)
      const entry = rows.get(key) ?? []
      entry.push({
        radius: Math.hypot(x, z),
        normal: [normal.getX(i), normal.getY(i), normal.getZ(i)],
      })
      rows.set(key, entry)
    }

    let pairs = 0
    for (const entry of rows.values()) {
      if (entry.length < 2) continue
      // Em alturas repetidas no perfil, os dois maiores raios são o par da
      // emenda, pois todo ponto do perfil aparece nas duas colunas.
      const [a, b] = [...entry].sort((left, right) => right.radius - left.radius)
      pairs += 1
      expect(a.radius).toBeCloseTo(b.radius, 4)
      expect(a.normal[0]).toBeCloseTo(b.normal[0], 4)
      expect(a.normal[1]).toBeCloseTo(b.normal[1], 4)
      expect(a.normal[2]).toBeCloseTo(b.normal[2], 4)
    }
    expect(pairs).toBeGreaterThan(50)
    geometry.dispose()
  })
})
