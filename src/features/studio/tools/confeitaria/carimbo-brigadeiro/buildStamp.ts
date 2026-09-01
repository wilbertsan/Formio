import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { StampParams } from './schema'
import { HANDLE_HEIGHT_RATIO } from './schema'

export interface BuildStampInput {
  params: StampParams
  font: Font | null
}

export interface BuildStampResult {
  base: BufferGeometry
  handle: BufferGeometry
  text: BufferGeometry | null
  icon: BufferGeometry | null
}

function createCircleShape(radius: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

function buildBase(params: StampParams): BufferGeometry {
  const radius = params.diameter / 2
  const shape = createCircleShape(radius)
  const baseHeight = params.height * (1 - HANDLE_HEIGHT_RATIO)

  const geometry = new ExtrudeGeometry(shape, {
    depth: baseHeight,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  })

  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  geometry.translate(-cx, -cy, 0)

  return geometry
}

function buildHandle(params: StampParams): BufferGeometry {
  const handleRadius = params.diameter * 0.3
  const shape = createCircleShape(handleRadius)
  const handleHeight = params.height * HANDLE_HEIGHT_RATIO
  const baseHeight = params.height * (1 - HANDLE_HEIGHT_RATIO)

  const geometry = new ExtrudeGeometry(shape, {
    depth: handleHeight,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  })

  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  geometry.translate(-cx, -cy, baseHeight)

  return geometry
}

export function buildStamp({ params, font }: BuildStampInput): BuildStampResult {
  const base = buildBase(params)
  const handle = buildHandle(params)

  return { base, handle, text: null, icon: null }
}
