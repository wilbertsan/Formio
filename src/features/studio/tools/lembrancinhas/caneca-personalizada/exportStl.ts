import { Mesh, Scene, type BufferGeometry } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { BuildMugResult } from './buildMug'
import { sanitizeFilename } from './schema'

function centerOnBed(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  geometry.translate(
    -(box.min.x + box.max.x) / 2,
    -box.min.y,
    -(box.min.z + box.max.z) / 2,
  )
  return geometry
}

/**
 * Serializes a geometry as a binary STL and triggers the browser download.
 *
 * Consumes the supplied geometry: it is disposed before returning, so callers
 * must pass a throwaway geometry (for example a print-preparation clone) and
 * must not reuse the reference afterwards.
 */
function downloadStl(geometry: BufferGeometry, filename: string): void {
  const scene = new Scene()
  scene.add(new Mesh(geometry))
  const exporter = new STLExporter()
  const result = exporter.parse(scene, { binary: true })
  const blob = new Blob([result as unknown as BlobPart], { type: 'model/stl' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  geometry.dispose()
}

export function prepareBodyForPrint(geometry: BufferGeometry): BufferGeometry {
  return centerOnBed(geometry.clone())
}

export function prepareHandleForPrint(geometry: BufferGeometry): BufferGeometry {
  // A alça imprime em pé, apoiada na borda inferior do laço; a abraçadeira
  // recebe suporte sob o arco. Não rotacione: preserve a orientação do build.
  return centerOnBed(geometry.clone())
}

export function exportMugStl(result: BuildMugResult, projectName: string): void {
  const name = sanitizeFilename(projectName)

  downloadStl(prepareBodyForPrint(result.body), `${name}-corpo.stl`)
  if (result.handle) {
    downloadStl(prepareHandleForPrint(result.handle), `${name}-alca.stl`)
  }
}
