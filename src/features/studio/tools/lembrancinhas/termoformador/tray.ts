import { ShapeUtils, Vector2 } from 'three'
import ClipperLib from 'js-clipper'
import {
  pathsBoundingBox,
  type ClipperPoint,
} from '../../confeitaria/shared/textOutline'
import {
  MINIMUM_DRAFT_ANGLE_DEG,
  MINIMUM_GRIP_RADIUS_MM,
  MINIMUM_PYRAMID_TIP_MM,
  MINIMUM_TRAY_BOTTOM_SCALE,
  PLUG_GRIP_MAX_MM,
  PLUG_GRIP_MIN_MATERIAL_MM,
  type ThermoformerGeometryParams,
} from './schema'
import {
  offsetOutlinePaths,
  pointInPaths,
  type OutlineJoin,
  type ShapeOutline,
} from './outline'

export interface TrayDimensions {
  outerBounds: ReturnType<typeof pathsBoundingBox>
  screenBounds: ReturnType<typeof pathsBoundingBox>
  height: number
  seatY: number
  contactY: number
  bodyTop: number
  effectiveDepth: number
  requestedDepth: number
  bottomScale: number
  bottomMin: number
  effectiveStep: number
  stepClamped: boolean
  depthLimited: boolean
  draftLow: boolean
  tipSmall: boolean
  cavityWall: number
  guideWidth: number
  guideHeight: number
  gripRadius: number
  gripDepth: number
  gripX: number
  gripY: number
  gripEnabled: boolean
  plugHeight: number
  plugTotalHeight: number
}

/**
 * Centro da pega que mantém o disco do raio inteiro dentro do material. O
 * centro do envelope não serve para contornos côncavos (C, L), onde ele cai
 * no vão.
 *
 * O centro do envelope é o caminho rápido. Quando ele cai fora (ou a faixa
 * encolhida é fina demais para uma grade), o baricentro do maior triângulo da
 * triangulação garante um ponto interior. Desabilita quando o encolhimento é
 * vazio ou não sobra triângulo.
 */
function getGripCenter(
  paths: ClipperPoint[][],
  gripRadius: number,
  join: OutlineJoin,
): { x: number; y: number } | null {
  const inset = offsetOutlinePaths(paths, -gripRadius, join)
  if (inset.length === 0) return null
  let largest = inset[0]
  for (const path of inset) {
    if (
      Math.abs(ClipperLib.Clipper.Area(path)) >
      Math.abs(ClipperLib.Clipper.Area(largest))
    ) {
      largest = path
    }
  }

  const bounds = pathsBoundingBox([largest])
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  if (pointInPaths(center.x, center.y, [largest])) return center

  // ShapeUtils.triangulateShape espera mm; o Clipper guarda milésimos.
  const contour = largest.map((point) => new Vector2(
    point.X / 1000,
    point.Y / 1000,
  ))
  let best: { x: number; y: number; area: number } | null = null
  for (const [a, b, c] of ShapeUtils.triangulateShape(contour, [])) {
    const pa = contour[a]
    const pb = contour[b]
    const pc = contour[c]
    const area = Math.abs(
      (pb.x - pa.x) * (pc.y - pa.y) - (pc.x - pa.x) * (pb.y - pa.y),
    ) / 2
    if (!best || area > best.area) {
      best = {
        x: (pa.x + pb.x + pc.x) / 3,
        y: (pa.y + pb.y + pc.y) / 3,
        area,
      }
    }
  }
  if (!best || best.area <= 0) return null
  return { x: best.x, y: best.y }
}

export function getTrayDimensions(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): TrayDimensions {
  if (outline.kind !== 'polygon') {
    throw new Error('getTrayDimensions só aceita contornos poligonais')
  }

  const screenBounds = outline.bounds
  const cavityBounds = pathsBoundingBox(outline.cavityOpening ?? [])
  const minScreen = Math.max(
    1e-6,
    Math.min(screenBounds.width, screenBounds.height),
  )
  const minOpening = Math.max(
    1e-6,
    Math.min(cavityBounds.width, cavityBounds.height),
  )
  // O degrau efetivo já considera a moldura; a bandeja não o recalcula.
  const effectiveStep = outline.effectiveStep
  const stepClamped = effectiveStep > params.stepWidth + 1e-9
  const requestedDepth = Math.max(0.1, params.bowlDepth)
  let effectiveDepth = requestedDepth
  let bottomScale = 1
  let depthLimited = false

  if (params.shape === 'pyramid') {
    bottomScale = params.pyramidTip
  } else {
    const tan = Math.tan((params.draftAngle * Math.PI) / 180)
    if (tan <= 1e-9) {
      bottomScale = 1
    } else {
      bottomScale = 1 - (2 * effectiveDepth * tan) / minOpening
      if (bottomScale < MINIMUM_TRAY_BOTTOM_SCALE) {
        effectiveDepth =
          ((1 - MINIMUM_TRAY_BOTTOM_SCALE) * minOpening) / (2 * tan)
        bottomScale = MINIMUM_TRAY_BOTTOM_SCALE
        depthLimited = true
      }
    }
  }

  const seatY = effectiveDepth + params.bottomThickness
  const height = params.thickness + effectiveDepth + params.bottomThickness
  const contactY = seatY + params.thickness
  const bodyTop = contactY + params.plugHeight
  const bottomMin = bottomScale * minOpening
  const draftLow =
    params.shape !== 'pyramid' &&
    params.draftAngle < MINIMUM_DRAFT_ANGLE_DEG
  const tipSmall =
    params.shape === 'pyramid' && bottomMin < MINIMUM_PYRAMID_TIP_MM
  const requestedGripRadius = Math.min(
    params.plugHeight * 0.9,
    minScreen * 0.35,
    PLUG_GRIP_MAX_MM,
  )
  const gripCenter = getGripCenter(
    outline.paths ?? [],
    requestedGripRadius,
    outline.join,
  )
  // Sobre a cavidade a protrusão continua abaixo de contactY; fora dela a
  // face de contato é o fundo e o cone não pode atravessá-la.
  const overCavity = gripCenter !== null && pointInPaths(
    gripCenter.x,
    gripCenter.y,
    offsetOutlinePaths(
      outline.cavityOpening ?? [],
      -requestedGripRadius,
      outline.join,
    ),
  )
  const gripFloorY = overCavity
    ? params.bottomThickness + params.thickness
    : contactY
  const gripAllowance =
    bodyTop - gripFloorY - PLUG_GRIP_MIN_MATERIAL_MM
  const clampedGripDepth = Math.min(
    requestedGripRadius * 1.2,
    gripAllowance,
  )
  // Mantém a parede de 40–45° ao reduzir a profundidade.
  const clampedGripRadius = Math.min(
    requestedGripRadius,
    clampedGripDepth / 1.2,
  )
  const gripEnabled =
    gripCenter !== null &&
    gripAllowance > 0 &&
    clampedGripRadius >= MINIMUM_GRIP_RADIUS_MM
  const gripRadius = gripEnabled ? clampedGripRadius : 0
  const gripDepth = gripEnabled ? clampedGripDepth : 0

  return {
    outerBounds: pathsBoundingBox(outline.supportOuter ?? []),
    screenBounds,
    height,
    seatY,
    contactY,
    bodyTop,
    effectiveDepth,
    requestedDepth,
    bottomScale,
    bottomMin,
    effectiveStep,
    stepClamped,
    depthLimited,
    draftLow,
    tipSmall,
    cavityWall: params.wallThickness + effectiveStep,
    guideWidth: screenBounds.width,
    guideHeight: screenBounds.height,
    gripRadius,
    gripDepth,
    gripX: gripCenter?.x ?? 0,
    gripY: gripCenter?.y ?? 0,
    gripEnabled,
    plugHeight: params.plugHeight,
    plugTotalHeight: effectiveDepth + params.plugHeight,
  }
}
