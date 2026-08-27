import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { CardParams } from './schema'

export interface BuildCardInput {
  params: CardParams
}

export interface BuildCardResult {
  base: BufferGeometry
  text: BufferGeometry | null
  textBlocks: Array<{ id: string; geometry: BufferGeometry }>
}

function createRoundedRectShape(
  width: number,
  height: number,
  radius: number,
): Shape {
  const shape = new Shape()
  const r = Math.min(radius, Math.min(width, height) / 2)
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

export function buildCard({ params }: BuildCardInput): BuildCardResult {
  const shape = createRoundedRectShape(params.width, params.height, params.cornerRadius)

  const base = new ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 1,
  })

  base.computeBoundingBox()
  const bb = base.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  base.translate(-cx, -cy, 0)

  return {
    base,
    text: null,
    textBlocks: [],
  }
}
