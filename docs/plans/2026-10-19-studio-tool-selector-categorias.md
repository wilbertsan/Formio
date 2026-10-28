# Seletor de Ferramentas por Categoria — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agrupar as ferramentas do Studio em duas faixas horizontais empilhadas — Confeitaria e Letreiros (Chaveiro classificado como Letreiros).

**Architecture:** `ToolSelector` mantém uma única fonte de dados (`TOOLS`) e deriva as seções em tempo de render, na ordem fixa Confeitaria → Letreiros. Cada seção usa `flex flex-wrap` (cards quebram linha quando não couberem). O rótulo de categoria sai do card e passa a ser o título da seção.

**Tech Stack:** React 19, TypeScript strict, TailwindCSS 4, Amplify UI, Vitest + Testing Library.

---

### Task 1: Testes do seletor

**Files:**
- Create: `tests/features/studio/components/ToolSelector.test.tsx`

Cobrir: ordem das seções, agrupamento (4 Confeitaria / 5 Letreiros), Chaveiro em Letreiros e `onSelect` com o id correto.

Rodar: `npx vitest run tests/features/studio/components/ToolSelector.test.tsx`
Expected: FAIL (sem headings de categoria).

### Task 2: Implementar agrupamento e layout

**Files:**
- Modify: `src/features/studio/components/ToolSelector.tsx`

Preservar as alterações pendentes no arquivo (cores `brand-*`, descrição do Cortador).

1. `type ToolCategory = 'Confeitaria' | 'Letreiros'`; `ToolCard.category: ToolCategory`.
2. `const CATEGORY_ORDER: ToolCategory[] = ['Confeitaria', 'Letreiros']`.
3. `chaveiro` → `category: 'Letreiros'`.
4. Derivar `groups` por `CATEGORY_ORDER` + `filter`.
5. Container `flex flex-1 justify-center overflow-y-auto bg-neutral-50 p-8` com `max-w-7xl`.
6. Seções `<section aria-labelledby>` com `Heading level={2}`; título da página vira `Heading level={1}`.
7. Faixa `flex flex-wrap items-stretch gap-4`; card `w-full sm:w-56`, sem o rótulo de categoria.

Rodar: `npx vitest run tests/features/studio/components/ToolSelector.test.tsx`
Expected: PASS.

### Task 3: Documentação

**Files:**
- Modify: `docs/frontend/studio.md`

Atualizar a linha do Tool Selector e adicionar decisão sobre o seletor por categoria.

### Task 4: Verificação

```bash
npm run lint
npm run typecheck
npm run test
```

Sem commit sem pedido explícito.
