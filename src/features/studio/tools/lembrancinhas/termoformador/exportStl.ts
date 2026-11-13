import { Mesh, Scene, type BufferGeometry } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { prepareHandleForPrint } from './buildHandle'
import type { BuildThermoformerResult } from './buildThermoformer'
import {
  sanitizeFilename,
  type ThermoformerGeometryParams,
} from './schema'

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

export function prepareLidForPrint(geometry: BufferGeometry): BufferGeometry {
  const clone = geometry.clone()
  // Print the lid flipped: its outer top face rests on the bed and the fit rim
  // points upward, so no support is needed under the overhang.
  clone.rotateX(Math.PI)
  return centerOnBed(clone)
}

export function preparePanelForPrint(geometry: BufferGeometry): BufferGeometry {
  const clone = geometry.clone()
  // Print the panel flat: the back face rests on the bed and the front face
  // (the visible side) ends up at the top, with thickness along Y.
  clone.rotateX(-Math.PI / 2)
  return centerOnBed(clone)
}

export function prepareBaseForPrint(geometry: BufferGeometry): BufferGeometry {
  return centerOnBed(geometry.clone())
}

export function exportThermoformerStl(
  result: BuildThermoformerResult,
  projectName: string,
  params: ThermoformerGeometryParams,
): void {
  const name = sanitizeFilename(projectName)

  downloadStl(prepareBodyForPrint(result.body), `${name}-corpo.stl`)
  if (result.lid) downloadStl(prepareLidForPrint(result.lid), `${name}-tampa.stl`)
  downloadStl(preparePanelForPrint(result.frontPanel), `${name}-painel.stl`)
  if (result.handle) {
    downloadStl(prepareHandleForPrint(result.handle, params), `${name}-pino.stl`)
  }
  if (result.base) downloadStl(prepareBaseForPrint(result.base), `${name}-base.stl`)
}
