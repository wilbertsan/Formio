# Caixa Personalizada Rename Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Renomear a ferramenta atual de Termoformador para Caixa Personalizada, recriar o spec planejado do Termoformador e atualizar código, testes, seletor, StudioPage e documentação.

**Architecture:** Renomeação mecânica com `git mv` e substituição guiada de símbolos, seguida de ajustes de labels/exportação, integração no seletor/StudioPage e documentação. A geometria, o worker e o comportamento funcional não mudam.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Amplify UI, Vitest, Vite.

**Design aprovado:** `docs/plans/2026-11-13-caixa-personalizada-rename-design.md`

---

## Mapa de nomes

| Atual | Novo |
|---|---|
| Pasta `termoformador` (src e tests) | `caixa-personalizada` |
| `ThermoformerPreview.tsx` | `BoxPreview.tsx` |
| `buildThermoformer.ts` | `buildBox.ts` |
| `buildThermoformer.worker.ts` | `buildBox.worker.ts` |
| `useThermoformer.ts` | `useBox.ts` |
| `validateThermoformer.ts` | `validateBox.ts` |
| `ThermoformerParams` | `BoxParams` |
| `ThermoformerGeometryParams` | `BoxGeometryParams` |
| `thermoformerParamsSchema` | `boxParamsSchema` |
| `defaultThermoformerParams` | `defaultBoxParams` |
| `BuildThermoformerResult` | `BuildBoxResult` |
| `buildThermoformer` | `buildBox` |
| `disposeThermoformerResult` | `disposeBoxResult` |
| `ThermoformerWorker` | `BoxWorker` |
| `createThermoformerWorker` | `createBoxWorker` |
| `UseThermoformerOptions` / `UseThermoformerResult` | `UseBoxOptions` / `UseBoxResult` |
| `useThermoformer` | `useBox` |
| `ThermoformerIssueCode` | `BoxIssueCode` |
| `validateThermoformer` | `validateBox` |
| `exportThermoformerStl` | `exportBoxStl` |
| `TermoformadorToolWrapper` | `BoxToolWrapper` |
| `TermoformadorTool` / `TermoformadorPreview` | `BoxTool` / `BoxPreview` |
| `productType: 'termoformador'` | `'caixa-personalizada'` |
| `ToolId: 'termoformador'` | `'caixa-personalizada'` |
| UI "Termoformador" | "Caixa Personalizada" |
| UI "Pino lateral" | "Puxador lateral" |
| UI "Painel frontal" | "Painel decorativo" |
| Export `-pino.stl` | `-puxador.stl` |

Chaves técnicas `handle*`, `frontPanel*` e `rim*` permanecem no schema.

---

## Task 1: Mover pastas/arquivos e renomear símbolos

**Files:**
- Move: `src/features/studio/tools/lembrancinhas/termoformador` → `.../caixa-personalizada`
- Move: `tests/features/studio/tools/lembrancinhas/termoformador` → `.../caixa-personalizada`
- Rename files listed in the map.
- Modify: `src/features/studio/StudioPage.tsx`, `src/features/studio/components/ToolSelector.tsx`
- Modify: tests under the moved folders, `StudioPage.test.tsx`, `ToolSelector.test.tsx`

**Step 1: Move folders and files**

```bash
git mv src/features/studio/tools/lembrancinhas/termoformador src/features/studio/tools/lembrancinhas/caixa-personalizada
git mv tests/features/studio/tools/lembrancinhas/termoformador tests/features/studio/tools/lembrancinhas/caixa-personalizada

cd src/features/studio/tools/lembrancinhas/caixa-personalizada
git mv ThermoformerPreview.tsx BoxPreview.tsx
git mv buildThermoformer.ts buildBox.ts
git mv buildThermoformer.worker.ts buildBox.worker.ts
git mv useThermoformer.ts useBox.ts
git mv validateThermoformer.ts validateBox.ts

cd /opt/projects/BELIS3D/tests/features/studio/tools/lembrancinhas/caixa-personalizada
git mv ThermoformerPreview.test.tsx BoxPreview.test.tsx
git mv buildThermoformer.test.ts buildBox.test.ts
git mv useThermoformer.test.ts useBox.test.ts
git mv validateThermoformer.test.ts validateBox.test.ts
```

**Step 2: Replace symbols/imports in `src` and `tests`**

Run the following from the repo root. The order matters (longer names first):

```bash
files=$(grep -rlE 'termoformador|Termoformador|Thermoformer|thermoformer' src tests)
perl -pi -e '
  s/buildThermoformer\.worker/buildBox.worker/g;
  s/buildThermoformer/buildBox/g;
  s/ThermoformerPreview/BoxPreview/g;
  s/useThermoformer/useBox/g;
  s/validateThermoformer/validateBox/g;
  s/ThermoformerGeometryParams/BoxGeometryParams/g;
  s/ThermoformerParams/BoxParams/g;
  s/thermoformerParamsSchema/boxParamsSchema/g;
  s/defaultThermoformerParams/defaultBoxParams/g;
  s/BuildThermoformerResult/BuildBoxResult/g;
  s/disposeThermoformerResult/disposeBoxResult/g;
  s/ThermoformerWorker/BoxWorker/g;
  s/createThermoformerWorker/createBoxWorker/g;
  s/UseThermoformerOptions/UseBoxOptions/g;
  s/UseThermoformerResult/UseBoxResult/g;
  s/ThermoformerIssueCode/BoxIssueCode/g;
  s/exportThermoformerStl/exportBoxStl/g;
  s/TermoformadorToolWrapper/BoxToolWrapper/g;
  s/TermoformadorTool/BoxTool/g;
  s/TermoformadorPreview/BoxPreview/g;
  s/Thermoformer/Box/g;
  s/thermoformer/box/g;
  s/Termoformador/Caixa Personalizada/g;
  s/termoformador/caixa-personalizada/g;
' $files
```

Then inspect and fix the visible strings/tests:

- Any remaining `Termoformador` should become `Caixa Personalizada`.
- Any remaining `termoformador` should become `caixa-personalizada` in code/test paths.
- Card regex tests currently become `/caixa-personalizada/i`; change to `/caixa personalizada/i` (space, not hyphen).
- The StudioPage test WorkerMock branch should compare `productType` to `'caixa-personalizada'`.
- The export mock path should be `@/features/studio/tools/lembrancinhas/caixa-personalizada/exportStl`.
- The lazy/panel import path should be `.../caixa-personalizada/StudioPanel`.
- The preview import path should be `.../caixa-personalizada/BoxPreview`.

**Step 3: Scan for leftovers**

```bash
grep -rn "termoformador\|Termoformador\|Thermoformer\|thermoformer" src tests
```

Expected: no matches. If a match remains, fix it manually.

**Step 4: Run the tool-level tests**

```bash
npm run test -- tests/features/studio/tools/lembrancinhas/caixa-personalizada
```

Expected: all test files pass. The UI labels may still be old ("Pino lateral", etc.) and are handled in Task 2.

**Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: clean. Fix imports if the worker URL or lazy imports are stale.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename termoformador to caixa personalizada"
```

---

## Task 2: Labels da UI, mensagens e exportação

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/caixa-personalizada/StudioPanel.tsx`
- Modify: `src/features/studio/tools/lembrancinhas/caixa-personalizada/validateBox.ts`
- Modify: `src/features/studio/tools/lembrancinhas/caixa-personalizada/exportStl.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caixa-personalizada/StudioPanel.test.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/caixa-personalizada/exportStl.test.ts`

**Step 1: Update the panel test first**

In `StudioPanel.test.tsx`:
- Heading assertion: `Caixa Personalizada`.
- Section assertion: `Painel decorativo` instead of `Painel frontal`.
- Pino fields: `Habilitar puxador`, `Diâmetro do puxador`.
- Add `Tamanho da abertura` for the hole slider.
- Keep the existing conditional/logic assertions.

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caixa-personalizada/StudioPanel.test.tsx`
Expected: FAIL on the new labels.

**Step 2: Update `StudioPanel.tsx` labels**

- Heading: `Caixa Personalizada`.
- `Accordion.Item value="painel"` heading: `Painel decorativo`.
- `Pino lateral` heading → `Puxador lateral`.
- `Habilitar pino` → `Habilitar puxador`.
- `Diâmetro do pino` → `Diâmetro do puxador`.
- `Comprimento do pino` → `Comprimento do puxador`.
- `Diâmetro da base` → `Diâmetro da base do puxador`.
- `Diâmetro do furo` → `Tamanho da abertura`.
- Keep the note “Topo e fundo ficam para uma versão futura.”
- Keep the `Lateral` options `Esquerda`/`Direita`.

Run the panel test: expected PASS.

**Step 3: Update validation messages**

In `validateBox.ts`, replace user-facing “pino” with “puxador” and “painel frontal” with “painel decorativo” in messages where they refer to the UI. Keep issue codes unchanged. Examples:
- `O flange do pino invade a base...` → `O flange do puxador invade a base...`
- `O flange do pino invade a tampa...` → `O flange do puxador invade a tampa...`
- `Pino no topo/fundo...` → `Puxador no topo/fundo...`
- `O painel frontal invade...` → `O painel decorativo invade...`
- `...do pino é maior...` → `...do puxador é maior...`
- Keep `handle-side`, `handle-base-collision`, etc.

**Step 4: Update export filenames test first**

In `exportStl.test.ts`, change the expected file names from `-pino.stl` to `-puxador.stl`. Run:
`npm run test -- tests/features/studio/tools/lembrancinhas/caixa-personalizada/exportStl.test.ts`
Expected: FAIL on the old filename.

**Step 5: Update `exportStl.ts`**

Change the handle download suffix:
```ts
downloadStl(prepareHandleForPrint(result.handle, params), `${name}-puxador.stl`)
```
Keep the function names and technical keys.

Run both tests: expected PASS.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caixa-personalizada/StudioPanel.tsx \
  src/features/studio/tools/lembrancinhas/caixa-personalizada/validateBox.ts \
  src/features/studio/tools/lembrancinhas/caixa-personalizada/exportStl.ts \
  tests/features/studio/tools/lembrancinhas/caixa-personalizada/StudioPanel.test.tsx \
  tests/features/studio/tools/lembrancinhas/caixa-personalizada/exportStl.test.ts
git commit -m "feat: rename caixa labels and export"
```

---

## Task 3: Card da Caixa Personalizada no ToolSelector

**Files:**
- Modify: `src/features/studio/components/ToolSelector.tsx`
- Test: `tests/features/studio/components/ToolSelector.test.tsx`

**Step 1: Update the test first**

In `ToolSelector.test.tsx`:
- The Lembrancinhas card name becomes `Caixa Personalizada`.
- The click test asserts `onSelect('caixa-personalizada')`.
- The count remains 1 in Lembrancinhas.
- The section order remains `['Confeitaria','Letreiros','Lembrancinhas']`.

Run: `npm run test -- tests/features/studio/components/ToolSelector.test.tsx`
Expected: FAIL on the old card/id.

**Step 2: Update `ToolSelector.tsx`**

- `ToolId` includes `'caixa-personalizada'` (remove `'termoformador'`).
- Card:
```ts
{
  id: 'caixa-personalizada',
  name: 'Caixa Personalizada',
  description: 'Caixa 3D personalizável com tampa, painel decorativo, puxador lateral e base',
  icon: '📦',
  category: 'Lembrancinhas',
},
```
- Keep the category order and counts.

Run: expected PASS.

**Step 3: Commit**

```bash
git add src/features/studio/components/ToolSelector.tsx \
  tests/features/studio/components/ToolSelector.test.tsx
git commit -m "feat: add caixa personalizada card"
```

---

## Task 4: Integração no StudioPage

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Update the test first**

In `StudioPage.test.tsx`:
- Eager import: `@/features/studio/tools/lembrancinhas/caixa-personalizada/StudioPanel`.
- Card regex: `/caixa personalizada/i`.
- Heading: level 2 `Caixa Personalizada`.
- Export mock import: `@/features/studio/tools/lembrancinhas/caixa-personalizada/exportStl`.
- WorkerMock branch: `request.params?.productType === 'caixa-personalizada'`.
- Test descriptions: “abre a ferramenta Caixa Personalizada”, “mostra Gerando… na Caixa Personalizada”, “exporta a Caixa Personalizada com os parâmetros do build”, “mostra erro quando a exportação da Caixa Personalizada falha”.
- Keep the existing builtParams/export/Lateral assertions.

Run: `npm run test -- tests/features/studio/StudioPage.test.tsx`
Expected: FAIL on the old card/heading/import.

**Step 2: Update `StudioPage.tsx`**

- Imports:
```tsx
import { useBox } from './tools/lembrancinhas/caixa-personalizada/useBox'
import { exportBoxStl } from './tools/lembrancinhas/caixa-personalizada/exportStl'
```
- Lazy imports:
```tsx
const BoxTool = lazy(() =>
  import('./tools/lembrancinhas/caixa-personalizada/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const BoxPreview = lazy(() =>
  import('./tools/lembrancinhas/caixa-personalizada/BoxPreview').then((m) => ({
    default: m.BoxPreview,
  })),
)
```
- Rename `TermoformadorToolWrapper` (already `BoxToolWrapper` from the script) and use `useBox`, `exportBoxStl`, `BoxTool`, `BoxPreview`.
- `handleExport` still guards `geometry && builtParams` and passes `builtParams`.
- The branch:
```tsx
{activeTool === 'caixa-personalizada' && (
  <BoxToolWrapper onBack={() => setActiveTool(null)} />
)}
```
- Keep `resetAzimuth={30}` and `canExport={geometry !== null && builtParams !== null}`.

Run: expected PASS.

**Step 3: Run the full suite**

```bash
npm run test
```

Expected: 117 files / 1203+ tests pass.

**Step 4: Commit**

```bash
git add src/features/studio/StudioPage.tsx tests/features/studio/StudioPage.test.tsx
git commit -m "feat: integrate caixa personalizada into studio"
```

---

## Task 5: Documentação e legado

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/caixa-personalizada/AGENTS.md`
- Create: `src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md`
- Modify: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modify: `docs/frontend/studio.md`
- Rename: `docs/plans/2026-11-12-termoformador-design.md` → `docs/plans/2026-11-12-caixa-personalizada-design.md`
- Modify: `docs/plans/2026-11-12-termoformador.md` (historical note)

**Step 1: Rename the design**

```bash
git mv docs/plans/2026-11-12-termoformador-design.md docs/plans/2026-11-12-caixa-personalizada-design.md
```

Apply the mapping:
- `# Termoformador — Design` → `# Caixa Personalizada — Design`
- `**Ferramenta:** \`lembrancinhas/termoformador\`` → `lembrancinhas/caixa-personalizada`
- `Termoformador` → `Caixa Personalizada`
- `termoformador` → `caixa-personalizada` (paths)
- `Thermoformer` → `Box`
- `thermoformer` → `box`
- `Pino`/`pino` → `Puxador`/`puxador` in UI/export text
- `-pino` → `-puxador`

Keep the technical decisions and geometry sections; they describe the box.

**Step 2: Update `caixa-personalizada/AGENTS.md`**

- Title: `# Ferramenta: Caixa Personalizada`.
- Objetivo: “Gerar caixa modular personalizável com tampa, painel decorativo, puxador lateral e base, em peças separadas.”
- Rename `### Pino lateral` → `### Puxador lateral`.
- In rules/decisions, replace “pino” with “puxador” where it refers to the UI; keep `handle*` keys.
- Export list: `corpo`, `tampa`, `painel`, `puxador`, `base`.
- Add a note:
```md
> As chaves técnicas `handle*`, `frontPanel*` e `rim*` permanecem no schema;
> na UI, `handle` = puxador e `frontPanel` = painel decorativo.
```
- Keep the v1 decisions (base ring, lid cap, panel clipping, etc.) and change “pino” to “puxador” in the prose.

**Step 3: Create the planned Termoformador spec**

Create `src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md` with:

```md
# Ferramenta: Termoformador

## Status

Planejada.

## Objetivo

Gerar equipamento modular de termoformagem para produção de lembrancinhas, em
peças separadas: corpo, tampa, painel perfurado, pino lateral e base.

## Parâmetros previstos

### Dimensões

- `width`, `depth`: 60–300 mm
- `height`: 20–120 mm
- `corner_radius`: 0–40 mm
- `wall_thickness`: 1,2–6 mm
- `bottom_thickness`: 1,2–6 mm
- `rim_height`: 0–10 mm
- `rim_thickness`: 1,2–6 mm

### Acabamento

- `outer_fillet`, `inner_fillet`, `bottom_fillet`, `top_fillet`
- `edge_chamfer`: 0–3 mm

### Tampa

- `lid_enabled`
- `lid_thickness`: 1,2–6 mm
- `lid_height`: 0–30 mm
- `lid_clearance`: 0,1–0,6 mm
- `lid_corner_radius`: 0–40 mm
- `lid_fit_depth`: 2–20 mm
- `fit_type`: `external` ou `internal`

### Painel frontal

- `front_panel_width`, `front_panel_height`: 40–300 mm
- `front_panel_thickness`: 1–5 mm
- `front_panel_corner_radius`: 0–40 mm
- `border_width`: 3–20 mm
- `surface_curvature`: `flat`, `slightly_convex` ou `slightly_concave`

### Grade

- `pattern`: `perforated`, `grid` ou `mesh`
- `hole_diameter`: 0,8–6 mm
- `hole_spacing_x`, `hole_spacing_y`: 1–10 mm
- `grid_thickness`: 0,8–4 mm
- `grid_angle`: 0–90°

### Pino lateral

- `handle_enabled`
- `handle_diameter`: 3–20 mm
- `handle_length`: 5–60 mm
- `handle_base_diameter`: 4–30 mm
- `handle_tip_radius`: 0–5 mm
- `handle_side`: `left`, `right`, `top` ou `bottom`
- `handle_height`: posição relativa à altura do corpo

### Base inferior

- `base_enabled`
- `base_height`: 0–30 mm
- `base_thickness`: 1,2–6 mm
- `base_corner_radius`: 0–40 mm

### Impressão

- `nozzle_diameter`: padrão 0,4 mm
- `minimum_wall`: padrão 0,8 mm
- `minimum_feature`: padrão 0,8 mm
- `print_clearance`: padrão 0,2–0,3 mm

## Regras do domínio

- Corpo é um sólido único com cavidade interna e fundo plano
- Tampa é independente e usa `fit_type` + `lid_clearance` para o encaixe
- Painel frontal preserva moldura sólida de `border_width`; a grade ocupa
  somente a região interna
- Grade e furos respeitam `minimum_feature` e `minimum_wall`
- Pino lateral é perpendicular à lateral escolhida e não invade a cavidade
- Base inferior é independente
- Evitar operações booleanas desnecessárias; validar a malha ao final
- STL sempre manifold, fechado, sem auto-interseções e sem peças soltas

## Pipeline previsto

```text
Parâmetros
  → contorno externo arredondado
  → extrusão
  → cavidade interna
  → fillets
  → borda superior
  → encaixe da tampa
  → painel frontal
  → matriz de furos/grade
  → pino lateral
  → base
  → validação de geometria
  → exportação STL
```

## Exportação

- STLs separados: `body`, `lid`, `front-panel`, `handle`, `base`
- "Exportar tudo" gera todos os componentes habilitados
- Peças desabilitadas não são exportadas
- STL binário nesta fase; 3MF/STEP fora de escopo

## Fora de escopo

Reconstrução fotogramétrica exata, 3MF/STEP nesta fase, aquecimento, vácuo,
bomba, eletrônica e outros componentes além de corpo, tampa, painel, pino e
base.
```

**Step 4: Update the category AGENTS**

In `src/features/studio/tools/lembrancinhas/AGENTS.md`:
- Table:
```md
| porta-vela | planejada |
| mini-vaso | planejada |
| caixa-personalizada | implementada (v1) |
| termoformador | planejada |
```
- Domain rules:
  - `Peças móveis (tampa, puxador e base da caixa; tampa, pino e base do termoformador) exportadas separadamente`
  - Add `Caixa personalizada: paredes ≥ 0,8 mm; peças separadas; encaixes com folga de impressão`
  - Keep `Termoformador: paredes ≥ 0,8 mm...`

**Step 5: Update `docs/frontend/studio.md`**

- Tool list bullet:
```md
- **Caixa Personalizada** — Caixa 3D personalizável com tampa, painel decorativo, puxador lateral e base, em STLs separados
```
- Replace the `Termoformador` "Como editar" table block paths with `caixa-personalizada`; update the table labels:
  - `Tampa (encaixe externo/interno e cap de raio)`, `Painel decorativo`, `Puxador lateral`, etc.
- Replace the `## Termoformador` section with `## Caixa Personalizada`:
  - Pipeline: `useBox.ts` → `buildBox.worker.ts` → `buildBox.ts` → `exportStl.ts`.
  - Five parts: **Corpo**, **Tampa**, **Painel decorativo**, **Puxador lateral**, **Base**.
  - Geometry/decisions: same as current, with “caixa”, “painel decorativo”, “puxador”, export `-puxador`.
  - Validation codes unchanged; label “Puxador”.
  - Export names: `-corpo`, `-tampa`, `-painel`, `-puxador`, `-base`.
  - `resetAzimuth=30`, `builtParams`, `printClearance`, 800 openings, etc.
- Update the decisions bullet `**Termoformador:**` → `**Caixa Personalizada:**` and the prose terms.
- Add a note that the **Termoformador** is planned for a future release (spec in `lembrancinhas/termoformador/AGENTS.md`).

**Step 6: Add the historical note to the old plan**

At the top of `docs/plans/2026-11-12-termoformador.md`, insert:

```md
> **Nota histórica:** este plano implementou a ferramenta que foi renomeada
> para **Caixa Personalizada** em 2026-11-13. Os nomes de arquivos e símbolos
> abaixo refletem o estado original; a fonte atual está em
> `lembrancinhas/caixa-personalizada` e em
> `docs/plans/2026-11-13-caixa-personalizada-rename.md`.
```

Do not rewrite the rest of the historical plan.

**Step 7: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caixa-personalizada/AGENTS.md \
  src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md \
  src/features/studio/tools/lembrancinhas/AGENTS.md \
  docs/frontend/studio.md \
  docs/plans/2026-11-12-caixa-personalizada-design.md \
  docs/plans/2026-11-12-termoformador.md
git commit -m "docs: document caixa personalizada and termoformador split"
```

---

## Task 6: Varredura final e validação

**Step 1: Scan for old names**

```bash
grep -rn "termoformador\|Termoformador\|Thermoformer\|thermoformer" src tests \
  | grep -v "src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md"
```

Expected: no matches outside the planned Termoformador spec. The
`termoformador/AGENTS.md` intentionally keeps the word “Termoformador”; it is
the planned tool, not the caixa.

```bash
find src/features/studio/tools/lembrancinhas -maxdepth 2 -type f | sort
```

Expected: `caixa-personalizada/*` implementation files and
`termoformador/AGENTS.md` only.

**Step 2: Run typecheck/lint/tests/build**

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected:
- typecheck/lint clean;
- 117+ files / 1203+ tests pass;
- build emits `buildBox.worker-*.js`, `BoxPreview-*.js` and the Caixa
  `StudioPanel-*.js`.

**Step 3: Check git status**

```bash
git status --short
```

Expected: clean.

**Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: finalize caixa personalizada rename"
```

---

## Critérios de conclusão

- Ferramenta aparece como **Caixa Personalizada** na categoria Lembrancinhas.
- Nenhum código-fonte/teste ativo usa `termoformador`/`Thermoformer`.
- `termoformador/AGENTS.md` existe como spec planejado, sem código.
- Exportação usa `-puxador.stl`.
- `docs/frontend/studio.md`, AGENTS e design atualizados.
- Plano antigo preservado com nota histórica.
- Typecheck, lint, testes e build passam.
