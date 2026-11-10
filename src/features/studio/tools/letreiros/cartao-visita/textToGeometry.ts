import type { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { normalizeName } from './schema'

interface TextToGeometryInput {
  font: Font
  text: string
  size: number
  depth: number
}

export function textToGeometry({ font, text, size, depth }: TextToGeometryInput): BufferGeometry {
  const geometry = new TextGeometry(normalizeName(text).trim(), {
    font,
    size,
    depth,
    curveSegments: 8,
    bevelEnabled: false,
  })
  geometry.center()
  return geometry
}
