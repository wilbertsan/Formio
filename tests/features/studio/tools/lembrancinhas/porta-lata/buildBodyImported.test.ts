import { describe, it } from 'vitest'
import { IMPORTED_TEXTURE_IDS } from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import { expectImportedBody } from './importedBodyAssertions'

// Cada caso importado leva ~10 s (build + asserções de manifold), então os 14
// estilos são divididos em cinco arquivos para ficar bem abaixo do watchdog de
// 60 s do Vitest. As fatias cobrem a lista inteira, sem estilo repetido ou
// omitido.
describe('can holder body com texturas importadas', () => {
  it.each(IMPORTED_TEXTURE_IDS.slice(0, 3))(
    'fecha o corpo importado (%s)',
    expectImportedBody,
  )
})
