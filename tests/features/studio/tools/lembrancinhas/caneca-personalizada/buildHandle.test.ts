import { describe, it, expect } from 'vitest'
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
  Vector3,
  type Path,
} from 'three'
import {
  buildHandle,
  getBandInnerRadius,
  getBandOuterRadius,
  getHandleMetrics,
  getLoopLeftX,
  handleLoopShape,
  handleRingShape,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle'
import {
  HANDLE_FIT_INTERFERENCE,
  HANDLE_LOOP_INSET,
  HANDLE_RING_THICKNESS,
  HANDLE_WRAP,
  defaultMugParams,
  type MugGeometryParams,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { getBodyOuterRadius } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/shapes'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'

function pointsAtY(points: Vector2[], y: number): Vector2[] {
  return points.filter((point) => Math.abs(point.y - y) < 1e-6)
}

/** Largura do furo na altura `y`, medida cruzando as arestas do contorno. */
function holeWidthAt(hole: Path, y: number): number {
  const points = hole.getPoints(64)
  const xs: number[] = []

  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (a.y === b.y || (a.y - y) * (b.y - y) > 0) continue
    const t = (y - a.y) / (b.y - a.y)
    xs.push(a.x + t * (b.x - a.x))
  }

  expect(xs).toHaveLength(2)
  return Math.max(...xs) - Math.min(...xs)
}

const strongTaper: MugGeometryParams = {
  ...defaultMugParams,
  diameterTop: 100,
  diameterBottom: 60,
  height: 80,
  handleHeight: 52,
  handleGap: 40,
  handleBand: 5,
  handleClearance: 0.2,
}

describe('buildHandle', () => {
  it('calcula a folga da abraçadeira no raio da altura', () => {
    const metrics = getHandleMetrics(defaultMugParams)
    const radius = getBodyOuterRadius(defaultMugParams, defaultMugParams.handleHeight)
    const { handleReach, handleClearance, handleBand } = defaultMugParams

    expect(metrics.innerRadius).toBeCloseTo(radius + handleClearance, 5)
    expect(metrics.outerRadius).toBeCloseTo(metrics.innerRadius + HANDLE_RING_THICKNESS, 5)
    expect(metrics.handOpeningWidth).toBeCloseTo(
      handleReach - handleClearance - HANDLE_LOOP_INSET - 2 * handleBand,
      6,
    )
    expect(metrics.handOpeningMinWidth).toBeLessThanOrEqual(metrics.handOpeningWidth)
    expect(metrics.handOpeningWidth).toBeGreaterThan(16)
  })

  it.each([0.2, 0.3, 0.4, 0.5])(
    'a abraçadeira trava no topo com 0,4 mm absolutos (folga %s)',
    (handleClearance) => {
      const params = { ...defaultMugParams, handleClearance }
      const midY = params.handleHeight
      const topY = params.handleHeight + params.handleWidth / 2
      const bottomY = params.handleHeight - params.handleWidth / 2

      expect(getBandInnerRadius(params, midY)).toBeCloseTo(
        getBodyOuterRadius(params, midY) + handleClearance,
        6,
      )
      expect(getBandInnerRadius(params, topY)).toBeCloseTo(
        getBodyOuterRadius(params, topY) - HANDLE_FIT_INTERFERENCE,
        6,
      )
      expect(getBandInnerRadius(params, bottomY)).toBeCloseTo(
        getBodyOuterRadius(params, bottomY) +
          handleClearance +
          HANDLE_FIT_INTERFERENCE,
        6,
      )
      expect(getBandInnerRadius(params, topY)).toBeLessThan(
        getBodyOuterRadius(params, topY),
      )
    },
  )

  it.each([
    { name: 'default', params: defaultMugParams },
    { name: 'conicidade forte', params: strongTaper },
  ])('o laço sobrepõe a espessura da abraçadeira ($name)', ({ params }) => {
    const yBottom = params.handleHeight - params.handleWidth / 2

    for (let step = 0; step <= 8; step++) {
      const y = yBottom + (params.handleWidth * step) / 8
      expect(getLoopLeftX(params, y)).toBeLessThan(
        getBandOuterRadius(params, y) - 0.5,
      )
    }
  })

  it('a abraçadeira cobre 200° centrados no +X', () => {
    const metrics = getHandleMetrics(defaultMugParams)
    const points = handleRingShape(metrics).getPoints(48)
    const angles = points.map((point) => Math.atan2(point.y, point.x))
    const half = HANDLE_WRAP / 2

    expect(half).toBeCloseTo((100 * Math.PI) / 180, 12)
    expect(Math.min(...angles)).toBeCloseTo(-half, 5)
    expect(Math.max(...angles)).toBeCloseTo(half, 5)
    for (const point of points) {
      const radius = Math.hypot(point.x, point.y)
      expect(radius).toBeGreaterThanOrEqual(metrics.innerRadius - 1e-6)
      expect(radius).toBeLessThanOrEqual(metrics.outerRadius + 1e-6)
    }
  })

  it('a alça é uma peça fechada, de uma casca, com volume positivo', () => {
    const geometry = buildHandle(defaultMugParams)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeCloseTo(
      getBodyOuterRadius(defaultMugParams, defaultMugParams.handleHeight) + defaultMugParams.handleReach,
      1,
    )
    expect(isClosed(geometry)).toBe(true)
    expect(countShells(geometry)).toBe(1)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('o laço tem furo de mão com altura, largura e passagem pedidas', () => {
    const params = defaultMugParams
    const metrics = getHandleMetrics(params)
    const loop = handleLoopShape(params)
    expect(loop.holes).toHaveLength(1)

    const hole = loop.holes[0]
    const holePoints = hole.getPoints(16)
    const xs = holePoints.map((point) => point.x)
    const ys = holePoints.map((point) => point.y)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    expect(maxY - minY).toBeCloseTo(params.handleGap, 6)
    expect(minY).toBeCloseTo(params.handleHeight - params.handleGap / 2, 6)
    expect(maxY).toBeCloseTo(params.handleHeight + params.handleGap / 2, 6)
    expect(Math.max(...xs)).toBeCloseTo(metrics.loopMaxX - params.handleBand, 6)
    expect(Math.min(...xs)).toBeCloseTo(getLoopLeftX(params, minY) + params.handleBand, 6)
    expect(holeWidthAt(hole, params.handleHeight)).toBeCloseTo(metrics.handOpeningWidth, 6)

    const geometry = buildHandle(params)
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }))
    const centerX = (metrics.loopMinX + metrics.loopMaxX) / 2
    const raycaster = new Raycaster(
      new Vector3(centerX, params.handleHeight, -60),
      new Vector3(0, 0, 1),
    )
    expect(raycaster.intersectObject(mesh)).toHaveLength(0)
    geometry.dispose()
  })

  it.each([
    { name: 'cone abre para o topo', patch: {} },
    {
      name: 'cone fecha para o topo',
      patch: { diameterTop: 70, diameterBottom: 95 },
    },
  ])(
    'a abertura mínima é o menor extremo do furo trapezoidal ($name)',
    ({ patch }) => {
      const params = { ...defaultMugParams, ...patch }
      const metrics = getHandleMetrics(params)
      const hole = handleLoopShape(params).holes[0]
      const halfGap = params.handleGap / 2
      const bottomWidth = holeWidthAt(hole, params.handleHeight - halfGap)
      const topWidth = holeWidthAt(hole, params.handleHeight + halfGap)

      expect(topWidth).not.toBeCloseTo(bottomWidth, 3)
      expect(metrics.handOpeningWidth).toBeCloseTo(
        holeWidthAt(hole, params.handleHeight),
        6,
      )
      expect(metrics.handOpeningMinWidth).toBeCloseTo(
        Math.min(topWidth, bottomWidth),
        6,
      )
    },
  )

  it('fecha e afasta o laço do corpo na conicidade forte', () => {
    const params = strongTaper
    const geometry = buildHandle(params)

    expect(isClosed(geometry)).toBe(true)
    expect(countShells(geometry)).toBe(1)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()

    const halfSpan = params.handleGap / 2 + params.handleBand
    const loopPoints = handleLoopShape(params).getPoints(64)
    for (const y of [params.handleHeight - halfSpan, params.handleHeight + halfSpan]) {
      const matches = pointsAtY(loopPoints, y)
      expect(matches.length).toBeGreaterThan(0)
      const leftEdge = Math.min(...matches.map((point) => point.x))
      expect(leftEdge).toBeCloseTo(getLoopLeftX(params, y), 6)
      expect(leftEdge).toBeGreaterThanOrEqual(
        getBodyOuterRadius(params, y) + params.handleClearance + HANDLE_LOOP_INSET - 1e-6,
      )
    }
  })
})
