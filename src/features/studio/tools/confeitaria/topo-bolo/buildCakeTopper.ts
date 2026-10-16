import {
  type BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Path,
  Shape,
  Vector2,
} from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { buildSvgIconGeometry, parseSvg, svgShapesFromParsed } from '../shared/svgToIconShape'
import { shapesToGeometry, textToShapes } from '../shared/textOutline'
import type { CakeTopperParams, FontStyle, TextMode } from './schema'

export interface BuildCakeTopperInput {
  params: CakeTopperParams
  fonts?: Partial<Record<FontStyle, Font>>
  font?: Font
  onError?: (message: string) => void
}

export interface BuildCakeTopperResult {
  plate: BufferGeometry
  relief: BufferGeometry | null
  support: BufferGeometry | null
}

const TEXT_MARGIN = 4
const TEXT_Z_OFFSET = 0.01
const CUT_BORDER = 4
const ICON_GAP = 2

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// Translada apenas em X/Y, preservando a faixa de extrusão em Z (0..depth).
function centerXY(geometry: BufferGeometry): void {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return
  geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0)
}

function mergeAll(geometries: BufferGeometry[]): BufferGeometry {
  if (geometries.length === 1) return geometries[0]
  const merged = mergeGeometries(geometries)
  if (merged) {
    geometries.forEach((geometry) => geometry.dispose())
    return merged
  }
  const [first, ...rest] = geometries
  rest.forEach((geometry) => geometry.dispose())
  return first
}

function disposeAll(geometries: BufferGeometry[]): void {
  geometries.forEach((geometry) => geometry.dispose())
}

function circleShape(params: CakeTopperParams): Shape {
  const shape = new Shape()
  // Raio = menor lado/2 para a placa caber na caixa declarada.
  shape.absarc(0, 0, Math.min(params.width, params.height) / 2, 0, Math.PI * 2, false)
  return shape
}

function ovalShape(params: CakeTopperParams): Shape {
  const shape = new Shape()
  shape.absellipse(0, 0, params.width / 2, params.height / 2, 0, Math.PI * 2, false, 0)
  return shape
}

function roundedRectShape(params: CakeTopperParams): Shape {
  const shape = new Shape()
  const hw = params.width / 2
  const hh = params.height / 2
  const r = Math.min(params.cornerRadius, hw, hh)
  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r)
  shape.lineTo(hw, hh - r)
  shape.quadraticCurveTo(hw, hh, hw - r, hh)
  shape.lineTo(-hw + r, hh)
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r)
  shape.lineTo(-hw, -hh + r)
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
  return shape
}

function transformShape(shape: Shape, scale: number, dx: number, dy: number): Shape {
  const map = (point: Vector2): Vector2 => new Vector2(point.x * scale + dx, point.y * scale + dy)
  const transformed = new Shape(shape.getPoints().map(map))
  for (const hole of shape.holes) transformed.holes.push(new Path(hole.getPoints().map(map)))
  return transformed
}

function fitShapesToBox(shapes: Shape[], boxWidth: number, boxHeight: number): Shape[] {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const expand = (point: Vector2): void => {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  for (const shape of shapes) {
    shape.getPoints().forEach(expand)
    for (const hole of shape.holes) hole.getPoints().forEach(expand)
  }

  const width = maxX - minX
  const height = maxY - minY
  if (!(width > 0) || !(height > 0)) return []

  // Escala uniforme (preserva proporção) e centraliza na origem.
  const scale = Math.min(boxWidth / width, boxHeight / height)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  return shapes.map((shape) => transformShape(shape, scale, -centerX * scale, -centerY * scale))
}

function customPlateShapes(params: CakeTopperParams): Shape[] {
  if (!params.contourSvg) return []
  const parsed = parseSvg(params.contourSvg)
  if (!parsed) return []
  const shapes = svgShapesFromParsed(parsed, 0.5)
  if (shapes.length === 0) return []
  return fitShapesToBox(shapes, params.width, params.height)
}

function plateShapes(params: CakeTopperParams, onError?: (message: string) => void): Shape[] {
  switch (params.shape) {
    case 'circle':
      return [circleShape(params)]
    case 'oval':
      return [ovalShape(params)]
    case 'rounded-rect':
      return [roundedRectShape(params)]
    case 'custom': {
      const shapes = customPlateShapes(params)
      if (shapes.length === 0) {
        onError?.('Contorno personalizado inválido; usando círculo')
        return [circleShape(params)]
      }
      return shapes
    }
  }
}

function extrudePlate(shapes: Shape[], thickness: number): BufferGeometry {
  const geometries = shapes.map(
    (shape) => new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }),
  )
  const plate = mergeAll(geometries)
  centerXY(plate)
  return plate
}

function buildTextGeometries(
  input: BuildCakeTopperInput,
  mode: TextMode,
): { geometries: BufferGeometry[]; maxY: number | null } {
  const { params, fonts, font } = input
  const geometries: BufferGeometry[] = []
  let maxY: number | null = null

  for (const item of params.texts) {
    const resolved = fonts?.[item.fontStyle] ?? font
    if (!resolved) continue
    const shapes = textToShapes(resolved, item.content, item.height)
    if (shapes.length === 0) continue

    const depth = mode === 'cut' ? params.thickness + 1 : item.relief
    const geometry = shapesToGeometry(shapes, depth, mode === 'raised')

    geometry.computeBoundingBox()
    const naturalBox = geometry.boundingBox
    const naturalWidth = naturalBox ? naturalBox.max.x - naturalBox.min.x : 0
    const targetWidth = Math.min(item.width, params.width - 2 * TEXT_MARGIN)
    if (naturalWidth > targetWidth && naturalWidth > 0) {
      const factor = targetWidth / naturalWidth
      geometry.scale(factor, factor, 1)
    }
    centerXY(geometry)

    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    const halfWidth = box ? (box.max.x - box.min.x) / 2 : 0
    const halfHeight = box ? (box.max.y - box.min.y) / 2 : 0
    const limitX = Math.max(0, params.width / 2 - halfWidth - TEXT_MARGIN)
    const limitY = Math.max(0, params.height / 2 - halfHeight - TEXT_MARGIN)
    const x = clamp(item.offsetX, -limitX, limitX)
    const y = clamp(item.offsetY, -limitY, limitY)
    const z = mode === 'cut' ? -0.5 : params.thickness - TEXT_Z_OFFSET
    geometry.translate(x, y, z)

    geometry.computeBoundingBox()
    if (geometry.boundingBox) {
      const top = geometry.boundingBox.max.y
      maxY = maxY === null ? top : Math.max(maxY, top)
    }
    geometries.push(geometry)
  }

  return { geometries, maxY }
}

function buildIconGeometry(
  params: CakeTopperParams,
  mode: TextMode,
  textMaxY: number | null,
): BufferGeometry | null {
  if (!params.svgIcon) return null

  // Raio útil ≈ 1/3 do menor lado da placa, escalado por iconScale.
  const maxRadius = (Math.min(params.width, params.height) / 3) * params.iconScale
  const geometry = buildSvgIconGeometry({
    svg: params.svgIcon,
    maxRadius,
    lineWidth: 1,
    iconScale: 1,
    depth: mode === 'cut' ? params.thickness + 1 : 1,
  })
  if (!geometry) return null

  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  const halfHeight = box ? (box.max.y - box.min.y) / 2 : 0
  let y = 0
  if (params.iconPosition === 'above') {
    const anchor = textMaxY ?? params.height / 4
    y = anchor + ICON_GAP + halfHeight
  }
  const z = mode === 'cut' ? -0.5 : params.thickness - TEXT_Z_OFFSET
  geometry.translate(0, y, z)
  return geometry
}

function buildRelief(input: BuildCakeTopperInput, mode: TextMode): BufferGeometry | null {
  const textBuild = buildTextGeometries(input, mode)
  const icon = buildIconGeometry(input.params, mode, textBuild.maxY)
  const parts = icon ? [...textBuild.geometries, icon] : textBuild.geometries
  if (parts.length === 0) return null
  return mergeAll(parts)
}

function cutFits(plate: BufferGeometry, cuts: BufferGeometry[]): boolean {
  const plateBox = plate.boundingBox
  if (!plateBox) return false
  return cuts.every((geometry) => {
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) return false
    return (
      box.min.x >= plateBox.min.x + CUT_BORDER &&
      box.max.x <= plateBox.max.x - CUT_BORDER &&
      box.min.y >= plateBox.min.y + CUT_BORDER &&
      box.max.y <= plateBox.max.y - CUT_BORDER
    )
  })
}

function buildBase(
  params: CakeTopperParams,
  plateMinY: number,
  onError?: (message: string) => void,
): BufferGeometry {
  // Bloco ocupa y ∈ [plateMinY - slotDepth, plateMinY]; a ranhura abre no topo (Y).
  const block = new BoxGeometry(params.baseWidth, params.slotDepth, params.baseDepth)
  block.translate(0, plateMinY - params.slotDepth / 2, params.thickness / 2)

  // Canal mais alto que o bloco para cortar limpo e aberto no topo.
  const slot = new BoxGeometry(params.baseWidth + 2, params.slotDepth + 2, params.slotWidth)
  slot.translate(0, plateMinY - params.slotDepth / 2 + 1, params.thickness / 2)

  let base: BufferGeometry
  try {
    const result = new Evaluator().evaluate(new Brush(block), new Brush(slot), SUBTRACTION).geometry
    result.computeVertexNormals()
    base = result
  } catch {
    onError?.('Falha ao abrir encaixe; usando base sólida')
    base = block
  }
  slot.dispose()
  if (base !== block) block.dispose()

  // Transladado para imprimir ao lado da placa.
  base.translate(params.width / 2 + 10 + params.baseWidth / 2, 0, 0)
  return base
}

function buildSupport(
  params: CakeTopperParams,
  plate: BufferGeometry,
  onError?: (message: string) => void,
): BufferGeometry | null {
  plate.computeBoundingBox()
  const plateBox = plate.boundingBox
  if (!plateBox) return null
  const plateMinY = plateBox.min.y

  if (params.supportType === 'haste') {
    const stem = new CylinderGeometry(
      params.stemDiameter / 2,
      params.stemDiameter / 2,
      params.stemLength,
      24,
    )
    stem.translate(0, plateMinY - params.stemLength / 2, params.thickness / 2)
    return stem
  }

  return buildBase(params, plateMinY, onError)
}

export function buildCakeTopper(input: BuildCakeTopperInput): BuildCakeTopperResult {
  const { params, onError } = input
  const plate = extrudePlate(plateShapes(params, onError), params.thickness)

  if (params.textMode === 'raised') {
    return {
      plate,
      relief: buildRelief(input, 'raised'),
      support: buildSupport(params, plate, onError),
    }
  }

  const cutText = buildTextGeometries(input, 'cut')
  const cutIcon = buildIconGeometry(params, 'cut', cutText.maxY)
  const cuts = cutIcon ? [...cutText.geometries, cutIcon] : cutText.geometries

  if (cuts.length > 0) {
    plate.computeBoundingBox()
    if (cutFits(plate, cuts)) {
      const cutGeometry = mergeAll(cuts)
      try {
        const result = new Evaluator()
          .evaluate(new Brush(plate), new Brush(cutGeometry), SUBTRACTION)
          .geometry
        result.computeVertexNormals()
        plate.dispose()
        cutGeometry.dispose()
        return { plate: result, relief: null, support: buildSupport(params, result, onError) }
      } catch {
        onError?.('Falha no corte; usando relevo')
        cutGeometry.dispose()
      }
    } else {
      onError?.('Corte alcançaria a borda; usando relevo')
      disposeAll(cuts)
    }
  }

  return {
    plate,
    relief: buildRelief(input, 'raised'),
    support: buildSupport(params, plate, onError),
  }
}

export function disposeCakeTopperResult(result: BuildCakeTopperResult): void {
  result.plate.dispose()
  result.relief?.dispose()
  result.support?.dispose()
}
