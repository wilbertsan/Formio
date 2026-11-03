# Marcador de Página em Duas Peças Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separar o marcador em base e texto, com encaixe em U na traseira do texto, exportando dois STLs prontos para impressão.

**Architecture:** A base termina na traseira do texto (folga 0,2mm). O texto ganha um lábio em U na traseira; a base desliza sob o lábio e forma o fundo do U. A exportação gera dois STLs; o texto é rotacionado para imprimir deitado.

**Tech Stack:** React 19, TypeScript strict, Three.js, Web Worker, Zod, Vitest.

**Design doc:** `docs/plans/2026-11-02-marcador-pagina-duas-pecas-design.md`

> **Atualização pós-execução:** o encaixe final usa **duas barras**
> (`createJointBars`), com vão = espessura da base + 0,2mm, começando na metade
> da espessura do texto e centradas na altura do texto; o texto fica centrado na
> borda da base (metade acima/abaixo). As referências a `createJointLip` abaixo
> são históricas.

---

## Convenções

- TDD: @superpowers:test-driven-development.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- Base: `/opt/projects/BELIS3D`.
- Marcador: `src/features/studio/tools/letreiros/marcador-pagina/`.
- 1 unidade Three.js = 1mm.
- Não commitar sem pedido explícito.

---

### Task 1 — Constantes e posições do encaixe

**Files:**
- Create: `src/features/studio/tools/letreiros/marcador-pagina/joint.ts`
- Modify: `src/features/studio/tools/letreiros/marcador-pagina/positioning.ts`
- Test: `tests/.../positioning.test.ts`, novo `joint.test.ts`

**Implementação**
```ts
export const JOINT_LIP_DEPTH = 1.5
export const JOINT_LIP_HEIGHT = 0.8
export const JOINT_CLEARANCE = 0.2

export function splitBaseCenterX(width: number): number {
  return -JOINT_CLEARANCE - width / 2
}

export function splitTextCenterX(relief: number): number {
  return relief / 2
}

export function createJointLip(textWidth: number, thickness: number): BufferGeometry {
  const lip = new BoxGeometry(JOINT_LIP_DEPTH, textWidth, JOINT_LIP_HEIGHT)
  lip.translate(-JOINT_LIP_DEPTH / 2, 0, thickness + JOINT_CLEARANCE + JOINT_LIP_HEIGHT / 2)
  return lip
}
```
- Remover `fixedTextX`, `fixedTextY`, `bookmarkBaseCenterX` e `TEXT_Z_OFFSET` (não são mais usados).
- Manter `TEXT_MARGIN` e `TEXT_ROTATION`.

**Testes**
- `splitBaseCenterX(50) = -25.2`.
- `splitTextCenterX(1) = 0.5`.
- `createJointLip(40, 1)`: bbox X `-1.5..0`, Y `-20..20`, Z `1.2..2.0`.

Run: `npx vitest run tests/features/studio/tools/letreiros/marcador-pagina/joint.test.ts tests/features/studio/tools/letreiros/marcador-pagina/positioning.test.ts`

---

### Task 2 — Base com borda direita recuada

**Files:**
- Modify: `src/features/studio/tools/letreiros/marcador-pagina/shapes.ts`
- Test: `tests/.../shapes.test.ts`

**Implementação**
- `buildBookmarkBase` continua aceitando `centerX`.
- Em `buildBookmark`, a base usa `centerX = splitBaseCenterX(params.width)`.
- A base fica `x ∈ [-JOINT_CLEARANCE - width, -JOINT_CLEARANCE]`.

**Testes**
- Base padrão (50mm): bbox X `-50.2..-0.2`, largura 50; Y 100; Z 1.
- `createBookmarkShape({ length, width, centerX: -25.2 })` gera os cantos corretos.

Run: `npx vitest run tests/features/studio/tools/letreiros/marcador-pagina/shapes.test.ts`

---

### Task 3 — Texto com traseira em 0, base em z=0 e lábio em U

**Files:**
- Modify: `src/features/studio/tools/letreiros/marcador-pagina/buildBookmark.ts`
- Test: `tests/.../buildBookmark.test.ts`

**Implementação**
- Texto em pé, auto-fit, rotação `TEXT_ROTATION`.
- `x = splitTextCenterX(params.text.relief)` (traseira em 0).
- `y = 0`.
- `z = -bb.min.z` (base do texto em 0; sem `TEXT_Z_OFFSET`).
- `textWidth = bb.max.y - bb.min.y`.
- `lip = createJointLip(textWidth, params.thickness)`.
- `text = mergeGeometries([textGeometry, lip]) ?? textGeometry`; descartar as peças originais.

**Testes**
- Texto: bbox X inclui `-1.5` (lábio) e `relief`; bbox Z min 0.
- Lábio: z `thickness+0.2 .. +1.0`; Y cobre a largura do texto.
- Base: bbox X `-50.2..-0.2`.
- Textura continua elevando a base; o lábio não altera a base.

Run: `npx vitest run tests/features/studio/tools/letreiros/marcador-pagina/buildBookmark.test.ts`

---

### Task 4 — Textura fora da faixa do encaixe

**Files:**
- Modify: `src/features/studio/tools/letreiros/marcador-pagina/patterns.ts`
- Test: `tests/.../patterns.test.ts`

**Implementação**
- `baseCenterX = splitBaseCenterX(params.width)`.
- Área da textura:
  - `left = -JOINT_CLEARANCE - width + PATTERN_MARGIN_MM`.
  - `right = -JOINT_LIP_DEPTH - PATTERN_MARGIN_MM` (2,5mm da traseira do texto).
  - `bottom/top = ±(length/2 - PATTERN_MARGIN_MM)`.
- Recorte e tiling usam esses limites.

**Testes**
- Nenhum motivo ultrapassa `x > -2.5`.
- A base continua com a faixa lisa de 2,5mm.

Run: `npx vitest run tests/features/studio/tools/letreiros/marcador-pagina/patterns.test.ts`

---

### Task 5 — Exportar dois STLs e deitar o texto

**Files:**
- Modify: `src/features/studio/tools/letreiros/marcador-pagina/exportStl.ts`
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/.../exportStl.test.ts`, `tests/features/studio/StudioPage.test.tsx`

**Implementação**
```ts
export function prepareTextForPrint(text: BufferGeometry): BufferGeometry {
  const clone = text.clone()
  clone.rotateY(Math.PI / 2)
  clone.computeBoundingBox()
  clone.translate(0, 0, -(clone.boundingBox?.min.z ?? 0))
  return clone
}

export function exportStlParts(result: BuildBookmarkResult, projectName: string): void {
  const name = sanitizeFilename(projectName)
  exportStlPart(result.base, `${name}-base.stl`)
  const textForPrint = prepareTextForPrint(result.text)
  exportStlPart(textForPrint, `${name}-texto.stl`)
  textForPrint.dispose()
}
```
- `exportStlPart(geometry, filename)` contém o download atual.
- `StudioPage`: `handleExport` chama `exportStlParts(geometry, projectName)`.

**Testes**
- `prepareTextForPrint`: bbox min Z = 0; altura de impressão = `relief + JOINT_LIP_DEPTH`; footprint = altura do texto × largura do texto.
- Dois downloads, nomes `-base.stl` e `-texto.stl`, dois blobs, dois `click`.
- `StudioPage`: o botão Exportar dispara os dois downloads (mock).

Run: `npx vitest run tests/features/studio/tools/letreiros/marcador-pagina/exportStl.test.ts tests/features/studio/StudioPage.test.tsx`

---

### Task 6 — Docs e verificação

**Files:**
- Modify: `src/features/studio/tools/letreiros/marcador-pagina/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Mudanças**
- Duas peças: base e texto.
- Encaixe em U: lábio 1,5 × 0,8mm, folga 0,2mm, base forma o fundo.
- Texto exportado deitado; base plana.
- Dois STLs (`-base`, `-texto`).
- Faixa lisa de 2,5mm na base.
- Atualizar lista de arquivos, testes e contagem.

**Verificação**
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
Esperado: tudo verde; dois STLs; texto deitado.

---

## Riscos e decisões

- O U usa a base como fundo; não há lábio abaixo da base, então a peça montada continua apoiada na base.
- A folga de 0,2mm pode precisar de ajuste conforme a impressora; constantes centralizadas em `joint.ts`.
- O texto exportado deitado tem altura de impressão `relief + 1,5mm`.
- A textura é recuada 2,5mm da borda direita para não colidir com o lábio.
