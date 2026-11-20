import {
  type PathsBounds,
  pathsBoundingBox,
} from '../../confeitaria/shared/textOutline'
import {
  offsetOutlinePaths,
  pointInPaths,
  type ShapeOutline,
} from './outline'
import {
  MAX_SCREEN_OPENINGS,
  type ThermoformerGeometryParams,
} from './schema'

export interface ScreenCell {
  x: number
  y: number
  radius: number
}

export interface ScreenPatternResult {
  cells: ScreenCell[]
  capped: boolean
  innerRadius: number | null
  innerBounds: PathsBounds
  effectiveOpening: number
  effectiveLine: number
  cellRadius: number
  spacing: number
}

const EPS = 1e-6
const GROWTH_FACTOR = 1.15
const MAX_ATTEMPTS = 24

function computeCirclePattern(
  params: ThermoformerGeometryParams,
  line: number,
): ScreenPatternResult {
  const outerRadius = params.diameter / 2
  const innerRadius = outerRadius - params.frameWidth

  if (innerRadius <= EPS) {
    const radius = Math.max(0, innerRadius)
    return {
      cells: [],
      capped: false,
      innerRadius: radius,
      innerBounds: {
        minX: -radius,
        maxX: radius,
        minY: -radius,
        maxY: radius,
        width: radius * 2,
        height: radius * 2,
      },
      effectiveOpening: params.opening,
      effectiveLine: line,
      cellRadius: params.opening / Math.sqrt(3),
      spacing: params.opening + line,
    }
  }

  let effectiveOpening = params.opening
  let capped = false
  let cells: ScreenCell[] = []
  let cellRadius = 0
  let spacing = 0

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    cellRadius = effectiveOpening / Math.sqrt(3)
    spacing = effectiveOpening + line

    // Treliça flat-top: passo horizontal (√3/2)·spacing e vertical spacing,
    // com colunas ímpares deslocadas meia linha.
    const stepX = (Math.sqrt(3) / 2) * spacing
    const stepY = spacing
    const columnBound = Math.ceil(innerRadius / stepX) + 2
    const rowBound = Math.ceil(innerRadius / stepY) + 2

    const next: ScreenCell[] = []

    for (let column = -columnBound; column <= columnBound; column++) {
      const offset = Math.abs(column) % 2 === 1 ? stepY / 2 : 0
      for (let row = -rowBound; row <= rowBound; row++) {
        const x = column * stepX
        const y = row * stepY + offset
        if (Math.hypot(x, y) + cellRadius > innerRadius + EPS) continue
        next.push({ x, y, radius: cellRadius })
      }
    }

    cells = next

    if (cells.length <= MAX_SCREEN_OPENINGS) break

    capped = true
    // O limite é best-effort apenas se MAX_ATTEMPTS esgotar
    // (inalcançável com as faixas do schema).
    if (attempt < MAX_ATTEMPTS - 1) effectiveOpening *= GROWTH_FACTOR
  }

  return {
    cells,
    capped,
    innerRadius,
    innerBounds: {
      minX: -innerRadius,
      maxX: innerRadius,
      minY: -innerRadius,
      maxY: innerRadius,
      width: innerRadius * 2,
      height: innerRadius * 2,
    },
    effectiveOpening,
    effectiveLine: line,
    cellRadius,
    spacing,
  }
}

function computePolygonPattern(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
  line: number,
): ScreenPatternResult {
  const perforated = outline.perforated ?? []
  const bounds = pathsBoundingBox(perforated)

  if (perforated.length === 0 || bounds.width <= EPS || bounds.height <= EPS) {
    return {
      cells: [],
      capped: false,
      innerRadius: null,
      innerBounds: bounds,
      effectiveOpening: params.opening,
      effectiveLine: line,
      cellRadius: params.opening / Math.sqrt(3),
      spacing: params.opening + line,
    }
  }

  let effectiveOpening = params.opening
  let capped = false
  let cells: ScreenCell[] = []
  let cellRadius = 0
  let spacing = 0

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    cellRadius = effectiveOpening / Math.sqrt(3)
    spacing = effectiveOpening + line

    // Treliça flat-top: passo horizontal (√3/2)·spacing e vertical spacing,
    // com colunas ímpares deslocadas meia linha.
    const stepX = (Math.sqrt(3) / 2) * spacing
    const stepY = spacing
    const columnBound =
      Math.ceil(Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX)) / stepX) +
      2
    const rowBound =
      Math.ceil(Math.max(Math.abs(bounds.minY), Math.abs(bounds.maxY)) / stepY) +
      2
    // O centro de cada favo precisa caber com o circunraio dentro da região
    // perfurada, então testamos contra a borda recuada.
    const centers = offsetOutlinePaths(perforated, -cellRadius, outline.join)

    const next: ScreenCell[] = []

    for (let column = -columnBound; column <= columnBound; column++) {
      const offset = Math.abs(column) % 2 === 1 ? stepY / 2 : 0
      for (let row = -rowBound; row <= rowBound; row++) {
        const x = column * stepX
        const y = row * stepY + offset
        if (!pointInPaths(x, y, centers)) continue
        next.push({ x, y, radius: cellRadius })
      }
    }

    cells = next

    if (cells.length <= MAX_SCREEN_OPENINGS) break

    capped = true
    if (attempt < MAX_ATTEMPTS - 1) effectiveOpening *= GROWTH_FACTOR
  }

  return {
    cells,
    capped,
    innerRadius: null,
    innerBounds: bounds,
    effectiveOpening,
    effectiveLine: line,
    cellRadius,
    spacing,
  }
}

export function computeScreenPattern(
  params: ThermoformerGeometryParams,
  outline?: ShapeOutline | null,
): ScreenPatternResult {
  const line = Math.max(0, params.lineWidth)
  if (outline?.kind === 'polygon') {
    return computePolygonPattern(params, outline, line)
  }
  return computeCirclePattern(params, line)
}
