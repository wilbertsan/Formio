import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { CakeTopperParams } from './schema'
import { BORDER_RADIUS } from './schema'

export interface BuildCakeTopperInput {
  params: CakeTopperParams
  font: any | null
}

export interface BuildCakeTopperResult {
  plate: BufferGeometry
  text: BufferGeometry | null
  icon: BufferGeometry | null
  leg: BufferGeometry | null
}

function createCircleShape(radius: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

function createRectangleShape(width: number, height: number): Shape {
  const shape = new Shape()
  const r = BORDER_RADIUS
  const hw = width / 2
  const hh = height / 2

  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r)
  shape.lineTo(hw, hh - r)
  shape.quadraticCurveTo(hw, hh, hw - r, hh)
  shape.lineTo(-hw + r, hh)
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r)
  shape.lineTo(-hw, -hh + r)
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh)

  return shape
}

function createOvalShape(width: number, height: number): Shape {
  const shape = new Shape()
  const rx = width / 2
  const ry = height / 2

  shape.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0)
  return shape
}

function buildPlate(params: CakeTopperParams): BufferGeometry {
  let shape: Shape

  switch (params.shape) {
    case 'circle':
      shape = createCircleShape(params.width / 2)
      break
    case 'rectangle':
      shape = createRectangleShape(params.width, params.height)
      break
    case 'oval':
      shape = createOvalShape(params.width, params.height)
      break
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 2,
  })

  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  geometry.translate(-cx, -cy, 0)

  return geometry
}

export function buildCakeTopper({ params }: BuildCakeTopperInput): BuildCakeTopperResult {
  const plate = buildPlate(params)

  const text = null
  const icon = null
  const leg = null

  return { plate, text, icon, leg }
}
