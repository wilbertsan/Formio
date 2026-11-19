import {
  TEXTURE_EDGE_FADE_MM,
  TEXTURE_HANDLE_FADE_MM,
  TEXTURE_HANDLE_GAP_MM,
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

function woodHeight(params: CanHolderGeometryParams, theta: number, y: number): number {
  const cells = cellsAround(params)
  const warp = 0.35 * Math.sin(TAU * (y / (params.textureScale * 2.5)))
  const grain = 0.5 + 0.5 * Math.sin(TAU * ((theta / TAU) * cells + warp))
  return params.textureDepth * grain
}

function metalHeight(params: CanHolderGeometryParams, theta: number, y: number): number {
  const cells = cellsAround(params)
  const u = theta / TAU
  const a = Math.sin(TAU * (u * cells + y / params.textureScale))
  const b = Math.sin(TAU * (u * cells - y / params.textureScale))
  return params.textureDepth * 0.5 * (1 + 0.5 * (a + b))
}

function scalesHeight(params: CanHolderGeometryParams, theta: number, y: number): number {
  const cells = cellsAround(params)
  const circumference = TAU * getOuterRadius(params)
  const cellW = circumference / cells
  const rowH = params.textureScale * 0.6
  const radius = params.textureScale * 0.55
  const arc = theta * getOuterRadius(params)
  const row = Math.floor(y / rowH)
  let best = 0

  for (const current of [row - 1, row]) {
    const offset = wrap(current, 2) === 0 ? 0 : cellW / 2
    const centerArc = (Math.floor((arc - offset) / cellW) + 0.5) * cellW + offset
    const dx = wrap(arc - centerArc + cellW / 2, cellW) - cellW / 2
    const dy = y - (current + 0.5) * rowH
    const distance = (dx * dx + dy * dy) / (radius * radius)
    if (distance < 1) best = Math.max(best, 1 - distance)
  }

  return params.textureDepth * best
}

function wavesHeight(params: CanHolderGeometryParams, theta: number, y: number): number {
  const cells = cellsAround(params)
  const u = theta / TAU
  const phase = y / params.textureScale + 0.18 * Math.sin(TAU * u * cells)
  return params.textureDepth * (0.5 + 0.5 * Math.sin(TAU * phase))
}

function stoneHeight(params: CanHolderGeometryParams, theta: number, y: number): number {
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

  return (
    params.textureDepth *
    (0.6 * octave(cells, cellSize, 0) + 0.4 * octave(cells * 2, cellSize / 2, 31))
  )
}

function spikesHeight(params: CanHolderGeometryParams, theta: number, y: number): number {
  const radius = getOuterRadius(params)
  const cells = cellsAround(params)
  const cellW = (TAU * radius) / cells
  const rowH = params.textureScale * 0.75
  const half = Math.max(params.textureDepth, params.textureScale * 0.3)
  const arc = theta * radius
  const row = Math.floor(y / rowH)
  const offset = wrap(row, 2) === 0 ? 0 : cellW / 2
  const centerArc = (Math.floor((arc - offset) / cellW) + 0.5) * cellW + offset
  const dx = wrap(arc - centerArc + cellW / 2, cellW) - cellW / 2
  const dy = y - (row + 0.5) * rowH
  const distance = (Math.abs(dx) + Math.abs(dy)) / half
  return params.textureDepth * Math.max(0, 1 - distance)
}

/** Altura do padrão em 0..depth, sem máscaras. */
export function textureHeight(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
): number {
  switch (params.textureStyle) {
    case 'none':
      return 0
    case 'wood':
      return woodHeight(params, theta, y)
    case 'metal':
      return metalHeight(params, theta, y)
    case 'scales':
      return scalesHeight(params, theta, y)
    case 'waves':
      return wavesHeight(params, theta, y)
    case 'stone':
      return stoneHeight(params, theta, y)
    case 'spikes':
      return spikesHeight(params, theta, y)
  }
}

/** Máscara 0..1: fade nas bordas da parede e faixa lisa da abraçadeira. */
export function textureMask(
  params: CanHolderGeometryParams,
  y: number,
  wallMin: number,
  wallMax: number,
): number {
  const fade = Math.min(TEXTURE_EDGE_FADE_MM, (wallMax - wallMin) / 4)
  let mask = Math.min(
    smoothstep(wallMin, wallMin + fade, y),
    1 - smoothstep(wallMax - fade, wallMax, y),
  )
  if (params.handleEnabled) {
    const bandMin = params.handleHeight - params.handleWidth / 2 - TEXTURE_HANDLE_GAP_MM
    const bandMax = params.handleHeight + params.handleWidth / 2 + TEXTURE_HANDLE_GAP_MM
    // 1 fora da faixa, 0 dentro dela, com transição suave nas duas pontas.
    mask *= Math.max(
      smoothstep(bandMax, bandMax + TEXTURE_HANDLE_FADE_MM, y),
      1 - smoothstep(bandMin - TEXTURE_HANDLE_FADE_MM, bandMin, y),
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
