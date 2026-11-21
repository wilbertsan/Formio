import { describe, it } from 'vitest'
import { IMPORTED_TEXTURE_IDS } from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import { expectImportedBody } from './importedBodyAssertions'

// Parte 5 dos 14 estilos importados; ver buildBodyImported.test.ts.
describe('can holder body com texturas importadas (parte 5)', () => {
  it.each(IMPORTED_TEXTURE_IDS.slice(12))(
    'fecha o corpo importado (%s)',
    { timeout: 60_000 },
    expectImportedBody,
  )
})
