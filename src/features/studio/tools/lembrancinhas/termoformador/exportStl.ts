import { Mesh, Scene, type BufferGeometry } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
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
 * Serializa a geometria como STL binário e dispara o download.
 *
 * Consome a geometria recebida: ela é descartada antes do retorno, então o
 * chamador deve passar um clone descartável.
 */
function downloadStl(geometry: BufferGeometry, filename: string): void {
  try {
    const scene = new Scene()
    scene.add(new Mesh(geometry))
    const exporter = new STLExporter()
    const result = exporter.parse(scene, { binary: true })
    const blob = new Blob([result as unknown as BlobPart], { type: 'model/stl' })
    const url = URL.createObjectURL(blob)

    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    } finally {
      URL.revokeObjectURL(url)
    }
  } finally {
    geometry.dispose()
  }
}

export function prepareScreenForPrint(
  geometry: BufferGeometry,
): BufferGeometry {
  return centerOnBed(geometry.clone())
}

export function exportThermoformerStl(
  geometry: BufferGeometry,
  projectName: string,
): void {
  const name = sanitizeFilename(projectName)
  downloadStl(prepareScreenForPrint(geometry), `${name}-tela.stl`)
}
