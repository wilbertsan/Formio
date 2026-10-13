import { type BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import ClipperLib from 'js-clipper'
import { type ClipperPoint, shapeToClipperPaths } from '../../chaveiros/chaveiro/nameOutline'

export type { ClipperPoint }

export interface PathsBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

// Normaliza removendo acentos/diacríticos (fallback quando a fonte não tem o glifo).
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/gi, 'c')
}

/**
 * Contornos da fonte para o texto, em Shape[] (cada letra pode ter furos/counters).
 * Se `generateShapes` falhar para algum glifo (ex.: acentuado), tenta sem acentos.
 */
export function textToShapes(font: Font, text: string, size: number): Shape[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  try {
    return font.generateShapes(trimmed, size)
  } catch {
    try {
      return font.generateShapes(normalizeText(trimmed), size)
    } catch {
      return []
    }
  }
}

/** Converte shapes do Three em paths do Clipper (coordenadas ×1000). */
export function toClipperPaths(shapes: Shape[]): ClipperPoint[][] {
  const paths: ClipperPoint[][] = []
  for (const shape of shapes) {
    paths.push(...shapeToClipperPaths(shape))
  }
  return paths
}

export function unionPaths(paths: ClipperPoint[][]): ClipperPoint[][] {
  if (paths.length === 0) return []
  const clipper = new ClipperLib.Clipper()
  clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true)
  const solution = new ClipperLib.Paths()
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  )
  return solution as ClipperPoint[][]
}

/** Offset em mm (positivo cresce, negativo encolhe), preservando furos. */
export function offsetPaths(paths: ClipperPoint[][], mm: number): ClipperPoint[][] {
  if (paths.length === 0) return []
  const offset = new ClipperLib.ClipperOffset()
  const solution = new ClipperLib.Paths()
  offset.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
  offset.Execute(solution, Math.round(mm * 1000))
  return solution as ClipperPoint[][]
}

/** a − b. */
export function subtractPaths(a: ClipperPoint[][], b: ClipperPoint[][]): ClipperPoint[][] {
  const clipper = new ClipperLib.Clipper()
  clipper.AddPaths(a, ClipperLib.PolyType.ptSubject, true)
  clipper.AddPaths(b, ClipperLib.PolyType.ptClip, true)
  const solution = new ClipperLib.Paths()
  clipper.Execute(
    ClipperLib.ClipType.ctDifference,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  )
  return solution as ClipperPoint[][]
}

export function scalePaths(paths: ClipperPoint[][], factor: number): ClipperPoint[][] {
  return paths.map(path => path.map(p => ({
    X: Math.round(p.X * factor),
    Y: Math.round(p.Y * factor),
  })))
}

/** Translada em mm. */
export function translatePaths(paths: ClipperPoint[][], dx: number, dy: number): ClipperPoint[][] {
  const ox = Math.round(dx * 1000)
  const oy = Math.round(dy * 1000)
  return paths.map(path => path.map(p => ({ X: p.X + ox, Y: p.Y + oy })))
}

export function pathsBoundingBox(paths: ClipperPoint[][]): PathsBounds {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const path of paths) {
    for (const p of path) {
      if (p.X < minX) minX = p.X
      if (p.X > maxX) maxX = p.X
      if (p.Y < minY) minY = p.Y
      if (p.Y > maxY) maxY = p.Y
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 }
  }

  return {
    minX: minX / 1000,
    maxX: maxX / 1000,
    minY: minY / 1000,
    maxY: maxY / 1000,
    width: (maxX - minX) / 1000,
    height: (maxY - minY) / 1000,
  }
}

/**
 * Converte paths do Clipper (possivelmente desconexos, com furos) em Shape[].
 * Classifica externos/furos por profundidade de containment, então cada furo vai
 * para o menor contorno externo que o contém. Resolve letras desconexas e counters.
 */
export function pathsToShapes(paths: ClipperPoint[][]): Shape[] {
  if (paths.length === 0) return []

  const depth = paths.map((path, i) => {
    const probe = path[0]
    let count = 0
    for (let j = 0; j < paths.length; j++) {
      if (i === j) continue
      if (ClipperLib.Clipper.PointInPolygon(probe, paths[j]) !== 0) count++
    }
    return count
  })

  const outers: ClipperPoint[][] = []
  const holes: ClipperPoint[][] = []
  paths.forEach((path, i) => {
    if (depth[i] % 2 === 0) outers.push(path)
    else holes.push(path)
  })

  const shapes = outers.map(outer => new Shape(
    outer.map(p => new Vector2(p.X / 1000, p.Y / 1000)),
  ))

  for (const hole of holes) {
    const probe = hole[0]
    let target = -1
    let smallestArea = Infinity
    outers.forEach((outer, k) => {
      if (ClipperLib.Clipper.PointInPolygon(probe, outer) !== 0) {
        const area = Math.abs(ClipperLib.Clipper.Area(outer))
        if (area < smallestArea) {
          smallestArea = area
          target = k
        }
      }
    })
    if (target >= 0) {
      shapes[target].holes.push(new Path(hole.map(p => new Vector2(p.X / 1000, p.Y / 1000))))
    }
  }

  return shapes
}

/** Extruda cada Shape e mescla num único BufferGeometry. */
export function shapesToGeometry(shapes: Shape[], depth: number, bevel: boolean): BufferGeometry {
  if (shapes.length === 0) {
    return new ExtrudeGeometry(new Shape(), { depth, bevelEnabled: false })
  }
  if (shapes.length === 1) {
    return new ExtrudeGeometry(shapes[0], { depth, bevelEnabled: bevel })
  }

  const geometries = shapes.map(shape => new ExtrudeGeometry(shape, { depth, bevelEnabled: bevel }))
  const merged = mergeGeometries(geometries)
  geometries.forEach(geometry => geometry.dispose())
  return merged ?? geometries[0]
}
