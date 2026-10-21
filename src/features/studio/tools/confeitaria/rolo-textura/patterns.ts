import { MOTIFS_BY_FAMILY } from './schema'
import type { PatternFamily, PatternMotif } from './schema'

export interface Point2 { x: number; y: number }
export interface MotifShape { outer: Point2[]; holes: Point2[][] }

const circle = (radius: number, cx = 0, cy = 0, segments = 48): Point2[] =>
  Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) }
  })

const rose = (base: number, amp: number, lobes: number, segments = 96): Point2[] =>
  Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
    const r = base + amp * Math.cos(lobes * a)
    return { x: r * Math.cos(a), y: r * Math.sin(a) }
  })

function waveBand(shape: (x: number) => number, half: number, steps = 96): Point2[] {
  const top: Point2[] = []
  const bottom: Point2[] = []
  for (let i = 0; i <= steps; i++) {
    const x = -0.5 + i / steps
    const y = shape(x)
    top.push({ x, y: y + half })
    bottom.push({ x, y: y - half })
  }
  return [...top, ...bottom.reverse()]
}

const diamond = (r: number): Point2[] => [
  { x: 0, y: -r }, { x: r, y: 0 }, { x: 0, y: r }, { x: -r, y: 0 },
]

const triangleWave = (x: number, amplitude: number): number =>
  amplitude * (1 - 4 * Math.abs((((x + 0.5) / 0.5) % 1) - 0.5))

function lens(): MotifShape {
  const outer: Point2[] = []
  const n = 48
  for (let i = 0; i <= n; i++) outer.push({ x: -0.45 + (0.9 * i) / n, y: 0.18 * (1 - Math.pow((-1 + (2 * i) / n), 2)) })
  for (let i = n - 1; i >= 1; i--) outer.push({ x: -0.45 + (0.9 * i) / n, y: -0.18 * (1 - Math.pow((-1 + (2 * i) / n), 2)) })
  return { outer, holes: [] }
}

function halfDisk(radius: number): Point2[] {
  const pts: Point2[] = [{ x: -radius, y: 0 }]
  const n = 40
  for (let i = 1; i < n; i++) {
    const a = Math.PI - (Math.PI * i) / n
    pts.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) })
  }
  pts.push({ x: radius, y: 0 })
  return pts
}

function signedArea(points: Point2[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

const ensureCCW = (points: Point2[]): Point2[] => (signedArea(points) < 0 ? [...points].reverse() : points)
const ensureCW = (points: Point2[]): Point2[] => (signedArea(points) > 0 ? [...points].reverse() : points)

const MOTIF_BUILDERS: Record<PatternMotif, () => MotifShape[]> = {
  diamonds: () => [{ outer: diamond(0.42), holes: [] }],
  dots: () => [{ outer: circle(0.38), holes: [] }],
  grid: () => [{
    outer: [{ x: -0.44, y: -0.44 }, { x: 0.44, y: -0.44 }, { x: 0.44, y: 0.44 }, { x: -0.44, y: 0.44 }],
    holes: [[{ x: -0.26, y: -0.26 }, { x: -0.26, y: 0.26 }, { x: 0.26, y: 0.26 }, { x: 0.26, y: -0.26 }]],
  }],
  waves: () => [{ outer: waveBand((x) => 0.16 * Math.sin(2 * Math.PI * x), 0.16), holes: [] }],
  chevrons: () => [{ outer: waveBand((x) => triangleWave(x, 0.2), 0.14), holes: [] }],
  scales: () => [{ outer: halfDisk(0.4), holes: [] }],
  flower: () => [{ outer: rose(0.25, 0.17, 5), holes: [] }],
  leaf: () => [lens()],
  rosette: () => [{ outer: rose(0.36, 0.08, 8), holes: [circle(0.13)] }],
}

const STAGGERED: Record<PatternMotif, boolean> = {
  diamonds: true, dots: true, grid: false, waves: false, chevrons: false,
  scales: true, flower: true, leaf: true, rosette: false,
}

export function motifShapes(family: PatternFamily, motif: PatternMotif): MotifShape[] {
  if (!(MOTIFS_BY_FAMILY[family] as readonly string[]).includes(motif)) return []
  return MOTIF_BUILDERS[motif]().map((shape) => ({
    outer: ensureCCW(shape.outer),
    holes: shape.holes.map(ensureCW),
  }))
}

export function isStaggered(motif: PatternMotif): boolean {
  return STAGGERED[motif]
}
