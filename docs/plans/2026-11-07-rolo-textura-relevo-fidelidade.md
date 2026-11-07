# Rolo de Textura — Fidelidade do Relevo Implementation Plan

> **For the executing agent:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Read `docs/plans/2026-11-07-rolo-textura-relevo-fidelidade-design.md` before starting.

**Goal:** Reconstruir o relevo do Rolo de Textura com escala uniforme, slider de escala e garantia de 0,8 mm para motivos internos e SVG.

**Architecture:** O `buildRelief` passa a orquestrar um novo `reliefLayout` (grade, escala uniforme, dilatação mínima, repetição, emenda e recorte) e um helper SVG compartilhado. Corpo, worker, preview, exportação e integração permanecem inalterados.

**Tech Stack:** React 19, TypeScript strict, Three.js, Clipper (`js-clipper`), Zod, Vitest.

---

## Convenções de execução

- Trabalhe a partir de `/opt/projects/BELIS3D`.
- Rode um teste por vez com:
  `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/<arquivo>.test.ts`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Commits semânticos em português, um por tarefa.
- Não altere `buildBody.ts`, `buildTextureRoller.worker.ts`, `workerClient.ts`, `workerGeometry.ts`, `TextureRollerPreview.tsx` nem `exportStl.ts`.

---

### Task 1: Adicionar `patternScale` ao schema

**Files:**
- Modify: `src/features/studio/tools/confeitaria/rolo-textura/schema.ts`
- Test: `tests/features/studio/tools/confeitaria/rolo-textura/schema.test.ts`

**Step 1: Write the failing test**

Adicione ao final de `schema.test.ts`, dentro do `describe`:

```ts
it('aceita patternScale de 0,4 a 1 e usa 1 como default', () => {
  expect(defaultTextureRollerParams.patternScale).toBe(1)
  expect(textureRollerParamsSchema.safeParse({
    ...defaultTextureRollerParams, patternScale: 0.4,
  }).success).toBe(true)
  expect(textureRollerParamsSchema.safeParse({
    ...defaultTextureRollerParams, patternScale: 1,
  }).success).toBe(true)
  expect(textureRollerParamsSchema.safeParse({
    ...defaultTextureRollerParams, patternScale: 0.39,
  }).success).toBe(false)
  expect(textureRollerParamsSchema.safeParse({
    ...defaultTextureRollerParams, patternScale: 1.01,
  }).success).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/schema.test.ts`
Expected: FAIL — `patternScale` não existe em `defaultTextureRollerParams`/schema.

**Step 3: Write minimal implementation**

Em `schema.ts`, adicione a constante depois de `MIN_FEATURE_MM`:

```ts
/** Fração da célula ocupada pelo SVG antes da escala do usuário. */
export const PATTERN_FILL_RATIO = 0.88
```

Adicione o campo no schema, antes de `reliefDepth`:

```ts
  patternScale: z.number().min(0.4).max(1),
```

Adicione o default:

```ts
  patternScale: 1,
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/rolo-textura/schema.ts \
  tests/features/studio/tools/confeitaria/rolo-textura/schema.test.ts
git commit -m "feat(rolo-textura): adiciona escala do padrão ao schema"
```

---

### Task 2: Declarar espessura mínima e overlap dos motivos

**Files:**
- Modify: `src/features/studio/tools/confeitaria/rolo-textura/patterns.ts`
- Test: `tests/features/studio/tools/confeitaria/rolo-textura/patterns.test.ts`

**Step 1: Write the failing tests**

Em `patterns.test.ts`, importe `MOTIF_MIN_THICKNESS`:

```ts
import {
  motifShapes, isStaggered, MOTIF_MIN_THICKNESS,
} from '@/features/studio/tools/confeitaria/rolo-textura/patterns'
```

Troque o helper `ysAtX` por uma versão com tolerância:

```ts
const ysAtX = (points: Point2[], x: number): number[] =>
  points.filter((p) => Math.abs(p.x - x) < 1e-6).map((p) => p.y).sort((a, b) => a - b)
```

Substitua o teste `'ondas e chevrons tocam a borda em X (continuidade)'` por:

```ts
it('ondas e chevrons ultrapassam a célula e continuam alinhados em X', () => {
  for (const m of ['waves', 'chevrons'] as const) {
    const points = allPoints(motifShapes('wave', m))
    const xs = points.map((p) => p.x)
    expect(Math.min(...xs)).toBeCloseTo(-0.6, 5)
    expect(Math.max(...xs)).toBeCloseTo(0.6, 5)

    const left = ysAtX(points, -0.5)
    const right = ysAtX(points, 0.5)
    expect(left.length).toBeGreaterThan(0)
    expect(left).toHaveLength(right.length)
    left.forEach((y, i) => expect(y).toBeCloseTo(right[i], 5))
  }
})

it('declara espessura mínima para todos os motivos', () => {
  for (const motifs of Object.values(MOTIFS_BY_FAMILY)) {
    for (const motif of motifs) {
      expect(MOTIF_MIN_THICKNESS[motif as PatternMotif]).toBeGreaterThan(0)
    }
  }
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/patterns.test.ts`
Expected: FAIL — `MOTIF_MIN_THICKNESS` não existe e ondas ainda vão de -0,5 a 0,5.

**Step 3: Write minimal implementation**

Em `patterns.ts`, adicione depois de `PatternMotif`:

```ts
/** Espessura local mais fina de cada motivo, em unidades de célula. */
export const MOTIF_MIN_THICKNESS: Record<PatternMotif, number> = {
  diamonds: 0.59,
  dots: 0.76,
  grid: 0.18,
  waves: 0.32,
  chevrons: 0.28,
  scales: 0.4,
  flower: 0.16,
  leaf: 0.1,
  rosette: 0.15,
}
```

Ajuste `waveBand` para ultrapassar a célula em 0,1 de cada lado (total 1,2) e
amostrar exatamente `-0,5` e `0,5`:

```ts
function waveBand(shape: (x: number) => number, half: number, steps = 120): Point2[] {
  const top: Point2[] = []
  const bottom: Point2[] = []
  const minX = -0.6
  const maxX = 0.6
  for (let i = 0; i <= steps; i++) {
    const x = minX + ((maxX - minX) * i) / steps
    const y = shape(x)
    top.push({ x, y: y + half })
    bottom.push({ x, y: y - half })
  }
  return [...top, ...bottom.reverse()]
}
```

Não altere `STAGGERED` nem os builders.

Ajuste também o teste `'${family}/${motif} tem geometria dentro da célula'` para
aceitar o overlap dos contínuos:

```ts
const xLimit = motif === 'waves' || motif === 'chevrons' ? 0.6 : 0.5
expect(p.x).toBeGreaterThanOrEqual(-xLimit)
expect(p.x).toBeLessThanOrEqual(xLimit)
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/patterns.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/rolo-textura/patterns.ts \
  tests/features/studio/tools/confeitaria/rolo-textura/patterns.test.ts
git commit -m "feat(rolo-textura): declara espessura mínima dos motivos"
```

---

### Task 3: Criar o layout uniforme do relevo

**Files:**
- Create: `src/features/studio/tools/confeitaria/rolo-textura/reliefLayout.ts`
- Test: `tests/features/studio/tools/confeitaria/rolo-textura/reliefLayout.test.ts`

**Step 1: Write the failing tests**

Crie `reliefLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  buildPatternPaths, computeReliefLayout, fitMotif, motifSpan, scaleMotif,
} from '@/features/studio/tools/confeitaria/rolo-textura/reliefLayout'
import type { MotifShape } from '@/features/studio/tools/confeitaria/rolo-textura/patterns'
import { defaultTextureRollerParams } from '@/features/studio/tools/confeitaria/rolo-textura/schema'
import { MIN_FEATURE_MM } from '@/features/studio/tools/confeitaria/rolo-textura/schema'
import { pathsBoundingBox } from '@/features/studio/tools/confeitaria/shared/textOutline'

const square: MotifShape = {
  outer: [
    { x: -0.4, y: -0.4 },
    { x: 0.4, y: -0.4 },
    { x: 0.4, y: 0.4 },
    { x: -0.4, y: 0.4 },
  ],
  holes: [],
}

describe('reliefLayout', () => {
  it('calcula a grade com escala uniforme por min(cellW, cellH)', () => {
    const layout = computeReliefLayout(defaultTextureRollerParams)
    expect(layout.cellCols).toBe(12)
    expect(layout.cellRows).toBe(13)
    expect(layout.cellW).toBeCloseTo(7.854, 3)
    expect(layout.cellH).toBeCloseTo(7.692, 3)
    expect(layout.cellSpan).toBeCloseTo(7.692, 3)
  })

  it('não dilata motivo já espesso', () => {
    const fit = fitMotif(1, 0.4, 5)
    expect(fit.scale).toBe(5)
    expect(fit.dilation).toBe(0)
  })

  it('reduz e dilata motivo fino mantendo o tamanho externo', () => {
    const span = 1
    const minThickness = 0.1
    const baseScale = 5
    const fit = fitMotif(span, minThickness, baseScale)

    expect(fit.scale).toBeCloseTo(4.6667, 3)
    expect(fit.dilation).toBeCloseTo(0.1667, 3)
    expect(span * fit.scale + 2 * fit.dilation).toBeCloseTo(span * baseScale, 5)
    expect(minThickness * fit.scale + 2 * fit.dilation).toBeCloseTo(MIN_FEATURE_MM, 5)
  })

  it('trata motivo circular sem divisão por zero', () => {
    const fit = fitMotif(0.76, 0.76, 1)
    expect(fit.scale).toBeCloseTo(MIN_FEATURE_MM / 0.76, 5)
    expect(fit.dilation).toBe(0)
  })

  it('mede e escala o motivo uniformemente', () => {
    expect(motifSpan([square])).toBeCloseTo(0.8, 5)
    const scaled = scaleMotif([square], 2)
    expect(scaled[0].outer[0]).toEqual({ x: -0.8, y: -0.8 })
  })

  it('replica nas células, duplica na emenda e recorta', () => {
    const layout = computeReliefLayout(defaultTextureRollerParams)
    const paths = buildPatternPaths({
      params: defaultTextureRollerParams,
      layout,
      shapes: [square],
      dilation: 0,
      staggered: false,
    })
    expect(paths.length).toBeGreaterThan(0)

    const bounds = pathsBoundingBox(paths)
    const margin = 1
    const tolerance = 0.002
    expect(bounds.minX).toBeGreaterThanOrEqual(-defaultTextureRollerParams.length / 2 + margin - tolerance)
    expect(bounds.maxX).toBeLessThanOrEqual(defaultTextureRollerParams.length / 2 - margin + tolerance)
    expect(bounds.minY).toBeGreaterThanOrEqual(-tolerance)
    expect(bounds.maxY).toBeLessThanOrEqual(layout.circumference + tolerance)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/reliefLayout.test.ts`
Expected: FAIL — módulo não existe.

**Step 3: Write minimal implementation**

Crie `reliefLayout.ts`:

```ts
import { Path, Shape, Vector2 } from 'three'
import {
  clipPathsToRect, offsetPaths, toClipperPaths, unionPaths, type ClipperPoint,
} from '../shared/textOutline'
import type { MotifShape } from './patterns'
import {
  DENSITY_CELL_MM, EDGE_MARGIN_MM, END_FILLET_MM, MIN_FEATURE_MM,
  type TextureRollerParams,
} from './schema'

export interface ReliefLayout {
  circumference: number
  cellCols: number
  cellRows: number
  cellW: number
  cellH: number
  cellSpan: number
}

export interface MotifFit {
  scale: number
  dilation: number
}

export function computeReliefLayout(params: TextureRollerParams): ReliefLayout {
  const circumference = Math.PI * params.diameter
  const cellMm = DENSITY_CELL_MM[params.density]
  const cellCols = Math.max(3, Math.round(circumference / cellMm))
  const cellRows = Math.max(2, Math.round(params.length / cellMm))
  const cellW = circumference / cellCols
  const cellH = params.length / cellRows
  return {
    circumference,
    cellCols,
    cellRows,
    cellW,
    cellH,
    cellSpan: Math.min(cellW, cellH),
  }
}

export function motifSpan(shapes: MotifShape[]): number {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const shape of shapes) {
    for (const p of shape.outer) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }
  if (!Number.isFinite(minX)) return 0
  return Math.max(maxX - minX, maxY - minY)
}

export function scaleMotif(shapes: MotifShape[], scale: number): MotifShape[] {
  return shapes.map((shape) => ({
    outer: shape.outer.map((p) => ({ x: p.x * scale, y: p.y * scale })),
    holes: shape.holes.map((hole) => hole.map((p) => ({ x: p.x * scale, y: p.y * scale }))),
  }))
}

/**
 * Ajusta o motivo para caber no tamanho externo desejado e, se a espessura
 * mínima ficar abaixo de MIN_FEATURE_MM, reduz a escala e dilata o contorno.
 */
export function fitMotif(outerSpan: number, minThickness: number, baseScale: number): MotifFit {
  if (outerSpan <= 0) return { scale: baseScale, dilation: 0 }

  const scaledMin = minThickness * baseScale
  if (scaledMin >= MIN_FEATURE_MM) return { scale: baseScale, dilation: 0 }

  const outer = outerSpan * baseScale
  const denominator = outerSpan - minThickness
  if (denominator <= 1e-6 || outer <= MIN_FEATURE_MM) {
    return { scale: Math.max(baseScale, MIN_FEATURE_MM / outerSpan), dilation: 0 }
  }

  const scale = (outer - MIN_FEATURE_MM) / denominator
  const dilation = Math.max(0, (MIN_FEATURE_MM - minThickness * scale) / 2)
  return { scale, dilation }
}

function shapeToClipperAtOrigin(shape: MotifShape): ClipperPoint[][] {
  const flat = new Shape(shape.outer.map((p) => new Vector2(p.y, p.x)))
  for (const hole of shape.holes) {
    flat.holes.push(new Path(hole.map((p) => new Vector2(p.y, p.x))))
  }
  return toClipperPaths([flat])
}

export interface BuildPatternPathsInput {
  params: TextureRollerParams
  layout: ReliefLayout
  shapes: MotifShape[]
  dilation: number
  staggered: boolean
}

export function buildPatternPaths({
  params, layout, shapes, dilation, staggered,
}: BuildPatternPathsInput): ClipperPoint[][] {
  const prepared = shapes.flatMap((shape) => {
    const paths = shapeToClipperAtOrigin(shape)
    return dilation > 0 ? offsetPaths(paths, dilation) : paths
  })

  const shift = Math.round(layout.circumference * 1000)
  const paths: ClipperPoint[][] = []

  for (let row = 0; row < layout.cellRows; row++) {
    const axialCenter = -params.length / 2 + (row + 0.5) * layout.cellH
    const arcOffset = staggered && row % 2 === 1 ? layout.cellW / 2 : 0
    for (let col = 0; col < layout.cellCols; col++) {
      const arcCenter = (col + 0.5) * layout.cellW + arcOffset
      const dx = Math.round(axialCenter * 1000)
      const dy = Math.round(arcCenter * 1000)
      for (const path of prepared) {
        const placed = path.map((p) => ({ X: p.X + dx, Y: p.Y + dy }))
        paths.push(placed)
        paths.push(placed.map((p) => ({ X: p.X, Y: p.Y + shift })))
        paths.push(placed.map((p) => ({ X: p.X, Y: p.Y - shift })))
      }
    }
  }

  const margin = Math.max(EDGE_MARGIN_MM, END_FILLET_MM)
  return clipPathsToRect(
    unionPaths(paths),
    -params.length / 2 + margin,
    0,
    params.length / 2 - margin,
    layout.circumference,
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/reliefLayout.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/rolo-textura/reliefLayout.ts \
  tests/features/studio/tools/confeitaria/rolo-textura/reliefLayout.test.ts
git commit -m "feat(rolo-textura): cria layout uniforme do relevo"
```

---

### Task 4: Aplicar mínimo de 0,8 mm no SVG compartilhado

**Files:**
- Modify: `src/features/studio/tools/confeitaria/shared/svgToIconShape.ts` (exportar `strokeToShape`)
- Modify: `src/features/studio/tools/confeitaria/shared/svgPattern.ts`
- Test: `tests/features/studio/tools/confeitaria/shared/svgPattern.test.ts` (novo)

**Step 1: Write the failing tests**

Crie `tests/features/studio/tools/confeitaria/shared/svgPattern.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { svgPatternShapes } from '@/features/studio/tools/confeitaria/shared/svgPattern'
import type { ParsedSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

function shapeBounds(shapes: ReturnType<typeof svgPatternShapes>) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const shape of shapes) {
    for (const p of [...shape.outer, ...shape.holes.flat()]) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
  }
  return { width: maxX - minX, height: maxY - minY }
}

const circleFill = (radius: number): ParsedSvg => ({
  fills: [{
    outer: Array.from({ length: 64 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2
      return { x: Math.cos(a) * radius, y: Math.sin(a) * radius }
    }),
    holes: [],
  }],
  strokes: [],
})

describe('svgPatternShapes', () => {
  it('mantém o círculo circular (escala uniforme)', () => {
    const shapes = svgPatternShapes(circleFill(1), { targetSpan: 4, minFeatureMm: 0.8 })
    const bounds = shapeBounds(shapes)
    expect(bounds.width).toBeCloseTo(bounds.height, 5)
    expect(Math.max(bounds.width, bounds.height)).toBeCloseTo(4, 2)
  })

  it('engrossa traço fino até 0,8 mm', () => {
    const parsed: ParsedSvg = {
      fills: [],
      strokes: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], width: 0.01 }],
    }
    const shapes = svgPatternShapes(parsed, { targetSpan: 4, minFeatureMm: 0.8 })
    const bounds = shapeBounds(shapes)
    expect(bounds.height).toBeGreaterThanOrEqual(0.79)
    expect(bounds.height).toBeLessThanOrEqual(0.81)
  })

  it('não dilata preenchimento sólido', () => {
    const parsed: ParsedSvg = {
      fills: [{
        outer: [
          { x: -0.5, y: -0.5 },
          { x: 0.5, y: -0.5 },
          { x: 0.5, y: 0.5 },
          { x: -0.5, y: 0.5 },
        ],
        holes: [],
      }],
      strokes: [],
    }
    const shapes = svgPatternShapes(parsed, { targetSpan: 4, minFeatureMm: 0.8 })
    const bounds = shapeBounds(shapes)
    expect(bounds.width).toBeCloseTo(4, 2)
    expect(bounds.height).toBeCloseTo(4, 2)
  })

  it('engrossa preenchimento fino', () => {
    const parsed: ParsedSvg = {
      fills: [{
        outer: [
          { x: -0.05, y: -0.5 },
          { x: 0.05, y: -0.5 },
          { x: 0.05, y: 0.5 },
          { x: -0.05, y: 0.5 },
        ],
        holes: [],
      }],
      strokes: [],
    }
    const shapes = svgPatternShapes(parsed, { targetSpan: 4, minFeatureMm: 0.8 })
    const bounds = shapeBounds(shapes)
    expect(bounds.width).toBeGreaterThanOrEqual(0.79)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/confeitaria/shared/svgPattern.test.ts`
Expected: FAIL — `svgPatternShapes` não existe.

**Step 3: Write minimal implementation**

Em `shared/svgToIconShape.ts`, torne `strokeToShape` exportável:

```ts
export function strokeToShape(points: Vector2[], factor: number, halfWidth: number): Shape | null {
```

Em `shared/svgPattern.ts`, adicione os imports e a nova função, mantendo `svgMotifShapes` intacto:

```ts
import { Vector2 } from 'three'
import {
  strokeToShape,
  type ParsedShape,
  type ParsedSvg,
  type ParsedStroke,
  type Point2,
} from './svgToIconShape'
import {
  offsetPaths, pathsToShapes, toClipperPaths, unionPaths, type ClipperPoint,
} from './textOutline'
```

Adicione ao final do arquivo:

```ts
function toClipperPath(points: Point2[]): ClipperPoint[] {
  return points.map((p) => ({ X: Math.round(p.x * 1000), Y: Math.round(p.y * 1000) }))
}

function fillClipperPaths(fill: ParsedShape): ClipperPoint[][] {
  const paths: ClipperPoint[][] = []
  if (fill.outer.length >= 3) paths.push(toClipperPath(fill.outer))
  for (const hole of fill.holes) {
    if (hole.length >= 3) paths.push(toClipperPath(hole))
  }
  return paths
}

function strokeClipperPaths(stroke: ParsedStroke, minWidth: number): ClipperPoint[][] {
  const outline = strokeToShape(
    stroke.points.map((p) => new Vector2(p.x, p.y)),
    1,
    Math.max(stroke.width, minWidth) / 2,
  )
  return outline ? toClipperPaths([outline]) : []
}

export interface SvgPatternOptions {
  /** Maior dimensão final do motivo, em mm. */
  targetSpan: number
  /** Espessura mínima imprimível, em mm. */
  minFeatureMm: number
}

/**
 * Converte o SVG em motivos fechados, centrados na origem, em mm, com escala
 * uniforme e mínimo imprimível. Preenchimentos sólidos não são alterados.
 */
export function svgPatternShapes(
  parsed: ParsedSvg | null,
  { targetSpan, minFeatureMm }: SvgPatternOptions,
): MotifShape[] {
  if (!parsed) return []

  const points: Point2[] = []
  for (const fill of parsed.fills) {
    points.push(...fill.outer)
    for (const hole of fill.holes) points.push(...hole)
  }
  for (const stroke of parsed.strokes) {
    for (const p of stroke.points) {
      const half = stroke.width / 2
      points.push({ x: p.x - half, y: p.y - half }, { x: p.x + half, y: p.y + half })
    }
  }
  if (points.length === 0) return []

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  const span = Math.max(maxX - minX, maxY - minY)
  if (!Number.isFinite(span) || span <= 0) return []

  // Primeira passada: encaixa sem reservar. Só reserva o mínimo se houver
  // traço fino ou preenchimento que desaparece com o recuo de 0,8 mm.
  const scale0 = targetSpan / span
  const minSource0 = minFeatureMm / scale0
  const thinFill = parsed.fills.some((fill) => {
    const fillPaths = fillClipperPaths(fill)
    return fillPaths.length > 0 && offsetPaths(fillPaths, -minSource0 / 2).length === 0
  })
  const thinStroke = parsed.strokes.some((stroke) => stroke.width < minSource0)
  const reserve = thinFill || thinStroke ? minFeatureMm : 0
  const usable = Math.max(1e-6, targetSpan - reserve)
  const scale = usable / span
  const minSource = minFeatureMm / scale

  const paths: ClipperPoint[][] = []
  for (const fill of parsed.fills) {
    const fillPaths = fillClipperPaths(fill)
    if (fillPaths.length === 0) continue
    const thin = offsetPaths(fillPaths, -minSource / 2).length === 0
    paths.push(...(thin ? offsetPaths(fillPaths, minSource / 2) : fillPaths))
  }
  for (const stroke of parsed.strokes) {
    paths.push(...strokeClipperPaths(stroke, minSource))
  }
  if (paths.length === 0) return []

  const merged = pathsToShapes(unionPaths(paths))
  if (merged.length === 0) return []

  let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity
  for (const shape of merged) {
    for (const p of [...shape.getPoints(), ...shape.holes.flatMap((h) => h.getPoints())]) {
      sMinX = Math.min(sMinX, p.x); sMaxX = Math.max(sMaxX, p.x)
      sMinY = Math.min(sMinY, p.y); sMaxY = Math.max(sMaxY, p.y)
    }
  }
  const sSpan = Math.max(sMaxX - sMinX, sMaxY - sMinY)
  if (!Number.isFinite(sSpan) || sSpan <= 0) return []

  const finalScale = targetSpan / sSpan
  const cx = (sMinX + sMaxX) / 2
  const cy = (sMinY + sMaxY) / 2

  return merged.map((shape) => ({
    outer: shape.getPoints().map((p) => ({
      x: (p.x - cx) * finalScale,
      y: -(p.y - cy) * finalScale,
    })),
    holes: shape.holes.map((hole) => hole.getPoints().map((p) => ({
      x: (p.x - cx) * finalScale,
      y: -(p.y - cy) * finalScale,
    }))),
  }))
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/confeitaria/shared/svgPattern.test.ts`
Expected: PASS. Se o teste do preenchimento fino falhar por excesso de dilatação,
ajuste a asserção para `>= 0.79` (a dilatação garante o mínimo, mas pode engrossar
mais que o exato).

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/shared/svgToIconShape.ts \
  src/features/studio/tools/confeitaria/shared/svgPattern.ts \
  tests/features/studio/tools/confeitaria/shared/svgPattern.test.ts
git commit -m "feat(rolo-textura): aplica mínimo de 0,8mm no SVG"
```

---

### Task 5: Atualizar os testes do `buildRelief` para o novo comportamento

**Files:**
- Modify: `tests/features/studio/tools/confeitaria/rolo-textura/buildRelief.test.ts`

**Step 1: Write the failing tests**

No topo, importe o layout e remova a função local `cellGrid`:

```ts
import { computeReliefLayout } from '@/features/studio/tools/confeitaria/rolo-textura/reliefLayout'
```

Troque `cellGrid(params)` por `computeReliefLayout(params)` em `topGroups` e em
`isInteriorRow`.

Adicione `axialOffsets` ao `CellGroup` e preencha:

```ts
interface CellGroup {
  axialCenter: number
  arcCenter: number
  distances: number[]
  arcOffsets: number[]
  axialOffsets: number[]
}
```

Dentro do laço de `topGroups`, adicione `group.axialOffsets.push(x - axialCenter)`
e inicialize `axialOffsets: []` no grupo.

Substitua o teste `'preserva a largura do traço SVG sem inflar para a espessura mínima'`
por:

```ts
it('engrossa traço SVG fino até 0,8mm e mantém traço grosso maior', () => {
  const params: TextureRollerParams = {
    ...defaultTextureRollerParams,
    patternSource: 'svg',
    svgIcon: '<svg/>',
  }
  const radius = params.diameter / 2

  const measureWidth = (width: number): number => {
    const parsed: ParsedSvg = {
      fills: [],
      strokes: [{ points: [{ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 }], width }],
    }
    const geometry = buildRelief(params, parsed)
    expect(geometry).not.toBeNull()

    const groups = topGroups(geometry!, params, false, radius + 0.95 * params.reliefDepth)
      .filter((group) => isInteriorRow(group, params) && group.distances.length >= 8)
    expect(groups.length).toBeGreaterThan(0)

    return Math.max(...groups.map(
      (group) => Math.max(...group.arcOffsets) - Math.min(...group.arcOffsets),
    ))
  }

  const thin = measureWidth(0.02)
  expect(thin).toBeGreaterThanOrEqual(0.75)

  const thick = measureWidth(0.3)
  expect(thick).toBeGreaterThan(thin)
})

it('mantém o SVG circular sem distorção quando cellW != cellH', () => {
  const params: TextureRollerParams = {
    ...defaultTextureRollerParams,
    patternSource: 'svg',
    svgIcon: '<svg/>',
  }
  const parsed: ParsedSvg = {
    fills: [{
      outer: Array.from({ length: 64 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2
        return { x: Math.cos(a) * 0.5, y: Math.sin(a) * 0.5 }
      }),
      holes: [],
    }],
    strokes: [],
  }
  const geometry = buildRelief(params, parsed)
  expect(geometry).not.toBeNull()

  const radius = params.diameter / 2
  const groups = topGroups(geometry!, params, false, radius + 0.95 * params.reliefDepth)
    .filter((group) => isInteriorRow(group, params) && group.distances.length >= 16)
  expect(groups.length).toBeGreaterThan(0)

  for (const group of groups) {
    const axial = Math.max(...group.axialOffsets) - Math.min(...group.axialOffsets)
    const arc = Math.max(...group.arcOffsets) - Math.min(...group.arcOffsets)
    expect(Math.abs(axial - arc)).toBeLessThan(0.08 * Math.max(axial, arc))
  }
})
```

Mantenha os demais testes (`topo`, `contorno vetorial`, `NaN`).

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/buildRelief.test.ts`
Expected: FAIL — traço fino continua abaixo de 0,8 mm e o círculo está distorcido.

**Step 3: Do not implement yet**

Esta tarefa só registra o comportamento esperado. Siga para a Task 6.

**Step 4: Commit**

```bash
git add tests/features/studio/tools/confeitaria/rolo-textura/buildRelief.test.ts
git commit -m "test(rolo-textura): cobre escala e mínimo do relevo"
```

---

### Task 6: Reescrever o `buildRelief` sobre o novo layout

**Files:**
- Modify: `src/features/studio/tools/confeitaria/rolo-textura/buildRelief.ts`

**Step 1: Replace the file**

Substitua todo o conteúdo de `buildRelief.ts` por:

```ts
import { ExtrudeGeometry, type BufferGeometry } from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { svgPatternShapes } from '../shared/svgPattern'
import type { ParsedSvg } from '../shared/svgToIconShape'
import { pathsToShapes } from '../shared/textOutline'
import {
  isStaggered, motifShapes, MOTIF_MIN_THICKNESS, type MotifShape,
} from './patterns'
import {
  buildPatternPaths, computeReliefLayout, fitMotif, motifSpan, scaleMotif,
} from './reliefLayout'
import {
  MIN_FEATURE_MM, PATTERN_FILL_RATIO, RELIEF_BEVEL_MM,
  type PatternMotif, type TextureRollerParams,
} from './schema'

const EMBED_MM = 0.1

export function buildRelief(
  params: TextureRollerParams,
  parsedSvg?: ParsedSvg | null,
): BufferGeometry | null {
  const layout = computeReliefLayout(params)
  const isSvg = params.patternSource === 'svg'

  const shapes = isSvg
    ? svgPatternShapes(parsedSvg ?? null, {
        targetSpan: PATTERN_FILL_RATIO * layout.cellSpan * params.patternScale,
        minFeatureMm: MIN_FEATURE_MM,
      })
    : motifShapes(params.patternFamily, params.patternMotif as PatternMotif)
  if (shapes.length === 0) return null

  let prepared: MotifShape[] = shapes
  let dilation = 0
  let staggered = false

  if (!isSvg) {
    const motif = params.patternMotif as PatternMotif
    const fit = fitMotif(
      motifSpan(shapes),
      MOTIF_MIN_THICKNESS[motif],
      layout.cellSpan * params.patternScale,
    )
    prepared = scaleMotif(shapes, fit.scale)
    dilation = fit.dilation
    staggered = isStaggered(motif)
  }

  const paths = buildPatternPaths({
    params,
    layout,
    shapes: prepared,
    dilation,
    staggered,
  })
  if (paths.length === 0) return null

  const flatShapes = pathsToShapes(paths)
  if (flatShapes.length === 0) return null

  // SVG mantém o traço original sem chanfro; motivos internos recebem chanfro.
  const bevel = !isSvg
  const extrusions = flatShapes.map((shape) => new ExtrudeGeometry(shape, {
    depth: params.reliefDepth + EMBED_MM,
    bevelEnabled: bevel,
    bevelThickness: RELIEF_BEVEL_MM,
    bevelSize: RELIEF_BEVEL_MM,
    bevelSegments: 2,
  }))
  const merged = mergeGeometries(extrusions)
  extrusions.forEach((geometry) => geometry.dispose())
  if (!merged) return null

  merged.deleteAttribute('uv')
  merged.computeBoundingBox()
  merged.translate(0, 0, params.reliefDepth - merged.boundingBox!.max.z)

  // Curva o plano no cilindro: X vira eixo, Y vira arco e Z vira raio.
  const position = merged.getAttribute('position')
  const radius = params.diameter / 2
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const arc = position.getY(i)
    const z = position.getZ(i)
    const angle = arc / radius
    const r = radius + z
    position.setXYZ(i, x, r * Math.cos(angle), r * Math.sin(angle))
  }
  position.needsUpdate = true

  const creased = toCreasedNormals(merged, Math.PI / 6)
  merged.dispose()
  creased.setIndex(Array.from({ length: creased.getAttribute('position').count }, (_, i) => i))
  return creased
}
```

**Step 2: Run the buildRelief tests**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/buildRelief.test.ts`
Expected: PASS.

**Step 3: Run the layout and patterns tests**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/reliefLayout.test.ts tests/features/studio/tools/confeitaria/rolo-textura/patterns.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/features/studio/tools/confeitaria/rolo-textura/buildRelief.ts
git commit -m "refactor(rolo-textura): reescreve relevo sobre o novo layout"
```

---

### Task 7: Propagar `patternScale` no hook

**Files:**
- Modify: `src/features/studio/tools/confeitaria/rolo-textura/useTextureRoller.ts`
- Test: `tests/features/studio/tools/confeitaria/rolo-textura/useTextureRoller.test.ts`

**Step 1: Write the failing tests**

No `makeWorkerFixture`, capture os parâmetros:

```ts
let lastParams: TextureRollerParams | null = null
// dentro de build:
build: (params, parsedSvg, onResult, onError) => {
  lastParams = params
  // ...
},
// no retorno:
getParams: () => lastParams,
```

Importe `type TextureRollerParams` se necessário.

Adicione os testes:

```ts
it('faz clamp de patternScale', () => {
  const { factory } = makeWorkerFixture()
  const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
  act(() => { result.current.updateParam('patternScale', 9) })
  expect(result.current.params.patternScale).toBe(1)
  act(() => { result.current.updateParam('patternScale', 0.1) })
  expect(result.current.params.patternScale).toBe(0.4)
})

it('envia patternScale ao worker e rebuilda', () => {
  const { factory, getParams, getCalls } = makeWorkerFixture()
  const { result } = renderHook(() => useTextureRoller({ workerFactory: factory }))
  act(() => { vi.advanceTimersByTime(250) })
  const callsAfterInitial = getCalls()

  act(() => { result.current.updateParam('patternScale', 0.6) })
  act(() => { vi.advanceTimersByTime(250) })

  expect(getCalls()).toBeGreaterThan(callsAfterInitial)
  expect(getParams()?.patternScale).toBe(0.6)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/useTextureRoller.test.ts`
Expected: FAIL — `patternScale` não é clicado nem enviado.

**Step 3: Write minimal implementation**

Em `useTextureRoller.ts`:

1. No `NUMERIC_RANGES`, adicione:

```ts
  patternScale: { min: 0.4, max: 1 },
```

2. Na desestruturação de `params`, adicione `patternScale`:

```ts
  const {
    productType, length, diameter, patternFamily, patternMotif,
    patternSource, svgIcon, reliefDepth, density, patternScale,
  } = params
```

3. No objeto `buildParams`, adicione:

```ts
      patternScale,
```

4. Nas dependências do `useMemo`, adicione `patternScale`.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/useTextureRoller.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/rolo-textura/useTextureRoller.ts \
  tests/features/studio/tools/confeitaria/rolo-textura/useTextureRoller.test.ts
git commit -m "feat(rolo-textura): propaga escala do padrão no estado"
```

---

### Task 8: Expor a escala no painel

**Files:**
- Modify: `src/features/studio/tools/confeitaria/rolo-textura/StudioPanel.tsx`
- Test: `tests/features/studio/tools/confeitaria/rolo-textura/StudioPanel.test.tsx`

**Step 1: Write the failing tests**

Adicione em `StudioPanel.test.tsx`:

```ts
it('renderiza a escala do padrão e o aviso de mínimo', () => {
  render(<StudioPanel {...defaultProps} />)
  expect(screen.getByLabelText('Escala do padrão')).toBeDefined()
  expect(screen.getByText(/0,8 mm/)).toBeDefined()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/StudioPanel.test.tsx`
Expected: FAIL — slider e aviso não existem.

**Step 3: Write minimal implementation**

Em `StudioPanel.tsx`, estenda `LabeledSlider` com `format`:

```tsx
function LabeledSlider({
  label, value, min, max, step, suffix = 'mm', format, onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  format?: (value: number) => string
  onChange: (value: number) => void
}) {
  const display = format
    ? format(value)
    : step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value
  return (
    <>
      <Flex direction="row" justifyContent="space-between">
        <Text fontSize="xs" color="font.tertiary">{label}</Text>
        <Text fontSize="xs" color="font.secondary">{display} {suffix}</Text>
      </Flex>
      <SliderField
        label=""
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(next) => onChange(next as number)}
      />
    </>
  )
}
```

No acordeão **Padrão**, logo depois do slider de profundidade, adicione:

```tsx
<LabeledSlider
  label="Escala do padrão"
  value={params.patternScale}
  min={0.4}
  max={1}
  step={0.05}
  format={(value) => `${Math.round(value * 100)}`}
  suffix="%"
  onChange={(value) => onUpdateParam('patternScale', value)}
/>
<Text fontSize="xs" color="font.secondary">
  Traços finos são engrossados até 0,8 mm para impressão.
</Text>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura/StudioPanel.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/rolo-textura/StudioPanel.tsx \
  tests/features/studio/tools/confeitaria/rolo-textura/StudioPanel.test.tsx
git commit -m "feat(rolo-textura): expõe escala do padrão no painel"
```

---

### Task 9: Atualizar a documentação

**Files:**
- Modify: `src/features/studio/tools/confeitaria/rolo-textura/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Step 1: Update `AGENTS.md`**

- Em **Parâmetros**, adicione:

```md
- Escala do padrão: 40–100% (padrão: 100%)
```

- Em **Regras do domínio**, substitua a linha do campo de altura por:

```md
- Relevo vetorial extrudado e curvado sobre o cilindro; sem rasterização
- Escala uniforme por `min(cellW, cellH)`; motivos e SVG não são esticados
- Mínimo de 0,8mm aplicado por dilatação/deficit nos motivos e por engrossamento
  de traço no SVG (sem alterar a centerline)
- Motivos contínuos (`waves`, `chevrons`) ultrapassam a célula em X para emendar
  entre colunas
- SVG sem chanfro para preservar o traço; motivos internos com chanfro de 0,2mm
- Furos de motivos podem reduzir em escalas pequenas para manter a parede mínima
```

- Na **Estrutura de arquivos**, adicione `reliefLayout.ts` e ajuste a descrição
  de `buildTextureRoller.ts` para "Orquestração corpo + relevo".
- Na seção **Testes implementados**, troque a lista pela lista real:

```md
- `schema.test.ts`
- `patterns.test.ts`
- `reliefLayout.test.ts`
- `buildBody.test.ts`
- `buildRelief.test.ts`
- `buildTextureRoller.test.ts`
- `workerGeometry.test.ts`
- `useTextureRoller.test.ts`
- `exportStl.test.ts`
- `StudioPanel.test.tsx`
- `TextureRollerPreview.test.tsx`
```

**Step 2: Update `docs/frontend/studio.md`**

- Na tabela do Rolo de Textura, troque:

```md
| Campo de altura + malha | `src/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller.ts` |
```

por:

```md
| Layout do relevo (escala, mínimo, emenda) | `src/features/studio/tools/confeitaria/rolo-textura/reliefLayout.ts` |
| Orquestração corpo + relevo | `src/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller.ts` |
```

- Atualize o parágrafo do Rolo (linha próxima de 174) para remover
  "campo de altura com resolução de 0.3mm" e `flatShading`, e incluir:

```md
O relevo é vetorial, extrudado e curvado sobre o cilindro, com escala uniforme
por `min(cellW, cellH)` e slider de escala (40–100%). Traços finos de motivos e
SVG são engrossados até 0,8mm; preenchimentos sólidos do SVG não são alterados.
Motivos contínuos ultrapassam a célula em X para emendar sem costura.
```

**Step 3: Run lint on docs? No.**

Apenas confira o diff:

```bash
git diff -- docs/frontend/studio.md src/features/studio/tools/confeitaria/rolo-textura/AGENTS.md
```

**Step 4: Commit**

```bash
git add docs/frontend/studio.md \
  src/features/studio/tools/confeitaria/rolo-textura/AGENTS.md
git commit -m "docs(rolo-textura): atualiza documentação do relevo"
```

---

### Task 10: Verificação final

**Step 1: Run the full rolo test suite**

Run: `npm run test -- tests/features/studio/tools/confeitaria/rolo-textura`
Expected: PASS em todos os arquivos.

**Step 2: Run the shared test**

Run: `npm run test -- tests/features/studio/tools/confeitaria/shared/svgPattern.test.ts`
Expected: PASS.

**Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

**Step 4: Lint**

Run: `npm run lint`
Expected: sem erros.

**Step 5: Review the diff**

```bash
git status --short
git diff --stat
```

Confirme que apenas os arquivos previstos foram alterados. Não deve haver
mudanças em `buildBody.ts`, `buildTextureRoller.worker.ts`, `workerClient.ts`,
`workerGeometry.ts`, `TextureRollerPreview.tsx` ou `exportStl.ts`.

**Step 6: Final commit (se houver ajustes)**

```bash
git add -A
git commit -m "test(rolo-textura): ajusta verificação final do relevo"
```

---

## Critérios de aceite

- `patternScale` aparece no painel, vai ao worker e dispara rebuild.
- Motivos e SVG usam escala uniforme; um círculo do SVG continua circular.
- Traço de 0,02mm no SVG sai com pelo menos 0,8mm.
- Preenchimento sólido do SVG mantém o tamanho; preenchimento fino engrossa.
- Motivos finos garantem 0,8mm em densidade alta + escala 0,4.
- Emenda em 360° e recorte de 1mm continuam funcionando.
- Nenhuma mudança no corpo, worker, preview ou exportação.
- Testes, typecheck e lint passando.
