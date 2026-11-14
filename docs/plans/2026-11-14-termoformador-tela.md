# Termoformador (tela circular) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar a ferramenta Termoformador no Studio 3D com uma tela circular plana, aro sólido e malha hexagonal de linhas de 2 mm, exportada como STL binário.

**Architecture:** Schema Zod + reducer com debounce e Web Worker. O layout hexagonal é calculado em `screenPattern.ts`; a geometria é um `ExtrudeGeometry` de um `Shape` circular com um `Path` hexagonal por favo, girado para deitar. A validação roda na main thread e o STL sai como peça única. Sem CSG e sem reaproveitar a geometria da Caixa.

**Tech Stack:** React 19, TypeScript strict, Three.js, React Three Fiber, Zod, Amplify UI, Vitest, TailwindCSS 4.

**Design de referência:** `docs/plans/2026-11-14-termoformador-tela-design.md`

---

## Pré-requisitos e convenções

- Trabalhar em worktree dedicado quando a execução for iniciada.
- 1 unidade Three.js = 1 mm.
- Não usar `any`; tipar retornos.
- Não criar componente de UI paralelo ao design system: reutilizar Amplify UI.
- Testes em `tests/features/studio/tools/lembrancinhas/termoformador/`.
- Rodar o teste específico antes de cada commit.
- Commits semânticos `feat:`, `test:`, `docs:`.

### Spike obrigatório (Task 4)

Antes de continuar para as tasks seguintes, o teste de malha densa (~1.200
favos) precisa provar que o `ExtrudeGeometry`:

1. é fechado e com winding coerente (`isClosed`);
2. gera ~1.200 favos sem favo fora do aro;
3. builda em tempo aceitável (observar o tempo reportado pelo Vitest, alvo
   < 1,5 s).

Se qualquer item falhar, **parar** e migrar para a malha procedural descrita no
design antes de prosseguir.

**Tempos medidos (referência):** default 283 favos → build ~80 ms; spike denso
1.189 favos → build ~583 ms e `isClosed` ~784 ms (a duração do teste no Vitest
inclui a checagem e chega a ~1,6 s, por isso o gate é avaliado pelo tempo de
build); configuração máxima do schema (3.571 favos após o cap) → build ~7 s. O
worker é obrigatório para manter a UI responsiva nesse extremo.

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
  MAX_SCREEN_OPENINGS,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('termoformador schema', () => {
  it('defaults válidos', () => {
    expect(thermoformerParamsSchema.safeParse(defaultThermoformerParams).success).toBe(true)
    expect(defaultThermoformerParams).toMatchObject({
      productType: 'termoformador',
      diameter: 160,
      thickness: 3,
      frameWidth: 6,
      lineWidth: 2,
      opening: 6,
    })
  })

  it('rejeita dimensões fora da faixa', () => {
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, diameter: 59 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, thickness: 7 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, lineWidth: 0.5 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, opening: 2 }).success).toBe(false)
  })

  it('rejeita cor fora da paleta', () => {
    expect(
      thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, color: '#000000' }).success,
    ).toBe(false)
  })

  it('sanitizeFilename', () => {
    expect(sanitizeFilename('Minha Tela! @#')).toBe('Minha-Tela')
    expect(sanitizeFilename('')).toBe('termoformador')
    expect(sanitizeFilename('Tela 3D')).toBe('Tela-3D')
  })

  it('limite de favos é 4000', () => {
    expect(MAX_SCREEN_OPENINGS).toBe(4000)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts`
Expected: FAIL com "Cannot find module" ou "thermoformerParamsSchema is not defined".

**Step 3: Implementar o schema**

```ts
import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'termoformador' as const

export const MINIMUM_FEATURE_MM = 0.8
export const MAX_SCREEN_OPENINGS = 4000
export const SCREEN_SEGMENTS = 128

export const thermoformerParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  diameter: z.number().min(60).max(300),
  thickness: z.number().min(1.2).max(6),
  frameWidth: z.number().min(2).max(30),
  lineWidth: z.number().min(1.2).max(4),
  opening: z.number().min(3).max(30),
  color: z.enum(PLA_COLORS),
})

export type ThermoformerParams = z.infer<typeof thermoformerParamsSchema>

/** Campos que alteram geometria. A cor fica de fora para não rebuildar. */
export type ThermoformerGeometryParams = Omit<ThermoformerParams, 'color'>

export const defaultThermoformerParams: ThermoformerParams = {
  productType: PRODUCT_TYPE,
  diameter: 160,
  thickness: 3,
  frameWidth: 6,
  lineWidth: 2,
  opening: 6,
  color: '#14b8a6',
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
git commit -m "feat: add thermoformer screen schema"
```

---

## Task 2: Formas circulares e hexagonais

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/shapes.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/shapes.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import type { Path, Vector2 } from 'three'
import {
  circleShape,
  hexagonPath,
} from '@/features/studio/tools/lembrancinhas/termoformador/shapes'

/** `getPoints` repete as junções; remove duplicatas consecutivas e o fechamento. */
function vertices(path: Path): Vector2[] {
  const unique: Vector2[] = []
  for (const point of path.getPoints(1)) {
    const last = unique[unique.length - 1]
    if (!last || last.distanceTo(point) > 1e-6) unique.push(point)
  }
  if (unique.length > 1 && unique[0].distanceTo(unique[unique.length - 1]) <= 1e-6) {
    unique.pop()
  }
  return unique
}

describe('shapes', () => {
  it('círculo amostrado mantém o raio', () => {
    const points = circleShape(10).getPoints(64)
    expect(points.length).toBeGreaterThanOrEqual(32)
    for (const point of points) {
      expect(Math.hypot(point.x, point.y)).toBeCloseTo(10, 3)
    }
  })

  it('hexágono tem seis vértices no raio pedido', () => {
    const points = vertices(hexagonPath(4, -3, 2))
    expect(points).toHaveLength(6)
    for (const point of points) {
      expect(Math.hypot(point.x - 4, point.y + 3)).toBeCloseTo(2, 5)
    }
    const angles = points.map((point) => Math.atan2(point.y + 3, point.x - 4))
    expect(new Set(angles.map((angle) => angle.toFixed(4))).size).toBe(6)
  })

  it('hexágono tem seis lados iguais', () => {
    const path = hexagonPath(0, 0, 2)
    expect(path.curves).toHaveLength(6)
    const points = vertices(path)
    expect(points).toHaveLength(6)
    const sides = points.map((point, index) =>
      point.distanceTo(points[(index + 1) % points.length]),
    )
    for (const side of sides) expect(side).toBeCloseTo(2, 5)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/shapes.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import { Path, Shape } from 'three'

/**
 * Desvio angular mínimo dos favos. Sem ele, vértices de favos vizinhos ficam
 * exatamente colineares e o Earcut (ExtrudeGeometry) deixa os caps abertos.
 * Mesmo motivo do epsilon usado no painel da Caixa Personalizada.
 */
const HEXAGON_ANGLE_EPSILON = 0.001

export function circleShape(radius: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

export function hexagonPath(x: number, y: number, radius: number): Path {
  const path = new Path()

  for (let index = 0; index < 6; index++) {
    const angle = (Math.PI / 3) * index + HEXAGON_ANGLE_EPSILON
    const px = x + radius * Math.cos(angle)
    const py = y + radius * Math.sin(angle)
    if (index === 0) path.moveTo(px, py)
    else path.lineTo(px, py)
  }

  path.closePath()
  return path
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/shapes.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/shapes.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/shapes.test.ts
git commit -m "feat: add circular screen shapes"
```

---

## Task 3: Layout da malha hexagonal

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/screenPattern.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/screenPattern.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
import {
  MAX_SCREEN_OPENINGS,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('computeScreenPattern', () => {
  it('gera favos dentro do raio interno por padrão', () => {
    const pattern = computeScreenPattern(defaultThermoformerParams)
    expect(pattern.cells.length).toBeGreaterThan(0)
    expect(pattern.capped).toBe(false)
    expect(pattern.innerRadius).toBeCloseTo(74, 5)
    expect(pattern.cellRadius).toBeCloseTo(6 / Math.sqrt(3), 5)
    expect(pattern.spacing).toBeCloseTo(8, 5)

    for (const cell of pattern.cells) {
      expect(Math.hypot(cell.x, cell.y) + cell.radius).toBeLessThanOrEqual(
        pattern.innerRadius + 1e-6,
      )
    }
  })

  it('mantém a linha de 2 mm entre favos vizinhos', () => {
    const pattern = computeScreenPattern(defaultThermoformerParams)
    expect(pattern.effectiveLine).toBeCloseTo(2, 5)
    expect(pattern.spacing - pattern.effectiveOpening).toBeCloseTo(2, 5)
  })

  it('não gera favos quando o aro consome o disco', () => {
    const pattern = computeScreenPattern({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 30,
    })
    expect(pattern.innerRadius).toBe(0)
    expect(pattern.cells).toHaveLength(0)
  })

  it('limita a quantidade de favos ampliando a abertura', () => {
    const pattern = computeScreenPattern({
      ...defaultThermoformerParams,
      diameter: 300,
      frameWidth: 2,
      opening: 3,
      lineWidth: 1.2,
    })
    expect(pattern.capped).toBe(true)
    expect(pattern.cells.length).toBeLessThanOrEqual(MAX_SCREEN_OPENINGS)
    expect(pattern.effectiveOpening).toBeGreaterThan(3)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/screenPattern.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import {
  MAX_SCREEN_OPENINGS,
  type ThermoformerGeometryParams,
} from './schema'

export interface ScreenCell {
  x: number
  y: number
  radius: number
}

export interface ScreenPatternResult {
  cells: ScreenCell[]
  columns: number
  rows: number
  capped: boolean
  innerRadius: number
  effectiveOpening: number
  effectiveLine: number
  cellRadius: number
  spacing: number
}

const EPS = 1e-6

export function computeScreenPattern(
  params: ThermoformerGeometryParams,
): ScreenPatternResult {
  const outerRadius = params.diameter / 2
  const innerRadius = outerRadius - params.frameWidth
  const line = Math.max(0, params.lineWidth)

  if (innerRadius <= EPS) {
    return {
      cells: [],
      columns: 0,
      rows: 0,
      capped: false,
      innerRadius: Math.max(0, innerRadius),
      effectiveOpening: params.opening,
      effectiveLine: line,
      cellRadius: 0,
      spacing: 0,
    }
  }

  let effectiveOpening = params.opening
  let capped = false
  let cells: ScreenCell[] = []
  let columns = 0
  let rows = 0
  let cellRadius = 0
  let spacing = 0

  for (let attempt = 0; attempt < 24; attempt++) {
    cellRadius = effectiveOpening / Math.sqrt(3)
    spacing = effectiveOpening + line

    // Treliça flat-top: passo horizontal (√3/2)·spacing e vertical spacing,
    // com colunas ímpares deslocadas meia linha.
    const stepX = (Math.sqrt(3) / 2) * spacing
    const stepY = spacing
    const maxColumn = Math.ceil(innerRadius / stepX) + 2
    const maxRow = Math.ceil(innerRadius / stepY) + 2

    const next: ScreenCell[] = []
    let minColumn = Infinity
    let maxColumnIndex = -Infinity
    let minRow = Infinity
    let maxRowIndex = -Infinity

    for (let column = -maxColumn; column <= maxColumn; column++) {
      const offset = Math.abs(column) % 2 === 1 ? stepY / 2 : 0
      for (let row = -maxRow; row <= maxRow; row++) {
        const x = column * stepX
        const y = row * stepY + offset
        if (Math.hypot(x, y) + cellRadius > innerRadius + EPS) continue
        next.push({ x, y, radius: cellRadius })
        minColumn = Math.min(minColumn, column)
        maxColumnIndex = Math.max(maxColumnIndex, column)
        minRow = Math.min(minRow, row)
        maxRowIndex = Math.max(maxRowIndex, row)
      }
    }

    cells = next
    columns = cells.length > 0 ? maxColumnIndex - minColumn + 1 : 0
    rows = cells.length > 0 ? maxRowIndex - minRow + 1 : 0

    if (cells.length <= MAX_SCREEN_OPENINGS) break

    capped = true
    effectiveOpening *= 1.15
  }

  return {
    cells,
    columns,
    rows,
    capped,
    innerRadius,
    effectiveOpening,
    effectiveLine: line,
    cellRadius,
    spacing,
  }
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/screenPattern.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/screenPattern.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/screenPattern.test.ts
git commit -m "feat: add hexagonal screen pattern"
```

---

## Task 4: Build da tela e spike de malha

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildScreen.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/geometryTestUtils.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildScreen.test.ts`

**Step 1: Criar o utilitário de malha fechada**

```ts
import { Vector3, type BufferGeometry } from 'three'

function normalize(value: number): number {
  return Math.abs(value) < 5e-5 ? 0 : value
}

function positionKey(x: number, y: number, z: number): string {
  return `${normalize(x).toFixed(4)},${normalize(y).toFixed(4)},${normalize(z).toFixed(4)}`
}

/**
 * Considera fechada quando cada aresta aparece exatamente em 2 triângulos e as
 * arestas direcionadas aparecem uma única vez em cada sentido (winding coerente).
 */
export function isClosed(geometry: BufferGeometry): boolean {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const edges = new Map<string, number>()
  const directed = new Map<string, number>()
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
      const direction = `${p}|${q}`
      directed.set(direction, (directed.get(direction) ?? 0) + 1)
    }
  }

  for (const [key, value] of edges) {
    if (value !== 2) return false
    const [a, b] = key.split('|')
    if ((directed.get(`${a}|${b}`) ?? 0) !== 1) return false
    if ((directed.get(`${b}|${a}`) ?? 0) !== 1) return false
  }
  return true
}

/** Volume orientado pelo teorema da divergência; positivo indica winding para fora. */
export function signedVolume(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const count = index ? index.count : position.count
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const cross = new Vector3()
  let volume = 0

  for (let i = 0; i < count; i += 3) {
    const ia = index ? index.getX(i) : i
    const ib = index ? index.getX(i + 1) : i + 1
    const ic = index ? index.getX(i + 2) : i + 2
    a.fromBufferAttribute(position, ia)
    b.fromBufferAttribute(position, ib)
    c.fromBufferAttribute(position, ic)
    volume += a.dot(cross.crossVectors(b, c)) / 6
  }

  return volume
}
```

**Step 2: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { buildScreen } from '@/features/studio/tools/lembrancinhas/termoformador/buildScreen'
import { computeScreenPattern } from '@/features/studio/tools/lembrancinhas/termoformador/screenPattern'
import {
  MAX_SCREEN_OPENINGS,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildScreen', () => {
  it('ocupa o diâmetro, a espessura e fica deitada na mesa', () => {
    const params = defaultThermoformerParams
    const geometry = buildScreen(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-params.diameter / 2, 1)
    expect(box.max.x).toBeCloseTo(params.diameter / 2, 1)
    expect(box.min.z).toBeCloseTo(-params.diameter / 2, 1)
    expect(box.max.z).toBeCloseTo(params.diameter / 2, 1)
    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(params.thickness, 3)
    geometry.dispose()
  })

  it('gera malha fechada e com volume positivo', () => {
    const geometry = buildScreen(defaultThermoformerParams)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('os favos aumentam a contagem de vértices', () => {
    const withCells = buildScreen(defaultThermoformerParams)
    const solid = buildScreen({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 30,
      opening: 30,
    })

    expect(computeScreenPattern(defaultThermoformerParams).cells.length).toBeGreaterThan(0)
    expect(computeScreenPattern({ ...defaultThermoformerParams, diameter: 60, frameWidth: 30 }).cells).toHaveLength(0)
    expect(withCells.getAttribute('position').count)
      .toBeGreaterThan(solid.getAttribute('position').count)

    withCells.dispose()
    solid.dispose()
  })

  it('spike: malha densa (~1.200 favos) permanece fechada', () => {
    const params = {
      ...defaultThermoformerParams,
      diameter: 160,
      frameWidth: 2,
      opening: 3,
      lineWidth: 1.2,
    }
    const pattern = computeScreenPattern(params)
    expect(pattern.cells.length).toBeGreaterThan(1000)
    expect(pattern.cells.length).toBeLessThanOrEqual(MAX_SCREEN_OPENINGS)

    const geometry = buildScreen(params)
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })
})
```

**Step 3: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildScreen.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 4: Implementar**

```ts
import { ExtrudeGeometry, type BufferGeometry } from 'three'
import { circleShape, hexagonPath } from './shapes'
import { computeScreenPattern } from './screenPattern'
import { SCREEN_SEGMENTS, type ThermoformerGeometryParams } from './schema'

export function buildScreen(
  params: ThermoformerGeometryParams,
): BufferGeometry {
  const shape = circleShape(params.diameter / 2)
  const pattern = computeScreenPattern(params)

  for (const cell of pattern.cells) {
    shape.holes.push(hexagonPath(cell.x, cell.y, cell.radius))
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: false,
    curveSegments: SCREEN_SEGMENTS,
  })

  // Deita a tela: o disco passa para o plano XZ e a espessura para +Y.
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()

  return geometry
}
```

**Step 5: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildScreen.test.ts`
Expected: PASS. Observar o tempo do teste de spike — alvo < 1,5 s.

> **Gate do spike:** se `isClosed` falhar, não seguir. Migrar para a malha
> procedural de nervuras descrita no design e retomar daqui.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildScreen.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/geometryTestUtils.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildScreen.test.ts
git commit -m "feat: build circular hexagonal screen"
```

---

## Task 5: Validação do domínio

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/validateScreen.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/validateScreen.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { validateScreen } from '@/features/studio/tools/lembrancinhas/termoformador/validateScreen'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'

describe('validateScreen', () => {
  it('não aponta problemas nos defaults', () => {
    expect(validateScreen(defaultThermoformerParams)).toHaveLength(0)
  })

  it('aponta aro que consome o disco', () => {
    const issues = validateScreen({ ...defaultThermoformerParams, diameter: 60, frameWidth: 30 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-frame', severity: 'error' }))
  })

  it('aponta ausência de favos', () => {
    const issues = validateScreen({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 29.5,
      opening: 3,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-empty' }))
  })

  it('aponta abertura maior que o raio interno', () => {
    const issues = validateScreen({
      ...defaultThermoformerParams,
      diameter: 60,
      frameWidth: 20,
      opening: 12,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-opening' }))
  })

  it('aponta o limite de favos com a abertura efetiva', () => {
    const issues = validateScreen({
      ...defaultThermoformerParams,
      diameter: 300,
      frameWidth: 2,
      opening: 3,
      lineWidth: 1.2,
    })
    const density = issues.find((issue) => issue.code === 'screen-density')
    expect(density).toBeDefined()
    expect(density!.message).toMatch(/4000/)
  })

  it('aponta linha abaixo do mínimo (defensivo)', () => {
    const issues = validateScreen({ ...defaultThermoformerParams, lineWidth: 0.5 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'screen-line', severity: 'warning' }))
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/validateScreen.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import { computeScreenPattern } from './screenPattern'
import {
  MAX_SCREEN_OPENINGS,
  MINIMUM_FEATURE_MM,
  type ThermoformerGeometryParams,
} from './schema'

export type IssueSeverity = 'error' | 'warning'

export type ScreenIssueCode =
  | 'screen-frame'
  | 'screen-empty'
  | 'screen-density'
  | 'screen-opening'
  | 'screen-line'

export interface ValidationIssue {
  code: ScreenIssueCode
  severity: IssueSeverity
  message: string
}

export function validateScreen(
  params: ThermoformerGeometryParams,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const outerRadius = params.diameter / 2
  const pattern = computeScreenPattern(params)

  if (params.frameWidth >= outerRadius) {
    issues.push({
      code: 'screen-frame',
      severity: 'error',
      message: 'O aro consome todo o diâmetro da tela. Reduza o aro ou aumente o diâmetro.',
    })
    return issues
  }

  if (pattern.cells.length === 0) {
    issues.push({
      code: 'screen-empty',
      severity: 'warning',
      message: 'Nenhum favo cabe na área interna com a abertura atual. Reduza a abertura ou o aro.',
    })
  } else if (params.opening >= pattern.innerRadius) {
    issues.push({
      code: 'screen-opening',
      severity: 'warning',
      message: 'A abertura do favo é maior que o raio interno da tela.',
    })
  }

  if (pattern.capped) {
    issues.push({
      code: 'screen-density',
      severity: 'warning',
      message: `A malha foi limitada a ${MAX_SCREEN_OPENINGS} favos; a abertura efetiva é ${pattern.effectiveOpening.toFixed(1)} mm.`,
    })
  }

  // Guarda defensiva para chamadores diretos fora dos intervalos do Zod; a UI não alcança este caso.
  if (params.lineWidth < MINIMUM_FEATURE_MM) {
    issues.push({
      code: 'screen-line',
      severity: 'warning',
      message: `A linha efetiva fica abaixo de ${MINIMUM_FEATURE_MM} mm.`,
    })
  }

  return issues
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/validateScreen.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/validateScreen.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/validateScreen.test.ts
git commit -m "feat: validate thermoformer screen"
```

---

## Task 6: Serialização e Web Worker

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/workerGeometry.ts`
- Create: `src/features/studio/tools/lembrancinhas/termoformador/workerClient.ts`
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildScreen.worker.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { BoxGeometry } from 'three'
import {
  deserializeGeometry,
  serializeGeometry,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'

describe('workerGeometry', () => {
  it('faz round-trip de position, normal e index', () => {
    const geometry = new BoxGeometry(10, 2, 6)
    const { data, transfer } = serializeGeometry(geometry)

    expect(data.position.length).toBeGreaterThan(0)
    expect(data.normal.length).toBe(data.position.length)
    expect(data.index).not.toBeNull()
    expect(transfer.length).toBeGreaterThanOrEqual(2)

    const restored = deserializeGeometry(data)
    restored.computeBoundingBox()
    expect(restored.boundingBox!.min.x).toBeCloseTo(-5, 5)
    expect(restored.boundingBox!.max.z).toBeCloseTo(3, 5)
    expect(restored.getAttribute('position').count).toBe(
      geometry.getAttribute('position').count,
    )

    geometry.dispose()
    restored.dispose()
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar a serialização**

```ts
import { BufferAttribute, BufferGeometry } from 'three'

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array | null
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
```

**Step 4: Implementar o cliente do worker**

```ts
import type { ThermoformerGeometryParams } from './schema'
import type { SerializedGeometry } from './workerGeometry'

export interface ScreenWorker {
  build(
    params: ThermoformerGeometryParams,
    onResult: (data: SerializedGeometry) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

export function createScreenWorker(): ScreenWorker {
  const worker = new Worker(
    new URL('./buildScreen.worker.ts', import.meta.url),
    { type: 'module' },
  )

  return {
    build(params, onResult, onError) {
      worker.onmessage = (event: MessageEvent<{ id: number; data: SerializedGeometry }>) => {
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

**Step 5: Implementar o worker**

```ts
import { buildScreen } from './buildScreen'
import { serializeGeometry } from './workerGeometry'
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
  const { data, transfer } = serializeGeometry(buildScreen(params))
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
  src/features/studio/tools/lembrancinhas/termoformador/buildScreen.worker.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts
git commit -m "feat: add thermoformer screen worker"
```

---

## Task 7: Hook de estado

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
  serializeGeometry,
  type SerializedGeometry,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
import type { ScreenWorker } from '@/features/studio/tools/lembrancinhas/termoformador/workerClient'

function serializedScreen(): SerializedGeometry {
  return serializeGeometry(new BoxGeometry(160, 3, 160)).data
}

function makeWorkerFixture() {
  let lastParams: ThermoformerGeometryParams | null = null
  let calls = 0
  const pendings: Array<(data: SerializedGeometry) => void> = []
  const failures: Array<() => void> = []
  const terminate = vi.fn()
  const factory = (): ScreenWorker => {
    calls++
    return {
      build: (params, onResult, onError) => {
        lastParams = params
        pendings.push(onResult)
        failures.push(onError ?? (() => undefined))
      },
      terminate,
    }
  }
  return {
    factory,
    terminate,
    getCalls: () => calls,
    respond: () => pendings[pendings.length - 1]?.(serializedScreen()),
    fail: () => failures[failures.length - 1]?.(),
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
    expect(result.current.issues).toHaveLength(0)
  })

  it('faz clamp dos campos numéricos', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))
    act(() => {
      result.current.updateParam('diameter', 999)
      result.current.updateParam('thickness', 0.1)
      result.current.updateParam('lineWidth', 9)
      result.current.updateParam('opening', 1)
    })
    expect(result.current.params.diameter).toBe(300)
    expect(result.current.params.thickness).toBe(1.2)
    expect(result.current.params.lineWidth).toBe(4)
    expect(result.current.params.opening).toBe(3)
  })

  it('envia ao worker após o debounce e aplica a geometria', () => {
    const { factory, respond, getParams } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    expect(result.current.isBuilding).toBe(true)
    expect(getParams()).toEqual({
      productType: 'termoformador',
      diameter: 160,
      thickness: 3,
      frameWidth: 6,
      lineWidth: 2,
      opening: 6,
    })

    act(() => { respond() })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.dimensions).toEqual({ width: 160, height: 160, thickness: 3 })
    expect(result.current.fitRadius).toBeGreaterThan(0)
  })

  it('não rebuilda ao trocar apenas a cor', () => {
    const { factory, respond, getCalls } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    const calls = getCalls()

    act(() => { result.current.updateParam('color', '#ef4444') })
    act(() => { vi.advanceTimersByTime(260) })

    expect(result.current.params.color).toBe('#ef4444')
    expect(getCalls()).toBe(calls)
  })

  it('mantém a geometria anterior quando o novo build falha', () => {
    const { factory, respond, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })
    expect(result.current.geometry).not.toBeNull()

    act(() => { result.current.updateParam('diameter', 200) })
    act(() => { vi.advanceTimersByTime(260) })
    act(() => { fail() })

    expect(result.current.geometry).not.toBeNull()
    expect(result.current.error).toBe('Falha ao gerar a geometria')
    expect(result.current.isBuilding).toBe(false)
  })

  it('expõe as issues da validação', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => {
      result.current.updateParam('diameter', 60)
      result.current.updateParam('frameWidth', 30)
    })

    expect(result.current.issues).toContainEqual(
      expect.objectContaining({ code: 'screen-frame', severity: 'error' }),
    )
  })

  it('restaura os padrões', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { result.current.updateParam('diameter', 250) })
    act(() => { result.current.reset() })

    expect(result.current.params).toEqual(defaultThermoformerParams)
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
import { Box3, Vector3, type BufferGeometry } from 'three'
import {
  defaultThermoformerParams,
  thermoformerParamsSchema,
  type ThermoformerGeometryParams,
  type ThermoformerParams,
} from './schema'
import { validateScreen, type ValidationIssue } from './validateScreen'
import { deserializeGeometry, type SerializedGeometry } from './workerGeometry'
import { createScreenWorker, type ScreenWorker } from './workerClient'

type ThermoformerAction =
  | { type: 'update'; key: keyof ThermoformerParams; value: number | string }
  | { type: 'reset' }

const NUMERIC_RANGES: Partial<Record<keyof ThermoformerParams, { min: number; max: number }>> = {
  diameter: { min: 60, max: 300 },
  thickness: { min: 1.2, max: 6 },
  frameWidth: { min: 2, max: 30 },
  lineWidth: { min: 1.2, max: 4 },
  opening: { min: 3, max: 30 },
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
  workerFactory?: () => ScreenWorker
}

export interface UseThermoformerResult {
  params: ThermoformerParams
  geometry: BufferGeometry | null
  isBuilding: boolean
  error: string | null
  issues: ValidationIssue[]
  dimensions: { width: number; height: number; thickness: number }
  cameraPosition: [number, number, number]
  fitRadius: number
  updateParam: (key: keyof ThermoformerParams, value: number | string) => void
  reset: () => void
}

export function useThermoformer(
  options: UseThermoformerOptions = {},
): UseThermoformerResult {
  const workerFactory = options.workerFactory ?? createScreenWorker
  const workerFactoryRef = useRef(workerFactory)
  workerFactoryRef.current = workerFactory
  const [params, dispatch] = useReducer(thermoformerReducer, defaultThermoformerParams)
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const workerRef = useRef<ScreenWorker | null>(null)

  const {
    productType,
    diameter,
    thickness,
    frameWidth,
    lineWidth,
    opening,
  } = params

  const buildParams = useMemo<ThermoformerGeometryParams>(() => ({
    productType,
    diameter,
    thickness,
    frameWidth,
    lineWidth,
    opening,
  }), [productType, diameter, thickness, frameWidth, lineWidth, opening])

  useEffect(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setError(null)
      try {
        const worker = workerFactoryRef.current()
        workerRef.current = worker
        setIsBuilding(true)

        worker.build(buildParams, (data: SerializedGeometry) => {
          if (workerRef.current !== worker) return
          setGeometry(deserializeGeometry(data))
          setIsBuilding(false)
        }, () => {
          if (workerRef.current !== worker) return
          setIsBuilding(false)
          setError('Falha ao gerar a geometria')
        })
      } catch {
        setIsBuilding(false)
        setError('Falha ao gerar a geometria')
      }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [buildParams])

  useEffect(() => () => {
    geometry?.dispose()
  }, [geometry])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const issues = useMemo(
    () => validateScreen(buildParams),
    [buildParams],
  )

  const fallbackDimensions = useMemo(() => ({
    width: Number(diameter.toFixed(1)),
    height: Number(diameter.toFixed(1)),
    thickness: Number(thickness.toFixed(1)),
  }), [diameter, thickness])

  const bounds = useMemo(() => {
    if (!geometry) return null
    geometry.computeBoundingBox()
    const box = new Box3()
    if (geometry.boundingBox) box.union(geometry.boundingBox)
    return box.getSize(new Vector3())
  }, [geometry])

  const dimensions = useMemo(() => {
    if (!bounds) return fallbackDimensions
    return {
      width: Number(bounds.x.toFixed(1)),
      height: Number(bounds.z.toFixed(1)),
      thickness: Number(bounds.y.toFixed(1)),
    }
  }, [bounds, fallbackDimensions])

  const fitRadius = useMemo(() => {
    if (!bounds) {
      return Math.max(
        1,
        0.5 * Math.hypot(
          fallbackDimensions.width,
          fallbackDimensions.thickness,
          fallbackDimensions.height,
        ),
      )
    }
    return Math.max(1, 0.5 * Math.hypot(bounds.x, bounds.y, bounds.z))
  }, [bounds, fallbackDimensions])

  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = fitRadius * 2.2
    const elevation = (25 * Math.PI) / 180
    const azimuth = (30 * Math.PI) / 180
    return [
      Number((distance * Math.sin(azimuth) * Math.cos(elevation)).toFixed(1)),
      Number((distance * Math.sin(elevation)).toFixed(1)),
      Number((distance * Math.cos(azimuth) * Math.cos(elevation)).toFixed(1)),
    ]
  }, [fitRadius])

  const updateParam = useCallback(
    (key: keyof ThermoformerParams, value: number | string) => {
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
git commit -m "feat: add thermoformer screen state"
```

---

## Task 8: Export STL

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BoxGeometry, type BufferGeometry } from 'three'
import {
  exportThermoformerStl,
  prepareScreenForPrint,
} from '@/features/studio/tools/lembrancinhas/termoformador/exportStl'

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse = vi.fn(() => new ArrayBuffer(84))
  },
}))

const originalCreateObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL')
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL')

type Anchor = {
  click: ReturnType<typeof vi.fn>
  href: string
  download: string
}

let restoreElementSpies: (() => void) | null = null

function setupDownloadMocks() {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, writable: true })
  Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true })

  const anchors: Anchor[] = []
  const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => {
    const anchor = { click: vi.fn(), href: '', download: '' }
    anchors.push(anchor)
    return anchor as never
  })
  const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as never)
  const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as never)
  restoreElementSpies = () => {
    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  }
  return { anchors, createObjectURL, revokeObjectURL }
}

function restoreUrlDescriptors(): void {
  if (originalCreateObjectURL) {
    Object.defineProperty(window.URL, 'createObjectURL', originalCreateObjectURL)
  } else {
    Reflect.deleteProperty(window.URL, 'createObjectURL')
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(window.URL, 'revokeObjectURL', originalRevokeObjectURL)
  } else {
    Reflect.deleteProperty(window.URL, 'revokeObjectURL')
  }
}

function positions(geometry: BufferGeometry): Float32Array {
  return Float32Array.from(geometry.getAttribute('position').array)
}

afterEach(() => {
  restoreElementSpies?.()
  restoreElementSpies = null
  restoreUrlDescriptors()
})

describe('exportThermoformerStl', () => {
  it('baixa um único STL com o nome do projeto', () => {
    const { anchors, revokeObjectURL } = setupDownloadMocks()
    const geometry = new BoxGeometry(160, 3, 160)

    exportThermoformerStl(geometry, 'Minha Tela!')

    expect(anchors).toHaveLength(1)
    expect(anchors[0].download).toBe('Minha-Tela-tela.stl')
    expect(anchors[0].href).toBe('blob:mock-url')
    expect(anchors[0].click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
  })

  it('usa o nome padrão quando o projeto está vazio', () => {
    const { anchors } = setupDownloadMocks()
    exportThermoformerStl(new BoxGeometry(160, 3, 160), '')
    expect(anchors[0].download).toBe('termoformador-tela.stl')
  })
})

describe('prepareScreenForPrint', () => {
  it('centraliza na mesa sem mutar o original', () => {
    const geometry = new BoxGeometry(160, 3, 160)
    geometry.translate(20, 11, -35)
    const original = positions(geometry)

    const print = prepareScreenForPrint(geometry)
    print.computeBoundingBox()

    expect(print.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(print.boundingBox!.min.x).toBeCloseTo(-80, 3)
    expect(print.boundingBox!.max.x).toBeCloseTo(80, 3)
    expect(print.boundingBox!.min.z).toBeCloseTo(-80, 3)
    expect(Array.from(geometry.getAttribute('position').array)).toEqual(Array.from(original))

    geometry.dispose()
    print.dispose()
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
import { sanitizeFilename } from './schema'

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

/**
 * Serializa a geometria como STL binário e dispara o download.
 *
 * Consome a geometria recebida: ela é descartada antes do retorno, então o
 * chamador deve passar um clone descartável.
 */
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

export function prepareScreenForPrint(
  geometry: BufferGeometry,
): BufferGeometry {
  return centerOnBed(geometry.clone())
}

export function exportThermoformerStl(
  geometry: BufferGeometry,
  projectName: string,
): void {
  const name = sanitizeFilename(projectName)
  downloadStl(prepareScreenForPrint(geometry), `${name}-tela.stl`)
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts
git commit -m "feat: export thermoformer screen stl"
```

---

## Task 9: Painel de parâmetros

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`

**Step 1: Escrever o teste que falha**

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
    expect(screen.getByText('Tela')).toBeDefined()
    expect(screen.getByText('Malha')).toBeDefined()
    expect(screen.getByText('Aparência')).toBeDefined()
    expect(screen.getByText('Validação')).toBeDefined()
  })

  it('expõe nome acessível nos sliders', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByRole('slider', { name: 'Diâmetro' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Espessura' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Abertura do favo' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Espessura da linha' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Largura do aro' })).toBeDefined()
  })

  it('atualiza o diâmetro ao usar o teclado no slider', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Diâmetro' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenCalledWith('diameter', 165)
  })

  it('atualiza a espessura da linha', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Espessura da linha' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenCalledWith('lineWidth', 2.2)
  })

  it('troca a cor PLA', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.click(screen.getByLabelText('#ef4444'))
    expect(onUpdateParam).toHaveBeenCalledWith('color', '#ef4444')
  })

  it('restaura os padrões', () => {
    const onReset = vi.fn()
    render(<StudioPanel {...defaultProps} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('lista as issues de validação', () => {
    render(
      <StudioPanel
        {...defaultProps}
        issues={[
          {
            code: 'screen-frame',
            severity: 'error',
            message: 'O aro consome todo o diâmetro da tela.',
          },
        ]}
      />,
    )
    expect(screen.getByText('O aro consome todo o diâmetro da tela.')).toBeDefined()
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```tsx
import {
  Accordion,
  Alert,
  Button,
  Flex,
  Heading,
  SliderField,
  Text,
  View,
} from '@aws-amplify/ui-react'
import { PLA_COLORS, type ThermoformerParams } from './schema'
import type { ValidationIssue } from './validateScreen'

interface StudioPanelProps {
  params: ThermoformerParams
  issues: ValidationIssue[]
  onUpdateParam: (key: keyof ThermoformerParams, value: number | string) => void
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
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  const display = step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value

  return (
    <>
      <Flex direction="row" justifyContent="space-between">
        <Text fontSize="xs" color="font.tertiary">{label}</Text>
        <Text fontSize="xs" color="font.secondary">{display} mm</Text>
      </Flex>
      <SliderField
        label={label}
        labelHidden
        isValueHidden
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
        <Accordion.Item value="tela">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Tela</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Diâmetro" value={params.diameter} min={60} max={300} step={5} onChange={(value) => onUpdateParam('diameter', value)} />
              <LabeledSlider label="Espessura" value={params.thickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('thickness', value)} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="malha">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Malha</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Abertura do favo" value={params.opening} min={3} max={30} step={0.5} onChange={(value) => onUpdateParam('opening', value)} />
              <LabeledSlider label="Espessura da linha" value={params.lineWidth} min={1.2} max={4} step={0.2} onChange={(value) => onUpdateParam('lineWidth', value)} />
              <LabeledSlider label="Largura do aro" value={params.frameWidth} min={2} max={30} step={1} onChange={(value) => onUpdateParam('frameWidth', value)} />
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
              <Text fontSize="xs" color="font.tertiary">Cor da tela</Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.color}
                onSelect={(color) => onUpdateParam('color', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="validacao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Validação</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            {issues.length === 0 ? (
              <Text fontSize="xs" color="font.tertiary">
                Nenhum problema encontrado.
              </Text>
            ) : (
              <Flex direction="column" gap="xs">
                {issues.map((issue) => (
                  <Alert
                    key={issue.code}
                    variation={issue.severity === 'error' ? 'error' : 'warning'}
                  >
                    {issue.message}
                  </Alert>
                ))}
              </Flex>
            )}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx
git commit -m "feat: add thermoformer screen panel"
```

---

## Task 10: Preview R3F

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.test.tsx`

**Step 1: Escrever o teste que falha**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ScreenPreview } from '@/features/studio/tools/lembrancinhas/termoformador/ScreenPreview'

describe('ScreenPreview', () => {
  it('não renderiza nada sem geometria', () => {
    const { container } = render(
      <ScreenPreview geometry={null} color="#14b8a6" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.test.tsx`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```tsx
import type { BufferGeometry } from 'three'

interface ScreenPreviewProps {
  geometry: BufferGeometry | null
  color: string
}

export function ScreenPreview({ geometry, color }: ScreenPreviewProps) {
  if (!geometry) return null

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} metalness={0.1} roughness={0.4} />
    </mesh>
  )
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.test.tsx
git commit -m "feat: add thermoformer screen preview"
```

---

## Task 11: Integração no seletor e na página

**Files:**
- Modify: `src/features/studio/components/ToolSelector.tsx:3-95`
- Modify: `src/features/studio/StudioPage.tsx:153-163,1065-1152,1204-1210`
- Test: `tests/features/studio/components/ToolSelector.test.tsx:16-26,44-54`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Atualizar o teste do seletor**

Em `ToolSelector.test.tsx`:

- No teste "agrupa as ferramentas nas categorias corretas", trocar a expectativa de Lembrancinhas de `1` para `2`.
- Adicionar:

```tsx
  it('coloca Termoformador na seção Lembrancinhas e emite o id', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<ToolSelector onSelect={onSelect} />)
    const section = screen.getByRole('heading', { name: 'Lembrancinhas' }).closest('section')!
    const card = within(section).getByRole('button', { name: /termoformador/i })
    expect(card).toHaveTextContent('Tela circular perfurada')
    await user.click(card)
    expect(onSelect).toHaveBeenCalledWith('termoformador')
  })
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/components/ToolSelector.test.tsx`
Expected: FAIL porque o card Termoformador ainda não existe e a contagem continua 1.

**Step 3: Implementar o seletor**

Em `ToolSelector.tsx`:

- Adicionar `'termoformador'` ao union `ToolId`.
- Adicionar ao array `TOOLS`, depois da caixa:

```ts
  {
    id: 'termoformador',
    name: 'Termoformador',
    description: 'Tela circular perfurada com malha hexagonal e aro sólido',
    icon: '⬡',
    category: 'Lembrancinhas',
  },
```

**Step 4: Rodar e confirmar o sucesso do seletor**

Run: `npm run test -- tests/features/studio/components/ToolSelector.test.tsx`
Expected: PASS.

**Step 5: Atualizar o teste da página**

Em `StudioPage.test.tsx`:

- Importar o painel eagerly e o export:

```ts
import '@/features/studio/tools/lembrancinhas/termoformador/StudioPanel'
import { exportThermoformerStl } from '@/features/studio/tools/lembrancinhas/termoformador/exportStl'
import {
  serializeGeometry as serializeScreen,
  type SerializedGeometry as SerializedScreen,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
```

- Declarar `let screenWorkerResponse: SerializedScreen | null = null`.
- No `WorkerMock.postMessage`, adicionar:

```ts
    if (request.params?.productType === 'termoformador' && screenWorkerResponse) deliver(screenWorkerResponse)
```

- Mockar o export:

```ts
vi.mock('@/features/studio/tools/lembrancinhas/termoformador/exportStl', () => ({
  exportThermoformerStl: vi.fn(),
}))
```

- No `beforeEach`, resetar `screenWorkerResponse = null` e `vi.mocked(exportThermoformerStl).mockClear()`.
- Adicionar os testes:

```tsx
  it('abre a ferramenta Termoformador', async () => {
    renderStudioPage()
    fireEvent.click(screen.getByRole('button', { name: /termoformador/i }))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Termoformador' }, LAZY_TIMEOUT),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Tela' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Malha' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /visualização 3d do modelo/i })).toBeInTheDocument()
  })

  it('mostra Gerando… no Termoformador', async () => {
    renderStudioPage()
    fireEvent.click(screen.getByRole('button', { name: /termoformador/i }))
    const status = await screen.findByRole('status', {}, LAZY_TIMEOUT)
    expect(status).toHaveTextContent('Gerando…')
    expect(screen.getByTestId('canvas-mock').closest('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('exporta a tela do Termoformador', async () => {
    screenWorkerResponse = serializeScreen(new THREE.BoxGeometry(160, 3, 160)).data

    renderStudioPage()
    fireEvent.click(screen.getByRole('button', { name: /termoformador/i }))

    const exportButton = screen.getByRole('button', { name: 'Exportar STL' })
    await waitFor(() => expect(exportButton).toBeEnabled())
    fireEvent.click(exportButton)

    expect(exportThermoformerStl).toHaveBeenCalledWith(
      expect.anything(),
      'Projeto sem título',
    )
  })

  it('mostra erro quando a exportação do Termoformador falha', async () => {
    screenWorkerResponse = serializeScreen(new THREE.BoxGeometry(160, 3, 160)).data
    vi.mocked(exportThermoformerStl).mockImplementationOnce(() => {
      throw new Error('falha')
    })

    renderStudioPage()
    fireEvent.click(screen.getByRole('button', { name: /termoformador/i }))

    const exportButton = screen.getByRole('button', { name: 'Exportar STL' })
    await waitFor(() => expect(exportButton).toBeEnabled())
    fireEvent.click(exportButton)

    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao exportar STL')
  })
```

**Step 6: Rodar e confirmar a falha dos testes da página**

Run: `npm run test -- tests/features/studio/StudioPage.test.tsx`
Expected: FAIL porque o wrapper e os lazy imports ainda não existem.

**Step 7: Implementar a página**

Em `StudioPage.tsx`, adicionar os imports:

```ts
import { useThermoformer } from './tools/lembrancinhas/termoformador/useThermoformer'
import { exportThermoformerStl } from './tools/lembrancinhas/termoformador/exportStl'
```

Adicionar os lazy imports:

```ts
const ThermoformerTool = lazy(() =>
  import('./tools/lembrancinhas/termoformador/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const ScreenPreview = lazy(() =>
  import('./tools/lembrancinhas/termoformador/ScreenPreview').then((m) => ({
    default: m.ScreenPreview,
  })),
)
```

Adicionar o wrapper depois de `BoxToolWrapper`:

```tsx
function ThermoformerToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)
  const [exportError, setExportError] = useState<string | null>(null)

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
    setExportError(null)
    try {
      exportThermoformerStl(geometry, projectName)
    } catch {
      setExportError('Falha ao exportar STL')
    }
  }, [geometry, projectName])

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
        {error ?? exportError ? (
          <div
            role="alert"
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-red-200 bg-white/95 px-3 py-1 text-xs text-red-600 shadow-sm"
          >
            {error ?? exportError}
          </div>
        ) : isBuilding ? (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-neutral-200 bg-white/90 px-3 py-1 text-xs text-neutral-600 shadow-sm"
          >
            Gerando…
          </div>
        ) : null}
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <ThermoformerTool
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
            <ScreenPreview geometry={geometry} color={params.color} />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}
```

Adicionar a renderização no seletor de ferramentas:

```tsx
      {activeTool === 'termoformador' && (
        <ThermoformerToolWrapper onBack={() => setActiveTool(null)} />
      )}
```

**Step 8: Rodar e confirmar o sucesso da página**

Run: `npm run test -- tests/features/studio/StudioPage.test.tsx`
Expected: PASS.

**Step 9: Commit**

```bash
git add src/features/studio/components/ToolSelector.tsx \
  src/features/studio/StudioPage.tsx \
  tests/features/studio/components/ToolSelector.test.tsx \
  tests/features/studio/StudioPage.test.tsx
git commit -m "feat: add termoformador tool"
```

---

## Task 12: Documentação e verificação final

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md`
- Modify: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Step 1: Atualizar o AGENTS.md da ferramenta**

Substituir o conteúdo por:

```md
# Ferramenta: Termoformador

## Status

Implementada (v1: tela circular).

## Objetivo

Gerar a tela circular do termoformador: um disco plano com aro sólido e malha
hexagonal vazada. Corpo, tampa, pino lateral e base ficam para versões
seguintes.

## Parâmetros

| Parâmetro | Faixa | Default |
|---|---|---|
| `diameter` | 60–300 mm | 160 |
| `thickness` | 1,2–6 mm | 3 |
| `frameWidth` | 2–30 mm | 6 |
| `lineWidth` | 1,2–4 mm | 2 |
| `opening` | 3–30 mm | 6 |
| `color` | 10 cores PLA | `#14b8a6` |

## Regras do domínio

- 1 unidade Three.js = 1 mm
- Tela plana, espessura constante e aro sólido de `frameWidth`
- Malha hexagonal flat-top: passo `opening + lineWidth` e circunraio
  `opening / √3`
- Só entram favos totalmente dentro de `diameter/2 - frameWidth`; a borda
  sólida efetiva pode chegar a `frameWidth + circunraio`
- Limite de 4.000 favos; acima disso a abertura cresce 15% por iteração
- Malha sempre fechada, manifold e sem favos fora do aro
- Sem CSG

## Pipeline

```text
Parâmetros
  → schema + validação
  → layout hexagonal
  → Shape circular + Paths hexagonais
  → ExtrudeGeometry + rotação para deitar
  → worker + serialização
  → preview / export STL
```

## Exportação

- Um STL binário: `<nome>-tela.stl`
- A peça sai deitada e centralizada na mesa

## Validação

- `screen-frame`: aro consome o disco
- `screen-empty`: nenhum favo cabe
- `screen-density`: limite de favos atingido
- `screen-opening`: abertura maior que o raio interno
- `screen-line`: linha abaixo de 0,8 mm (defensivo)

## Decisões da v1

- `ExtrudeGeometry` com furos hexagonais nativos, validado por spike com ~1.200
  favos antes de seguir.
- Favos parciais descartados; sem CSG.
- Cor não rebuilda geometria.
- Serialização local de uma peça, independente da Caixa.

## Fora de escopo

Corpo, tampa, pino lateral, base, curvatura, 3MF/STEP e outros formatos.
```

**Step 2: Atualizar a categoria Lembrancinhas**

Em `lembrancinhas/AGENTS.md`, trocar a linha da tabela para:

```md
| termoformador | implementada (v1: tela) |
```

**Step 3: Atualizar o Studio 3D**

Em `docs/frontend/studio.md`:

- Adicionar **Termoformador** à lista de ferramentas.
- Adicionar a seção de edição com os arquivos da tela.
- Adicionar uma seção "Termoformador (tela)" com pipeline e decisões.
- Substituir a nota "O Termoformador é uma ferramenta planejada..." pela
  descrição da v1 implementada.

**Step 4: Verificação completa**

Run, em sequência:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected: todos passam sem erros e sem warnings.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md \
  src/features/studio/tools/lembrancinhas/AGENTS.md \
  docs/frontend/studio.md
git commit -m "docs: document termoformador screen"
```

---

## Critérios de conclusão

- Card **Termoformador** na categoria Lembrancinhas.
- Tela circular com aro sólido e malha hexagonal de linha 2 mm.
- Sliders atualizam a geometria com debounce e build em worker.
- Validação lista as issues sem bloquear.
- Export baixa `<nome>-tela.stl`, fechado e manifold.
- `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` passam.
- Documentação da v1 atualizada.
