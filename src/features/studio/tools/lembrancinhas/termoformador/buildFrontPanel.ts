import { ExtrudeGeometry, Path, type BufferGeometry } from 'three'
import { roundedRectShape } from './shapes'
import { computePanelPattern, type PanelHole } from './panelPattern'
import {
  MINIMUM_WALL_MM,
  PANEL_CURVATURE_MM,
  type ThermoformerGeometryParams,
} from './schema'

function applyFrontCurvature(
  geometry: BufferGeometry,
  params: ThermoformerGeometryParams,
): void {
  if (params.surfaceCurvature === 'flat') return

  const amplitude = params.surfaceCurvature === 'slightly_convex'
    ? PANEL_CURVATURE_MM
    : Math.min(PANEL_CURVATURE_MM, Math.max(0, params.frontPanelThickness - MINIMUM_WALL_MM))
  if (amplitude <= 0) return

  const position = geometry.getAttribute('position')
  const halfWidth = params.frontPanelWidth / 2
  const direction = params.surfaceCurvature === 'slightly_convex' ? 1 : -1

  for (let i = 0; i < position.count; i++) {
    if (position.getZ(i) < params.frontPanelThickness - 1e-4) continue
    const x = position.getX(i)
    // Perfil de 0,5 na borda a 1 no centro: a face inteira curva e a placa
    // côncava não mantém a borda no plano frontal original.
    const falloff = Math.max(0, 1 - (x / halfWidth) ** 2)
    const profile = (1 + falloff) / 2
    position.setZ(i, position.getZ(i) + direction * amplitude * profile)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}

function addHole(shape: ReturnType<typeof roundedRectShape>, hole: PanelHole): void {
  const path = new Path()

  if (hole.kind === 'circle') {
    path.absarc(hole.x, hole.y, hole.size / 2, 0, Math.PI * 2, false)
  } else {
    const half = hole.size / 2
    const cos = Math.cos(hole.angle)
    const sin = Math.sin(hole.angle)
    const corners = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ] as const

    corners.forEach(([x, y], index) => {
      const px = hole.x + x * cos - y * sin
      const py = hole.y + x * sin + y * cos
      if (index === 0) path.moveTo(px, py)
      else path.lineTo(px, py)
    })

    const [firstX, firstY] = corners[0]
    path.lineTo(
      hole.x + firstX * cos - firstY * sin,
      hole.y + firstX * sin + firstY * cos,
    )
  }

  shape.holes.push(path)
}

export function buildFrontPanel(params: ThermoformerGeometryParams): BufferGeometry {
  const shape = roundedRectShape(
    params.frontPanelWidth,
    params.frontPanelHeight,
    params.frontPanelCornerRadius,
  )
  const pattern = computePanelPattern(params)
  for (const hole of pattern.holes) addHole(shape, hole)

  const geometry = new ExtrudeGeometry(shape, {
    depth: params.frontPanelThickness,
    bevelEnabled: false,
    curveSegments: 12,
  })
  applyFrontCurvature(geometry, params)
  return geometry
}
