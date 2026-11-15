# Termoformador — Suporte côncavo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar ao Termoformador um suporte circular côncavo, com rebaixo e degrau, que encaixa a tela nivelada, gerando e exportando as duas peças.

**Architecture:** A tela continua em `buildScreen`; o suporte novo é um perfil 2D fechado revolvido com `LatheGeometry`, com remoção de triângulos degenerados no eixo. `buildThermoformer` orquestra `{ screen, support, seatY }`; o worker serializa as duas geometrias, o hook expõe ambas e o export baixa dois STLs.

**Tech Stack:** React 19, TypeScript strict, Three.js, React Three Fiber, Zod, Amplify UI, Vitest, TailwindCSS 4.

**Design de referência:** `docs/plans/2026-11-14-termoformador-suporte-design.md`

---

## Pré-requisitos e convenções

- Trabalhar em worktree dedicado (`feat/termoformador-suporte`) a partir de `main`.
- 1 unidade Three.js = 1 mm.
- Não usar `any`; tipar retornos.
- Testes em `tests/features/studio/tools/lembrancinhas/termoformador/`.
- Rodar o teste específico antes de cada commit.
- Commits semânticos `feat:`, `fix:`, `refactor:`, `docs:`, `test:`.
- A tela atual continua sendo gerada por `buildScreen`; os testes existentes da tela não devem ser reescritos sem necessidade.

### Spike de geometria do suporte

O perfil já foi validado em protótipo com os defaults:

- bbox 168,6 × 27 × 168,6 mm;
- 9.728 triângulos após remover os degenerados;
- malha fechada (0 arestas de borda) e volume positivo (~359.431 mm³).

Se o teste de `buildSupport` falhar em manifold, **parar** e migrar para o loft de anéis descrito no design antes de seguir.

---

## Task 1: Parâmetros e defaults do suporte

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/schema.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts`

**Step 1: Atualizar o teste que falha**

Adicionar ao teste de defaults:

```ts
    expect(defaultThermoformerParams).toMatchObject({
      productType: 'termoformador',
      diameter: 160,
      thickness: 3,
      frameWidth: 6,
      lineWidth: 0.4,
      opening: 6,
      wallThickness: 4,
      bottomThickness: 4,
      bowlDepth: 20,
      stepWidth: 5,
      fitClearance: 0.3,
      edgeChamfer: 0.6,
    })
```

Adicionar um teste de faixas do suporte:

```ts
  it('rejeita parâmetros do suporte fora da faixa', () => {
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, wallThickness: 1.9 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, bottomThickness: 11 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, bowlDepth: 61 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, stepWidth: 16 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, fitClearance: 0.7 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, edgeChamfer: 4 }).success).toBe(false)
  })
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts`
Expected: FAIL nos novos campos ausentes.

**Step 3: Implementar no schema**

Adicionar a constante:

```ts
export const MINIMUM_SUPPORT_MM = 0.8
```

Adicionar ao `thermoformerParamsSchema`, depois de `opening`:

```ts
  wallThickness: z.number().min(2).max(10),
  bottomThickness: z.number().min(2).max(10),
  bowlDepth: z.number().min(5).max(60),
  stepWidth: z.number().min(2).max(15),
  fitClearance: z.number().min(0.1).max(0.6),
  edgeChamfer: z.number().min(0).max(3),
```

Adicionar aos defaults:

```ts
  wallThickness: 4,
  bottomThickness: 4,
  bowlDepth: 20,
  stepWidth: 5,
  fitClearance: 0.3,
  edgeChamfer: 0.6,
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/schema.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts
git commit -m "feat: add thermoformer support params"
```

---

## Task 2: Dimensões, perfil e build do suporte

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import {
  buildSupport,
  buildSupportProfile,
  getSupportDimensions,
} from '@/features/studio/tools/lembrancinhas/termoformador/buildSupport'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('getSupportDimensions', () => {
  it('deriva o rebaixo, a altura e a bacia a partir da tela', () => {
    const dims = getSupportDimensions(defaultThermoformerParams)

    expect(dims.recessRadius).toBeCloseTo(80.3, 5)
    expect(dims.outerRadius).toBeCloseTo(84.3, 5)
    expect(dims.height).toBeCloseTo(27, 5)
    expect(dims.seatY).toBeCloseTo(24, 5)
    expect(dims.cavityTopRadius).toBeCloseTo(75.3, 5)
    expect(dims.ledgeOverlap).toBeCloseTo(4.7, 5)
    expect(dims.sphereRadius).toBeCloseTo(151.75, 2)
  })

  it('mantém folga radial entre a tela e o rebaixo', () => {
    const dims = getSupportDimensions(defaultThermoformerParams)
    expect(dims.recessRadius - defaultThermoformerParams.diameter / 2)
      .toBeCloseTo(defaultThermoformerParams.fitClearance, 5)
  })
})

describe('buildSupportProfile', () => {
  it('começa no eixo, passa pelo aro e termina no fundo da cavidade', () => {
    const profile = buildSupportProfile(defaultThermoformerParams)

    expect(profile[0].x).toBeCloseTo(0, 5)
    expect(profile[0].y).toBeCloseTo(0, 5)
    expect(profile[profile.length - 1].x).toBeCloseTo(0, 5)
    expect(profile[profile.length - 1].y).toBeCloseTo(4, 5)

    const hasPoint = (x: number, y: number) =>
      profile.some((point) => Math.abs(point.x - x) < 1e-6 && Math.abs(point.y - y) < 1e-6)

    expect(hasPoint(84.3, 27)).toBe(true)
    expect(hasPoint(80.3, 27)).toBe(true)
    expect(hasPoint(80.3, 24)).toBe(true)
    expect(hasPoint(75.3, 24)).toBe(true)
  })
})

describe('buildSupport', () => {
  it('ocupa as dimensões externas e fica apoiado na mesa', () => {
    const geometry = buildSupport(defaultThermoformerParams)
    const dims = getSupportDimensions(defaultThermoformerParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-dims.outerRadius, 1)
    expect(box.max.x).toBeCloseTo(dims.outerRadius, 1)
    expect(box.min.z).toBeCloseTo(-dims.outerRadius, 1)
    expect(box.max.z).toBeCloseTo(dims.outerRadius, 1)
    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(dims.height, 3)
    geometry.dispose()
  })

  it('spike: malha fechada e volume positivo', () => {
    const geometry = buildSupport(defaultThermoformerParams)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('a cavidade fica dentro da parede externa', () => {
    const geometry = buildSupport(defaultThermoformerParams)
    const dims = getSupportDimensions(defaultThermoformerParams)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeGreaterThan(dims.recessRadius)
    expect(dims.cavityTopRadius).toBeLessThan(dims.recessRadius)
    geometry.dispose()
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts`
Expected: FAIL (módulo não encontrado).

**Step 3: Implementar**

```ts
import {
  BufferGeometry,
  LatheGeometry,
  Vector2,
  Vector3,
} from 'three'
import {
  SCREEN_SEGMENTS,
  type ThermoformerGeometryParams,
} from './schema'

export interface SupportDimensions {
  outerRadius: number
  height: number
  seatY: number
  recessRadius: number
  cavityTopRadius: number
  sphereRadius: number
  sphereCenterY: number
  ledgeOverlap: number
}

const CAVITY_SEGMENTS = 32
const DEGENERATE_AREA_EPSILON = 1e-12

export function getSupportDimensions(
  params: ThermoformerGeometryParams,
): SupportDimensions {
  const screenRadius = params.diameter / 2
  const recessRadius = screenRadius + params.fitClearance
  const outerRadius = recessRadius + params.wallThickness
  const depth = Math.max(0.1, params.bowlDepth)
  const height = params.thickness + depth + params.bottomThickness
  const seatY = depth + params.bottomThickness
  const cavityTopRadius = Math.max(0.1, recessRadius - params.stepWidth)
  const sphereRadius = (cavityTopRadius ** 2 + depth ** 2) / (2 * depth)
  const sphereCenterY = params.bottomThickness + sphereRadius
  const ledgeOverlap = screenRadius - cavityTopRadius

  return {
    outerRadius,
    height,
    seatY,
    recessRadius,
    cavityTopRadius,
    sphereRadius,
    sphereCenterY,
    ledgeOverlap,
  }
}

function dedupe(points: Vector2[]): Vector2[] {
  const result: Vector2[] = []
  for (const point of points) {
    const last = result[result.length - 1]
    if (!last || last.distanceTo(point) > 1e-6) result.push(point)
  }
  return result
}

export function buildSupportProfile(
  params: ThermoformerGeometryParams,
): Vector2[] {
  const dims = getSupportDimensions(params)
  const chamfer = Math.max(
    0,
    Math.min(
      params.edgeChamfer,
      params.wallThickness * 0.5,
      params.bottomThickness * 0.5,
      dims.height * 0.2,
    ),
  )

  const points: Vector2[] = [
    new Vector2(0, 0),
    new Vector2(dims.outerRadius - chamfer, 0),
  ]

  if (chamfer > 0) points.push(new Vector2(dims.outerRadius, chamfer))
  points.push(new Vector2(dims.outerRadius, dims.height - chamfer))
  if (chamfer > 0) {
    points.push(new Vector2(dims.outerRadius - chamfer, dims.height))
  }

  points.push(new Vector2(dims.recessRadius, dims.height))
  points.push(new Vector2(dims.recessRadius, dims.seatY))
  points.push(new Vector2(dims.cavityTopRadius, dims.seatY))

  const phiTop = Math.asin(
    Math.max(
      -1,
      Math.min(1, (dims.seatY - dims.sphereCenterY) / dims.sphereRadius),
    ),
  )
  const phiBottom = -Math.PI / 2

  for (let index = 1; index < CAVITY_SEGMENTS; index++) {
    const phi = phiTop + (phiBottom - phiTop) * (index / CAVITY_SEGMENTS)
    points.push(new Vector2(
      Math.max(0, dims.sphereRadius * Math.cos(phi)),
      dims.sphereCenterY + dims.sphereRadius * Math.sin(phi),
    ))
  }

  points.push(new Vector2(0, params.bottomThickness))

  return dedupe(points)
}

function removeDegenerateTriangles(
  geometry: BufferGeometry,
): BufferGeometry {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  if (!index) return geometry

  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const ab = new Vector3()
  const ac = new Vector3()
  const cross = new Vector3()
  const kept: number[] = []

  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i)
    const ib = index.getX(i + 1)
    const ic = index.getX(i + 2)

    a.fromBufferAttribute(position, ia)
    b.fromBufferAttribute(position, ib)
    c.fromBufferAttribute(position, ic)
    ab.subVectors(b, a)
    ac.subVectors(c, a)

    if (cross.crossVectors(ab, ac).lengthSq() > DEGENERATE_AREA_EPSILON) {
      kept.push(ia, ib, ic)
    }
  }

  const result = new BufferGeometry()
  result.setAttribute('position', position.clone())
  result.setIndex(kept)
  result.computeVertexNormals()
  geometry.dispose()

  return result
}

export function buildSupport(
  params: ThermoformerGeometryParams,
): BufferGeometry {
  const geometry = new LatheGeometry(
    buildSupportProfile(params),
    SCREEN_SEGMENTS,
  )
  geometry.computeVertexNormals()
  return removeDegenerateTriangles(geometry)
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts`
Expected: PASS (6 tests). O spike deve mostrar malha fechada e volume positivo.

> **Gate:** se `isClosed` falhar, não seguir. Migrar para loft de anéis conforme o
> design.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts
git commit -m "feat: build thermoformer support"
```

---

## Task 3: Orquestração das duas peças

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { buildThermoformer } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'
import { getSupportDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/buildSupport'
import { defaultThermoformerParams } from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed } from './geometryTestUtils'

describe('buildThermoformer', () => {
  it('gera tela e suporte com o assento correto', () => {
    const result = buildThermoformer(defaultThermoformerParams)
    const dims = getSupportDimensions(defaultThermoformerParams)

    expect(result.seatY).toBeCloseTo(dims.seatY, 5)
    expect(result.screen).toBeDefined()
    expect(result.support).toBeDefined()

    result.screen.computeBoundingBox()
    expect(result.screen.boundingBox!.max.y - result.screen.boundingBox!.min.y)
      .toBeCloseTo(defaultThermoformerParams.thickness, 3)

    result.support.computeBoundingBox()
    expect(result.support.boundingBox!.max.y)
      .toBeCloseTo(dims.height, 3)

    expect(isClosed(result.screen)).toBe(true)
    expect(isClosed(result.support)).toBe(true)

    result.screen.dispose()
    result.support.dispose()
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts`
Expected: FAIL (módulo não encontrado).

**Step 3: Implementar**

```ts
import type { BufferGeometry } from 'three'
import { buildScreen } from './buildScreen'
import { buildSupport, getSupportDimensions } from './buildSupport'
import type { ThermoformerGeometryParams } from './schema'

export interface BuildThermoformerResult {
  screen: BufferGeometry
  support: BufferGeometry
  seatY: number
}

export function buildThermoformer(
  params: ThermoformerGeometryParams,
): BuildThermoformerResult {
  return {
    screen: buildScreen(params),
    support: buildSupport(params),
    seatY: getSupportDimensions(params).seatY,
  }
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts
git commit -m "feat: assemble thermoformer screen and support"
```

---

## Task 4: Validação estendida e renomeada

**Files:**
- Rename: `src/features/studio/tools/lembrancinhas/termoformador/validateScreen.ts` → `validateThermoformer.ts`
- Rename: `tests/features/studio/tools/lembrancinhas/termoformador/validateScreen.test.ts` → `validateThermoformer.test.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts` (import)
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx` (import)

**Step 1: Renomear com git**

```bash
git mv src/features/studio/tools/lembrancinhas/termoformador/validateScreen.ts \
  src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts
git mv tests/features/studio/tools/lembrancinhas/termoformador/validateScreen.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts
```

**Step 2: Atualizar o teste**

No `validateThermoformer.test.ts`, trocar imports para `validateThermoformer` e adicionar testes do suporte:

```ts
  it('aponta degrau sem sustentação da tela (defensivo)', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 0.3,
      fitClearance: 0.3,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-step', severity: 'error' }))
  })

  it('aponta degrau fino (defensivo)', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 1,
      fitClearance: 0.3,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-step', severity: 'warning' }))
  })

  it('avisa quando o degrau passa do aro sólido da tela', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      stepWidth: 8,
      frameWidth: 6,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-step-frame' }))
  })

  it('aponta parede e fundo abaixo do mínimo (defensivo)', () => {
    const wall = validateThermoformer({ ...defaultThermoformerParams, wallThickness: 0.5 })
    const bottom = validateThermoformer({ ...defaultThermoformerParams, bottomThickness: 0.5 })
    expect(wall).toContainEqual(expect.objectContaining({ code: 'support-wall' }))
    expect(bottom).toContainEqual(expect.objectContaining({ code: 'support-bottom' }))
  })

  it('avisa sobre folga apertada da tela', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, fitClearance: 0.1 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-clearance' }))
  })

  it('avisa profundidade inválida (defensivo)', () => {
    const issues = validateThermoformer({ ...defaultThermoformerParams, bowlDepth: 0 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-depth' }))
  })
```

**Step 3: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`
Expected: FAIL (códigos do suporte ausentes).

**Step 4: Implementar**

```ts
import { computeScreenPattern } from './screenPattern'
import { getSupportDimensions } from './buildSupport'
import {
  MAX_SCREEN_OPENINGS,
  MINIMUM_LINE_MM,
  MINIMUM_SUPPORT_MM,
  type ThermoformerGeometryParams,
} from './schema'

export type IssueSeverity = 'error' | 'warning'

export type ThermoformerIssueCode =
  | 'screen-frame'
  | 'screen-empty'
  | 'screen-density'
  | 'screen-opening'
  | 'screen-line'
  | 'support-step'
  | 'support-step-frame'
  | 'support-wall'
  | 'support-bottom'
  | 'support-clearance'
  | 'support-depth'

export interface ValidationIssue {
  code: ThermoformerIssueCode
  severity: IssueSeverity
  message: string
}

export function validateThermoformer(
  params: ThermoformerGeometryParams,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const outerRadius = params.diameter / 2
  const pattern = computeScreenPattern(params)
  const support = getSupportDimensions(params)

  if (params.frameWidth >= outerRadius) {
    issues.push({
      code: 'screen-frame',
      severity: 'error',
      message: 'O aro consome todo o diâmetro da tela. Reduza o aro ou aumente o diâmetro.',
    })
  } else if (pattern.cells.length === 0) {
    issues.push({
      code: 'screen-empty',
      severity: 'warning',
      message: 'Nenhum favo cabe na área interna com a abertura atual. Reduza a abertura ou o aro.',
    })
  } else if (params.opening >= pattern.innerRadius) {
    issues.push({
      code: 'screen-opening',
      severity: 'warning',
      message: 'A abertura do favo ocupa o raio interno da tela e deixa um único favo. Reduza a abertura ou o aro.',
    })
  }

  if (pattern.capped) {
    issues.push({
      code: 'screen-density',
      severity: 'warning',
      message: `A malha foi limitada a ${MAX_SCREEN_OPENINGS} favos; a abertura efetiva é ${pattern.effectiveOpening.toFixed(1)} mm.`,
    })
  }

  if (pattern.effectiveLine < MINIMUM_LINE_MM - 1e-9) {
    issues.push({
      code: 'screen-line',
      severity: 'warning',
      message: `A linha efetiva fica abaixo de ${MINIMUM_LINE_MM} mm.`,
    })
  }

  if (support.ledgeOverlap <= 0) {
    issues.push({
      code: 'support-step',
      severity: 'error',
      message: 'O degrau não sustenta a tela. Aumente a largura do degrau ou reduza a folga.',
    })
  } else if (support.ledgeOverlap < 1) {
    issues.push({
      code: 'support-step',
      severity: 'warning',
      message: 'O degrau sustenta menos de 1 mm da tela; aumente a largura do degrau.',
    })
  }

  if (params.stepWidth > params.frameWidth) {
    issues.push({
      code: 'support-step-frame',
      severity: 'warning',
      message: 'O degrau avança sob a área perfurada da tela; reduza o degrau ou aumente o aro.',
    })
  }

  if (params.wallThickness < MINIMUM_SUPPORT_MM) {
    issues.push({
      code: 'support-wall',
      severity: 'error',
      message: `A parede do suporte é menor que o mínimo de ${MINIMUM_SUPPORT_MM} mm.`,
    })
  }

  if (params.bottomThickness < MINIMUM_SUPPORT_MM) {
    issues.push({
      code: 'support-bottom',
      severity: 'error',
      message: `O fundo do suporte é menor que o mínimo de ${MINIMUM_SUPPORT_MM} mm.`,
    })
  }

  if (params.fitClearance < 0.2) {
    issues.push({
      code: 'support-clearance',
      severity: 'warning',
      message: 'A folga da tela está abaixo de 0,2 mm; o encaixe pode ficar apertado.',
    })
  }

  if (params.bowlDepth <= 0) {
    issues.push({
      code: 'support-depth',
      severity: 'warning',
      message: 'A profundidade da bacia precisa ser maior que zero.',
    })
  }

  return issues
}
```

**Step 5: Atualizar imports**

Em `useThermoformer.ts`:

```ts
import { validateThermoformer, type ValidationIssue } from './validateThermoformer'
```

e trocar `validateScreen(buildParams)` por `validateThermoformer(buildParams)`.

Em `StudioPanel.tsx`:

```ts
import type { ValidationIssue } from './validateThermoformer'
```

**Step 6: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`
Expected: PASS.

**Step 7: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts \
  src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts \
  src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts
git commit -m "feat: validate thermoformer support"
```

---

## Task 5: Serialização e worker das duas peças

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/workerGeometry.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/buildScreen.worker.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/workerClient.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`

**Step 1: Atualizar o teste**

Adicionar imports e um teste de round-trip do conjunto:

```ts
import type { BuildThermoformerResult } from '@/features/studio/tools/lembrancinhas/termoformador/buildThermoformer'
import {
  deserializeThermoformerResult,
  serializeThermoformerResult,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'

...
  it('faz round-trip das duas peças e do assento', () => {
    const result: BuildThermoformerResult = {
      screen: new BoxGeometry(160, 3, 160),
      support: new BoxGeometry(168.6, 27, 168.6),
      seatY: 24,
    }
    const { data, transfer } = serializeThermoformerResult(result)

    expect(transfer.length).toBeGreaterThanOrEqual(4)
    expect(data.seatY).toBe(24)

    const restored = deserializeThermoformerResult(data)
    restored.screen.computeBoundingBox()
    restored.support.computeBoundingBox()
    expect(restored.screen.boundingBox!.max.x).toBeCloseTo(80, 5)
    expect(restored.support.boundingBox!.max.y).toBeCloseTo(13.5, 5)
    expect(restored.seatY).toBe(24)

    result.screen.dispose()
    result.support.dispose()
    restored.screen.dispose()
    restored.support.dispose()
  })
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`
Expected: FAIL (funções novas ausentes).

**Step 3: Implementar `workerGeometry.ts`**

Adicionar, mantendo `SerializedGeometry`, `serializeGeometry` e `deserializeGeometry`:

```ts
import type { BuildThermoformerResult } from './buildThermoformer'

export interface SerializedThermoformerResult {
  screen: SerializedGeometry
  support: SerializedGeometry
  seatY: number
}

export function serializeThermoformerResult(
  result: BuildThermoformerResult,
): { data: SerializedThermoformerResult; transfer: ArrayBuffer[] } {
  const screen = serializeGeometry(result.screen)
  const support = serializeGeometry(result.support)

  return {
    data: {
      screen: screen.data,
      support: support.data,
      seatY: result.seatY,
    },
    transfer: [...screen.transfer, ...support.transfer],
  }
}

export function deserializeThermoformerResult(
  data: SerializedThermoformerResult,
): BuildThermoformerResult {
  return {
    screen: deserializeGeometry(data.screen),
    support: deserializeGeometry(data.support),
    seatY: data.seatY,
  }
}
```

**Step 4: Atualizar o worker**

```ts
import { buildThermoformer } from './buildThermoformer'
import { serializeThermoformerResult } from './workerGeometry'
import type { ThermoformerGeometryParams } from './schema'

interface BuildRequest {
  params: ThermoformerGeometryParams
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

scope.onmessage = (event) => {
  const { params } = event.data
  const { data, transfer } = serializeThermoformerResult(buildThermoformer(params))
  scope.postMessage({ data }, transfer)
}
```

**Step 5: Atualizar o worker client**

trocar `SerializedGeometry` por `SerializedThermoformerResult`:

```ts
import type { ThermoformerGeometryParams } from './schema'
import type { SerializedThermoformerResult } from './workerGeometry'

export interface ScreenWorker {
  build(
    params: ThermoformerGeometryParams,
    onResult: (data: SerializedThermoformerResult) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

export function createScreenWorker(): ScreenWorker {
  const worker = new Worker(
    new URL('./buildScreen.worker.ts', import.meta.url),
    { type: 'module' },
  )
  let terminated = false

  return {
    build(params, onResult, onError) {
      if (terminated) {
        onError?.()
        return
      }
      worker.onmessage = (event: MessageEvent<{ data: SerializedThermoformerResult }>) => {
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.onmessageerror = () => onError?.()
      worker.postMessage({ params })
    },
    terminate() {
      terminated = true
      worker.terminate()
    },
  }
}
```

**Step 6: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`
Expected: PASS.

**Step 7: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/workerGeometry.ts \
  src/features/studio/tools/lembrancinhas/termoformador/buildScreen.worker.ts \
  src/features/studio/tools/lembrancinhas/termoformador/workerClient.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts
git commit -m "feat: serialize thermoformer support"
```

---

## Task 6: Hook com as duas peças e o assento

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

**Step 1: Atualizar o teste**

Trocar o fixture para o resultado de duas peças:

```ts
function serializedResult(): SerializedThermoformerResult {
  return serializeThermoformerResult({
    screen: new BoxGeometry(160, 3, 160),
    support: new BoxGeometry(168.6, 27, 168.6),
    seatY: 24,
  }).data
}
```

Trocar os usos de `SerializedGeometry` por `SerializedThermoformerResult` no fixture.

Atualizar as expectativas:

```ts
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.screen).toBeDefined()
    expect(result.current.geometry!.support).toBeDefined()
    expect(result.current.seatY).toBe(24)
    expect(result.current.dimensions).toEqual({
      width: 168.6,
      height: 27,
      thickness: 168.6,
    })
```

No teste de falha, a geometria anterior deve permanecer:

```ts
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.geometry!.screen).toBe(first.screen)
```

No teste de descarte, descartar as duas peças:

```ts
    const first = result.current.geometry!
    const disposeScreen = vi.spyOn(first.screen, 'dispose')
    const disposeSupport = vi.spyOn(first.support, 'dispose')
    // ...
    expect(disposeScreen).toHaveBeenCalledTimes(1)
    expect(disposeSupport).toHaveBeenCalledTimes(1)
```

No unmount:

```ts
    const geometry = result.current.geometry!
    const disposeScreen = vi.spyOn(geometry.screen, 'dispose')
    const disposeSupport = vi.spyOn(geometry.support, 'dispose')
    // ...
    expect(disposeScreen).toHaveBeenCalled()
    expect(disposeSupport).toHaveBeenCalled()
```

No teste de enquadramento, trocar o fixture de disco por um conjunto com suporte
cilíndrico, para a asserção continuar distinguindo a esfera da diagonal da AABB:

```ts
function serializedDisc(): SerializedThermoformerResult {
  return serializeThermoformerResult({
    screen: new CylinderGeometry(80, 80, 3, 64),
    support: new CylinderGeometry(84.3, 84.3, 27, 64),
    seatY: 24,
  }).data
}
```

A expectativa passa a ser o raio da esfera do suporte:

```ts
    expect(result.current.fitRadius).toBeCloseTo(85.4, 1)
    expect(result.current.fitRadius).toBeLessThan(100)
```

A diagonal da AABB do suporte seria ~120,0 mm, então o teste continua
discriminante.

No teste de defaults, o fallback passa a ser `0.5 * hypot(168.6, 27, 168.6)`
(~120,0 mm); trocar a expectativa de 113,1 para 120,0.

Importar `getSupportDimensions` no hook:

```ts
import { getSupportDimensions } from './buildSupport'
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`
Expected: FAIL nos novos campos.

**Step 3: Implementar no hook**

Adicionar as faixas numéricas:

```ts
  wallThickness: { min: 2, max: 10 },
  bottomThickness: { min: 2, max: 10 },
  bowlDepth: { min: 5, max: 60 },
  stepWidth: { min: 2, max: 15 },
  fitClearance: { min: 0.1, max: 0.6 },
  edgeChamfer: { min: 0, max: 3 },
```

Trocar o tipo de geometria e o resultado:

```ts
export interface UseThermoformerResult {
  params: ThermoformerParams
  geometry: BuildThermoformerResult | null
  seatY: number
  isBuilding: boolean
  error: string | null
  issues: ValidationIssue[]
  dimensions: { width: number; height: number; thickness: number }
  cameraPosition: [number, number, number]
  fitRadius: number
  updateParam: (key: keyof ThermoformerParams, value: number | string) => void
  reset: () => void
}
```

No estado:

```ts
  const [geometry, setGeometry] = useState<BuildThermoformerResult | null>(null)
  const [seatY, setSeatY] = useState(0)
```

No `buildParams`, incluir os seis campos novos:

```ts
    wallThickness,
    bottomThickness,
    bowlDepth,
    stepWidth,
    fitClearance,
    edgeChamfer,
```

E nas dependências.

No callback do worker:

```ts
        worker.build(buildParams, (data: SerializedThermoformerResult) => {
          if (workerRef.current !== worker) return
          const next = deserializeThermoformerResult(data)
          setGeometry(next)
          setSeatY(next.seatY)
          setIsBuilding(false)
        }, () => {
```

No descarte:

```ts
  useEffect(() => () => {
    geometry?.screen.dispose()
    geometry?.support.dispose()
  }, [geometry])
```

No fallback de dimensões:

```ts
  const supportDims = getSupportDimensions(params)
  const fallbackDimensions = useMemo(() => ({
    width: Number((supportDims.outerRadius * 2).toFixed(1)),
    height: Number(supportDims.height.toFixed(1)),
    thickness: Number((supportDims.outerRadius * 2).toFixed(1)),
  }), [supportDims.outerRadius, supportDims.height])
```

Ajustar a bounding box para usar a peça de suporte:

```ts
  const bounds = useMemo(() => {
    if (!geometry) return null
    geometry.support.computeBoundingBox()
    const box = new Box3()
    if (geometry.support.boundingBox) box.union(geometry.support.boundingBox)
    return box.getSize(new Vector3())
  }, [geometry])
```

Ajustar o mapeamento das dimensões:

```ts
    return {
      width: Number(bounds.x.toFixed(1)),
      height: Number(bounds.y.toFixed(1)),
      thickness: Number(bounds.z.toFixed(1)),
    }
```

No `fitRadius`, usar a esfera do suporte:

```ts
  const fitRadius = useMemo(() => {
    if (!geometry) {
      return Math.max(
        1,
        0.5 * Math.hypot(
          fallbackDimensions.width,
          fallbackDimensions.height,
          fallbackDimensions.thickness,
        ),
      )
    }
    geometry.support.computeBoundingSphere()
    return Math.max(1, geometry.support.boundingSphere?.radius ?? 1)
  }, [geometry, fallbackDimensions])
```

Retornar `seatY` no objeto final.

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts
git commit -m "feat: add support to thermoformer state"
```

---

## Task 7: Exportar dois STLs

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`

**Step 1: Atualizar o teste**

Trocar o fixture de uma peça por:

```ts
  const result: BuildThermoformerResult = {
    screen: new BoxGeometry(160, 3, 160),
    support: new BoxGeometry(168.6, 27, 168.6),
    seatY: 24,
  }
```

Expectativas:

```ts
    expect(anchors).toHaveLength(2)
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Minha-Tela-tela.stl',
      'Minha-Tela-suporte.stl',
    ])
```

No teste de nome padrão, esperar `termoformador-tela.stl` e `termoformador-suporte.stl`.

No teste de preparo, testar `prepareScreenForPrint` e `prepareSupportForPrint` separadamente, verificando centralização e não mutação.

Ajustar o teste de clone/dispose: agora há dois clones e dois disposes.

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`
Expected: FAIL na assinatura/two downloads.

**Step 3: Implementar**

```ts
import { Mesh, Scene, type BufferGeometry } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { BuildThermoformerResult } from './buildThermoformer'
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

function downloadStl(geometry: BufferGeometry, filename: string): void {
  try {
    const scene = new Scene()
    scene.add(new Mesh(geometry))
    const exporter = new STLExporter()
    const result = exporter.parse(scene, { binary: true })
    const blob = new Blob([result as unknown as BlobPart], { type: 'model/stl' })
    const url = URL.createObjectURL(blob)

    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    } finally {
      URL.revokeObjectURL(url)
    }
  } finally {
    geometry.dispose()
  }
}

export function prepareScreenForPrint(
  geometry: BufferGeometry,
): BufferGeometry {
  return centerOnBed(geometry.clone())
}

export function prepareSupportForPrint(
  geometry: BufferGeometry,
): BufferGeometry {
  return centerOnBed(geometry.clone())
}

export function exportThermoformerStl(
  result: BuildThermoformerResult,
  projectName: string,
): void {
  const name = sanitizeFilename(projectName)
  downloadStl(prepareScreenForPrint(result.screen), `${name}-tela.stl`)
  downloadStl(prepareSupportForPrint(result.support), `${name}-suporte.stl`)
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts
git commit -m "feat: export thermoformer support"
```

---

## Task 8: Seção Suporte no painel

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`

**Step 1: Adicionar testes**

```tsx
  it('renderiza a seção Suporte e os sliders', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Suporte')).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Parede do suporte' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Fundo do suporte' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Profundidade da bacia' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Largura do degrau' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Folga da tela' })).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Chanfro do suporte' })).toBeDefined()
  })

  it('mostra as métricas do suporte', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText(/Diâmetro externo 168\.6 mm/)).toBeDefined()
    expect(screen.getByText(/Altura 27\.0 mm/)).toBeDefined()
  })

  it('atualiza a parede do suporte', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Parede do suporte' }), {
      key: 'ArrowRight',
    })
    expect(onUpdateParam).toHaveBeenCalledWith('wallThickness', 4.5)
  })
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`
Expected: FAIL (seção ausente).

**Step 3: Implementar**

Importar:

```ts
import { getSupportDimensions } from './buildSupport'
```

Dentro do componente:

```ts
  const supportDims = getSupportDimensions(params)
```

Adicionar a seção depois de **Malha** e antes de **Aparência**:

```tsx
        <Accordion.Item value="suporte">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Suporte</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.secondary">
                Diâmetro externo {(supportDims.outerRadius * 2).toFixed(1)} mm · Altura{' '}
                {supportDims.height.toFixed(1)} mm
              </Text>
              <LabeledSlider label="Parede do suporte" value={params.wallThickness} min={2} max={10} step={0.5} onChange={(value) => onUpdateParam('wallThickness', value)} />
              <LabeledSlider label="Fundo do suporte" value={params.bottomThickness} min={2} max={10} step={0.5} onChange={(value) => onUpdateParam('bottomThickness', value)} />
              <LabeledSlider label="Profundidade da bacia" value={params.bowlDepth} min={5} max={60} step={1} onChange={(value) => onUpdateParam('bowlDepth', value)} />
              <LabeledSlider label="Largura do degrau" value={params.stepWidth} min={2} max={15} step={0.5} onChange={(value) => onUpdateParam('stepWidth', value)} />
              <LabeledSlider label="Folga da tela" value={params.fitClearance} min={0.1} max={0.6} step={0.1} onChange={(value) => onUpdateParam('fitClearance', value)} />
              <LabeledSlider label="Chanfro do suporte" value={params.edgeChamfer} min={0} max={3} step={0.1} onChange={(value) => onUpdateParam('edgeChamfer', value)} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx
git commit -m "feat: add support controls"
```

---

## Task 9: Preview do conjunto montado

**Files:**
- Rename: `src/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.tsx` → `ThermoformerPreview.tsx`
- Rename: `tests/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.test.tsx` → `ThermoformerPreview.test.tsx`

**Step 1: Renomear**

```bash
git mv src/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.tsx \
  src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx
git mv tests/features/studio/tools/lembrancinhas/termoformador/ScreenPreview.test.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx
```

**Step 2: Atualizar o teste**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThermoformerPreview } from '@/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview'

describe('ThermoformerPreview', () => {
  it('não renderiza nada sem as duas peças', () => {
    const { container } = render(
      <ThermoformerPreview
        screen={null}
        support={null}
        seatY={0}
        color="#14b8a6"
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

**Step 3: Implementar**

```tsx
import type { BufferGeometry } from 'three'

interface ThermoformerPreviewProps {
  screen: BufferGeometry | null
  support: BufferGeometry | null
  seatY: number
  color: string
}

export function ThermoformerPreview({
  screen,
  support,
  seatY,
  color,
}: ThermoformerPreviewProps) {
  if (!screen || !support) return null

  return (
    <group>
      <mesh geometry={support} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.45} />
      </mesh>
      <mesh geometry={screen} position={[0, seatY, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  )
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx
git commit -m "feat: preview thermoformer assembly"
```

---

## Task 10: Integração na página do Studio

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Atualizar o teste**

Importar o novo serializer:

```ts
import {
  serializeThermoformerResult,
  type SerializedThermoformerResult,
} from '@/features/studio/tools/lembrancinhas/termoformador/workerGeometry'
```

Trocar `SerializedScreen` por `SerializedThermoformerResult` e ajustar o helper:

```ts
function serializedScreen(): SerializedThermoformerResult {
  return serializeThermoformerResult({
    screen: new THREE.BoxGeometry(160, 3, 160),
    support: new THREE.BoxGeometry(168.6, 27, 168.6),
    seatY: 24,
  }).data
}
```

Na expectativa de export:

```ts
    expect(exportThermoformerStl).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: expect.anything(),
        support: expect.anything(),
        seatY: 24,
      }),
      'Projeto sem título',
    )
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/StudioPage.test.tsx`
Expected: FAIL (preview/export antigos).

**Step 3: Implementar na página**

Trocar o lazy import:

```ts
const ThermoformerPreview = lazy(() =>
  import('./tools/lembrancinhas/termoformador/ThermoformerPreview').then((m) => ({
    default: m.ThermoformerPreview,
  })),
)
```

No wrapper, obter `seatY` do hook e exportar o resultado:

```tsx
  const {
    params,
    geometry,
    seatY,
    isBuilding,
    error,
    issues,
    dimensions,
    cameraPosition,
    fitRadius,
    updateParam,
    reset,
  } = useThermoformer()

  const handleExport = useCallback(() => {
    if (!geometry) return
    setExportError(null)
    try {
      exportThermoformerStl(geometry, projectName)
    } catch {
      setExportError('Falha ao exportar STL')
    }
  }, [geometry, projectName])
```

No preview:

```tsx
            <ThermoformerPreview
              screen={geometry?.screen ?? null}
              support={geometry?.support ?? null}
              seatY={seatY}
              color={params.color}
            />
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/StudioPage.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/StudioPage.tsx \
  tests/features/studio/StudioPage.test.tsx
git commit -m "feat: wire thermoformer support"
```

---

## Task 11: Documentação e verificação final

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md`
- Modify: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Step 1: Atualizar o AGENTS.md da ferramenta**

Adicionar à seção de parâmetros:

```md
### Suporte

| Parâmetro | Faixa | Default |
|---|---|---|
| `wallThickness` | 2–10 mm | 4 |
| `bottomThickness` | 2–10 mm | 4 |
| `bowlDepth` | 5–60 mm | 20 |
| `stepWidth` | 2–15 mm | 5 |
| `fitClearance` | 0,1–0,6 mm | 0,3 |
| `edgeChamfer` | 0–3 mm | 0,6 |
```

Adicionar às regras:

- O suporte é uma peça independente com bacia esférica fechada e fundo fechado.
- A tela apoia no degrau e fica nivelada com o topo.
- O diâmetro do suporte é derivado do diâmetro da tela.
- O export gera `<nome>-tela.stl` e `<nome>-suporte.stl`.

Adicionar aos códigos de validação:

```md
- `support-step`: degrau não sustenta a tela ou tem menos de 1 mm de apoio
- `support-step-frame`: degrau avança sob a área perfurada
- `support-wall`: parede abaixo de 0,8 mm (defensivo)
- `support-bottom`: fundo abaixo de 0,8 mm (defensivo)
- `support-clearance`: folga abaixo de 0,2 mm
- `support-depth`: profundidade inválida (defensivo)
```

Atualizar as decisões:

- `LatheGeometry` com perfil fechado e remoção de triângulos degenerados;
  validação de malha fechada e volume positivo.
- Suporte e tela são exportados separadamente.

**Step 2: Atualizar a categoria**

Em `lembrancinhas/AGENTS.md`:

```md
| termoformador | implementada (v1: tela + suporte) |
```

**Step 3: Atualizar o Studio**

Em `docs/frontend/studio.md`:

- Atualizar a descrição do Termoformador para "tela circular + suporte côncavo".
- Adicionar as linhas de edição para `buildSupport.ts`, `buildThermoformer.ts`,
  `validateThermoformer.ts` e `ThermoformerPreview.tsx`.
- Adicionar a seção do suporte com os parâmetros, encaixe e exportação dupla.
- Atualizar a decisão do Termoformador.

**Step 4: Verificação completa**

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected: todos passam.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md \
  src/features/studio/tools/lembrancinhas/AGENTS.md \
  docs/frontend/studio.md
git commit -m "docs: document thermoformer support"
```

---

## Critérios de conclusão

- A tela e o suporte são gerados juntos em `buildThermoformer`.
- O suporte tem bacia esférica, fundo fechado e rebaixo com degrau.
- A tela fica nivelada e com folga radial configurável.
- O preview mostra o conjunto montado.
- O export baixa `-tela.stl` e `-suporte.stl`.
- Typecheck, lint, testes e build passam.
- Documentação atualizada.
