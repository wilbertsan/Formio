import { type BufferGeometry, ExtrudeGeometry, Shape, Path } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { CutterStampParams } from './schema'

export interface BuildCutterStampInput {
  params: CutterStampParams
  font: Font | null
}

export interface BuildCutterStampResult {
  wall: BufferGeometry
  text: BufferGeometry | null
  centralShape: BufferGeometry | null
}

// --- Contornos externos ---

function createCircleShape(radius: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

function createRectangleShape(width: number, height: number): Shape {
  const shape = new Shape()
  const hw = width / 2
  const hh = height / 2
  shape.moveTo(-hw, -hh)
  shape.lineTo(hw, -hh)
  shape.lineTo(hw, hh)
  shape.lineTo(-hw, hh)
  shape.closePath()
  return shape
}

function createStarShape(outerRadius: number, points: number = 5): Shape {
  const innerRadius = outerRadius * 0.4
  const shape = new Shape()

  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  }
  shape.closePath()
  return shape
}

function getOuterShape(params: CutterStampParams): Shape {
  switch (params.outerShape) {
    case 'circle':
      return createCircleShape(params.diameter / 2 + params.wallThickness)
    case 'rectangle':
      return createRectangleShape(
        params.rectWidth + params.wallThickness * 2,
        params.rectHeight + params.wallThickness * 2,
      )
    case 'star':
      return createStarShape(params.diameter / 2 + params.wallThickness)
  }
}

function getInnerShape(params: CutterStampParams): Path {
  const hole = new Path()
  switch (params.outerShape) {
    case 'circle':
      hole.absarc(0, 0, params.diameter / 2, 0, Math.PI * 2, false)
      break
    case 'rectangle': {
      const hw = params.rectWidth / 2
      const hh = params.rectHeight / 2
      hole.moveTo(-hw, -hh)
      hole.lineTo(hw, -hh)
      hole.lineTo(hw, hh)
      hole.lineTo(-hw, hh)
      hole.closePath()
      break
    }
    case 'star': {
      const innerR = params.diameter / 2
      const starInnerR = innerR * 0.4
      const pts = 5
      for (let i = 0; i < pts * 2; i++) {
        const angle = (i * Math.PI) / pts - Math.PI / 2
        const r = i % 2 === 0 ? innerR : starInnerR
        const x = Math.cos(angle) * r
        const y = Math.sin(angle) * r
        if (i === 0) hole.moveTo(x, y)
        else hole.lineTo(x, y)
      }
      hole.closePath()
      break
    }
  }
  return hole
}

// --- Build functions ---

function buildWall(params: CutterStampParams): BufferGeometry {
  const outerShape = getOuterShape(params)
  const innerHole = getInnerShape(params)
  outerShape.holes.push(innerHole)

  const geometry = new ExtrudeGeometry(outerShape, {
    depth: params.wallHeight,
    bevelEnabled: false,
  })

  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  geometry.translate(-cx, -cy, 0)

  return geometry
}

function buildText(params: CutterStampParams, font: Font | null): BufferGeometry | null {
  if (!font || !params.text) return null

  const textGeometry = new TextGeometry(params.text, {
    font,
    size: params.fontSize,
    depth: 1,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  })

  textGeometry.computeBoundingBox()
  const bb = textGeometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  textGeometry.translate(-cx, -cy, params.wallHeight - params.stampHeight)

  return textGeometry
}

function buildCentralShape(params: CutterStampParams): BufferGeometry | null {
  if (!params.centralShape) return null

  let shape: Shape
  const baseRadius = Math.min(
    (params.outerShape === 'rectangle' ? Math.min(params.rectWidth, params.rectHeight) : params.diameter) / 2,
  ) * 0.6 * params.shapeScale

  switch (params.centralShape) {
    case 'circle':
      shape = createCircleShape(baseRadius)
      break
    case 'star':
      return (() => {
        const starShape = createStarShape(baseRadius, 5)
        const geometry = new ExtrudeGeometry(starShape, {
          depth: params.stampHeight,
          bevelEnabled: true,
          bevelThickness: 0.1,
          bevelSize: 0.1,
          bevelSegments: 2,
        })
        geometry.computeBoundingBox()
        const bb = geometry.boundingBox!
        const cx = (bb.min.x + bb.max.x) / 2
        const cy = (bb.min.y + bb.max.y) / 2
        geometry.translate(-cx, -cy, params.wallHeight - params.stampHeight)
        return geometry
      })()
    case 'heart': {
      shape = new Shape()
      const s = baseRadius * 0.06
      shape.moveTo(0, 0)
      shape.bezierCurveTo(0, -3 * s, -5 * s, -3 * s, -5 * s, 0)
      shape.bezierCurveTo(-5 * s, 4 * s, 0, 6 * s, 0, 9 * s)
      shape.bezierCurveTo(0, 6 * s, 5 * s, 4 * s, 5 * s, 0)
      shape.bezierCurveTo(5 * s, -3 * s, 0, -3 * s, 0, 0)
      break
    }
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: params.stampHeight,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  })

  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  geometry.translate(-cx, -cy, params.wallHeight - params.stampHeight)

  return geometry
}

export function buildCutterStamp({ params, font }: BuildCutterStampInput): BuildCutterStampResult {
  const wall = buildWall(params)
  const text = buildText(params, font)
  const centralShape = buildCentralShape(params)

  return { wall, text, centralShape }
}
