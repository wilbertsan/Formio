# Topo de Bolo — Haste quadrada (largura = espessura): Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remover o controle de largura da haste e usar a espessura da placa como largura, deixando a seção da haste quadrada (`thickness × thickness`).

**Architecture:** Remover `stemWidth` do schema/estado/painel. O builder deriva a meia-largura de `params.thickness / 2`; a extrusão continua com `depth = params.thickness`. A lógica de ancoragem, haste dupla, espaçamento e fallback permanece, apenas usando a nova meia-largura.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Amplify UI, Vitest.

**Design aprovado:** `docs/plans/2026-11-09-topo-bolo-haste-quadrada-design.md`

---

## Task 1: Remover `stemWidth` e usar a espessura da placa

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/schema.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`

### Step 1: Atualizar os testes

1. Em `schema.test.ts`, adicione ao final do `describe('cakeTopperParamsSchema', ...)`:

```ts
  it('does not expose stemWidth anymore', () => {
    expect('stemWidth' in cakeTopperParamsSchema.shape).toBe(false)
    expect('stemWidth' in defaultCakeTopperParams).toBe(false)
  })
```

2. Em `buildCakeTopper.test.ts`, remova todas as propriedades `stemWidth: ...` dos objetos de parâmetros.

3. Ajuste o teste `'haste se ancora sob o fundo real do contorno (não flutua)'`:
   - A expectativa final deve ser:
```ts
    expect(stemHalfWidth).toBeCloseTo(params.thickness / 2, 5)
```

4. Renomeie e ajuste o teste `'haste é plana com a espessura da placa e ponta chanfrada'` para:

```ts
  it('haste tem seção quadrada da espessura da placa e ponta chanfrada', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      supportType: 'haste' as const,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const bb = support.boundingBox!
    const geometry = support
    const pos = geometry.getAttribute('position')
    const centerX = (bb.min.x + bb.max.x) / 2

    let maxHalfWidthAtBottom = 0
    let maxHalfWidthAtTop = 0
    let degenerate = 0
    for (let i = 0; i < pos.count; i += 3) {
      const ax = pos.getX(i)
      const ay = pos.getY(i)
      const az = pos.getZ(i)
      const bx = pos.getX(i + 1)
      const by = pos.getY(i + 1)
      const bz = pos.getZ(i + 1)
      const cx = pos.getX(i + 2)
      const cy = pos.getY(i + 2)
      const cz = pos.getZ(i + 2)

      const abx = bx - ax
      const aby = by - ay
      const abz = bz - az
      const acx = cx - ax
      const acy = cy - ay
      const acz = cz - az
      const crossX = aby * acz - abz * acy
      const crossY = abz * acx - abx * acz
      const crossZ = abx * acy - aby * acx
      if (crossX * crossX + crossY * crossY + crossZ * crossZ <= 1e-18) degenerate++

      if (ay <= bb.min.y + 1e-6) {
        maxHalfWidthAtBottom = Math.max(maxHalfWidthAtBottom, Math.abs(ax - centerX))
      }
      if (ay >= bb.max.y - 1e-6) {
        maxHalfWidthAtTop = Math.max(maxHalfWidthAtTop, Math.abs(ax - centerX))
      }
    }

    expect(bb.max.z - bb.min.z).toBeCloseTo(params.thickness, 5)
    expect(bb.max.x - bb.min.x).toBeCloseTo(params.thickness, 5)
    expect(maxHalfWidthAtBottom).toBeCloseTo(0.4, 1)
    expect(maxHalfWidthAtTop).toBeCloseTo(params.thickness / 2, 1)
    expect(degenerate).toBe(0)
  })
```

5. Ajuste o teste `'limita a ponta chanfrada a metade do comprimento'` para:

```ts
  it('limita a ponta chanfrada a metade do comprimento', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      supportType: 'haste' as const,
      thickness: 4,
      stemLength: 15,
    }
    const result = buildCakeTopper({ params })
    const support = result.support!
    support.computeBoundingBox()
    const bb = support.boundingBox!
    const pos = support.getAttribute('position')
    const centerX = (bb.min.x + bb.max.x) / 2
    const tipLength = Math.min(
      params.thickness * 2.5,
      params.stemLength * 0.5,
    )
    const tipBaseY = bb.min.y + tipLength

    let maxHalfWidthAtTipBase = 0
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      if (Math.abs(y - tipBaseY) < 0.01) {
        maxHalfWidthAtTipBase = Math.max(
          maxHalfWidthAtTipBase,
          Math.abs(pos.getX(i) - centerX),
        )
      }
    }

    expect(maxHalfWidthAtTipBase).toBeCloseTo(params.thickness / 2, 1)
  })
```

6. Ajuste o teste de haste dupla:
   - Use `params.thickness` no lugar de `params.stemWidth`:
```ts
    expect(bb.max.x - bb.min.x).toBeCloseTo(params.stemSpacing + params.thickness, 1)
```
```ts
    expect(minAbsX).toBeGreaterThan(params.stemSpacing / 2 - params.thickness / 2 - 0.1)
```

7. Ajuste o teste `'aproxima as hastes mantendo o par simétrico'`:
```ts
    expect(sb.max.x - sb.min.x).toBeGreaterThan(params.thickness)
```

8. No teste `'usa haste simples quando não há espaço para duas hastes'`:
   - Use `thickness: 4` para forçar a largura máxima e o fallback.
   - Troque a expectativa de largura:
```ts
    expect(bb.max.x - bb.min.x).toBeCloseTo(params.thickness, 1)
```

### Step 2: Rodar os testes para confirmar a falha

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
```
Expected: FAIL no teste de `stemWidth` e nas expectativas de largura/espessura.

### Step 3: Remover `stemWidth` do schema

Em `schema.ts`:

1. Remova:
```ts
  stemWidth: z.number().min(3).max(8),
```

2. Em `defaultCakeTopperParams`, troque:
```ts
  supportType: 'haste', stemWidth: 4, stemLength: 40, stemSpacing: 20,
```
por:
```ts
  supportType: 'haste', stemLength: 40, stemSpacing: 20,
```

### Step 4: Remover `stemWidth` do hook

Em `useCakeTopper.ts`, remova de `NUMERIC_RANGES`:
```ts
  stemWidth: { min: 3, max: 8 },
```

### Step 5: Usar a espessura no builder

Em `buildCakeTopper.ts`:

1. Em `buildStem`, troque:
```ts
  const halfWidth = params.stemWidth / 2
```
por:
```ts
  const halfWidth = params.thickness / 2
```

2. Ainda em `buildStem`, troque:
```ts
  const tipLength = Math.min(
    params.stemWidth * STEM_TIP_RATIO,
    params.stemLength * STEM_MAX_TIP_LENGTH_RATIO,
  )
```
por:
```ts
  const tipLength = Math.min(
    params.thickness * STEM_TIP_RATIO,
    params.stemLength * STEM_MAX_TIP_LENGTH_RATIO,
  )
```

3. Em `buildSupport`, troque:
```ts
    const halfWidth = params.stemWidth / 2
```
por:
```ts
    const halfWidth = params.thickness / 2
```

### Step 6: Remover o slider do painel

Em `StudioPanel.tsx`:

1. Em `SLIDER_LIMITS`, remova:
```ts
  stemWidth: { min: 3, max: 8, step: 0.5 },
```

2. Na seção **Fixação**, remova o bloco:
```tsx
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura da haste</Text>
                <Text fontSize="xs" color="font.secondary">{params.stemWidth} mm</Text>
              </Flex>
              <SliderField
                label="Largura da haste"
                labelHidden
                aria-label="Largura da haste"
                min={SLIDER_LIMITS.stemWidth.min}
                max={SLIDER_LIMITS.stemWidth.max}
                step={SLIDER_LIMITS.stemWidth.step}
                value={params.stemWidth}
                onChange={(value) => onUpdateParam('stemWidth', value as number)}
              />
```

### Step 7: Verificar resíduos

Run:
```bash
grep -R "stemWidth\|Largura da haste" src/features/studio/tools/confeitaria/topo-bolo tests/features/studio/tools/confeitaria/topo-bolo
```
Expected: nenhuma ocorrência.

### Step 8: Rodar testes, typecheck e lint

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/
npm run typecheck
npm run lint
```
Expected: PASS.

### Step 9: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/schema.ts \
  src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts \
  src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts \
  src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx \
  tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
git commit -m "refactor(topo-bolo): usa a espessura da placa como largura da haste"
```

---

## Task 2: Atualizar a documentação

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md`
- Modify: `docs/frontend/studio.md`

### Step 1: Atualizar o `AGENTS.md`

Troque:
```md
- Hastes: largura 3–8mm, espessura igual à da placa, comprimento 20–60mm e ponta chanfrada plana de 0,8mm
```
por:
```md
- Hastes: seção quadrada com lado igual à espessura da placa, comprimento 20–60mm e ponta chanfrada plana de 0,8mm
```

Troque:
```md
- `haste`: haste plana de espessura igual à placa, embutida 2mm, com ponta chanfrada no plano X/Y
```
por:
```md
- `haste`: haste de seção quadrada (lado = espessura da placa), embutida 2mm, com ponta chanfrada no plano X/Y
```

### Step 2: Atualizar `docs/frontend/studio.md`

Troque:
```md
Fixação por `haste` (uma haste) ou `haste-dupla` (duas hastes paralelas), com haste plana de espessura igual à placa, ponta chanfrada e espaçamento ajustável na haste dupla;
```
por:
```md
Fixação por `haste` (uma haste) ou `haste-dupla` (duas hastes paralelas), com haste de seção quadrada cujo lado é a espessura da placa, ponta chanfrada e espaçamento ajustável na haste dupla;
```

### Step 3: Verificar resíduos

Run:
```bash
grep -R "largura 3–8mm\|largura da haste\|Largura da haste" src/features/studio/tools/confeitaria/topo-bolo docs/frontend/studio.md
```
Expected: nenhuma ocorrência.

### Step 4: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md docs/frontend/studio.md
git commit -m "docs(topo-bolo): documenta haste com seção quadrada"
```

---

## Task 3: Verificação final

### Step 1: Rodar a suíte completa

```bash
npm test
```
Expected: PASS.

### Step 2: Typecheck

```bash
npm run typecheck
```
Expected: PASS.

### Step 3: Lint

```bash
npm run lint
```
Expected: PASS.

### Step 4: Build

```bash
npm run build
```
Expected: PASS.

### Step 5: Revisar o diff

```bash
git status --short
git diff --stat
```
Expected: apenas os arquivos das tasks acima.
