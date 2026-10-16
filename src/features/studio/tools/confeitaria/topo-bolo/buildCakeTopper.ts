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
const CUT_Z_OFFSET = -0.5
const ICON_GAP = 2
const ICON_MARGIN = 1
const ICON_DEPTH = 1
const CUSTOM_MIN_FEATURE = 0.5
const STEM_EMBED = 2
const STEM_SEGMENTS = 24
const BASE_FLOOR = 3
const SLOT_CLEARANCE = 2
const BASE_GAP = 10

interface PlateBounds {
  halfWidth: number
  halfHeight: number
}

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

function mergeAll(geometries: BufferGeometry[], onError?: (message: string) => void): BufferGeometry {
  if (geometries.length === 1) return geometries[0]
  const merged = mergeGeometries(geometries)
  if (merged) {
    geometries.forEach((geometry) => geometry.dispose())
    return merged
  }
  onError?.('Falha ao unir geometrias; mantendo apenas a primeira')
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
  const shapes = svgShapesFromParsed(parsed, CUSTOM_MIN_FEATURE)
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

function extrudePlate(
  shapes: Shape[],
  thickness: number,
  onError?: (message: string) => void,
): BufferGeometry {
  const geometries = shapes.map(
    (shape) => new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }),
  )
  const plate = mergeAll(geometries, onError)
  centerXY(plate)
  return plate
}

function plateBoundsOf(plate: BufferGeometry, params: CakeTopperParams): PlateBounds {
  plate.computeBoundingBox()
  const box = plate.boundingBox
  if (!box) return { halfWidth: params.width / 2, halfHeight: params.height / 2 }
  return {
    halfWidth: (box.max.x - box.min.x) / 2,
    halfHeight: (box.max.y - box.min.y) / 2,
  }
}

/**
 * Deslocamento máximo do centro de um retângulo `halfWidth × halfHeight` para
 * que ele permaneça inscrito no contorno da placa recuado de `margin`.
 * Valores negativos significam que o retângulo não cabe no contorno.
 */
function outlineLimits(
  params: CakeTopperParams,
  plate: PlateBounds,
  halfWidth: number,
  halfHeight: number,
  margin: number,
): { x: number; y: number } {
  switch (params.shape) {
    case 'circle': {
      const r = Math.min(params.width, params.height) / 2 - margin
      return {
        x: Math.sqrt(Math.max(0, r * r - halfHeight * halfHeight)) - halfWidth,
        y: Math.sqrt(Math.max(0, r * r - halfWidth * halfWidth)) - halfHeight,
      }
    }
    case 'oval': {
      const rx = Math.max(0, params.width / 2 - margin)
      const ry = Math.max(0, params.height / 2 - margin)
      return {
        x: rx * Math.sqrt(Math.max(0, 1 - (halfHeight * halfHeight) / (ry * ry || 1))) - halfWidth,
        y: ry * Math.sqrt(Math.max(0, 1 - (halfWidth * halfWidth) / (rx * rx || 1))) - halfHeight,
      }
    }
    case 'rounded-rect':
      return {
        x: params.width / 2 - halfWidth - margin,
        y: params.height / 2 - halfHeight - margin,
      }
    case 'custom':
      return {
        x: plate.halfWidth - halfWidth - margin,
        y: plate.halfHeight - halfHeight - margin,
      }
  }
}

function buildTextGeometries(
  input: BuildCakeTopperInput,
  mode: TextMode,
  plate: PlateBounds,
): { geometries: BufferGeometry[]; maxY: number | null } {
  const { params, fonts, font, onError } = input
  const geometries: BufferGeometry[] = []
  let maxY: number | null = null

  for (const item of params.texts) {
    const resolved = fonts?.[item.fontStyle] ?? font
    if (!resolved) {
      onError?.(`Fonte indisponível para o estilo "${item.fontStyle}"`)
      continue
    }
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
    const limits = outlineLimits(params, plate, halfWidth, halfHeight, TEXT_MARGIN)
    const limitX = Math.max(0, limits.x)
    const limitY = Math.max(0, limits.y)
    const x = clamp(item.offsetX, -limitX, limitX)
    const y = clamp(item.offsetY, -limitY, limitY)
    const z = mode === 'cut' ? CUT_Z_OFFSET : params.thickness - TEXT_Z_OFFSET
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
  plate: PlateBounds,
): BufferGeometry | null {
  if (!params.svgIcon) return null

  // Raio útil ≈ 1/3 do menor lado da placa, escalado por iconScale.
  const maxRadius = (Math.min(params.width, params.height) / 3) * params.iconScale
  const geometry = buildSvgIconGeometry({
    svg: params.svgIcon,
    maxRadius,
    lineWidth: 1,
    iconScale: 1,
    depth: mode === 'cut' ? params.thickness + 1 : ICON_DEPTH,
  })
  if (!geometry) return null

  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  const halfWidth = box ? (box.max.x - box.min.x) / 2 : 0
  const halfHeight = box ? (box.max.y - box.min.y) / 2 : 0

  let y = 0
  if (params.iconPosition === 'above') {
    const anchor = textMaxY ?? params.height / 4
    y = anchor + ICON_GAP + halfHeight
  }

  // Mantém o ícone dentro do contorno, deslocando (ou centrando) se necessário.
  const limits = outlineLimits(params, plate, halfWidth, halfHeight, ICON_MARGIN)
  y = clamp(y, -Math.max(0, limits.y), Math.max(0, limits.y))

  const z = mode === 'cut' ? CUT_Z_OFFSET : params.thickness - TEXT_Z_OFFSET
  geometry.translate(0, y, z)
  return geometry
}

function buildRelief(
  input: BuildCakeTopperInput,
  mode: TextMode,
  plate: PlateBounds,
): BufferGeometry | null {
  const textBuild = buildTextGeometries(input, mode, plate)
  const icon = buildIconGeometry(input.params, mode, textBuild.maxY, plate)
  const parts = icon ? [...textBuild.geometries, icon] : textBuild.geometries
  if (parts.length === 0) return null
  return mergeAll(parts, input.onError)
}

function cutFits(params: CakeTopperParams, plate: PlateBounds, cuts: BufferGeometry[]): boolean {
  return cuts.every((geometry) => {
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) return false
    const halfWidth = (box.max.x - box.min.x) / 2
    const halfHeight = (box.max.y - box.min.y) / 2
    const centerX = (box.min.x + box.max.x) / 2
    const centerY = (box.min.y + box.max.y) / 2
    const limits = outlineLimits(params, plate, halfWidth, halfHeight, CUT_BORDER)
    return Math.abs(centerX) <= limits.x && Math.abs(centerY) <= limits.y
  })
}

function buildBase(
  params: CakeTopperParams,
  plateMinY: number,
  onError?: (message: string) => void,
): BufferGeometry {
  // Bloco tem piso: y ∈ [plateMinY - (slotDepth + BASE_FLOOR), plateMinY].
  const blockHeight = params.slotDepth + BASE_FLOOR
  const block = new BoxGeometry(params.baseWidth, blockHeight, params.baseDepth)
  block.translate(0, plateMinY - blockHeight / 2, params.thickness / 2)

  // Canal aberto no topo que para acima do piso (y ∈ [plateMinY - slotDepth, plateMinY + clearance]).
  const slotHeight = params.slotDepth + SLOT_CLEARANCE
  const slot = new BoxGeometry(params.baseWidth + SLOT_CLEARANCE, slotHeight, params.slotWidth)
  slot.translate(0, plateMinY - params.slotDepth / 2 + SLOT_CLEARANCE / 2, params.thickness / 2)

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
  base.translate(params.width / 2 + BASE_GAP + params.baseWidth / 2, 0, 0)
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
      STEM_SEGMENTS,
    )
    // Embutida na placa (topo em plateMinY + STEM_EMBED) para soldar os corpos.
    stem.translate(0, plateMinY + STEM_EMBED - params.stemLength / 2, params.thickness / 2)
    return stem
  }

  return buildBase(params, plateMinY, onError)
}

export function buildCakeTopper(input: BuildCakeTopperInput): BuildCakeTopperResult {
  const { params, onError } = input
  const plate = extrudePlate(plateShapes(params, onError), params.thickness, onError)
  const plateBounds = plateBoundsOf(plate, params)

  if (params.textMode === 'raised') {
    return {
      plate,
      relief: buildRelief(input, 'raised', plateBounds),
      support: buildSupport(params, plate, onError),
    }
  }

  const cutText = buildTextGeometries(input, 'cut', plateBounds)
  const cutIcon = buildIconGeometry(params, 'cut', cutText.maxY, plateBounds)
  const cuts = cutIcon ? [...cutText.geometries, cutIcon] : cutText.geometries

  if (cuts.length > 0) {
    if (cutFits(params, plateBounds, cuts)) {
      const cutGeometry = mergeAll(cuts, onError)
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
    relief: buildRelief(input, 'raised', plateBounds),
    support: buildSupport(params, plate, onError),
  }
}

export function disposeCakeTopperResult(result: BuildCakeTopperResult): void {
  result.plate.dispose()
  result.relief?.dispose()
  result.support?.dispose()
}
