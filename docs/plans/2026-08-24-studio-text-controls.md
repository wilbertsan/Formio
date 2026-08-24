# Controles do Bloco Texto Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir o bloco Texto do StudioPanel — estilo de letra em dropdown (sem overflow), sliders de Largura/Altura do texto e Altura do relevo na aba Texto — sem afetar as dimensões da peça (Largura da peça migra para a aba Base).

**Architecture:** Schema ganha `textWidth` (8–60) e `textSize` (4–20); `buildKeychain` gera o texto com `size = textSize` e escala uniforme limitada por `textWidth`/área útil (regra 4mm preservada); `StudioPanel` troca o ButtonGroup por `SelectField` e reorganiza os sliders entre os blocos Texto/Base/Relevo.

**Tech Stack:** Amplify UI 6 (SelectField, SliderField, TextField), Zod, three TextGeometry, Vitest.

**Design doc:** `docs/plans/2026-08-24-studio-text-controls-design.md`

---

## Convenções para o executor

- **TDD obrigatório:** @superpowers:test-driven-development — teste → falha → implementação → pass → commit.
- **Commits semânticos** após cada task; toda task termina com lint+typecheck+test verdes.
- **Comandos:** `npm run lint`, `npm run typecheck`, `npm run test`.
- **Contexto:** repo `/opt/projects/BELIS3D`, branch `main`, 102 testes verdes. Arquivos-chave: `src/features/studio/keychain/{schema.ts,buildKeychain.ts,textToGeometry.ts}`, `src/features/studio/components/StudioPanel.tsx` e testes espelhados em `tests/features/studio/`.
- **Mocks padrão:** copie dos testes existentes (TextGeometry mock com box proporcional a `size`, CSG/merge/FontLoader mockados).
- **SelectField do Amplify UI:** `label`, `value`, `onChange={(e) => ...}` com `e.target.value`; filhos `<option value="...">`.

---

### Task 1: Schema com textWidth e textSize (TDD)

**Files:**
- Modify: `src/features/studio/keychain/schema.ts`
- Test: `tests/features/studio/keychain/schema.test.ts`

**Step 1: Adicionar testes que falham** — no describe principal de `tests/features/studio/keychain/schema.test.ts`, adicionar:

```ts
  it('rejeita textWidth e textSize fora dos ranges', () => {
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, textWidth: 4 }).success,
    ).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, textWidth: 65 }).success,
    ).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, textSize: 2 }).success,
    ).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, textSize: 25 }).success,
    ).toBe(false)
  })

  it('defaults incluem textWidth 40 e textSize 10', () => {
    expect(defaultKeychainParams.textWidth).toBe(40)
    expect(defaultKeychainParams.textSize).toBe(10)
  })
```

**Step 2: Rodar → FAIL**

Run: `npx vitest run tests/features/studio/keychain/schema.test.ts`

**Step 3: Implementar** — em `src/features/studio/keychain/schema.ts`:

No `keychainParamsSchema`, adicionar após `letterHeight`:

```ts
  textWidth: z.number().min(8).max(60),
  textSize: z.number().min(4).max(20),
```

No `defaultKeychainParams`, adicionar:

```ts
  textWidth: 40,
  textSize: 10,
```

**Step 4: Rodar → PASS** (o teste "defaults são válidos" já cobre o parse)

**Step 5: Verificação completa** — `npm run lint && npm run typecheck && npm run test`
(Nota: `useKeychain.test` e `StudioPanel.test` podem quebrar por ausência dos novos defaults no mock — se quebrarem, atualize os objetos mockados com `textWidth: 40, textSize: 10`.)

**Step 6: Commit**

```bash
git add src/features/studio/keychain/schema.ts tests/features/studio/keychain/schema.test.ts
git commit -m "feat: adiciona textWidth e textSize ao schema do chaveiro"
```

---

### Task 2: buildKeychain com escala do texto (TDD)

**Files:**
- Modify: `src/features/studio/keychain/buildKeychain.ts`
- Test: `tests/features/studio/keychain/buildKeychain.test.ts`

**Step 1: Adicionar testes que falham** — em `tests/features/studio/keychain/buildKeychain.test.ts`, adicionar dentro do describe principal:

```ts
  it('textSize define a altura das letras', () => {
    const small = buildKeychain(makeInput({
      params: { ...defaultKeychainParams, textSize: 8 } as never,
    }))
    const large = buildKeychain(makeInput({
      params: { ...defaultKeychainParams, textSize: 16 } as never,
    }))
    small.text.computeBoundingBox()
    large.text.computeBoundingBox()
    const hSmall = (small.text.boundingBox?.max.y ?? 0) - (small.text.boundingBox?.min.y ?? 0)
    const hLarge = (large.text.boundingBox?.max.y ?? 0) - (large.text.boundingBox?.min.y ?? 0)
    expect(hLarge).toBeGreaterThan(hSmall)
  })

  it('textWidth limita a largura do texto sem exceder a área útil', () => {
    const result = buildKeychain(makeInput({
      params: { ...defaultKeychainParams, textWidth: 60, width: 50, borderWidth: 4 } as never,
    }))
    result.text.computeBoundingBox()
    const w = (result.text.boundingBox?.max.x ?? 0) - (result.text.boundingBox?.min.x ?? 0)
    expect(w).toBeLessThanOrEqual(50 - 2 * 4 + 1)
  })

  it('textWidth menor reduz a largura do texto', () => {
    const wide = buildKeychain(makeInput({
      params: { ...defaultKeychainParams, textWidth: 40 } as never,
    }))
    const narrow = buildKeychain(makeInput({
      params: { ...defaultKeychainParams, textWidth: 12 } as never,
    }))
    wide.text.computeBoundingBox()
    narrow.text.computeBoundingBox()
    const wWide = (wide.text.boundingBox?.max.x ?? 0) - (wide.text.boundingBox?.min.x ?? 0)
    const wNarrow = (narrow.text.boundingBox?.max.x ?? 0) - (narrow.text.boundingBox?.min.x ?? 0)
    expect(wWide).toBeGreaterThan(wNarrow)
  })
```

Nota: o mock de TextGeometry gera box com largura = `size * 4` (nome "Meu nome" = 7 chars, mas o mock é fixo em size*4 — os testes acima funcionam porque a escala pós-geração altera o bounding box). Confirme o comportamento do mock atual (`size * 4`) e ajuste as expectativas se necessário.

**Step 2: Rodar → FAIL**

**Step 3: Implementar** — em `src/features/studio/keychain/buildKeychain.ts`, substituir o bloco de cálculo do tamanho do texto (linhas ~66–72, `availableWidth`/`textSize`/`fitTextHeight`) por:

```ts
  const availableWidth = params.width - 2 * params.borderWidth
  const targetWidth = Math.min(params.textWidth, availableWidth)
  const textGeometry = buildScaledTextGeometry({ font, params, targetWidth })
```

E criar o helper antes de `buildKeychain`:

```ts
function buildScaledTextGeometry({
  font,
  params,
  targetWidth,
}: {
  font: Font
  params: KeychainParams
  targetWidth: number
}): BufferGeometry {
  const geometry = nameToGeometry({
    font,
    name: params.name,
    size: params.textSize,
    depth: params.textMode === 'raised' ? params.letterHeight : params.letterHeight + ENGRAVE_EPSILON,
  })
  geometry.computeBoundingBox()
  const naturalWidth = geometry.boundingBox
    ? geometry.boundingBox.max.x - geometry.boundingBox.min.x
    : 0
  if (naturalWidth > targetWidth && naturalWidth > 0) {
    const scale = targetWidth / naturalWidth
    geometry.scale(scale, scale, 1)
    geometry.center()
  }
  return geometry
}
```

Ajustar os três caminhos (raised/engraved/fallback) para usar o helper — o `depth` já vem correto do helper, então:
- raised: `const textGeometry = buildScaledTextGeometry(...)` + `textGeometry.translate(0, 0, params.thickness - 0.01)`
- engraved: mesmo helper + `translate(0, 0, params.thickness)` antes do CSG
- fallback no catch: mesmo helper + translate do raised

Remover o import de `fitTextHeight` se não restar uso (a função continua exportada de `textToGeometry.ts` com seus testes — não a delete).

**Step 4: Rodar → PASS** (inclui os testes existentes de fit/borderWidth — "usando borderWidth menor resulta em texto maior" pode precisar de ajuste: com o novo mecanismo, a largura do texto = min(textWidth, área útil); com `textWidth: 40` default e áreas 42 (border 4) vs 30 (border 10), ambos dão 40/30 → o teste segue válido pois 40 > 30)

**Step 5: Verificação completa**

**Step 6: Commit**

```bash
git add src/features/studio/keychain/buildKeychain.ts tests/features/studio/keychain/buildKeychain.test.ts
git commit -m "feat: texto com largura e altura controláveis e clamp de segurança"
```

---

### Task 3: StudioPanel — dropdown de estilo e sliders reorganizados (TDD)

**Files:**
- Modify: `src/features/studio/components/StudioPanel.tsx`
- Test: `tests/features/studio/components/StudioPanel.test.tsx`

**Step 1: Atualizar o teste** — em `tests/features/studio/components/StudioPanel.test.tsx`:

1. No teste `renderiza campo de nome e estilo de letra`, trocar as queries de botão por combobox:

```ts
  it('renderiza campo de nome e dropdown de estilo de letra', () => {
    renderPanel()
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    const styleSelect = screen.getByRole('combobox', { name: /estilo da letra/i })
    expect(styleSelect).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /negrito/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /normal/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /serifada/i })).toBeInTheDocument()
  })
```

2. Trocar o teste `dispara onUpdateParam ao trocar estilo de letra`:

```ts
  it('dispara onUpdateParam ao trocar estilo de letra', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    renderPanel(onUpdate)
    await user.selectOptions(screen.getByRole('combobox', { name: /estilo da letra/i }), 'normal')
    expect(onUpdate).toHaveBeenCalledWith('fontStyle', 'normal')
  })
```

3. Adicionar:

```ts
  it('renderiza sliders de largura, altura do texto e relevo no bloco Texto', () => {
    renderPanel()
    expect(screen.getByLabelText('Largura do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura do texto')).toBeInTheDocument()
    expect(screen.getByLabelText('Altura do relevo')).toBeInTheDocument()
  })

  it('renderiza slider de largura da peça no bloco Base', () => {
    renderPanel()
    expect(screen.getByLabelText('Largura')).toBeInTheDocument()
  })

  it('não renderiza botões soltos de estilo de letra', () => {
    renderPanel()
    expect(screen.queryByRole('button', { name: /^negrito$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^normal$/i })).not.toBeInTheDocument()
  })
```

Nota: "Largura" (peça) e "Largura do texto" têm nomes distintos — `getByLabelText('Largura')` faz match exato por padrão na accessible name? Não — é substring. Use `getByLabelText('Largura')` com cuidado: ele pode achar ambos. Prefira queries exatas: `getByLabelText('Largura')` acha "Largura" e também "Largura do texto" (ambíguo → erro). Solução: use `getByLabelText('Largura do texto')` para o texto e para a peça use a aria-label "Largura da peça" (renomeie no componente) — teste: `getByLabelText('Largura da peça')`.

**Step 2: Rodar → FAIL**

**Step 3: Implementar** — em `src/features/studio/components/StudioPanel.tsx`:

1. Importar `SelectField` (já importa de `@aws-amplify/ui-react`); remover `ButtonGroup` se não restar uso (a Argola ainda usa ButtonGroup para posição — mantém).

2. Substituir o bloco de estilo (Text "Estilo da letra" + ButtonGroup) por:

```tsx
              <SelectField
                label="Estilo da letra"
                value={params.fontStyle}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('fontStyle', e.target.value)
                }
              >
                <option value="bold">Negrito</option>
                <option value="normal">Normal</option>
                <option value="serif">Serifada</option>
              </SelectField>
```

3. No bloco Texto, substituir os sliders "Largura" (peça) e "Altura da letra" pelos três novos (padrão label row + SliderField):

```tsx
              {/* Largura do texto */}
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura do texto</Text>
                <Text fontSize="xs" color="font.secondary">{params.textWidth} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura do texto"
                min={8} max={60} step={1}
                value={params.textWidth}
                onChange={(value) => onUpdateParam('textWidth', value as number)}
              />

              {/* Altura do texto */}
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura do texto</Text>
                <Text fontSize="xs" color="font.secondary">{params.textSize} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura do texto"
                min={4} max={20} step={0.5}
                value={params.textSize}
                onChange={(value) => onUpdateParam('textSize', value as number)}
              />

              {/* Altura do relevo */}
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura do relevo</Text>
                <Text fontSize="xs" color="font.secondary">{params.letterHeight} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura do relevo"
                min={0.4} max={2} step={0.1}
                value={params.letterHeight}
                onChange={(value) => onUpdateParam('letterHeight', value as number)}
              />
```

4. No bloco Base, adicionar o slider da peça (antes de Espessura):

```tsx
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura da peça</Text>
                <Text fontSize="xs" color="font.secondary">{params.width} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura da peça"
                min={20} max={80} step={1}
                value={params.width}
                onChange={(value) => onUpdateParam('width', value as number)}
              />
```

5. No bloco Relevo, remover o slider "Altura do relevo" duplicado — deixar só um texto + toggle de modo (se hoje não existe toggle de modo no Relevo, adicionar 2 botões Relevo/Gravado com `aria-pressed`, chamando `onUpdateParam('textMode', ...)` — verifique o que existe hoje e complete).

**Step 4: Rodar → PASS**

**Step 5: Verificação completa**: `npm run lint && npm run typecheck && npm run test`

**Step 6: Commit**

```bash
git add src/features/studio/components/StudioPanel.tsx tests/features/studio/components/StudioPanel.test.tsx
git commit -m "feat: bloco texto com dropdown de estilo e controles de dimensão do texto"
```

---

### Task 4: Docs + verificação final

**Files:**
- Modify: `docs/frontend/studio.md`

**Step 1: Atualizar docs** — na seção do painel/blocos:

- Bloco Texto: "nome, estilo da letra (dropdown Negrito/Normal/Serifada), largura do texto (8–60mm), altura do texto (4–20mm) e altura do relevo (0.4–2mm)"
- Bloco Base: incluir "largura da peça"
- Bloco Relevo: "modo relevo/gravado"
- Decisões: adicionar "**Controle direto do texto:** `textWidth` e `textSize` no schema; escala uniforme no build limitada pela área útil (regra de 4mm preservada). Estilo em SelectField (sem overflow no painel)."

**Step 2: Verificação final**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
git log --oneline -6
```

**Manual (registrar):**
```bash
npm run dev
# /studio → bloco Texto:
# 1. Dropdown de estilo dentro do painel (sem itens fora da área)
# 2. Largura/Altura do texto alteram SÓ o texto
# 3. Altura do relevo altera só a profundidade Z
# 4. Largura da peça na aba Base altera a peça
# 5. Texto nunca passa da borda de 4mm
```

**Step 3: Commit**

```bash
git add docs/frontend/studio.md
git commit -m "docs: documenta controles do bloco texto"
```

---

## Verification final (executor)

```bash
npm run lint && npm run typecheck && npm run test && npm run build
git log --oneline -6
```

Expected: 4 commits; testes verdes; dropdown funcional; sliders reorganizados.
