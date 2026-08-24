# Editor 2D de Posicionamento Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir os sliders Posição X/Y e o drag 3D por um editor 2D (modal SVG) onde o usuário arrasta os textos sobre o desenho da base, com snapping de contato que garante que o texto nunca fique flutuando (sempre conectado ao topo, furo ou texto anterior).

**Architecture:** Nova função pura `snapTextToSupport` em `positioning.ts` (usada pelo editor no pointerUp e pelo build — fonte única de verdade). `TextPositionEditor` (Modal Amplify UI + SVG) desenha a base via `createBaseShape().getPoints()`, o furo/anel via `getRingPosition`, e um rect arrastável por texto. StudioPanel ganha botão ✥ e perde sliders X/Y; KeychainPreview perde drag/seleção; TextDraggable é deletado.

**Tech Stack:** Amplify UI 6 (Modal), SVG pointer events, three Shape, Zod, Vitest.

**Design doc:** `docs/plans/2026-08-24-studio-text-position-editor-design.md`

---

## Convenções para o executor

- **TDD obrigatório:** @superpowers:test-driven-development — teste → falha → implementação → pass → commit.
- **Commits semânticos**; toda task termina com lint+typecheck+test verdes.
- **Comandos:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- **Contexto:** repo `/opt/projects/BELIS3D`, branch `main`, 119 testes verdes. Arquivos: `keychain/{positioning.ts,schema.ts,buildKeychain.ts,shapes.ts}`, `components/{StudioPanel.tsx,KeychainPreview.tsx,StudioViewport.tsx,TextDraggable.tsx}`, `StudioPage.tsx`, `hooks/useKeychain.ts` + testes espelhados.
- **Modal Amplify UI:** verificar API real no node_modules (varia entre versões): geralmente `<Modal isOpen={bool} onClose={} heading="...">children</Modal>` de `@aws-amplify/ui-react`. Se divergir, adapte.
- **SVG drag:** pointer events no `<g>` do texto; converter coords do evento para o espaço do SVG via `svg.getScreenCTM().inverse()` — no jsdom getScreenCTM é null; proteja com fallback (usa coords do evento relativas ao bounding rect). Nos testes, dispare eventos sintéticos com clientX/clientY.
- **Snap é a regra:** o editor move o rect livremente durante o drag, mas o pointerUp SEMPRE chama `snapTextToSupport` e o resultado snapado é o que dispara `onMoveText`.
- **Deltei via git rm** (Task 5) e confirme zero referências com grep.

---

### Task 1: snapTextToSupport em positioning.ts (TDD puro)

**Files:**
- Modify: `src/features/studio/keychain/positioning.ts`
- Test: `tests/features/studio/keychain/positioning.test.ts`

**Step 1: Adicionar testes** — em `tests/features/studio/keychain/positioning.test.ts`, novo describe:

```ts
import { snapTextToSupport } from '@/features/studio/keychain/positioning'

describe('snapTextToSupport', () => {
  const pieceBB = { minX: -25, maxX: 25, minY: -12.5, maxY: 12.5 }
  const FUSION = 0.5

  it('texto flutuante no meio snapa para o topo interno da peça', () => {
    const result = snapTextToSupport(
      { x: 0, y: 0, halfWidth: 10, halfHeight: 5 },
      { supports: [], pieceBB },
    )
    expect(result.y + 5).toBeCloseTo(pieceBB.maxY - 4, 1)
  })

  it('texto snapa para a base do texto anterior com fusão', () => {
    const previous = { x: 0, y: 5, halfWidth: 10, halfHeight: 5 }
    const result = snapTextToSupport(
      { x: 0, y: -3, halfWidth: 10, halfHeight: 5 },
      { supports: [previous], pieceBB },
    )
    expect(result.y + 5).toBeCloseTo(previous.y - 5 - FUSION, 1)
  })

  it('texto snapa para a borda inferior do furo quando acima dele', () => {
    const hole = { x: 0, y: 9, radius: 4.5 }
    const result = snapTextToSupport(
      { x: 0, y: 2, halfWidth: 10, halfHeight: 5 },
      { supports: [], pieceBB, hole },
    )
    expect(result.y + 5).toBeCloseTo(hole.y - hole.radius - FUSION, 1)
  })

  it('preserva X quando há suporte vertical', () => {
    const result = snapTextToSupport(
      { x: 8, y: 0, halfWidth: 10, halfHeight: 5 },
      { supports: [], pieceBB },
    )
    expect(result.x).toBe(8)
  })
})
```

**Step 2: FAIL → implementar** — em `positioning.ts` adicionar:

```ts
const SUPPORT_FUSION = 0.5

export interface SnapContext {
  supports: Array<{ x: number; y: number; halfWidth: number; halfHeight: number }>
  pieceBB: BoundingBox2D
  hole?: Circle2D
}

export function snapTextToSupport(
  text: TextPosition,
  context: SnapContext,
): { x: number; y: number } {
  const { supports, pieceBB, hole } = context
  const topOf = (y: number) => y + text.halfHeight
  const clampX = (x: number) => {
    const minX = pieceBB.minX + TEXT_BORDER_MIN + text.halfWidth
    const maxX = pieceBB.maxX - TEXT_BORDER_MIN - text.halfWidth
    return Math.min(maxX, Math.max(minX, x))
  }
  const x = clampX(text.x)
  const pieceTop = pieceBB.maxY - TEXT_BORDER_MIN
  let supportY = pieceTop
  for (const s of supports) {
    const sBottom = s.y - s.halfHeight
    if (sBottom < supportY && sBottom > text.y) supportY = sBottom
  }
  if (hole && Math.abs(x - hole.x) < text.halfWidth + hole.radius) {
    const holeBottom = hole.y - hole.radius
    if (holeBottom < supportY && holeBottom > text.y) supportY = holeBottom
  }
  const y = supportY - text.halfHeight - SUPPORT_FUSION
  const minY = pieceBB.minY + TEXT_BORDER_MIN + text.halfHeight
  const clampedY = Math.max(minY, y)
  return { x, y: clampedY }
}
```

**Step 3: PASS → verificar → commit** `feat: snapping de contato para textos`

---

### Task 2: TextPositionEditor (TDD)

**Files:**
- Create: `src/features/studio/components/TextPositionEditor.tsx`
- Test: `tests/features/studio/components/TextPositionEditor.test.tsx`

**Step 1: Teste** — criar `tests/features/studio/components/TextPositionEditor.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TextPositionEditor } from '@/features/studio/components/TextPositionEditor'
import { defaultKeychainParams } from '@/features/studio/keychain/schema'

function renderEditor(overrides?: {
  selectedTextId?: string
  onMoveText?: (id: string, x: number, y: number) => void
  onClose?: () => void
}) {
  return render(
    <TextPositionEditor
      params={defaultKeychainParams}
      selectedTextId={overrides?.selectedTextId ?? defaultKeychainParams.texts[0].id}
      onSelectText={() => undefined}
      onMoveText={overrides?.onMoveText ?? (() => undefined)}
      onClose={overrides?.onClose ?? (() => undefined)}
    />,
  )
}

describe('TextPositionEditor', () => {
  it('renderiza modal com base, furo e um rect por texto', () => {
    renderEditor()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-hole')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^editor-text-/)).toHaveLength(1)
  })

  it('mostra o conteúdo do texto como label', () => {
    renderEditor()
    expect(screen.getByText(/meu nome/i)).toBeInTheDocument()
  })

  it('dispara onMoveText com posição snapada ao arrastar e soltar', () => {
    const onMoveText = vi.fn()
    renderEditor({ onMoveText })
    const textEl = screen.getByTestId('editor-text-text-1')
    fireEvent.pointerDown(textEl, { clientX: 100, clientY: 100, button: 0 })
    fireEvent.pointerMove(textEl, { clientX: 120, clientY: 140 })
    fireEvent.pointerUp(textEl, { clientX: 120, clientY: 140 })
    expect(onMoveText).toHaveBeenCalledWith('text-1', expect.any(Number), expect.any(Number))
  })

  it('seleciona texto ao clicar', () => {
    const onSelectText = vi.fn()
    render(
      <TextPositionEditor
        params={defaultKeychainParams}
        selectedTextId=""
        onSelectText={onSelectText}
        onMoveText={() => undefined}
        onClose={() => undefined}
      />,
    )
    fireEvent.pointerDown(screen.getByTestId('editor-text-text-1'), { clientX: 0, clientY: 0, button: 0 })
    expect(onSelectText).toHaveBeenCalledWith('text-1')
  })

  it('fecha ao clicar em Concluir', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

**Step 2: FAIL → implementar** — criar `src/features/studio/components/TextPositionEditor.tsx`:

Estrutura (adapte a API do Modal à versão instalada — leia o .d.ts):

```tsx
import { useRef, useState } from 'react'
import { Button, Modal } from '@aws-amplify/ui-react'
import { createBaseShape, getRingPosition } from '../keychain/shapes'
import { RING_WALL } from '../keychain/shapes'
import { clampTextPosition, snapTextToSupport, type BoundingBox2D, type Circle2D } from '../keychain/positioning'
import { TEXT_BORDER_MIN, type KeychainParams } from '../keychain/schema'

interface TextPositionEditorProps {
  params: KeychainParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void
  onClose: () => void
}

export function TextPositionEditor({ params, selectedTextId, onSelectText, onMoveText, onClose }: TextPositionEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number } | null>(null)
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)

  const ring = {
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }
  const pieceBB: BoundingBox2D = {
    minX: -params.width / 2, maxX: params.width / 2,
    minY: -params.width / 4, maxY: params.width / 4,
  }
  const holeCenter = getRingPosition(params.baseShape, params.width, params.width, ring)
  const hole: Circle2D = { x: holeCenter.x, y: holeCenter.y, radius: ring.innerDiameter / 2 }
  const baseShape = createBaseShape(params.baseShape, params.width, params.width, ring)
  const basePoints = baseShape.getPoints(64).map((p) => `${p.x},${p.y}`).join(' ')

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const vbWidth = params.width + 10
    const vbHeight = params.width / 2 + 10
    const scaleX = vbWidth / (rect.width || 1)
    const scaleY = vbHeight / (rect.height || 1)
    return {
      x: (clientX - rect.left) * scaleX - vbWidth / 2,
      y: -(clientY - rect.top) * scaleY + vbHeight / 2 - 5,
    }
  }

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation()
    onSelectText(id)
    dragRef.current = { id, startX: e.clientX, startY: e.clientY }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const pos = toSvg(e.clientX, e.clientY)
    setDragPos({ id: dragRef.current.id, x: pos.x, y: pos.y })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const item = params.texts.find((t) => t.id === drag.id)
    if (item) {
      const pos = toSvg(e.clientX, e.clientY)
      const supports = params.texts
        .filter((t) => t.id !== drag.id)
        .map((t) => ({ x: t.offsetX, y: t.offsetY, halfWidth: t.width / 2, halfHeight: t.height / 2 }))
      const snapped = snapTextToSupport(
        { x: pos.x, y: pos.y, halfWidth: item.width / 2, halfHeight: item.height / 2 },
        { supports, pieceBB, hole },
      )
      onMoveText(drag.id, snapped.x, snapped.y)
    }
    dragRef.current = null
    setDragPos(null)
  }

  return (
    <Modal isOpen onClose={onClose} heading="Posicionar textos" size="large">
      <svg
        ref={svgRef}
        data-testid="editor-svg"
        viewBox={`${-params.width / 2 - 5} ${-params.width / 4 - 5} ${params.width + 10} ${params.width / 2 + 10}`}
        className="w-full touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <polygon data-testid="editor-base" points={basePoints} fill="#ccfbf1" stroke="#14b8a6" strokeWidth="0.3" />
        <circle data-testid="editor-ring" cx={hole.x} cy={hole.y} r={hole.radius + RING_WALL} fill="#99f6e4" />
        <circle data-testid="editor-hole" cx={hole.x} cy={hole.y} r={hole.radius} fill="white" stroke="#14b8a6" strokeWidth="0.3" />
        {params.texts.map((t) => {
          const isDragging = dragPos?.id === t.id
          const x = isDragging ? dragPos!.x : t.offsetX
          const y = isDragging ? dragPos!.y : t.offsetY
          const selected = t.id === selectedTextId
          return (
            <g
              key={t.id}
              data-testid={`editor-text-${t.id}`}
              onPointerDown={(e) => handlePointerDown(t.id, e)}
              className="cursor-grab"
            >
              <rect
                x={x - t.width / 2}
                y={y - t.height / 2}
                width={t.width}
                height={t.height}
                fill={selected ? '#14b8a6' : '#0d948899'}
                stroke={selected ? '#0f766e' : 'transparent'}
                strokeWidth="0.3"
              />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(t.height * 0.6, 4)} fill="white">
                {t.content.slice(0, 10)}
              </text>
            </g>
          )
        })}
      </svg>
      <Button variation="primary" onClick={onClose}>Concluir</Button>
    </Modal>
  )
}
```

Notas do executor:
- A conversão `toSvg` é aproximação linear do viewBox (getScreenCTM é null no jsdom e às vezes instável em browser com CSS transforms) — adequada para um viewBox fixo.
- O snap no pointerUp usa os texts ATUAIS como suportes (exceto o arrastado) — ordem do array preservada por construção (o design: texto N apoia no N−1; aqui simplificamos para "apoia no suporte mais próximo acima", que cobre o caso).
- `RING_WALL` precisa estar exportado de shapes.ts (verifique; senão exporte).
- Ajuste o Modal à API real (título/heading, footer com o botão Concluir dentro do footer se disponível).

**Step 3: PASS → verificar → commit** `feat: editor 2d de posicionamento com snapping`

---

### Task 3: StudioPanel sem sliders X/Y + botão ✥ (TDD)

**Files:**
- Modify: `src/features/studio/components/StudioPanel.tsx`
- Test: `tests/features/studio/components/StudioPanel.test.tsx`

**Step 1: Testes** — em `tests/features/studio/components/StudioPanel.test.tsx`:
- Remover testes dos sliders Posição X/Y (se existirem assertions de `getByLabelText('Posição X')`/`'Posição Y'`)
- Trocar o teste de controles do texto selecionado (remover as 2 linhas de Posição)
- Adicionar:

```ts
  it('não renderiza sliders de posição X/Y', () => {
    renderPanel()
    expect(screen.queryByLabelText('Posição X')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Posição Y')).not.toBeInTheDocument()
  })

  it('renderiza botão de posicionar textos que abre o editor', async () => {
    const user = userEvent.setup()
    const onOpenEditor = vi.fn()
    render(
      <StudioPanel
        params={defaultKeychainParams}
        selectedTextId={defaultKeychainParams.texts[0].id}
        onSelectText={() => undefined}
        onUpdateText={() => undefined}
        onAddText={() => undefined}
        onRemoveText={() => undefined}
        onUpdateParam={() => undefined}
        onReset={() => undefined}
        onOpenEditor={onOpenEditor}
      />,
    )
    await user.click(screen.getByRole('button', { name: /posicionar textos/i }))
    expect(onOpenEditor).toHaveBeenCalledTimes(1)
  })
```

Atualizar `renderPanel` helper para incluir `onOpenEditor`.

**Step 2: FAIL → implementar** — em `StudioPanel.tsx`:
- Nova prop `onOpenEditor: () => void`
- Na header do bloco Texto (linha do heading "Texto" do accordion... melhor: junto aos chips): botão ícone ✥ `aria-label="Posicionar textos"` onClick={onOpenEditor}, estilo do reset (size small, variation link)
- Remover os 2 sliders Posição X e Posição Y

**Step 3: PASS → verificar → commit** `feat: painel com botão do editor e sem sliders de posição`

---

### Task 4: Preview sem drag + build com snap (TDD)

**Files:**
- Modify: `src/features/studio/components/KeychainPreview.tsx`
- Modify: `src/features/studio/keychain/buildKeychain.ts`
- Modify: `src/features/studio/components/StudioViewport.tsx`
- Test: updates em `tests/features/studio/components/StudioViewport.test.tsx`, `tests/features/studio/keychain/buildKeychain.test.ts`

**Step 1: Testes:**
- `buildKeychain.test`: adicionar:

```ts
  it('offsets flutuantes são snapados para suporte no build', () => {
    const result = buildKeychain(makeInput({
      fonts: { bold: fontStub },
      params: {
        ...defaultKeychainParams,
        texts: [{ ...defaultKeychainParams.texts[0], offsetY: -5 }],
      },
    }))
    result.text.computeBoundingBox()
    expect(result.text.boundingBox?.max.y).toBeGreaterThanOrEqual(
      defaultKeychainParams.width / 2 - 4 - 1,
    )
  })
```

(Nota: o snap manda o texto para o topo interno da peça — bbox.max.y próximo do topo menos borda. Ajuste a expectativa ao mock: o TextGeometry mock tem altura = size; o importante é que NÃO fique em offsetY=-5 baixo.)

- `StudioViewport.test`: remover assertions de botão reset flutuante associadas ao drag se os testes referenciarem props removidas — manter o botão reset câmera (ele existe por conta própria). Atualizar mocks do KeychainPreview (sem props de seleção/drag).

**Step 2: Implementar:**
- `KeychainPreview.tsx`: props voltam a `{ geometry: BuildKeychainResult | null, baseColor: string, letterColor: string }`; renderiza base + UM mesh com `geometry.text` (merge). Sem TextDraggable, sem seleção.
- `StudioViewport.tsx`: remover props selectedTextId/onSelectText/onMoveText/onDragStart/onDragEnd (manter geometry, resetCameraSignal, onResetCamera, baseColor, letterColor).
- `buildKeychain.ts`: no loop de textos, aplicar `snapTextToSupport` por item antes do translate — suportes = textos anteriores já processados (posições snapadas), hole = círculo do furo. Import de positioning.

**Step 3: PASS → verificar → commit** `feat: build com snap e preview sem drag`

---

### Task 5: StudioPage integrando editor + remoção TextDraggable

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`
- Delete: `src/features/studio/components/TextDraggable.tsx`
- Delete: `tests/features/studio/components/TextDraggable.test.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Testes** — em `StudioPage.test.tsx`:
- Mock de `TextPositionEditor` renderizando `<div data-testid="text-editor" />` quando aberto
- Testes: botão ✥ presente; ao clicar, editor aparece (mock); editor some após onClose; sem props de drag no viewport

**Step 2: Implementar** — `StudioPage.tsx`:
- `const [isEditorOpen, setEditorOpen] = useState(false)`
- Passar `onOpenEditor={() => setEditorOpen(true)}` ao StudioPanel
- Renderizar `{isEditorOpen && <TextPositionEditor params={params} selectedTextId={selectedTextId} onSelectText={setSelectedTextId} onMoveText={handleMoveText} onClose={() => setEditorOpen(false)} />}`
- `handleMoveText` mantém: `updateText(id, { offsetX: x, offsetY: y })`
- Remover props de drag/seleção do StudioViewport

**Step 3: Deletar TextDraggable:**

```bash
git rm src/features/studio/components/TextDraggable.tsx tests/features/studio/components/TextDraggable.test.tsx
grep -rn "TextDraggable\|onMoveText\|onSelectText\|onDragStart\|onDragEnd\|Posição X" src/ tests/ --include="*.ts" --include="*.tsx" | grep -v "TextPositionEditor" || echo "OK: zero referências"
```

**Step 4: Verificação completa** + commit `feat: studio com editor 2d integrado`

---

### Task 6: Docs + verificação final

**Files:**
- Modify: `docs/frontend/studio.md`

**Conteúdo:**
- Visão geral: "**Posicionamento 2D** — botão ✥ no bloco Texto abre editor com o desenho da base e os textos arrastáveis; snapping de contato garante que todo texto fique conectado (topo, furo ou texto anterior) — nunca flutua"
- Substituir bullet "Drag 3D" pelo acima
- Como editar: adicionar `| Editor 2D de textos | src/features/studio/components/TextPositionEditor.tsx |` e `| Snapping de contato | src/features/studio/keychain/positioning.ts |`
- Decisões: "**Snap de contato:** todo texto encosta no topo interno, no furo/anel ou na base do texto anterior (fusão de 0.5mm). Aplicado no editor (pointerUp) e no build — fonte única. Drag 3D e sliders X/Y removidos."

**Verificação final:**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
grep -rn "TextDraggable\|Posição X\|onDragStart" src/ tests/ --include="*.ts" --include="*.tsx" | grep -v TextPositionEditor || echo "OK: zero referências mortas"
git log --oneline -8
```

**Manual (registrar):**
```bash
npm run dev
# /studio → bloco Texto → botão ✥:
# 1. Modal abre com desenho da base + furo + texto arrastável
# 2. Arrastar texto para o meio e soltar → pula para cima (conectado)
# 3. Com 2 textos: arrastar um abaixo do outro → cola nele
# 4. Clicar num texto seleciona (chips sincronizam)
# 5. Concluir fecha; posições persistem no 3D; STL conectado
```

**Commit** `docs: documenta editor 2d de posicionamento`

---

## Verification final (executor)

```bash
npm run lint && npm run typecheck && npm run test && npm run build
git log --oneline -8
```

Expected: 6 commits; testes verdes; editor funcional; zero referências a TextDraggable/sliders X/Y.
