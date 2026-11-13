import type { BufferGeometry } from 'three'

function positionKey(x: number, y: number, z: number): string {
  return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`
}

/** Considera fechada quando cada aresta aparece exatamente em 2 triângulos. */
export function isClosed(geometry: BufferGeometry): boolean {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const edges = new Map<string, number>()
  const count = index ? index.count : position.count

  const vertex = (i: number): string => {
    const idx = index ? index.getX(i) : i
    return positionKey(position.getX(idx), position.getY(idx), position.getZ(idx))
  }
  const edge = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

  for (let i = 0; i < count; i += 3) {
    const a = vertex(i)
    const b = vertex(i + 1)
    const c = vertex(i + 2)
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      const key = edge(p, q)
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
  }

  for (const value of edges.values()) if (value !== 2) return false
  return true
}
