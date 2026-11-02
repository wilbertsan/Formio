import type { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { normalizeName } from './schema'

interface NameToGeometryInput {
  font: Font
  name: string
  size: number
  depth: number
}

export function nameToGeometry({ font, name, size, depth }: NameToGeometryInput): BufferGeometry {
  const geometry = new TextGeometry(normalizeName(name), {
    font,
    size,
    depth,
    curveSegments: 8,
    bevelEnabled: false,
  })
  geometry.center()
  return geometry
}
