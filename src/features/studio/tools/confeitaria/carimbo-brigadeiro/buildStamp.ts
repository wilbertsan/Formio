import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildSvgIconGeometry } from '../shared/svgToIconShape'
import type { StampParams } from './schema'
import { CONTENT_MARGIN_MM, HANDLE_HEIGHT_RATIO, RELIEF_DEPTH } from './schema'

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

function buildText(params: StampParams, font: Font | null): BufferGeometry | null {
  if (!font) return null

  const textGeometry = new TextGeometry(params.text, {
    font: font,
    size: params.fontSize,
    depth: RELIEF_DEPTH,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  })

  // Encolher o texto (apenas X/Y) para caber dentro do círculo do carimbo,
  // garantindo que os cantos da bounding box fiquem dentro do raio útil.
  // Nunca aumenta: textos curtos mantêm o fontSize desejado.
  textGeometry.computeBoundingBox()
  const bb = textGeometry.boundingBox!
  const halfWidth = (bb.max.x - bb.min.x) / 2
  const halfHeight = (bb.max.y - bb.min.y) / 2
  const cornerRadius = Math.hypot(halfWidth, halfHeight)
  const maxRadius = params.diameter / 2 - CONTENT_MARGIN_MM

  if (cornerRadius > maxRadius) {
    const scale = maxRadius / cornerRadius
    textGeometry.scale(scale, scale, 1) // não escala Z: mantém o relevo
  }

  textGeometry.computeBoundingBox()
  const fitted = textGeometry.boundingBox!
  const cx = (fitted.min.x + fitted.max.x) / 2
  const cy = (fitted.min.y + fitted.max.y) / 2

  const zOffset = params.reliefType === 'negative' ? -RELIEF_DEPTH : 0
  textGeometry.translate(-cx, -cy, zOffset)

  return textGeometry
}

function buildIcon(params: StampParams): BufferGeometry | null {
  if (!params.svgIcon) return null

  const iconGeometry = buildSvgIconGeometry({
    svg: params.svgIcon,
    maxRadius: params.diameter / 2 - CONTENT_MARGIN_MM,
    lineWidth: params.iconLineWidth,
    iconScale: params.iconScale,
    depth: RELIEF_DEPTH,
  })
  if (!iconGeometry) return null

  // Relevo negativo afunda o ícone para dentro da base.
  const zOffset = params.reliefType === 'negative' ? -RELIEF_DEPTH : 0
  iconGeometry.translate(0, 0, zOffset)

  return iconGeometry
}

export function buildStamp({ params, font }: BuildStampInput): BuildStampResult {
  const base = buildBase(params)
  const handle = buildHandle(params)
  const text = params.contentType === 'text' ? buildText(params, font) : null
  const icon = params.contentType === 'svg' ? buildIcon(params) : null

  return { base, handle, text, icon }
}
