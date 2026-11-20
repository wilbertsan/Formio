import { describe, it, expect } from 'vitest'
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
  Vector3,
  type BufferGeometry,
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
} from '@/features/studio/tools/lembrancinhas/porta-lata/buildHandle'
import {
  IMPORTED_TEXTURE_IDS,
  IMPORTED_TEXTURES,
} from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import {
  HANDLE_FIT_INTERFERENCE,
  HANDLE_LOOP_INSET,
  HANDLE_RING_THICKNESS,
  HANDLE_WRAP,
  defaultCanHolderParams,
  getLoopOffset,
  getOuterRadius,
  getTextureEnvelope,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
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

/** Raio interno da abraçadeira medido na malha, no plano z≈0 e na altura `y`. */
function innerBandRadiusAt(geometry: BufferGeometry, y: number): number {
  const position = geometry.getAttribute('position')
  let inner = Infinity

  for (let i = 0; i < position.count; i++) {
    if (Math.abs(position.getY(i) - y) > 1e-3) continue
    if (Math.abs(position.getZ(i)) > 1e-3) continue
    if (position.getX(i) > 0) inner = Math.min(inner, position.getX(i))
  }

  return inner
}

const extremes = [
  { name: 'folga mínima da lata', params: { canClearance: 0.5 } },
  { name: 'folga máxima da lata', params: { canClearance: 1.2 } },
  { name: 'parede mínima', params: { wallThickness: 1.8 } },
  { name: 'parede máxima', params: { wallThickness: 4 } },
]

describe('buildHandle', () => {
  it('calcula a folga da abraçadeira no raio constante do corpo', () => {
    const metrics = getHandleMetrics(defaultCanHolderParams)
    const radius = getOuterRadius(defaultCanHolderParams)
    const { handleReach, handleClearance, handleBand } = defaultCanHolderParams

    expect(radius).toBeCloseTo(36.3, 5)
    expect(defaultCanHolderParams.handleHeight).toBe(60)
    expect(metrics.innerRadius).toBeCloseTo(radius + handleClearance, 5)
    expect(metrics.outerRadius).toBeCloseTo(metrics.innerRadius + HANDLE_RING_THICKNESS, 5)
    expect(metrics.handOpeningWidth).toBeCloseTo(
      handleReach - handleClearance - HANDLE_LOOP_INSET - 2 * handleBand,
      6,
    )
    expect(metrics.handOpeningMinWidth).toBeCloseTo(metrics.handOpeningWidth, 6)
    expect(metrics.handOpeningWidth).toBeGreaterThan(16)
  })

  it.each([0.2, 0.3, 0.4, 0.5])(
    'a abraçadeira trava no topo com 0,4 mm absolutos (folga %s)',
    (handleClearance) => {
      const params = { ...defaultCanHolderParams, handleClearance }
      const outerR = getOuterRadius(params)
      const midY = params.handleHeight
      const topY = params.handleHeight + params.handleWidth / 2
      const bottomY = params.handleHeight - params.handleWidth / 2

      expect(getBandInnerRadius(params, midY)).toBeCloseTo(
        outerR + handleClearance,
        6,
      )
      expect(getBandInnerRadius(params, topY)).toBeCloseTo(
        outerR - HANDLE_FIT_INTERFERENCE,
        6,
      )
      expect(getBandInnerRadius(params, bottomY)).toBeCloseTo(
        outerR + handleClearance + HANDLE_FIT_INTERFERENCE,
        6,
      )
      expect(getBandInnerRadius(params, topY)).toBeLessThan(outerR)
    },
  )

  it.each([
    { name: 'default', params: {} },
    ...extremes,
    { name: 'folga da alça mínima', params: { handleClearance: 0.2 } },
  ])('o laço sobrepõe a espessura da abraçadeira ($name)', ({ params: patch }) => {
    const params = { ...defaultCanHolderParams, ...patch }
    const yBottom = params.handleHeight - params.handleWidth / 2

    for (let step = 0; step <= 8; step++) {
      const y = yBottom + (params.handleWidth * step) / 8
      expect(getLoopLeftX(params)).toBeLessThan(
        getBandOuterRadius(params, y) - 0.5,
      )
    }
  })

  it('a abraçadeira cobre 200° centrados no +X', () => {
    const metrics = getHandleMetrics(defaultCanHolderParams)
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
    const geometry = buildHandle(defaultCanHolderParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const halfSpan =
      defaultCanHolderParams.handleGap / 2 + defaultCanHolderParams.handleBand

    expect(box.max.x).toBeCloseTo(
      getOuterRadius(defaultCanHolderParams) + defaultCanHolderParams.handleReach,
      1,
    )
    expect(box.min.y).toBeCloseTo(defaultCanHolderParams.handleHeight - halfSpan, 3)
    expect(box.max.y).toBeCloseTo(defaultCanHolderParams.handleHeight + halfSpan, 3)
    expect(isClosed(geometry)).toBe(true)
    expect(countShells(geometry)).toBe(1)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('fecha a alça nos extremos combinados de parede, folga da lata e folga da alça', () => {
    // Regressão de manifold: com esses três extremos juntos o CSG do anel
    // escalado com o laço deixava arestas usadas 4 vezes e triângulos
    // degenerados. A limpeza em `buildHandle` remove esses triângulos.
    const params = {
      ...defaultCanHolderParams,
      wallThickness: 4,
      canClearance: 1.2,
      handleClearance: 0.5,
    }
    const geometry = buildHandle(params)

    expect(isClosed(geometry)).toBe(true)
    expect(countShells(geometry)).toBe(1)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it.each([
    { name: 'default', params: {} },
    ...extremes,
  ])('a malha realiza a folga nominal no meio da abraçadeira ($name)', ({ params: patch }) => {
    const params = { ...defaultCanHolderParams, ...patch }
    const geometry = buildHandle(params)
    const midY = params.handleHeight
    const bodyRadius = getOuterRadius(params)
    const measured = innerBandRadiusAt(geometry, midY)

    expect(Number.isFinite(measured)).toBe(true)
    expect(measured - bodyRadius).toBeCloseTo(params.handleClearance, 3)
    geometry.dispose()
  })

  it('o laço tem furo de mão com altura, largura e passagem pedidas', () => {
    const params = defaultCanHolderParams
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
    expect(Math.min(...xs)).toBeCloseTo(getLoopLeftX(params) + params.handleBand, 6)
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

  it('a borda vertical mantém a abertura da mão igual em toda a altura', () => {
    const params = defaultCanHolderParams
    const metrics = getHandleMetrics(params)
    const hole = handleLoopShape(params).holes[0]
    const halfGap = params.handleGap / 2
    const bottomWidth = holeWidthAt(hole, params.handleHeight - halfGap)
    const topWidth = holeWidthAt(hole, params.handleHeight + halfGap)

    expect(topWidth).toBeCloseTo(bottomWidth, 6)
    expect(metrics.handOpeningWidth).toBeCloseTo(
      holeWidthAt(hole, params.handleHeight),
      6,
    )
    expect(metrics.handOpeningMinWidth).toBeCloseTo(metrics.handOpeningWidth, 6)
  })

  it('afasta o laço e engrossa a abraçadeira pelo envelope importado', () => {
    const imported = { ...defaultCanHolderParams, textureStyle: 'paralelepipedos' as const }
    const meta = IMPORTED_TEXTURES.paralelepipedos
    const offset = getLoopOffset(imported)
    expect(offset).toBeCloseTo(
      meta.nativeDepth - (imported.handleClearance + 2 - 0.7),
      5,
    )
    expect(getLoopLeftX(imported)).toBeCloseTo(
      getOuterRadius(imported) + imported.handleClearance + 2 + offset,
      6,
    )
    const metrics = getHandleMetrics(imported)
    expect(metrics.handOpeningWidth).toBeLessThan(
      getHandleMetrics(defaultCanHolderParams).handOpeningWidth,
    )
    expect(metrics.handOpeningWidth).toBeGreaterThan(0)
    const bandOuterTop = getBandOuterRadius(imported, imported.handleHeight + imported.handleWidth / 2)
    expect(bandOuterTop - getLoopLeftX(imported)).toBeGreaterThan(0.5)
  })

  it('não muda a alça com textura procedural', () => {
    const procedural = { ...defaultCanHolderParams, textureStyle: 'wood' as const, textureDepth: 1.5 }
    expect(getLoopOffset(procedural)).toBe(0)
    expect(getLoopLeftX(procedural)).toBeCloseTo(getLoopLeftX(defaultCanHolderParams), 6)
    expect(getHandleMetrics(procedural).outerRadius).toBeCloseTo(
      getHandleMetrics(defaultCanHolderParams).outerRadius,
      6,
    )
  })

  it('não muda a alça com textura importada rasa', () => {
    const shallow = { ...defaultCanHolderParams, textureStyle: 'tijolos_limpos' as const }
    expect(getLoopOffset(shallow)).toBe(0)
    expect(getLoopLeftX(shallow)).toBeCloseTo(getLoopLeftX(defaultCanHolderParams), 6)
    expect(getHandleMetrics(shallow).outerRadius).toBeCloseTo(
      getHandleMetrics(defaultCanHolderParams).outerRadius,
      6,
    )

    const shallowHandle = buildHandle(shallow)
    const plainHandle = buildHandle(defaultCanHolderParams)
    shallowHandle.computeBoundingBox()
    const shallowBox = shallowHandle.boundingBox!
    plainHandle.computeBoundingBox()
    const plainBox = plainHandle.boundingBox!

    for (const axis of ['x', 'y', 'z'] as const) {
      expect(Math.abs(shallowBox.min[axis] - plainBox.min[axis])).toBeLessThanOrEqual(1e-4)
      expect(Math.abs(shallowBox.max[axis] - plainBox.max[axis])).toBeLessThanOrEqual(1e-4)
    }
    shallowHandle.dispose()
    plainHandle.dispose()
  })

  it.each(IMPORTED_TEXTURE_IDS)(
    'mantém 0,7 mm de folga do envelope (%s)',
    (style) => {
      const params = { ...defaultCanHolderParams, textureStyle: style }
      expect(getLoopOffset(params)).toBeGreaterThanOrEqual(0)
      expect(
        getLoopLeftX(params) - (getOuterRadius(params) + getTextureEnvelope(params)),
      ).toBeGreaterThanOrEqual(0.7 - 1e-9)
    },
  )

  it('gera a alça fechada com textura importada profunda', () => {
    const params = { ...defaultCanHolderParams, textureStyle: 'pedra_hexagonal' as const }
    const handle = buildHandle(params)
    expect(isClosed(handle)).toBe(true)
    expect(countShells(handle)).toBe(1)
    expect(signedVolume(handle)).toBeGreaterThan(0)
    handle.dispose()
  })

  it.each(extremes)(
    'fecha a alça e afasta o laço do corpo ($name)',
    ({ params: patch }) => {
      const params = { ...defaultCanHolderParams, ...patch }
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
        expect(leftEdge).toBeCloseTo(getLoopLeftX(params), 6)
        expect(leftEdge).toBeGreaterThanOrEqual(
          getOuterRadius(params) + params.handleClearance + HANDLE_LOOP_INSET - 1e-6,
        )
      }
    },
  )
})
