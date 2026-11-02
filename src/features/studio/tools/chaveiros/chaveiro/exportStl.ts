import { BufferAttribute, BufferGeometry, Mesh, Scene } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { sanitizeFilename } from './schema'
import type { BuildKeychainResult } from './buildKeychain'

function normalizeForMerge(geometry: BufferGeometry): BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  const out = new BufferGeometry()
  out.setAttribute('position', (source.getAttribute('position') as BufferAttribute).clone())
  if (source.getAttribute('normal')) {
    out.setAttribute('normal', (source.getAttribute('normal') as BufferAttribute).clone())
  } else {
    source.computeVertexNormals()
    out.setAttribute('normal', (source.getAttribute('normal') as BufferAttribute).clone())
  }
  if (source !== geometry) source.dispose()
  return out
}

export function exportStl(geometry: BuildKeychainResult, projectName: string): void {
  const geometries = geometry.content
    ? [geometry.base, geometry.content]
    : [geometry.base]
  const normalized = geometries.map(normalizeForMerge)
  const merged = mergeGeometries(normalized) ?? normalized[0]
  normalized.forEach((g) => {
    if (g !== merged) g.dispose()
  })
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
