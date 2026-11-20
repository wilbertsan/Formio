# Termoformador — Formas quadrada, retangular, pirâmide e SVG Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generalizar o Termoformador para tela, suporte e macho em círculo, quadrado, retângulo, pirâmide truncada e silhueta SVG, com bandeja de paredes inclinadas, padrão hexagonal genérico, preview e três STLs.

**Architecture:** Um `outline` central deriva o contorno da tela, a moldura, o rebaixo, o degrau efetivo e a abertura da cavidade. O modo circular continua em `LatheGeometry`; as novas formas usam prismas/lofts e CSG com CDT. A tela é sempre plana e perfurada; o macho é a ferramenta de conformação. O SVG é achatado na main thread e o `ParsedSvg` vai ao worker.

**Tech Stack:** React 19, TypeScript strict, Three.js, React Three Fiber, three-bvh-csg, js-clipper, Zod, Vitest, Testing Library, Amplify UI.

**Spec:** `docs/plans/2026-11-20-termoformador-formas-design.md`

---

## Convenções do plano

- 1 unidade Three.js = 1 mm.
- `paths` do Clipper usam ×1000; as funções públicas recebem mm.
- O contorno é único e fechado; o SVG não aceita furos nem ilhas.
- O modo `circle` mantém o comportamento atual e os testes existentes.
- Cada tarefa termina com testes direcionados, `npm run typecheck` e commit.

---

### Task 1: Schema, tipos e defaults das formas

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/schema.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

**Step 1: Write the failing tests**

Em `schema.test.ts`, adicione ao `toMatchObject` dos defaults:

```ts
      shape: 'circle',
      width: 160,
      height: 100,
      svgSize: 160,
      draftAngle: 5,
      pyramidTip: 0.1,
      svg: '',
```

E os testes de faixa:

```ts
  it('rejeita forma desconhecida e dimensões de forma fora da faixa', () => {
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, shape: 'star' as never }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, width: 39 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, height: 301 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, svgSize: 301 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, draftAngle: 16 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, pyramidTip: 0.04 }).success).toBe(false)
  })
```

Em `useThermoformer.test.ts`, inclua no objeto esperado enviado ao worker:

```ts
      shape: 'circle',
      width: 160,
      height: 100,
      svgSize: 160,
      draftAngle: 5,
      pyramidTip: 0.1,
      svg: '',
```

E no teste de clamp:

```ts
      result.current.updateParam('width', 999)
      result.current.updateParam('draftAngle', -1)
```

```ts
    expect(result.current.params.width).toBe(300)
    expect(result.current.params.draftAngle).toBe(0)
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

Expected: FAIL — campos de forma ausentes.

**Step 3: Implement**

Em `schema.ts`:

```ts
export const THERMOFORMER_SHAPES = [
  'circle',
  'square',
  'rectangle',
  'pyramid',
  'svg',
] as const

export type ThermoformerShape = (typeof THERMOFORMER_SHAPES)[number]

export const MINIMUM_SHAPE_MM = 40
export const MAXIMUM_SHAPE_MM = 300
export const MINIMUM_SVG_SIZE_MM = 40
export const MAXIMUM_SVG_SIZE_MM = 300
export const MINIMUM_TRAY_BOTTOM_SCALE = 0.05
export const MINIMUM_PYRAMID_TIP = 0.05
export const MAXIMUM_PYRAMID_TIP = 0.3
export const MINIMUM_PYRAMID_TIP_MM = 3
export const MINIMUM_DRAFT_ANGLE_DEG = 2
export const SVG_MAX_LENGTH = 2_000_000
export const PLUG_GRIP_MAX_MM = 30
```

No schema, antes de `diameter`:

```ts
  shape: z.enum(THERMOFORMER_SHAPES),
```

E depois de `diameter`:

```ts
  width: z.number().min(MINIMUM_SHAPE_MM).max(MAXIMUM_SHAPE_MM),
  height: z.number().min(MINIMUM_SHAPE_MM).max(MAXIMUM_SHAPE_MM),
  svgSize: z.number().min(MINIMUM_SVG_SIZE_MM).max(MAXIMUM_SVG_SIZE_MM),
  draftAngle: z.number().min(0).max(15),
  pyramidTip: z.number().min(MINIMUM_PYRAMID_TIP).max(MAXIMUM_PYRAMID_TIP),
  svg: z.string().max(SVG_MAX_LENGTH),
```

No default:

```ts
  shape: 'circle',
  width: 160,
  height: 100,
  svgSize: 160,
  draftAngle: 5,
  pyramidTip: 0.1,
  svg: '',
```

Em `useThermoformer.ts`, `NUMERIC_RANGES`:

```ts
  width: { min: MINIMUM_SHAPE_MM, max: MAXIMUM_SHAPE_MM },
  height: { min: MINIMUM_SHAPE_MM, max: MAXIMUM_SHAPE_MM },
  svgSize: { min: MINIMUM_SVG_SIZE_MM, max: MAXIMUM_SVG_SIZE_MM },
  draftAngle: { min: 0, max: 15 },
  pyramidTip: { min: MINIMUM_PYRAMID_TIP, max: MAXIMUM_PYRAMID_TIP },
```

Importe as constantes. Destruture `shape`, `width`, `height`, `svgSize`, `draftAngle`, `pyramidTip`, `svg` e inclua no `buildParams` e nas dependências. Nesta tarefa não há parse de SVG nem mudança no worker; `svg` apenas entra no objeto.

**Step 4: Run tests**

Same command as Step 2. Expected: PASS. Run `npm run typecheck`.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/schema.ts \
  src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts
git commit -m "feat: add thermoformer shape parameters"
```

---

### Task 2: Compartilhar CSG e limpeza de geometria

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/shared/csg.ts`
- Create: `src/features/studio/tools/lembrancinhas/shared/geometryCleanup.ts`
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/csg.ts`
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/geometryCleanup.ts`
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/buildHandle.ts`
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.ts`
- Test: existing Porta-lata tests

**Step 1: Baseline**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/porta-lata tests/features/studio/tools/lembrancinhas/porta-lata/geometryCleanup.test.ts`

Expected: PASS.

**Step 2: Move the helpers**

Mova o conteúdo de `porta-lata/csg.ts` para `lembrancinhas/shared/csg.ts` e o conteúdo de `porta-lata/geometryCleanup.ts` para `lembrancinhas/shared/geometryCleanup.ts`, ajustando apenas os caminhos relativos. Em seguida, troque os arquivos antigos por reexports:

`porta-lata/csg.ts`:
```ts
export * from '../shared/csg'
```

`porta-lata/geometryCleanup.ts`:
```ts
export * from '../shared/geometryCleanup'
```

Atualize `buildHandle.ts` e `buildCanHolder.ts` para importar de `'../shared/csg'` e `'../shared/geometryCleanup'`, removendo a dependência interna do Porta-lata.

**Step 3: Run Porta-lata tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/porta-lata`

Expected: PASS. Run `npm run typecheck`.

**Step 4: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/shared \
  src/features/studio/tools/lembrancinhas/porta-lata/csg.ts \
  src/features/studio/tools/lembrancinhas/porta-lata/geometryCleanup.ts \
  src/features/studio/tools/lembrancinhas/porta-lata/buildHandle.ts \
  src/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.ts
git commit -m "refactor: share csg and geometry cleanup"
```

---

### Task 3: Contorno, offsets e degrau efetivo

> **Ordem de execução:** `outline.ts` importa `getSvgScreenPoints` de
> `./svgOutline`. Execute primeiro a implementação do **Task 4** (criar
> `svgOutline.ts`) e depois o Step 3 deste Task; os testes de cada Task rodam na
> sequência. Se preferir, troque a ordem dos dois Tasks, mantendo o conteúdo.

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/outline.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/outline.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  getShapeOutline,
  offsetOutlinePaths,
  pointInPaths,
} from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { pathsBoundingBox } from '@/features/studio/tools/confeitaria/shared/textOutline'

describe('getShapeOutline', () => {
  it('cria o contorno circular atual', () => {
    const outline = getShapeOutline(defaultThermoformerParams)
    expect(outline).not.toBeNull()
    expect(outline!.kind).toBe('circle')
    expect(outline!.radius).toBeCloseTo(80, 5)
    expect(outline!.bounds.width).toBeCloseTo(160, 1)
  })

  it('cria quadrado com moldura, rebaixo e suporte', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'square',
      width: 120,
    })!
    const outer = pathsBoundingBox(outline.supportOuter!)
    const recess = pathsBoundingBox(outline.recess!)
    const perforated = pathsBoundingBox(outline.perforated!)

    expect(outer.width).toBeCloseTo(120 + 2 * (0.3 + 4), 1)
    expect(recess.width).toBeCloseTo(120 + 2 * 0.3, 1)
    expect(perforated.width).toBeCloseTo(120 - 2 * 6, 1)
    expect(outline.cavityOpening).not.toBeNull()
  })

  it('deriva o degrau efetivo da moldura e da folga', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'rectangle',
      width: 140,
      height: 80,
    })!
    const perforated = pathsBoundingBox(outline.perforated!)
    const opening = pathsBoundingBox(outline.cavityOpening!)
    expect(opening.width).toBeCloseTo(perforated.width, 1)
    expect(opening.height).toBeCloseTo(perforated.height, 1)
  })

  it('aceita pirâmide de base quadrada', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'pyramid',
      width: 120,
    })!
    expect(outline.kind).toBe('polygon')
    expect(outline.bounds.width).toBeCloseTo(120, 1)
  })
})

describe('offsetOutlinePaths', () => {
  it('cresce e encolhe mantendo o contorno', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'square',
      width: 100,
    })!
    const grown = offsetOutlinePaths(outline.paths!, 5, 'miter')
    const shrunk = offsetOutlinePaths(outline.paths!, -5, 'miter')
    expect(pathsBoundingBox(grown).width).toBeCloseTo(110, 1)
    expect(pathsBoundingBox(shrunk).width).toBeCloseTo(90, 1)
  })

  it('pointInPaths reconhece dentro e fora', () => {
    const outline = getShapeOutline({
      ...defaultThermoformerParams,
      shape: 'square',
      width: 100,
    })!
    expect(pointInPaths(0, 0, outline.perforated!)).toBe(true)
    expect(pointInPaths(0, 100, outline.perforated!)).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/outline.test.ts`

Expected: FAIL — módulo não existe.

**Step 3: Implement `outline.ts`**

```ts
import { Shape, Vector2 } from 'three'
import ClipperLib from 'js-clipper'
import {
  type ClipperPoint,
  type PathsBounds,
  pathsBoundingBox,
  toClipperPaths,
} from '../../confeitaria/shared/textOutline'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { getSvgScreenPoints } from './svgOutline'
import { circleShape } from './shapes'
import type { ThermoformerGeometryParams } from './schema'

export type OutlineJoin = 'miter' | 'round'

export interface ShapeOutline {
  kind: 'circle' | 'polygon'
  shape: Shape
  points: Vector2[]
  bounds: PathsBounds
  radius: number | null
  paths: ClipperPoint[][] | null
  perforated: ClipperPoint[][] | null
  cavityOpening: ClipperPoint[][] | null
  recess: ClipperPoint[][] | null
  supportOuter: ClipperPoint[][] | null
  join: OutlineJoin
}

export function offsetOutlinePaths(
  paths: ClipperPoint[][],
  mm: number,
  join: OutlineJoin,
): ClipperPoint[][] {
  if (paths.length === 0) return []
  const offset = new ClipperLib.ClipperOffset()
  const solution = new ClipperLib.Paths()
  offset.AddPaths(
    paths,
    join === 'miter' ? ClipperLib.JoinType.jtMiter : ClipperLib.JoinType.jtRound,
    ClipperLib.EndType.etClosedPolygon,
  )
  offset.MiterLimit = 2
  offset.Execute(solution, Math.round(mm * 1000))
  return solution as ClipperPoint[][]
}

export function pointInPaths(
  x: number,
  y: number,
  paths: ClipperPoint[][],
): boolean {
  const point = { X: Math.round(x * 1000), Y: Math.round(y * 1000) }
  return paths.some(
    (path) => ClipperLib.Clipper.PointInPolygon(point, path) === 1,
  )
}

export function squarePoints(size: number): Vector2[] {
  const half = size / 2
  return [
    new Vector2(-half, -half),
    new Vector2(half, -half),
    new Vector2(half, half),
    new Vector2(-half, half),
  ]
}

export function rectanglePoints(width: number, height: number): Vector2[] {
  const halfW = width / 2
  const halfH = height / 2
  return [
    new Vector2(-halfW, -halfH),
    new Vector2(halfW, -halfH),
    new Vector2(halfW, halfH),
    new Vector2(-halfW, halfH),
  ]
}

function polygonOutline(
  params: ThermoformerGeometryParams,
  points: Vector2[],
  join: OutlineJoin,
): ShapeOutline {
  const shape = new Shape(points)
  const paths = toClipperPaths([shape])
  const effectiveStep = Math.max(
    params.stepWidth,
    params.frameWidth + params.fitClearance,
  )
  const perforated = offsetOutlinePaths(paths, -params.frameWidth, join)
  const cavityOpening = offsetOutlinePaths(
    paths,
    params.fitClearance - effectiveStep,
    join,
  )
  const recess = offsetOutlinePaths(paths, params.fitClearance, join)
  const supportOuter = offsetOutlinePaths(
    recess,
    params.wallThickness,
    join,
  )

  return {
    kind: 'polygon',
    shape,
    points,
    bounds: pathsBoundingBox(paths),
    radius: null,
    paths,
    perforated,
    cavityOpening,
    recess,
    supportOuter,
    join,
  }
}

export function getShapeOutline(
  params: ThermoformerGeometryParams,
  parsedSvg?: ParsedSvg | null,
): ShapeOutline | null {
  switch (params.shape) {
    case 'circle': {
      const radius = params.diameter / 2
      return {
        kind: 'circle',
        shape: circleShape(radius),
        points: [],
        bounds: {
          minX: -radius,
          maxX: radius,
          minY: -radius,
          maxY: radius,
          width: radius * 2,
          height: radius * 2,
        },
        radius,
        paths: null,
        perforated: null,
        cavityOpening: null,
        recess: null,
        supportOuter: null,
        join: 'round',
      }
    }
    case 'square':
      return polygonOutline(params, squarePoints(params.width), 'miter')
    case 'rectangle':
      return polygonOutline(
        params,
        rectanglePoints(params.width, params.height),
        'miter',
      )
    case 'pyramid':
      return polygonOutline(params, squarePoints(params.width), 'miter')
    case 'svg': {
      if (!parsedSvg) return null
      const points = getSvgScreenPoints(parsedSvg, params.svgSize)
      return points ? polygonOutline(params, points, 'round') : null
    }
  }
}
```

**Step 4: Run test**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/outline.test.ts`

Expected: PASS. Run `npm run typecheck`.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/outline.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/outline.test.ts
git commit -m "feat: add thermoformer shape outlines"
```

---

### Task 4: Silhueta SVG

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/svgOutline.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/svgOutline.test.ts`

**Step 1: Write the failing test**

Use um SVG simples de um triângulo e um com furo:

```ts
import { describe, it, expect } from 'vitest'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
import { getSvgScreenPoints, inspectSvgSilhouette } from '@/features/studio/tools/lembrancinhas/termoformador/svgOutline'

const triangle = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,5 95,95 5,95" fill="#000"/>
</svg>`

const donut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M50 5A45 45 0 1 0 50 95A45 45 0 1 0 50 5Z M50 25A25 25 0 1 1 50 75A25 25 0 1 1 50 25Z" fill="#000"/>
</svg>`

describe('svgOutline', () => {
  it('escala pela maior dimensão e centraliza', () => {
    const parsed = parseSvg(triangle)!
    const points = getSvgScreenPoints(parsed, 100)!
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(100, 0)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(100, 0)
  })

  it('rejeita furo', () => {
    const parsed = parseSvg(donut)!
    const result = inspectSvgSilhouette(parsed, 100)
    expect(result.points).toBeNull()
    expect(result.error).toBe('contour')
  })
})
```

**Step 2: Run test**

Expected: FAIL.

**Step 3: Implement `svgOutline.ts`**

```ts
import { Vector2 } from 'three'
import {
  svgBoundsFromParsed,
  svgRawShapesFromParsed,
  type ParsedSvg,
} from '../../confeitaria/shared/svgToIconShape'
import {
  pathsToShapes,
  toClipperPaths,
  unionPaths,
} from '../../confeitaria/shared/textOutline'

export type SvgSilhouetteError = 'empty' | 'contour' | null

export interface SvgSilhouetteResult {
  points: Vector2[] | null
  error: SvgSilhouetteError
}

export function inspectSvgSilhouette(
  parsed: ParsedSvg,
  svgSize: number,
): SvgSilhouetteResult {
  const raw = svgRawShapesFromParsed(parsed)
  if (raw.length === 0) return { points: null, error: 'empty' }

  const shapes = pathsToShapes(unionPaths(toClipperPaths(raw)))
  if (shapes.length !== 1 || shapes[0].holes.length > 0) {
    return { points: null, error: 'contour' }
  }

  const bounds = svgBoundsFromParsed(parsed)
  if (!bounds) return { points: null, error: 'empty' }
  const span = Math.max(bounds.width, bounds.height)
  if (!Number.isFinite(span) || span <= 0) {
    return { points: null, error: 'empty' }
  }

  const scale = svgSize / span
  const points = shapes[0]
    .getPoints()
    .map((point) => new Vector2(
      (point.x - bounds.centerX) * scale,
      -(point.y - bounds.centerY) * scale,
    ))

  return { points, error: null }
}

export function getSvgScreenPoints(
  parsed: ParsedSvg,
  svgSize: number,
): Vector2[] | null {
  return inspectSvgSilhouette(parsed, svgSize).points
}
```

**Step 4: Run test**

Expected: PASS. Run `npm run typecheck`.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/svgOutline.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/svgOutline.test.ts
git commit -m "feat: parse svg silhouettes"
```

---

### Task 5: Padrão hexagonal por região

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/screenPattern.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/screenPattern.test.ts`

**Step 1: Add failing tests**

```ts
  it('gera favos dentro de um quadrado', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 120,
    }
    const outline = getShapeOutline(params)!
    const pattern = computeScreenPattern(params, outline)
    expect(pattern.cells.length).toBeGreaterThan(50)
    expect(pattern.innerBounds.width).toBeCloseTo(108, 0)
    expect(pattern.cells.every((cell) =>
      Math.abs(cell.x) + cell.radius <= 54 &&
      Math.abs(cell.y) + cell.radius <= 54,
    )).toBe(true)
  })
```

**Step 2: Run test**

Expected: FAIL — a função ainda assume círculo.

**Step 3: Implement**

Mantenha a função de círculo atual e adicione:

```ts
export interface ScreenPatternResult {
  cells: ScreenCell[]
  capped: boolean
  innerRadius: number | null
  innerBounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number }
  effectiveOpening: number
  effectiveLine: number
  cellRadius: number
  spacing: number
}
```

```ts
function computePolygonPattern(params, outline, line): ScreenPatternResult {
  const perforated = outline.perforated ?? []
  const bounds = pathsBoundingBox(perforated)
  if (perforated.length === 0 || bounds.width <= EPS || bounds.height <= EPS) {
    return { cells: [], capped: false, innerRadius: null, innerBounds: bounds, effectiveOpening: params.opening, effectiveLine: line, cellRadius: params.opening / Math.sqrt(3), spacing: params.opening + line }
  }

  let effectiveOpening = params.opening
  let capped = false
  let cells: ScreenCell[] = []
  let cellRadius = 0
  let spacing = 0

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    cellRadius = effectiveOpening / Math.sqrt(3)
    spacing = effectiveOpening + line
    const stepX = (Math.sqrt(3) / 2) * spacing
    const stepY = spacing
    const columnBound = Math.ceil(Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX)) / stepX) + 2
    const rowBound = Math.ceil(Math.max(Math.abs(bounds.minY), Math.abs(bounds.maxY)) / stepY) + 2
    const centers = offsetOutlinePaths(perforated, -cellRadius, outline.join)
    const next: ScreenCell[] = []

    for (let column = -columnBound; column <= columnBound; column++) {
      const offset = Math.abs(column) % 2 === 1 ? stepY / 2 : 0
      for (let row = -rowBound; row <= rowBound; row++) {
        const x = column * stepX
        const y = row * stepY + offset
        if (!pointInPaths(x, y, centers)) continue
        next.push({ x, y, radius: cellRadius })
      }
    }

    cells = next
    if (cells.length <= MAX_SCREEN_OPENINGS) break
    capped = true
    if (attempt < MAX_ATTEMPTS - 1) effectiveOpening *= GROWTH_FACTOR
  }

  return { cells, capped, innerRadius: null, innerBounds: bounds, effectiveOpening, effectiveLine: line, cellRadius, spacing }
}

export function computeScreenPattern(
  params: ThermoformerGeometryParams,
  outline?: ShapeOutline | null,
): ScreenPatternResult {
  const line = Math.max(0, params.lineWidth)
  if (outline?.kind === 'polygon') return computePolygonPattern(params, outline, line)
  // Caminho circular atual, com innerBounds derivado do innerRadius.
}
```

O caminho circular deve preencher `innerRadius` e `innerBounds = { -r, r, -r, r, 2r, 2r }`. Mantenha os demais campos e o limite de 4000. Importe `offsetOutlinePaths`, `pointInPaths`, `pathsBoundingBox`.

**Step 4: Run tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/screenPattern.test.ts`

Expected: PASS. Run `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador` e `npm run typecheck`.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/screenPattern.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/screenPattern.test.ts
git commit -m "feat: support hexagonal pattern in any outline"
```

---

### Task 6: Tela para todas as formas

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/buildScreen.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildScreen.test.ts`

**Step 1: Add failing tests**

```ts
  it('gera tela quadrada fechada e com o diâmetro correto', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const geometry = buildScreen(params, outline)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.min.x).toBeCloseTo(-60, 0)
    expect(geometry.boundingBox!.max.x).toBeCloseTo(60, 0)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('gera tela retangular e de pirâmide', () => {
    for (const shape of ['rectangle', 'pyramid'] as const) {
      const params = { ...defaultThermoformerParams, shape, width: 120, height: 80 }
      const outline = getShapeOutline(params)!
      const geometry = buildScreen(params, outline)
      expect(isClosed(geometry)).toBe(true)
      geometry.dispose()
    }
  })
```

**Step 2: Run test**

Expected: FAIL — `buildScreen` ainda usa círculo.

**Step 3: Implement**

```ts
export function buildScreen(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): BufferGeometry {
  const shape = outline.shape
  const pattern = computeScreenPattern(params, outline)

  for (const cell of pattern.cells) {
    shape.holes.push(hexagonPath(cell.x, cell.y, cell.radius))
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: false,
    curveSegments: SCREEN_SEGMENTS,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()
  return geometry
}
```

O `outline.shape` é o círculo no modo circular; o resultado atual não muda. Atualize as chamadas existentes nos testes para passar `getShapeOutline(params)!`. O teste do círculo continua usando o mesmo `diameter`.

**Step 4: Run tests**

Expected: PASS. Run `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador` e `npm run typecheck`.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildScreen.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildScreen.test.ts
git commit -m "feat: build screens for all shapes"
```

---

### Task 7: Dimensões da bandeja, prisma e loft

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/tray.ts`
- Create: `src/features/studio/tools/lembrancinhas/termoformador/loft.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/tray.test.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/loft.test.ts`

**Step 1: Write failing tests**

`tray.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getTrayDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/tray'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('getTrayDimensions', () => {
  it('deriva bandeja quadrada com degrau efetivo', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.effectiveStep).toBeCloseTo(6.3, 5)
    expect(dims.stepClamped).toBe(true)
    expect(dims.seatY).toBeCloseTo(20 + 4, 5)
    expect(dims.height).toBeCloseTo(27, 5)
    expect(dims.bodyTop).toBeCloseTo(53, 5)
    expect(dims.plugTotalHeight).toBeCloseTo(46, 5)
  })

  it('limita a profundidade para o fundo não colapsar', () => {
    const params = {
      ...defaultThermoformerParams,
      shape: 'square' as const,
      width: 40,
      bowlDepth: 60,
      draftAngle: 15,
    }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.depthLimited).toBe(true)
    expect(dims.bottomScale).toBeCloseTo(0.05, 5)
    expect(dims.effectiveDepth).toBeLessThan(60)
  })

  it('usa o fundo da pirâmide', () => {
    const params = { ...defaultThermoformerParams, shape: 'pyramid' as const, width: 120 }
    const dims = getTrayDimensions(params, getShapeOutline(params)!)
    expect(dims.bottomScale).toBeCloseTo(0.1, 5)
    expect(dims.effectiveDepth).toBeCloseTo(20, 5)
  })
})
```

`loft.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { extrudeOutline, loftOutline } from '@/features/studio/tools/lembrancinhas/termoformador/loft'
import { getShapeOutline, offsetOutlinePaths } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { scalePaths } from '@/features/studio/tools/confeitaria/shared/textOutline'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('loft', () => {
  it('extruda um prisma fechado', () => {
    const outline = getShapeOutline({ ...defaultThermoformerParams, shape: 'square' as const, width: 100 })!
    const geometry = extrudeOutline(outline.paths!, 20, 0)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('lofta topo e fundo reduzido fechados', () => {
    const outline = getShapeOutline({ ...defaultThermoformerParams, shape: 'square' as const, width: 100 })!
    const bottom = scalePaths(outline.cavityOpening!, 0.5)
    const geometry = loftOutline(outline.cavityOpening!, bottom, 4, 24)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })
})
```

**Step 2: Run tests**

Expected: FAIL.

**Step 3: Implement `tray.ts`**

```ts
import { pathsBoundingBox } from '../../confeitaria/shared/textOutline'
import {
  MINIMUM_DRAFT_ANGLE_DEG,
  MINIMUM_PYRAMID_TIP_MM,
  MINIMUM_TRAY_BOTTOM_SCALE,
  PLUG_GRIP_MAX_MM,
  PLUG_GRIP_MIN_MATERIAL_MM,
  type ThermoformerGeometryParams,
} from './schema'
import type { ShapeOutline } from './outline'

export interface TrayDimensions {
  outerBounds: ReturnType<typeof pathsBoundingBox>
  screenBounds: ReturnType<typeof pathsBoundingBox>
  height: number
  seatY: number
  contactY: number
  bodyTop: number
  effectiveDepth: number
  requestedDepth: number
  bottomScale: number
  bottomMin: number
  effectiveStep: number
  stepClamped: boolean
  depthLimited: boolean
  draftLow: boolean
  tipSmall: boolean
  cavityWall: number
  guideWidth: number
  guideHeight: number
  gripRadius: number
  gripDepth: number
  plugHeight: number
  plugTotalHeight: number
}

export function getTrayDimensions(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): TrayDimensions {
  const screenBounds = pathsBoundingBox(outline.paths ?? [])
  const openingBounds = pathsBoundingBox(outline.perforated ?? [])
  const minScreen = Math.max(1e-6, Math.min(screenBounds.width, screenBounds.height))
  const minOpening = Math.max(1e-6, Math.min(openingBounds.width, openingBounds.height))
  const effectiveStep = Math.max(
    params.stepWidth,
    params.frameWidth + params.fitClearance,
  )
  const stepClamped = effectiveStep > params.stepWidth + 1e-9
  const requestedDepth = Math.max(0.1, params.bowlDepth)
  let effectiveDepth = requestedDepth
  let bottomScale = 1
  let depthLimited = false

  if (params.shape === 'pyramid') {
    bottomScale = params.pyramidTip
  } else {
    const tan = Math.tan((params.draftAngle * Math.PI) / 180)
    if (tan <= 1e-9) {
      bottomScale = 1
    } else {
      bottomScale = 1 - (2 * effectiveDepth * tan) / minOpening
      if (bottomScale < MINIMUM_TRAY_BOTTOM_SCALE) {
        effectiveDepth = ((1 - MINIMUM_TRAY_BOTTOM_SCALE) * minOpening) / (2 * tan)
        bottomScale = MINIMUM_TRAY_BOTTOM_SCALE
        depthLimited = true
      }
    }
  }

  const seatY = effectiveDepth + params.bottomThickness
  const height = params.thickness + effectiveDepth + params.bottomThickness
  const contactY = seatY + params.thickness
  const bodyTop = contactY + params.plugHeight
  const bottomMin = bottomScale * minOpening
  const draftLow =
    params.shape !== 'pyramid' &&
    params.draftAngle < MINIMUM_DRAFT_ANGLE_DEG
  const tipSmall =
    params.shape === 'pyramid' && bottomMin < MINIMUM_PYRAMID_TIP_MM
  const gripRadius = Math.min(
    params.plugHeight * 0.9,
    minScreen * 0.35,
    PLUG_GRIP_MAX_MM,
  )
  const gripDepth = Math.min(
    gripRadius * 1.2,
    effectiveDepth + params.plugHeight - PLUG_GRIP_MIN_MATERIAL_MM,
  )

  return {
    outerBounds: pathsBoundingBox(outline.supportOuter ?? []),
    screenBounds,
    height,
    seatY,
    contactY,
    bodyTop,
    effectiveDepth,
    requestedDepth,
    bottomScale,
    bottomMin,
    effectiveStep,
    stepClamped,
    depthLimited,
    draftLow,
    tipSmall,
    cavityWall: params.wallThickness + effectiveStep,
    guideWidth: screenBounds.width,
    guideHeight: screenBounds.height,
    gripRadius,
    gripDepth,
    plugHeight: params.plugHeight,
    plugTotalHeight: effectiveDepth + params.plugHeight,
  }
}
```

**Step 4: Implement `loft.ts`**

```ts
import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  ShapeUtils,
  Vector2,
} from 'three'
import { pathsToShapes } from '../../confeitaria/shared/textOutline'
import type { ClipperPoint } from '../../confeitaria/shared/textOutline'

function shapeOf(paths: ClipperPoint[][]): Shape | null {
  const shapes = pathsToShapes(paths)
  return shapes.length === 1 ? shapes[0] : null
}

export function extrudeOutline(
  paths: ClipperPoint[][],
  depth: number,
  y: number,
): BufferGeometry {
  const shape = shapeOf(paths)
  if (!shape) return new BufferGeometry()
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 48,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, y, 0)
  geometry.computeVertexNormals()
  return geometry
}

function toContour(path: ClipperPoint[]): Vector2[] {
  return path.map((point) => new Vector2(point.X / 1000, point.Y / 1000))
}

export function loftOutline(
  topPaths: ClipperPoint[][],
  bottomPaths: ClipperPoint[][],
  bottomY: number,
  topY: number,
): BufferGeometry {
  const top = topPaths[0]
  const bottom = bottomPaths[0]
  if (!top || !bottom || top.length !== bottom.length) {
    return new BufferGeometry()
  }

  const topContour = toContour(top)
  const bottomContour = toContour(bottom)
  const positions: number[] = []
  const indices: number[] = []

  const push = (x: number, y: number, z: number): number => {
    positions.push(x, y, z)
    return positions.length / 3 - 1
  }

  const topRing: number[] = []
  const bottomRing: number[] = []
  for (let i = 0; i < topContour.length; i++) {
    topRing.push(push(topContour[i].x, topY, -topContour[i].y))
    bottomRing.push(push(bottomContour[i].x, bottomY, -bottomContour[i].y))
  }

  for (let i = 0; i < topContour.length; i++) {
    const j = (i + 1) % topContour.length
    indices.push(topRing[i], bottomRing[i], bottomRing[j])
    indices.push(topRing[i], bottomRing[j], topRing[j])
  }

  const topTriangles = ShapeUtils.triangulateShape(topContour, [])
  for (const [a, b, c] of topTriangles) {
    indices.push(topRing[a], topRing[c], topRing[b])
  }
  const bottomTriangles = ShapeUtils.triangulateShape(bottomContour, [])
  for (const [a, b, c] of bottomTriangles) {
    indices.push(bottomRing[a], bottomRing[b], bottomRing[c])
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
```

Ajuste a orientação das tampas/side se `isClosed`/volume falhar; o teste é a fonte de verdade. O eixo é o mesmo do `buildScreen`: o Y do contorno vira -Z.

**Step 5: Run tests**

Expected: PASS. Run `npm run typecheck`.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/tray.ts \
  src/features/studio/tools/lembrancinhas/termoformador/loft.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/tray.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/loft.test.ts
git commit -m "feat: add tray dimensions and loft helpers"
```

---

### Task 8: Spike de CSG (quadrado, pirâmide e SVG)

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/csg.ts`
- Create: `tests/features/studio/tools/lembrancinhas/termoformador/csg.test.ts` (spike temporário)

**Step 1: Write the spike test**

```ts
import { describe, it, expect } from 'vitest'
import { getShapeOutline } from '@/features/studio/tools/lembrancinhas/termoformador/outline'
import { buildTraySupport, buildTrayPlug } from '@/features/studio/tools/lembrancinhas/termoformador/trayParts'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

const cases = [
  { ...defaultThermoformerParams, shape: 'square' as const, width: 120 },
  { ...defaultThermoformerParams, shape: 'pyramid' as const, width: 120 },
]

describe('CSG spike', () => {
  for (const params of cases) {
    it(`fecha suporte e macho ${params.shape}`, () => {
      const outline = getShapeOutline(params)!
      const support = buildTraySupport(params, outline)
      const plug = buildTrayPlug(params, outline)
      expect(isClosed(support)).toBe(true)
      expect(signedVolume(support)).toBeGreaterThan(0)
      expect(isClosed(plug)).toBe(true)
      expect(signedVolume(plug)).toBeGreaterThan(0)
      support.dispose()
      plug.dispose()
    })
  }
})
```

**Step 2: Run test**

Expected: FAIL — `trayParts` ainda não existe. Este task cria a base e prova o CSG antes da generalização. Se o CSG não fechar, PARE e reporte: o fallback do design é loft de anéis, e o plano precisa ser revisto.

**Step 3: Implement `csg.ts`**

```ts
import { BufferGeometry } from 'three'
import { ADDITION, Brush, SUBTRACTION } from 'three-bvh-csg'
import { createConformingEvaluator } from '../shared/csg'
import { removeDegenerateTriangles } from '../shared/geometryCleanup'

/**
 * Consome `base` e `tools` e devolve uma nova geometria.
 * `ADDITION` une; `SUBTRACTION` corta.
 */
export function csg(
  base: BufferGeometry,
  tools: BufferGeometry[],
  operation = SUBTRACTION,
): BufferGeometry {
  if (tools.length === 0) return base
  const evaluator = createConformingEvaluator()
  let current = base
  const pending = [...tools]
  try {
    while (pending.length > 0) {
      const tool = pending.shift()!
      const a = new Brush(current)
      const b = new Brush(tool)
      a.updateMatrixWorld()
      b.updateMatrixWorld()
      const result = evaluator.evaluate(a, b, operation).geometry
      current.dispose()
      tool.dispose()
      current = removeDegenerateTriangles(result)
    }
    current.computeVertexNormals()
    return current
  } catch (error) {
    current.dispose()
    for (const tool of pending) tool.dispose()
    throw error
  }
}

export function unionParts(parts: BufferGeometry[]): BufferGeometry {
  if (parts.length === 0) return new BufferGeometry()
  const [first, ...rest] = parts
  return csg(first, rest, ADDITION)
}
```

O `csg` consome a base e as ferramentas de corte; o chamador não deve reusar
essas geometrias depois. O resultado é sempre uma nova malha limpa.

**Step 4: Implement `trayParts.ts` (esqueleto)**

Crie `trayParts.ts` com:

```ts
import { BufferGeometry, ConeGeometry } from 'three'
import { ADDITION, SUBTRACTION } from 'three-bvh-csg'
import { scalePaths } from '../../confeitaria/shared/textOutline'
import { extrudeOutline, loftOutline } from './loft'
import { getTrayDimensions } from './tray'
import { csg } from './csg'
import type { ShapeOutline } from './outline'
import type { ThermoformerGeometryParams } from './schema'

export function buildTraySupport(params, outline): BufferGeometry {
  const dims = getTrayDimensions(params, outline)
  const outer = extrudeOutline(outline.supportOuter!, dims.height, 0)
  const recess = extrudeOutline(outline.recess!, dims.height - dims.seatY, dims.seatY)
  const cavity = loftOutline(
    outline.cavityOpening!,
    scalePaths(outline.cavityOpening!, dims.bottomScale),
    params.bottomThickness,
    dims.seatY,
  )
  return csg(outer, [recess, cavity], SUBTRACTION)
}

export function buildTrayPlug(params, outline): BufferGeometry {
  const dims = getTrayDimensions(params, outline)
  const body = extrudeOutline(outline.paths!, dims.bodyTop - dims.contactY, dims.contactY)
  const protrusion = loftOutline(
    outline.cavityOpening!,
    scalePaths(outline.cavityOpening!, dims.bottomScale),
    params.bottomThickness + params.thickness,
    dims.contactY,
  )
  const united = csg(body, [protrusion], ADDITION)
  const grip = new ConeGeometry(dims.gripRadius, dims.gripDepth, 64)
  grip.rotateX(Math.PI)
  grip.translate(0, dims.bodyTop - dims.gripDepth / 2, 0)
  grip.computeVertexNormals()
  return csg(united, [grip], SUBTRACTION)
}
```

A posse/descarte será refinada nos Tasks 9 e 10. O spike valida a topologia.

**Step 5: Run spike**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/csg.test.ts`

Expected: PASS. Meça o tempo. Se falhar, NÃO continue; reporte o fallback.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/csg.ts \
  src/features/studio/tools/lembrancinhas/termoformador/trayParts.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/csg.test.ts
git commit -m "spike: validate tray csg"
```

---

### Task 9: Suporte das novas formas

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/trayParts.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/trayParts.test.ts`

**Step 1: Add failing tests**

```ts
  it('suporte quadrado ocupa o envelope e fica apoiado', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const support = buildTraySupport(params, outline)
    support.computeBoundingBox()
    expect(support.boundingBox!.min.y).toBeCloseTo(0, 2)
    expect(support.boundingBox!.max.y).toBeCloseTo(dims.height, 2)
    expect(isClosed(support)).toBe(true)
    support.dispose()
  })

  it('degrau fica sob a moldura e a abertura é a borda interna', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    expect(dims.effectiveStep).toBeCloseTo(params.frameWidth + params.fitClearance, 5)
    expect(dims.stepClamped).toBe(true)
  })
```

**Step 2: Run test**

Expected: FAIL/PASS conforme o spike; complete as asserções.

**Step 3: Refine `buildTraySupport`**

- Garanta que o rebaixo e a cavidade compartilham `seatY` sem sobreposição dupla.
- A `cavityOpening` já vem do outline (borda interna da moldura ou menor, se o degrau pedido for maior).
- Use `dims.bottomScale`, `dims.seatY`, `params.bottomThickness`.
- O resultado deve ter a base em `y = 0`, topo em `dims.height`, sem peças soltas.
- Se a malha não fechar, use `SUBTRACTION` sequencial e limpeza após cada etapa.

**Step 4: Run tests**

Expected: PASS. Run `npm run typecheck`.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/trayParts.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/trayParts.test.ts
git commit -m "feat: build tray supports"
```

---

### Task 10: Macho das novas formas

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/trayParts.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/trayParts.test.ts`

**Step 1: Add failing tests**

```ts
  it('macho encaixa sem invadir a moldura', () => {
    const params = { ...defaultThermoformerParams, shape: 'square' as const, width: 120 }
    const outline = getShapeOutline(params)!
    const dims = getTrayDimensions(params, outline)
    const plug = buildTrayPlug(params, outline)
    plug.computeBoundingBox()
    expect(plug.boundingBox!.max.y).toBeCloseTo(dims.bodyTop, 2)
    expect(isClosed(plug)).toBe(true)
    expect(signedVolume(plug)).toBeGreaterThan(0)
    plug.dispose()
  })
```

**Step 2: Run test**

Expected: FAIL até o grip/corpo fechar.

**Step 3: Refine `buildTrayPlug`**

- O corpo vai de `contactY` a `bodyTop` no contorno da tela.
- A protrusão vai de `bottomThickness + thickness` a `contactY`, com abertura no topo e fundo reduzido.
- A união corpo + protrusão cria a coroa de contato; o cone da pega é subtraído no topo.
- O macho deve ter `max.y = bodyTop` e o topo plano para o giro de impressão.
- Se o cone deixar a malha aberta, posicione-o ligeiramente acima do topo (overlap) e corte; a limpeza resolve os triângulos colineares.

**Step 4: Run tests**

Expected: PASS. Run `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador` e `npm run typecheck`.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/trayParts.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/trayParts.test.ts
git commit -m "feat: build tray male molds"
```

---

### Task 11: Dispatch, buildThermoformer e worker

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/buildPlug.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/workerClient.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/buildScreen.worker.ts`
- Test: buildThermoformer, workerGeometry, useThermoformer, StudioPage fixtures

**Step 1: Update failing fixtures/tests**

- `buildThermoformer` agora recebe `(params, parsedSvg?)` e devolve `{ screen, support, plug, seatY }` ou `null` para SVG inválido.
- O worker recebe `{ params, parsedSvg }`.
- Nos testes, as fixtures de `BuildThermoformerResult` continuam com as três peças; adicione um caso quadrado.

**Step 2: Implement dispatch**

`buildSupport.ts`:
```ts
export function buildSupport(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): BufferGeometry {
  if (params.shape === 'circle') {
    const geometry = new LatheGeometry(buildSupportProfile(params), SCREEN_SEGMENTS)
    return removeDegenerateTriangles(geometry)
  }
  return buildTraySupport(params, outline)
}
```

`buildPlug.ts`:
```ts
export function buildPlug(
  params: ThermoformerGeometryParams,
  outline: ShapeOutline,
): BufferGeometry {
  if (params.shape === 'circle') {
    const geometry = new LatheGeometry(buildPlugProfile(params), SCREEN_SEGMENTS)
    return removeDegenerateTriangles(geometry)
  }
  return buildTrayPlug(params, outline)
}
```

`buildThermoformer.ts`:
```ts
export function buildThermoformer(
  params: ThermoformerGeometryParams,
  parsedSvg?: ParsedSvg | null,
): BuildThermoformerResult | null {
  const outline = getShapeOutline(params, parsedSvg)
  if (!outline) return null
  const dims = params.shape === 'circle'
    ? getSupportDimensions(params)
    : getTrayDimensions(params, outline)
  return {
    screen: buildScreen(params, outline),
    support: buildSupport(params, outline),
    plug: buildPlug(params, outline),
    seatY: dims.seatY,
  }
}
```

`workerClient.ts`:
```ts
build(params, parsedSvg, onResult, onError?) {
  ...
  worker.postMessage({ params, parsedSvg })
}
```

`buildScreen.worker.ts`:
```ts
scope.onmessage = (event) => {
  const { params, parsedSvg } = event.data
  const result = buildThermoformer(params, parsedSvg)
  if (!result) {
    scope.postMessage({ error: 'invalid-outline' })
    return
  }
  const { data, transfer } = serializeThermoformerResult(result)
  scope.postMessage({ data }, transfer)
}
```

O `workerClient` deve tratar a mensagem `error`. O hook define a mensagem. O `workerGeometry` continua com três geometrias e `seatY`.

**Step 3: Run tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

Expected: PASS. Run `npm run typecheck`.

**Step 4: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts \
  src/features/studio/tools/lembrancinhas/termoformador/buildPlug.ts \
  src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts \
  src/features/studio/tools/lembrancinhas/termoformador/workerClient.ts \
  src/features/studio/tools/lembrancinhas/termoformador/buildScreen.worker.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts
git commit -m "feat: dispatch shape builds"
```

---

### Task 12: Hook, SVG e enquadramento

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

**Step 1: Add failing tests**

- Trocar `shape` para `square` e conferir que o worker recebe `shape: 'square'`.
- `setSvg` com um SVG válido e com um inválido; conferir `svgError`.
- O outline/plugLift para quadrado; o `fitRadius`.
- O dispose das três geometrias; o shape reset.

**Step 2: Implement**

- Adicione `setSvg` ao reducer, com `svg: z.string()`; o parse cacheado por conteúdo.
- Exponha `outline`, `svgError`, `setSvg`.
- Se `shape === 'svg'` e não houver `svg`, não chame o worker e mostre `svg-missing`.
- O `parsedSvg` vai ao worker; o outline é derivado com `getShapeOutline(buildParams, parsedSvg)`.
- `plugLift = (shape === 'circle' ? supportDims.effectiveBowlDepth : getTrayDimensions(buildParams, outline).effectiveDepth) + PLUG_PREVIEW_GAP_MM`.
- `fallbackDimensions` usa `outline.bounds`/`getTrayDimensions`/`getSupportDimensions`.
- `fitRadius` já usa a união suporte + macho; mantenha.
- `dimensions` continua do bbox do suporte.
- O parse usa `parseSvg` da shared; o cache em `useRef`.
- O worker `build(buildParams, parsedSvg, ...)`; o erro `invalid-outline`.

**Step 3: Run tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

Expected: PASS. Run `npm run typecheck`.

**Step 4: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts
git commit -m "feat: handle shapes and svg in hook"
```

---

### Task 13: Painel Forma e upload

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`

**Step 1: Add failing tests**

- Seletor "Forma" com as cinco opções.
- Quadrado mostra "Lado"; retângulo "Largura"/"Altura"; pirâmide "Lado da base"/"Fundo da pirâmide"; SVG mostra "Tamanho do SVG" e o botão de upload.
- Métricas de suporte/tela/macho para o quadrado.
- O upload chama `onSetSvg`; o erro aparece.
- O degrau efetivo aparece quando ampliado.

**Step 2: Implement**

- Adicione `SelectField` "Forma" no novo acordeão **Forma**, antes de Tela.
- Adicione `unit?: string` ao `LabeledSlider`; `%` para `pyramidTip`, `°` para `draftAngle`.
- Campos condicionais e `onUpdateParam` para shape/width/height/svgSize/draftAngle/pyramidTip.
- O upload com `input type=file` escondido + `Button`; `file.text()` e `onSetSvg`.
- O painel recebe `outline`, `svgError`, `onSetSvg`; calcule `computeScreenPattern`, `getTrayDimensions`, `getPlugDimensions` a partir deles.
- Métricas: envelope do suporte, altura, degrau efetivo, largura × altura da tela, macho/pega.
- Nota da tela plana; o SVG carregado/remover; `Alert` de erro.
- Mantenha as seções e os testes atuais; o círculo mantém as métricas atuais.

**Step 3: Run tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`

Expected: PASS. Run `npm run typecheck`.

**Step 4: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx
git commit -m "feat: add shape panel and svg upload"
```

---

### Task 14: Preview, StudioPage e card

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx` (se necessário)
- Modify: `src/features/studio/components/ToolSelector.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx`

**Step 1: Update tests/fixtures**

- O wrapper passa `outline`, `svgError`, `onSetSvg` ao painel.
- O fixture `serializedScreen` inclui as três peças e uma forma quadrada em um teste novo.
- O card menciona as formas e o SVG.
- O preview continua com três malhas e `plugLift`.

**Step 2: Implement**

- Desestruture `outline`, `svgError`, `setSvg` do hook e passe ao painel.
- O preview não muda de contrato; o `plugLift`/as geometrias vêm do hook.
- O card: "Tela perfurada com formas circular, quadrada, retangular, pirâmide ou SVG; suporte e macho correspondentes."
- O status bar continua com o envelope do suporte.

**Step 3: Run tests**

Run: `npm run test -- tests/features/studio/StudioPage.test.tsx tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx tests/features/studio/components/ToolSelector.test.tsx`

Expected: PASS. Run `npm run typecheck`.

**Step 4: Commit**

```bash
git add src/features/studio/StudioPage.tsx \
  src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx \
  src/features/studio/components/ToolSelector.tsx \
  tests/features/studio/StudioPage.test.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx \
  tests/features/studio/components/ToolSelector.test.tsx
git commit -m "feat: integrate shape preview and panel"
```

---

### Task 15: Export das novas formas

**Files:**
- Modify: `tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts` (somente se necessário)

**Step 1: Add tests**

- Exporte um resultado de suporte/macho quadrado; confira os três nomes e o giro do macho.
- Confira que as geometrias originais não são descartadas/alteradas.
- Mantenha o teste do círculo.

**Step 2: Implement**

O export continua igual; se o `centerOnBed`/`preparePlugForPrint` já funcionam com as novas geometrias, apenas confirme. Ajuste o JSDoc para "três peças".

**Step 3: Run tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts \
  src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts
git commit -m "test: cover shape exports"
```

---

### Task 16: Validação por forma e SVG

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`

**Step 1: Add failing tests**

- `support-step-clamped` para quadrado com step 5/frame 6.
- `support-step-frame` com step 8/frame 6.
- `support-draft` com draftAngle 1.
- `support-tip` com pirâmide pequena.
- `svg-missing`/`svg-parse`/`svg-contour`.
- `screen-empty`/`screen-frame` em forma estreita.
- `support-depth` quando a bandeja limita a profundidade.

**Step 2: Implement**

- A assinatura `validateThermoformer(params, outline, parsedSvg?)`.
- Use o outline/dims; o círculo mantém as issues atuais.
- Adicione os códigos ao union e as mensagens.
- `screen-opening` para o polígono usa `min(innerBounds.width, innerBounds.height)/2`.
- O `screen-frame` usa `outline.perforated` vazio.
- O `svg-parse` é do hook; a validação recebe `svgError` ou infere o outline nulo.
- Avisos não bloqueiam; erros de SVG impedem o build.

**Step 3: Run tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`

Expected: PASS. Run `npm run typecheck`.

**Step 4: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts
git commit -m "feat: validate shapes and svg"
```

---

### Task 17: Documentação e validação final

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md`
- Modify: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Step 1: Update docs**

- Status v2: círculo + quadrado + retângulo + pirâmide + SVG.
- Parâmetros novos e defaults.
- Regras: conjunto inteiro, bandeja inclinada, pirâmide truncada, degrau efetivo, CSG/fallback, SVG silhueta única, parse na main thread, maior dimensão.
- Pipeline, export, validação, decisões, riscos e fora de escopo.
- `docs/frontend/studio.md`: descrição, arquivos, seção, pipeline, detalhes e validação.
- O card já foi atualizado no Task 14.

**Step 2: Full validation**

Run:
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

Se o `npm run test` paralelo apresentar o timeout de worker já conhecido, rode `npx vitest run --maxWorkers=1` e registre os dois resultados. Todos os testes precisam passar.

**Step 3: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md \
  src/features/studio/tools/lembrancinhas/AGENTS.md \
  docs/frontend/studio.md
git commit -m "docs: document thermoformer shapes"
```

---

## Pontos de atenção

1. O spike de CSG é um gate. Se suporte/macho não fecharem, pare e implemente o fallback de loft do design; não force o CSG.
2. O contorno do SVG precisa ser **uma** silhueta sem furos; use `pathsToShapes` e verifique `holes`.
3. O eixo do SVG é Y para baixo; o contorno é invertido em Y antes de virar `Shape`, e o `ExtrudeGeometry`/loft usam Y do contorno → -Z.
4. O degrau efetivo das novas formas é `max(stepWidth, frameWidth + fitClearance)`; a cavidade usa a abertura recuada pelo degrau efetivo.
5. A moldura deve ficar sobre o degrau; o macho não pode invadir a tela. Teste a colisão.
6. O modo círculo não pode regredir: os testes atuais continuam.
7. O `parsedSvg` vai ao worker; o `SVGLoader`/`DOMParser` fica na main thread.
8. A status bar continua com o envelope do suporte; o painel mostra as medidas da tela.
9. O macho é impresso girado 180°; o topo plano na mesa.
10. Três downloads podem acionar a permissão de múltiplos arquivos.
