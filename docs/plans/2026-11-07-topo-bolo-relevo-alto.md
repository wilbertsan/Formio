# Topo de Bolo — Relevo alto fixo: Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remover o seletor `Modo do conteúdo` e todo o caminho de corte vazado; o topo de bolo passa a gerar sempre relevo alto, mantendo o slider de altura do relevo por texto.

**Architecture:** Remover `textMode` do schema e o parâmetro `mode` do builder. `buildCakeTopper` sempre monta placa + relevo + fixação. O painel perde apenas o select de modo. O CSG continua sendo usado somente no encaixe da base.

**Tech Stack:** React 19, TypeScript strict, Three.js, three-bvh-csg, Zod, Amplify UI, Vitest.

**Design aprovado:** `docs/plans/2026-11-07-topo-bolo-relevo-alto-design.md`

---

## Task 1: Remover `textMode` e o caminho de corte

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/schema.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/placement.ts`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx`

### Step 1: Atualizar os testes

1. Em `schema.test.ts`, remova o teste:
```ts
  it('rejects invalid textMode', () => {
    const invalid = { ...defaultCakeTopperParams, textMode: 'x' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
```

E adicione ao final do `describe('cakeTopperParamsSchema', ...)`:
```ts
  it('does not expose textMode anymore', () => {
    expect('textMode' in cakeTopperParamsSchema.shape).toBe(false)
    expect('textMode' in defaultCakeTopperParams).toBe(false)
  })
```

2. Em `useCakeTopper.test.ts`, remova o teste:
```ts
  it('updateParam atualiza textMode', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => result.current.updateParam('textMode', 'cut'))
    expect(result.current.params.textMode).toBe('cut')
  })
```

3. Em `StudioPanel.test.tsx`, remova o teste:
```ts
  it('dispara onUpdateParam ao mudar o modo do conteúdo', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.change(screen.getByLabelText('Modo do conteúdo'), { target: { value: 'cut' } })
    expect(props.onUpdateParam).toHaveBeenCalledWith('textMode', 'cut')
  })
```

4. Em `buildCakeTopper.test.ts`, remova o bloco inteiro:
```ts
describe('buildCakeTopper - corte (cut)', () => {
  // ...
})
```

E adicione ao `describe('buildCakeTopper - relevo (raised)', ...)`, depois do teste `'mescla múltiplos textos em relevo'`:
```ts
  it('sempre gera relevo, sem modo de corte', () => {
    const params = {
      ...defaultCakeTopperParams,
      texts: [text({ content: 'A', width: 20, height: 10 })],
    }
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('A') } })
    expect(result.relief).not.toBeNull()
    expect(result.relief!.attributes.position).toBeDefined()
  })
```

### Step 2: Rodar os testes para confirmar a falha

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts
```
Expected: FAIL — `textMode` ainda existe no schema/default.

### Step 3: Remover `textMode` do schema

Em `schema.ts`:

1. Remova:
```ts
  textMode: z.enum(['raised', 'cut']),
```

2. Remova:
```ts
export type TextMode = CakeTopperParams['textMode']
```

3. Em `defaultCakeTopperParams`, remova `textMode: 'raised',`:
```ts
  textMode: 'raised', supportType: 'haste', stemDiameter: 4, stemLength: 40,
```
passa a ser:
```ts
  supportType: 'haste', stemDiameter: 4, stemLength: 40,
```

### Step 4: Remover o select do painel

Em `StudioPanel.tsx`, remova o bloco:
```tsx
              <SelectField
                label="Modo do conteúdo"
                value={params.textMode}
                onChange={(event) => onUpdateParam('textMode', event.target.value)}
              >
                <option value="raised">Relevo</option>
                <option value="cut">Corte vazado</option>
              </SelectField>
```

O restante da seção **Conteúdo** permanece igual.

### Step 5: Simplificar o builder

Em `buildCakeTopper.ts`:

1. Remova `containsCorner` do import de `./placement`:
```ts
import {
  clampToOutline,
  containsCorner,
  fitScaleToOutline,
  outlineSpec,
  type PlateBounds,
} from './placement'
```
passa a ser:
```ts
import {
  clampToOutline,
  fitScaleToOutline,
  outlineSpec,
  type PlateBounds,
} from './placement'
```

2. Troque o import de tipos:
```ts
import type { CakeTopperParams, FontStyle, TextMode } from './schema'
```
por:
```ts
import type { CakeTopperParams, FontStyle } from './schema'
```

3. Remova as constantes:
```ts
const CUT_BORDER = 4
const CUT_Z_OFFSET = -0.5
```

4. Remova a função:
```ts
function disposeAll(geometries: BufferGeometry[]): void {
  geometries.forEach((geometry) => geometry.dispose())
}
```

5. Em `buildTextGeometries`, troque a assinatura:
```ts
function buildTextGeometries(
  input: BuildCakeTopperInput,
  mode: TextMode,
  plate: PlateBounds,
): BufferGeometry[] {
```
por:
```ts
function buildTextGeometries(
  input: BuildCakeTopperInput,
  plate: PlateBounds,
): BufferGeometry[] {
```

6. Ainda em `buildTextGeometries`, troque:
```ts
    const depth = mode === 'cut' ? params.thickness + 1 : item.relief
    const geometry = shapesToGeometry(shapes, depth, mode === 'raised')
```
por:
```ts
    const geometry = shapesToGeometry(shapes, item.relief, true)
```

7. Ainda em `buildTextGeometries`, troque:
```ts
    const z = mode === 'cut' ? CUT_Z_OFFSET : params.thickness - TEXT_Z_OFFSET
```
por:
```ts
    const z = params.thickness - TEXT_Z_OFFSET
```

8. Em `buildIconGeometry`, troque a assinatura:
```ts
function buildIconGeometry(
  params: CakeTopperParams,
  mode: TextMode,
  plate: PlateBounds,
): BufferGeometry | null {
```
por:
```ts
function buildIconGeometry(
  params: CakeTopperParams,
  plate: PlateBounds,
): BufferGeometry | null {
```

9. Ainda em `buildIconGeometry`, troque:
```ts
    depth: mode === 'cut' ? params.thickness + 1 : ICON_DEPTH,
```
por:
```ts
    depth: ICON_DEPTH,
```

10. Ainda em `buildIconGeometry`, troque:
```ts
  const z = mode === 'cut' ? CUT_Z_OFFSET : params.thickness - TEXT_Z_OFFSET
```
por:
```ts
  const z = params.thickness - TEXT_Z_OFFSET
```

11. Em `buildRelief`, troque:
```ts
function buildRelief(
  input: BuildCakeTopperInput,
  mode: TextMode,
  plate: PlateBounds,
): BufferGeometry | null {
  const textGeometries = buildTextGeometries(input, mode, plate)
  const icon = buildIconGeometry(input.params, mode, plate)
```
por:
```ts
function buildRelief(
  input: BuildCakeTopperInput,
  plate: PlateBounds,
): BufferGeometry | null {
  const textGeometries = buildTextGeometries(input, plate)
  const icon = buildIconGeometry(input.params, plate)
```

12. Remova a função inteira:
```ts
function cutFits(params: CakeTopperParams, plate: PlateBounds, cuts: BufferGeometry[]): boolean {
  // ...
}
```

13. Substitua o corpo de `buildCakeTopper`:
```ts
export function buildCakeTopper(input: BuildCakeTopperInput): BuildCakeTopperResult {
  const { params, onError } = input
  const plate = extrudePlate(plateShapes(params, onError), params.thickness, onError)
  const plateBounds = plateBoundsOf(plate, params)

  if (params.textMode === 'raised') {
    return {
      plate,
      relief: buildRelief(input, 'raised', plateBounds),
      support: buildSupport(params, plate, onError),
    }
  }

  const cutText = buildTextGeometries(input, 'cut', plateBounds)
  const cutIcon = buildIconGeometry(params, 'cut', plateBounds)
  const cuts = cutIcon ? [...cutText, cutIcon] : cutText

  if (cuts.length > 0) {
    if (cutFits(params, plateBounds, cuts)) {
      const cutGeometry = mergeAll(cuts, onError)
      try {
        const result = new Evaluator()
          .evaluate(new Brush(plate), new Brush(cutGeometry), SUBTRACTION)
          .geometry
        result.computeVertexNormals()
        plate.dispose()
        cutGeometry.dispose()
        return { plate: result, relief: null, support: buildSupport(params, result, onError) }
      } catch {
        onError?.('Falha no corte; usando relevo')
        cutGeometry.dispose()
      }
    } else {
      onError?.('Corte alcançaria a borda; usando relevo')
      disposeAll(cuts)
    }
  }

  return {
    plate,
    relief: buildRelief(input, 'raised', plateBounds),
    support: buildSupport(params, plate, onError),
  }
}
```
por:
```ts
export function buildCakeTopper(input: BuildCakeTopperInput): BuildCakeTopperResult {
  const { params, onError } = input
  const plate = extrudePlate(plateShapes(params, onError), params.thickness, onError)
  const plateBounds = plateBoundsOf(plate, params)

  return {
    plate,
    relief: buildRelief(input, plateBounds),
    support: buildSupport(params, plate, onError),
  }
}
```

14. Confirme que `Evaluator`, `Brush` e `SUBTRACTION` continuam importados, pois `buildBase` ainda usa CSG para o encaixe.

### Step 6: Remover `containsCorner` sem uso

Em `placement.ts`, remova a função exportada:
```ts
export function containsCorner(
  spec: OutlineSpec,
  hw: number,
  hh: number,
  cx: number,
  cy: number,
): boolean {
  const ax = Math.abs(cx) + hw
  const ay = Math.abs(cy) + hh
  if (spec.box) return ax <= spec.rx && ay <= spec.ry
  if (spec.rx <= 0 || spec.ry <= 0) return false
  return (ax / spec.rx) ** 2 + (ay / spec.ry) ** 2 <= 1 + 1e-9
}
```

`OutlineSpec` continua exportado e usado por `outlineSpec`/`fitScaleToOutline`.

### Step 7: Rodar os testes e o typecheck

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/
npm run typecheck
```
Expected: PASS nos testes e no typecheck.

### Step 8: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/schema.ts \
  src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts \
  src/features/studio/tools/confeitaria/topo-bolo/placement.ts \
  src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx \
  tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx
git commit -m "refactor(topo-bolo): remove modo de corte e fixa relevo alto"
```

---

## Task 2: Atualizar a documentação

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md`
- Modify: `docs/frontend/studio.md`

### Step 1: Atualizar o `AGENTS.md`

Na seção `## Parâmetros`, remova a linha:
```md
- Modo do conteúdo: `raised` (relevo) ou `cut` (vazado via CSG com fallback)
```

E acrescente:
```md
- Acabamento: sempre relevo alto (texto usa `relief`; ícone usa 1mm)
```

Na seção `## Regras do domínio`, remova:
```md
- Texto em relevo (`raised`) ou vazado (`cut`) — o vazado usa subtração CSG; se o corte alcançar a borda ou a operação falhar, cai para relevo
```

E acrescente:
```md
- Texto e ícone são sempre gerados em relevo alto; não há modo de corte vazado
```

### Step 2: Atualizar `docs/frontend/studio.md`

Substitua o bullet **Topo de Bolo** por:
```md
- **Topo de Bolo:** Toppers decorativos para bolo com 1–3 textos independentes e um ícone SVG opcional, todos dentro de uma única seção **Conteúdo** no painel. O conteúdo é sempre gerado em relevo alto: cada texto usa `relief` (0,4–3mm) e o ícone usa 1mm. Placa em `circle`, `rounded-rect`, `oval` ou contorno `custom` por SVG, via ExtrudeGeometry. Textos e ícone são posicionados livremente pelo editor 2D: textos usam `offsetX`/`offsetY`; o ícone usa `iconOffsetX`/`iconOffsetY`, ambos limitados ao contorno da placa. Fixação por `haste` (cilindro integrado) ou `base` separada com canaleta de encaixe. Exportação STL binário.
```

### Step 3: Verificar resíduos

Run:
```bash
grep -R "textMode\|Corte vazado\|vazado via CSG" src/features/studio/tools/confeitaria/topo-bolo docs/frontend/studio.md
```
Expected: nenhuma ocorrência (exceto planos históricos, que não são alvo).

### Step 4: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md docs/frontend/studio.md
git commit -m "docs(topo-bolo): documenta o relevo alto fixo"
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
