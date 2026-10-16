import { Mesh, Scene } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { BuildCakeTopperResult } from './buildCakeTopper'
import { sanitizeFilename } from './schema'

export function exportCakeTopperStl(result: BuildCakeTopperResult, projectName: string): void {
  const parts = [result.plate, result.relief, result.support].filter(
    (part) => part !== null,
  )
  const merged = mergeGeometries(parts) ?? result.plate
  const scene = new Scene()
  scene.add(new Mesh(merged))
  const exporter = new STLExporter()
  const parsed = exporter.parse(scene, { binary: true })
  const blob = new Blob([parsed as unknown as BlobPart], { type: 'model/stl' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFilename(projectName)}.stl`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
