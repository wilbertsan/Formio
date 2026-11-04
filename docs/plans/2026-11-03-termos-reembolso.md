# Termos de Uso e Reembolso — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir o placeholder de `/termos` por uma página completa de Termos de Uso adaptada ao 3DFormio, com seção destacada de cancelamento e reembolso.

**Architecture:** O conteúdo jurídico vive em `src/features/legal/config/terms.ts` como uma árvore tipada (`LegalSection` / `LegalNode`). `TermsPage` compõe `Navbar`, índice lateral, artigo recursivo e `Footer`. A rota `/termos` deixa de usar `PlaceholderPage`.

**Tech Stack:** React 19, React Router 7, TypeScript strict, TailwindCSS 4, Amplify UI, Vitest + Testing Library.

---

## Task 1: Contrato de conteúdo

**Files:**
- Test: `tests/features/legal/config/terms.test.ts`
- Create: `src/features/legal/config/terms.ts`

**Step 1:** Testar `termsSections` com 12 seções, ids únicos, conteúdo não vazio, seção de reembolso com “7 dias”, adaptação de marca/planos e contatos placeholder.

**Step 2:** Rodar `npm test -- tests/features/legal/config/terms.test.ts` e confirmar falha por módulo ausente.

**Step 3:** Criar os tipos e o conteúdo adaptado:
- Marca 3DFormio.
- Operadora VFBS AUTOMACAO E SISTEMAS, CNPJ 62.773.386/0001-21.
- Planos Grátis / Pro / Business.
- Contatos `[e-mail de contato]` e `[e-mail de reembolso]`.
- Sem aviso de minuta.

**Step 4:** Rodar o teste e confirmar verde.

## Task 2: Renderização e página

**Files:**
- Test: `tests/features/legal/TermsPage.test.tsx`
- Create: `src/features/legal/components/LegalArticle.tsx`
- Create: `src/features/legal/components/TermsToc.tsx`
- Create: `src/features/legal/TermsPage.tsx`

**Step 1:** Testar título, índice, seção de reembolso, conteúdo, Navbar/Footer e link para `/privacidade`.

**Step 2:** Rodar o teste e confirmar falha por módulo ausente.

**Step 3:** Implementar o renderer recursivo, o índice e o shell da página seguindo o padrão visual da landing.

**Step 4:** Rodar o teste e confirmar verde.

## Task 3: Rota e navegação

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/features/landing/components/Navbar.tsx`
- Modify: `src/features/landing/components/Footer.tsx`
- Test: `tests/app/App.test.tsx`
- Test: `tests/features/landing/components/Navbar.test.tsx`

**Step 1:** Testar `/termos` renderizando os Termos de Uso.

**Step 2:** Ajustar âncoras de Preços/FAQ para funcionarem a partir de `/termos` sem quebrar a home.

**Step 3:** Rodar os testes e confirmar verde.

## Task 4: Documentação

**Files:**
- Create: `docs/frontend/legal.md`
- Modify: `docs/frontend/landing.md`
- Modify: `AGENTS.md`

Documentar estrutura, edição do conteúdo, rota e decisões.

## Task 5: Validação final

Executar:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```
