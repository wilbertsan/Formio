import { type BufferGeometry, LatheGeometry, Vector2 } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildSvgIconGeometry } from '../shared/svgToIconShape'
import type { StampParams } from './schema'
import { BODY_MIN_WAIST_RADIUS_MM, BODY_TOP_RADIUS_RATIO, BODY_WAIST_POSITION_RATIO, BODY_WAIST_RADIUS_RATIO, CONTENT_MARGIN_MM } from './schema'

export interface BuildStampInput {
  params: StampParams
  font: Font | null
}

export interface BuildStampResult {
  body: BufferGeometry
  text: BufferGeometry | null
  icon: BufferGeometry | null
}

// Segmentos do perfil (por lóbulo) e da revolução (circunferência) do corpo.
const BODY_PROFILE_SEGMENTS = 16
const BODY_RADIAL_SEGMENTS = 64

function buildBody(params: StampParams): BufferGeometry {
  const radius = params.diameter / 2
  const height = params.height
  const waistRadius = Math.max(BODY_MIN_WAIST_RADIUS_MM, params.diameter * BODY_WAIST_RADIUS_RATIO)
  const topRadius = Math.max(waistRadius + 0.5, params.diameter * BODY_TOP_RADIUS_RATIO)
  const waistZ = height * BODY_WAIST_POSITION_RATIO

  // Corpo com cintura central: dois lóbulos hiperbólicos
  // r(u) = waistRadius * sqrt(1 + (u/c)²), unidos na cintura (z = waistZ).
  const cLow = waistZ / Math.sqrt((radius / waistRadius) ** 2 - 1)
  const cUp = (height - waistZ) / Math.sqrt((topRadius / waistRadius) ** 2 - 1)

  const points: Vector2[] = [new Vector2(0, 0)]

  // Lóbulo inferior: face de contato (z=0, radius) → cintura.
  for (let i = 0; i <= BODY_PROFILE_SEGMENTS; i++) {
    const z = (waistZ * i) / BODY_PROFILE_SEGMENTS
    const u = waistZ - z
    const r = waistRadius * Math.sqrt(1 + (u / cLow) ** 2)
    points.push(new Vector2(r, z))
  }

  // Lóbulo superior: cintura → topo (z=height, topRadius).
  for (let i = 1; i <= BODY_PROFILE_SEGMENTS; i++) {
    const z = waistZ + ((height - waistZ) * i) / BODY_PROFILE_SEGMENTS
    const u = z - waistZ
    const r = waistRadius * Math.sqrt(1 + (u / cUp) ** 2)
    points.push(new Vector2(r, z))
  }

  points.push(new Vector2(0, height))

  // LatheGeometry revolve em torno de Y; rotateX alinha o eixo em Z
  // (face de contato em z=0, topo em z=height).
  const indexed = new LatheGeometry(points, BODY_RADIAL_SEGMENTS)
  indexed.rotateX(Math.PI / 2)

  // Não-indexado para ser compatível com texto/ícone (ExtrudeGeometry) no
  // mergeGeometries da exportação STL.
  const geometry = indexed.toNonIndexed()
  indexed.dispose()

  return geometry
}

function buildText(params: StampParams, font: Font | null): BufferGeometry | null {
  if (!font) return null

  const textGeometry = new TextGeometry(params.text, {
    font: font,
    size: params.fontSize,
    depth: params.reliefElevation,
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

  // O relevo sobressai abaixo da face de contato (z = 0).
  textGeometry.translate(-cx, -cy, -params.reliefElevation)

  return textGeometry
}

function buildIcon(params: StampParams): BufferGeometry | null {
  if (!params.svgIcon) return null

  const iconGeometry = buildSvgIconGeometry({
    svg: params.svgIcon,
    maxRadius: params.diameter / 2 - CONTENT_MARGIN_MM,
    lineWidth: params.iconLineWidth,
    iconScale: params.iconScale,
    depth: params.reliefElevation,
  })
  if (!iconGeometry) return null

  // O relevo sobressai abaixo da face de contato (z = 0).
  iconGeometry.translate(0, 0, -params.reliefElevation)

  return iconGeometry
}

export function buildStamp({ params, font }: BuildStampInput): BuildStampResult {
  const body = buildBody(params)
  const text = params.contentType === 'text' ? buildText(params, font) : null
  const icon = params.contentType === 'svg' ? buildIcon(params) : null

  return { body, text, icon }
}
