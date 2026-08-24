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

interface FitTextHeightInput {
  name: string
  requestedSize: number
  maxWidth: number
  factor: number
}

export function fitTextHeight({ name, requestedSize, maxWidth, factor }: FitTextHeightInput): number {
  const estimatedWidth = normalizeName(name).length * requestedSize * factor
  if (estimatedWidth <= maxWidth) return requestedSize
  return Math.max(0.4, Math.floor((maxWidth / (normalizeName(name).length * factor)) * 10) / 10)
}
