# Rolo de Textura — Implementation Plan

> **For agent:** REQUIRED SUB-SKILL: use superpowers:executing-plans (ou subagent-driven-development) para executar task-a-task.
> **Workspace:** trabalhar na `main` atual; commitar **apenas** os arquivos da ferramenta `rolo-textura` e docs relacionados (não incluir as demais alterações pendentes do working tree).
> **Verificação:** usar `npx vitest run --exclude '**/.worktrees/**'` (o `npm test` puro coleta os testes do worktree antigo `.worktrees/feat/segmentacao-agents`, que falham — problema pré-existente).
> **Revisão (2026-10-21):** cabos/eixos laterais removidos. O rolo é um cilindro fechado com tampas planas e filetes de 1mm (`END_FILLET_MM`); o comprimento total é `length`. As tasks abaixo são o registro histórico da execução inicial.

**Goal:** Implementar a ferramenta Rolo de Textura (cilindro fechado manifold, sem cabos, relevo saliente contínuo) no Studio.

**Architecture:** Malha única fechada por revolução do perfil (corpo + cabos) com deslocamento radial dado por campo de altura derivado de uma máscara de padrão rasterizada. Build puro em Web Worker; hook com reducer + Zod + debounce; preview R3F com dois materiais (grupos); export STL binário.

**Tech Stack:** React 19, TS strict, Three.js, @react-three/fiber, Zod, js-clipper (via `shared/svgToIconShape`), Vitest.

**Referência de padrão:** `src/features/studio/tools/confeitaria/cortador-carimbo/` e `topo-bolo`.

---

## Constantes e convenções

- Eixo do rolo em **X**: corpo em `[-L/2, L/2]`; cabos para `±(L/2..L/2+25)`.
- `HANDLE_DIAMETER_MM = 8` (raio 4), `HANDLE_LENGTH_MM = 25`, `HANDLE_FILLET_MM = 2`.
- `MESH_STEP_MM = 0.3`; `RELIEF_BEVEL_MM = 0.2`; `MIN_FEATURE_MM = 0.8`; `EDGE_MARGIN_MM = 1`.
- Célula por densidade: low 12, medium 8, high 5 mm. `nCols = round(2πR/célula)`, `nRows = round(L/célula)`.
- Motivos em coordenadas de célula `[-0.5, 0.5]²`; contínuos (`waves`, `chevrons`) tocam as bordas em X.
- Cores: 10 PLA (mesma lista do `cortador-carimbo`). Ícone do card: `🍥`.

---

## Task 0: Gravar design + plano e commitar

**Files:** Create `docs/plans/2026-10-19-rolo-textura-design.md`, `docs/plans/2026-10-19-rolo-textura-implementation.md`.

Commit:
```bash
git add docs/plans/2026-10-19-rolo-textura-design.md docs/plans/2026-10-19-rolo-textura-implementation.md
git commit -m "docs(rolo-textura): registra design e plano de implementação"
```

---

## Task 1: `schema.ts`

**Files:** Create `src/features/studio/tools/confeitaria/rolo-textura/schema.ts`; Test `tests/features/studio/tools/confeitaria/rolo-textura/schema.test.ts`.

**Step 1: teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import {
  textureRollerParamsSchema, defaultTextureRollerParams, sanitizeFilename,
  DENSITY_CELL_MM, defaultMotifForFamily,
} from '@/features/studio/tools/confeitaria/rolo-textura/schema'

describe('rolo-textura schema', () => {
  it('defaults válidos', () => {
    expect(textureRollerParamsSchema.safeParse(defaultTextureRollerParams).success).toBe(true)
    expect(defaultTextureRollerParams).toMatchObject({
      productType: 'texture-roller', length: 100, diameter: 30,
      patternFamily: 'geometric', patternMotif: 'diamonds',
      patternSource: 'motif', reliefDepth: 1, density: 'medium',
    })
  })
  it('rejeita motivo fora da família', () => {
    const bad = { ...defaultTextureRollerParams, patternFamily: 'floral' as const, patternMotif: 'dots' }
    expect(textureRollerParamsSchema.safeParse(bad).success).toBe(false)
  })
  it('exige svg quando patternSource=svg', () => {
    const bad = { ...defaultTextureRollerParams, patternSource: 'svg' as const, svgIcon: null }
    expect(textureRollerParamsSchema.safeParse(bad).success).toBe(false)
  })
  it('limita dimensões e profundidade', () => {
    expect(textureRollerParamsSchema.safeParse({ ...defaultTextureRollerParams, length: 49 }).success).toBe(false)
    expect(textureRollerParamsSchema.safeParse({ ...defaultTextureRollerParams, diameter: 41 }).success).toBe(false)
    expect(textureRollerParamsSchema.safeParse({ ...defaultTextureRollerParams, reliefDepth: 2.1 }).success).toBe(false)
  })
  it('sanitizeFilename', () => {
    expect(sanitizeFilename('Rolo de Textura!')).toBe('Rolo_de_Textura_')
    expect(sanitizeFilename('')).toBe('rolo-textura')
  })
  it('defaultMotifForFamily e densidades', () => {
    expect(defaultMotifForFamily('floral')).toBe('flower')
    expect(DENSITY_CELL_MM.high).toBe(5)
  })
})
```

**Step 3: implementação**

```ts
import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const
export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'texture-roller' as const

export const HANDLE_DIAMETER_MM = 8
export const HANDLE_LENGTH_MM = 25
export const HANDLE_FILLET_MM = 2
export const MESH_STEP_MM = 0.3
export const RELIEF_BEVEL_MM = 0.2
export const MIN_FEATURE_MM = 0.8
export const EDGE_MARGIN_MM = 1

export const PATTERN_FAMILIES = ['geometric', 'wave', 'floral'] as const
export type PatternFamily = (typeof PATTERN_FAMILIES)[number]

export const MOTIFS_BY_FAMILY = {
  geometric: ['diamonds', 'dots', 'grid'],
  wave: ['waves', 'chevrons', 'scales'],
  floral: ['flower', 'leaf', 'rosette'],
} as const satisfies Record<PatternFamily, readonly string[]>

export type PatternMotif = (typeof MOTIFS_BY_FAMILY)[PatternFamily][number]

export const DENSITIES = ['low', 'medium', 'high'] as const
export type Density = (typeof DENSITIES)[number]
export const DENSITY_CELL_MM: Record<Density, number> = { low: 12, medium: 8, high: 5 }

export const PATTERN_SOURCES = ['motif', 'svg'] as const
export type PatternSource = (typeof PATTERN_SOURCES)[number]

export function defaultMotifForFamily(family: PatternFamily): PatternMotif {
  return MOTIFS_BY_FAMILY[family][0]
}

export const textureRollerParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  length: z.number().min(50).max(150),
  diameter: z.number().min(20).max(40),
  patternFamily: z.enum(PATTERN_FAMILIES),
  patternMotif: z.string(),
  patternSource: z.enum(PATTERN_SOURCES),
  svgIcon: z.string().nullable(),
  reliefDepth: z.number().min(0.5).max(2),
  density: z.enum(DENSITIES),
  rollerColor: z.enum(PLA_COLORS),
  reliefColor: z.enum(PLA_COLORS),
}).refine(
  (d) => (MOTIFS_BY_FAMILY[d.patternFamily] as readonly string[]).includes(d.patternMotif),
  { message: 'Motivo inválido para a família', path: ['patternMotif'] },
).refine(
  (d) => d.patternSource !== 'svg' || d.svgIcon !== null,
  { message: 'Envie um SVG', path: ['svgIcon'] },
)

export type TextureRollerParams = z.infer<typeof textureRollerParamsSchema>

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'rolo-textura'
}

export const defaultTextureRollerParams: TextureRollerParams = {
  productType: PRODUCT_TYPE,
  length: 100,
  diameter: 30,
  patternFamily: 'geometric',
  patternMotif: defaultMotifForFamily('geometric'),
  patternSource: 'motif',
  svgIcon: null,
  reliefDepth: 1,
  density: 'medium',
  rollerColor: '#22c55e',
  reliefColor: '#f5f5f5',
}
```

**Step 5:** commit `feat(rolo-textura): adiciona schema, constantes e defaults`.

---

## Task 2: `patterns.ts` (9 motivos)

**Files:** Create `src/features/studio/tools/confeitaria/rolo-textura/patterns.ts`; Test `.../patterns.test.ts`.

**Step 1: teste**

```ts
import { describe, it, expect } from 'vitest'
import { motifShapes, isStaggered } from '@/features/studio/tools/confeitaria/rolo-textura/patterns'
import { MOTIFS_BY_FAMILY } from '@/features/studio/tools/confeitaria/rolo-textura/schema'

const allPoints = (shapes: ReturnType<typeof motifShapes>) =>
  shapes.flatMap((s) => [...s.outer, ...s.holes.flat()])

describe('patterns', () => {
  for (const [family, motifs] of Object.entries(MOTIFS_BY_FAMILY)) {
    for (const motif of motifs) {
      it(`${family}/${motif} tem geometria dentro da célula`, () => {
        const shapes = motifShapes(family as never, motif as never)
        expect(shapes.length).toBeGreaterThan(0)
        for (const p of allPoints(shapes)) {
          expect(p.x).toBeGreaterThanOrEqual(-0.5)
          expect(p.x).toBeLessThanOrEqual(0.5)
          expect(p.y).toBeGreaterThanOrEqual(-0.5)
          expect(p.y).toBeLessThanOrEqual(0.5)
        }
      })
    }
  }
  it('grid tem furo interno', () => {
    expect(motifShapes('geometric', 'grid')[0].holes.length).toBe(1)
  })
  it('ondas e chevrons tocam a borda em X (continuidade)', () => {
    for (const m of ['waves', 'chevrons'] as const) {
      const xs = allPoints(motifShapes('wave', m)).map((p) => p.x)
      expect(Math.min(...xs)).toBeCloseTo(-0.5, 5)
      expect(Math.max(...xs)).toBeCloseTo(0.5, 5)
    }
  })
  it('marca stagger', () => {
    expect(isStaggered('diamonds')).toBe(true)
    expect(isStaggered('grid')).toBe(false)
  })
})
```

**Step 3: implementação** — `Point2`, `MotifShape`, builders `circle`, `rose`, `waveBand`, `lens`, `halfDisk`; `MOTIF_BUILDERS` para os 9 motivos; `STAGGERED`; `motifShapes(family, motif)` e `isStaggered(motif)`. Coordenadas em `[-0.42, 0.42]` (com folga), exceto `waves`/`chevrons` que atingem `±0.5` em X. `grid` com 1 furo. (Código completo conforme o plano aprovado.)

**Step 5:** commit `feat(rolo-textura): adiciona motivos das famílias geométrico, ondulado e floral`.

---

## Task 3: `buildTextureRoller.ts` — máscara + campo de altura

**Files:** Create `.../buildTextureRoller.ts`; Test `.../buildHeightField.test.ts`.

**Step 1: teste**

```ts
import { describe, it, expect } from 'vitest'
import { buildHeightField } from '@/features/studio/tools/confeitaria/rolo-textura/buildTextureRoller'
import { defaultTextureRollerParams, DENSITY_CELL_MM } from '@/features/studio/tools/confeitaria/rolo-textura/schema'

describe('buildHeightField', () => {
  it('gera máscara com picos na profundidade e zeros nas margens axiais', () => {
    const { height, cols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    expect(cols).toBeGreaterThan(20)
    expect(bodyRows).toBeGreaterThan(20)
    expect(Math.max(...height)).toBeCloseTo(defaultTextureRollerParams.reliefDepth, 2)
    expect(height[0]).toBe(0)
    expect(height[(bodyRows - 1) * cols]).toBe(0)
  })
  it('fecha a costura: coluna 0 e última iguais', () => {
    const { height, cols, bodyRows } = buildHeightField(defaultTextureRollerParams)
    for (let r = 0; r < bodyRows; r++) {
      expect(Math.abs(height[r * cols] - height[r * cols + cols - 1])).toBeLessThan(0.01)
    }
  })
  it('muda com a densidade (alta tem mais células)', () => {
    const low = buildHeightField({ ...defaultTextureRollerParams, density: 'low' })
    const high = buildHeightField({ ...defaultTextureRollerParams, density: 'high' })
    expect(high.cols).toBeGreaterThan(low.cols)
    expect(DENSITY_CELL_MM.high).toBe(5)
  })
  it('modo svg sem parsedSvg não lança e devolve zeros', () => {
    const { height } = buildHeightField({ ...defaultTextureRollerParams, patternSource: 'svg', svgIcon: '<svg/>' }, null)
    expect(Math.max(...height)).toBe(0)
  })
})
```

**Step 3: implementação** — `HeightField`; `svgMotifShapes` (normaliza para 88% da célula via `svgShapesFromParsed`/`svgBoundsFromParsed`); `rasterizeShapes` (scanline even-odd, wrap periódico em X); `buildHeightField` (calcula `nCols/nRows`, aloca máscara, rasteriza por célula com stagger, zera margens axiais, aplica chanfro); `applyBevel` e `distTo` (chamfer 2-pass com pesos `dU`/`dV` e wrap em X).

**Step 5:** commit `feat(rolo-textura): campo de altura com máscara, chanfro e fechamento de costura`.

---

## Task 4: `buildTextureRoller.ts` — malha de revolução

**Files:** Modify `.../buildTextureRoller.ts`; Test `.../buildTextureRoller.test.ts`.

**Step 1: teste** — gera malha indexada com 2 grupos; dimensões (`length + 2*HANDLE_LENGTH_MM`, raio máx `D/2 + reliefDepth`); malha fechada (cada aresta em 2 triângulos). (Código completo conforme plano aprovado.)

**Step 3: implementação** — `AXLE_RADIUS`; `ProfileSample`; `buildProfile` (corpo + filete `smoothstep` + eixo + ponta hemisférica, ordenado por X); `buildTextureRoller` (anéis/apex, deslocamento radial no corpo, índices separando corpo/relevo, `addGroup`, `computeVertexNormals`).

**Step 5:** commit `feat(rolo-textura): gera malha única do rolo com relevo e dois grupos de material`.

---

## Task 5: Worker

**Files:** Create `.../workerGeometry.ts`, `.../workerClient.ts`, `.../buildTextureRoller.worker.ts`; Test `.../workerGeometry.test.ts`.

**Step 1: teste** — roundtrip `serializeGeometry`/`deserializeGeometry`.

**Step 3: implementação** — `SerializedGeometry`; worker recebe `{ id, params, parsedSvg }`, roda o build, serializa `{ roller }` com transfer; `workerClient` expõe `GeometryWorker.build(params, parsedSvg, onResult, onError)`.

**Step 5:** commit `feat(rolo-textura): executa o build em Web Worker com geometria serializada`.

---

## Task 6: `useTextureRoller.ts`

**Files:** Create `.../useTextureRoller.ts`; Test `.../useTextureRoller.test.ts`.

**Step 1: teste** — workerFactory injetável; debounce; clamp de `reliefDepth`; troca de família ajusta motivo; reset.

**Step 3: implementação** — reducer (`update`/`setSvg`/`reset`) com clamp `length` 50–150, `diameter` 20–40, `reliefDepth` 0.5–2; troca de `patternFamily` define `patternMotif = defaultMotifForFamily`; validação Zod tolerante a estados transitórios (`patternSource`/`patternFamily`/`patternMotif`); efeito com debounce 200 ms, parse SVG cacheado na main thread, worker; `dimensions`/`objectBounds`/`fitRadius`/`cameraPosition`.

**Step 5:** commit `feat(rolo-textura): hook de estado com reducer, Zod, debounce e worker`.

---

## Task 7: `exportStl.ts`

**Files:** Create `.../exportStl.ts`; Test `.../exportStl.test.ts`.

**Step 3: implementação** — `exportTextureRollerStl(geometry, projectName)` com `STLExporter` binário e `sanitizeFilename`.

**Step 5:** commit `feat(rolo-textura): exporta STL binário do rolo`.

---

## Task 8: `StudioPanel.tsx`

**Files:** Create `.../StudioPanel.tsx`; Test `.../StudioPanel.test.tsx`.

**Step 3: implementação** — Accordion: **Padrão** (família, motivo, densidade, profundidade, origem `motif`/`svg` + upload), **Dimensões** (comprimento, diâmetro, comprimento total), **Aparência** (cor do rolo, cor do relevo). Reutilizar `ColorSwatches`/`LabeledSlider` no estilo do cortador. Botão Restaurar.

**Step 5:** commit `feat(rolo-textura): painel de parâmetros (padrão, dimensões, aparência)`.

---

## Task 9: `TextureRollerPreview.tsx`

**Files:** Create `.../TextureRollerPreview.tsx`; Test `.../TextureRollerPreview.test.tsx`.

**Step 3: implementação** — `mesh` com `geometry.roller` e `meshStandardMaterial` em `attach="material-0"`/`"material-1"`; `null` sem geometria.

**Step 5:** commit `feat(rolo-textura): preview R3F com cores de rolo e relevo`.

---

## Task 10: Integração (`ToolSelector` + `StudioPage`)

**Files:** Modify `src/features/studio/components/ToolSelector.tsx` (working tree atual, com categorias); modify `src/features/studio/StudioPage.tsx`; modify `tests/features/studio/components/ToolSelector.test.tsx` (Confeitaria 4 → 5) e `tests/features/studio/StudioPage.test.tsx` (import eager do painel + card).

**Step 1: teste** — card "Rolo de Textura" na seção Confeitaria emitindo `'rolo-textura'`.

**Step 3: implementação** — `ToolId` ganha `'rolo-textura'`; `ToolCard` `{ name: 'Rolo de Textura', icon: '🍥', category: 'Confeitaria' }`; `StudioPage`: imports do hook/export, `React.lazy` de painel e preview, `RoloTexturaToolWrapper` (topbar, `isBuilding`, `error`, painel, viewport com `fitRadius`) e rota.

**Step 5:** commit `feat(rolo-textura): integra ferramenta ao seletor e ao StudioPage`.

---

## Task 11: Docs + verificação final

**Files:** Modify `src/features/studio/tools/confeitaria/rolo-textura/AGENTS.md` (Status → Implementada), `src/features/studio/tools/confeitaria/AGENTS.md` (status), `docs/frontend/studio.md`.

**Step 1:** atualizar os docs.
**Step 2:**

```bash
npm run typecheck
npm run lint
npx vitest run --exclude '**/.worktrees/**'
```

**Step 3:** commit `docs(rolo-textura): atualiza AGENTS e documentação do Studio`.

---

## Definition of Done
- `npm run typecheck`, `npm run lint` e `npx vitest run --exclude '**/.worktrees/**'` sem erros.
- Rolo é uma malha fechada (teste de arestas), sem costura, relevo somente externo com arestas chanfradas.
- Comprimento total `L + 50`; raio máximo `D/2 + reliefDepth`.
- 9 motivos + SVG repetido; densidade baixa/média/alta; 10 cores PLA.
- Integração no `ToolSelector` e `StudioPage`; docs atualizadas; sem código morto/TODO.
