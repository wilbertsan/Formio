# Cortador + Carimbo — Plano de Implementação

> **Sub-skill:** executado com TDD (testes primeiro a cada módulo).

**Goal:** Reescrever `cortador-carimbo` para gerar duas peças separadas (cortador + carimbo com relevo positivo) num único STL.

**Architecture:** `useReducer` + Zod → `buildCutterStamp` (cortador, base, cabo, relevo posicionados) → `CutterStampPreview` (R3F) / `exportStl` (merge único). Helper SVG compartilhado com o `carimbo-brigadeiro`.

**Tech Stack:** React 19, Three.js 0.185, `three/examples`, `js-clipper`, Zod, Vitest, Amplify UI.

---

## Tasks

### Task 1 — Helper SVG compartilhado
- Create: `src/features/studio/tools/confeitaria/shared/svgToIconShape.ts`
- Modify: `src/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.ts`
- Verificação: `npx vitest run tests/.../carimbo-brigadeiro` → 52 PASS.

### Task 2 — Schema (TDD)
- Modify: `src/features/studio/tools/confeitaria/cortador-carimbo/schema.ts`
- Test: `tests/.../cortador-carimbo/schema.test.ts` (25 testes).

### Task 3 — Build da geometria (TDD)
- Modify: `.../buildCutterStamp.ts`
- Test: `.../buildCutterStamp.test.ts` (15 testes): encaixe com folga, base em `RELIEF_DEPTH`, cabo na altura total, relevo ancorado, layout lado a lado.

### Task 4 — Hook de estado (TDD)
- Modify: `.../useCutterStamp.ts`
- Test: `.../useCutterStamp.test.ts` (10 testes): default, clamp, `setSvgIcon`, fonte só em texto, debounce, dimensões, câmera.

### Task 5 — Preview
- Modify: `.../CutterStampPreview.tsx`
- Test: `.../CutterStampPreview.test.tsx` (guard clause; demais casos cobertos por typecheck/integração).

### Task 6 — Painel (TDD)
- Modify: `.../StudioPanel.tsx`
- Test: `.../StudioPanel.test.tsx` (8 testes): seções Cortador/Carimbo/Aparência, campos, upload.

### Task 7 — Export STL (TDD)
- Modify: `.../exportStl.ts`
- Test: `.../exportStl.test.ts` (3 testes): mescla 4 peças (ou 3 sem relevo).

### Task 8 — Integração
- Modify: `src/features/studio/StudioPage.tsx`, `src/features/studio/components/ToolSelector.tsx`

### Task 9 — Docs
- Modify: `.../cortador-carimbo/AGENTS.md`, `.../confeitaria/AGENTS.md`, `docs/frontend/studio.md`

### Task 10 — Verificação
```
npx vitest run tests/features/studio/tools/confeitaria
npm run typecheck
npm run lint
npm run build
```

---

## Decisões
- Base do carimbo sem bevel (face de contato plana, encaixe exato).
- Relevo positivo por sobreposição (0.2mm dentro da base); sem CSG.
- Preview sem teste de render de meshes (convenção do repo; evitar warnings R3F fora do Canvas).

## Riscos
- Merge interpenetrante é aceito por fatiadores, mas não é manifold estrito. Se necessário, migrar para CSG.
- Ajuste de ícone em base retangular usa o menor lado como raio útil (conservador).
