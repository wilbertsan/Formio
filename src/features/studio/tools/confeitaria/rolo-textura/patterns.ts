import type { PatternFamily, PatternMotif } from './schema'

export interface Point2 { x: number; y: number }
export interface MotifShape { outer: Point2[]; holes: Point2[][] }

const circle = (radius: number, cx = 0, cy = 0, segments = 24): Point2[] =>
  Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) }
  })

const rose = (base: number, amp: number, lobes: number, segments = 60): Point2[] =>
  Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
    const r = base + amp * Math.cos(lobes * a)
    return { x: r * Math.cos(a), y: r * Math.sin(a) }
  })

function waveBand(shape: (x: number) => number, half: number, steps = 48): Point2[] {
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

function lens(): MotifShape {
  const outer: Point2[] = []
  const n = 24
  for (let i = 0; i <= n; i++) outer.push({ x: -0.45 + (0.9 * i) / n, y: 0.18 * (1 - Math.pow((-1 + (2 * i) / n), 2)) })
  for (let i = n; i >= 0; i--) outer.push({ x: -0.45 + (0.9 * i) / n, y: -0.18 * (1 - Math.pow((-1 + (2 * i) / n), 2)) })
  return { outer, holes: [] }
}

function halfDisk(radius: number): Point2[] {
  const pts: Point2[] = [{ x: -radius, y: 0 }]
  const n = 20
  for (let i = 1; i < n; i++) {
    const a = Math.PI - (Math.PI * i) / n
    pts.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) })
  }
  pts.push({ x: radius, y: 0 })
  return pts
}

const MOTIF_BUILDERS: Record<PatternMotif, () => MotifShape[]> = {
  diamonds: () => [{ outer: [{ x: 0, y: -0.42 }, { x: 0.42, y: 0 }, { x: 0, y: 0.42 }, { x: -0.42, y: 0 }], holes: [] }],
  dots: () => [{ outer: circle(0.38), holes: [] }],
  grid: () => [{
    outer: [{ x: -0.44, y: -0.44 }, { x: 0.44, y: -0.44 }, { x: 0.44, y: 0.44 }, { x: -0.44, y: 0.44 }],
    holes: [[{ x: -0.26, y: -0.26 }, { x: -0.26, y: 0.26 }, { x: 0.26, y: 0.26 }, { x: 0.26, y: -0.26 }]],
  }],
  waves: () => [{ outer: waveBand((x) => 0.16 * Math.sin(2 * Math.PI * x), 0.16), holes: [] }],
  chevrons: () => [{ outer: waveBand((x) => 0.2 * (1 - 4 * Math.abs((((x + 0.5) / 0.5) % 1) - 0.5)), 0.14), holes: [] }],
  scales: () => [{ outer: halfDisk(0.4), holes: [] }],
  flower: () => [{ outer: rose(0.25, 0.17, 5), holes: [] }],
  leaf: () => [lens()],
  rosette: () => [{ outer: rose(0.36, 0.08, 8), holes: [] }, { outer: circle(0.13), holes: [] }],
}

const STAGGERED: Record<PatternMotif, boolean> = {
  diamonds: true, dots: true, grid: false, waves: false, chevrons: false,
  scales: true, flower: true, leaf: true, rosette: false,
}

export function motifShapes(_family: PatternFamily, motif: PatternMotif): MotifShape[] {
  return MOTIF_BUILDERS[motif]()
}

export function isStaggered(motif: PatternMotif): boolean {
  return STAGGERED[motif]
}
