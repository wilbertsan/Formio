# Textos Múltiplos com Drag Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Suportar até 3 textos no chaveiro — empilhados, selecionáveis e configuráveis individualmente (chips + sliders por texto), com toggle proporcional por texto e arrastar-direto no viewport 3D respeitando borda (4mm) e furo.

**Architecture:** `texts: TextItem[]` substitui os campos globais de texto no schema; nova unidade pura `positioning.ts` (clamp + empilhamento) usada pelo build v3 (merge multi-texto, CSG único no gravado) e pelo drag; `StudioPanel` ganha chips de seleção +/lixeira e toggle; `KeychainPreview` renderiza um mesh por texto com `TextDraggable` (raycast no plano da peça). `selectedTextId` vive no StudioPage.

**Tech Stack:** Amplify UI 6 (SwitchField/ToggleField, chips custom), R3F eventos de pointer, Zod, Vitest.

**Design doc:** `docs/plans/2026-08-24-studio-multi-text-design.md`

---

## Convenções para o executor

- **TDD obrigatório:** @superpowers:test-driven-development — teste → falha → implementação → pass → commit. Tasks 8 é docs.
- **Commits semânticos**; toda task termina com lint+typecheck+test verdes. Esta feature muda o contrato do schema — tasks 1–3 quebram testes dependentes (useKeychain/StudioPanel/StudioPage/build): atualize-os na própria task para manter verde por commit.
- **Comandos:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- **Contexto:** repo `/opt/projects/BELIS3D`, branch `main`, 111 testes verdes. Campos globais atuais a remover: `name`, `fontStyle`, `letterHeight`, `textWidth`, `textSize`. `textMode` (raised/engraved) e cores continuam globais.
- **IDs de texto:** `crypto.randomUUID()` (nativo, browser+node ≥16) no addText.
- **Mocks:** padrões existentes em `tests/features/studio/` para TextGeometry/CSG/merge/FontLoader/fiber/drei — copie. O mock de TextGeometry gera box proporcional a `size*4`.
- **SwitchField do Amplify UI:** `<SwitchField label="..." isChecked={bool} onChange={(e) => ... e.target.checked} />` — verifique a API real no node_modules se divergir.

---

### Task 1: positioning.ts — clamp e empilhamento (TDD puro)

**Files:**
- Create: `src/features/studio/keychain/positioning.ts`
- Test: `tests/features/studio/keychain/positioning.test.ts`

**Step 1: Criar o teste**

```ts
import {
  clampTextPosition,
  defaultStackOffsets,
} from '@/features/studio/keychain/positioning'

describe('defaultStackOffsets', () => {
  it('um texto fica centrado em 0', () => {
    expect(defaultStackOffsets([10])).toEqual([0])
  })

  it('dois textos ficam um acima e um abaixo do centro', () => {
    const offsets = defaultStackOffsets([10, 10])
    expect(offsets[0]).toBeGreaterThan(0)
    expect(offsets[1]).toBeLessThan(0)
    expect(offsets[0] + offsets[1]).toBeCloseTo(0, 5)
  })

  it('espaçamento cresce com a altura do texto', () => {
    const small = defaultStackOffsets([8, 8])
    const large = defaultStackOffsets([16, 16])
    expect(Math.abs(large[0] - large[1])).toBeGreaterThan(Math.abs(small[0] - small[1]))
  })
})

describe('clampTextPosition', () => {
  const pieceBB = { minX: -25, maxX: 25, minY: -12.5, maxY: 12.5 }
  const textHalf = { halfWidth: 10, halfHeight: 5 }
  const hole = { x: 0, y: 10, radius: 4.5 }

  it('mantém posição válida', () => {
    const result = clampTextPosition({ x: 0, y: 0, ...textHalf }, pieceBB, hole)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })

  it('limita texto dentro da borda da peça', () => {
    const result = clampTextPosition({ x: 30, y: 0, ...textHalf }, pieceBB, hole)
    expect(result.x).toBeLessThanOrEqual(pieceBB.maxX - 4)
    expect(result.x).toBeGreaterThanOrEqual(pieceBB.minX + 4)
  })

  it('limita verticalmente pela borda', () => {
    const result = clampTextPosition({ x: 0, y: 20, ...textHalf }, pieceBB, hole)
    expect(result.y).toBeLessThanOrEqual(pieceBB.maxY - 4)
  })

  it('empurra texto para fora do círculo do furo', () => {
    const result = clampTextPosition({ x: 0, y: 10, ...textHalf }, pieceBB, hole)
    const distance = Math.hypot(result.x - hole.x, result.y - hole.y)
    expect(distance).toBeGreaterThanOrEqual(hole.radius + 1)
  })
})
```

Nota do executor: o clamp do furo usa o CENTRO do texto (não o AABB) — `distance >= hole.radius + margem(1mm)`; se impossível conciliar com o clamp de borda, a borda vence (furo nunca fica sobre o texto de qualquer forma porque o empilhamento padrão evita a região do furo).

**Step 2: FAIL → implementar**

```ts
import { TEXT_BORDER_MIN } from './schema'

export interface TextPosition {
  x: number
  y: number
  halfWidth: number
  halfHeight: number
}

export interface BoundingBox2D {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface Circle2D {
  x: number
  y: number
  radius: number
}

const HOLE_CLEARANCE = 1
const STACK_GAP = 2

export function defaultStackOffsets(heights: number[]): number[] {
  const total = heights.length
  if (total === 0) return []
  const step = (index: number) => {
    const tallest = Math.max(...heights)
    return tallest + STACK_GAP
  }
  return heights.map((_, index) => ((total - 1) / 2 - index) * step(index))
}

export function clampTextPosition(
  text: TextPosition,
  pieceBB: BoundingBox2D,
  hole: Circle2D,
): { x: number; y: number } {
  const minX = pieceBB.minX + TEXT_BORDER_MIN + text.halfWidth
  const maxX = pieceBB.maxX - TEXT_BORDER_MIN - text.halfWidth
  const minY = pieceBB.minY + TEXT_BORDER_MIN + text.halfHeight
  const maxY = pieceBB.maxY - TEXT_BORDER_MIN - text.halfHeight
  let x = Math.min(maxX, Math.max(minX, text.x))
  let y = Math.min(maxY, Math.max(minY, text.y))
  const dx = x - hole.x
  const dy = y - hole.y
  const distance = Math.hypot(dx, dy)
  const minDistance = hole.radius + HOLE_CLEARANCE
  if (distance < minDistance && distance > 0.0001) {
    const push = minDistance / distance
    x = hole.x + dx * push
    y = hole.y + dy * push
    x = Math.min(maxX, Math.max(minX, x))
    y = Math.min(maxY, Math.max(minY, y))
  }
  return { x, y }
}
```

(Se `minX > maxX` — texto maior que a área útil — retorne o centro da peça; cubra com teste.)

**Step 3: PASS → verificar → commit** `feat: adiciona clamp e empilhamento de textos`

---

### Task 2: Schema com texts[] (TDD)

**Files:**
- Modify: `src/features/studio/keychain/schema.ts`
- Test: `tests/features/studio/keychain/schema.test.ts`

**Mudanças:**
- `textItemSchema` (zod) conforme design (id string min 1, content 1–12, fontStyle, width 8–60, height 4–20, relief 0.4–2, proportional bool, offsetX/offsetY −20–20)
- `keychainParamsSchema`: remover `name`, `fontStyle`, `letterHeight`, `textWidth`, `textSize`; adicionar `texts: z.array(textItemSchema).min(1).max(3)`
- Defaults: `texts: [{ id: 'text-1', content: 'Meu nome', fontStyle: 'bold', width: 40, height: 10, relief: 1, proportional: false, offsetX: 0, offsetY: 0 }]`
- Exportar `TextItem`, `textItemSchema`
- `normalizeName`/`sanitizeFilename` permanecem

**Testes:** defaults parseiam; texts vazio rejeitado; 4 textos rejeitados; TextItem ranges (width 4/65, height 2/25, relief fora, offsets ±21); `textMode` ainda existe. **Atualizar todos os testes que usam os campos removidos** (usar spread de `defaultKeychainParams` + patch de `texts`).

**Commit** `feat: schema com array de textos`

---

### Task 3: buildKeychain v3 multi-texto (TDD)

**Files:**
- Modify: `src/features/studio/keychain/buildKeychain.ts`
- Test: `tests/features/studio/keychain/buildKeychain.test.ts`

**Mudanças:**
- Input muda: `fonts: Partial<Record<FontStyle, Font>>` (mapa, pois itens podem ter fontes diferentes)
- Por item: geometria com `size = proportional ? áreaútil*0.9/fator : item.height`, escala por `item.width` quando !proportional, clamp área útil; `translate(item.offsetX, baseY + item.offsetY, z)` com `baseY` de `defaultStackOffsets`
- `result.text` = merge das geometrias (fallback: primeira se merge falhar)
- Gravado: UM evaluate CSG(base, união dos textos)
- Usar `clampTextPosition` para garantir offsets válidos no build (halfWidth/halfHeight do bbox do texto gerado)
- `BuildKeychainResult` inalterado: `{ base, text }` (text = união)

**Testes:** 1 texto ≈ comportamento atual; 2 textos → bboxes Y distintos sem overlap vertical (gap ≥ 2mm); offsetX move bbox; proportional ignora width/height e respeita área útil; gravado chama evaluate 1× com texto contendo ambos os nomes (mock registra); offsets clampados para dentro da peça. **Atualizar mocks/helpers para o novo input `fonts`.**

**Commit** `feat: build com múltiplos textos empilhados e clampados`

---

### Task 4: useKeychain com actions de texto (TDD)

**Files:**
- Modify: `src/features/studio/hooks/useKeychain.ts`
- Test: `tests/features/studio/hooks/useKeychain.test.tsx`

**Mudanças:**
- Actions: `update` (peça) | `updateText` (id + patch parcial validado) | `addText` | `removeText` (id; bloqueia se texts.length === 1) | `reset`
- `addText`: novo TextItem default (`content: 'Novo texto'`, fontStyle 'bold', width 30, height 8, relief 1, proportional false, offsets 0) com `crypto.randomUUID()`; máx 3 (action ignorada)
- Efeito de fontes: carregar TODOS os `fontStyle` presentes em `texts` (iterar, cache Map)
- Rebuild: `buildKeychain({ fonts: fontCacheSubset, params })`; debounce 200ms mantido; dispose de `base` e `text`
- `updateParam` continua para campos da peça; expor `updateText`, `addText`, `removeText`

**Testes:** defaults (1 texto); addText adiciona até 3, 4º ignorado; removeText remove (e falha silenciosamente com 1); updateText patcha campos válidos e rejeita inválidos (schema); fontes múltiplas carregadas quando texts têm estilos diferentes; trocar campo da peça rebuilda. **Atualizar mocks de buildKeychain para `fonts` map.**

**Commit** `feat: hook com ações de textos múltiplos`

---

### Task 5: StudioPanel — chips, toggle e sliders por texto (TDD)

**Files:**
- Modify: `src/features/studio/components/StudioPanel.tsx`
- Test: `tests/features/studio/components/StudioPanel.test.tsx`

**Props novas:**

```ts
interface StudioPanelProps {
  params: KeychainParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onUpdateText: (id: string, patch: Partial<TextItem>) => void
  onAddText: () => void
  onRemoveText: (id: string) => void
  onUpdateParam: (key: keyof KeychainParams, value: number | string) => void
  onReset: () => void
}
```

**Bloco Texto (reescrito):**
- **Chips:** `Flex row wrap gap-1` — botão por texto (`{content}` truncado 8 chars, `aria-pressed={selected}`, onClick `onSelectText`) + botão "+" (`aria-label="Adicionar texto"`, disabled quando 3) + botão lixeira "✕" (`aria-label="Remover texto"`, disabled quando 1)
- **Controles do selecionado** (achar `texts.find(t => t.id === selectedTextId)`):
  - TextField "Conteúdo" (maxLength 12)
  - SelectField "Estilo da letra" (por item)
  - SwitchField "Proporcional à peça" (`isChecked={item.proportional}`)
  - `{!item.proportional && <>` sliders Largura (8–60) / Altura (4–20) `</>}`
  - Slider "Altura do relevo" (0.4–2)
  - Sliders "Posição X" (−20–20) / "Posição Y" (−20–20) — aria-labels exatos para os testes
- Modo Relevo/Gravado (SelectField 2 opções) mantido — usa `onUpdateParam('textMode', ...)`
- Remover `onUpdateName` (morreu com o schema)

**Testes:** chips por texto com aria-pressed; seleciona via `onSelectText`; "+" chama `onAddText` e desabilita com 3; lixeira chama `onRemoveText` e desabilita com 1; conteúdo troca `onUpdateText(id, {content})`; estilo troca `{fontStyle}`; toggle `{proportional: true}`; sliders escondidos quando proportional; sliders X/Y disparam `{offsetX/offsetY}`; sem "Nome" antigo. **StudioPage.test atualizar mocks/props.**

**Commit** `feat: painel com chips de seleção e controles por texto`

---

### Task 6: TextDraggable + Preview interativo (TDD)

**Files:**
- Create: `src/features/studio/components/TextDraggable.tsx`
- Modify: `src/features/studio/components/KeychainPreview.tsx`
- Test: `tests/features/studio/components/TextDraggable.test.tsx`, update `StudioViewport.test.tsx`

**`KeychainPreview` (props novas):**

```ts
interface KeychainPreviewProps {
  geometries: Array<{ id: string; geometry: BufferGeometry; x: number; y: number }> // por texto
  baseGeometry: BufferGeometry | null
  baseColor: string
  letterColor: string
  selectedTextId: string | null
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void   // commit no pointerup
  pieceBB: BoundingBox2D | null
  hole: Circle2D | null
}
```

- Base mesh + um `TextDraggable` por texto (position [x, y, z])
- `BuildKeychainResult` do hook passa a expor também `textItems: Array<{id, geometry, x, y}>` (build v3 já os tem antes do merge — exportar) para o preview; `text` mergeado continua para export

**`TextDraggable`:**
- `<mesh geometry position={[x, y, z]} onPointerDown onPointerUp>` com material `letterColor` + `emissive: selected ? '#0d9488' : '#000000'` (sutil)
- onPointerDown: `e.stopPropagation(); onSelectText(id); controls.enabled = false` (pegar controls via `useThree` + `makeDefault` já existente); captura plano `THREE.Plane(new Vector3(0,0,1), 0)` e offset do grab
- onPointerMove (window, durante drag): raycaster do R3F (`useThree state.raycaster` ou evento `onPointerMove` no mesh com `e.ray.intersectPlane`) → ponto no plano → `clampTextPosition` com halfWidth/halfHeight (props do bbox) → move mesh local (ref, sem estado)
- onPointerUp: `onMoveText(id, x, y)` (commit no reducer) + `controls.enabled = true`
- jsdom: testes só cobrem render + callbacks de seleção (pointermove com raycast não roda sem WebGL — mock `useThree`/eventos; a lógica de clamp é da Task 1, pura)

**Testes:** TextDraggable renderiza mesh por item; onPointerDown chama onSelectText e stopPropagation; selected aplica emissive (via mock material); KeychainPreview renderiza N meshes + base; StudioViewport passa props (atualizar mocks — `data-testid` por item `text-mesh-{id}`).

**Commit** `feat: arrastar texto no viewport com clamp de borda e furo`

---

### Task 7: StudioPage integrando seleção e drag (TDD)

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Mudanças:**
- `const [selectedTextId, setSelectedTextId] = useState(() => defaultKeychainParams.texts[0]?.id ?? '')`
- `handleMoveText(id, x, y)` → `updateText(id, { offsetX: x, offsetY: y })` (clamp já feito no drag)
- Wire: StudioPanel (selectedTextId, onSelectText, onUpdateText, onAddText, onRemoveText), StudioViewport→KeychainPreview (geometries do build, pieceBB da forma, hole de getRingPosition+raio, onSelectText/onMoveText)
- `pieceBB`: bounding box da base (calcular no build ou helper — expor `result.pieceBB` e `result.hole` do build v3 evita duplicar)
- addText seleciona o novo texto (setSelectedTextId após add — addText do hook pode retornar o id OU o StudioPage seleciona `params.texts[params.texts.length-1].id` via effect; preferir: hook retorna `addText(): string | null`)

**Testes:** painel com chips; drag mocks chamam onMoveText → updateText (spy no build não — spy no reducer é interno; testar via rerender do painel com novo offset); selectedTextId inicial = primeiro texto; export habilita com geometria.

**Commit** `feat: studio com seleção de texto e arraste integrados`

---

### Task 8: Docs + verificação final

**Files:**
- Modify: `docs/frontend/studio.md`

**Conteúdo:** bloco Texto com chips/seleção/+/lixeira, toggle proporcional, sliders por texto, posição X/Y, drag no viewport com clamp; build v3 (texts[], merge, CSG único); `positioning.ts` na tabela "como editar"; decisões (clamp centro-a-centro do furo, commits no pointerup, cor global).

**Verificação final:**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
grep -rn "textWidth\|letterHeight\|updateName" src/ tests/ --include="*.ts" --include="*.tsx" || echo "OK: zero campos globais de texto"
git log --oneline -10
```

**Manual (registrar):**
```bash
npm run dev
# /studio → bloco Texto:
# 1. "+" adiciona até 3 textos empilhados; lixeira remove (mín 1)
# 2. Chip seleciona; sliders mudam SÓ o texto selecionado
# 3. Toggle proporcional: ligado = texto escala com a peça (sliders escondidos)
# 4. Clicar no texto no 3D seleciona; arrastar move com clamp de borda/furo
# 5. Sliders X/Y sincronizam com o drag
# 6. Gravado continua raso; Exportar STL gera união dos textos
```

**Commit** `docs: documenta textos múltiplos com drag`

---

## Verification final (executor)

```bash
npm run lint && npm run typecheck && npm run test && npm run build
git log --oneline -10
```

Expected: 8 commits; testes verdes (~111 adaptados + ~25 novos); drag com clamp; zero campos globais de texto.
