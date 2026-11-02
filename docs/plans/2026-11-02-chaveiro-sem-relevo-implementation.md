# Chaveiro sem Relevo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remover a função de relevo do chaveiro; textos e ícones passam a ser sempre elevados, com altura fixa de 1mm.

**Architecture:** Remover `textMode`/`reliefDepth` do schema e do estado, fixar `CONTENT_DEPTH = 1`, eliminar os ramos de gravação/CSG do `buildKeychain`, remover `mode` do resultado e simplificar o export para sempre mesclar base + conteúdo. O painel perde o bloco Relevo.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Vitest.

**Design Doc:** `docs/plans/2026-11-02-chaveiro-sem-relevo-design.md`

**Comandos de verificação:** `npm run typecheck`, `npm run lint`, `npx vitest run <arquivo>`, `npm test`.

---

## Task 0: Baseline

**Step 1:** Rode `npm run typecheck && npm run lint && npm test`.
**Expected:** tudo passa (70 arquivos, 780 testes).

---

## Task 1: Remover relevo do schema

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/schema.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/schema.test.ts`

### Step 1: Write failing tests
Atualize `schema.test.ts`:
- Remova os testes que citam `reliefDepth` (rejeição 0.3/2.1 e aceitação 0.4/2).
- Mantenha o teste de `kind` desconhecido, sem `reliefDepth`.
- No teste de defaults, adicione:

```ts
import { CONTENT_DEPTH, defaultKeychainParams, keychainParamsSchema } from '@/features/studio/tools/chaveiros/chaveiro/schema'

it('não expõe textMode nem reliefDepth', () => {
  expect(CONTENT_DEPTH).toBe(1)
  expect('textMode' in defaultKeychainParams).toBe(false)
  expect('reliefDepth' in defaultKeychainParams).toBe(false)
})
```

### Step 2: Run → FAIL
`npx vitest run tests/features/studio/tools/chaveiros/chaveiro/schema.test.ts`
Expected: FAIL (CONTENT_DEPTH indefinido / campos ainda presentes).

### Step 3: Implement
Em `schema.ts`:
- Remova `textMode: z.enum(['raised', 'engraved'])`.
- Remova `reliefDepth: z.number().min(0.4).max(2)`.
- Remova `export type KeychainTextMode = KeychainParams['textMode']`.
- Adicione `export const CONTENT_DEPTH = 1` junto às constantes de domínio.
- Remova `textMode: 'raised'` e `reliefDepth: 1` de `defaultKeychainParams`.

### Step 4: Run → PASS
### Step 5: Commit
```bash
git add src/features/studio/tools/chaveiros/chaveiro/schema.ts tests/features/studio/tools/chaveiros/chaveiro/schema.test.ts
git commit -m "refactor(chaveiro): remove parâmetros de relevo do schema"
```

---

## Task 2: Altura fixa no auto-fit

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/autoFit.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/autoFit.test.ts`

### Step 1: Implement
Importe `CONTENT_DEPTH` de `./schema` e substitua as quatro ocorrências de `depth: ctx.params.reliefDepth` por `depth: CONTENT_DEPTH` (texto e três ramos de ícone).

### Step 2: Run
`npx vitest run tests/features/studio/tools/chaveiros/chaveiro/autoFit.test.ts` → PASS.

### Step 3: Commit
```bash
git add src/features/studio/tools/chaveiros/chaveiro/autoFit.ts
git commit -m "refactor(chaveiro): usa profundidade fixa no auto-fit"
```

---

## Task 3: Build sempre elevado

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/buildKeychain.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/buildKeychain.test.ts`

### Step 1: Write failing tests
- Remova o mock de `three-bvh-csg`, o bloco `csgCalls/csgState` e os testes de `engraved` (incluindo o de fallback CSG).
- Adicione:

```ts
import { CONTENT_DEPTH } from '@/features/studio/tools/chaveiros/chaveiro/schema'

it('conteúdo é sempre elevado com profundidade fixa de 1mm', () => {
  const result = buildKeychain(makeInput())
  result.content!.computeBoundingBox()
  const bb = result.content!.boundingBox!
  expect(bb.max.z - bb.min.z).toBeCloseTo(CONTENT_DEPTH, 1)
  expect(result).not.toHaveProperty('mode')
})
```

- Remova `textMode: 'engraved'` e `defaultKeychainParams.reliefDepth` de todos os testes restantes.

### Step 2: Run → FAIL

### Step 3: Implement
Em `buildKeychain.ts`:
- Remova `import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'`.
- Remova `ENGRAVE_EPSILON`.
- Remova `mode` de `BuildKeychainResult`.
- Importe `CONTENT_DEPTH` de `./schema`.
- Substitua `contentZ(params, surfaceTop)` por:

```ts
function contentZ(surfaceTop: number): number {
  return surfaceTop - 0.01
}
```

- No caminho regular, remova todos os blocos `if (params.textMode === 'raised')`, `if (!content)`, `try/catch` de CSG. Sempre finalize com:

```ts
mergedBase.computeVertexNormals()
content?.computeVertexNormals()
return { base: mergedBase, content, contentItems, pieceBB, hole }
```

- No caminho nome:
  - Extrude o conteúdo com `depth: CONTENT_DEPTH`.
  - Remova o `try/catch` de CSG.
  - Sempre posicione `content?.translate(0, 0, contentZ(params.thickness))` e retorne:

```ts
base.computeVertexNormals()
content?.computeVertexNormals()
return { base, content, contentItems, ...computeBaseBB(base, hole) }
```

- Mantenha a subtração do furo da argola na base e no conteúdo.
- Remova qualquer retorno com `mode`.

### Step 4: Run → PASS
`npx vitest run tests/features/studio/tools/chaveiros/chaveiro/buildKeychain.test.ts`

### Step 5: Commit
```bash
git add src/features/studio/tools/chaveiros/chaveiro/buildKeychain.ts tests/features/studio/tools/chaveiros/chaveiro/buildKeychain.test.ts
git commit -m "refactor(chaveiro): gera conteúdo sempre elevado em 1mm"
```

---

## Task 4: Export sempre base + conteúdo

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/exportStl.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/exportStl.test.ts`

### Step 1: Write failing test
Remova o cenário `mode: 'engraved'`. No teste com conteúdo, garanta `mode` ausente e a chamada de merge com `[base, content]` (normalizados).

### Step 2: Implement
Em `exportStl.ts`:

```ts
const geometries = geometry.content
  ? [geometry.base, geometry.content]
  : [geometry.base]
```

Remova a referência a `geometry.mode`.

### Step 3: Run → PASS
`npx vitest run tests/features/studio/tools/chaveiros/chaveiro/exportStl.test.ts`

### Step 4: Commit
```bash
git add src/features/studio/tools/chaveiros/chaveiro/exportStl.ts tests/features/studio/tools/chaveiros/chaveiro/exportStl.test.ts
git commit -m "refactor(chaveiro): exporta sempre base e conteúdo"
```

---

## Task 5: Remover relevo do estado

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/useKeychain.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/useKeychain.test.tsx`

### Step 1: Implement
- Remova `reliefDepth: { min: 0.4, max: 2 }` de `NUMERIC_RANGES`.
- Remova `mode: 'raised'` do mock de `buildKeychain` no teste.
- Remova qualquer asserção de `reliefDepth`/`textMode`.

### Step 2: Run
`npx vitest run tests/features/studio/tools/chaveiros/chaveiro/useKeychain.test.tsx` → PASS.

### Step 3: Commit
```bash
git add src/features/studio/tools/chaveiros/chaveiro/useKeychain.ts tests/features/studio/tools/chaveiros/chaveiro/useKeychain.test.tsx
git commit -m "refactor(chaveiro): remove relevo do estado"
```

---

## Task 6: Remover bloco Relevo do painel

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/StudioPanel.tsx`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/StudioPanel.test.tsx`

### Step 1: Write failing tests
- Remova o teste que dispara `onUpdateParam('textMode'/'reliefDepth')`.
- Adicione:

```ts
it('não renderiza o bloco Relevo e informa a altura fixa', () => {
  renderPanel()
  expect(screen.queryByText(/relevo/i)).not.toBeInTheDocument()
  expect(screen.getByText(/elevados em 1 mm/i)).toBeInTheDocument()
})
```

### Step 2: Run → FAIL

### Step 3: Implement
- Remova todo o `Accordion.Item value="relevo"` (Heading "Relevo", SelectField "Modo de relevo", LabeledSlider "Profundidade do relevo").
- No bloco **Conteúdo**, adicione:

```tsx
<Text fontSize="xs" color="font.tertiary">
  Textos e ícones elevados em 1 mm.
</Text>
```

### Step 4: Run → PASS
`npx vitest run tests/features/studio/tools/chaveiros/chaveiro/StudioPanel.test.tsx`

### Step 5: Commit
```bash
git add src/features/studio/tools/chaveiros/chaveiro/StudioPanel.tsx tests/features/studio/tools/chaveiros/chaveiro/StudioPanel.test.tsx
git commit -m "refactor(chaveiro): remove bloco de relevo do painel"
```

---

## Task 7: Docs e verificação final

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/AGENTS.md`
- Modify: `src/features/studio/tools/chaveiros/AGENTS.md`
- Modify: `docs/frontend/studio.md`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/TextPositionEditor.test.tsx` (remover `mode` do mock)

### Step 1: Docs
- Remova `textMode` e `reliefDepth` das tabelas e descrições.
- Substitua por "conteúdo elevado fixo em 1mm (`CONTENT_DEPTH`)".
- Remova "Elevado/Gravado" e "profundidade do relevo".
- Atualize a pipeline e a lista de testes.
- Atualize `docs/frontend/studio.md` da mesma forma.

### Step 2: Full verification
```bash
npm run typecheck
npm run lint
npm test
```
Atualize contagens de testes no `AGENTS.md` com o resultado real.

### Step 3: Stale check
```bash
rg -n "textMode|reliefDepth|KeychainTextMode|engraved|three-bvh-csg|mode: 'raised'|mode: 'engraved'" src/features/studio/tools/chaveiros tests/features/studio/tools/chaveiros
```
Expected: nenhuma referência no chaveiro.

### Step 4: Commit
```bash
git add src/features/studio/tools/chaveiros/chaveiro/AGENTS.md src/features/studio/tools/chaveiros/AGENTS.md docs/frontend/studio.md tests/features/studio/tools/chaveiros/chaveiro/TextPositionEditor.test.tsx
git commit -m "docs(chaveiro): documenta conteúdo elevado fixo em 1mm"
```
