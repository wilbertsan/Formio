import {
  TEXTURE_EDGE_FADE_MM,
  TEXTURE_HANDLE_FADE_MM,
  TEXTURE_HANDLE_GAP_MM,
  getEffectiveTextureDepth,
  getOuterRadius,
  type CanHolderGeometryParams,
} from './schema'

const TAU = Math.PI * 2

function smoothstep(a: number, b: number, value: number): number {
  if (a === b) return value < a ? 0 : 1
  const t = Math.min(1, Math.max(0, (value - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size
}

/** Hash determinístico em [0, 1) — substitui Math.random para reprodutibilidade. */
function hash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + 17.13) * 43758.5453
  return value - Math.floor(value)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Número inteiro de células em volta do corpo, para fechar a emenda em θ. */
function cellsAround(params: CanHolderGeometryParams): number {
  const circumference = TAU * getOuterRadius(params)
  return Math.max(3, Math.round(circumference / params.textureScale))
}

function woodHeight(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
  depth: number,
): number {
  const cells = cellsAround(params)
  const warp = 0.35 * Math.sin(TAU * (y / (params.textureScale * 2.5)))
  const grain = 0.5 + 0.5 * Math.sin(TAU * ((theta / TAU) * cells + warp))
  return depth * grain
}

function metalHeight(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
  depth: number,
): number {
  const cells = cellsAround(params)
  const u = theta / TAU
  const a = Math.sin(TAU * (u * cells + y / params.textureScale))
  const b = Math.sin(TAU * (u * cells - y / params.textureScale))
  return depth * 0.5 * (1 + 0.5 * (a + b))
}

function scalesHeight(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
  depth: number,
): number {
  const cells = cellsAround(params)
  const circumference = TAU * getOuterRadius(params)
  const cellW = circumference / cells
  const rowH = params.textureScale * 0.6
  const radius = params.textureScale * 0.55
  const arc = theta * getOuterRadius(params)
  const row = Math.floor(y / rowH)
  let best = 0

  // A calota alcança 0.55·escala > rowH/2, então a fileira vizinha ainda
  // influencia a altura: avaliar três fileiras elimina o degrau na fronteira.
  for (const current of [row - 1, row, row + 1]) {
    const offset = wrap(current, 2) === 0 ? 0 : cellW / 2
    const centerArc = (Math.floor((arc - offset) / cellW) + 0.5) * cellW + offset
    const dx = wrap(arc - centerArc + cellW / 2, cellW) - cellW / 2
    const dy = y - (current + 0.5) * rowH
    const distance = (dx * dx + dy * dy) / (radius * radius)
    if (distance < 1) best = Math.max(best, 1 - distance)
  }

  return depth * best
}

function wavesHeight(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
  depth: number,
): number {
  const cells = cellsAround(params)
  const u = theta / TAU
  const phase = y / params.textureScale + 0.18 * Math.sin(TAU * u * cells)
  return depth * (0.5 + 0.5 * Math.sin(TAU * phase))
}

function stoneHeight(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
  depth: number,
): number {
  const cells = cellsAround(params)
  const cellSize = params.textureScale

  const octave = (count: number, size: number, seed: number): number => {
    const fx = (theta / TAU) * count
    const fy = y / size
    const ix = Math.floor(fx)
    const iy = Math.floor(fy) + seed
    const fxT = smoothstep(0, 1, fx - ix)
    const fyT = smoothstep(0, 1, fy - Math.floor(fy))
    const v00 = hash(wrap(ix, count), iy)
    const v10 = hash(wrap(ix + 1, count), iy)
    const v01 = hash(wrap(ix, count), iy + 1)
    const v11 = hash(wrap(ix + 1, count), iy + 1)
    return lerp(lerp(v00, v10, fxT), lerp(v01, v11, fxT), fyT)
  }

  return depth * (0.6 * octave(cells, cellSize, 0) + 0.4 * octave(cells * 2, cellSize / 2, 31))
}

function spikesHeight(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
  depth: number,
): number {
  const radius = getOuterRadius(params)
  const cells = cellsAround(params)
  const cellW = (TAU * radius) / cells
  const rowH = params.textureScale * 0.75
  const half = Math.max(depth, params.textureScale * 0.3)
  const arc = theta * radius
  const row = Math.floor(y / rowH)
  const offset = wrap(row, 2) === 0 ? 0 : cellW / 2
  const centerArc = (Math.floor((arc - offset) / cellW) + 0.5) * cellW + offset
  const dx = wrap(arc - centerArc + cellW / 2, cellW) - cellW / 2
  const dy = y - (row + 0.5) * rowH
  // Cone: o gradiente é depth / half ≤ 1 em todas as direções.
  const distance = Math.hypot(dx, dy) / half
  return depth * Math.max(0, 1 - distance)
}

/** Altura do padrão em 0..profundidade efetiva, sem máscaras. */
export function textureHeight(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
): number {
  const depth = getEffectiveTextureDepth(params)
  switch (params.textureStyle) {
    case 'none':
      return 0
    case 'wood':
      return woodHeight(params, theta, y, depth)
    case 'metal':
      return metalHeight(params, theta, y, depth)
    case 'scales':
      return scalesHeight(params, theta, y, depth)
    case 'waves':
      return wavesHeight(params, theta, y, depth)
    case 'stone':
      return stoneHeight(params, theta, y, depth)
    case 'spikes':
      return spikesHeight(params, theta, y, depth)
    default: {
      const exhaustive: never = params.textureStyle
      return exhaustive
    }
  }
}

/** Máscara 0..1: fade nas bordas da parede e faixa lisa da abraçadeira. */
export function textureMask(
  params: CanHolderGeometryParams,
  y: number,
  wallMin: number,
  wallMax: number,
): number {
  const depth = getEffectiveTextureDepth(params)
  const fade = Math.max(TEXTURE_EDGE_FADE_MM, 2 * depth)
  let mask = Math.min(
    smoothstep(wallMin, wallMin + fade, y),
    1 - smoothstep(wallMax - fade, wallMax, y),
  )
  if (params.handleEnabled) {
    const bandMin = params.handleHeight - params.handleWidth / 2 - TEXTURE_HANDLE_GAP_MM
    const bandMax = params.handleHeight + params.handleWidth / 2 + TEXTURE_HANDLE_GAP_MM
    const bandFade = Math.max(TEXTURE_HANDLE_FADE_MM, 2 * depth)
    // 1 fora da faixa, 0 dentro dela, com transição suave nas duas pontas.
    mask *= Math.max(
      smoothstep(bandMax, bandMax + bandFade, y),
      1 - smoothstep(bandMin - bandFade, bandMin, y),
    )
  }
  return mask
}

/** Deslocamento radial efetivo em mm. */
export function textureDisplacement(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
  wallMin: number,
  wallMax: number,
): number {
  if (params.textureStyle === 'none') return 0
  return textureHeight(params, theta, y) * textureMask(params, y, wallMin, wallMax)
}
