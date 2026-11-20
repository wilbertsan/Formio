import { describe, it } from 'vitest'
import { IMPORTED_TEXTURE_IDS } from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import { expectImportedBody } from './importedBodyAssertions'

// Parte 3 dos 14 estilos importados; ver buildBodyImported.test.ts.
describe('can holder body com texturas importadas (parte 3)', () => {
  it.each(IMPORTED_TEXTURE_IDS.slice(6, 9))(
    'fecha o corpo importado (%s)',
    expectImportedBody,
  )
})
