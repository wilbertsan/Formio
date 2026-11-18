# Porta-lata 350 ml Implementation Plan

## Execução

- As Tasks 3–6 foram executadas juntas: o perfil do corpo, o relevo, a alça e a
  orquestração são acoplados pela geometria (raio, altura e furo), então separar
  os commits deixaria estados intermediários sem teste de malha fechada.
- O schema entrou primeiro de forma aditiva (Task 2), preservando o build antigo
  até a troca do perfil; a renomeação mecânica já estava feita na Task 1.
- `can-handle-band` valida apenas a banda da abraçadeira
  (`handleHeight ± handleWidth / 2`); o laço em D pode passar da borda superior.
- O gate de tempo do teste usa `process.threadCpuUsage` (fallback
  `process.cpuUsage` em Node < 22.15), porque a suíte roda vários arquivos de
  geometria em paralelo e o relógio de parede distorce o CI.
- O material da caneca neste plano é histórico: o código ativo é
  `porta-lata`/`CanHolder` e os docs antigos têm nota de substituição.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir a Caneca Personalizada por um Porta-lata 350 ml com cavidade cilíndrica para a lata, furo de ventilação, alça removível e nome em relevo, em dois STLs.

**Architecture:** Renomear a ferramenta e o pipeline existente para `porta-lata`/`CanHolder`, substituindo o perfil do corpo por uma cavidade reta com furo passante no fundo e borda de entrada. O relevo, a alça de abraçadeira, o CSG com CDT, o worker, o hook e o export continuam, com parâmetros, validação e UI adaptados à lata de 66,2 × 122,2 mm.

**Tech Stack:** React 19, TypeScript strict, Three.js, React Three Fiber, three-bvh-csg, Zod, Amplify UI, Vitest, TailwindCSS 4.

**Design de referência:** `docs/plans/2026-11-17-porta-lata-design.md`

---

## Pré-requisitos e convenções

- Trabalhar em worktree dedicado quando a execução for iniciada.
- 1 unidade Three.js = 1 mm.
- Não usar `any`; tipar retornos.
- Reutilizar Amplify UI; não criar componente paralelo.
- Testes em `tests/features/studio/tools/lembrancinhas/porta-lata/`.
- Commits semânticos `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- A lata é uma referência fixa: 66,2 × 122,2 mm, topo 54 mm, 350 ml.
- O corpo tem cavidade reta de 67,8 mm no default e furo de ventilação de 10 mm.

### Spike obrigatório (Task 6)

Antes de UI e integração, provar que:

1. o corpo com furo de ventilação é fechado (`isClosed`) e single-shell;
2. a união do relevo ao corpo com `three-bvh-csg`/CDT é fechada e single-shell;
3. a alça é fechada e single-shell;
4. o build padrão termina em tempo aceitável (teste < 4 s).

Se o corpo com furo não fechar, parar e corrigir o perfil antes de seguir.

---

## Task 1: Renomear a ferramenta (comportamento atual preservado)

**Files:**
- Rename: `src/features/studio/tools/lembrancinhas/caneca-personalizada/` →
  `src/features/studio/tools/lembrancinhas/porta-lata/`
- Rename: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/` →
  `tests/features/studio/tools/lembrancinhas/porta-lata/`
- Modify: imports em `StudioPage.tsx`, `ToolSelector.tsx` e testes.

**Mapeamento de arquivos e símbolos:**

| Atual | Novo |
|---|---|
| `caneca-personalizada/` | `porta-lata/` |
| `buildMug.ts` | `buildCanHolder.ts` |
| `buildMug.worker.ts` | `buildCanHolder.worker.ts` |
| `useMug.ts` | `useCanHolder.ts` |
| `validateMug.ts` | `validateCanHolder.ts` |
| `MugPreview.tsx` | `CanHolderPreview.tsx` |
| `exportMugStl` | `exportCanHolderStl` |
| `MugParams` | `CanHolderParams` |
| `MugGeometryParams` | `CanHolderGeometryParams` |
| `mugParamsSchema` | `canHolderParamsSchema` |
| `mugGeometryParamsSchema` | `canHolderGeometryParamsSchema` |
| `defaultMugParams` | `defaultCanHolderParams` |
| `BuildMugResult` | `CanHolderBuildResult` |
| `buildMug` | `buildCanHolder` |
| `disposeMugResult` | `disposeCanHolderResult` |
| `MugWorker` | `CanHolderWorker` |
| `createMugWorker` | `createCanHolderWorker` |
| `UseMugOptions` / `UseMugResult` | `UseCanHolderOptions` / `UseCanHolderResult` |
| `useMug` | `useCanHolder` |
| `MugIssueCode` | `CanHolderIssueCode` |
| `validateMug` | `validateCanHolder` |
| `MugToolWrapper` | `CanHolderToolWrapper` |
| `MugPreview` | `CanHolderPreview` |
| `MugTool` | `CanHolderTool` |
| `ToolId`/`productType` | `'porta-lata'` |
| UI | **Porta-lata** |

**Step 1:** Fazer `git mv` da pasta e dos arquivos; renomear símbolos/imports com
varredura. Não mudar comportamento ainda.

Run: `rg -n "Mug|mug|caneca|Caneca" src/features/studio/tools/lembrancinhas/porta-lata src/features/studio/StudioPage.tsx src/features/studio/components/ToolSelector.tsx tests/features/studio/tools/lembrancinhas/porta-lata`
Expected: zero ocorrências do nome antigo.

**Step 2:** Renomear o card para **Porta-lata** e o `productType`.

**Step 3:** Rodar `npm run test -- tests/features/studio/tools/lembrancinhas/porta-lata tests/features/studio/StudioPage.test.tsx tests/features/studio/components/ToolSelector.test.tsx`
Expected: PASS com o comportamento antigo (corpo de caneca) e o novo nome.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename mug tool to can holder"
```

---

## Task 2: Preset da lata, schema e derivados

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/schema.ts`
- Test: `tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  CAN_DIAMETER,
  CAN_HEIGHT,
  CAN_VOLUME_ML,
  canHolderParamsSchema,
  defaultCanHolderParams,
  getExposedHeight,
  getInnerDiameter,
  getOuterDiameter,
  getOuterHeight,
  getTopLand,
  sanitizeFilename,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'

describe('can holder schema', () => {
  it('preset da Coca-Cola 350 ml', () => {
    expect(CAN_DIAMETER).toBe(66.2)
    expect(CAN_HEIGHT).toBe(122.2)
    expect(CAN_VOLUME_ML).toBe(350)
  })

  it('defaults válidos e dimensões derivadas', () => {
    expect(canHolderParamsSchema.safeParse(defaultCanHolderParams).success).toBe(true)
    expect(getInnerDiameter(defaultCanHolderParams)).toBeCloseTo(67.8, 5)
    expect(getOuterDiameter(defaultCanHolderParams)).toBeCloseTo(72.6, 5)
    expect(getOuterHeight(defaultCanHolderParams)).toBeCloseTo(111.2, 5)
    expect(getExposedHeight(defaultCanHolderParams)).toBeCloseTo(14.2, 5)
    expect(getTopLand(defaultCanHolderParams)).toBeCloseTo(1.0, 5)
  })

  it('rejeita folga e furo fora da faixa', () => {
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, canClearance: 0.4 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, ventHoleDiameter: 15 }).success).toBe(false)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, cavityDepth: 119 }).success).toBe(false)
  })

  it('sanitiza o nome com fallback porta-lata', () => {
    expect(sanitizeFilename('Lata da Ana!')).toBe('Lata-da-Ana')
    expect(sanitizeFilename('')).toBe('porta-lata')
  })
})
```

**Step 2:** Run and confirm failure:
`npm run test -- tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts`
Expected: FAIL.

**Step 3: Implement**

```ts
import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'porta-lata' as const

export const CAN_DIAMETER = 66.2
export const CAN_HEIGHT = 122.2
export const CAN_TOP_DIAMETER = 54
export const CAN_VOLUME_ML = 350
export const MIN_EXPOSED_MM = 6
export const MIN_TOP_LAND_MM = 0.8
export const BASE_CHAMFER_MM = 0.4
export const CONTENT_DEPTH = 1
export const HOLDER_SEGMENTS = 128
export const HANDLE_RING_THICKNESS = 3.5
export const HANDLE_FIT_INTERFERENCE = 0.4
export const HANDLE_LOOP_INSET = 2.0
export const HANDLE_WRAP = (200 * Math.PI) / 180
export const MAX_TEXT_LENGTH = 20
export const MAX_TEXT_ARC = (120 * Math.PI) / 180
export const RELIEF_EMBED = 0.2
export const MINIMUM_WALL_MM = 1.8
export const MINIMUM_BOTTOM_MM = 2

export const FONT_STYLES = ['normal', 'bold', 'serif'] as const
export type FontStyle = (typeof FONT_STYLES)[number]

export const canHolderParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  cavityDepth: z.number().min(80).max(118),
  canClearance: z.number().min(0.5).max(1.2),
  wallThickness: z.number().min(MINIMUM_WALL_MM).max(4),
  bottomThickness: z.number().min(MINIMUM_BOTTOM_MM).max(6),
  ventHoleDiameter: z.number().min(6).max(14),
  rimLeadIn: z.number().min(0.5).max(2),
  rimChamfer: z.number().min(0).max(1.5),
  handleEnabled: z.boolean(),
  handleHeight: z.number().min(35).max(85),
  handleGap: z.number().min(24).max(40),
  handleReach: z.number().min(30).max(50),
  handleBand: z.number().min(5).max(10),
  handleWidth: z.number().min(8).max(16),
  handleClearance: z.number().min(0.2).max(0.5),
  text: z.string().refine(
    (value) => Array.from(value).length <= MAX_TEXT_LENGTH,
    { message: `O texto deve ter no máximo ${MAX_TEXT_LENGTH} caracteres.` },
  ),
  textSize: z.number().min(6).max(18),
  fontStyle: z.enum(FONT_STYLES),
  textCenterY: z.number().min(20).max(90),
  bodyColor: z.enum(PLA_COLORS),
  accentColor: z.enum(PLA_COLORS),
})

export type CanHolderParams = z.infer<typeof canHolderParamsSchema>

export const canHolderGeometryParamsSchema = canHolderParamsSchema.omit({
  bodyColor: true,
  accentColor: true,
})

export type CanHolderGeometryParams = z.infer<typeof canHolderGeometryParamsSchema>

export const defaultCanHolderParams: CanHolderParams = {
  productType: PRODUCT_TYPE,
  cavityDepth: 108,
  canClearance: 0.8,
  wallThickness: 2.4,
  bottomThickness: 3.2,
  ventHoleDiameter: 10,
  rimLeadIn: 1.0,
  rimChamfer: 0.4,
  handleEnabled: true,
  handleHeight: 60,
  handleGap: 30,
  handleReach: 40,
  handleBand: 6.5,
  handleWidth: 12,
  handleClearance: 0.3,
  text: 'Festa',
  textSize: 10,
  fontStyle: 'normal',
  textCenterY: 60,
  bodyColor: '#14b8a6',
  accentColor: '#f5f5f5',
}

export function getInnerDiameter(params: CanHolderGeometryParams): number {
  return CAN_DIAMETER + 2 * params.canClearance
}

export function getOuterRadius(params: CanHolderGeometryParams): number {
  return (getInnerDiameter(params) + 2 * params.wallThickness) / 2
}

export function getOuterDiameter(params: CanHolderGeometryParams): number {
  return getOuterRadius(params) * 2
}

export function getOuterHeight(params: CanHolderGeometryParams): number {
  return params.cavityDepth + params.bottomThickness
}

export function getExposedHeight(params: CanHolderGeometryParams): number {
  return CAN_HEIGHT - params.cavityDepth
}

export function getEffectiveLeadIn(params: CanHolderGeometryParams): number {
  return Math.max(0, Math.min(params.rimLeadIn, params.wallThickness - MIN_TOP_LAND_MM))
}

export function getEffectiveRimChamfer(params: CanHolderGeometryParams): number {
  return Math.max(
    0,
    Math.min(
      params.rimChamfer,
      params.wallThickness - getEffectiveLeadIn(params) - MIN_TOP_LAND_MM,
    ),
  )
}

export function getTopLand(params: CanHolderGeometryParams): number {
  return params.wallThickness - getEffectiveRimChamfer(params) - getEffectiveLeadIn(params)
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'porta-lata'
}
```

**Step 4:** Run and confirm PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/schema.ts \
  tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts
git commit -m "feat: add can holder schema and can preset"
```

---

## Task 3: Perfil do corpo com cavidade e furo de ventilação

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/shapes.ts`
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/buildBody.ts`
- Test: `tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildBody } from '@/features/studio/tools/lembrancinhas/porta-lata/buildBody'
import { bodyProfile } from '@/features/studio/tools/lembrancinhas/porta-lata/shapes'
import {
  CAN_DIAMETER,
  defaultCanHolderParams,
  getInnerDiameter,
  getOuterDiameter,
  getOuterHeight,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'
import { countShells, isClosed, signedVolume } from './geometryTestUtils'

describe('can holder body', () => {
  it('gera corpo fechado, single-shell, com o furo passante', () => {
    const geometry = buildBody(defaultCanHolderParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(getOuterHeight(defaultCanHolderParams), 3)
    expect(box.max.x).toBeCloseTo(getOuterDiameter(defaultCanHolderParams) / 2, 2)
    expect(isClosed(geometry)).toBe(true)
    expect(countShells(geometry)).toBe(1)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('a cavidade aceita a lata com a folga pedida', () => {
    expect(getInnerDiameter(defaultCanHolderParams)).toBeCloseTo(CAN_DIAMETER + 1.6, 5)
    const points = bodyProfile(defaultCanHolderParams)
    const inner = getInnerDiameter(defaultCanHolderParams) / 2
    expect(points.some((point) => Math.abs(point.x - inner) < 1e-6)).toBe(true)
  })

  it('o furo de ventilação tem o diâmetro pedido', () => {
    const points = bodyProfile(defaultCanHolderParams)
    expect(points.some((point) => Math.abs(point.x - 5) < 1e-6)).toBe(true)
  })

  it('a borda de entrada deixa parede mínima no topo', () => {
    const geometry = buildBody(defaultCanHolderParams)
    const points = bodyProfile(defaultCanHolderParams)
    const top = points.filter((point) => Math.abs(point.y - getOuterHeight(defaultCanHolderParams)) < 1e-6)
    expect(top.length).toBeGreaterThanOrEqual(2)
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })
})
```

**Step 2:** Run and confirm failure.

**Step 3: Implement the profile in `shapes.ts`**

```ts
import { Vector2 } from 'three'
import {
  BASE_CHAMFER_MM,
  CAN_DIAMETER,
  getEffectiveLeadIn,
  getEffectiveRimChamfer,
  getInnerDiameter,
  getOuterHeight,
  getOuterRadius,
  type CanHolderGeometryParams,
} from './schema'

const DEDUPE_EPSILON = 1e-6

export function dedupePoints(points: Vector2[]): Vector2[] {
  const result: Vector2[] = []
  for (const point of points) {
    const last = result[result.length - 1]
    if (!last || last.distanceTo(point) > DEDUPE_EPSILON) result.push(point)
  }
  return result
}

export function bodyProfile(params: CanHolderGeometryParams): Vector2[] {
  const outerR = getOuterRadius(params)
  const innerR = getInnerDiameter(params) / 2
  const ventR = params.ventHoleDiameter / 2
  const height = getOuterHeight(params)
  const leadIn = getEffectiveLeadIn(params)
  const chamfer = getEffectiveRimChamfer(params)
  const base = Math.min(BASE_CHAMFER_MM, outerR * 0.2)

  return dedupePoints([
    new Vector2(ventR, 0),
    new Vector2(outerR - base, 0),
    new Vector2(outerR, base),
    new Vector2(outerR, height - chamfer),
    new Vector2(outerR - chamfer, height),
    new Vector2(innerR + leadIn, height),
    new Vector2(innerR, height - leadIn),
    new Vector2(innerR, params.bottomThickness),
    new Vector2(ventR, params.bottomThickness),
    new Vector2(ventR, 0),
  ])
}
```

**Step 4: Update `buildBody.ts`**

```ts
import { BufferGeometry, LatheGeometry } from 'three'
import { bodyProfile } from './shapes'
import { HOLDER_SEGMENTS, type CanHolderGeometryParams } from './schema'
import { removeDegenerateTriangles } from './geometryCleanup'

export function buildBody(params: CanHolderGeometryParams): BufferGeometry {
  const geometry = new LatheGeometry(bodyProfile(params), HOLDER_SEGMENTS)
  return removeDegenerateTriangles(geometry)
}
```

**Step 5:** Run and confirm PASS.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/shapes.ts \
  src/features/studio/tools/lembrancinhas/porta-lata/buildBody.ts \
  tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts
git commit -m "feat: build can holder body with vent hole"
```

---

## Task 4: Adaptar o relevo ao corpo cilíndrico

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/buildRelief.ts`
- Test: `tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts`

**Changes:**
- Trocar `getBodyOuterRadius(params, y)` por `getOuterRadius(params)` (constante).
- Trocar `getEffectiveRimChamfer` e a altura do corpo por `getOuterHeight(params)`.
- Manter `fitRelief`, subdivisão conforme, 1 mm visível, 0,2 mm embutido,
  arco de 120° e posição a 180°.
- O `clampCenterY` usa `getOuterHeight(params)` e
  `getEffectiveRimChamfer(params)`.

**Tests:** adaptar os testes existentes; adicionar um caso de clipping vertical
com `textCenterY: 90` e um caso de arco máximo. Rodar e commitar:

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/buildRelief.ts \
  tests/features/studio/tools/lembrancinhas/porta-lata/buildRelief.test.ts
git commit -m "refactor: curve can holder relief on cylindrical body"
```

---

## Task 5: Adaptar a alça ao corpo cilíndrico

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/shapes.ts`
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/buildHandle.ts`
- Test: `tests/features/studio/tools/lembrancinhas/porta-lata/buildHandle.test.ts`

**Changes:**
- `getHandleMetrics` usa `getOuterRadius(params)` (constante).
- `getBandInnerRadius` mantém o offset quadrático sobre o raio constante.
- `getLoopLeftX` usa `getOuterRadius(params) + handleClearance +
  HANDLE_LOOP_INSET`; o laço fica com a borda esquerda vertical.
- `buildHandle` mantém o `steps: 8`, CDT e a limpeza.
- Ajustar os testes de folga, sobreposição, furo da mão, single-shell e
  extremos para a altura externa de 111,2 mm.

Rodar e commitar:

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/shapes.ts \
  src/features/studio/tools/lembrancinhas/porta-lata/buildHandle.ts \
  tests/features/studio/tools/lembrancinhas/porta-lata/buildHandle.test.ts
git commit -m "refactor: fit can holder handle to cylindrical body"
```

---

## Task 6: `buildCanHolder`, união do relevo e spike

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.ts`
- Test: `tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts`

**Changes:**
- `buildCanHolder(params, font)` chama `buildBody` + `buildRelief` e une com
  `ADDITION`/CDT; a alça é separada.
- O corpo tem furo passante; a união do relevo não deve atrapalhar o furo.
- `disposeCanHolderResult`.
- Testes: corpo fechado/single-shell, alça fechada/single-shell, delta de volume
  do relevo (80–300 mm³), extremos (`cavityDepth 80/118`, clearance 0.5/1.2),
  `text: ''`, `handleEnabled: false`, tempo < 4 s.
- Rodar um probe de CSG com a lata? Não modelamos a lata; validar o furo com
  `isClosed`.

**Spike gate:** se o corpo com furo falhar, ajustar o perfil (o furo é o
último segmento do perfil) antes de seguir.

Commit:

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.ts \
  tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts
git commit -m "feat: assemble can holder body and relief"
```

---

## Task 7: Validação `can-*`

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.ts`
- Test: `tests/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.test.ts`

**Codes:**

```ts
export type CanHolderIssueCode =
  | 'can-cavity'
  | 'can-clearance'
  | 'can-vent'
  | 'can-rim'
  | 'can-wall'
  | 'can-bottom'
  | 'can-text-fit'
  | 'can-text-band'
  | 'can-handle-gap'
  | 'can-handle-reach'
  | 'can-handle-fit'
  | 'can-handle-band'
```

Regras:
- `can-cavity`: `getExposedHeight(params) < 6` → error.
- `can-clearance`: `< 0.5 || > 1.2` → warning (defensiva).
- `can-vent`: `ventHoleDiameter / 2 > innerRadius - 3` → error.
- `can-rim`: `wallThickness - rimChamfer - rimLeadIn < 0.8` → error (pedido,
  antes do clamp do perfil).
- `can-wall`: `< 1.8`; `can-bottom`: `< 2`.
- `can-text-fit`: estimativa 0,68 × size × length / outerRadius > 120°.
- `can-text-band`: centro ± `1,1 * textSize / 2 * fitScale` fora de
  `[bottomThickness + 2, outerHeight - effectiveChamfer - 2]`.
- Handle: thresholds atuais de 26 mm / 16 mm / `HANDLE_FIT_INTERFERENCE`;
  `can-handle-band` usa `outerHeight` e o vão completo do laço.
- Testes: defaults sem issues, lata exposta <6, topo fino, furo grande, texto
  fora da faixa, alça fora do corpo, alça desligada.
- Commit `feat: validate can holder fit`.

---

## Task 8: Worker, serialização e códigos `can-*`

**Files:**
- Modify: `workerGeometry.ts`, `workerClient.ts`, `buildCanHolder.worker.ts`
- Test: `workerGeometry.test.ts`, `workerClient.test.ts`

**Changes:**
- `CanHolderBuildResult { body, handle }`; serialização idêntica.
- `CanHolderErrorCode = 'can-invalid' | 'can-font' | 'can-csg' | 'can-build'`.
- O worker valida com `canHolderGeometryParamsSchema`, carrega a fonte e chama
  `buildCanHolder`.
- O hook mapeia os códigos para mensagens amigáveis.
- Testes de transferência, id/stale, códigos e dispose.
- Commit `feat: add can holder worker`.

---

## Task 9: Hook `useCanHolder`

**Files:**
- Modify: `useCanHolder.ts`
- Test: `useCanHolder.test.ts`

**Changes:**
- `CanHolderParams`/`CanHolderGeometryParams`; clamps:
  `cavityDepth` 80–118, `canClearance` 0.5–1.2, `wallThickness` 1.8–4,
  `bottomThickness` 2–6, `ventHoleDiameter` 6–14, `rimLeadIn` 0.5–2,
  `rimChamfer` 0–1.5, handle e texto como hoje.
- `buildParams` sem cores; debounce 250 ms; worker factory; stale/dispose.
- `dimensions`: `{ width: outerDiameter, height: outerHeight, thickness: wallThickness }`.
- Expor `outerDiameter`, `outerHeight`, `exposedHeight` para o painel; remover
  `capacityMl`.
- `issues` de `validateCanHolder`; `builtParams`; câmera 210°.
- Testes: defaults/derivados, clamps, cor não rebuilda, falha mantém geometria,
  issues, reset, dimensões/fitRadius com alça.
- Commit `feat: add can holder state hook`.

---

## Task 10: Export STL

**Files:**
- Modify: `exportStl.ts`
- Test: `exportStl.test.ts`, `exportStl.binary.test.ts`

**Changes:**
- `exportCanHolderStl(result, projectName)` → `<nome>-corpo.stl`,
  `<nome>-alca.stl`.
- Corpo e alça em pé, sem rotação; clones; `try/finally`.
- Testes: nomes, alça desligada, base y=0, alça em pé, binário real, falhas.
- Commit `feat: export can holder stls`.

---

## Task 11: Painel

**Files:**
- Modify: `StudioPanel.tsx`
- Test: `StudioPanel.test.tsx`

**Changes:**
- Acordeões Corpo/Alça/Personalização/Aparência/Validação.
- Corpo: `cavityDepth`, `canClearance`, `wallThickness`, `bottomThickness`,
  `ventHoleDiameter`, `rimLeadIn`, `rimChamfer`; mostrar:
  `Lata 350 ml · Ø66,2 × 122,2 mm`,
  `Diâmetro externo: 72,6 mm`, `Altura externa: 111,2 mm`,
  `Altura exposta: 14,2 mm`.
- Alça: mesmos sliders, switch e hint.
- Personalização/Aparência/Validação como hoje.
- Testes de ranges, derivados, switch, cores e issues.
- Commit `feat: add can holder panel`.

---

## Task 12: Preview e integração

**Files:**
- Modify: `CanHolderPreview.tsx`, `ToolSelector.tsx`, `StudioPage.tsx`
- Test: `CanHolderPreview.test.tsx`, `ToolSelector.test.tsx`, `StudioPage.test.tsx`

**Changes:**
- Preview com body/handle e duas cores.
- ToolSelector: `ToolId` `'porta-lata'`, card **Porta-lata**, ícone 🥤,
  descrição `Porta-lata 350 ml com nome em relevo e alça removível`.
- StudioPage: lazy imports, `CanHolderToolWrapper`, `activeTool === 'porta-lata'`,
  viewport/status bar, export `exportCanHolderStl`, `productType` do worker
  `'porta-lata'`.
- Testes: card, abrir, `Gerando…`, dimensões `72,6 × 111,2 × 2,4 mm`, export,
  falha, voltar.
- Commit `feat: wire can holder into studio`.

---

## Task 13: Documentação e verificação final

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/porta-lata/AGENTS.md`
- Modify: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modify: `AGENTS.md` (rota)
- Modify: `docs/frontend/studio.md`
- Modify: `docs/plans/2026-11-17-porta-lata-design.md`
- Add a nota histórica em
  `docs/plans/2026-11-17-caneca-personalizada-design.md`

**Changes:**
- AGENTS do porta-lata: status implementada, parâmetros, regras de encaixe,
  pipeline, validação, decisões, fora de escopo.
- Categoria: remover `caneca-personalizada`, adicionar `porta-lata`.
- Rota raiz: `porta-lata`.
- `docs/frontend/studio.md`: substituir a seção Caneca pela Porta-lata; atualizar
  a lista, tabela de arquivos e decisões.
- Nota histórica nos docs antigos: "substituída por porta-lata em 2026-11-17".
- Rodar `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
- Varredura final:
  `rg -n "caneca|Caneca|Mug|mug" src tests docs/frontend/studio.md`
  (esperado apenas docs históricos).
- Commit `docs: document can holder tool`.

---

## Critérios de conclusão

- Card **Porta-lata** em Lembrancinhas; o card Caneca não existe.
- Corpo padrão: cavidade 108 mm, interna 67,8 mm, externa 72,6 mm, altura externa
  111,2 mm, lata exposta 14,2 mm, furo de 10 mm.
- A lata de 66,2 × 122,2 mm entra e apoia no fundo; a malha é fechada e
  single-shell.
- Alça e relevo de 1 mm funcionam; dois STLs exportados.
- Validação `can-*` sem bloquear; typecheck, lint, testes e build passam.
- Docs e AGENTS atualizados; histórico da caneca preservado.
