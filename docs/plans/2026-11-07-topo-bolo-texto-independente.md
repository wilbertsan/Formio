# Topo de Bolo — Texto padrão e largura/altura independentes: Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Trocar o texto padrão para `Texto` e fazer o auto-fit do topo de bolo comprimir apenas a largura, preservando a altura — mesmo comportamento do marcador de página.

**Architecture:** O builder já calcula `naturalWidth` e `targetWidth`. A mudança é trocar a escala uniforme `geometry.scale(factor, factor, 1)` por `geometry.scale(factor, 1, 1)`. O texto padrão muda no `schema.ts`. O editor 2D e o restante da geometria ficam intactos.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Vitest.

**Design aprovado:** `docs/plans/2026-11-07-topo-bolo-texto-independente-design.md`

---

## Task 1: Texto padrão e auto-fit por largura

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/schema.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx`

### Step 1: Atualizar os testes

1. Em `schema.test.ts`, adicione ao final do `describe('cakeTopperParamsSchema', ...)`:

```ts
  it('defaults the text content to Texto', () => {
    expect(defaultText.content).toBe('Texto')
  })
```

2. Em `buildCakeTopper.test.ts`, adicione dentro de `describe('buildCakeTopper - relevo (raised)', ...)`, depois do teste `'sempre gera relevo sobre a placa, sem alterar a placa'`:

```ts
  it('comprime apenas a largura e preserva a altura', () => {
    const wide = buildCakeTopper({
      params: {
        ...defaultCakeTopperParams,
        texts: [text({ content: 'AB', width: 20, height: 10 })],
      },
      fonts: { bold: mockFont('AB') },
    })
    const narrow = buildCakeTopper({
      params: {
        ...defaultCakeTopperParams,
        texts: [text({ content: 'AB', width: 6, height: 10 })],
      },
      fonts: { bold: mockFont('AB') },
    })

    const wideBb = bounds(wide.relief!)
    const narrowBb = bounds(narrow.relief!)
    expect(narrowBb.hw).toBeLessThan(wideBb.hw)
    expect(narrowBb.hh).toBeCloseTo(wideBb.hh, 5)
  })
```

3. Em `StudioPanel.test.tsx`, troque todas as ocorrências de `Feliz Aniversário` por `Texto`:
```ts
    expect(screen.getByLabelText('Remover texto Texto')).toBeDisabled()
```
```ts
    expect(screen.getByText('Texto')).toHaveAttribute('aria-pressed', 'true')
```
```ts
    expect(screen.getByText('Texto')).toHaveAttribute('aria-pressed', 'false')
```

### Step 2: Rodar os testes para confirmar a falha

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx
```
Expected: FAIL no default (`Feliz Aniversário`), no teste de altura (altura reduzida junto) e nos testes do painel.

### Step 3: Alterar o texto padrão

Em `schema.ts`, troque:
```ts
  id: 'text-1', content: 'Feliz Aniversário', fontStyle: 'bold',
```
por:
```ts
  id: 'text-1', content: 'Texto', fontStyle: 'bold',
```

### Step 4: Comprimir apenas a largura

Em `buildCakeTopper.ts`, no bloco de auto-fit de `buildTextGeometries`, troque:
```ts
    if (naturalWidth > targetWidth && naturalWidth > 0) {
      const factor = targetWidth / naturalWidth
      geometry.scale(factor, factor, 1)
    }
```
por:
```ts
    if (naturalWidth > targetWidth && naturalWidth > 0) {
      const factor = targetWidth / naturalWidth
      // `height` é o tamanho da fonte; a largura é um limite máximo e comprime
      // apenas X, preservando a altura (mesmo comportamento do marcador de página).
      geometry.scale(factor, 1, 1)
    }
```

### Step 5: Rodar os testes

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/
npm run typecheck
npm run lint
```
Expected: PASS.

### Step 6: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/schema.ts \
  src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx
git commit -m "feat(topo-bolo): torna largura e altura do texto independentes"
```

---

## Task 2: Atualizar a documentação

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md`
- Modify: `docs/frontend/studio.md`

### Step 1: Atualizar o `AGENTS.md`

Na seção `## Parâmetros`, troque:
```md
- Textos: cada um com conteúdo, fonte (`normal`/`bold`/`serif`), largura, altura, relevo e offset X/Y próprios
```
por:
```md
- Textos: cada um com conteúdo (padrão `Texto`), fonte (`normal`/`bold`/`serif`), largura, altura, relevo e offset X/Y próprios
- Largura e altura são independentes: `height` é o tamanho da fonte; `width` é um limite máximo que comprime apenas o eixo X quando excedido, preservando a altura
```

### Step 2: Atualizar `docs/frontend/studio.md`

No bullet **Topo de Bolo**, troque o trecho:
```md
O conteúdo é sempre gerado em relevo alto: cada texto usa `relief` (0,4–3mm) e o ícone usa 1mm.
```
por:
```md
O conteúdo é sempre gerado em relevo alto: cada texto usa `relief` (0,4–3mm) e o ícone usa 1mm. A largura do texto é um limite máximo e comprime apenas o eixo X; a altura é o tamanho da fonte e é preservada.
```

### Step 3: Verificar resíduos

Run:
```bash
grep -R "Feliz Aniversário" src/features/studio/tools/confeitaria/topo-bolo docs/frontend/studio.md
```
Expected: nenhuma ocorrência.

### Step 4: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md docs/frontend/studio.md
git commit -m "docs(topo-bolo): documenta largura e altura independentes"
```

---

## Task 3: Verificação final

### Step 1: Rodar a suíte completa

Run:
```bash
npm test
```
Expected: PASS.

### Step 2: Typecheck

Run:
```bash
npm run typecheck
```
Expected: PASS.

### Step 3: Lint

Run:
```bash
npm run lint
```
Expected: PASS.

### Step 4: Build

Run:
```bash
npm run build
```
Expected: PASS.

### Step 5: Revisar o diff

Run:
```bash
git status --short
git diff --stat
```
Expected: apenas os arquivos das tasks acima; nenhum temporário.
