import { type BufferGeometry, CylinderGeometry, ExtrudeGeometry, Shape } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { CakeStandParams, BaseDecoration } from './schema'
import { HEIGHT_MAP, COLUMN_TOP_RADIUS, COLUMN_BOTTOM_RADIUS } from './schema'

export interface BuildCakeStandInput {
  params: CakeStandParams
}

export interface BuildCakeStandResult {
  base: BufferGeometry
  column: BufferGeometry
  plate: BufferGeometry
}

// Criar forma circular
function createCircleShape(radius: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

// Criar hexágono em posição polar
function createHexagonShape(cx: number, cy: number, size: number): Shape {
  const shape = new Shape()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = cx + size * Math.cos(angle)
    const y = cy + size * Math.sin(angle)
    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  }
  shape.closePath()
  return shape
}

// Criar decoração de hexágonos
function buildHexagonDecoration(baseRadius: number, thickness: number): BufferGeometry[] {
  const geometries: BufferGeometry[] = []
  const hexSize = baseRadius * 0.12
  const ringRadius = baseRadius * 0.6
  const count = 6

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count
    const cx = ringRadius * Math.cos(angle)
    const cy = ringRadius * Math.sin(angle)
    const hexShape = createHexagonShape(cx, cy, hexSize)
    const geometry = new ExtrudeGeometry(hexShape, {
      depth: 1,
      bevelEnabled: false,
    })
    geometry.translate(0, 0, thickness)
    geometries.push(geometry)
  }

  // Hexágono central
  const centerShape = createHexagonShape(0, 0, hexSize * 1.2)
  const centerGeometry = new ExtrudeGeometry(centerShape, {
    depth: 1,
    bevelEnabled: false,
  })
  centerGeometry.translate(0, 0, thickness)
  geometries.push(centerGeometry)

  return geometries
}

// Criar decoração de linhas radiais
function buildLinesDecoration(baseRadius: number, thickness: number): BufferGeometry[] {
  const geometries: BufferGeometry[] = []
  const lineWidth = 2
  const lineLength = baseRadius * 0.7
  const count = 8

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count
    const shape = new Shape()
    
    // Linha radial
    const x1 = baseRadius * 0.15 * Math.cos(angle)
    const y1 = baseRadius * 0.15 * Math.sin(angle)
    const x2 = (baseRadius * 0.15 + lineLength) * Math.cos(angle)
    const y2 = (baseRadius * 0.15 + lineLength) * Math.sin(angle)
    
    // Perpendicular offset
    const perpX = -Math.sin(angle) * lineWidth / 2
    const perpY = Math.cos(angle) * lineWidth / 2
    
    shape.moveTo(x1 + perpX, y1 + perpY)
    shape.lineTo(x2 + perpX, y2 + perpY)
    shape.lineTo(x2 - perpX, y2 - perpY)
    shape.lineTo(x1 - perpX, y1 - perpY)
    shape.closePath()
    
    const geometry = new ExtrudeGeometry(shape, {
      depth: 1,
      bevelEnabled: false,
    })
    geometry.translate(0, 0, thickness)
    geometries.push(geometry)
  }

  return geometries
}

// Criar decoração de ondas
function buildWavesDecoration(baseRadius: number, thickness: number): BufferGeometry[] {
  const geometries: BufferGeometry[] = []
  const ringCount = 3

  for (let r = 1; r <= ringCount; r++) {
    const ringRadius = baseRadius * (0.25 + r * 0.2)
    const segments = 32
    const waveAmplitude = 2
    const waveFrequency = 8

    const shape = new Shape()
    
    for (let i = 0; i <= segments; i++) {
      const angle = (Math.PI * 2 * i) / segments
      const wave = Math.sin(angle * waveFrequency) * waveAmplitude
      const radius = ringRadius + wave
      const x = radius * Math.cos(angle)
      const y = radius * Math.sin(angle)
      
      if (i === 0) {
        shape.moveTo(x, y)
      } else {
        shape.lineTo(x, y)
      }
    }
    shape.closePath()
    
    const geometry = new ExtrudeGeometry(shape, {
      depth: 1,
      bevelEnabled: false,
    })
    geometry.translate(0, 0, thickness)
    geometries.push(geometry)
  }

  return geometries
}

// Dispatcher de decoração
function buildDecoration(type: BaseDecoration, baseRadius: number, thickness: number): BufferGeometry[] {
  switch (type) {
    case 'hexagon':
      return buildHexagonDecoration(baseRadius, thickness)
    case 'lines':
      return buildLinesDecoration(baseRadius, thickness)
    case 'waves':
      return buildWavesDecoration(baseRadius, thickness)
    default:
      return []
  }
}

// Construir base com decoração
function buildBase(params: CakeStandParams): BufferGeometry {
  const radius = params.baseDiameter / 2
  const baseShape = createCircleShape(radius)
  
  const base = new ExtrudeGeometry(baseShape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 1,
  })

  // Centralizar a base
  base.computeBoundingBox()
  const bb = base.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  base.translate(-cx, -cy, 0)

  // Adicionar decoração se necessário
  if (params.baseDecoration !== 'none') {
    const decorationGeometries = buildDecoration(params.baseDecoration, radius, params.thickness)
    const merged = mergeGeometries([base, ...decorationGeometries])
    if (merged) {
      base.dispose()
      decorationGeometries.forEach((g: BufferGeometry) => g.dispose())
      return merged
    }
  }

  return base
}

// Construir coluna cônica
function buildColumn(params: CakeStandParams): BufferGeometry {
  const height = HEIGHT_MAP[params.height]
  
  const column = new CylinderGeometry(
    COLUMN_TOP_RADIUS,
    COLUMN_BOTTOM_RADIUS,
    height,
    32,
    1,
    false
  )

  // Posicionar coluna sobre a base
  column.rotateX(Math.PI / 2)
  column.translate(0, 0, params.thickness + height / 2)

  return column
}

// Construir prato superior
function buildPlate(params: CakeStandParams): BufferGeometry {
  const radius = params.baseDiameter / 2
  const columnHeight = HEIGHT_MAP[params.height]
  const plateZ = params.thickness + columnHeight

  if (params.plateHasRim) {
    // Prato com borda: ring shape + disco base
    const outerShape = createCircleShape(radius)
    const innerShape = createCircleShape(radius - params.thickness)
    outerShape.holes.push(new Shape(innerShape.getPoints()))

    const rim = new ExtrudeGeometry(outerShape, {
      depth: params.rimHeight,
      bevelEnabled: false,
    })

    // Disco base do prato
    const discShape = createCircleShape(radius - params.thickness)
    const disc = new ExtrudeGeometry(discShape, {
      depth: params.thickness,
      bevelEnabled: false,
    })

    // Posicionar
    rim.translate(0, 0, plateZ)
    disc.translate(0, 0, plateZ)

    const merged = mergeGeometries([rim, disc])
    if (merged) {
      rim.dispose()
      disc.dispose()
      return merged
    }
    return rim
  } else {
    // Prato simples sem borda
    const plateShape = createCircleShape(radius)
    const plate = new ExtrudeGeometry(plateShape, {
      depth: params.thickness,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 1,
    })

    plate.translate(0, 0, plateZ)
    return plate
  }
}

// Função principal
export function buildCakeStand({ params }: BuildCakeStandInput): BuildCakeStandResult {
  const base = buildBase(params)
  const column = buildColumn(params)
  const plate = buildPlate(params)

  return { base, column, plate }
}