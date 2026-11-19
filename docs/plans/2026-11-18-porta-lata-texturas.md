# Texturas do porta-lata — Plano de implementação

> **Para quem executa:** REQUIRED SUB-SKILL: use `superpowers:executing-plans`
> para implementar este plano tarefa a tarefa.

**Objetivo:** adicionar seis texturas em relevo positivo (madeira, metal,
escamas, onduladas, pedra, pontiagudo) à parede do porta-lata, com faixa lisa na
abraçadeira e texto elevado acima dos picos.

**Arquitetura:** um módulo `texture.ts` com funções de altura determinísticas e
periódicas em θ; o `buildBody` subdivide a parede do perfil, gera o
`LatheGeometry` com 256 segmentos e desloca radialmente só os vértices da
parede. O `buildRelief` passa a extrudar o envelope da textura para o nome ficar
1 mm acima do pico. O restante (alça, anéis, validação consultiva) não muda.

**Stack:** React 19, TypeScript strict, Three.js, Zod, Vitest, Amplify UI.

**Design aprovado:** `docs/plans/2026-11-18-porta-lata-texturas-design.md`.

**Regras do projeto:** 1 unidade = 1 mm; sem `any`; sem código morto; commits
semânticos; malha fechada e single-shell; build em worker; cor não rebuilda.

---

## Task 1: Schema, parâmetros e derivados da textura

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/schema.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts`

**Step 1: escrever os testes que falham**

No import de `schema.test.ts`, adicione `TEXTURE_STYLES`,
`getTextureEnvelope`, `getMaxOuterDiameter` (se ainda não estiver) e
`getOuterDiameter`.

No teste `defaults válidos`, adicione ao `toMatchObject` depois de `edgeRimWidth`:

```ts
      textureStyle: 'none',
      textureDepth: 0.8,
      textureScale: 8,
```

Adicione um teste novo:

```ts
  it('valida o estilo e as faixas da textura', () => {
    for (const style of TEXTURE_STYLES) {
      expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, textureStyle: style }).success).toBe(true)
    }
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, textureStyle: 'sand' }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, textureDepth: 0.3 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, textureDepth: 1.6 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, textureScale: 3.9 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, textureScale: 16.1 }).success).toBe(false)
  })

  it('calcula o envelope e o diâmetro externo com textura', () => {
    expect(getTextureEnvelope(defaultCanHolderParams)).toBe(0)
    expect(getMaxOuterDiameter(defaultCanHolderParams)).toBeCloseTo(74.6, 5)

    const textured = {
      ...defaultCanHolderParams,
      textureStyle: 'wood' as const,
      textureDepth: 0.6,
    }
    // O anel (1,0 mm) ainda é o maior envelope.
    expect(getTextureEnvelope(textured)).toBeCloseTo(0.6, 5)
    expect(getMaxOuterDiameter(textured)).toBeCloseTo(74.6, 5)

    const deep = { ...textured, textureDepth: 1.5 }
    expect(getMaxOuterDiameter(deep)).toBeCloseTo(75.6, 5)
  })
```

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts
```

Esperado: falha de import/expecativa de campos.

**Step 3: implementar**

Em `schema.ts`, depois de `FONT_STYLES`:

```ts
export const TEXTURE_STYLES = [
  'none', 'wood', 'metal', 'scales', 'waves', 'stone', 'spikes',
] as const
export type TextureStyle = (typeof TEXTURE_STYLES)[number]

export const TEXTURE_RADIAL_SEGMENTS = 256
export const TEXTURE_STEP_MM = 1
export const TEXTURE_EDGE_FADE_MM = 2
export const TEXTURE_HANDLE_GAP_MM = 1
export const TEXTURE_HANDLE_FADE_MM = 2
```

No `canHolderParamsSchema`, depois de `edgeRimWidth`:

```ts
  textureStyle: z.enum(TEXTURE_STYLES),
  textureDepth: z.number().min(0.4).max(1.5),
  textureScale: z.number().min(4).max(16),
```

Em `defaultCanHolderParams`, depois de `edgeRimWidth`:

```ts
  textureStyle: 'none',
  textureDepth: 0.8,
  textureScale: 8,
```

Depois de `getEffectiveRingProtrusion`:

```ts
/** Envelope radial da textura: 0 com `none`, senão a profundidade. */
export function getTextureEnvelope(params: CanHolderGeometryParams): number {
  return params.textureStyle === 'none' ? 0 : params.textureDepth
}
```

Substitua `getMaxOuterDiameter`:

```ts
/** Diâmetro externo do corpo com anéis e textura (não inclui o relevo do texto). */
export function getMaxOuterDiameter(params: CanHolderGeometryParams): number {
  const envelope = Math.max(
    getEffectiveRingProtrusion(params),
    getTextureEnvelope(params),
  )
  return getOuterDiameter(params) + 2 * envelope
}
```

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts
```

Esperado: todos passando.

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/schema.ts tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts
git commit -m "feat: add can holder texture parameters"
```

---

## Task 2: Módulo de texturas (campo de altura e máscaras)

**Arquivos:**
- Criar: `src/features/studio/tools/lembrancinhas/porta-lata/texture.ts`
- Criar: `tests/features/studio/tools/lembrancinhas/porta-lata/texture.test.ts`

**Step 1: escrever os testes que falham**

```ts
import { describe, it, expect } from 'vitest'
import {
  textureDisplacement,
  textureHeight,
  textureMask,
} from '@/features/studio/tools/lembrancinhas/porta-lata/texture'
import {
  TEXTURE_STYLES,
  defaultCanHolderParams,
  type CanHolderGeometryParams,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'

function withParams(overrides: Partial<CanHolderGeometryParams>): CanHolderGeometryParams {
  return { ...defaultCanHolderParams, ...overrides }
}

const WALL_MIN = 6
const WALL_MAX = 105.2
const TAU = Math.PI * 2

describe('texturas do porta-lata', () => {
  it('devolve 0 para o estilo none', () => {
    for (const theta of [0, 1, 3]) {
      for (const y of [10, 60, 100]) {
        expect(textureHeight(defaultCanHolderParams, theta, y)).toBe(0)
        expect(textureDisplacement(defaultCanHolderParams, theta, y, WALL_MIN, WALL_MAX)).toBe(0)
      }
    }
  })

  it('mantém todos os estilos em 0..profundidade, periódicos e determinísticos', () => {
    for (const style of TEXTURE_STYLES.filter((value) => value !== 'none')) {
      const params = withParams({ textureStyle: style, textureDepth: 1.5 })
      for (let i = 0; i < 24; i++) {
        const theta = (i / 24) * TAU
        for (const y of [12, 40, 70, 100]) {
          const height = textureHeight(params, theta, y)
          expect.soft(height, `${style} em ${theta}/${y}`).toBeGreaterThanOrEqual(0)
          expect.soft(height, `${style} em ${theta}/${y}`).toBeLessThanOrEqual(1.5 + 1e-9)
          expect(textureHeight(params, theta, y)).toBeCloseTo(height, 12)
        }
        expect.soft(textureHeight(params, theta, 60), `${style} em 0`).toBeCloseTo(
          textureHeight(params, theta + TAU, 60),
          9,
        )
      }
    }
  })

  it('gera padrões diferentes por estilo', () => {
    const samples = TEXTURE_STYLES.filter((style) => style !== 'none').map((style) => {
      const params = withParams({ textureStyle: style })
      return [20, 50, 80].map((y) => textureHeight(params, 1.3, y).toFixed(4)).join('|')
    })
    expect(new Set(samples).size).toBe(samples.length)
  })

  it('zera a máscara nas bordas da parede', () => {
    const params = withParams({ textureStyle: 'wood' })
    expect(textureMask(params, WALL_MIN, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, WALL_MAX, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, (WALL_MIN + WALL_MAX) / 2, WALL_MIN, WALL_MAX)).toBeCloseTo(1, 6)
  })

  it('zera a máscara na faixa da abraçadeira', () => {
    const params = withParams({ textureStyle: 'wood', handleHeight: 60, handleWidth: 12 })
    const bandMin = 60 - 6 - 1
    const bandMax = 60 + 6 + 1
    expect(textureMask(params, bandMin, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, bandMax, WALL_MIN, WALL_MAX)).toBe(0)
    expect(textureMask(params, 60, WALL_MIN, WALL_MAX)).toBe(0)

    const noHandle = withParams({ ...params, handleEnabled: false })
    expect(textureMask(noHandle, 60, WALL_MIN, WALL_MAX)).toBeGreaterThan(0)
  })

  it('nunca desloca mais que a profundidade', () => {
    for (const style of TEXTURE_STYLES.filter((value) => value !== 'none')) {
      const params = withParams({ textureStyle: style, textureDepth: 1.5 })
      for (let i = 0; i < 48; i++) {
        const theta = (i / 48) * TAU
        for (const y of [10, 30, 60, 90]) {
          const h = textureDisplacement(params, theta, y, WALL_MIN, WALL_MAX)
          expect.soft(h, `${style} em ${y}`).toBeGreaterThanOrEqual(0)
          expect.soft(h, `${style} em ${y}`).toBeLessThanOrEqual(1.5 + 1e-9)
        }
      }
    }
  })
})
```

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/texture.test.ts
```

Esperado: falha de import do módulo.

**Step 3: implementar `texture.ts`**

```ts
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
    case 'none': return 0
    case 'wood': return woodHeight(params, theta, y)
    case 'metal': return metalHeight(params, theta, y)
    case 'scales': return scalesHeight(params, theta, y)
    case 'waves': return wavesHeight(params, theta, y)
    case 'stone': return stoneHeight(params, theta, y)
    case 'spikes': return spikesHeight(params, theta, y)
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
```

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/texture.test.ts
```

Esperado: 6 testes passando.

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/texture.ts tests/features/studio/tools/lembrancinhas/porta-lata/texture.test.ts
git commit -m "feat: add can holder texture height field"
```

---

## Task 3: Parede subdividida e deslocamento no buildBody

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/buildBody.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts`

**Step 1: testes que falham**

No import de `buildBody.test.ts`, adicione `findOuterWall` de `buildBody` e
`TEXTURE_STYLES` de `schema`.

Adicione:

```ts
  it('encontra a parede externa no perfil com e sem anéis', () => {
    const params = defaultCanHolderParams
    const innerRadius = getInnerDiameter(params) / 2
    const withRings = findOuterWall(bodyProfile(params), innerRadius)
    expect(withRings.min).toBeCloseTo(params.edgeRimWidth, 6)
    expect(withRings.max).toBeCloseTo(getOuterHeight(params) - params.edgeRimWidth, 6)
    expect(withRings.radius).toBeCloseTo(getOuterRadius(params), 6)

    const withoutRings = { ...params, edgeRimEnabled: false }
    const wall = findOuterWall(bodyProfile(withoutRings), getInnerDiameter(withoutRings) / 2)
    expect(wall.radius).toBeCloseTo(getOuterRadius(withoutRings), 6)
    expect(wall.max).toBeCloseTo(
      getOuterHeight(withoutRings) - getEffectiveRimChamfer(withoutRings),
      6,
    )
  })

  it.each(TEXTURE_STYLES.filter((style) => style !== 'none'))(
    'fecha o corpo texturizado (%s)',
    (style) => {
      const params = { ...defaultCanHolderParams, textureStyle: style, textureDepth: 1.5 }
      const geometry = buildBody(params)
      geometry.computeBoundingBox()
      const box = geometry.boundingBox!
      const outerR = getOuterRadius(params)

      expect(isClosed(geometry)).toBe(true)
      expect(countShells(geometry)).toBe(1)
      expect(signedVolume(geometry)).toBeGreaterThan(0)
      expect(box.max.y).toBeCloseTo(getOuterHeight(params), 3)
      expect(box.max.x).toBeGreaterThan(outerR + 1.5 * 0.9)
      expect(box.max.x).toBeLessThanOrEqual(outerR + 1.5 + 1e-3)
      geometry.dispose()
    },
  )

  it('mantém a faixa da abraçadeira lisa', () => {
    const params = {
      ...defaultCanHolderParams,
      textureStyle: 'spikes' as const,
      textureDepth: 1.5,
    }
    const geometry = buildBody(params)
    const position = geometry.getAttribute('position')
    const outerR = getOuterRadius(params)
    const innerR = getInnerDiameter(params) / 2
    const bandMin = params.handleHeight - params.handleWidth / 2
    const bandMax = params.handleHeight + params.handleWidth / 2

    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i)
      if (y <= bandMin || y >= bandMax) continue
      const radius = Math.hypot(position.getX(i), position.getZ(i))
      if (radius < innerR + 0.5) continue
      expect.soft(radius, `vértice ${i} em y=${y}`).toBeCloseTo(outerR, 4)
    }
    geometry.dispose()
  })
```

Nota: para `box.max.x` ser o pico, o `LatheGeometry` precisa ter um vértice em
θ = 0; ele tem. Se a amostragem não cair no pico exato, a asserção
`> outerR + 0.9 * depth` cobre.

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts
```

Esperado: `findOuterWall` não existe e os testes de textura falham.

**Step 3: implementar**

Substitua `buildBody.ts` por:

```ts
import { BufferAttribute, BufferGeometry, LatheGeometry, Vector2 } from 'three'
import { removeDegenerateTriangles } from './geometryCleanup'
import { bodyProfile } from './shapes'
import { textureDisplacement } from './texture'
import {
  HOLDER_SEGMENTS,
  TEXTURE_RADIAL_SEGMENTS,
  TEXTURE_STEP_MM,
  getInnerDiameter,
  type CanHolderGeometryParams,
} from './schema'

export interface OuterWall {
  /** Índice do ponto inicial do segmento vertical da parede. */
  index: number
  radius: number
  min: number
  max: number
}

/**
 * Parede externa: o segmento vertical mais longo fora da cavidade. Com anéis é
 * o trecho entre eles; sem anéis, vai da base ao chanfro da borda.
 */
export function findOuterWall(profile: Vector2[], innerRadius: number): OuterWall {
  let wall: OuterWall | null = null
  for (let index = 0; index < profile.length - 1; index++) {
    const start = profile[index]
    const end = profile[index + 1]
    if (Math.abs(start.x - end.x) > 1e-6) continue
    if (start.x <= innerRadius + 1e-6) continue
    const min = Math.min(start.y, end.y)
    const max = Math.max(start.y, end.y)
    if (!wall || max - min > wall.max - wall.min) {
      wall = { index, radius: start.x, min, max }
    }
  }
  if (!wall) throw new Error('Perfil sem parede externa')
  return wall
}

function subdivideWall(profile: Vector2[], wall: OuterWall): Vector2[] {
  const steps = Math.max(1, Math.ceil((wall.max - wall.min) / TEXTURE_STEP_MM))
  const direction = profile[wall.index + 1].y >= profile[wall.index].y ? 1 : -1
  const points: Vector2[] = []

  profile.forEach((point, index) => {
    points.push(point)
    if (index !== wall.index) return
    for (let step = 1; step < steps; step++) {
      const y = point.y + direction * (wall.max - wall.min) * (step / steps)
      points.push(new Vector2(wall.radius, y))
    }
  })

  return points
}

function displaceWall(
  geometry: BufferGeometry,
  params: CanHolderGeometryParams,
  wall: OuterWall,
): void {
  const position = geometry.getAttribute('position') as BufferAttribute

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    if (y < wall.min - 1e-4 || y > wall.max + 1e-4) continue
    const radius = Math.hypot(x, z)
    if (Math.abs(radius - wall.radius) > 1e-4) continue

    const height = textureDisplacement(params, Math.atan2(z, x), y, wall.min, wall.max)
    if (height <= 0) continue

    const scale = (wall.radius + height) / radius
    position.setX(i, x * scale)
    position.setZ(i, z * scale)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}

export function buildBody(params: CanHolderGeometryParams): BufferGeometry {
  if (params.textureStyle === 'none') {
    return removeDegenerateTriangles(
      new LatheGeometry(bodyProfile(params), HOLDER_SEGMENTS),
    )
  }

  const profile = bodyProfile(params)
  const wall = findOuterWall(profile, getInnerDiameter(params) / 2)
  const geometry = new LatheGeometry(
    subdivideWall(profile, wall),
    TEXTURE_RADIAL_SEGMENTS,
  )
  displaceWall(geometry, params, wall)
  return removeDegenerateTriangles(geometry)
}
```

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts
```

Esperado: todos passando, inclusive manifold nos 6 estilos.

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/buildBody.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts
git commit -m "feat: displace can holder wall with textures"
```

---

## Task 4: Texto elevado pelo envelope da textura

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/buildRelief.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts`

**Step 1: teste que falha**

Adicione em `buildRelief.test.ts`:

```ts
  it('eleva o relevo acima do envelope da textura', () => {
    const params = {
      ...defaultCanHolderParams,
      textureStyle: 'wood' as const,
      textureDepth: 1.5,
    }
    const geometry = buildRelief(rectangleFont(10, 4), params)!
    const position = geometry.getAttribute('position')
    let maxRadius = 0
    for (let i = 0; i < position.count; i++) {
      maxRadius = Math.max(
        maxRadius,
        Math.hypot(position.getX(i), position.getZ(i)),
      )
    }
    expect(maxRadius).toBeCloseTo(getOuterRadius(params) + 1.5 + 1, 5)
    geometry.dispose()
  })
```

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts
```

Esperado: raio máximo em `outerR + 1` (sem o envelope).

**Step 3: implementar**

Em `buildRelief.ts`:
1. importe `getTextureEnvelope` de `./schema`.
2. no início de `buildRelief`, calcule `const envelope = getTextureEnvelope(params)`.
3. troque a extrusão:

```ts
  const rawFlat = shapesToGeometry(
    shapes,
    CONTENT_DEPTH + RELIEF_EMBED + envelope,
    false,
  )
```

4. troque o raio de curvatura:

```ts
  const centerRadius = getOuterRadius(params) + envelope
```

5. mantenha a conversão radial com a base embutida na parede:

```ts
    const radius = getOuterRadius(params) + localZ - RELIEF_EMBED
```

Assim a base continua em `outerR − 0,2` e a frente em
`outerR + 1 + envelope`.

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts
```

Esperado: todos passando.

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/buildRelief.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts
git commit -m "feat: lift can holder text above the texture"
```

---

## Task 5: Hook e painel

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.ts`
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.tsx`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx`

**Step 1: testes que falham**

Em `useCanHolder.test.ts`:
- em `envia ao worker após o debounce sem as cores`, adicione depois de `edgeRimWidth`:

```ts
      textureStyle: 'none',
      textureDepth: 0.8,
      textureScale: 8,
```

- em `faz clamp dos campos numéricos`, adicione `textureDepth` (9 → 1.5; 0 → 0.4)
  e `textureScale` (1 → 4; 99 → 16) nos dois blocos;
- adicione:

```ts
  it('aumenta o diâmetro externo com textura profunda', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('textureStyle', 'wood')
      result.current.updateParam('textureDepth', 1.5)
    })
    expect(result.current.outerDiameter).toBeCloseTo(75.6, 5)
  })
```

Em `StudioPanel.test.tsx`:
- `SLIDER_RANGES`: adicione `{ name: 'Profundidade da textura', min: 0.4, max: 1.5 }`
  e `{ name: 'Escala da textura', min: 4, max: 16 }`; o total passa a 19;
- o teste de seções passa a sete, com "Textura" entre Bordas e Alça;
- adicione:

```ts
const TEXTURE_SLIDERS = ['Profundidade da textura', 'Escala da textura'] as const
const TEXTURE_DISABLED_HINT = 'Escolha um estilo para ajustar os parâmetros.'

  it('desabilita os sliders da textura sem estilo', () => {
    const onUpdateParam = vi.fn()
    const { rerender } = render(
      <StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />,
    )
    for (const name of TEXTURE_SLIDERS) {
      expect.soft(screen.getByRole('slider', { name }), name).toHaveAttribute(
        'data-disabled',
      )
    }
    expect(screen.getByText(TEXTURE_DISABLED_HINT)).toBeDefined()

    fireEvent.change(screen.getByLabelText('Estilo da textura'), {
      target: { value: 'wood' },
    })
    expect(onUpdateParam).toHaveBeenCalledWith('textureStyle', 'wood')

    onUpdateParam.mockClear()
    rerender(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultCanHolderParams, textureStyle: 'wood' }}
        onUpdateParam={onUpdateParam}
      />,
    )
    for (const name of TEXTURE_SLIDERS) {
      expect.soft(screen.getByRole('slider', { name }), name).not.toHaveAttribute(
        'data-disabled',
      )
    }
    expect(screen.queryByText(TEXTURE_DISABLED_HINT)).toBeNull()
  })
```

**Step 2: rodar e confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx
```

**Step 3: implementar**

Em `useCanHolder.ts`:
- `NUMERIC_RANGES` depois de `edgeRimWidth`:

```ts
  textureDepth: { min: 0.4, max: 1.5 },
  textureScale: { min: 4, max: 16 },
```

- desestruture `textureStyle, textureDepth, textureScale` de `params` depois de
  `edgeRimWidth` e inclua os três no objeto e nas dependências de `buildParams`.

Em `StudioPanel.tsx`:
- importe `TEXTURE_STYLES`, `type TextureStyle` e ajuste o import existente.
- adicione os labels e o type guard ao lado de `FONT_STYLE_LABELS`:

```ts
const TEXTURE_STYLE_LABELS: Record<TextureStyle, string> = {
  none: 'Nenhuma',
  wood: 'Madeira',
  metal: 'Metal',
  scales: 'Escamas',
  waves: 'Onduladas',
  stone: 'Pedra',
  spikes: 'Pontiagudo',
}

function isTextureStyle(value: string): value is TextureStyle {
  return TEXTURE_STYLES.some((style) => style === value)
}
```

- adicione o acordeão entre `bordas` e `alca`:

```tsx
        <Accordion.Item value="textura">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Textura</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Estilo da textura"
                value={params.textureStyle}
                onChange={(event) => {
                  if (isTextureStyle(event.target.value)) {
                    onUpdateParam('textureStyle', event.target.value)
                  }
                }}
              >
                {TEXTURE_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {TEXTURE_STYLE_LABELS[style]}
                  </option>
                ))}
              </SelectField>
              <LabeledSlider label="Profundidade da textura" value={params.textureDepth} min={0.4} max={1.5} step={0.1} isDisabled={params.textureStyle === 'none'} onChange={(value) => onUpdateParam('textureDepth', value)} />
              <LabeledSlider label="Escala da textura" value={params.textureScale} min={4} max={16} step={1} isDisabled={params.textureStyle === 'none'} onChange={(value) => onUpdateParam('textureScale', value)} />
              {params.textureStyle === 'none' ? (
                <Text fontSize="xs" color="font.secondary">
                  Escolha um estilo para ajustar os parâmetros.
                </Text>
              ) : (
                <Text fontSize="xs" color="font.secondary">
                  Relevo positivo. A faixa da alça fica lisa e o nome fica 1 mm acima da textura.
                </Text>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
```

**Step 4: rodar e confirmar o sucesso**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx
```

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.ts src/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.tsx tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx
git commit -m "feat: add can holder texture controls"
```

---

## Task 6: Build completo, manifold e performance

**Arquivos:**
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts`

**Step 1: escrever o teste**

No `it.each` de manifold do build completo, adicione:

```ts
    { name: 'textura de madeira', params: { textureStyle: 'wood', textureDepth: 1.2 } },
    { name: 'textura pontiaguda', params: { textureStyle: 'spikes', textureDepth: 1.5 } },
```

Adicione:

```ts
  it('une o texto a um corpo texturizado sem perder casca', () => {
    const params = {
      ...defaultCanHolderParams,
      textureStyle: 'scales' as const,
      textureDepth: 1.2,
    }
    const result = buildCanHolder(params, realFont())
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(0)
    expect(result.handle).not.toBeNull()
    disposeCanHolderResult(result)
  })
```

**Step 2: rodar e medir**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts
```

Registre o tempo de CPU do arquivo. O teste de build default já tem gate de 4 s
de CPU. Se o corpo texturizado ficar acima de ~2,5 s, reduza
`TEXTURE_RADIAL_SEGMENTS` para 192 e `TEXTURE_STEP_MM` para 1,2 — atualize a
constante no schema e re-rode. Se ficar abaixo, mantenha 256/1,0.

**Step 3: commit**

```bash
git add tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts
git commit -m "test: cover textured can holder full build"
```

---

## Task 7: Documentação

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/AGENTS.md`
- Modificar: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modificar: `docs/frontend/studio.md`
- Modificar: `docs/plans/2026-11-18-porta-lata-texturas-design.md`

**Step 1: `porta-lata/AGENTS.md`**

- Status/objetivo: seis texturas em relevo positivo.
- Parâmetros: tabela `textureStyle`/`textureDepth`/`textureScale` e as
  constantes de resolução.
- Regras: estilos determinísticos/ periódicos, parede subdividida, deslocamento
  só em `outerR`, máscara de borda e faixa da alça, anéis lisos, texto elevado
  pelo envelope, alça sem textura.
- Pipeline: incluir `texture.ts` e o deslocamento.
- Derivados: diâmetro máximo com `max(anel, textura)`.
- Validação: nenhum código novo; explicar que a validação segue consultiva.
- Exportação: corpo em pé, textura faz parte do corpo.
- Decisões: campo de altura, positivo, faixa lisa, pedra com interpolação
  suave, resolução 256/1 mm (ou o valor final medido).
- Riscos: custo de malha/CSG e aliasing.
- Fora de escopo: textura em anéis/cavidade/alça, entalhe, materiais no preview.

**Step 2: `lembrancinhas/AGENTS.md`**

Na regra do porta-lata, acrescentar a textura positiva na parede, faixa lisa na
alça e texto acima do relevo.

**Step 3: `docs/frontend/studio.md`**

Na seção Porta-lata: mencionar `texture.ts`, os três parâmetros, a subdivisão
256/1 mm, a máscara da alça, o texto elevado, `getMaxOuterDiameter` com textura,
o painel (7 seções, 19 sliders) e o limite de build medido.

**Step 4: marcar o design**

Em `docs/plans/2026-11-18-porta-lata-texturas-design.md`, status
`design aprovado; implementado` e registrar desvios (resolução final, ajuste da
pedra para interpolação suave, qualquer mudança de faixa).

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/AGENTS.md src/features/studio/tools/lembrancinhas/AGENTS.md docs/frontend/studio.md docs/plans/2026-11-18-porta-lata-texturas-design.md
git commit -m "docs: document can holder textures"
```

---

## Task 8: Verificação final

**Step 1: suíte da ferramenta**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata
```

Esperado: todos os arquivos passando.

**Step 2: suíte completa**

```bash
npm test
```

Esperado: sem regressões fora do porta-lata.

**Step 3: typecheck, lint e build**

```bash
npm run typecheck
npm run lint
npm run build
```

Esperado: limpos.

**Step 4: revisão manual**

- Abrir o Studio e conferir os seis estilos no preview (rotação completa).
- Confirmar: anéis lisos, faixa da alça lisa, texto 1 mm acima do relevo.
- Desligar a textura e confirmar que o corpo volta ao atual.
- Testar textura máxima (1,5 mm) com profundidade de cavidade mínima.
- Conferir o status bar: 74.6 mm sem textura e 75.6 mm com 1,5 mm.
- Exportar e abrir os STLs: corpo e alça fechados/manifold.

**Step 5: commit final (se houver ajuste)**

```bash
git add -A
git commit -m "fix: polish can holder textures"
```
