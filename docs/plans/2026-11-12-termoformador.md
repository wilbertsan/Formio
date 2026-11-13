# Termoformador Implementation Plan

> **Nota histórica:** este plano implementou a ferramenta que foi renomeada
> para **Caixa Personalizada** em 2026-11-13. Os nomes de arquivos e símbolos
> abaixo refletem o estado original; a fonte atual está em
> `lembrancinhas/caixa-personalizada` e em
> `docs/plans/2026-11-13-caixa-personalizada-rename.md`.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar a ferramenta Termoformador no Studio 3D, gerando corpo, tampa, painel perfurado, pino lateral e base como STLs separados.

**Architecture:** Schema Zod + reducer/worker. Corpo e tampa usam um loft de anéis de retângulo arredondado; painel e base usam `ExtrudeGeometry`; pino usa `LatheGeometry`. Sem CSG. O painel é uma peça separada apoiada na face frontal; o pino tem flange colado na lateral. Exportação baixa um STL por peça habilitada.

**Tech Stack:** React 19, TypeScript strict, Three.js, React Three Fiber, Zod, Amplify UI, Vitest, TailwindCSS 4.

**Design de referência:** `docs/plans/2026-11-12-caixa-personalizada-design.md`
(originalmente `docs/plans/2026-11-12-termoformador-design.md`, renomeado em 2026-11-13)

---

## Pré-requisitos e convenções

- Trabalhar em worktree dedicado (quando a execução for iniciada).
- 1 unidade Three.js = 1 mm.
- Não usar `any`. Tipar retornos.
- Não criar componente de UI duplicado: reutilizar Amplify UI.
- Testes em `tests/features/studio/tools/lembrancinhas/termoformador/`.
- Rodar sempre o teste específico antes do commit.
- Commits semânticos `feat:`, `test:`, `docs:`.

### Ajuste de default

O design aprovado cita `frontPanelHeight: 80`, mas o corpo padrão tem
`height 60 + rimHeight 3 = 63`. Para evitar um aviso de painel maior que o corpo
já na abertura, a implementação usa **`frontPanelHeight: 50`**. O design será
atualizado no Task 18.

---

## Task 1: Schema, defaults e sanitização

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/schema.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import {
  defaultThermoformerParams,
  sanitizeFilename,
  thermoformerParamsSchema,
  MAX_PANEL_OPENINGS,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('termoformador schema', () => {
  it('defaults válidos', () => {
    expect(thermoformerParamsSchema.safeParse(defaultThermoformerParams).success).toBe(true)
    expect(defaultThermoformerParams).toMatchObject({
      productType: 'termoformador',
      width: 160,
      depth: 120,
      height: 60,
      frontPanelHeight: 50,
      lidEnabled: true,
      handleEnabled: true,
      baseEnabled: true,
      fitType: 'external',
      pattern: 'perforated',
    })
  })

  it('rejeita dimensões fora da faixa', () => {
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, width: 59 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, height: 121 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, holeDiameter: 0.7 }).success).toBe(false)
  })

  it('rejeita enums inválidos', () => {
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, fitType: 'press' as never }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, pattern: 'dots' as never }).success).toBe(false)
  })

  it('sanitizeFilename', () => {
    expect(sanitizeFilename('Meu Termoformador! @#')).toBe('Meu-Termoformador')
    expect(sanitizeFilename('')).toBe('termoformador')
    expect(sanitizeFilename('Corpo 3D')).toBe('Corpo-3D')
  })

  it('limite de aberturas é 800', () => {
    expect(MAX_PANEL_OPENINGS).toBe(800)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts`
Expected: FAIL com "Cannot find module" ou "termoformerParamsSchema is not defined".

**Step 3: Implementar o schema**

```ts
import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'termoformador' as const

export const FIT_TYPES = ['external', 'internal'] as const
export const SURFACE_CURVATURES = ['flat', 'slightly_convex', 'slightly_concave'] as const
export const PANEL_PATTERNS = ['perforated', 'grid', 'mesh'] as const
export const HANDLE_SIDES = ['left', 'right', 'top', 'bottom'] as const

export const MINIMUM_WALL_MM = 0.8
export const MINIMUM_FEATURE_MM = 0.8
export const MAX_PANEL_OPENINGS = 800
export const PANEL_CURVATURE_MM = 1.5
export const SHELL_SEGMENTS = 128

export type FitType = (typeof FIT_TYPES)[number]
export type SurfaceCurvature = (typeof SURFACE_CURVATURES)[number]
export type PanelPattern = (typeof PANEL_PATTERNS)[number]
export type HandleSide = (typeof HANDLE_SIDES)[number]

export const thermoformerParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  width: z.number().min(60).max(300),
  depth: z.number().min(60).max(300),
  height: z.number().min(20).max(120),
  cornerRadius: z.number().min(0).max(40),
  wallThickness: z.number().min(1.2).max(6),
  bottomThickness: z.number().min(1.2).max(6),
  rimHeight: z.number().min(0).max(10),
  rimThickness: z.number().min(1.2).max(6),
  edgeChamfer: z.number().min(0).max(3),
  lidEnabled: z.boolean(),
  lidThickness: z.number().min(1.2).max(6),
  lidHeight: z.number().min(0).max(30),
  lidClearance: z.number().min(0.1).max(0.6),
  lidCornerRadius: z.number().min(0).max(40),
  lidFitDepth: z.number().min(2).max(20),
  fitType: z.enum(FIT_TYPES),
  frontPanelWidth: z.number().min(40).max(300),
  frontPanelHeight: z.number().min(40).max(300),
  frontPanelThickness: z.number().min(1).max(5),
  frontPanelCornerRadius: z.number().min(0).max(40),
  borderWidth: z.number().min(3).max(20),
  surfaceCurvature: z.enum(SURFACE_CURVATURES),
  pattern: z.enum(PANEL_PATTERNS),
  holeDiameter: z.number().min(0.8).max(6),
  holeSpacingX: z.number().min(1).max(10),
  holeSpacingY: z.number().min(1).max(10),
  gridThickness: z.number().min(0.8).max(4),
  gridAngle: z.number().min(0).max(90),
  handleEnabled: z.boolean(),
  handleDiameter: z.number().min(3).max(20),
  handleLength: z.number().min(5).max(60),
  handleBaseDiameter: z.number().min(4).max(30),
  handleTipRadius: z.number().min(0).max(5),
  handleSide: z.enum(HANDLE_SIDES),
  handleHeight: z.number().min(0).max(1),
  baseEnabled: z.boolean(),
  baseHeight: z.number().min(0).max(30),
  baseThickness: z.number().min(1.2).max(6),
  baseCornerRadius: z.number().min(0).max(40),
  printClearance: z.number().min(0.2).max(0.3),
  bodyColor: z.enum(PLA_COLORS),
  accentColor: z.enum(PLA_COLORS),
})

export type ThermoformerParams = z.infer<typeof thermoformerParamsSchema>

/** Campos que alteram geometria. Cores ficam de fora para não rebuildar. */
export type ThermoformerGeometryParams = Omit<ThermoformerParams, 'bodyColor' | 'accentColor'>

export const defaultThermoformerParams: ThermoformerParams = {
  productType: PRODUCT_TYPE,
  width: 160,
  depth: 120,
  height: 60,
  cornerRadius: 10,
  wallThickness: 2.4,
  bottomThickness: 2.4,
  rimHeight: 3,
  rimThickness: 3,
  edgeChamfer: 0.4,
  lidEnabled: true,
  lidThickness: 2.4,
  lidHeight: 6,
  lidClearance: 0.3,
  lidCornerRadius: 14,
  lidFitDepth: 6,
  fitType: 'external',
  frontPanelWidth: 140,
  frontPanelHeight: 50,
  frontPanelThickness: 3,
  frontPanelCornerRadius: 8,
  borderWidth: 8,
  surfaceCurvature: 'flat',
  pattern: 'perforated',
  holeDiameter: 2.5,
  holeSpacingX: 5,
  holeSpacingY: 5,
  gridThickness: 1.5,
  gridAngle: 0,
  handleEnabled: true,
  handleDiameter: 8,
  handleLength: 25,
  handleBaseDiameter: 16,
  handleTipRadius: 2,
  handleSide: 'right',
  handleHeight: 0.5,
  baseEnabled: true,
  baseHeight: 6,
  baseThickness: 2.4,
  baseCornerRadius: 13,
  printClearance: 0.25,
  bodyColor: '#22c55e',
  accentColor: '#f5f5f5',
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'termoformador'
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/schema.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts
git commit -m "feat: add termoformador schema"
```

---

## Task 2: Formas e loops de retângulo arredondado

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/shapes.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/shapes.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import {
  roundedRectPath,
  roundedRectPoints,
  roundedRectShape,
} from '@/features/studio/tools/lembrancinhas/termoformador/shapes'

describe('shapes', () => {
  it('gera exatamente a contagem de pontos pedida', () => {
    const points = roundedRectPoints(100, 60, 10, 64)
    expect(points).toHaveLength(64)
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    expect(Math.min(...xs)).toBeCloseTo(-50, 1)
    expect(Math.max(...xs)).toBeCloseTo(50, 1)
    expect(Math.min(...ys)).toBeCloseTo(-30, 1)
    expect(Math.max(...ys)).toBeCloseTo(30, 1)
  })

  it('suporta raio zero', () => {
    const points = roundedRectPoints(100, 60, 0, 16)
    expect(points).toHaveLength(16)
    expect(points.every((point) => Math.abs(point.x) <= 50.001 && Math.abs(point.y) <= 30.001)).toBe(true)
  })

  it('cria shape e path sem furos', () => {
    const shape = roundedRectShape(100, 60, 10)
    const path = roundedRectPath(100, 60, 10)
    expect(shape.getPoints(8).length).toBeGreaterThan(8)
    expect(shape.holes).toHaveLength(0)
    expect(path.getPoints(8).length).toBeGreaterThan(8)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/shapes.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import { Path, Shape, Vector2 } from 'three'

function traceRoundedRect(path: Path, width: number, depth: number, radius: number): void {
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const r = Math.max(0, Math.min(radius, halfWidth, halfDepth))

  if (r <= 1e-6) {
    path.moveTo(-halfWidth, -halfDepth)
    path.lineTo(halfWidth, -halfDepth)
    path.lineTo(halfWidth, halfDepth)
    path.lineTo(-halfWidth, halfDepth)
    path.lineTo(-halfWidth, -halfDepth)
    return
  }

  path.moveTo(-halfWidth + r, -halfDepth)
  path.lineTo(halfWidth - r, -halfDepth)
  path.absarc(halfWidth - r, -halfDepth + r, r, -Math.PI / 2, 0, false)
  path.lineTo(halfWidth, halfDepth - r)
  path.absarc(halfWidth - r, halfDepth - r, r, 0, Math.PI / 2, false)
  path.lineTo(-halfWidth + r, halfDepth)
  path.absarc(-halfWidth + r, halfDepth - r, r, Math.PI / 2, Math.PI, false)
  path.lineTo(-halfWidth, -halfDepth + r)
  path.absarc(-halfWidth + r, -halfDepth + r, r, Math.PI, (3 * Math.PI) / 2, false)
}

export function roundedRectShape(width: number, depth: number, radius: number): Shape {
  const shape = new Shape()
  traceRoundedRect(shape, width, depth, radius)
  return shape
}

export function roundedRectPath(width: number, depth: number, radius: number): Path {
  const path = new Path()
  traceRoundedRect(path, width, depth, radius)
  return path
}

function resampleClosedLoop(points: Vector2[], count: number): Vector2[] {
  const totalPoints = points.length
  if (totalPoints === 0) return []
  if (totalPoints === 1) return Array.from({ length: count }, () => points[0].clone())

  const lengths: number[] = []
  let total = 0
  for (let i = 0; i < totalPoints; i++) {
    const length = points[i].distanceTo(points[(i + 1) % totalPoints])
    lengths.push(length)
    total += length
  }
  if (total < 1e-6) return Array.from({ length: count }, () => points[0].clone())

  const step = total / count
  const result: Vector2[] = []
  let segment = 0
  let segmentStart = 0

  for (let i = 0; i < count; i++) {
    const target = i * step
    while (segment < totalPoints - 1 && segmentStart + lengths[segment] < target) {
      segmentStart += lengths[segment]
      segment++
    }
    const t = lengths[segment] > 1e-9 ? (target - segmentStart) / lengths[segment] : 0
    const a = points[segment]
    const b = points[(segment + 1) % totalPoints]
    result.push(new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t))
  }

  return result
}

export function roundedRectPoints(
  width: number,
  depth: number,
  radius: number,
  count: number,
): Vector2[] {
  const shape = roundedRectShape(width, depth, radius)
  const divisions = Math.max(8, Math.ceil(count / 8))
  const extracted = shape.extractPoints(divisions).shape
  const points: Vector2[] = []

  for (const point of extracted) {
    const last = points[points.length - 1]
    if (!last || last.distanceTo(point) > 1e-6) points.push(point.clone())
  }
  if (points.length > 1 && points[0].distanceTo(points[points.length - 1]) <= 1e-6) {
    points.pop()
  }

  return resampleClosedLoop(points, count)
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/shapes.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/shapes.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/shapes.test.ts
git commit -m "feat: add rounded rect shapes"
```

---

## Task 3: Loft de casca (corpo e tampa)

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/shell.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/geometryTestUtils.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/shell.test.ts`

**Step 1: Criar o utilitário de teste de malha fechada**

```ts
import type { BufferGeometry } from 'three'

function positionKey(x: number, y: number, z: number): string {
  return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`
}

/** Considera fechada quando cada aresta aparece exatamente em 2 triângulos. */
export function isClosed(geometry: BufferGeometry): boolean {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const edges = new Map<string, number>()
  const count = index ? index.count : position.count

  const vertex = (i: number): string => {
    const idx = index ? index.getX(i) : i
    return positionKey(position.getX(idx), position.getY(idx), position.getZ(idx))
  }
  const edge = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

  for (let i = 0; i < count; i += 3) {
    const a = vertex(i)
    const b = vertex(i + 1)
    const c = vertex(i + 2)
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      const key = edge(p, q)
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
  }

  for (const value of edges.values()) if (value !== 2) return false
  return true
}
```

**Step 2: Escrever o teste do loft**

```ts
import { describe, it, expect } from 'vitest'
import {
  buildBodyShell,
  buildLidShell,
} from '@/features/studio/tools/lembrancinhas/termoformador/shell'
import { isClosed } from './geometryTestUtils'

describe('shell', () => {
  it('corpo é fechado e respeita as dimensões externas', () => {
    const geometry = buildBodyShell({
      outer: { width: 100, depth: 60, radius: 10 },
      inner: { width: 95.2, depth: 55.2, radius: 7.6 },
      rimInner: { width: 94, depth: 54, radius: 7 },
      bottomThickness: 2.4,
      height: 60,
      rimHeight: 3,
      chamfer: 0.4,
      segments: 64,
    })

    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.x).toBeCloseTo(-50, 1)
    expect(box.max.x).toBeCloseTo(50, 1)
    expect(box.min.z).toBeCloseTo(-30, 1)
    expect(box.max.z).toBeCloseTo(30, 1)
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(box.max.y).toBeCloseTo(63, 1)
    expect(geometry.getAttribute('position').count).toBeGreaterThan(1000)
    expect(isClosed(geometry)).toBe(true)
  })

  it('tampa é fechada e tem a altura total', () => {
    const geometry = buildLidShell({
      outer: { width: 106, depth: 66, radius: 13 },
      inner: { width: 100.8, depth: 60.8, radius: 10.3 },
      totalHeight: 14.4,
      plateThickness: 2.4,
      chamfer: 0.4,
      segments: 64,
    })

    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(box.max.y).toBeCloseTo(14.4, 1)
    expect(isClosed(geometry)).toBe(true)
  })
})
```

**Step 3: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/shell.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 4: Implementar o loft**

```ts
import { BufferGeometry, Float32BufferAttribute, Vector2, Vector3 } from 'three'
import { roundedRectPoints } from './shapes'

export interface RoundedRectSpec {
  width: number
  depth: number
  radius: number
}

export interface BodyShellInput {
  outer: RoundedRectSpec
  inner: RoundedRectSpec
  rimInner: RoundedRectSpec
  bottomThickness: number
  height: number
  rimHeight: number
  chamfer: number
  segments: number
}

export interface LidShellInput {
  outer: RoundedRectSpec
  inner: RoundedRectSpec
  totalHeight: number
  plateThickness: number
  chamfer: number
  segments: number
}

const EPS = 1e-6

function insetSpec(spec: RoundedRectSpec, distance: number): RoundedRectSpec {
  const d = Math.max(0, distance)
  return {
    width: Math.max(0.2, spec.width - 2 * d),
    depth: Math.max(0.2, spec.depth - 2 * d),
    radius: Math.max(0, spec.radius - d),
  }
}

function loopAt(spec: RoundedRectSpec, y: number, segments: number): Vector3[] {
  return roundedRectPoints(spec.width, spec.depth, spec.radius, segments).map(
    (point: Vector2) => new Vector3(point.x, y, point.y),
  )
}

function horizontalReference(mid: Vector3, inward: boolean): Vector3 {
  const reference = inward
    ? new Vector3(-mid.x, 0, -mid.z)
    : new Vector3(mid.x, 0, mid.z)
  if (reference.lengthSq() < EPS) reference.set(0, 0, 1)
  return reference.normalize()
}

class TriangleBuilder {
  private readonly positions: number[] = []

  triangle(a: Vector3, b: Vector3, c: Vector3, reference: Vector3): void {
    let second = b
    let third = c
    const normal = new Vector3()
      .subVectors(second, a)
      .cross(new Vector3().subVectors(third, a))
    if (normal.lengthSq() < 1e-12) return
    if (normal.dot(reference) < 0) {
      const swap = second
      second = third
      third = swap
    }
    this.positions.push(
      a.x, a.y, a.z,
      second.x, second.y, second.z,
      third.x, third.y, third.z,
    )
  }

  quad(a0: Vector3, a1: Vector3, b1: Vector3, b0: Vector3, reference: Vector3): void {
    this.triangle(a0, a1, b1, reference)
    this.triangle(a0, b1, b0, reference)
  }

  fan(loop: Vector3[], center: Vector3, reference: Vector3): void {
    for (let i = 0; i < loop.length; i++) {
      this.triangle(center, loop[i], loop[(i + 1) % loop.length], reference)
    }
  }

  annulus(outer: Vector3[], inner: Vector3[], reference: Vector3): void {
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length
      this.quad(outer[i], outer[j], inner[j], inner[i], reference)
    }
  }

  wall(a: Vector3[], b: Vector3[], inward: boolean): void {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length
      const mid = new Vector3().addVectors(a[i], a[j]).multiplyScalar(0.5)
      this.quad(a[i], a[j], b[j], b[i], horizontalReference(mid, inward))
    }
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3))
    geometry.computeVertexNormals()
    return geometry
  }
}

export function buildBodyShell(input: BodyShellInput): BufferGeometry {
  const { outer, inner, rimInner, bottomThickness, height, rimHeight, segments } = input
  const top = height + rimHeight
  const chamfer = Math.max(
    0,
    Math.min(input.chamfer, Math.min(outer.width, outer.depth) * 0.1, top * 0.45),
  )

  const bottomInset = chamfer > EPS ? insetSpec(outer, chamfer) : outer
  const topInset = chamfer > EPS ? insetSpec(outer, chamfer) : outer
  const outerBottom = loopAt(bottomInset, 0, segments)
  const outerAfterBottom = loopAt(outer, chamfer, segments)
  const outerBeforeTop = loopAt(outer, top - chamfer, segments)
  const outerTop = loopAt(topInset, top, segments)
  const innerBottom = loopAt(inner, bottomThickness, segments)
  const innerTop = loopAt(inner, height, segments)
  const rimBottom = loopAt(rimInner, height, segments)
  const rimTop = loopAt(rimInner, top, segments)

  const builder = new TriangleBuilder()
  builder.fan(outerBottom, new Vector3(0, 0, 0), new Vector3(0, -1, 0))
  if (chamfer > EPS) builder.wall(outerBottom, outerAfterBottom, false)
  builder.wall(outerAfterBottom, outerBeforeTop, false)
  if (chamfer > EPS) builder.wall(outerBeforeTop, outerTop, false)
  builder.wall(innerBottom, innerTop, true)
  builder.fan(innerBottom, new Vector3(0, bottomThickness, 0), new Vector3(0, 1, 0))

  if (rimHeight > EPS) {
    builder.annulus(innerTop, rimBottom, new Vector3(0, -1, 0))
    builder.wall(rimBottom, rimTop, true)
    builder.annulus(outerTop, rimTop, new Vector3(0, 1, 0))
  } else {
    builder.annulus(outerTop, innerTop, new Vector3(0, 1, 0))
  }

  return builder.build()
}

export function buildLidShell(input: LidShellInput): BufferGeometry {
  const { outer, inner, totalHeight, plateThickness, segments } = input
  const top = Math.max(totalHeight, plateThickness + 0.2)
  const plateBottom = Math.max(0.1, top - plateThickness)
  const chamfer = Math.max(
    0,
    Math.min(input.chamfer, Math.min(outer.width, outer.depth) * 0.1, top * 0.45),
  )

  const bottomInset = chamfer > EPS ? insetSpec(outer, chamfer) : outer
  const topInset = chamfer > EPS ? insetSpec(outer, chamfer) : outer
  const outerBottom = loopAt(bottomInset, 0, segments)
  const outerAfterBottom = loopAt(outer, chamfer, segments)
  const outerBeforeTop = loopAt(outer, top - chamfer, segments)
  const outerTop = loopAt(topInset, top, segments)
  const innerBottom = loopAt(inner, 0, segments)
  const innerTop = loopAt(inner, plateBottom, segments)

  const builder = new TriangleBuilder()
  builder.annulus(outerBottom, innerBottom, new Vector3(0, -1, 0))
  if (chamfer > EPS) builder.wall(outerBottom, outerAfterBottom, false)
  builder.wall(outerAfterBottom, outerBeforeTop, false)
  if (chamfer > EPS) builder.wall(outerBeforeTop, outerTop, false)
  builder.wall(innerBottom, innerTop, true)
  builder.fan(innerTop, new Vector3(0, plateBottom, 0), new Vector3(0, -1, 0))
  builder.fan(outerTop, new Vector3(0, top, 0), new Vector3(0, 1, 0))

  return builder.build()
}
```

**Step 5: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/shell.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/shell.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/geometryTestUtils.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/shell.test.ts
git commit -m "feat: add thermoformer shell loft"
```

---

## Task 4: Corpo

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildBody.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildBody.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { Mesh, Raycaster, Vector3 } from 'three'
import { buildBody } from '@/features/studio/tools/lembrancinhas/termoformador/buildBody'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed } from './geometryTestUtils'

describe('buildBody', () => {
  it('ocupa as dimensões externas e é fechado', () => {
    const params = defaultThermoformerParams
    const geometry = buildBody(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-params.width / 2, 1)
    expect(box.max.x).toBeCloseTo(params.width / 2, 1)
    expect(box.min.z).toBeCloseTo(-params.depth / 2, 1)
    expect(box.max.z).toBeCloseTo(params.depth / 2, 1)
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(box.max.y).toBeCloseTo(params.height + params.rimHeight, 1)
    expect(isClosed(geometry)).toBe(true)
  })

  it('tem cavidade: o raio central atinge o fundo interno', () => {
    const params = defaultThermoformerParams
    const geometry = buildBody(params)
    const raycaster = new Raycaster(
      new Vector3(0, params.height + 50, 0),
      new Vector3(0, -1, 0),
    )
    const hits = raycaster.intersectObject(new Mesh(geometry), false)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].point.y).toBeCloseTo(params.bottomThickness, 1)
  })

  it('tem rim acima da parede', () => {
    const params = { ...defaultThermoformerParams, rimHeight: 8 }
    const geometry = buildBody(params)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.y).toBeCloseTo(params.height + 8, 1)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildBody.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import type { BufferGeometry } from 'three'
import { buildBodyShell, type RoundedRectSpec } from './shell'
import { SHELL_SEGMENTS, type ThermoformerGeometryParams } from './schema'

export function buildBody(params: ThermoformerGeometryParams): BufferGeometry {
  const halfMin = Math.min(params.width, params.depth) / 2
  const wall = Math.min(params.wallThickness, halfMin - 0.2)
  const rimThickness = Math.max(
    wall,
    Math.min(params.rimThickness, halfMin - 0.2),
  )

  const outer: RoundedRectSpec = {
    width: params.width,
    depth: params.depth,
    radius: Math.min(params.cornerRadius, halfMin),
  }
  const inner: RoundedRectSpec = {
    width: Math.max(0.2, params.width - 2 * wall),
    depth: Math.max(0.2, params.depth - 2 * wall),
    radius: Math.max(0, params.cornerRadius - wall),
  }
  const rimInner: RoundedRectSpec = {
    width: Math.max(0.2, params.width - 2 * rimThickness),
    depth: Math.max(0.2, params.depth - 2 * rimThickness),
    radius: Math.max(0, params.cornerRadius - rimThickness),
  }

  const chamfer = Math.min(
    params.edgeChamfer,
    wall * 0.8,
    rimThickness * 0.8,
    (params.height + params.rimHeight) * 0.2,
  )

  return buildBodyShell({
    outer,
    inner,
    rimInner,
    bottomThickness: params.bottomThickness,
    height: params.height,
    rimHeight: params.rimHeight,
    chamfer,
    segments: SHELL_SEGMENTS,
  })
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildBody.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildBody.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildBody.test.ts
git commit -m "feat: build thermoformer body"
```

---

## Task 5: Tampa

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildLid.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildLid.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { Mesh, Raycaster, Vector3 } from 'three'
import {
  buildLid,
  getLidDimensions,
} from '@/features/studio/tools/lembrancinhas/termoformador/buildLid'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed } from './geometryTestUtils'

describe('buildLid', () => {
  it('tampa externa envolve o corpo e é fechada', () => {
    const params = defaultThermoformerParams
    const dims = getLidDimensions(params)
    const geometry = buildLid(params)

    expect(dims.outer.width).toBeCloseTo(params.width + 2 * (params.lidClearance + params.lidThickness), 3)
    expect(dims.outer.depth).toBeCloseTo(params.depth + 2 * (params.lidClearance + params.lidThickness), 3)
    expect(dims.bottomY).toBeCloseTo(params.height + params.rimHeight - params.lidFitDepth, 3)
    expect(dims.totalHeight).toBeCloseTo(params.lidFitDepth + params.lidHeight + params.lidThickness, 3)

    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 1)
    expect(geometry.boundingBox!.max.y).toBeCloseTo(dims.totalHeight, 1)
    expect(isClosed(geometry)).toBe(true)
  })

  it('tampa interna encaixa na abertura do rim', () => {
    const params = { ...defaultThermoformerParams, fitType: 'internal' as const }
    const dims = getLidDimensions(params)
    const rimThickness = Math.max(params.wallThickness, params.rimThickness)
    expect(dims.outer.width).toBeCloseTo(params.width - 2 * rimThickness - 2 * params.lidClearance, 3)
    expect(isClosed(buildLid(params))).toBe(true)
  })

  it('tem cavidade: raio de baixo atinge o teto interno', () => {
    const params = defaultThermoformerParams
    const dims = getLidDimensions(params)
    const geometry = buildLid(params)
    const raycaster = new Raycaster(new Vector3(0, -50, 0), new Vector3(0, 1, 0))
    const hits = raycaster.intersectObject(new Mesh(geometry), false)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].point.y).toBeCloseTo(dims.plateBottom, 1)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildLid.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import type { BufferGeometry } from 'three'
import { buildLidShell, type RoundedRectSpec } from './shell'
import { SHELL_SEGMENTS, type ThermoformerGeometryParams } from './schema'

export interface LidDimensions {
  outer: RoundedRectSpec
  inner: RoundedRectSpec
  totalHeight: number
  plateBottom: number
  bottomY: number
}

function clampRadius(radius: number, width: number, depth: number): number {
  return Math.max(0, Math.min(radius, Math.min(width, depth) / 2))
}

export function getLidDimensions(params: ThermoformerGeometryParams): LidDimensions {
  const bodyTop = params.height + params.rimHeight
  const totalHeight = params.lidFitDepth + params.lidHeight + params.lidThickness
  const effectiveThickness = Math.max(0.2, Math.min(params.lidThickness, totalHeight - 0.2))
  const plateBottom = Math.max(0.1, totalHeight - effectiveThickness)
  const bottomY = bodyTop - params.lidFitDepth

  if (params.fitType === 'external') {
    const innerWidth = params.width + 2 * params.lidClearance
    const innerDepth = params.depth + 2 * params.lidClearance
    const outerWidth = innerWidth + 2 * effectiveThickness
    const outerDepth = innerDepth + 2 * effectiveThickness
    const maxOuterRadius = Math.min(outerWidth, outerDepth) / 2
    const clearanceRadius = params.cornerRadius + params.lidClearance
    const minInnerRadius = clampRadius(clearanceRadius, innerWidth, innerDepth)

    let outerRadius = clampRadius(params.lidCornerRadius, outerWidth, outerDepth)
    let innerRadius = Math.max(0, Math.min(outerRadius - effectiveThickness, Math.min(innerWidth, innerDepth) / 2))
    innerRadius = Math.max(innerRadius, minInnerRadius)
    outerRadius = Math.min(maxOuterRadius, Math.max(outerRadius, innerRadius + effectiveThickness))

    return {
      outer: { width: outerWidth, depth: outerDepth, radius: outerRadius },
      inner: { width: innerWidth, depth: innerDepth, radius: innerRadius },
      totalHeight,
      plateBottom,
      bottomY,
    }
  }

  const rimThickness = Math.max(params.wallThickness, params.rimThickness)
  const openingWidth = Math.max(0.2, params.width - 2 * rimThickness - 2 * params.lidClearance)
  const openingDepth = Math.max(0.2, params.depth - 2 * rimThickness - 2 * params.lidClearance)
  const outerRadius = clampRadius(params.lidCornerRadius, openingWidth, openingDepth)
  const innerWidth = Math.max(0.2, openingWidth - 2 * effectiveThickness)
  const innerDepth = Math.max(0.2, openingDepth - 2 * effectiveThickness)
  const innerRadius = Math.max(
    0,
    Math.min(outerRadius - effectiveThickness, Math.min(innerWidth, innerDepth) / 2),
  )

  return {
    outer: { width: openingWidth, depth: openingDepth, radius: outerRadius },
    inner: { width: innerWidth, depth: innerDepth, radius: innerRadius },
    totalHeight,
    plateBottom,
    bottomY,
  }
}

export function buildLid(params: ThermoformerGeometryParams): BufferGeometry {
  const dims = getLidDimensions(params)
  const effectiveThickness = Math.max(0.2, Math.min(params.lidThickness, dims.totalHeight - 0.2))
  const chamfer = Math.min(
    params.edgeChamfer,
    effectiveThickness * 0.8,
    dims.totalHeight * 0.2,
    Math.min(dims.outer.width, dims.outer.depth) * 0.1,
  )

  return buildLidShell({
    outer: dims.outer,
    inner: dims.inner,
    totalHeight: dims.totalHeight,
    plateThickness: effectiveThickness,
    chamfer,
    segments: SHELL_SEGMENTS,
  })
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildLid.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildLid.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildLid.test.ts
git commit -m "feat: build thermoformer lid"
```

---

## Task 6: Padrão do painel

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/panelPattern.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/panelPattern.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { computePanelPattern } from '@/features/studio/tools/lembrancinhas/termoformador/panelPattern'
import {
  MAX_PANEL_OPENINGS,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('computePanelPattern', () => {
  it('gera furos dentro da região interna por padrão', () => {
    const pattern = computePanelPattern(defaultThermoformerParams)
    expect(pattern.holes.length).toBeGreaterThan(0)
    expect(pattern.capped).toBe(false)
    const halfWidth = pattern.innerWidth / 2
    const halfHeight = pattern.innerHeight / 2
    for (const hole of pattern.holes) {
      const half = hole.size / 2
      expect(Math.abs(hole.x) + half).toBeLessThanOrEqual(halfWidth + 1e-6)
      expect(Math.abs(hole.y) + half).toBeLessThanOrEqual(halfHeight + 1e-6)
    }
  })

  it('não gera furos quando a moldura consome a área', () => {
    const pattern = computePanelPattern({
      ...defaultThermoformerParams,
      frontPanelWidth: 40,
      frontPanelHeight: 40,
      borderWidth: 20,
    })
    expect(pattern.holes).toHaveLength(0)
  })

  it('limita a quantidade de aberturas', () => {
    const pattern = computePanelPattern({
      ...defaultThermoformerParams,
      frontPanelWidth: 300,
      frontPanelHeight: 300,
      borderWidth: 3,
      holeSpacingX: 1,
      holeSpacingY: 1,
    })
    expect(pattern.capped).toBe(true)
    expect(pattern.holes.length).toBeLessThanOrEqual(MAX_PANEL_OPENINGS)
  })

  it('muda o tipo e o ângulo conforme o padrão', () => {
    const grid = computePanelPattern({ ...defaultThermoformerParams, pattern: 'grid', gridAngle: 30 })
    const mesh = computePanelPattern({ ...defaultThermoformerParams, pattern: 'mesh', gridAngle: 0 })
    expect(grid.holes.every((hole) => hole.kind === 'square')).toBe(true)
    expect(mesh.holes.every((hole) => hole.kind === 'diamond')).toBe(true)
    expect(mesh.holes[0].angle).toBeCloseTo(Math.PI / 4, 5)
  })

  it('reduz o furo para preservar a nervura', () => {
    const pattern = computePanelPattern({
      ...defaultThermoformerParams,
      holeDiameter: 6,
      holeSpacingX: 2,
      holeSpacingY: 2,
      gridThickness: 1.2,
    })
    expect(pattern.effectiveSize).toBeLessThan(6)
    expect(pattern.effectiveRib).toBeGreaterThanOrEqual(1.2 - 1e-6)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/panelPattern.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import { MAX_PANEL_OPENINGS, type ThermoformerGeometryParams } from './schema'

export interface PanelHole {
  kind: 'circle' | 'square' | 'diamond'
  x: number
  y: number
  size: number
  angle: number
}

export interface PanelPatternResult {
  holes: PanelHole[]
  rows: number
  cols: number
  capped: boolean
  innerWidth: number
  innerHeight: number
  effectiveSpacingX: number
  effectiveSpacingY: number
  effectiveSize: number
  effectiveRib: number
}

export function computePanelPattern(params: ThermoformerGeometryParams): PanelPatternResult {
  const innerWidth = Math.max(0, params.frontPanelWidth - 2 * params.borderWidth)
  const innerHeight = Math.max(0, params.frontPanelHeight - 2 * params.borderWidth)

  if (innerWidth <= 0 || innerHeight <= 0) {
    return {
      holes: [],
      rows: 0,
      cols: 0,
      capped: false,
      innerWidth,
      innerHeight,
      effectiveSpacingX: params.holeSpacingX,
      effectiveSpacingY: params.holeSpacingY,
      effectiveSize: 0,
      effectiveRib: 0,
    }
  }

  let spacingX = params.holeSpacingX
  let spacingY = params.holeSpacingY
  let cols = Math.max(1, Math.floor(innerWidth / spacingX) + 1)
  let rows = Math.max(1, Math.floor(innerHeight / spacingY) + 1)
  let capped = false

  if (cols * rows > MAX_PANEL_OPENINGS) {
    capped = true
    let guard = 0
    while (cols * rows > MAX_PANEL_OPENINGS && guard < 24) {
      spacingX *= 1.15
      spacingY *= 1.15
      cols = Math.max(1, Math.floor(innerWidth / spacingX) + 1)
      rows = Math.max(1, Math.floor(innerHeight / spacingY) + 1)
      guard++
    }
  }

  const angle = (params.gridAngle * Math.PI) / 180
    + (params.pattern === 'mesh' ? Math.PI / 4 : 0)
  const projection = params.pattern === 'perforated'
    ? 1
    : Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))
  const maxSize = Math.max(0, Math.min(spacingX, spacingY) - params.gridThickness) / projection
  const size = Math.min(params.holeDiameter, maxSize)
  const effectiveRib = Math.min(spacingX, spacingY) - size * projection

  const holes: PanelHole[] = []
  if (size > 0) {
    const startX = -((cols - 1) * spacingX) / 2
    const startY = -((rows - 1) * spacingY) / 2
    const halfExtent = (size * projection) / 2
    const kind: PanelHole['kind'] = params.pattern === 'perforated'
      ? 'circle'
      : params.pattern === 'grid'
        ? 'square'
        : 'diamond'

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * spacingX
        const y = startY + row * spacingY
        if (Math.abs(x) + halfExtent > innerWidth / 2 + 1e-6) continue
        if (Math.abs(y) + halfExtent > innerHeight / 2 + 1e-6) continue
        holes.push({ kind, x, y, size, angle })
      }
    }
  }

  return {
    holes,
    rows,
    cols,
    capped,
    innerWidth,
    innerHeight,
    effectiveSpacingX: spacingX,
    effectiveSpacingY: spacingY,
    effectiveSize: size,
    effectiveRib,
  }
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/panelPattern.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/panelPattern.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/panelPattern.test.ts
git commit -m "feat: add thermoformer panel pattern"
```

---

## Task 7: Painel frontal

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildFrontPanel.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildFrontPanel.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { buildFrontPanel } from '@/features/studio/tools/lembrancinhas/termoformador/buildFrontPanel'
import { computePanelPattern } from '@/features/studio/tools/lembrancinhas/termoformador/panelPattern'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed } from './geometryTestUtils'

describe('buildFrontPanel', () => {
  it('gera placa fechada com as dimensões e espessura', () => {
    const params = defaultThermoformerParams
    const geometry = buildFrontPanel(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-params.frontPanelWidth / 2, 1)
    expect(box.max.x).toBeCloseTo(params.frontPanelWidth / 2, 1)
    expect(box.min.y).toBeCloseTo(-params.frontPanelHeight / 2, 1)
    expect(box.max.y).toBeCloseTo(params.frontPanelHeight / 2, 1)
    expect(box.min.z).toBeCloseTo(0, 1)
    expect(box.max.z).toBeCloseTo(params.frontPanelThickness, 1)
    expect(isClosed(geometry)).toBe(true)
  })

  it('furos aumentam a contagem de vértices em relação a uma placa sem furos', () => {
    const withHoles = buildFrontPanel(defaultThermoformerParams)
    const withoutHoles = buildFrontPanel({
      ...defaultThermoformerParams,
      frontPanelWidth: 40,
      frontPanelHeight: 40,
      borderWidth: 20,
    })
    expect(withHoles.getAttribute('position').count)
      .toBeGreaterThan(withoutHoles.getAttribute('position').count)
  })

  it('curvatura convexa empurra só a face frontal', () => {
    const flat = buildFrontPanel(defaultThermoformerParams)
    const convex = buildFrontPanel({ ...defaultThermoformerParams, surfaceCurvature: 'slightly_convex' })
    const concave = buildFrontPanel({ ...defaultThermoformerParams, surfaceCurvature: 'slightly_concave' })

    flat.computeBoundingBox()
    convex.computeBoundingBox()
    concave.computeBoundingBox()

    expect(convex.boundingBox!.max.z).toBeGreaterThan(flat.boundingBox!.max.z)
    expect(concave.boundingBox!.max.z).toBeLessThan(flat.boundingBox!.max.z)
    expect(convex.boundingBox!.min.z).toBeCloseTo(0, 3)
    expect(concave.boundingBox!.min.z).toBeCloseTo(0, 3)
  })

  it('o padrão default gera furos', () => {
    expect(computePanelPattern(defaultThermoformerParams).holes.length).toBeGreaterThan(0)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildFrontPanel.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import { ExtrudeGeometry, Path, type BufferGeometry } from 'three'
import { roundedRectShape } from './shapes'
import { computePanelPattern } from './panelPattern'
import {
  PANEL_CURVATURE_MM,
  type ThermoformerGeometryParams,
} from './schema'

function applyFrontCurvature(
  geometry: BufferGeometry,
  params: ThermoformerGeometryParams,
): void {
  if (params.surfaceCurvature === 'flat') return

  const amplitude = params.surfaceCurvature === 'slightly_convex'
    ? PANEL_CURVATURE_MM
    : Math.min(PANEL_CURVATURE_MM, Math.max(0, params.frontPanelThickness - 0.8))
  if (amplitude <= 0) return

  const position = geometry.getAttribute('position')
  const halfWidth = params.frontPanelWidth / 2
  const direction = params.surfaceCurvature === 'slightly_convex' ? 1 : -1

  for (let i = 0; i < position.count; i++) {
    if (position.getZ(i) < params.frontPanelThickness - 1e-4) continue
    const x = position.getX(i)
    const falloff = Math.max(0, 1 - (x / halfWidth) ** 2)
    position.setZ(i, position.getZ(i) + direction * amplitude * falloff)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}

function addHole(shape: ReturnType<typeof roundedRectShape>, hole: {
  kind: 'circle' | 'square' | 'diamond'
  x: number
  y: number
  size: number
  angle: number
}): void {
  const path = new Path()

  if (hole.kind === 'circle') {
    path.absarc(hole.x, hole.y, hole.size / 2, 0, Math.PI * 2, false)
  } else {
    const half = hole.size / 2
    const cos = Math.cos(hole.angle)
    const sin = Math.sin(hole.angle)
    const corners = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ] as const

    corners.forEach(([x, y], index) => {
      const px = hole.x + x * cos - y * sin
      const py = hole.y + x * sin + y * cos
      if (index === 0) path.moveTo(px, py)
      else path.lineTo(px, py)
    })

    const [firstX, firstY] = corners[0]
    path.lineTo(
      hole.x + firstX * cos - firstY * sin,
      hole.y + firstX * sin + firstY * cos,
    )
  }

  shape.holes.push(path)
}

export function buildFrontPanel(params: ThermoformerGeometryParams): BufferGeometry {
  const shape = roundedRectShape(
    params.frontPanelWidth,
    params.frontPanelHeight,
    params.frontPanelCornerRadius,
  )
  const pattern = computePanelPattern(params)
  for (const hole of pattern.holes) addHole(shape, hole)

  const geometry = new ExtrudeGeometry(shape, {
    depth: params.frontPanelThickness,
    bevelEnabled: false,
    curveSegments: 12,
  })
  applyFrontCurvature(geometry, params)
  return geometry
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildFrontPanel.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildFrontPanel.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildFrontPanel.test.ts
git commit -m "feat: build thermoformer front panel"
```

---

## Task 8: Pino lateral

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildHandle.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildHandle.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import {
  buildHandle,
  buildHandleProfile,
  handlePlacement,
} from '@/features/studio/tools/lembrancinhas/termoformador/buildHandle'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('buildHandle', () => {
  it('perfil começa e termina no eixo', () => {
    const profile = buildHandleProfile(defaultThermoformerParams)
    expect(profile[0].x).toBe(0)
    expect(profile[profile.length - 1].x).toBe(0)
    expect(profile[profile.length - 1].y).toBeCloseTo(defaultThermoformerParams.handleLength, 5)
  })

  it('pino à direita cresce em +X a partir da face', () => {
    const params = defaultThermoformerParams
    const geometry = buildHandle(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.min.x).toBeCloseTo(params.width / 2, 1)
    expect(box.max.x).toBeCloseTo(params.width / 2 + params.handleLength, 1)
  })

  it('pino no topo cresce em +Y a partir da borda', () => {
    const params = { ...defaultThermoformerParams, handleSide: 'top' as const }
    const geometry = buildHandle(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const bodyTop = params.height + params.rimHeight
    expect(box.min.y).toBeCloseTo(bodyTop, 1)
    expect(box.max.y).toBeCloseTo(bodyTop + params.handleLength, 1)
  })

  it('posiciona o eixo para cada lateral', () => {
    const params = defaultThermoformerParams
    const right = new Vector3(0, 1, 0).applyMatrix4(handlePlacement(params))
    const left = new Vector3(0, 1, 0).applyMatrix4(handlePlacement({ ...params, handleSide: 'left' }))
    const top = new Vector3(0, 1, 0).applyMatrix4(handlePlacement({ ...params, handleSide: 'top' }))
    const bottom = new Vector3(0, 1, 0).applyMatrix4(handlePlacement({ ...params, handleSide: 'bottom' }))
    expect(right.x).toBeGreaterThan(params.width / 2)
    expect(left.x).toBeLessThan(-params.width / 2)
    expect(top.y).toBeGreaterThan(params.height)
    expect(bottom.y).toBeLessThan(0)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildHandle.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import {
  BufferGeometry,
  LatheGeometry,
  Matrix4,
  Vector2,
} from 'three'
import type { ThermoformerGeometryParams } from './schema'

const RADIAL_SEGMENTS = 32

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function buildHandleProfile(params: ThermoformerGeometryParams): Vector2[] {
  const shaftRadius = params.handleDiameter / 2
  const baseRadius = Math.max(shaftRadius, params.handleBaseDiameter / 2)
  const flangeHeight = Math.min(
    Math.max(0.8, params.handleBaseDiameter * 0.12),
    params.handleLength * 0.3,
  )
  const taperEnd = Math.min(
    params.handleLength - 0.1,
    flangeHeight + Math.max(0.5, baseRadius - shaftRadius),
  )
  const availableTip = Math.max(0, params.handleLength - taperEnd)
  const tipRadius = Math.min(params.handleTipRadius, availableTip)
  const tipStart = params.handleLength - tipRadius

  const points: Vector2[] = [
    new Vector2(0, 0),
    new Vector2(baseRadius, 0),
    new Vector2(baseRadius, flangeHeight),
    new Vector2(shaftRadius, taperEnd),
  ]

  if (tipStart - taperEnd > 1e-6) {
    points.push(new Vector2(shaftRadius, tipStart))
  }

  if (tipRadius > 0.01) {
    for (let i = 1; i <= 6; i++) {
      const angle = (i / 6) * (Math.PI / 2)
      points.push(new Vector2(
        shaftRadius - tipRadius + tipRadius * Math.cos(angle),
        tipStart + tipRadius * Math.sin(angle),
      ))
    }
  }

  points.push(new Vector2(0, params.handleLength))

  const deduped: Vector2[] = []
  for (const point of points) {
    const last = deduped[deduped.length - 1]
    if (!last || last.distanceTo(point) > 1e-6) deduped.push(point)
  }
  return deduped
}

export function handlePlacement(params: ThermoformerGeometryParams): Matrix4 {
  const bodyTop = params.height + params.rimHeight
  const flangeRadius = Math.max(params.handleBaseDiameter, params.handleDiameter) / 2
  const vertical = clamp(
    params.handleHeight * bodyTop,
    flangeRadius,
    Math.max(flangeRadius, bodyTop - flangeRadius),
  )
  const horizontal = clamp(
    params.handleHeight * params.width,
    flangeRadius,
    Math.max(flangeRadius, params.width - flangeRadius),
  )

  const matrix = new Matrix4()
  switch (params.handleSide) {
    case 'right':
      matrix.makeRotationZ(-Math.PI / 2)
      matrix.setPosition(params.width / 2, vertical, 0)
      break
    case 'left':
      matrix.makeRotationZ(Math.PI / 2)
      matrix.setPosition(-params.width / 2, vertical, 0)
      break
    case 'top':
      matrix.identity()
      matrix.setPosition(horizontal, bodyTop, 0)
      break
    case 'bottom':
      matrix.makeRotationZ(Math.PI)
      matrix.setPosition(horizontal, 0, 0)
      break
  }
  return matrix
}

export function buildHandle(params: ThermoformerGeometryParams): BufferGeometry {
  const indexed = new LatheGeometry(buildHandleProfile(params), RADIAL_SEGMENTS)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.applyMatrix4(handlePlacement(params))
  geometry.computeVertexNormals()
  return geometry
}

export function prepareHandleForPrint(
  geometry: BufferGeometry,
  params: ThermoformerGeometryParams,
): BufferGeometry {
  const clone = geometry.clone()
  clone.applyMatrix4(handlePlacement(params).clone().invert())
  return clone
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildHandle.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildHandle.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildHandle.test.ts
git commit -m "feat: build thermoformer handle"
```

---

## Task 9: Base inferior

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildBase.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildBase.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { Mesh, Raycaster, Vector3 } from 'three'
import { buildBase } from '@/features/studio/tools/lembrancinhas/termoformador/buildBase'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed } from './geometryTestUtils'

describe('buildBase', () => {
  it('gera um anel fechado com folga em volta do corpo', () => {
    const params = defaultThermoformerParams
    const geometry = buildBase(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const outerWidth = params.width + 2 * (params.printClearance + params.baseThickness)
    const outerDepth = params.depth + 2 * (params.printClearance + params.baseThickness)

    expect(box.max.x - box.min.x).toBeCloseTo(outerWidth, 1)
    expect(box.max.z - box.min.z).toBeCloseTo(outerDepth, 1)
    expect(box.min.y).toBeCloseTo(0, 1)
    expect(box.max.y).toBeCloseTo(params.baseHeight, 1)
    expect(isClosed(geometry)).toBe(true)
  })

  it('é vazado no centro', () => {
    const params = defaultThermoformerParams
    const geometry = buildBase(params)
    const centerRay = new Raycaster(new Vector3(0, 100, 0), new Vector3(0, -1, 0))
    expect(centerRay.intersectObject(new Mesh(geometry), false)).toHaveLength(0)

    const edgeRay = new Raycaster(
      new Vector3((params.width / 2) + params.printClearance + params.baseThickness / 2, 100, 0),
      new Vector3(0, -1, 0),
    )
    expect(edgeRay.intersectObject(new Mesh(geometry), false).length).toBeGreaterThan(0)
  })

  it('aceita altura zero com espessura mínima', () => {
    const geometry = buildBase({ ...defaultThermoformerParams, baseHeight: 0 })
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.y).toBeCloseTo(0.2, 2)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildBase.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import { ExtrudeGeometry, type BufferGeometry } from 'three'
import { roundedRectPath, roundedRectShape } from './shapes'
import type { ThermoformerGeometryParams } from './schema'

export function buildBase(params: ThermoformerGeometryParams): BufferGeometry {
  const innerWidth = params.width + 2 * params.printClearance
  const innerDepth = params.depth + 2 * params.printClearance
  const outerWidth = innerWidth + 2 * params.baseThickness
  const outerDepth = innerDepth + 2 * params.baseThickness
  const height = Math.max(0.2, params.baseHeight)

  const outerShape = roundedRectShape(outerWidth, outerDepth, params.baseCornerRadius)
  const innerRadius = Math.max(
    0,
    Math.min(
      params.baseCornerRadius - params.baseThickness,
      innerWidth / 2 - 0.1,
      innerDepth / 2 - 0.1,
    ),
  )
  outerShape.holes.push(roundedRectPath(innerWidth, innerDepth, innerRadius))

  const bevel = Math.min(params.edgeChamfer, height * 0.4, params.baseThickness * 0.5)
  const geometry = new ExtrudeGeometry(outerShape, {
    depth: height,
    bevelEnabled: bevel > 0.01,
    bevelSize: Math.max(0, bevel),
    bevelThickness: Math.max(0, bevel),
    bevelSegments: 2,
    curveSegments: 12,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()
  return geometry
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildBase.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildBase.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildBase.test.ts
git commit -m "feat: build thermoformer base"
```

---

## Task 10: Validação e orquestração

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts`
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts`

**Step 1: Escrever os testes que falham**

`validateThermoformer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/validateThermoformer'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('validateThermoformer', () => {
  it('defaults não têm problemas', () => {
    expect(validateThermoformer(defaultThermoformerParams)).toEqual([])
  })

  it('avisa painel maior que o corpo', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, frontPanelWidth: 300 })
    expect(issues.some((issue) => issue.code === 'panel-overhang')).toBe(true)
  })

  it('erra quando a moldura consome toda a área', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      frontPanelWidth: 40,
      frontPanelHeight: 40,
      borderWidth: 20,
    })
    expect(issues.some((issue) => issue.code === 'panel-border' && issue.severity === 'error')).toBe(true)
  })

  it('avisa quando a grade é limitada', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      frontPanelWidth: 300,
      frontPanelHeight: 300,
      borderWidth: 3,
      holeSpacingX: 1,
      holeSpacingY: 1,
    })
    expect(issues.some((issue) => issue.code === 'panel-density')).toBe(true)
  })

  it('avisa folga da tampa menor que a folga de impressão', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, lidClearance: 0.1 })
    expect(issues.some((issue) => issue.code === 'lid-clearance')).toBe(true)
  })

  it('avisa base mais alta que o corpo', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, baseHeight: 90 })
    expect(issues.some((issue) => issue.code === 'base-height')).toBe(true)
  })
})
```

`buildThermoformer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('buildThermoformer', () => {
  it('gera as cinco peças por padrão', () => {
    const result = buildThermoformer(defaultThermoformerParams)
    expect(result.body).toBeDefined()
    expect(result.lid).not.toBeNull()
    expect(result.frontPanel).toBeDefined()
    expect(result.handle).not.toBeNull()
    expect(result.base).not.toBeNull()
  })

  it('omite peças desabilitadas', () => {
    const result = buildThermoformer({
      ...defaultThermoformerParams,
      lidEnabled: false,
      handleEnabled: false,
      baseEnabled: false,
    })
    expect(result.lid).toBeNull()
    expect(result.handle).toBeNull()
    expect(result.base).toBeNull()
    expect(result.body).toBeDefined()
    expect(result.frontPanel).toBeDefined()
  })

  it('posiciona tampa, painel e pino na montagem', () => {
    const params = defaultThermoformerParams
    const result = buildThermoformer(params)
    const bodyTop = params.height + params.rimHeight

    result.lid!.computeBoundingBox()
    expect(result.lid!.boundingBox!.min.y).toBeCloseTo(bodyTop - params.lidFitDepth, 1)

    result.frontPanel.computeBoundingBox()
    expect(result.frontPanel.boundingBox!.min.z).toBeCloseTo(params.depth / 2, 1)
    expect(result.frontPanel.boundingBox!.max.y).toBeCloseTo(bodyTop / 2 + params.frontPanelHeight / 2, 1)

    result.handle!.computeBoundingBox()
    expect(result.handle!.boundingBox!.max.x).toBeCloseTo(params.width / 2 + params.handleLength, 1)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts`
Expected: FAIL com módulos não encontrados.

**Step 3: Implementar a validação**

```ts
import { computePanelPattern } from './panelPattern'
import {
  MINIMUM_FEATURE_MM,
  MINIMUM_WALL_MM,
  type ThermoformerGeometryParams,
} from './schema'

export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  code: string
  severity: IssueSeverity
  message: string
}

export function validateThermoformer(
  params: ThermoformerGeometryParams,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const bodyTop = params.height + params.rimHeight
  const halfMin = Math.min(params.width, params.depth) / 2
  const pattern = computePanelPattern(params)

  if (params.cornerRadius > halfMin) {
    issues.push({
      code: 'corner-radius',
      severity: 'error',
      message: 'O raio dos cantos excede metade da menor dimensão do corpo.',
    })
  }

  if (params.wallThickness < MINIMUM_WALL_MM) {
    issues.push({
      code: 'wall',
      severity: 'error',
      message: `A parede é menor que o mínimo de ${MINIMUM_WALL_MM} mm.`,
    })
  }

  if (pattern.innerWidth <= 0 || pattern.innerHeight <= 0) {
    issues.push({
      code: 'panel-border',
      severity: 'error',
      message: 'A moldura do painel não deixa área para a grade. Reduza a borda ou aumente o painel.',
    })
  } else if (pattern.holes.length === 0) {
    issues.push({
      code: 'panel-empty',
      severity: 'warning',
      message: 'Nenhum furo cabe na região interna com o espaçamento atual.',
    })
  }

  if (pattern.effectiveRib < MINIMUM_FEATURE_MM) {
    issues.push({
      code: 'panel-rib',
      severity: 'warning',
      message: `As nervuras efetivas ficam abaixo de ${MINIMUM_FEATURE_MM} mm; o furo foi reduzido.`,
    })
  }

  if (pattern.capped) {
    issues.push({
      code: 'panel-density',
      severity: 'warning',
      message: 'A grade foi limitada em aberturas para manter o desempenho. Aumente o espaçamento.',
    })
  }

  if (params.frontPanelWidth > params.width) {
    issues.push({
      code: 'panel-overhang',
      severity: 'warning',
      message: 'O painel é mais largo que o corpo e vai sobressair nas laterais.',
    })
  }

  if (params.frontPanelHeight > bodyTop) {
    issues.push({
      code: 'panel-height',
      severity: 'warning',
      message: 'O painel é mais alto que o corpo e vai sobressair na borda.',
    })
  }

  const panelHalfMin = Math.min(params.frontPanelWidth, params.frontPanelHeight) / 2
  if (params.frontPanelCornerRadius > panelHalfMin) {
    issues.push({
      code: 'panel-radius',
      severity: 'error',
      message: 'O raio do painel excede metade da menor dimensão do painel.',
    })
  }

  if (params.lidEnabled) {
    if (params.lidClearance < params.printClearance) {
      issues.push({
        code: 'lid-clearance',
        severity: 'warning',
        message: 'A folga da tampa é menor que a folga de impressão.',
      })
    }

    if (params.lidFitDepth > bodyTop) {
      issues.push({
        code: 'lid-fit-depth',
        severity: 'warning',
        message: 'A profundidade de encaixe da tampa é maior que a altura do corpo.',
      })
    }

    const rimThickness = Math.max(params.wallThickness, params.rimThickness)
    const openingWidth = params.width - 2 * rimThickness - 2 * params.lidClearance
    const openingDepth = params.depth - 2 * rimThickness - 2 * params.lidClearance
    if (params.fitType === 'internal'
      && (openingWidth <= 2 * params.lidThickness || openingDepth <= 2 * params.lidThickness)) {
      issues.push({
        code: 'lid-internal',
        severity: 'error',
        message: 'A tampa interna não tem parede suficiente para formar a cavidade.',
      })
    }
  }

  if (params.handleEnabled) {
    if (params.handleTipRadius > params.handleDiameter / 2) {
      issues.push({
        code: 'handle-tip',
        severity: 'warning',
        message: 'A ponta do pino é maior que o raio da haste e será limitada.',
      })
    }
    if (params.handleBaseDiameter < params.handleDiameter) {
      issues.push({
        code: 'handle-base',
        severity: 'warning',
        message: 'A base do pino é menor que a haste; a base será igualada à haste.',
      })
    }
    const flange = Math.max(params.handleBaseDiameter, params.handleDiameter)
    const available = params.handleSide === 'left' || params.handleSide === 'right'
      ? Math.min(bodyTop, params.depth)
      : Math.min(params.width, params.depth)
    if (flange > available) {
      issues.push({
        code: 'handle-flange',
        severity: 'warning',
        message: 'O flange do pino é maior que a lateral disponível.',
      })
    }
  }

  if (params.baseEnabled) {
    if (params.baseHeight > bodyTop) {
      issues.push({
        code: 'base-height',
        severity: 'warning',
        message: 'A base é mais alta que o corpo.',
      })
    }
    if (params.baseHeight > 0 && params.baseHeight < MINIMUM_FEATURE_MM) {
      issues.push({
        code: 'base-thin',
        severity: 'warning',
        message: `A altura da base é menor que ${MINIMUM_FEATURE_MM} mm.`,
      })
    }
  }

  return issues
}
```

**Step 4: Implementar a orquestração**

```ts
import type { BufferGeometry } from 'three'
import { buildBody } from './buildBody'
import { buildLid, getLidDimensions } from './buildLid'
import { buildFrontPanel } from './buildFrontPanel'
import { buildHandle } from './buildHandle'
import { buildBase } from './buildBase'
import type { ThermoformerGeometryParams } from './schema'

export interface BuildThermoformerResult {
  body: BufferGeometry
  lid: BufferGeometry | null
  frontPanel: BufferGeometry
  handle: BufferGeometry | null
  base: BufferGeometry | null
}

export function buildThermoformer(
  params: ThermoformerGeometryParams,
): BuildThermoformerResult {
  const bodyTop = params.height + params.rimHeight
  const body = buildBody(params)

  const frontPanel = buildFrontPanel(params)
  frontPanel.translate(0, bodyTop / 2, params.depth / 2)

  const lid = params.lidEnabled ? buildLid(params) : null
  if (lid) lid.translate(0, getLidDimensions(params).bottomY, 0)

  const handle = params.handleEnabled ? buildHandle(params) : null
  const base = params.baseEnabled ? buildBase(params) : null

  return { body, lid, frontPanel, handle, base }
}

export function disposeThermoformerResult(
  result: BuildThermoformerResult | null,
): void {
  if (!result) return
  result.body.dispose()
  result.lid?.dispose()
  result.frontPanel.dispose()
  result.handle?.dispose()
  result.base?.dispose()
}
```

**Step 5: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts \
  src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts
git commit -m "feat: validate and assemble thermoformer parts"
```

---

## Task 11: Serialização e worker

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/workerGeometry.ts`
- Create: `src/features/studio/tools/lembrancinhas/termoformador/workerClient.ts`
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.worker.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { BoxGeometry } from 'three'
import {
  deserializeBuildResult,
  deserializeGeometry,
  serializeBuildResult,
  serializeGeometry,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'

describe('workerGeometry', () => {
  it('faz roundtrip de posição, normal e índice', () => {
    const geometry = new BoxGeometry(10, 20, 30)
    const restored = deserializeGeometry(serializeGeometry(geometry).data)
    expect(restored.getAttribute('position').count).toBe(geometry.getAttribute('position').count)
    expect(restored.getAttribute('normal').count).toBe(geometry.getAttribute('normal').count)
    expect(restored.getIndex()).not.toBeNull()
  })

  it('serializa cinco peças e preserva nulos', () => {
    const result = {
      body: new BoxGeometry(1, 1, 1),
      lid: null,
      frontPanel: new BoxGeometry(2, 2, 2),
      handle: null,
      base: new BoxGeometry(3, 3, 3),
    }
    const { data, transfer } = serializeBuildResult(result)
    const restored = deserializeBuildResult(data)

    expect(restored.body.getAttribute('position').count).toBeGreaterThan(0)
    expect(restored.lid).toBeNull()
    expect(restored.frontPanel.getAttribute('position').count).toBeGreaterThan(0)
    expect(restored.handle).toBeNull()
    expect(restored.base.getAttribute('position').count).toBeGreaterThan(0)
    expect(transfer.length).toBeGreaterThan(0)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar `workerGeometry.ts`**

```ts
import { BufferAttribute, BufferGeometry } from 'three'
import type { BuildThermoformerResult } from './buildThermoformer'

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array | null
}

export interface SerializedBuildResult {
  body: SerializedGeometry
  lid: SerializedGeometry | null
  frontPanel: SerializedGeometry
  handle: SerializedGeometry | null
  base: SerializedGeometry | null
}

export function serializeGeometry(geometry: BufferGeometry): {
  data: SerializedGeometry
  transfer: ArrayBuffer[]
} {
  const positionAttribute = geometry.getAttribute('position')
  const normalAttribute = geometry.getAttribute('normal')
  const position = positionAttribute
    ? (positionAttribute.array as Float32Array).slice()
    : new Float32Array(0)
  const normal = normalAttribute
    ? (normalAttribute.array as Float32Array).slice()
    : new Float32Array(0)
  const indexAttribute = geometry.getIndex()
  const index = indexAttribute
    ? new Uint32Array(indexAttribute.array).slice()
    : null

  const transfer: ArrayBuffer[] = [
    position.buffer as ArrayBuffer,
    normal.buffer as ArrayBuffer,
  ]
  if (index) transfer.push(index.buffer as ArrayBuffer)

  return { data: { position, normal, index }, transfer }
}

export function deserializeGeometry(data: SerializedGeometry): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.position, 3))
  if (data.normal.length > 0) {
    geometry.setAttribute('normal', new BufferAttribute(data.normal, 3))
  }
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1))
  return geometry
}

function serializePart(geometry: BufferGeometry | null): {
  data: SerializedGeometry | null
  transfer: ArrayBuffer[]
} {
  if (!geometry) return { data: null, transfer: [] }
  return serializeGeometry(geometry)
}

export function serializeBuildResult(result: BuildThermoformerResult): {
  data: SerializedBuildResult
  transfer: ArrayBuffer[]
} {
  const body = serializePart(result.body)
  const lid = serializePart(result.lid)
  const frontPanel = serializePart(result.frontPanel)
  const handle = serializePart(result.handle)
  const base = serializePart(result.base)

  return {
    data: {
      body: body.data!,
      lid: lid.data,
      frontPanel: frontPanel.data!,
      handle: handle.data,
      base: base.data,
    },
    transfer: [
      ...body.transfer,
      ...lid.transfer,
      ...frontPanel.transfer,
      ...handle.transfer,
      ...base.transfer,
    ],
  }
}

export function deserializeBuildResult(
  data: SerializedBuildResult,
): BuildThermoformerResult {
  return {
    body: deserializeGeometry(data.body),
    lid: data.lid ? deserializeGeometry(data.lid) : null,
    frontPanel: deserializeGeometry(data.frontPanel),
    handle: data.handle ? deserializeGeometry(data.handle) : null,
    base: data.base ? deserializeGeometry(data.base) : null,
  }
}
```

**Step 4: Implementar `workerClient.ts`**

```ts
import type { ThermoformerGeometryParams } from './schema'
import type { SerializedBuildResult } from './workerGeometry'

export interface ThermoformerWorker {
  build(
    params: ThermoformerGeometryParams,
    onResult: (data: SerializedBuildResult) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

export function createThermoformerWorker(): ThermoformerWorker {
  const worker = new Worker(
    new URL('./buildThermoformer.worker.ts', import.meta.url),
    { type: 'module' },
  )

  return {
    build(params, onResult, onError) {
      worker.onmessage = (event: MessageEvent<{ id: number; data: SerializedBuildResult }>) => {
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.postMessage({ id: Date.now(), params })
    },
    terminate() {
      worker.terminate()
    },
  }
}
```

**Step 5: Implementar `buildThermoformer.worker.ts`**

```ts
import { buildThermoformer } from './buildThermoformer'
import { serializeBuildResult } from './workerGeometry'
import type { ThermoformerGeometryParams } from './schema'

interface BuildRequest {
  id: number
  params: ThermoformerGeometryParams
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

scope.onmessage = (event) => {
  const { id, params } = event.data
  const { data, transfer } = serializeBuildResult(buildThermoformer(params))
  scope.postMessage({ id, data }, transfer)
}
```

**Step 6: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`
Expected: PASS.

**Step 7: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/workerGeometry.ts \
  src/features/studio/tools/lembrancinhas/termoformador/workerClient.ts \
  src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.worker.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts
git commit -m "feat: add thermoformer worker pipeline"
```

---

## Task 12: Hook `useThermoformer`

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BoxGeometry } from 'three'
import { useThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/useThermoformer'
import {
  defaultThermoformerParams,
  type ThermoformerGeometryParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import {
  serializeBuildResult,
  type SerializedBuildResult,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
import type { ThermoformerWorker } from '@/features/studio/tools/lembrancinhas/termoformador/workerClient'

function serializedResult(): SerializedBuildResult {
  return serializeBuildResult({
    body: new BoxGeometry(160, 63, 120),
    lid: new BoxGeometry(165, 14, 125),
    frontPanel: new BoxGeometry(140, 50, 3),
    handle: new BoxGeometry(25, 16, 16),
    base: new BoxGeometry(165, 6, 125),
  }).data
}

function makeWorkerFixture() {
  let pending: ((data: SerializedBuildResult) => void) | null = null
  let fail: (() => void) | null = null
  let lastParams: ThermoformerGeometryParams | null = null
  let calls = 0
  const terminate = vi.fn()
  const factory = (): ThermoformerWorker => {
    calls++
    return {
      build: (params, onResult, onError) => {
        lastParams = params
        pending = onResult
        fail = onError ?? null
      },
      terminate,
    }
  }
  return {
    factory,
    terminate,
    getCalls: () => calls,
    respond: () => pending?.(serializedResult()),
    fail: () => fail?.(),
    getParams: () => lastParams,
  }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useThermoformer', () => {
  it('retorna os defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    expect(result.current.params).toEqual(defaultThermoformerParams)
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
  })

  it('faz clamp dos campos numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('width', 999)
      result.current.updateParam('height', 1)
      result.current.updateParam('edgeChamfer', 9)
      result.current.updateParam('handleHeight', 2)
    })
    expect(result.current.params.width).toBe(300)
    expect(result.current.params.height).toBe(20)
    expect(result.current.params.edgeChamfer).toBe(3)
    expect(result.current.params.handleHeight).toBe(1)
  })

  it('envia ao worker após o debounce e aplica o resultado', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.isBuilding).toBe(true)
    act(() => { respond() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.body).toBeDefined()
    expect(result.current.geometry!.lid).not.toBeNull()
  })

  it('expõe erro quando o worker falha', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBe('Falha ao gerar a geometria')
  })

  it('troca de cor não rebuilda', () => {
    const { factory, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    const calls = getCalls()
    act(() => {
      result.current.updateParam('bodyColor', '#ef4444')
      result.current.updateParam('accentColor', '#171717')
    })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getCalls()).toBe(calls)
  })

  it('mudança geométrica rebuilda e envia o parâmetro', () => {
    const { factory, getParams, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    const calls = getCalls()
    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(getCalls()).toBeGreaterThan(calls)
    expect(getParams()?.width).toBe(200)
  })

  it('calcula dimensões e fitRadius após a geometria', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.dimensions.width).toBeCloseTo(165, 0)
    expect(result.current.dimensions.height).toBeCloseTo(63, 0)
    expect(result.current.dimensions.thickness).toBeCloseTo(125, 0)
    expect(result.current.fitRadius).toBeGreaterThan(0)
  })

  it('reseta para os defaults e expõe issues', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { result.current.updateParam('width', 300) })
    act(() => { result.current.reset() })
    expect(result.current.params).toEqual(defaultThermoformerParams)
    expect(result.current.issues).toEqual([])
  })

  it('termina o worker anterior em um novo build', () => {
    const { factory, terminate } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { result.current.updateParam('width', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    expect(terminate).toHaveBeenCalled()
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Box3, Vector3 } from 'three'
import {
  defaultThermoformerParams,
  thermoformerParamsSchema,
  type ThermoformerGeometryParams,
  type ThermoformerParams,
} from './schema'
import {
  validateThermoformer,
  type ValidationIssue,
} from './validateThermoformer'
import {
  disposeThermoformerResult,
  type BuildThermoformerResult,
} from './buildThermoformer'
import {
  deserializeBuildResult,
  type SerializedBuildResult,
} from './workerGeometry'
import {
  createThermoformerWorker,
  type ThermoformerWorker,
} from './workerClient'

type ThermoformerAction =
  | { type: 'update'; key: keyof ThermoformerParams; value: number | string | boolean }
  | { type: 'reset' }

const NUMERIC_RANGES: Partial<Record<keyof ThermoformerParams, { min: number; max: number }>> = {
  width: { min: 60, max: 300 },
  depth: { min: 60, max: 300 },
  height: { min: 20, max: 120 },
  cornerRadius: { min: 0, max: 40 },
  wallThickness: { min: 1.2, max: 6 },
  bottomThickness: { min: 1.2, max: 6 },
  rimHeight: { min: 0, max: 10 },
  rimThickness: { min: 1.2, max: 6 },
  edgeChamfer: { min: 0, max: 3 },
  lidThickness: { min: 1.2, max: 6 },
  lidHeight: { min: 0, max: 30 },
  lidClearance: { min: 0.1, max: 0.6 },
  lidCornerRadius: { min: 0, max: 40 },
  lidFitDepth: { min: 2, max: 20 },
  frontPanelWidth: { min: 40, max: 300 },
  frontPanelHeight: { min: 40, max: 300 },
  frontPanelThickness: { min: 1, max: 5 },
  frontPanelCornerRadius: { min: 0, max: 40 },
  borderWidth: { min: 3, max: 20 },
  holeDiameter: { min: 0.8, max: 6 },
  holeSpacingX: { min: 1, max: 10 },
  holeSpacingY: { min: 1, max: 10 },
  gridThickness: { min: 0.8, max: 4 },
  gridAngle: { min: 0, max: 90 },
  handleDiameter: { min: 3, max: 20 },
  handleLength: { min: 5, max: 60 },
  handleBaseDiameter: { min: 4, max: 30 },
  handleTipRadius: { min: 0, max: 5 },
  handleHeight: { min: 0, max: 1 },
  baseHeight: { min: 0, max: 30 },
  baseThickness: { min: 1.2, max: 6 },
  baseCornerRadius: { min: 0, max: 40 },
  printClearance: { min: 0.2, max: 0.3 },
}

function clampValue(key: keyof ThermoformerParams, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function thermoformerReducer(
  state: ThermoformerParams,
  action: ThermoformerAction,
): ThermoformerParams {
  switch (action.type) {
    case 'update': {
      const value = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: value }
      const parsed = thermoformerParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultThermoformerParams
  }
}

export interface UseThermoformerOptions {
  workerFactory?: () => ThermoformerWorker
}

export function useThermoformer(options: UseThermoformerOptions = {}) {
  const workerFactory = options.workerFactory ?? createThermoformerWorker
  const [params, dispatch] = useReducer(thermoformerReducer, defaultThermoformerParams)
  const [geometry, setGeometry] = useState<BuildThermoformerResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const workerRef = useRef<ThermoformerWorker | null>(null)
  const geometryRef = useRef<BuildThermoformerResult | null>(null)

  const {
    productType, width, depth, height, cornerRadius, wallThickness,
    bottomThickness, rimHeight, rimThickness, edgeChamfer,
    lidEnabled, lidThickness, lidHeight, lidClearance, lidCornerRadius,
    lidFitDepth, fitType, frontPanelWidth, frontPanelHeight,
    frontPanelThickness, frontPanelCornerRadius, borderWidth,
    surfaceCurvature, pattern, holeDiameter, holeSpacingX, holeSpacingY,
    gridThickness, gridAngle, handleEnabled, handleDiameter, handleLength,
    handleBaseDiameter, handleTipRadius, handleSide, handleHeight,
    baseEnabled, baseHeight, baseThickness, baseCornerRadius, printClearance,
  } = params

  const buildParams = useMemo<ThermoformerGeometryParams>(() => ({
    productType, width, depth, height, cornerRadius, wallThickness,
    bottomThickness, rimHeight, rimThickness, edgeChamfer,
    lidEnabled, lidThickness, lidHeight, lidClearance, lidCornerRadius,
    lidFitDepth, fitType, frontPanelWidth, frontPanelHeight,
    frontPanelThickness, frontPanelCornerRadius, borderWidth,
    surfaceCurvature, pattern, holeDiameter, holeSpacingX, holeSpacingY,
    gridThickness, gridAngle, handleEnabled, handleDiameter, handleLength,
    handleBaseDiameter, handleTipRadius, handleSide, handleHeight,
    baseEnabled, baseHeight, baseThickness, baseCornerRadius, printClearance,
  }), [
    productType, width, depth, height, cornerRadius, wallThickness,
    bottomThickness, rimHeight, rimThickness, edgeChamfer,
    lidEnabled, lidThickness, lidHeight, lidClearance, lidCornerRadius,
    lidFitDepth, fitType, frontPanelWidth, frontPanelHeight,
    frontPanelThickness, frontPanelCornerRadius, borderWidth,
    surfaceCurvature, pattern, holeDiameter, holeSpacingX, holeSpacingY,
    gridThickness, gridAngle, handleEnabled, handleDiameter, handleLength,
    handleBaseDiameter, handleTipRadius, handleSide, handleHeight,
    baseEnabled, baseHeight, baseThickness, baseCornerRadius, printClearance,
  ])

  useEffect(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setError(null)
      const worker = workerFactory()
      workerRef.current = worker
      setIsBuilding(true)

      worker.build(buildParams, (data: SerializedBuildResult) => {
        if (workerRef.current !== worker) return
        const next = deserializeBuildResult(data)
        setGeometry((previous) => {
          disposeThermoformerResult(previous)
          return next
        })
        setIsBuilding(false)
      }, () => {
        if (workerRef.current !== worker) return
        setIsBuilding(false)
        setError('Falha ao gerar a geometria')
      })
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [buildParams, workerFactory])

  useEffect(() => {
    geometryRef.current = geometry
  }, [geometry])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
    disposeThermoformerResult(geometryRef.current)
    geometryRef.current = null
  }, [])

  const issues: ValidationIssue[] = useMemo(
    () => validateThermoformer(params),
    [params],
  )

  const dimensions = useMemo(() => {
    if (!geometry) {
      const baseExtra = params.baseEnabled
        ? 2 * (params.baseThickness + params.printClearance)
        : 0
      const lidExtra = params.lidEnabled
        ? params.lidHeight + params.lidThickness
        : 0
      return {
        width: Number((params.width + baseExtra).toFixed(1)),
        height: Number((params.height + params.rimHeight + lidExtra).toFixed(1)),
        thickness: Number((params.depth + baseExtra + params.frontPanelThickness).toFixed(1)),
      }
    }

    const box = new Box3()
    for (const part of [
      geometry.body, geometry.lid, geometry.frontPanel,
      geometry.handle, geometry.base,
    ]) {
      if (!part) continue
      part.computeBoundingBox()
      if (part.boundingBox) box.union(part.boundingBox)
    }
    const size = box.getSize(new Vector3())
    return {
      width: Number(size.x.toFixed(1)),
      height: Number(size.y.toFixed(1)),
      thickness: Number(size.z.toFixed(1)),
    }
  }, [
    geometry, params.width, params.depth, params.height, params.rimHeight,
    params.baseEnabled, params.baseThickness, params.printClearance,
    params.lidEnabled, params.lidHeight, params.lidThickness,
    params.frontPanelThickness,
  ])

  const fitRadius = useMemo(() => {
    if (!geometry) {
      return Math.max(params.width, params.depth, params.height) * 0.9
    }
    const box = new Box3()
    for (const part of [
      geometry.body, geometry.lid, geometry.frontPanel,
      geometry.handle, geometry.base,
    ]) {
      if (!part) continue
      part.computeBoundingBox()
      if (part.boundingBox) box.union(part.boundingBox)
    }
    const size = box.getSize(new Vector3())
    return Math.max(1, 0.5 * Math.hypot(size.x, size.y, size.z))
  }, [geometry, params.width, params.depth, params.height])

  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = fitRadius * 2.2
    const elevation = (25 * Math.PI) / 180
    const azimuth = (210 * Math.PI) / 180
    return [
      Number((distance * Math.sin(azimuth) * Math.cos(elevation)).toFixed(1)),
      Number((distance * Math.sin(elevation)).toFixed(1)),
      Number((distance * Math.cos(azimuth) * Math.cos(elevation)).toFixed(1)),
    ]
  }, [fitRadius])

  const updateParam = useCallback(
    (key: keyof ThermoformerParams, value: number | string | boolean) => {
      dispatch({ type: 'update', key, value })
    },
    [],
  )

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  return {
    params,
    geometry,
    isBuilding,
    error,
    issues,
    dimensions,
    cameraPosition,
    fitRadius,
    updateParam,
    reset,
  }
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts
git commit -m "feat: add useThermoformer hook"
```

---

## Task 13: Exportação STL

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect, vi } from 'vitest'
import { BoxGeometry } from 'three'
import {
  exportThermoformerStl,
  prepareLidForPrint,
  preparePanelForPrint,
} from '@/features/studio/tools/lembrancinhas/termoformador/exportStl'
import { buildHandle, prepareHandleForPrint } from '@/features/studio/tools/lembrancinhas/termoformador/buildHandle'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import type { BuildThermoformerResult } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse = vi.fn(() => new ArrayBuffer(84))
  },
}))

function setupDownloadMocks() {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, writable: true })
  Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true })

  const anchors: Array<{ click: ReturnType<typeof vi.fn>; href: string; download: string }> = []
  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => {
    const anchor = { click: vi.fn(), href: '', download: '' }
    anchors.push(anchor)
    return anchor as never
  })
  const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as never)
  const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as never)
  return { anchors, createElementSpy, appendChildSpy, removeChildSpy }
}

describe('exportThermoformerStl', () => {
  it('baixa as peças habilitadas com nomes separados', () => {
    const { anchors, createElementSpy, appendChildSpy, removeChildSpy } = setupDownloadMocks()
    const result: BuildThermoformerResult = {
      body: new BoxGeometry(10, 10, 10),
      lid: new BoxGeometry(10, 5, 10),
      frontPanel: new BoxGeometry(8, 8, 1),
      handle: buildHandle(defaultThermoformerParams),
      base: new BoxGeometry(12, 2, 12),
    }

    exportThermoformerStl(result, 'Meu Termo!', defaultThermoformerParams)

    expect(anchors).toHaveLength(5)
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Meu-Termo-corpo.stl',
      'Meu-Termo-tampa.stl',
      'Meu-Termo-painel.stl',
      'Meu-Termo-pino.stl',
      'Meu-Termo-base.stl',
    ])
    expect(anchors.every((anchor) => anchor.click.mock.calls.length === 1)).toBe(true)

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })

  it('omite peças desabilitadas', () => {
    const { anchors, createElementSpy, appendChildSpy, removeChildSpy } = setupDownloadMocks()
    exportThermoformerStl({
      body: new BoxGeometry(10, 10, 10),
      lid: null,
      frontPanel: new BoxGeometry(8, 8, 1),
      handle: null,
      base: null,
    }, 'Corpo', defaultThermoformerParams)
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Corpo-corpo.stl',
      'Corpo-painel.stl',
    ])
    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })
})

describe('preparos de impressão', () => {
  it('deita a tampa e o painel sem mutar o original', () => {
    const lid = new BoxGeometry(10, 14.4, 10)
    lid.translate(0, 7.2, 0)
    const panel = new BoxGeometry(140, 50, 3)
    panel.translate(0, 0, 60)

    const lidPrint = prepareLidForPrint(lid)
    lidPrint.computeBoundingBox()
    expect(lidPrint.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(lidPrint.boundingBox!.max.y).toBeCloseTo(14.4, 3)

    const panelPrint = preparePanelForPrint(panel)
    panelPrint.computeBoundingBox()
    expect(panelPrint.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(panelPrint.boundingBox!.max.y).toBeCloseTo(3, 3)

    lid.computeBoundingBox()
    expect(lid.boundingBox!.min.y).toBeCloseTo(0, 3)
  })

  it('devolve o pino para a vertical com a base na mesa', () => {
    const handle = buildHandle(defaultThermoformerParams)
    const print = prepareHandleForPrint(handle, defaultThermoformerParams)
    print.computeBoundingBox()
    expect(print.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(print.boundingBox!.max.y).toBeCloseTo(defaultThermoformerParams.handleLength, 3)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import { Mesh, Scene, type BufferGeometry } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import {
  prepareHandleForPrint,
} from './buildHandle'
import type { BuildThermoformerResult } from './buildThermoformer'
import {
  sanitizeFilename,
  type ThermoformerGeometryParams,
} from './schema'

function centerOnBed(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  geometry.translate(
    -(box.min.x + box.max.x) / 2,
    -box.min.y,
    -(box.min.z + box.max.z) / 2,
  )
  return geometry
}

function downloadStl(geometry: BufferGeometry, filename: string): void {
  const scene = new Scene()
  scene.add(new Mesh(geometry))
  const exporter = new STLExporter()
  const result = exporter.parse(scene, { binary: true })
  const blob = new Blob([result as unknown as BlobPart], { type: 'model/stl' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  geometry.dispose()
}

export function prepareBodyForPrint(geometry: BufferGeometry): BufferGeometry {
  return centerOnBed(geometry.clone())
}

export function prepareLidForPrint(geometry: BufferGeometry): BufferGeometry {
  const clone = geometry.clone()
  clone.rotateX(Math.PI)
  return centerOnBed(clone)
}

export function preparePanelForPrint(geometry: BufferGeometry): BufferGeometry {
  const clone = geometry.clone()
  clone.rotateX(-Math.PI / 2)
  return centerOnBed(clone)
}

export function prepareBaseForPrint(geometry: BufferGeometry): BufferGeometry {
  return centerOnBed(geometry.clone())
}

export function exportThermoformerStl(
  result: BuildThermoformerResult,
  projectName: string,
  params: ThermoformerGeometryParams,
): void {
  const name = sanitizeFilename(projectName)

  downloadStl(prepareBodyForPrint(result.body), `${name}-corpo.stl`)
  if (result.lid) downloadStl(prepareLidForPrint(result.lid), `${name}-tampa.stl`)
  downloadStl(preparePanelForPrint(result.frontPanel), `${name}-painel.stl`)
  if (result.handle) {
    downloadStl(prepareHandleForPrint(result.handle, params), `${name}-pino.stl`)
  }
  if (result.base) downloadStl(prepareBaseForPrint(result.base), `${name}-base.stl`)
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts
git commit -m "feat: export thermoformer stl parts"
```

---

## Task 14: Preview e painel

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx`
- Create: `src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`

**Step 1: Escrever o teste do preview**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThermoformerPreview } from '@/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview'

describe('ThermoformerPreview', () => {
  it('não renderiza nada sem geometria', () => {
    const { container } = render(
      <ThermoformerPreview geometry={null} bodyColor="#22c55e" accentColor="#f5f5f5" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

**Step 2: Escrever o teste do painel**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/lembrancinhas/termoformador/StudioPanel'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

const defaultProps = {
  params: defaultThermoformerParams,
  issues: [],
  onUpdateParam: vi.fn(),
  onReset: vi.fn(),
}

describe('StudioPanel (termoformador)', () => {
  it('renderiza heading, restaurar e seções', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Termoformador')).toBeDefined()
    expect(screen.getByText('Restaurar')).toBeDefined()
    expect(screen.getByText('Dimensões')).toBeDefined()
    expect(screen.getByText('Painel frontal')).toBeDefined()
    expect(screen.getByText('Tampa')).toBeDefined()
    expect(screen.getByText('Pino lateral')).toBeDefined()
    expect(screen.getByText('Base')).toBeDefined()
    expect(screen.getByText('Validação')).toBeDefined()
  })

  it('renderiza os campos principais', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByLabelText('Largura')).toBeDefined()
    expect(screen.getByLabelText('Profundidade')).toBeDefined()
    expect(screen.getByLabelText('Altura')).toBeDefined()
    expect(screen.getByLabelText('Largura do painel')).toBeDefined()
    expect(screen.getByLabelText('Habilitar tampa')).toBeDefined()
    expect(screen.getByLabelText('Habilitar pino')).toBeDefined()
    expect(screen.getByLabelText('Habilitar base')).toBeDefined()
  })

  it('esconde campos da tampa quando desabilitada', () => {
    render(<StudioPanel {...defaultProps} params={{ ...defaultThermoformerParams, lidEnabled: false }} />)
    expect(screen.queryByLabelText('Espessura da tampa')).toBeNull()
  })

  it('esconde campos do pino e da base quando desabilitados', () => {
    render(<StudioPanel {...defaultProps} params={{
      ...defaultThermoformerParams,
      handleEnabled: false,
      baseEnabled: false,
    }} />)
    expect(screen.queryByLabelText('Diâmetro do pino')).toBeNull()
    expect(screen.queryByLabelText('Altura da base')).toBeNull()
  })

  it('mostra o ângulo só para grade e malha', () => {
    const { rerender } = render(<StudioPanel {...defaultProps} />)
    expect(screen.queryByLabelText('Ângulo da grade')).toBeNull()
    rerender(<StudioPanel {...defaultProps} params={{ ...defaultThermoformerParams, pattern: 'grid' as const }} />)
    expect(screen.getByLabelText('Ângulo da grade')).toBeDefined()
  })

  it('atualiza o padrão e o fit type', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.change(screen.getByLabelText('Padrão'), { target: { value: 'mesh' } })
    fireEvent.change(screen.getByLabelText('Encaixe'), { target: { value: 'internal' } })
    expect(onUpdateParam).toHaveBeenCalledWith('pattern', 'mesh')
    expect(onUpdateParam).toHaveBeenCalledWith('fitType', 'internal')
  })

  it('mostra issues de validação', () => {
    render(<StudioPanel {...defaultProps} issues={[
      { code: 'x', severity: 'warning', message: 'Aviso de teste' },
    ]} />)
    expect(screen.getByText('Aviso de teste')).toBeDefined()
  })

  it('chama reset', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    onReset.mockClear()
    screen.getByText('Restaurar').click()
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
```

**Step 3: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`
Expected: FAIL com módulos não encontrados.

**Step 4: Implementar o preview**

```tsx
import type { BuildThermoformerResult } from './buildThermoformer'

interface ThermoformerPreviewProps {
  geometry: BuildThermoformerResult | null
  bodyColor: string
  accentColor: string
}

export function ThermoformerPreview({
  geometry,
  bodyColor,
  accentColor,
}: ThermoformerPreviewProps) {
  if (!geometry) return null

  return (
    <group>
      <mesh geometry={geometry.body} castShadow receiveShadow>
        <meshStandardMaterial color={bodyColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.lid && (
        <mesh geometry={geometry.lid} castShadow receiveShadow>
          <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.4} />
        </mesh>
      )}
      <mesh geometry={geometry.frontPanel} castShadow receiveShadow>
        <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.35} />
      </mesh>
      {geometry.handle && (
        <mesh geometry={geometry.handle} castShadow receiveShadow>
          <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.4} />
        </mesh>
      )}
      {geometry.base && (
        <mesh geometry={geometry.base} castShadow receiveShadow>
          <meshStandardMaterial color={accentColor} metalness={0.1} roughness={0.45} />
        </mesh>
      )}
    </group>
  )
}
```

**Step 5: Implementar o painel**

```tsx
import {
  Accordion,
  Alert,
  Button,
  Flex,
  Heading,
  SelectField,
  SliderField,
  SwitchField,
  Text,
  View,
} from '@aws-amplify/ui-react'
import {
  PLA_COLORS,
  MINIMUM_FEATURE_MM,
  MINIMUM_WALL_MM,
  type ThermoformerParams,
} from './schema'
import type { ValidationIssue } from './validateThermoformer'

interface StudioPanelProps {
  params: ThermoformerParams
  issues: ValidationIssue[]
  onUpdateParam: (key: keyof ThermoformerParams, value: number | string | boolean) => void
  onReset: () => void
}

function ColorSwatches({
  colors,
  selected,
  onSelect,
}: {
  colors: readonly string[]
  selected: string
  onSelect: (color: string) => void
}) {
  return (
    <Flex direction="row" gap="xs" wrap="wrap">
      {colors.map((color) => (
        <Button
          key={color}
          size="small"
          aria-label={color}
          aria-pressed={color === selected}
          onClick={() => onSelect(color)}
          className="h-7 w-7 rounded-full p-0"
          style={{
            backgroundColor: color,
            border: color === selected ? '2px solid #000' : '2px solid transparent',
          }}
        />
      ))}
    </Flex>
  )
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = 'mm',
  format,
  onChange,
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
    : step < 1
      ? value.toFixed(step < 0.1 ? 2 : 1)
      : value

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

export function StudioPanel({
  params,
  issues,
  onUpdateParam,
  onReset,
}: StudioPanelProps) {
  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Termoformador
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="dimensoes">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Dimensões</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Largura" value={params.width} min={60} max={300} step={5} onChange={(value) => onUpdateParam('width', value)} />
              <LabeledSlider label="Profundidade" value={params.depth} min={60} max={300} step={5} onChange={(value) => onUpdateParam('depth', value)} />
              <LabeledSlider label="Altura" value={params.height} min={20} max={120} step={1} onChange={(value) => onUpdateParam('height', value)} />
              <LabeledSlider label="Raio dos cantos" value={params.cornerRadius} min={0} max={40} step={1} onChange={(value) => onUpdateParam('cornerRadius', value)} />
              <LabeledSlider label="Espessura da parede" value={params.wallThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('wallThickness', value)} />
              <LabeledSlider label="Espessura do fundo" value={params.bottomThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('bottomThickness', value)} />
              <LabeledSlider label="Altura da borda" value={params.rimHeight} min={0} max={10} step={0.1} onChange={(value) => onUpdateParam('rimHeight', value)} />
              <LabeledSlider label="Espessura da borda" value={params.rimThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('rimThickness', value)} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="acabamento">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Acabamento</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Chanfro das arestas" value={params.edgeChamfer} min={0} max={3} step={0.1} onChange={(value) => onUpdateParam('edgeChamfer', value)} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="painel">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Painel frontal</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Largura do painel" value={params.frontPanelWidth} min={40} max={300} step={5} onChange={(value) => onUpdateParam('frontPanelWidth', value)} />
              <LabeledSlider label="Altura do painel" value={params.frontPanelHeight} min={40} max={300} step={5} onChange={(value) => onUpdateParam('frontPanelHeight', value)} />
              <LabeledSlider label="Espessura do painel" value={params.frontPanelThickness} min={1} max={5} step={0.1} onChange={(value) => onUpdateParam('frontPanelThickness', value)} />
              <LabeledSlider label="Raio do painel" value={params.frontPanelCornerRadius} min={0} max={40} step={1} onChange={(value) => onUpdateParam('frontPanelCornerRadius', value)} />
              <LabeledSlider label="Moldura sólida" value={params.borderWidth} min={3} max={20} step={0.5} onChange={(value) => onUpdateParam('borderWidth', value)} />

              <SelectField
                label="Superfície"
                value={params.surfaceCurvature}
                onChange={(event) => onUpdateParam('surfaceCurvature', event.target.value)}
              >
                <option value="flat">Plana</option>
                <option value="slightly_convex">Levemente convexa</option>
                <option value="slightly_concave">Levemente côncava</option>
              </SelectField>

              <SelectField
                label="Padrão"
                value={params.pattern}
                onChange={(event) => onUpdateParam('pattern', event.target.value)}
              >
                <option value="perforated">Perfurado</option>
                <option value="grid">Grade</option>
                <option value="mesh">Malha</option>
              </SelectField>

              <LabeledSlider label="Diâmetro do furo" value={params.holeDiameter} min={0.8} max={6} step={0.1} onChange={(value) => onUpdateParam('holeDiameter', value)} />
              <LabeledSlider label="Espaçamento horizontal" value={params.holeSpacingX} min={1} max={10} step={0.5} onChange={(value) => onUpdateParam('holeSpacingX', value)} />
              <LabeledSlider label="Espaçamento vertical" value={params.holeSpacingY} min={1} max={10} step={0.5} onChange={(value) => onUpdateParam('holeSpacingY', value)} />
              <LabeledSlider label="Espessura da nervura" value={params.gridThickness} min={0.8} max={4} step={0.1} onChange={(value) => onUpdateParam('gridThickness', value)} />

              {params.pattern !== 'perforated' && (
                <LabeledSlider label="Ângulo da grade" value={params.gridAngle} min={0} max={90} step={5} suffix="°" onChange={(value) => onUpdateParam('gridAngle', value)} />
              )}

              <Text fontSize="xs" color="font.secondary">
                A grade é limitada para manter o preview responsivo.
              </Text>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="tampa">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Tampa</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SwitchField
                label="Habilitar tampa"
                isChecked={params.lidEnabled}
                onChange={(event) => onUpdateParam('lidEnabled', event.target.checked)}
              />
              {params.lidEnabled && (
                <>
                  <LabeledSlider label="Espessura da tampa" value={params.lidThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('lidThickness', value)} />
                  <LabeledSlider label="Altura da tampa" value={params.lidHeight} min={0} max={30} step={0.5} onChange={(value) => onUpdateParam('lidHeight', value)} />
                  <LabeledSlider label="Folga da tampa" value={params.lidClearance} min={0.1} max={0.6} step={0.05} onChange={(value) => onUpdateParam('lidClearance', value)} />
                  <LabeledSlider label="Raio da tampa" value={params.lidCornerRadius} min={0} max={40} step={1} onChange={(value) => onUpdateParam('lidCornerRadius', value)} />
                  <LabeledSlider label="Profundidade do encaixe" value={params.lidFitDepth} min={2} max={20} step={0.5} onChange={(value) => onUpdateParam('lidFitDepth', value)} />
                  <SelectField
                    label="Encaixe"
                    value={params.fitType}
                    onChange={(event) => onUpdateParam('fitType', event.target.value)}
                  >
                    <option value="external">Externo</option>
                    <option value="internal">Interno</option>
                  </SelectField>
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="pino">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Pino lateral</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SwitchField
                label="Habilitar pino"
                isChecked={params.handleEnabled}
                onChange={(event) => onUpdateParam('handleEnabled', event.target.checked)}
              />
              {params.handleEnabled && (
                <>
                  <LabeledSlider label="Diâmetro do pino" value={params.handleDiameter} min={3} max={20} step={0.5} onChange={(value) => onUpdateParam('handleDiameter', value)} />
                  <LabeledSlider label="Comprimento do pino" value={params.handleLength} min={5} max={60} step={1} onChange={(value) => onUpdateParam('handleLength', value)} />
                  <LabeledSlider label="Diâmetro da base" value={params.handleBaseDiameter} min={4} max={30} step={1} onChange={(value) => onUpdateParam('handleBaseDiameter', value)} />
                  <LabeledSlider label="Raio da ponta" value={params.handleTipRadius} min={0} max={5} step={0.1} onChange={(value) => onUpdateParam('handleTipRadius', value)} />
                  <SelectField
                    label="Lateral"
                    value={params.handleSide}
                    onChange={(event) => onUpdateParam('handleSide', event.target.value)}
                  >
                    <option value="left">Esquerda</option>
                    <option value="right">Direita</option>
                    <option value="top">Topo</option>
                    <option value="bottom">Fundo</option>
                  </SelectField>
                  <LabeledSlider
                    label="Posição na lateral"
                    value={params.handleHeight}
                    min={0}
                    max={1}
                    step={0.05}
                    format={(value) => `${Math.round(value * 100)}`}
                    suffix="%"
                    onChange={(value) => onUpdateParam('handleHeight', value)}
                  />
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="base">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Base</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SwitchField
                label="Habilitar base"
                isChecked={params.baseEnabled}
                onChange={(event) => onUpdateParam('baseEnabled', event.target.checked)}
              />
              {params.baseEnabled && (
                <>
                  <LabeledSlider label="Altura da base" value={params.baseHeight} min={0} max={30} step={0.5} onChange={(value) => onUpdateParam('baseHeight', value)} />
                  <LabeledSlider label="Espessura da base" value={params.baseThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('baseThickness', value)} />
                  <LabeledSlider label="Raio da base" value={params.baseCornerRadius} min={0} max={40} step={1} onChange={(value) => onUpdateParam('baseCornerRadius', value)} />
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="impressao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Impressão</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Folga de impressão" value={params.printClearance} min={0.2} max={0.3} step={0.01} onChange={(value) => onUpdateParam('printClearance', value)} />
              <Text fontSize="xs" color="font.secondary">
                Parede mínima {MINIMUM_WALL_MM.toFixed(1)} mm · elemento mínimo {MINIMUM_FEATURE_MM.toFixed(1)} mm.
              </Text>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="aparencia">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Aparência</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.tertiary">Cor do corpo</Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.bodyColor}
                onSelect={(color) => onUpdateParam('bodyColor', color)}
              />
              <Text fontSize="xs" color="font.tertiary">Cor de destaque</Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.accentColor}
                onSelect={(color) => onUpdateParam('accentColor', color)}
              />
              <Text fontSize="xs" color="font.secondary">
                Tampa, painel, pino e base usam a cor de destaque.
              </Text>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="validacao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Validação</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              {issues.length === 0 ? (
                <Text fontSize="xs" color="font.secondary">
                  Sem problemas para impressão.
                </Text>
              ) : (
                issues.map((issue) => (
                  <Alert
                    key={issue.code}
                    variation={issue.severity === 'error' ? 'error' : 'warning'}
                    heading={issue.severity === 'error' ? 'Erro' : 'Aviso'}
                  >
                    {issue.message}
                  </Alert>
                ))
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
```

**Step 6: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`
Expected: PASS.

**Step 7: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx \
  src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx
git commit -m "feat: add thermoformer preview and panel"
```

---

## Task 15: Categoria Lembrancinhas no ToolSelector

**Files:**
- Modify: `src/features/studio/components/ToolSelector.tsx`
- Test: `tests/features/studio/components/ToolSelector.test.tsx`

**Step 1: Escrever/ajustar o teste**

Substituir as expectativas de duas categorias por três e adicionar o card:

```tsx
it('renderiza as seções na ordem Confeitaria, Letreiros e Lembrancinhas', () => {
  render(<ToolSelector onSelect={vi.fn()} />)
  const headings = screen.getAllByRole('heading', { level: 2 })
  expect(headings.map((heading) => heading.textContent)).toEqual([
    'Confeitaria',
    'Letreiros',
    'Lembrancinhas',
  ])
})

it('coloca Termoformador na seção Lembrancinhas e emite o id', async () => {
  const onSelect = vi.fn()
  const user = userEvent.setup()
  render(<ToolSelector onSelect={onSelect} />)
  const section = screen.getByRole('heading', { name: 'Lembrancinhas' }).closest('section')!
  const card = within(section).getByRole('button', { name: /termoformador/i })
  await user.click(card)
  expect(onSelect).toHaveBeenCalledWith('termoformador')
})
```

Ajustar o teste de contagem:

```tsx
expect(within(confeitaria as HTMLElement).getAllByRole('button')).toHaveLength(5)
expect(within(letreiros as HTMLElement).getAllByRole('button')).toHaveLength(5)
const lembrancinhas = screen.getByRole('heading', { name: 'Lembrancinhas' }).closest('section')!
expect(within(lembrancinhas as HTMLElement).getAllByRole('button')).toHaveLength(1)
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/components/ToolSelector.test.tsx`
Expected: FAIL porque a categoria ainda não existe.

**Step 3: Implementar**

Em `ToolSelector.tsx`:

```ts
export type ToolId =
  | 'chaveiro'
  | 'cartao-visita'
  | 'suporte-bolo'
  | 'suporte-foto'
  | 'topo-bolo'
  | 'carimbo-brigadeiro'
  | 'cortador-carimbo'
  | 'rolo-textura'
  | 'marcador-pagina'
  | 'placa-loja'
  | 'termoformador'

type ToolCategory = 'Confeitaria' | 'Letreiros' | 'Lembrancinhas'

const CATEGORY_ORDER: ToolCategory[] = ['Confeitaria', 'Letreiros', 'Lembrancinhas']
```

Adicionar ao array `TOOLS`:

```ts
{
  id: 'termoformador',
  name: 'Termoformador',
  description: 'Equipamento modular de termoformagem com corpo, tampa, painel perfurado, pino e base',
  icon: '🏭',
  category: 'Lembrancinhas',
},
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/components/ToolSelector.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/components/ToolSelector.tsx \
  tests/features/studio/components/ToolSelector.test.tsx
git commit -m "feat: add lembrancinhas category"
```

---

## Task 16: Integração no StudioPage

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Ajustar o teste**

Adicionar o import eager no topo do teste:

```tsx
import '@/features/studio/tools/lembrancinhas/termoformador/StudioPanel'
```

Adicionar um teste:

```tsx
it('abre a ferramenta Termoformador', async () => {
  renderStudioPage()
  fireEvent.click(screen.getByRole('button', { name: /termoformador/i }))
  expect(
    await screen.findByRole('heading', { level: 2, name: 'Termoformador' }, LAZY_TIMEOUT),
  ).toBeInTheDocument()
  expect(screen.getByText('Dimensões')).toBeInTheDocument()
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/StudioPage.test.tsx`
Expected: FAIL porque a ferramenta ainda não está integrada.

**Step 3: Implementar no `StudioPage.tsx`**

Adicionar imports:

```tsx
import { useThermoformer } from './tools/lembrancinhas/termoformador/useThermoformer'
import { exportThermoformerStl } from './tools/lembrancinhas/termoformador/exportStl'
```

Adicionar lazy imports:

```tsx
const TermoformadorTool = lazy(() =>
  import('./tools/lembrancinhas/termoformador/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const TermoformadorPreview = lazy(() =>
  import('./tools/lembrancinhas/termoformador/ThermoformerPreview').then((m) => ({
    default: m.ThermoformerPreview,
  })),
)
```

Adicionar o wrapper antes de `export function StudioPage`:

```tsx
function TermoformadorToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const {
    params,
    geometry,
    isBuilding,
    error,
    issues,
    dimensions,
    cameraPosition,
    fitRadius,
    updateParam,
    reset,
  } = useThermoformer()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (!geometry) return
    exportThermoformerStl(geometry, projectName, params)
  }, [geometry, projectName, params])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="relative flex min-h-0 flex-1" aria-busy={isBuilding}>
        {isBuilding && (
          <div
            role="status"
            aria-live="polite"
            className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-neutral-200 bg-white/90 px-3 py-1 text-xs text-neutral-600 shadow-sm"
          >
            Gerando…
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-red-200 bg-white/95 px-3 py-1 text-xs text-red-600 shadow-sm"
          >
            {error}
          </div>
        )}
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <TermoformadorTool
            params={params}
            issues={issues}
            onUpdateParam={updateParam}
            onReset={reset}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
          cameraPosition={cameraPosition}
          fitRadius={fitRadius}
        >
          <Suspense fallback={null}>
            <TermoformadorPreview
              geometry={geometry}
              bodyColor={params.bodyColor}
              accentColor={params.accentColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}
```

Adicionar no render de `StudioPage`:

```tsx
{activeTool === 'termoformador' && (
  <TermoformadorToolWrapper onBack={() => setActiveTool(null)} />
)}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/StudioPage.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/StudioPage.tsx tests/features/studio/StudioPage.test.tsx
git commit -m "feat: integrate termoformador into studio"
```

---

## Task 17: Documentação

**Files:**
- Modify: `docs/frontend/studio.md`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md`
- Modify: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modify: `docs/plans/2026-11-12-termoformador-design.md`

**Step 1: Atualizar `docs/frontend/studio.md`**

Na lista de ferramentas, adicionar:

```md
- **Termoformador** — Equipamento modular de termoformagem com corpo, tampa, painel perfurado, pino lateral e base, exportados como STLs separados
```

Na seção "Componentes Genéricos", ajustar o seletor:

```md
- **Tool Selector** — Seleção de ferramenta agrupada em três faixas horizontais: Confeitaria, Letreiros e Lembrancinhas
```

Na tabela "Como editar", adicionar:

```md
| **Termoformador** | |
| Schema + defaults + cores | `src/features/studio/tools/lembrancinhas/termoformador/schema.ts` |
| Retângulo arredondado e loops | `src/features/studio/tools/lembrancinhas/termoformador/shapes.ts` |
| Loft de casca do corpo/tampa | `src/features/studio/tools/lembrancinhas/termoformador/shell.ts` |
| Corpo | `src/features/studio/tools/lembrancinhas/termoformador/buildBody.ts` |
| Tampa | `src/features/studio/tools/lembrancinhas/termoformador/buildLid.ts` |
| Grade/furos do painel | `src/features/studio/tools/lembrancinhas/termoformador/panelPattern.ts` |
| Painel frontal | `src/features/studio/tools/lembrancinhas/termoformador/buildFrontPanel.ts` |
| Pino lateral | `src/features/studio/tools/lembrancinhas/termoformador/buildHandle.ts` |
| Base | `src/features/studio/tools/lembrancinhas/termoformador/buildBase.ts` |
| Validação | `src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts` |
| Montagem das peças | `src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts` |
| Worker + serialização | `src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.worker.ts` |
| Hook de estado | `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts` |
| Painel | `src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx` |
| Export STL separado | `src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts` |
```

Adicionar uma seção explicativa após a seção do Marcador de Página:

```md
## Termoformador

Pipeline: **useThermoformer.ts** → **buildThermoformer.worker.ts** → **buildThermoformer.ts** → **exportStl.ts**

1. **schema.ts** — valida dimensões, tampa, painel, pino, base, impressão e cores.
2. **useThermoformer.ts** — reducer com clamp, debounce de 250 ms, worker por build, validação na main thread e descarte de resultados obsoletos.
3. **shapes.ts** — retângulo arredondado em `Shape`/`Path` e loops resampleados para o loft.
4. **shell.ts** — loft fechado do corpo (fundo, cavidade, rim e chanfro) e da tampa (placa, saia e cavidade).
5. **buildBody.ts** — calcula parede, cavidade, rim e chanfro.
6. **buildLid.ts** — calcula encaixe externo/interno, posição e altura.
7. **panelPattern.ts** — distribui furos circulares, quadrados ou losangos e limita a 800 aberturas.
8. **buildFrontPanel.ts** — extruda a placa com moldura sólida e aplica curvatura só na face frontal.
9. **buildHandle.ts** — perfil de revolução com flange, haste e ponta; posiciona na lateral.
10. **buildBase.ts** — anel/pedestal com folga de impressão.
11. **buildThermoformer.ts** — monta as peças e devolve `{ body, lid, frontPanel, handle, base }`.
12. **exportStl.ts** — baixa um STL por peça habilitada, com orientação de impressão e centralização na mesa.
```

Adicionar decisões:

```md
- **Termoformador:** equipamento modular em cinco peças separadas. Corpo e tampa usam loft de retângulo arredondado (sem CSG), garantindo malha fechada. Painel perfurado é uma peça aplicada na face frontal, com moldura sólida e curvatura aproximada só na face frontal. Pino lateral tem flange colado na face, sem furo passante. Base é um anel de estabilização. O shaft de aberturas do painel é limitado a 800 para manter o worker responsivo. Exportação em arquivos separados (`-corpo`, `-tampa`, `-painel`, `-pino`, `-base`), com tampa invertida, painel deitado e pino em pé. Fillets 3D reais ficam fora da v1; o acabamento usa um único `edgeChamfer`.
```

**Step 2: Atualizar o `AGENTS.md` do termoformador**

Mudar o status para:

```md
## Status

Implementada (v1).
```

Adicionar ao final:

```md
## Decisões da v1

- Corpo e tampa são loftados em anéis; não há CSG.
- Os quatro fillets previstos foram substituídos por um único `edgeChamfer`.
- O painel é aplicado na face frontal externa, sem janela no corpo.
- O pino tem flange colado na face, sem furo passante.
- A base é um anel de estabilização com folga de impressão.
- O painel é limitado a 800 aberturas para manter o worker responsivo.
- A curvatura do painel é aproximada e aplicada só na face frontal.
- Cores de preview: corpo e destaque; o STL não carrega cor.
- Exportação separada em `corpo`, `tampa`, `painel`, `pino` e `base`.
- `nozzleDiameter`, 3MF e STEP ficam fora da v1.
```

**Step 3: Atualizar o `AGENTS.md` da categoria**

Na tabela, trocar a linha do termoformador:

```md
| termoformador | implementada (v1) |
```

**Step 4: Atualizar o design**

Trocar `frontPanelHeight` de 80 para 50 na tabela de parâmetros e adicionar uma nota:

```md
> Nota de implementação: o default de `frontPanelHeight` foi ajustado para
> 50 mm para caber no corpo padrão (`height 60 + rimHeight 3`) sem aviso inicial.
```

**Step 5: Commit**

```bash
git add docs/frontend/studio.md \
  docs/plans/2026-11-12-termoformador-design.md \
  src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md \
  src/features/studio/tools/lembrancinhas/AGENTS.md
git commit -m "docs: document thermoformer tool"
```

---

## Task 18: Validação final

**Files:**
- Verify: todos os arquivos criados/modificados.

**Step 1: Rodar typecheck**

Run: `npm run typecheck`
Expected: sem erros.

**Step 2: Rodar lint**

Run: `npm run lint`
Expected: sem erros.

**Step 3: Rodar a suíte completa**

Run: `npm run test`
Expected: todos os testes passam.

**Step 4: Rodar o build**

Run: `npm run build`
Expected: build concluído sem warnings.

**Step 5: Revisar o diff**

Run: `git status --short && git diff --stat`
Expected: apenas arquivos da ferramenta, testes, ToolSelector, StudioPage e docs.

**Step 6: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore: finalize termoformador validation"
```

---

## Critérios de conclusão

- Ferramenta Termoformador aparece na categoria Lembrancinhas.
- Corpo, tampa, painel, pino e base são gerados em worker.
- Peças desabilitadas não aparecem no preview nem são exportadas.
- Corpo e tampa têm malha fechada.
- Painel respeita moldura, padrões e limite de aberturas.
- Exportação baixa STLs separados com nomes e orientações corretas.
- Validação mostra erros/avisos no painel.
- `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` passam.
- Documentação atualizada.
