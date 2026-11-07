# Topo de Bolo — Seção única de conteúdo: Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unificar os controles de texto e ícone do topo de bolo em uma única seção **Conteúdo**, mantendo 1–3 textos e permitindo arrastar texto e ícone livremente no editor 2D.

**Architecture:** O schema troca `iconPosition` por `iconOffsetX`/`iconOffsetY`. O reducer ganha a ação atômica `moveIcon`. O builder posiciona o ícone por offsets com clamp no contorno. O `TextPositionEditor` desenha e arrasta o ícone além dos textos. O `StudioPanel` funde as seções Texto e Ícone em Conteúdo, sem mudar o resultado de `buildCakeTopper` nem a exportação STL.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Amplify UI, Vitest.

**Design aprovado:** `docs/plans/2026-11-07-topo-bolo-conteudo-unico-design.md`

---

## Resumo das tarefas

1. Schema: remover `iconPosition`, adicionar `iconOffsetX`/`iconOffsetY`.
2. Hook: adicionar ação/callback atômica `moveIcon`.
3. Builder: posicionar o ícone por offsets e clampar no contorno.
4. Editor 2D: desenhar e arrastar o ícone.
5. Painel: fundir Texto + Ícone em Conteúdo.
6. Integração: passar `moveIcon` no `StudioPage`.
7. Documentação: `AGENTS.md` e `docs/frontend/studio.md`.
8. Verificação final: testes, typecheck e lint.

---

## Task 1: Schema do ícone

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/schema.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts`

**Step 1: Escrever os testes que falham**

Adicione ao final do `describe('cakeTopperParamsSchema', ...)`:

```ts
it('defaults icon offsets to the plate center', () => {
  expect(defaultCakeTopperParams.iconOffsetX).toBe(0)
  expect(defaultCakeTopperParams.iconOffsetY).toBe(0)
})

it('rejects iconOffsetX out of range', () => {
  const invalid = { ...defaultCakeTopperParams, iconOffsetX: 56 }
  const result = cakeTopperParamsSchema.safeParse(invalid)
  expect(result.success).toBe(false)
})

it('rejects iconOffsetY out of range', () => {
  const invalid = { ...defaultCakeTopperParams, iconOffsetY: -36 }
  const result = cakeTopperParamsSchema.safeParse(invalid)
  expect(result.success).toBe(false)
})

it('does not expose iconPosition anymore', () => {
  expect('iconPosition' in defaultCakeTopperParams).toBe(false)
})
```

**Step 2: Rodar o teste para confirmar a falha**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts
```

Expected: FAIL nos testes de `iconOffsetX`/`iconOffsetY`/`iconPosition` (os campos ainda não existem no schema/default).

**Step 3: Implementar o schema**

Em `src/features/studio/tools/confeitaria/topo-bolo/schema.ts`, substitua:

```ts
  svgIcon: z.string().nullable(),
  iconPosition: z.enum(['above', 'center']),
  iconScale: z.number().min(0.5).max(2),
```

por:

```ts
  svgIcon: z.string().nullable(),
  iconScale: z.number().min(0.5).max(2),
  iconOffsetX: z.number().min(-55).max(55),
  iconOffsetY: z.number().min(-35).max(35),
```

E em `defaultCakeTopperParams`, substitua:

```ts
  cornerRadius: 6, contourSvg: null, svgIcon: null, iconPosition: 'above', iconScale: 1,
```

por:

```ts
  cornerRadius: 6, contourSvg: null, svgIcon: null, iconScale: 1,
  iconOffsetX: 0, iconOffsetY: 0,
```

**Step 4: Rodar o teste para confirmar que passa**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/schema.ts tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts
git commit -m "feat(topo-bolo): adiciona offsets do ícone ao schema"
```

---

## Task 2: Ação atômica `moveIcon` no hook

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts`

**Step 1: Escrever o teste que falha**

Adicione ao `describe('useCakeTopper', ...)`, depois do teste de `updateTextById`:

```ts
it('moveIcon atualiza os dois offsets', () => {
  const { result } = renderHook(() => useCakeTopper())
  act(() => result.current.moveIcon(10, -12))
  expect(result.current.params.iconOffsetX).toBe(10)
  expect(result.current.params.iconOffsetY).toBe(-12)
})

it('moveIcon clampa os offsets aos limites', () => {
  const { result } = renderHook(() => useCakeTopper())
  act(() => result.current.moveIcon(999, -999))
  expect(result.current.params.iconOffsetX).toBe(55)
  expect(result.current.params.iconOffsetY).toBe(-35)
})
```

**Step 2: Rodar o teste para confirmar a falha**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts
```

Expected: FAIL — `result.current.moveIcon` não existe.

**Step 3: Implementar a ação e o callback**

Em `src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts`:

Adicione ao tipo `CakeTopperAction`:

```ts
  | { type: 'moveIcon'; x: number; y: number }
```

Adicione ao `NUMERIC_RANGES`:

```ts
  iconOffsetX: { min: -55, max: 55 },
  iconOffsetY: { min: -35, max: 35 },
```

Adicione o case no reducer, antes de `case 'reset':`:

```ts
    case 'moveIcon': {
      const x = clampWith(NUMERIC_RANGES, 'iconOffsetX', action.x)
      const y = clampWith(NUMERIC_RANGES, 'iconOffsetY', action.y)
      const next = { ...state, iconOffsetX: x, iconOffsetY: y }
      const parsed = cakeTopperParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
```

Adicione o callback, depois de `updateTextById`:

```ts
  const moveIcon = useCallback((x: number, y: number) => {
    dispatch({ type: 'moveIcon', x, y })
  }, [])
```

E inclua `moveIcon` no retorno do hook:

```ts
    updateTextById,
    moveIcon,
```

**Step 4: Rodar o teste para confirmar que passa**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts
git commit -m "feat(topo-bolo): adiciona ação moveIcon ao estado"
```

---

## Task 3: Posicionamento do ícone no builder

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`

**Step 1: Atualizar os testes existentes e adicionar os novos**

Em `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`:

1. No teste `'escala ícone grande para caber no contorno'`, remova a linha:

```ts
      iconPosition: 'center' as const,
```

2. No teste `'ícone em modo corte reduz o material da placa'`, remova a linha:

```ts
      iconPosition: 'center' as const,
```

3. Adicione dois testes ao `describe('buildCakeTopper - relevo (raised)', ...)`, depois do teste `'inclui ícone svg no relevo'`:

```ts
  it('posiciona o ícone pelos offsets informados', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'rounded-rect' as const,
      width: 120,
      height: 80,
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconOffsetX: 30,
      iconOffsetY: 20,
      texts: [],
    }
    const result = buildCakeTopper({ params })
    const bb = bounds(result.relief!)
    expect(bb.cx).toBeCloseTo(30, 0)
    expect(bb.cy).toBeCloseTo(20, 0)
  })

  it('limita o ícone ao contorno da placa', () => {
    const params = {
      ...defaultCakeTopperParams,
      shape: 'circle' as const,
      width: 80,
      height: 50,
      svgIcon: SVG_RECT,
      iconScale: 2,
      iconOffsetX: 100,
      iconOffsetY: 100,
      texts: [],
    }
    const result = buildCakeTopper({ params })
    const bb = bounds(result.relief!)
    const corner = Math.hypot(Math.abs(bb.cx) + bb.hw, Math.abs(bb.cy) + bb.hh)
    expect(corner).toBeLessThanOrEqual(25 + 0.5)
  })
```

**Step 2: Rodar os testes para confirmar a falha**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
```

Expected: FAIL — os testes antigos passam, mas os novos falham porque o builder ainda usa `iconPosition`.

**Step 3: Remover `maxY` de `buildTextGeometries`**

Em `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`, substitua a assinatura e o retorno:

```ts
function buildTextGeometries(
  input: BuildCakeTopperInput,
  mode: TextMode,
  plate: PlateBounds,
): { geometries: BufferGeometry[]; maxY: number | null } {
  const { params, fonts, font, onError } = input
  const geometries: BufferGeometry[] = []
  let maxY: number | null = null
```

por:

```ts
function buildTextGeometries(
  input: BuildCakeTopperInput,
  mode: TextMode,
  plate: PlateBounds,
): BufferGeometry[] {
  const { params, fonts, font, onError } = input
  const geometries: BufferGeometry[] = []
```

Remova o bloco:

```ts
    geometry.computeBoundingBox()
    if (geometry.boundingBox) {
      const top = geometry.boundingBox.max.y
      maxY = maxY === null ? top : Math.max(maxY, top)
    }
    geometries.push(geometry)
```

e deixe:

```ts
    geometries.push(geometry)
```

Substitua o retorno:

```ts
  return { geometries, maxY }
```

por:

```ts
  return geometries
```

**Step 4: Atualizar `buildIconGeometry`**

Substitua a assinatura:

```ts
function buildIconGeometry(
  params: CakeTopperParams,
  mode: TextMode,
  textMaxY: number | null,
  plate: PlateBounds,
): BufferGeometry | null {
```

por:

```ts
function buildIconGeometry(
  params: CakeTopperParams,
  mode: TextMode,
  plate: PlateBounds,
): BufferGeometry | null {
```

Remova o bloco de posicionamento automático:

```ts
  let desiredY = 0
  if (params.iconPosition === 'above') {
    const anchor = textMaxY ?? params.height / 4
    desiredY = anchor + ICON_GAP + halfHeight
  }

  const placed = clampToOutline(params, plate, halfWidth, halfHeight, 0, desiredY, ICON_MARGIN)
```

e substitua por:

```ts
  const placed = clampToOutline(
    params,
    plate,
    halfWidth,
    halfHeight,
    params.iconOffsetX,
    params.iconOffsetY,
    ICON_MARGIN,
  )
```

**Step 5: Atualizar `buildRelief`**

Substitua:

```ts
  const textBuild = buildTextGeometries(input, mode, plate)
  const icon = buildIconGeometry(input.params, mode, textBuild.maxY, plate)
  const parts = icon ? [...textBuild.geometries, icon] : textBuild.geometries
```

por:

```ts
  const textGeometries = buildTextGeometries(input, mode, plate)
  const icon = buildIconGeometry(input.params, mode, plate)
  const parts = icon ? [...textGeometries, icon] : textGeometries
```

**Step 6: Atualizar o caminho de corte**

Em `buildCakeTopper`, substitua:

```ts
  const cutText = buildTextGeometries(input, 'cut', plateBounds)
  const cutIcon = buildIconGeometry(params, 'cut', cutText.maxY, plateBounds)
  const cuts = cutIcon ? [...cutText.geometries, cutIcon] : cutText.geometries
```

por:

```ts
  const cutText = buildTextGeometries(input, 'cut', plateBounds)
  const cutIcon = buildIconGeometry(params, 'cut', plateBounds)
  const cuts = cutIcon ? [...cutText, cutIcon] : cutText
```

**Step 7: Remover a constante `ICON_GAP`**

Remova a linha:

```ts
const ICON_GAP = 2
```

**Step 8: Rodar os testes para confirmar que passam**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
```

Expected: PASS.

**Step 9: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
git commit -m "feat(topo-bolo): posiciona o ícone por offsets no builder"
```

---

## Task 4: Arraste do ícone no editor 2D

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.tsx`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.test.tsx`

**Step 1: Atualizar o helper de teste e adicionar os testes que falham**

Em `tests/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.test.tsx`:

1. No topo, adicione a constante:

```ts
const SVG_RECT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'
```

2. No tipo de `overrides` de `renderEditor`, adicione:

```ts
    onMoveIcon?: (x: number, y: number) => void
```

3. Passe a prop no render:

```tsx
      onMoveIcon={overrides?.onMoveIcon ?? (() => undefined)}
```

4. Troque os rótulos de acessibilidade e o texto do botão nos testes existentes:

```ts
    expect(screen.getByLabelText('Área de posicionamento de conteúdo')).toBeInTheDocument()
```

```ts
    const dialog = screen.getByRole('dialog', { name: 'Posicionamento de conteúdo' })
```

```ts
    const canvas = screen.getByLabelText('Área de posicionamento de conteúdo')
```

(substitua as três ocorrências de `Área de posicionamento de textos`).

5. Adicione os novos testes ao final do `describe`:

```ts
  it('arrasta o ícone e chama onMoveIcon', () => {
    const onMoveIcon = vi.fn()
    const params: CakeTopperParams = {
      ...defaultCakeTopperParams,
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconOffsetX: 0,
      iconOffsetY: 0,
    }
    renderEditor({ params, onMoveIcon })
    const canvas = screen.getByLabelText('Área de posicionamento de conteúdo')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    fireEvent.mouseMove(canvas, { clientX: 84, clientY: 54 })
    expect(onMoveIcon).toHaveBeenCalledWith(2, 2)
  })

  it('limita o arraste do ícone à área útil da placa', () => {
    const onMoveIcon = vi.fn()
    const params: CakeTopperParams = {
      ...defaultCakeTopperParams,
      shape: 'circle',
      width: 80,
      height: 50,
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconOffsetX: 0,
      iconOffsetY: 0,
    }
    renderEditor({ params, onMoveIcon })
    const canvas = screen.getByLabelText('Área de posicionamento de conteúdo')
    fireEvent.mouseDown(canvas, { clientX: 80, clientY: 50, button: 0 })
    fireEvent.mouseMove(canvas, { clientX: 400, clientY: 400 })
    const [x, y] = onMoveIcon.mock.calls[0] as [number, number]
    const max = expectedIconMaxOffsets(params)
    expect(x).toBeCloseTo(max.x, 5)
    expect(y).toBeCloseTo(max.y, 5)
  })
```

6. Adicione o helper `expectedIconMaxOffsets` antes do `describe`:

```ts
function expectedIconMaxOffsets(params: CakeTopperParams): { x: number; y: number } {
  const bounds = svgBounds(params.svgIcon!)
  if (!bounds) throw new Error('SVG inválido')
  const maxRadius = (Math.min(params.width, params.height) / 3) * params.iconScale
  const scale = (maxRadius - 0.5) / bounds.farthest
  const halfWidth = (bounds.width / 2) * scale + 0.5
  const halfHeight = (bounds.height / 2) * scale + 0.5
  const radius = Math.min(params.width, params.height) / 2
  return { x: radius - halfWidth - 1, y: radius - halfHeight - 1 }
}
```

> Nota: o editor clampa X e Y por eixo (comportamento existente). O builder
> refaz o clamp acoplado para círculo/oval, então a geometria final continua
> dentro do contorno.

7. Importe `svgBounds` no teste:

```ts
import { svgBounds } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'
```

**Step 2: Rodar os testes para confirmar a falha**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.test.tsx
```

Expected: FAIL — `onMoveIcon` ainda não existe e os rótulos mudaram.

**Step 3: Implementar o editor**

Em `src/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.tsx`:

1. Importe `useMemo` e `svgBounds`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CakeTopperParams, TextItem } from './schema'
import { svgBounds } from '../shared/svgToIconShape'
```

2. Adicione as constantes ao lado de `TEXT_MARGIN`:

```ts
const ICON_MARGIN = 1
const ICON_ID = '__icon__'
```

3. Adicione `onMoveIcon` à interface:

```ts
  onMoveIcon: (x: number, y: number) => void
```

4. Adicione o helper depois de `effectiveHalfSize`:

```ts
// Mesma escala do builder: o ícone encaixa pelo vértice mais distante.
function iconHalfSize(
  svgIcon: string | null,
  width: number,
  height: number,
  iconScale: number,
): HalfSize | null {
  if (!svgIcon) return null
  const bounds = svgBounds(svgIcon)
  const maxRadius = (Math.min(width, height) / 3) * iconScale
  if (!bounds || maxRadius <= 0) return null
  const scale = (maxRadius - 0.5) / bounds.farthest
  if (!(scale > 0)) return null
  return {
    halfWidth: (bounds.width / 2) * scale + 0.5,
    halfHeight: (bounds.height / 2) * scale + 0.5,
  }
}
```

5. Adicione o parâmetro `margin` a `clampOffset`:

```ts
function clampOffset(
  value: number,
  plateHalf: number,
  itemHalf: number,
  margin: number = TEXT_MARGIN,
): number {
  const maxOffset = Math.max(0, plateHalf - itemHalf - margin)
  return Math.max(-maxOffset, Math.min(maxOffset, value))
}
```

6. Desestruture a nova prop:

```ts
export function TextPositionEditor({
  params,
  selectedTextId,
  onSelectText,
  onMoveText,
  onMoveIcon,
  onClose,
}: TextPositionEditorProps) {
```

7. Adicione o estado de seleção do ícone e o cálculo memoizado, depois de `params`:

```ts
  const [iconSelected, setIconSelected] = useState(false)
  const iconHalf = useMemo(
    () => iconHalfSize(params.svgIcon, params.width, params.height, params.iconScale),
    [params.svgIcon, params.width, params.height, params.iconScale],
  )
```

8. No `draw`, troque a seleção do texto:

```ts
      const isSelected = text.id === selectedTextId
```

por:

```ts
      const isSelected = !iconSelected && text.id === selectedTextId
```

9. Ainda no `draw`, depois do loop de textos, desenhe o ícone:

```ts
    if (iconHalf) {
      const iconWidth = iconHalf.halfWidth * 2 * SCALE
      const iconHeight = iconHalf.halfHeight * 2 * SCALE
      const x = centerX + params.iconOffsetX * SCALE - iconWidth / 2
      const y = centerY + params.iconOffsetY * SCALE - iconHeight / 2

      ctx.fillStyle = iconSelected ? '#f59e0b' : '#d4d4d8'
      ctx.fillRect(x, y, iconWidth, iconHeight)

      ctx.strokeStyle = iconSelected ? '#d97706' : '#71717a'
      ctx.lineWidth = iconSelected ? 2 : 1
      ctx.strokeRect(x, y, iconWidth, iconHeight)

      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Ícone', x + iconWidth / 2, y + iconHeight / 2)
    }
```

10. Atualize as dependências do `useCallback` do `draw`:

```ts
  }, [params, selectedTextId, canvasWidth, canvasHeight, plate, iconHalf, iconSelected])
```

11. No `handleMouseDown`, antes do loop de textos, adicione o hit-test do ícone:

```ts
    if (iconHalf) {
      const iconWidth = iconHalf.halfWidth * 2 * SCALE
      const iconHeight = iconHalf.halfHeight * 2 * SCALE
      const iconX = canvasWidth / 2 + params.iconOffsetX * SCALE - iconWidth / 2
      const iconY = canvasHeight / 2 + params.iconOffsetY * SCALE - iconHeight / 2

      if (x >= iconX && x <= iconX + iconWidth && y >= iconY && y <= iconY + iconHeight) {
        setIconSelected(true)
        setDragging(ICON_ID)
        setDragStart({ x: event.clientX, y: event.clientY })
        return
      }
    }
```

12. No clique de texto, limpe a seleção do ícone:

```ts
      if (x >= textX && x <= textX + textWidth && y >= textY && y <= textY + textHeight) {
        setIconSelected(false)
        onSelectText(text.id)
```

13. No `handleMouseMove`, trate o ícone antes dos textos:

```ts
    if (dragging === ICON_ID) {
      if (!iconHalf) return
      const newX = clampOffset(
        params.iconOffsetX + dx,
        plate.halfWidth,
        iconHalf.halfWidth,
        ICON_MARGIN,
      )
      const newY = clampOffset(
        params.iconOffsetY + dy,
        plate.halfHeight,
        iconHalf.halfHeight,
        ICON_MARGIN,
      )
      onMoveIcon(newX, newY)
      setDragStart({ x: event.clientX, y: event.clientY })
      return
    }
```

14. Atualize os textos da interface:

```tsx
      aria-label="Posicionamento de conteúdo"
```

```tsx
          <h2 className="text-lg font-semibold">Posicionar Conteúdo</h2>
```

```tsx
          aria-label="Área de posicionamento de conteúdo"
```

```tsx
        <p className="mt-2 text-sm text-neutral-500">Arraste os textos e o ícone para reposicionar</p>
```

**Step 4: Rodar os testes para confirmar que passam**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.tsx tests/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.test.tsx
git commit -m "feat(topo-bolo): permite arrastar o ícone no editor 2D"
```

---

## Task 5: Painel único de Conteúdo

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx`

**Step 1: Atualizar os testes**

Em `tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx`:

1. No `createMockProps`, adicione:

```ts
    onMoveIcon: vi.fn(),
```

2. Substitua o teste `'renderiza as seções do accordion'` por:

```ts
  it('renderiza as seções do accordion', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.getByRole('heading', { name: 'Conteúdo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Formato' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fixação' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aparência' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ícone SVG' })).toBeInTheDocument()
  })

  it('não renderiza mais as seções separadas de Texto e Ícone', () => {
    render(<StudioPanel {...createMockProps()} />)
    expect(screen.queryByRole('heading', { name: 'Texto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ícone' })).not.toBeInTheDocument()
  })
```

3. Troque o texto do botão nos testes do editor:

```ts
    fireEvent.click(screen.getByText(/posicionar conteúdo/i))
```

(substitua as duas ocorrências de `/posicionar textos/i`).

4. Adicione um teste para o modo de conteúdo:

```ts
  it('dispara onUpdateParam ao mudar o modo do conteúdo', () => {
    const props = createMockProps()
    render(<StudioPanel {...props} />)
    fireEvent.change(screen.getByLabelText('Modo do conteúdo'), { target: { value: 'cut' } })
    expect(props.onUpdateParam).toHaveBeenCalledWith('textMode', 'cut')
  })
```

**Step 2: Rodar os testes para confirmar a falha**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx
```

Expected: FAIL — as seções ainda estão separadas e o botão ainda se chama “Posicionar textos”.

**Step 3: Adicionar a prop `onMoveIcon`**

Em `src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx`:

Na interface `StudioPanelProps`, adicione:

```ts
  onMoveIcon: (x: number, y: number) => void
```

Na desestruturação de `StudioPanel`, adicione:

```ts
  onMoveIcon,
```

**Step 4: Fundir as seções Texto e Ícone**

Substitua todo o bloco `<Accordion.Item value="texto"> ... </Accordion.Item>` e o bloco `<Accordion.Item value="icone"> ... </Accordion.Item>` por um único bloco:

```tsx
        <Accordion.Item value="conteudo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Conteúdo
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Modo do conteúdo"
                value={params.textMode}
                onChange={(event) => onUpdateParam('textMode', event.target.value)}
              >
                <option value="raised">Relevo</option>
                <option value="cut">Corte vazado</option>
              </SelectField>

              <Flex direction="row" gap="xs" wrap="wrap">
                {params.texts.map((text) => (
                  <Flex key={text.id} direction="row" gap="xs" alignItems="center">
                    <Button
                      size="small"
                      aria-pressed={text.id === selectedText.id}
                      onClick={() => setSelectedTextId(text.id)}
                    >
                      {text.content}
                    </Button>
                    <Button
                      size="small"
                      variation="link"
                      onClick={() => onRemoveText(text.id)}
                      aria-label={`Remover texto ${text.content}`}
                      isDisabled={params.texts.length <= 1}
                    >
                      ×
                    </Button>
                  </Flex>
                ))}
              </Flex>

              <Button size="small" isDisabled={!canAddText} onClick={onAddText}>
                Adicionar texto
              </Button>

              {selectedText && (
                <>
                  <TextField
                    label="Conteúdo"
                    descriptiveText="Até 40 caracteres"
                    value={selectedText.content}
                    maxLength={40}
                    onChange={(event) =>
                      onUpdateTextById(selectedText.id, { content: event.target.value })
                    }
                  />

                  <SelectField
                    label="Estilo da letra"
                    value={selectedText.fontStyle}
                    onChange={(event) =>
                      onUpdateTextById(selectedText.id, {
                        fontStyle: event.target.value as TextItem['fontStyle'],
                      })
                    }
                  >
                    <option value="bold">Negrito</option>
                    <option value="normal">Normal</option>
                    <option value="serif">Serifada</option>
                  </SelectField>

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Largura do texto</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.width} mm</Text>
                  </Flex>
                  <SliderField
                    label="Largura do texto"
                    labelHidden
                    aria-label="Largura do texto"
                    min={SLIDER_LIMITS.textWidth.min}
                    max={SLIDER_LIMITS.textWidth.max}
                    step={SLIDER_LIMITS.textWidth.step}
                    value={selectedText.width}
                    onChange={(value) => onUpdateTextById(selectedText.id, { width: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do texto</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.height} mm</Text>
                  </Flex>
                  <SliderField
                    label="Altura do texto"
                    labelHidden
                    aria-label="Altura do texto"
                    min={SLIDER_LIMITS.textHeight.min}
                    max={SLIDER_LIMITS.textHeight.max}
                    step={SLIDER_LIMITS.textHeight.step}
                    value={selectedText.height}
                    onChange={(value) => onUpdateTextById(selectedText.id, { height: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do relevo</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.relief} mm</Text>
                  </Flex>
                  <SliderField
                    label="Altura do relevo"
                    labelHidden
                    aria-label="Altura do relevo"
                    min={SLIDER_LIMITS.relief.min}
                    max={SLIDER_LIMITS.relief.max}
                    step={SLIDER_LIMITS.relief.step}
                    value={selectedText.relief}
                    onChange={(value) => onUpdateTextById(selectedText.id, { relief: value as number })}
                  />
                </>
              )}

              <hr className="my-1 border-neutral-200" />

              <Heading level={4} fontSize="small">
                Ícone SVG
              </Heading>

              <input
                ref={iconInputRef}
                type="file"
                accept=".svg"
                aria-label="Carregar ícone SVG"
                onChange={handleIconUpload}
                style={{ display: 'none' }}
              />
              <Button size="small" onClick={() => iconInputRef.current?.click()}>
                Carregar ícone SVG
              </Button>
              {iconUploadError && (
                <Text fontSize="xs" className="text-red-600">
                  Falha ao ler o arquivo SVG
                </Text>
              )}
              {params.svgIcon && (
                <>
                  <Text fontSize="xs" color="font.secondary">Ícone carregado</Text>
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => onSetSvgIcon(null)}
                  >
                    Remover ícone
                  </Button>
                </>
              )}

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Escala do ícone</Text>
                <Text fontSize="xs" color="font.secondary">{params.iconScale.toFixed(1)}x</Text>
              </Flex>
              <SliderField
                label="Escala do ícone"
                labelHidden
                aria-label="Escala do ícone"
                min={SLIDER_LIMITS.iconScale.min}
                max={SLIDER_LIMITS.iconScale.max}
                step={SLIDER_LIMITS.iconScale.step}
                value={params.iconScale}
                isDisabled={!params.svgIcon}
                onChange={(value) => onUpdateParam('iconScale', value as number)}
              />
              <Text fontSize="xs" color="font.secondary">
                Arraste no editor para posicionar o ícone.
              </Text>

              {selectedText && (
                <Button
                  size="small"
                  variation="link"
                  onClick={() => setEditorOpen(true)}
                >
                  ✥ Posicionar conteúdo
                </Button>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
```

**Step 5: Passar `onMoveIcon` ao editor**

No final do componente, substitua a renderização do `TextPositionEditor` por:

```tsx
      {editorOpen && selectedText && (
        <TextPositionEditor
          params={params}
          selectedTextId={selectedText.id}
          onSelectText={setSelectedTextId}
          onMoveText={(id, x, y) => onUpdateTextById(id, { offsetX: x, offsetY: y })}
          onMoveIcon={onMoveIcon}
          onClose={() => setEditorOpen(false)}
        />
      )}
```

**Step 6: Rodar os testes para confirmar que passam**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx
git commit -m "feat(topo-bolo): funde texto e ícone na seção Conteúdo"
```

---

## Task 6: Integração no StudioPage

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`

**Step 1: Passar `moveIcon` para o painel**

No `TopoBoloToolWrapper`, adicione `moveIcon` à desestruturação de `useCakeTopper()`:

```ts
    updateTextById,
    moveIcon,
    setSvgIcon,
```

E passe a prop no `<TopoBoloTool>`:

```tsx
            onUpdateTextById={updateTextById}
            onMoveIcon={moveIcon}
            onSetSvgIcon={setSvgIcon}
```

**Step 2: Rodar o typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS (sem erros de props).

**Step 3: Commit**

```bash
git add src/features/studio/StudioPage.tsx
git commit -m "feat(topo-bolo): conecta moveIcon ao painel"
```

---

## Task 7: Documentação

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Step 1: Atualizar o AGENTS.md da ferramenta**

Em `AGENTS.md`, substitua o parágrafo de parâmetros e regras conforme abaixo:

```md
## Parâmetros

- Formato: `circle`, `rounded-rect`, `oval` ou `custom` (contorno definido por SVG)
- Largura: 50–120mm
- Altura: 30–80mm
- Espessura: 2–4mm
- Conteúdo único no painel: 1–3 textos independentes e um ícone SVG opcional
- Textos: cada um com conteúdo, fonte (`normal`/`bold`/`serif`), largura, altura, relevo e offset X/Y próprios
- Ícone SVG: SVG opcional, escala 0.5–2 e offset X/Y próprio (posicionado livremente no editor 2D)
- Modo do conteúdo: `raised` (relevo) ou `cut` (vazado via CSG com fallback)
- Fixação: `haste` (cilindro integrado) ou `base` (peça separada com encaixe)
- Cores de preview: cor da placa e das letras (10 cores PLA)
```

E acrescente às regras do domínio:

```md
- Textos e ícone são posicionados livremente no editor 2D; o ícone usa `iconOffsetX`/`iconOffsetY` com margem de 1mm
```

Atualize a estrutura de arquivos:

```md
- `TextPositionEditor.tsx` — Editor 2D de posição de textos e ícone
```

**Step 2: Atualizar a visão geral em `docs/frontend/studio.md`**

Substitua o bullet **Topo de Bolo** (linha da seção de decisões) por:

```md
- **Topo de Bolo:** Toppers decorativos para bolo com 1–3 textos independentes e um ícone SVG opcional, todos dentro de uma única seção **Conteúdo** no painel. O modo `raised` (relevo) ou `cut` (vazado via CSG, com fallback para relevo) vale para texto e ícone. Placa em `circle`, `rounded-rect`, `oval` ou contorno `custom` por SVG, via ExtrudeGeometry. Textos e ícone são posicionados livremente pelo editor 2D: textos usam `offsetX`/`offsetY`; o ícone usa `iconOffsetX`/`iconOffsetY`, ambos limitados ao contorno da placa. Fixação por `haste` (cilindro integrado) ou `base` separada com canaleta de encaixe. Exportação STL binário.
```

**Step 3: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md docs/frontend/studio.md
git commit -m "docs(topo-bolo): documenta a seção única de conteúdo"
```

---

## Task 8: Verificação final

**Step 1: Rodar todos os testes do topo de bolo**

Run:

```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo
```

Expected: PASS em todos os arquivos.

**Step 2: Rodar typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

**Step 3: Rodar lint**

Run:

```bash
npm run lint
```

Expected: PASS, sem warnings.

**Step 4: Rodar a suíte completa**

Run:

```bash
npm test
```

Expected: PASS.

**Step 5: Revisar o diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: apenas os arquivos das tasks acima modificados; nenhum arquivo temporário.

**Step 6: Commit final (se houver ajustes de lint/formatação)**

```bash
git add -A
git commit -m "chore(topo-bolo): ajustes finais da seção de conteúdo"
```

Se não houver ajustes, não crie um commit vazio.
