import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { CakeTopperParams } from './schema'
import { BORDER_RADIUS, LEG_BOTTOM_WIDTH, LEG_DEPTH } from './schema'

export interface BuildCakeTopperInput {
  params: CakeTopperParams
  font: Font | null
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

function buildLeg(params: CakeTopperParams): BufferGeometry {
  const shape = new Shape()
  const topWidth = params.legWidth
  const bottomWidth = LEG_BOTTOM_WIDTH

  shape.moveTo(-bottomWidth / 2, 0)
  shape.lineTo(bottomWidth / 2, 0)
  shape.lineTo(topWidth / 2, LEG_DEPTH)
  shape.lineTo(-topWidth / 2, LEG_DEPTH)
  shape.closePath()

  const geometry = new ExtrudeGeometry(shape, {
    depth: params.legHeight,
    bevelEnabled: false,
  })

  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  geometry.translate(-cx, 0, -bb.max.z)

  return geometry
}

function buildText(params: CakeTopperParams, font: Font | null): BufferGeometry | null {
  if (!font) return null

  const textGeometry = new TextGeometry(params.text, {
    font: font,
    size: params.fontSize,
    depth: 1, // Relevo de 1mm
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  })

  // Centralizar texto
  textGeometry.computeBoundingBox()
  const bb = textGeometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  textGeometry.translate(-cx, -cy, params.thickness) // Posicionar sobre a placa

  return textGeometry
}

function buildIcon(params: CakeTopperParams): BufferGeometry | null {
  if (!params.svgIcon) return null

  const loader = new SVGLoader()
  const svgData = loader.parse(params.svgIcon)

  const shapes: Shape[] = []

  for (const path of svgData.paths) {
    const pathShapes = path.toShapes()
    shapes.push(...pathShapes)
  }

  if (shapes.length === 0) return null

  const geometries: BufferGeometry[] = []
  for (const shape of shapes) {
    const geometry = new ExtrudeGeometry(shape, {
      depth: params.thickness,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 1,
    })
    geometries.push(geometry)
  }

  const iconGeometry = mergeGeometries(geometries)
  if (!iconGeometry) return null

  geometries.forEach(g => g.dispose())

  iconGeometry.computeBoundingBox()
  const bb = iconGeometry.boundingBox!
  const sizeX = bb.max.x - bb.min.x
  const sizeY = bb.max.y - bb.min.y
  const maxSize = Math.max(sizeX, sizeY)
  const scale = (params.fontSize * 2 * params.iconScale) / maxSize

  iconGeometry.scale(scale, scale, 1)

  iconGeometry.computeBoundingBox()
  const bb2 = iconGeometry.boundingBox!
  const cx = (bb2.min.x + bb2.max.x) / 2
  const cy = (bb2.min.y + bb2.max.y) / 2
  iconGeometry.translate(-cx, -cy, 0)

  const textHeight = params.fontSize
  const iconHeight = bb2.max.y - bb2.min.y

  switch (params.iconPosition) {
    case 'above':
      iconGeometry.translate(0, textHeight / 2 + iconHeight / 2 + 2, params.thickness)
      break
    case 'left':
      iconGeometry.translate(-params.width / 2 - iconHeight / 2 - 2, 0, params.thickness)
      break
    case 'right':
      iconGeometry.translate(params.width / 2 + iconHeight / 2 + 2, 0, params.thickness)
      break
  }

  return iconGeometry
}

export function buildCakeTopper({ params, font }: BuildCakeTopperInput): BuildCakeTopperResult {
  const plate = buildPlate(params)
  const leg = buildLeg(params)
  const text = buildText(params, font)
  const icon = buildIcon(params)

  return { plate, text, icon, leg }
}
