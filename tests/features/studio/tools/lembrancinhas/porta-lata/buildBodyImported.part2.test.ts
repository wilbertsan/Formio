import { describe, it } from 'vitest'
import { IMPORTED_TEXTURE_IDS } from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import { expectImportedBody } from './importedBodyAssertions'

// Parte 2 dos 14 estilos importados; ver buildBodyImported.test.ts.
describe('can holder body com texturas importadas (parte 2)', () => {
  it.each(IMPORTED_TEXTURE_IDS.slice(3, 6))(
    'fecha o corpo importado (%s)',
    expectImportedBody,
  )
})
