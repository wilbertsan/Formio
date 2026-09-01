import { Mesh, Scene } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { sanitizeFilename } from './schema'
import type { BuildStampResult } from './buildStamp'

export function exportStampStl(geometry: BuildStampResult, projectName: string): void {
  const geometries = [geometry.base, geometry.handle]
  if (geometry.text) geometries.push(geometry.text)
  if (geometry.icon) geometries.push(geometry.icon)

  const merged = mergeGeometries(geometries) ?? geometry.base
  const scene = new Scene()
  scene.add(new Mesh(merged))
  const exporter = new STLExporter()
  const result = exporter.parse(scene, { binary: true })
  const blob = new Blob([result as unknown as BlobPart], { type: 'model/stl' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFilename(projectName)}.stl`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
