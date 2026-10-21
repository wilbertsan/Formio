import { Mesh, Scene } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { sanitizeFilename } from './schema'
import type { BuildTextureRollerResult } from './buildTextureRoller'

export function exportTextureRollerStl(geometry: BuildTextureRollerResult, projectName: string): void {
  const scene = new Scene()
  const mesh = new Mesh()
  mesh.geometry = geometry.roller
  scene.add(mesh)
  const result = new STLExporter().parse(scene, { binary: true })
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
