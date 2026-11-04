# Política de Privacidade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Entregar `/privacidade` com conteúdo completo adaptado ao 3DFormio e layout jurídico compartilhado com `/termos`.

**Architecture:** `LegalDocumentPage` centraliza o shell visual. `TermsPage` e `PrivacyPage` fornecem título, descrição, data, seções e fechamento. O conteúdo fica em configs tipadas.

**Tech Stack:** React 19, React Router 7, TypeScript strict, TailwindCSS 4, Amplify UI, Vitest + Testing Library.

---

## Task 1: Contrato do conteúdo

**Files:**
- Test: `tests/features/legal/config/privacy.test.ts`
- Create: `src/features/legal/config/privacy.ts`

**Step 1:** Testar 12 seções, ids únicos, ausência de referências antigas, presença de LGPD/OpenRouter/15 dias e contatos placeholder.

**Step 2:** Rodar `npm test -- tests/features/legal/config/privacy.test.ts` e confirmar falha.

**Step 3:** Criar o conteúdo adaptado, incluindo ajuste de cookies sem “Rever cookies”.

**Step 4:** Rodar o teste e confirmar verde.

## Task 2: Layout compartilhado e página

**Files:**
- Test: `tests/features/legal/PrivacyPage.test.tsx`
- Create: `src/features/legal/components/LegalDocumentPage.tsx`
- Rename: `src/features/legal/components/TermsToc.tsx` → `LegalToc.tsx`
- Create: `src/features/legal/PrivacyPage.tsx`
- Modify: `src/features/legal/TermsPage.tsx`

**Step 1:** Testar título, índice, âncoras, contatos e link para `/termos`.

**Step 2:** Rodar o teste e confirmar falha.

**Step 3:** Extrair o layout, renomear o índice e criar `PrivacyPage`.

**Step 4:** Rodar testes de privacidade e termos; confirmar verde.

## Task 3: Rota

**Files:**
- Modify: `src/app/App.tsx`
- Test: `tests/app/App.test.tsx`

Adicionar teste de `/privacidade`, trocar o placeholder pela página e confirmar verde.

## Task 4: Documentação

**Files:**
- Modify: `docs/frontend/legal.md`
- Modify: `docs/frontend/landing.md`
- Modify: `src/features/legal/AGENTS.md`
- Modify: `AGENTS.md`

Documentar a página, o layout compartilhado, os placeholders e o escopo de cookies.

## Task 5: Validação final

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```
