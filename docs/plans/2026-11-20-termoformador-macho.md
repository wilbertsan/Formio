# Termoformador — Macho convexo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar a terceira peça do Termoformador — o macho convexo que conforma a tela plana na bacia do suporte — com preview, worker, export de três STLs e validação.

**Architecture:** O macho é um sólido de revolução (`LatheGeometry`) derivado da bacia do suporte deslocada pela espessura da tela. A tela continua plana; o macho é exportado girado com o topo na mesa. O suporte ganha um limite de semi-esfera para eliminar sobrequeda e permitir a retirada do macho.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Vitest, Testing Library, Amplify UI.

**Spec:** `docs/plans/2026-11-20-termoformador-macho-design.md`

---

### Task 1: Schema `plugHeight` e propagação no hook

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/schema.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

**Step 1: Write the failing tests**

Em `schema.test.ts`, adicione `plugHeight: 26` ao `toMatchObject` dos defaults e o teste de faixa:

```ts
  it('rejeita altura do macho fora da faixa', () => {
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, plugHeight: 9 }).success).toBe(false)
    expect(thermoformerParamsSchema.safeParse({ ...defaultThermoformerParams, plugHeight: 41 }).success).toBe(false)
  })
```

Em `useThermoformer.test.ts`, adicione `plugHeight: 26` ao objeto esperado do worker (perto de `edgeChamfer: 0.6`):

```ts
      edgeChamfer: 0.6,
      plugHeight: 26,
```

E no teste de clamp:

```ts
      result.current.updateParam('plugHeight', 99)
```

Com:

```ts
    expect(result.current.params.plugHeight).toBe(40)
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

Expected: FAIL — `plugHeight` ausente no schema/default e no objeto enviado ao worker.

**Step 3: Implement**

Em `schema.ts`:

```ts
export const PLUG_CHAMFER_MM = 0.8
export const PLUG_DOME_SEGMENTS = 32
export const PLUG_PREVIEW_GAP_MM = 8
```

No `thermoformerParamsSchema`, depois de `edgeChamfer`:

```ts
  plugHeight: z.number().min(10).max(40),
```

Em `defaultThermoformerParams`:

```ts
  plugHeight: 26,
```

Em `useThermoformer.ts`:

```ts
const NUMERIC_RANGES: Partial<Record<keyof ThermoformerParams, { min: number; max: number }>> = {
  ...
  edgeChamfer: { min: 0, max: 3 },
  plugHeight: { min: 10, max: 40 },
}
```

Destruture `plugHeight` de `params`, inclua no `buildParams` e no array de dependências:

```ts
    edgeChamfer,
    plugHeight,
  } = params

  const buildParams = useMemo<ThermoformerGeometryParams>(() => ({
    ...
    edgeChamfer,
    plugHeight,
  }), [
    ...
    edgeChamfer,
    plugHeight,
  ])
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/schema.ts \
  src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/schema.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts
git commit -m "feat: add plug height parameter"
```

---

### Task 2: Extrair utilitários de lathe

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/latheUtils.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts`

**Step 1: Run the existing tests as a baseline**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts`

Expected: PASS.

**Step 2: Create `latheUtils.ts`**

```ts
import { BufferGeometry, Vector2, Vector3 } from 'three'

const DEGENERATE_AREA_EPSILON = 1e-12

export function dedupeProfile(points: Vector2[]): Vector2[] {
  const result: Vector2[] = []
  for (const point of points) {
    const last = result[result.length - 1]
    if (!last || last.distanceTo(point) > 1e-6) result.push(point)
  }
  return result
}

export function removeDegenerateTriangles(
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
```

**Step 3: Update `buildSupport.ts`**

Troque os imports:

```ts
import {
  BufferGeometry,
  LatheGeometry,
  Vector2,
} from 'three'
import { dedupeProfile, removeDegenerateTriangles } from './latheUtils'
```

Remova do arquivo:

- `const DEGENERATE_AREA_EPSILON = 1e-12`
- a função `dedupe`
- a função `removeDegenerateTriangles`

E troque `return dedupe(points)` por `return dedupeProfile(points)`.

**Step 4: Run tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/latheUtils.ts \
  src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts
git commit -m "refactor: extract lathe helpers"
```

---

### Task 3: Limite de semi-esfera no suporte

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`

**Step 1: Write the failing tests**

Em `buildSupport.test.ts`, troque o teste de profundidade limitada por:

```ts
  it('limita a profundidade à semi-esfera para o macho poder ser retirado', () => {
    const params = {
      ...defaultThermoformerParams,
      diameter: 60,
      wallThickness: 2,
      bowlDepth: 60,
      stepWidth: 2,
      fitClearance: 0.1,
    }
    const dims = getSupportDimensions(params)

    expect(dims.bowlDepthLimited).toBe(true)
    expect(dims.effectiveBowlDepth).toBeCloseTo(dims.cavityTopRadius, 5)
    expect(dims.effectiveBowlDepth).toBeLessThan(60)
    expect(dims.cavityWall).toBeCloseTo(4, 5)

    const geometry = buildSupport(params)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeCloseTo(dims.outerRadius, 1)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('não deixa a bacia passar da abertura', () => {
    const dims = getSupportDimensions({
      ...defaultThermoformerParams,
      diameter: 60,
      stepWidth: 15,
      fitClearance: 0.6,
      bowlDepth: 60,
    })

    expect(dims.effectiveBowlDepth).toBeCloseTo(15.6, 5)
    expect(dims.effectiveBowlDepth).toBeLessThanOrEqual(dims.cavityTopRadius + 1e-9)
    expect(dims.seatY).toBeCloseTo(15.6 + defaultThermoformerParams.bottomThickness, 5)
  })
```

Em `validateThermoformer.test.ts`, o teste de profundidade limitada passa a esperar a semi-esfera:

```ts
  it('avisa quando a profundidade da bacia é limitada', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      wallThickness: 2,
      bowlDepth: 60,
      stepWidth: 2,
      fitClearance: 0.1,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'support-depth' }))
    const depth = issues.find((issue) => issue.code === 'support-depth')
    expect(depth).toEqual(expect.objectContaining({ severity: 'warning' }))
    expect(depth!.message).toContain('28.1 mm')
  })
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`

Expected: FAIL — profundidade efetiva 45,1 mm em vez de 28,1/15,6 e mensagem antiga.

**Step 3: Implement**

Em `getSupportDimensions`, troque:

```ts
  const effectiveBowlDepth = Math.min(requestedDepth, depthLimit)
```

por:

```ts
  // A bacia não pode passar da abertura: acima da semi-esfera ela vira
  // sobrequeda e o macho não poderia ser inserido/retirado.
  const effectiveBowlDepth = Math.min(requestedDepth, depthLimit, requestedTop)
```

Em `validateThermoformer.ts`, atualize a mensagem de `support-depth`:

```ts
      message: `A profundidade da bacia foi limitada a ${support.effectiveBowlDepth.toFixed(1)} mm para manter a parede e a forma imprimível da bacia.`,
```

**Step 4: Run tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildSupport.ts \
  src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildSupport.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts
git commit -m "fix: limit support bowl to a hemisphere"
```

---

### Task 4: Dimensões, perfil e geometria do macho

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/buildPlug.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildPlug.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  buildPlug,
  buildPlugProfile,
  getPlugDimensions,
} from '@/features/studio/tools/lembrancinhas/termoformador/buildPlug'
import { getSupportDimensions } from '@/features/studio/tools/lembrancinhas/termoformador/buildSupport'
import {
  PLUG_DOME_SEGMENTS,
  defaultThermoformerParams,
} from '@/features/studio/tools/lembrancinhas/termoformador/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('getPlugDimensions', () => {
  it('deriva o domo, a coroa e a pega da tela e do suporte', () => {
    const params = defaultThermoformerParams
    const support = getSupportDimensions(params)
    const dims = getPlugDimensions(params)

    expect(dims.guideRadius).toBeCloseTo(80, 5)
    expect(dims.contactRadius).toBeCloseTo(support.cavityTopRadius, 5)
    expect(dims.contactY).toBeCloseTo(support.height, 5)
    expect(dims.bodyTop).toBeCloseTo(support.height + params.plugHeight, 5)
    expect(dims.domeCenterY).toBeCloseTo(
      params.bottomThickness + params.thickness,
      5,
    )
    expect(dims.gripRadius).toBeCloseTo(23.4, 5)
    expect(dims.gripDepth).toBeCloseTo(28.08, 1)
    expect(dims.height).toBeCloseTo(
      support.effectiveBowlDepth + params.plugHeight,
      5,
    )
  })

  it('não deixa a pega furar o domo', () => {
    const dims = getPlugDimensions({
      ...defaultThermoformerParams,
      diameter: 60,
      plugHeight: 10,
      bowlDepth: 5,
    })

    expect(dims.bodyTop - dims.gripDepth).toBeGreaterThan(dims.domeCenterY + 1)
    expect(dims.gripRadius).toBeLessThan(dims.guideRadius)
  })

  it('mantém o domo dentro do raio-guia nos extremos', () => {
    const dims = getPlugDimensions({
      ...defaultThermoformerParams,
      diameter: 60,
      plugHeight: 40,
      stepWidth: 15,
      fitClearance: 0.6,
      bowlDepth: 60,
    })

    expect(dims.contactRadius).toBeLessThanOrEqual(dims.guideRadius + 1e-9)
    expect(dims.height).toBeGreaterThan(0)
  })
})

describe('buildPlugProfile', () => {
  it('começa no centro do domo, passa pela coroa e termina no ápice da pega', () => {
    const params = defaultThermoformerParams
    const dims = getPlugDimensions(params)
    const profile = buildPlugProfile(params)
    const hasPoint = (x: number, y: number) =>
      profile.some(
        (point) => Math.abs(point.x - x) < 1e-6 && Math.abs(point.y - y) < 1e-6,
      )

    expect(profile[0].x).toBeCloseTo(0, 5)
    expect(profile[0].y).toBeCloseTo(dims.domeCenterY, 5)
    expect(profile[profile.length - 1].x).toBeCloseTo(0, 5)
    expect(profile[profile.length - 1].y).toBeCloseTo(
      dims.bodyTop - dims.gripDepth,
      5,
    )
    expect(hasPoint(dims.guideRadius, dims.contactY)).toBe(true)
    expect(hasPoint(dims.guideRadius, dims.bodyTop - dims.chamfer)).toBe(true)
    expect(hasPoint(dims.gripRadius, dims.bodyTop)).toBe(true)
  })

  it('domo é a bacia deslocada pela espessura da tela', () => {
    const params = defaultThermoformerParams
    const support = getSupportDimensions(params)
    const profile = buildPlugProfile(params)
    const dome = profile.slice(0, PLUG_DOME_SEGMENTS + 1)

    for (const point of dome) {
      expect(point.y - params.thickness).toBeCloseTo(
        support.sphereCenterY
          - Math.sqrt(support.sphereRadius ** 2 - point.x ** 2),
        5,
      )
    }
  })
})

describe('buildPlug', () => {
  it('ocupa o diâmetro e a altura de impressão', () => {
    const params = defaultThermoformerParams
    const dims = getPlugDimensions(params)
    const geometry = buildPlug(params)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.x).toBeCloseTo(-dims.guideRadius, 1)
    expect(box.max.x).toBeCloseTo(dims.guideRadius, 1)
    expect(box.min.y).toBeCloseTo(dims.domeCenterY, 3)
    expect(box.max.y).toBeCloseTo(dims.bodyTop, 3)
    geometry.dispose()
  })

  it('gera malha fechada e volume positivo', () => {
    const geometry = buildPlug(defaultThermoformerParams)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('permanece fechado nos extremos', () => {
    const extremes = [
      {
        ...defaultThermoformerParams,
        diameter: 60,
        plugHeight: 40,
        stepWidth: 15,
        fitClearance: 0.6,
        bowlDepth: 60,
      },
      {
        ...defaultThermoformerParams,
        diameter: 300,
        plugHeight: 10,
        thickness: 6,
        wallThickness: 10,
        stepWidth: 2,
        fitClearance: 0.1,
        bowlDepth: 5,
      },
    ]

    for (const params of extremes) {
      const geometry = buildPlug(params)
      expect(isClosed(geometry)).toBe(true)
      expect(signedVolume(geometry)).toBeGreaterThan(0)
      geometry.dispose()
    }
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildPlug.test.ts`

Expected: FAIL — módulo `buildPlug` não existe.

**Step 3: Implement `buildPlug.ts`**

```ts
import { BufferGeometry, LatheGeometry, Vector2 } from 'three'
import { getSupportDimensions } from './buildSupport'
import { dedupeProfile, removeDegenerateTriangles } from './latheUtils'
import {
  PLUG_CHAMFER_MM,
  PLUG_DOME_SEGMENTS,
  SCREEN_SEGMENTS,
  type ThermoformerGeometryParams,
} from './schema'

export interface PlugDimensions {
  guideRadius: number
  contactRadius: number
  contactY: number
  bodyTop: number
  domeCenterY: number
  gripRadius: number
  gripDepth: number
  chamfer: number
  sphereRadius: number
  sphereCenterY: number
  height: number
}

export function getPlugDimensions(
  params: ThermoformerGeometryParams,
): PlugDimensions {
  const support = getSupportDimensions(params)
  const guideRadius = params.diameter / 2
  const contactRadius = support.cavityTopRadius
  const contactY = support.seatY + params.thickness
  const bodyTop = contactY + params.plugHeight
  const gripRadius = Math.min(
    params.plugHeight * 0.9,
    guideRadius * 0.4,
    30,
  )
  const gripDepth = Math.min(
    gripRadius * 1.2,
    support.effectiveBowlDepth + params.plugHeight - 6,
  )
  const chamfer = Math.min(
    PLUG_CHAMFER_MM,
    params.plugHeight * 0.3,
    guideRadius * 0.1,
  )

  return {
    guideRadius,
    contactRadius,
    contactY,
    bodyTop,
    domeCenterY:
      support.sphereCenterY + params.thickness - support.sphereRadius,
    gripRadius,
    gripDepth,
    chamfer,
    sphereRadius: support.sphereRadius,
    sphereCenterY: support.sphereCenterY,
    height: support.effectiveBowlDepth + params.plugHeight,
  }
}

export function buildPlugProfile(
  params: ThermoformerGeometryParams,
): Vector2[] {
  const dims = getPlugDimensions(params)
  const points: Vector2[] = [new Vector2(0, dims.domeCenterY)]

  for (let index = 1; index <= PLUG_DOME_SEGMENTS; index++) {
    const radius = dims.contactRadius * (index / PLUG_DOME_SEGMENTS)
    const y = dims.sphereCenterY + params.thickness
      - Math.sqrt(Math.max(0, dims.sphereRadius ** 2 - radius ** 2))
    points.push(new Vector2(radius, y))
  }

  points.push(new Vector2(dims.guideRadius, dims.contactY))
  points.push(new Vector2(dims.guideRadius, dims.bodyTop - dims.chamfer))
  if (dims.chamfer > 0) {
    points.push(new Vector2(dims.guideRadius - dims.chamfer, dims.bodyTop))
  }
  points.push(new Vector2(dims.gripRadius, dims.bodyTop))
  points.push(new Vector2(0, dims.bodyTop - dims.gripDepth))

  return dedupeProfile(points)
}

export function buildPlug(
  params: ThermoformerGeometryParams,
): BufferGeometry {
  const geometry = new LatheGeometry(
    buildPlugProfile(params),
    SCREEN_SEGMENTS,
  )
  return removeDegenerateTriangles(geometry)
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildPlug.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildPlug.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildPlug.test.ts
git commit -m "feat: build convex male mold"
```

---

### Task 5: Validação do macho

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`

**Step 1: Write the failing test**

```ts
  it('aponta macho sem coroa de contato (defensivo)', () => {
    const issues = validateThermoformer({
      ...defaultThermoformerParams,
      diameter: 60,
      stepWidth: -5,
    })
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'plug-guide', severity: 'error' }),
    )
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`

Expected: FAIL — `plug-guide` ainda não existe.

**Step 3: Implement**

Em `ThermoformerIssueCode`, adicione:

```ts
  | 'plug-guide'
```

Importe `getPlugDimensions` e, depois das validações do suporte, adicione:

```ts
  const plug = getPlugDimensions(params)

  if (plug.guideRadius <= plug.contactRadius || plug.contactRadius <= 0) {
    issues.push({
      code: 'plug-guide',
      severity: 'error',
      message:
        'O macho não tem coroa de contato. Aumente o diâmetro da tela ou reduza a largura do degrau.',
    })
  }
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/validateThermoformer.test.ts
git commit -m "feat: validate male mold contact ring"
```

---

### Task 6: Orquestração e serialização das três peças

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts`
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/workerGeometry.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Write the failing tests/atualize fixtures**

Em `buildThermoformer.test.ts`, adicione:

```ts
    expect(result.plug).toBeDefined()
    expect(isClosed(result.plug)).toBe(true)

    result.plug.computeBoundingBox()
    expect(result.plug.boundingBox!.max.y)
      .toBeCloseTo(getPlugDimensions(defaultThermoformerParams).bodyTop, 3)
```

E no fim do teste:

```ts
    result.plug.dispose()
```

Importe `getPlugDimensions`.

Em `workerGeometry.test.ts`, troque o round-trip das duas peças por três:

```ts
  it('faz round-trip das três peças e do assento', () => {
    const result: BuildThermoformerResult = {
      screen: new BoxGeometry(160, 3, 160),
      support: new BoxGeometry(168.6, 27, 168.6),
      plug: new BoxGeometry(160, 46, 160),
      seatY: 24,
    }
    const { data, transfer } = serializeThermoformerResult(result)

    expect(transfer.length).toBeGreaterThanOrEqual(6)
    expect(data.seatY).toBe(24)

    const restored = deserializeThermoformerResult(data)
    restored.screen.computeBoundingBox()
    restored.support.computeBoundingBox()
    restored.plug.computeBoundingBox()
    expect(restored.screen.boundingBox!.max.x).toBeCloseTo(80, 5)
    expect(restored.support.boundingBox!.max.y).toBeCloseTo(13.5, 5)
    expect(restored.plug.boundingBox!.max.y).toBeCloseTo(23, 5)
    expect(restored.seatY).toBe(24)

    result.screen.dispose()
    result.support.dispose()
    result.plug.dispose()
    restored.screen.dispose()
    restored.support.dispose()
    restored.plug.dispose()
  })
```

No teste do conjunto real:

```ts
    expect(data.support.index).not.toBeNull()
    expect(data.plug.index).not.toBeNull()
    expect(transfer).toHaveLength(8)
```

E adicione `result.plug.dispose()` no fim.

Nas fixtures de `useThermoformer.test.ts`, adicione `plug: new BoxGeometry(160, 46, 160)` em `serializedResult`, `plug: new CylinderGeometry(80, 80, 46, 64)` em `serializedDisc` e o plug também no `serializeThermoformerResult` do teste da bounding box.

Em `exportStl.test.ts`, adicione `plug: new BoxGeometry(160, 46, 160)` ao `buildResult`. Não mude ainda as contagens de download.

Em `StudioPage.test.tsx`, adicione `plug: new THREE.BoxGeometry(160, 46, 160)` ao `serializedScreen`.

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts`

Expected: FAIL — o resultado ainda não tem `plug`.

**Step 3: Implement**

Em `buildThermoformer.ts`:

```ts
import type { BufferGeometry } from 'three'
import { buildScreen } from './buildScreen'
import { buildSupport, getSupportDimensions } from './buildSupport'
import { buildPlug } from './buildPlug'
import type { ThermoformerGeometryParams } from './schema'

export interface BuildThermoformerResult {
  screen: BufferGeometry
  support: BufferGeometry
  plug: BufferGeometry
  seatY: number
}

export function buildThermoformer(
  params: ThermoformerGeometryParams,
): BuildThermoformerResult {
  return {
    screen: buildScreen(params),
    support: buildSupport(params),
    plug: buildPlug(params),
    seatY: getSupportDimensions(params).seatY,
  }
}
```

Em `workerGeometry.ts`, adicione `plug` ao tipo serializado, ao serialize e ao deserialize:

```ts
export interface SerializedThermoformerResult {
  screen: SerializedGeometry
  support: SerializedGeometry
  plug: SerializedGeometry
  seatY: number
}
```

```ts
export function serializeThermoformerResult(
  result: BuildThermoformerResult,
): { data: SerializedThermoformerResult; transfer: ArrayBuffer[] } {
  const screen = serializeGeometry(result.screen)
  const support = serializeGeometry(result.support)
  const plug = serializeGeometry(result.plug)

  return {
    data: {
      screen: screen.data,
      support: support.data,
      plug: plug.data,
      seatY: result.seatY,
    },
    transfer: [...screen.transfer, ...support.transfer, ...plug.transfer],
  }
}

export function deserializeThermoformerResult(
  data: SerializedThermoformerResult,
): BuildThermoformerResult {
  return {
    screen: deserializeGeometry(data.screen),
    support: deserializeGeometry(data.support),
    plug: deserializeGeometry(data.plug),
    seatY: data.seatY,
  }
}
```

O `buildScreen.worker.ts` não muda.

**Step 4: Run tests**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.ts \
  src/features/studio/tools/lembrancinhas/termoformador/workerGeometry.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/buildThermoformer.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/workerGeometry.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts \
  tests/features/studio/StudioPage.test.tsx
git commit -m "feat: orchestrate male mold geometry"
```

---

### Task 7: Hook com macho, suspensão e enquadramento

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

**Step 1: Write the failing tests**

No teste "envia ao worker após o debounce e aplica a geometria", adicione:

```ts
    expect(result.current.geometry!.plug).toBeDefined()
    expect(result.current.plugLift).toBeCloseTo(28, 5)
```

E troque a expectativa de `fitRadius` por:

```ts
    // União do suporte Box(168.6,27,168.6) com o macho Box(160,46,160)
    // suspenso em 28 mm: esfera envolvente a partir da origem.
    expect(result.current.fitRadius).toBeCloseTo(142.25, 1)
```

No teste do disco:

```ts
  it('enquadra a união do suporte com o macho suspenso', () => {
    const { factory, respond } = makeWorkerFixture(serializedDisc)
    const { result } = renderHook(() => useThermoformer({ workerFactory: factory }))

    act(() => { vi.advanceTimersByTime(260) })
    act(() => { respond() })

    expect(result.current.fitRadius).toBeCloseTo(142.25, 1)
    expect(result.current.fitRadius).toBeLessThan(247)
  })
```

Nos dois testes de descarte, adicione o plug:

```ts
    const disposePlug = vi.spyOn(first.plug, 'dispose')
```

```ts
    expect(disposePlug).toHaveBeenCalledTimes(1)
```

E no desmonte:

```ts
    const disposePlug = vi.spyOn(geometry.plug, 'dispose')
```

```ts
    expect(disposePlug).toHaveBeenCalled()
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

Expected: FAIL — `plugLift` ausente e `fitRadius` ainda só do suporte.

**Step 3: Implement**

Em `useThermoformer.ts`:

```ts
import { Box3, Sphere, Vector3 } from 'three'
```

```ts
import {
  defaultThermoformerParams,
  PLUG_PREVIEW_GAP_MM,
  thermoformerParamsSchema,
  type ThermoformerGeometryParams,
  type ThermoformerParams,
} from './schema'
```

Adicione `plugLift` ao retorno da interface:

```ts
export interface UseThermoformerResult {
  params: ThermoformerParams
  geometry: BuildThermoformerResult | null
  seatY: number
  plugLift: number
  ...
}
```

Depois de `supportDims`:

```ts
  const plugLift = useMemo(
    () => supportDims.effectiveBowlDepth + PLUG_PREVIEW_GAP_MM,
    [supportDims.effectiveBowlDepth],
  )
```

Substitua o `fitRadius` por:

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

    geometry.support.computeBoundingBox()
    geometry.plug.computeBoundingBox()
    const box = new Box3()
    if (geometry.support.boundingBox) box.union(geometry.support.boundingBox)
    if (geometry.plug.boundingBox) {
      const plugBox = geometry.plug.boundingBox.clone()
      plugBox.translate(new Vector3(0, plugLift, 0))
      box.union(plugBox)
    }

    const sphere = box.getBoundingSphere(new Sphere())
    return Math.max(1, sphere.center.length() + sphere.radius)
  }, [geometry, plugLift, fallbackDimensions])
```

No efeito de descarte:

```ts
  useEffect(() => () => {
    geometry?.screen.dispose()
    geometry?.support.dispose()
    geometry?.plug.dispose()
  }, [geometry])
```

No retorno:

```ts
    seatY,
    plugLift,
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/useThermoformer.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/useThermoformer.test.ts
git commit -m "feat: suspend male mold in preview framing"
```

---

### Task 8: Export do terceiro STL com orientação de impressão

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`

**Step 1: Write the failing tests**

No teste de download, atualize as contagens para três e os nomes:

```ts
    expect(anchors).toHaveLength(3)
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'Minha-Tela-tela.stl',
      'Minha-Tela-suporte.stl',
      'Minha-Tela-macho.stl',
    ])
```

Ajuste `revokeObjectURL`, `appendChild`, `removeChild` e `parseMock` para 3, e clone/dispose para 3. Inclua a verificação:

```ts
    expect(disposeSpy.mock.instances).not.toContain(result.plug)
```

No teste do nome padrão:

```ts
    expect(anchors.map((anchor) => anchor.download)).toEqual([
      'termoformador-tela.stl',
      'termoformador-suporte.stl',
      'termoformador-macho.stl',
    ])
```

Adicione o teste do giro:

```ts
describe('preparePlugForPrint', () => {
  it('gira o macho com o topo na mesa e centraliza', () => {
    const params = defaultThermoformerParams
    const plug = buildPlug(params)
    const dims = getPlugDimensions(params)
    const print = preparePlugForPrint(plug)
    print.computeBoundingBox()

    expect(print.boundingBox!.min.y).toBeCloseTo(0, 3)
    expect(print.boundingBox!.max.y).toBeCloseTo(dims.height, 3)

    const position = print.getAttribute('position')
    let atBed = 0
    for (let index = 0; index < position.count; index++) {
      if (Math.abs(position.getY(index)) < 1e-3) atBed++
    }
    expect(atBed).toBeGreaterThan(100)

    const original = plug.getAttribute('position')
    expect(original.getY(0)).toBeCloseTo(dims.domeCenterY, 3)

    print.dispose()
    plug.dispose()
  })
})
```

Importe `buildPlug`, `getPlugDimensions` e `preparePlugForPrint`, e `defaultThermoformerParams`.

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`

Expected: FAIL — só dois downloads e `preparePlugForPrint` ausente.

**Step 3: Implement**

Em `exportStl.ts`:

```ts
export function preparePlugForPrint(
  geometry: BufferGeometry,
): BufferGeometry {
  const print = geometry.clone()
  print.rotateX(Math.PI)
  return centerOnBed(print)
}
```

E em `exportThermoformerStl`:

```ts
  downloadStl(prepareScreenForPrint(result.screen), `${name}-tela.stl`)
  downloadStl(prepareSupportForPrint(result.support), `${name}-suporte.stl`)
  downloadStl(preparePlugForPrint(result.plug), `${name}-macho.stl`)
```

Atualize o comentário da função para citar as três peças.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/exportStl.ts \
  tests/features/studio/tools/lembrancinhas/termoformador/exportStl.test.ts
git commit -m "feat: export male mold STL"
```

---

### Task 9: Preview e StudioPage

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx`
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Update the failing test**

Em `ThermoformerPreview.test.tsx`:

```ts
  it('não renderiza nada sem as três peças', () => {
    const { container } = render(
      <ThermoformerPreview
        screen={null}
        support={null}
        plug={null}
        seatY={0}
        plugLift={0}
        color="#14b8a6"
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
```

Em `StudioPage.test.tsx`, adicione `plug: expect.anything()` à expectativa da exportação:

```ts
      expect.objectContaining({
        screen: expect.anything(),
        support: expect.anything(),
        plug: expect.anything(),
        seatY: 24,
      }),
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx tests/features/studio/StudioPage.test.tsx`

Expected: FAIL — props `plug`/`plugLift` ausentes no preview e no wrapper.

**Step 3: Implement**

Em `ThermoformerPreview.tsx`:

```tsx
import type { BufferGeometry } from 'three'

interface ThermoformerPreviewProps {
  screen: BufferGeometry | null
  support: BufferGeometry | null
  plug: BufferGeometry | null
  seatY: number
  plugLift: number
  color: string
}

export function ThermoformerPreview({
  screen,
  support,
  plug,
  seatY,
  plugLift,
  color,
}: ThermoformerPreviewProps) {
  if (!screen || !support || !plug) return null

  return (
    <group>
      <mesh geometry={support} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.45} />
      </mesh>
      <mesh geometry={screen} position={[0, seatY, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={plug} position={[0, plugLift, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.45} />
      </mesh>
    </group>
  )
}
```

Em `StudioPage.tsx`, no `ThermoformerToolWrapper`, desestruture `plugLift` do hook e passe as novas props:

```tsx
  } = useThermoformer()
```

```tsx
    plugLift,
```

```tsx
            <ThermoformerPreview
              screen={geometry?.screen ?? null}
              support={geometry?.support ?? null}
              plug={geometry?.plug ?? null}
              seatY={seatY}
              plugLift={plugLift}
              color={params.color}
            />
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx tests/features/studio/StudioPage.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.tsx \
  src/features/studio/StudioPage.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/ThermoformerPreview.test.tsx \
  tests/features/studio/StudioPage.test.tsx
git commit -m "feat: show male mold in thermoformer preview"
```

---

### Task 10: Acordeão Macho no painel

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`

**Step 1: Write the failing tests**

Adicione `'Macho'` à lista de seções e:

```ts
  it('renderiza a seção Macho e o slider', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText('Macho')).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Altura do corpo' })).toBeDefined()
  })

  it('mostra as métricas do macho', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getByText(/Diâmetro 160\.0 mm/)).toBeDefined()
    expect(screen.getByText(/Altura 46\.0 mm/)).toBeDefined()
    expect(screen.getByText(/Pega Ø46\.8 × 28\.1 mm/)).toBeDefined()
    expect(
      screen.getByText(/A tela é exportada plana; aqueça e pressione/),
    ).toBeDefined()
  })

  it('atualiza a altura do corpo do macho', () => {
    const onUpdateParam = vi.fn()
    render(<StudioPanel {...defaultProps} onUpdateParam={onUpdateParam} />)
    fireEvent.keyDown(
      screen.getByRole('slider', { name: 'Altura do corpo' }),
      { key: 'ArrowRight' },
    )
    expect(onUpdateParam).toHaveBeenCalledWith('plugHeight', 27)
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`

Expected: FAIL — seção Macho ausente.

**Step 3: Implement**

Em `StudioPanel.tsx`:

```ts
import { getPlugDimensions } from './buildPlug'
```

No componente:

```ts
  const supportDims = getSupportDimensions(params)
  const plugDims = getPlugDimensions(params)
```

Adicione o item entre **Suporte** e **Aparência**:

```tsx
        <Accordion.Item value="macho">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Macho</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.secondary">
                Diâmetro {params.diameter.toFixed(1)} mm · Altura{' '}
                {plugDims.height.toFixed(1)} mm · Pega Ø
                {(plugDims.gripRadius * 2).toFixed(1)} ×{' '}
                {plugDims.gripDepth.toFixed(1)} mm
              </Text>
              <LabeledSlider label="Altura do corpo" value={params.plugHeight} min={10} max={40} step={1} onChange={(value) => onUpdateParam('plugHeight', value)} />
              <Text fontSize="xs" color="font.tertiary">
                A tela é exportada plana; aqueça e pressione com o macho para
                conformá-la na bacia.
              </Text>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/StudioPanel.tsx \
  tests/features/studio/tools/lembrancinhas/termoformador/StudioPanel.test.tsx
git commit -m "feat: add male mold panel section"
```

---

### Task 11: Documentação e validação final

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md`
- Modify: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Step 1: Update `termoformador/AGENTS.md`**

- Status: `implementada (v1: tela + suporte + macho)`.
- Objetivo: citar o macho convexo que conforma a tela plana.
- Parâmetros: adicionar `plugHeight` (10–40 mm, default 26).
- Regras do domínio: domo = bacia + espessura; coroa em `seatY + thickness`;
  parede-guia em `diameter/2`; profundidade efetiva limitada à semi-esfera;
  tela exportada plana; macho fechado impresso com 10–15% de infill; giro de
  180° no export.
- Pipeline: incluir `buildPlug`.
- Exportação: `<nome>-macho.stl`, girado com o topo na mesa.
- Validação: adicionar `plug-guide`; atualizar `support-depth` para citar a
  semi-esfera.
- Decisões: pega cônica, volume fechado, limite de semi-esfera, preview com
  macho suspenso em `effectiveBowlDepth + 8 mm`.
- Fora de escopo: tela conformada, cavidade modelada, pega em relevo, furo de
  vácuo, corpo/tampa/base, 3MF/STEP.

**Step 2: Update `lembrancinhas/AGENTS.md`**

- Status do termoformador: `implementada (v1: tela + suporte + macho)`.
- Regra: “A tela do termoformador é exportada plana e conformada com o macho; a
  bacia do suporte não passa de uma semi-esfera para o macho poder ser retirado.”

**Step 3: Update `docs/frontend/studio.md`**

- Descrição da ferramenta na lista inicial: citar o macho convexo.
- Tabela de arquivos: adicionar `latheUtils.ts` e `buildPlug.ts`; atualizar
  `buildSupport`, `buildThermoformer`, `workerGeometry`, `exportStl`,
  `ThermoformerPreview` e `StudioPanel`.
- Título da seção: **Termoformador (tela + suporte + macho)**.
- Pipeline numerado: incluir `buildPlug.ts` e três STLs.
- Detalhes: domo deslocado por `thickness`, coroa, parede-guia, pega cônica,
  volume fechado com infill, giro de impressão, limite de semi-esfera,
  `plugLift = effectiveBowlDepth + 8`, `fitRadius` da união, `plug-guide`.
- Resumo final: atualizar a frase sobre a ferramenta.

**Step 4: Run full validation**

Run: `npm run typecheck`

Expected: sem erros.

Run: `npm run lint`

Expected: sem erros.

Run: `npm run test`

Expected: todos os testes passam.

Run: `npm run build`

Expected: build concluído.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md \
  src/features/studio/tools/lembrancinhas/AGENTS.md \
  docs/frontend/studio.md
git commit -m "docs: document thermoformer male mold"
```

---

## Pontos de atenção para o executor

1. O teste de `buildPlug` foi escrito com `plugHeight` e `PLUG_DOME_SEGMENTS`; confira se os imports estão corretos.
2. O `fitRadius` de 142,3 depende das fixtures `BoxGeometry(168.6, 27, 168.6)` e `BoxGeometry(160, 46, 160)` com `plugLift = 28`. Se as fixtures mudarem, recalcule a esfera envolvente da união.
3. O `preparePlugForPrint` usa `rotateX(Math.PI)`; não use `scale(1, -1, 1)`, que inverte o winding.
4. O macho é um volume fechado; não modele cavidade interna. O infill de 10–15% é configuração de fatiamento, documentada.
5. O `support-depth` agora cobre o limite de semi-esfera; a mensagem deve citar a forma imprimível.
6. O build em worker continua no `buildScreen.worker.ts`; nenhuma mudança é necessária nele.
