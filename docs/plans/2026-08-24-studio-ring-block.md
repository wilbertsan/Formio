# Bloco Argola com Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bloco Argola do StudioPanel com Posição em SelectField (fim do overflow), remoção do slider e do campo `ringThickness` — anel de reforço com espessura fixa de 2mm.

**Architecture:** Mudança em 3 camadas: schema (remove `ringThickness`), shapes (constante interna `RING_WALL = 2` substitui o campo em `RingParams`) e StudioPanel (SelectField de posição + 3 controles restantes). Testes atualizados em cada camada.

**Tech Stack:** Amplify UI 6 (SelectField, SliderField), Zod, Vitest.

**Design doc:** `docs/plans/2026-08-24-studio-ring-block-design.md`

---

## Convenções para o executor

- **TDD obrigatório:** @superpowers:test-driven-development — teste → falha → implementação → pass → commit.
- **Commits semânticos**; toda task termina com lint+typecheck+test verdes.
- **Comandos:** `npm run lint`, `npm run typecheck`, `npm run test`.
- **Contexto:** repo `/opt/projects/BELIS3D`, branch `main`, 110 testes verdes. `ringThickness` é referenciado em: `schema.ts` (campo+default), `shapes.ts` (`RingParams` + `createReinforcementRing`), `buildKeychain.ts` (monta `RingParams`), `StudioPanel.tsx` (slider) e testes de schema/shapes/StudioPanel. Ajuste todos — `grep -rn "ringThickness" src/ tests/` para confirmar zero referências no fim da Task 1.
- **SelectField:** mesmo padrão do "Estilo da letra" (Task anterior do bloco Texto) — `label`, `value`, `onChange={(e) => onUpdateParam('ringPosition', e.target.value)}` com `<option>` filhos.

---

### Task 1: Remover ringThickness do schema e fixar anel em 2mm (TDD)

**Files:**
- Modify: `src/features/studio/keychain/schema.ts`
- Modify: `src/features/studio/keychain/shapes.ts`
- Modify: `src/features/studio/keychain/buildKeychain.ts`
- Test: `tests/features/studio/keychain/schema.test.ts`, `tests/features/studio/keychain/shapes.test.ts`

**Step 1: Atualizar testes**

Em `tests/features/studio/keychain/schema.test.ts`:
- Remover qualquer asserção específica de `ringThickness` (ranges/defaults). Se houver teste que usa `ringThickness` em safeParse spread, remover a linha do objeto.
- Adicionar:

```ts
  it('schema não inclui ringThickness', () => {
    expect('ringThickness' in keychainParamsSchema.shape).toBe(false)
  })
```

Em `tests/features/studio/keychain/shapes.test.ts`:
- Ajustar o objeto `ring` dos helpers removendo `thickness` (ou trocando por nada — verificar como o helper constrói).
- No teste do `createReinforcementRing`, ajustar para espessura fixa:

```ts
  it('anel externo maior que furo interno com parede de 2mm', () => {
    const ringShape = createReinforcementRing(getRing('top'))
    const outerBB = boundingBox(ringShape)
    const holeBB = new THREE.Box3().setFromPoints(ringShape.holes[0].getPoints(32))
    const outerRadius = (outerBB.max.x - outerBB.min.x) / 2
    const holeRadius = (holeBB.max.x - holeBB.min.x) / 2
    expect(outerRadius - holeRadius).toBeCloseTo(2, 1)
  })
```

**Step 2: Rodar → FAIL**

Run: `npx vitest run tests/features/studio/keychain/schema.test.ts tests/features/studio/keychain/shapes.test.ts`

**Step 3: Implementar**

`schema.ts`:
- Remover linha `ringThickness: z.number().min(1.5).max(4),` do schema
- Remover `ringThickness: 2,` dos defaults

`shapes.ts`:
- Adicionar constante no topo (após imports): `const RING_WALL = 2`
- Em `RingParams`, remover `thickness: number`
- Em `createReinforcementRing`, trocar `ring.innerDiameter / 2 + ring.thickness` por `ring.innerDiameter / 2 + RING_WALL`

`buildKeychain.ts`:
- No objeto `ring` montado, remover a linha `thickness: params.ringThickness,`

**Step 4: Rodar → PASS** (ajustar qualquer outro teste/uso que referencie ringThickness — StudioPanel quebrará de typecheck, corrigir removendo o slider "Espessura do anel" já nesta task se o typecheck exigir; senão deixar para a Task 2)

Run: `npm run lint && npm run typecheck && npm run test`

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove ringThickness e fixa parede do anel em 2mm"
```

---

### Task 2: StudioPanel — posição em dropdown e slider removido (TDD)

**Files:**
- Modify: `src/features/studio/components/StudioPanel.tsx`
- Test: `tests/features/studio/components/StudioPanel.test.tsx`

**Step 1: Atualizar o teste**

Em `tests/features/studio/components/StudioPanel.test.tsx`:

1. Trocar o teste de controles de argola (o que verifica botões de posição) por:

```ts
  it('renderiza dropdown de posição no bloco Argola', () => {
    renderPanel()
    expect(screen.getByRole('combobox', { name: /posição/i })).toBeInTheDocument()
  })

  it('renderiza sliders de diâmetro interno e embutimento', () => {
    renderPanel()
    expect(screen.getByLabelText('Diâmetro interno')).toBeInTheDocument()
    expect(screen.getByLabelText('Embutimento')).toBeInTheDocument()
  })

  it('não renderiza slider de espessura do anel', () => {
    renderPanel()
    expect(screen.queryByLabelText(/espessura do anel/i)).not.toBeInTheDocument()
  })

  it('dispara onUpdateParam ao trocar posição da argola', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    renderPanel(onUpdate)
    await user.selectOptions(screen.getByRole('combobox', { name: /posição/i }), 'left')
    expect(onUpdate).toHaveBeenCalledWith('ringPosition', 'left')
  })
```

Nota: se `getByRole('combobox', { name: /posição/i })` colidir com outro combobox, usar nome exato `/posição da argola/i` e ajustar o label do componente.

**Step 2: Rodar → FAIL**

**Step 3: Implementar** — em `StudioPanel.tsx`, no bloco Argola:

1. Substituir o `Text "Posição"` + `ButtonGroup` (linhas ~232–246) por:

```tsx
              <SelectField
                label="Posição"
                value={params.ringPosition}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('ringPosition', e.target.value)
                }
              >
                <option value="top">Cima</option>
                <option value="bottom">Baixo</option>
                <option value="left">Esquerda</option>
                <option value="right">Direita</option>
              </SelectField>
```

2. Remover o slider "Espessura do anel" (bloco Flex + SliderField de `ringThickness`, linhas ~266–282).

3. Remover `RING_POSITIONS` do topo se não restar uso; remover `ButtonGroup`/`Button` dos imports se órfãos (verificar outros usos — swatches usam Button).

**Step 4: Rodar → PASS**

Run: `npm run lint && npm run typecheck && npm run test`

**Step 5: Commit**

```bash
git add src/features/studio/components/StudioPanel.tsx tests/features/studio/components/StudioPanel.test.tsx
git commit -m "feat: posição da argola em dropdown sem controle de espessura"
```

---

### Task 3: Docs + verificação final

**Files:**
- Modify: `docs/frontend/studio.md`

**Step 1: Atualizar docs**

- Visão geral, bloco Argola: "**Argola** — posição (dropdown Cima/Baixo/Esquerda/Direita), diâmetro interno e embutimento"
- Decisões: "**Parede do anel fixa em 2mm:** `ringThickness` removido do schema; o anel de reforço usa a constante `RING_WALL` em `shapes.ts`."

**Step 2: Verificação final**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
grep -rn "ringThickness" src/ tests/ || echo "OK: zero referências"
git log --oneline -5
```

**Manual (registrar):**
```bash
npm run dev
# /studio → bloco Argola:
# 1. Dropdown Posição com 4 opções dentro do painel
# 2. Só diâmetro interno e embutimento como sliders
# 3. Trocar posição move o furo; anel de reforço com 2mm constante
```

**Step 3: Commit**

```bash
git add docs/frontend/studio.md
git commit -m "docs: documenta bloco argola com dropdown"
```

---

## Verification final (executor)

```bash
npm run lint && npm run typecheck && npm run test && npm run build
grep -rn "ringThickness" src/ tests/ || echo "OK: zero referências"
git log --oneline -5
```

Expected: 3 commits; testes verdes; zero referências a ringThickness.
