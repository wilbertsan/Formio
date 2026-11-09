import {
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  Path,
  Raycaster,
  Shape,
  Vector2,
  Vector3,
} from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildSvgIconGeometry, parseSvg, svgShapesFromParsed } from '../shared/svgToIconShape'
import { shapesToGeometry, textToShapes } from '../shared/textOutline'
import { ICON_MARGIN } from './iconLayout'
import {
  clampToOutline,
  fitScaleToOutline,
  outlineSpec,
  type PlateBounds,
} from './placement'
import type { CakeTopperParams, FontStyle } from './schema'

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
const ICON_DEPTH = 1
const CUSTOM_MIN_FEATURE = 0.5
const STEM_EMBED = 2
const STEM_SEGMENTS = 24
const STEM_TIP_RATIO = 2.5
const STEM_TIP_FLAT_DIAMETER = 0.8
const STEM_MAX_TIP_LENGTH_RATIO = 0.5
const STEM_MIN_GAP = 0.5

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

// O SVGLoader entrega o eixo Y para baixo; invertemos apenas o Y (o X permanece
// correto) para o contorno não aparecer de cabeça para baixo.
function flipShapeY(shape: Shape): Shape {
  const map = (point: Vector2): Vector2 => new Vector2(point.x, -point.y)
  const flipped = new Shape(shape.getPoints().map(map))
  for (const hole of shape.holes) flipped.holes.push(new Path(hole.getPoints().map(map)))
  return flipped
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
  return fitShapesToBox(shapes.map(flipShapeY), params.width, params.height)
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

function buildTextGeometries(
  input: BuildCakeTopperInput,
  plate: PlateBounds,
): BufferGeometry[] {
  const { params, fonts, font, onError } = input
  const geometries: BufferGeometry[] = []

  for (const item of params.texts) {
    const resolved = fonts?.[item.fontStyle] ?? font
    if (!resolved) {
      onError?.(`Fonte indisponível para o estilo "${item.fontStyle}"`)
      continue
    }
    const shapes = textToShapes(resolved, item.content, item.height)
    if (shapes.length === 0) continue

    const geometry = shapesToGeometry(shapes, item.relief, true)

    geometry.computeBoundingBox()
    const naturalBox = geometry.boundingBox
    const naturalWidth = naturalBox ? naturalBox.max.x - naturalBox.min.x : 0
    const targetWidth = Math.min(item.width, params.width - 2 * TEXT_MARGIN)
    if (naturalWidth > targetWidth && naturalWidth > 0) {
      const factor = targetWidth / naturalWidth
      // `height` é o tamanho da fonte; a largura é um limite máximo e comprime
      // apenas X, preservando a altura (mesmo comportamento do marcador de página).
      geometry.scale(factor, 1, 1)
    }
    centerXY(geometry)

    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    const halfWidth = box ? (box.max.x - box.min.x) / 2 : 0
    const halfHeight = box ? (box.max.y - box.min.y) / 2 : 0
    const placed = clampToOutline(
      params,
      plate,
      halfWidth,
      halfHeight,
      item.offsetX,
      item.offsetY,
      TEXT_MARGIN,
    )
    const z = params.thickness - TEXT_Z_OFFSET
    geometry.translate(placed.x, placed.y, z)

    geometries.push(geometry)
  }

  return geometries
}

function buildIconGeometry(
  params: CakeTopperParams,
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
    depth: ICON_DEPTH,
  })
  if (!geometry) return null

  geometry.computeBoundingBox()
  let box = geometry.boundingBox
  let halfWidth = box ? (box.max.x - box.min.x) / 2 : 0
  let halfHeight = box ? (box.max.y - box.min.y) / 2 : 0

  // Encolhe (nunca aumenta) até o canto caber no contorno recuado.
  const spec = outlineSpec(params, plate, ICON_MARGIN)
  const factor = fitScaleToOutline(spec, halfWidth, halfHeight)
  if (factor < 1) {
    geometry.scale(factor, factor, 1)
    geometry.computeBoundingBox()
    box = geometry.boundingBox
    halfWidth = box ? (box.max.x - box.min.x) / 2 : 0
    halfHeight = box ? (box.max.y - box.min.y) / 2 : 0
  }

  const placed = clampToOutline(
    params,
    plate,
    halfWidth,
    halfHeight,
    params.iconOffsetX,
    params.iconOffsetY,
    ICON_MARGIN,
  )
  const z = params.thickness - TEXT_Z_OFFSET
  geometry.translate(placed.x, placed.y, z)
  return geometry
}

function buildRelief(
  input: BuildCakeTopperInput,
  plate: PlateBounds,
): BufferGeometry | null {
  const textGeometries = buildTextGeometries(input, plate)
  const icon = buildIconGeometry(input.params, plate)
  const parts = icon ? [...textGeometries, icon] : textGeometries
  if (parts.length === 0) return null
  return mergeAll(parts, input.onError)
}

interface PlateBottomSampler {
  minX: number
  maxX: number
  minY: number
  sample: (x: number) => number | null
  dispose: () => void
}

function createPlateBottomSampler(
  plate: BufferGeometry,
  thickness: number,
): PlateBottomSampler | null {
  plate.computeBoundingBox()
  const bb = plate.boundingBox
  if (!bb) return null

  const material = new MeshBasicMaterial({ side: DoubleSide })
  const mesh = new Mesh(plate, material)
  const raycaster = new Raycaster()
  const dir = new Vector3(0, -1, 0)
  const fromY = bb.max.y + 1

  return {
    minX: bb.min.x,
    maxX: bb.max.x,
    minY: bb.min.y,
    sample: (x: number) => {
      raycaster.set(new Vector3(x, fromY, thickness / 2), dir)
      const hits = raycaster.intersectObject(mesh, false)
      if (hits.length === 0) return null
      let bottom = Infinity
      for (const hit of hits) if (hit.point.y < bottom) bottom = hit.point.y
      return Number.isFinite(bottom) ? bottom : null
    },
    dispose: () => material.dispose(),
  }
}

// X onde a placa "pisa": o fundo mais baixo (empate → mais próximo de 0).
function plateBottomAnchor(sampler: PlateBottomSampler): number {
  let bestX = 0
  let bestBottom = Infinity
  const step = 0.5
  for (let x = sampler.minX; x <= sampler.maxX + 1e-6; x += step) {
    const bottom = sampler.sample(x)
    if (bottom === null) continue
    const lower = bottom < bestBottom - 1e-6
    const tieNearCenter = Math.abs(bottom - bestBottom) <= 1e-6 && Math.abs(x) < Math.abs(bestX)
    if (lower || tieNearCenter) {
      bestBottom = bottom
      bestX = x
    }
  }
  return bestX
}

// X da haste é válido se todo o diâmetro tiver material da placa e o fundo
// variar no máximo STEM_EMBED (evita cobrir entalhes internos do contorno).
function isStemXValid(
  sampler: PlateBottomSampler,
  x: number,
  radius: number,
): boolean {
  const center = sampler.sample(x)
  if (center === null) return false

  const step = 0.5
  for (let sampleX = x - radius; sampleX <= x + radius + 1e-6; sampleX += step) {
    const bottom = sampler.sample(sampleX)
    if (bottom === null) return false
    if (Math.abs(bottom - center) > STEM_EMBED) return false
  }
  return true
}

function collectValidStemXs(
  sampler: PlateBottomSampler,
  radius: number,
): number[] {
  const xs: number[] = []
  const step = 0.5
  for (let x = sampler.minX + radius; x <= sampler.maxX - radius + 1e-6; x += step) {
    if (isStemXValid(sampler, x, radius)) xs.push(x)
  }
  return xs
}

// Escolhe o X válido mais próximo do candidato.
function resolveStemX(
  sampler: PlateBottomSampler,
  candidateX: number,
  radius: number,
): number | null {
  const xs = collectValidStemXs(sampler, radius)
  if (xs.length === 0) return null

  let best = xs[0]
  let bestDistance = Math.abs(best - candidateX)
  for (const x of xs) {
    const distance = Math.abs(x - candidateX)
    if (distance < bestDistance) {
      best = x
      bestDistance = distance
    }
  }
  return best
}

// Topo da haste: maior fundo sob o disco inteiro, garantindo que o círculo
// entre na placa (na placa plana o resultado é o fundo global + embed).
function stemTopY(
  sampler: PlateBottomSampler,
  x: number,
  radius: number,
): number {
  const step = 0.5
  let highest = sampler.minY
  for (let sampleX = x - radius; sampleX <= x + radius + 1e-6; sampleX += step) {
    const bottom = sampler.sample(sampleX)
    if (bottom !== null && bottom > highest) highest = bottom
  }
  return highest + STEM_EMBED
}

// Busca um par de X válidos e separados, ou null quando a placa não comporta.
function resolveDoubleStemXs(
  sampler: PlateBottomSampler,
  spacing: number,
  radius: number,
): { left: number; right: number } | null {
  const minSeparation = radius * 2 + STEM_MIN_GAP
  const desiredHalf = spacing / 2
  if (
    desiredHalf * 2 >= minSeparation &&
    isStemXValid(sampler, -desiredHalf, radius) &&
    isStemXValid(sampler, desiredHalf, radius)
  ) {
    return { left: -desiredHalf, right: desiredHalf }
  }

  const xs = collectValidStemXs(sampler, radius)
  let best: { left: number; right: number } | null = null
  let bestScore = Infinity
  let j = 0
  for (let i = 0; i < xs.length; i++) {
    if (j <= i) j = i + 1
    while (j < xs.length && xs[j] - xs[i] < minSeparation) j++
    if (j >= xs.length) break
    const score = Math.abs(xs[i] + desiredHalf) + Math.abs(xs[j] - desiredHalf)
    if (score < bestScore) {
      bestScore = score
      best = { left: xs[i], right: xs[j] }
    }
  }
  return best
}

function buildSingleStem(
  params: CakeTopperParams,
  sampler: PlateBottomSampler,
  radius: number,
  onError?: (message: string) => void,
): BufferGeometry {
  const anchorX = plateBottomAnchor(sampler)
  const resolvedX = resolveStemX(sampler, anchorX, radius)
  if (resolvedX === null) {
    onError?.('Haste maior que a placa; usando âncora')
  }
  const x = resolvedX ?? anchorX
  return buildStem(params, x, stemTopY(sampler, x, radius))
}

// Remove triângulos de área zero dos polos e solda vértices duplicados.
function cleanStemGeometry(geometry: BufferGeometry): BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const pos = source.getAttribute('position')
  const kept: number[] = []

  for (let i = 0; i < pos.count; i += 3) {
    const ax = pos.getX(i)
    const ay = pos.getY(i)
    const az = pos.getZ(i)
    const bx = pos.getX(i + 1)
    const by = pos.getY(i + 1)
    const bz = pos.getZ(i + 1)
    const cx = pos.getX(i + 2)
    const cy = pos.getY(i + 2)
    const cz = pos.getZ(i + 2)

    const abx = bx - ax
    const aby = by - ay
    const abz = bz - az
    const acx = cx - ax
    const acy = cy - ay
    const acz = cz - az

    const crossX = aby * acz - abz * acy
    const crossY = abz * acx - abx * acz
    const crossZ = abx * acy - aby * acx
    if (crossX * crossX + crossY * crossY + crossZ * crossZ > 1e-18) {
      kept.push(ax, ay, az, bx, by, bz, cx, cy, cz)
    }
  }

  const filtered = new BufferGeometry()
  filtered.setAttribute('position', new Float32BufferAttribute(kept, 3))
  const welded = mergeVertices(filtered)
  filtered.dispose()
  if (source !== geometry) source.dispose()
  geometry.dispose()
  welded.computeVertexNormals()
  return welded
}

function buildStem(
  params: CakeTopperParams,
  centerX: number,
  topY: number,
): BufferGeometry {
  const radius = params.stemDiameter / 2
  const tipRadius = STEM_TIP_FLAT_DIAMETER / 2
  const tipLength = Math.min(
    params.stemDiameter * STEM_TIP_RATIO,
    params.stemLength * STEM_MAX_TIP_LENGTH_RATIO,
  )

  // Perfil de baixo para cima: ponta plana → cone → corpo cilíndrico → topo.
  const points = [
    new Vector2(0, -params.stemLength),
    new Vector2(tipRadius, -params.stemLength),
    new Vector2(radius, -params.stemLength + tipLength),
    new Vector2(radius, 0),
    new Vector2(0, 0),
  ]

  const raw = new LatheGeometry(points, STEM_SEGMENTS)
  const geometry = cleanStemGeometry(raw)
  geometry.translate(centerX, topY, params.thickness / 2)
  return geometry
}

function buildSupport(
  params: CakeTopperParams,
  plate: BufferGeometry,
  onError?: (message: string) => void,
): BufferGeometry | null {
  const sampler = createPlateBottomSampler(plate, params.thickness)
  if (!sampler) return null

  try {
    const radius = params.stemDiameter / 2
    if (params.supportType === 'haste') {
      return buildSingleStem(params, sampler, radius, onError)
    }

    const positions = resolveDoubleStemXs(sampler, params.stemSpacing, radius)
    if (!positions) {
      onError?.('Espaçamento insuficiente para haste dupla; usando haste simples')
      return buildSingleStem(params, sampler, radius, onError)
    }

    const stems = [positions.left, positions.right].map((x) =>
      buildStem(params, x, stemTopY(sampler, x, radius)),
    )
    return mergeAll(stems, onError)
  } finally {
    sampler.dispose()
  }
}

export function buildCakeTopper(input: BuildCakeTopperInput): BuildCakeTopperResult {
  const { params, onError } = input
  const plate = extrudePlate(plateShapes(params, onError), params.thickness, onError)
  const plateBounds = plateBoundsOf(plate, params)

  return {
    plate,
    relief: buildRelief(input, plateBounds),
    support: buildSupport(params, plate, onError),
  }
}

export function disposeCakeTopperResult(result: BuildCakeTopperResult): void {
  result.plate.dispose()
  result.relief?.dispose()
  result.support?.dispose()
}
