import { describe, it, expect, vi } from 'vitest'
import type { BufferGeometry } from 'three'
import { buildRelief } from '@/features/studio/tools/confeitaria/rolo-textura/buildRelief'
import {
  DENSITY_CELL_MM, defaultTextureRollerParams, type TextureRollerParams,
} from '@/features/studio/tools/confeitaria/rolo-textura/schema'
import type { ParsedSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

vi.setConfig({ testTimeout: 30000 })

interface CellGroup {
  axialCenter: number
  arcCenter: number
  distances: number[]
  arcOffsets: number[]
}

function cellGrid(params: TextureRollerParams): {
  circumference: number
  cellCols: number
  cellRows: number
  cellW: number
  cellH: number
} {
  const circumference = Math.PI * params.diameter
  const cellMm = DENSITY_CELL_MM[params.density]
  const cellCols = Math.max(3, Math.round(circumference / cellMm))
  const cellRows = Math.max(2, Math.round(params.length / cellMm))
  return {
    circumference,
    cellCols,
    cellRows,
    cellW: circumference / cellCols,
    cellH: params.length / cellRows,
  }
}

function wrapDelta(value: number, period: number): number {
  const wrapped = ((value % period) + period) % period
  return wrapped > period / 2 ? wrapped - period : wrapped
}

// Desfaz a curvatura do cilindro e agrupa os vértices de topo pela célula
// mais próxima, devolvendo a distância radial dentro do plano desenrolado.
function topGroups(
  geometry: BufferGeometry,
  params: TextureRollerParams,
  staggered: boolean,
  minRadius: number,
): CellGroup[] {
  const { circumference, cellCols, cellRows, cellW, cellH } = cellGrid(params)
  const halfLength = params.length / 2
  const radius = params.diameter / 2
  const position = geometry.getAttribute('position')
  const groups = new Map<string, CellGroup>()

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    if (Math.hypot(y, z) < minRadius) continue

    const arc = ((Math.atan2(z, y) * radius) % circumference + circumference) % circumference

    let bestRow = -1
    let bestCol = -1
    let bestDistance = Infinity
    for (let row = 0; row < cellRows; row++) {
      const axialCenter = -halfLength + (row + 0.5) * cellH
      const arcOffset = staggered && row % 2 === 1 ? cellW / 2 : 0
      for (let col = 0; col < cellCols; col++) {
        const arcCenter = (col + 0.5) * cellW + arcOffset
        const distance = Math.hypot(x - axialCenter, wrapDelta(arc - arcCenter, circumference))
        if (distance < bestDistance) {
          bestDistance = distance
          bestRow = row
          bestCol = col
        }
      }
    }

    const axialCenter = -halfLength + (bestRow + 0.5) * cellH
    const arcOffset = staggered && bestRow % 2 === 1 ? cellW / 2 : 0
    const arcCenter = (bestCol + 0.5) * cellW + arcOffset
    const key = `${bestRow}:${bestCol}`
    const group = groups.get(key) ?? { axialCenter, arcCenter, distances: [], arcOffsets: [] }
    group.distances.push(bestDistance)
    group.arcOffsets.push(wrapDelta(arc - arcCenter, circumference))
    groups.set(key, group)
  }

  return [...groups.values()]
}

function isInteriorRow(group: CellGroup, params: TextureRollerParams): boolean {
  return Math.abs(group.axialCenter) <= params.length / 2 - cellGrid(params).cellH
}

const dotsParams: TextureRollerParams = {
  ...defaultTextureRollerParams,
  patternMotif: 'dots',
}

describe('buildRelief', () => {
  it('gera relevo saliente indexado com topo em R + profundidade', () => {
    const geometry = buildRelief(dotsParams)
    expect(geometry).not.toBeNull()
    const relief = geometry!
    expect(relief.getIndex()).not.toBeNull()

    const radius = dotsParams.diameter / 2
    const position = relief.getAttribute('position')
    let maxRadius = 0
    let topVertices = 0
    for (let i = 0; i < position.count; i++) {
      const r = Math.hypot(position.getY(i), position.getZ(i))
      maxRadius = Math.max(maxRadius, r)
      if (r > radius + 0.9 * dotsParams.reliefDepth) topVertices++
    }

    expect(topVertices).toBeGreaterThan(0)
    expect(Math.abs(maxRadius - (radius + dotsParams.reliefDepth))).toBeLessThanOrEqual(0.15)
  })

  it('mantém o contorno vetorial suave nos topos (não quantizado em grade)', () => {
    const geometry = buildRelief(dotsParams)
    expect(geometry).not.toBeNull()

    const radius = dotsParams.diameter / 2
    const groups = topGroups(geometry!, dotsParams, true, radius + 0.95 * dotsParams.reliefDepth)
      .filter((group) => isInteriorRow(group, dotsParams) && group.distances.length >= 8)

    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      const span = Math.max(...group.distances) - Math.min(...group.distances)
      expect(span).toBeLessThan(0.1)
    }
  })

  it('preserva a largura do traço SVG sem inflar para a espessura mínima', () => {
    const params: TextureRollerParams = {
      ...defaultTextureRollerParams,
      patternSource: 'svg',
      svgIcon: '<svg/>',
    }
    const radius = params.diameter / 2

    const measureWidth = (width: number): number => {
      const parsed: ParsedSvg = {
        fills: [],
        strokes: [{ points: [{ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 }], width }],
      }
      const geometry = buildRelief(params, parsed)
      expect(geometry).not.toBeNull()

      const groups = topGroups(geometry!, params, false, radius + 0.95 * params.reliefDepth)
        .filter((group) => isInteriorRow(group, params) && group.distances.length >= 8)
      expect(groups.length).toBeGreaterThan(0)

      return Math.max(...groups.map(
        (group) => Math.max(...group.arcOffsets) - Math.min(...group.arcOffsets),
      ))
    }

    const thin = measureWidth(0.02)
    expect(thin).toBeGreaterThan(0.05)
    expect(thin).toBeLessThan(0.5)
    expect(thin).toBeLessThan(0.8)

    const thick = measureWidth(0.1)
    expect(thick).toBeGreaterThan(thin)
  })

  it('não produz NaN nas posições', () => {
    const geometry = buildRelief(dotsParams)
    expect(geometry).not.toBeNull()

    const position = geometry!.getAttribute('position')
    let allFinite = true
    for (let i = 0; i < position.count; i++) {
      if (
        !Number.isFinite(position.getX(i))
        || !Number.isFinite(position.getY(i))
        || !Number.isFinite(position.getZ(i))
      ) {
        allFinite = false
        break
      }
    }
    expect(allFinite).toBe(true)
  })
})
