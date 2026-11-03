import { Mesh, Scene, type BufferGeometry } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { sanitizeFilename } from './schema'
import type { BuildBookmarkResult } from './buildBookmark'

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
}

/** Deita o texto com a face frontal na mesa; o lábio fica como nervura no topo. */
export function prepareTextForPrint(text: BufferGeometry): BufferGeometry {
  const clone = text.clone()
  clone.rotateY(Math.PI / 2)
  clone.computeBoundingBox()
  clone.translate(0, 0, -(clone.boundingBox?.min.z ?? 0))
  return clone
}

export function exportStlParts(result: BuildBookmarkResult, projectName: string): void {
  const name = sanitizeFilename(projectName)
  downloadStl(result.base, `${name}-base.stl`)
  const textForPrint = prepareTextForPrint(result.text)
  downloadStl(textForPrint, `${name}-texto.stl`)
  textForPrint.dispose()
}
