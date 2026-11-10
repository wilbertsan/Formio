# Topo de Bolo — Editor de posicionamento com paridade ao chaveiro: Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir o editor canvas do topo de bolo por um editor SVG com contorno real da placa, tamanhos reais dos conteúdos, arraste pointer/touch, nudge por setas, seleção acessível e fechamento por fundo/Concluir/Escape — igual ao chaveiro.

**Architecture:** O builder passa a expor `contentItems` com as meias-extensões reais e `getPlateShapes`. O `TextPositionEditor` é reescrito em SVG, usando `clampToOutline` e os metadados do build. O painel mantém a seleção de conteúdo e repassa `geometry`; o ícone continua na subseção Ícone, mas é selecionável no editor.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Amplify UI, Vitest.

**Design aprovado:** `docs/plans/2026-11-09-topo-bolo-editor-chaveiro-design.md`

---

## Task 1: Metadados de conteúdo e contorno da placa

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts`

### Step 1: Adicionar os testes

1. Em `buildCakeTopper.test.ts`, adicione dentro de `describe('buildCakeTopper - relevo (raised)', ...)`:

```ts
  it('expõe as meias-extensões reais dos textos e do ícone', () => {
    const params = {
      ...defaultCakeTopperParams,
      svgIcon: SVG_RECT,
      texts: [
        text({ id: 't1', content: 'AB', width: 10, height: 10 }),
        text({ id: 't2', content: 'A', width: 20, height: 10 }),
      ],
    }
    const result = buildCakeTopper({ params, fonts: { bold: mockFont('AB') } })

    expect(result.contentItems.map((item) => item.id)).toEqual(['t1', 't2', 'icon'])
    const narrow = result.contentItems.find((item) => item.id === 't1')!
    const wide = result.contentItems.find((item) => item.id === 't2')!
    expect(narrow.kind).toBe('text')
    expect(narrow.halfWidth).toBeLessThan(wide.halfWidth)
    expect(narrow.halfHeight).toBeCloseTo(wide.halfHeight, 5)

    const icon = result.contentItems.find((item) => item.id === 'icon')!
    expect(icon.kind).toBe('icon')
    expect(icon.halfWidth).toBeGreaterThan(0)
    expect(icon.halfHeight).toBeGreaterThan(0)
  })
```

2. Em `useCakeTopper.test.ts`, no mock de `buildCakeTopper`, adicione `contentItems: []`:

```ts
  buildCakeTopper: vi.fn(() => ({
    plate: new THREE.BufferGeometry(),
    relief: null,
    support: null,
    contentItems: [],
  })),
```

### Step 2: Confirmar a falha

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
```
Expected: FAIL — `result.contentItems` ainda não existe.

### Step 3: Adicionar os tipos e o campo no resultado

Em `buildCakeTopper.ts`, adicione antes de `BuildCakeTopperResult`:

```ts
export interface ContentBounds {
  id: string
  kind: 'text' | 'icon'
  halfWidth: number
  halfHeight: number
}
```

E troque a interface do resultado:

```ts
export interface BuildCakeTopperResult {
  plate: BufferGeometry
  relief: BufferGeometry | null
  support: BufferGeometry | null
  contentItems: ContentBounds[]
}
```

### Step 4: Adicionar metadados em `buildTextGeometries`

1. Antes da função, adicione:

```ts
interface BuiltText {
  geometry: BufferGeometry
  bounds: ContentBounds
}
```

2. Troque a assinatura/retorno:

```ts
function buildTextGeometries(
  input: BuildCakeTopperInput,
  plate: PlateBounds,
): BuiltText[] {
  const { params, fonts, font, onError } = input
  const geometries: BuiltText[] = []
```

3. Substitua `geometries.push(geometry)` por:

```ts
    geometry.computeBoundingBox()
    const finalBox = geometry.boundingBox
    geometries.push({
      geometry,
      bounds: {
        id: item.id,
        kind: 'text',
        halfWidth: finalBox ? (finalBox.max.x - finalBox.min.x) / 2 : 0,
        halfHeight: finalBox ? (finalBox.max.y - finalBox.min.y) / 2 : 0,
      },
    })
```

### Step 5: Adicionar metadados em `buildIconGeometry`

1. Antes da função, adicione:

```ts
interface BuiltIcon {
  geometry: BufferGeometry
  bounds: ContentBounds
}
```

2. Troque a assinatura/retorno:

```ts
function buildIconGeometry(
  params: CakeTopperParams,
  plate: PlateBounds,
): BuiltIcon | null {
```

3. Substitua o final:

```ts
  const z = params.thickness - TEXT_Z_OFFSET
  geometry.translate(placed.x, placed.y, z)
  return geometry
```

por:

```ts
  const z = params.thickness - TEXT_Z_OFFSET
  geometry.translate(placed.x, placed.y, z)
  geometry.computeBoundingBox()
  const finalBox = geometry.boundingBox
  return {
    geometry,
    bounds: {
      id: 'icon',
      kind: 'icon',
      halfWidth: finalBox ? (finalBox.max.x - finalBox.min.x) / 2 : 0,
      halfHeight: finalBox ? (finalBox.max.y - finalBox.min.y) / 2 : 0,
    },
  }
```

### Step 6: Atualizar `buildRelief`

Substitua a função por:

```ts
function buildRelief(
  input: BuildCakeTopperInput,
  plate: PlateBounds,
): { geometry: BufferGeometry | null; items: ContentBounds[] } {
  const textBuild = buildTextGeometries(input, plate)
  const icon = buildIconGeometry(input.params, plate)
  const parts = icon
    ? [...textBuild.map((item) => item.geometry), icon.geometry]
    : textBuild.map((item) => item.geometry)
  const items = [
    ...textBuild.map((item) => item.bounds),
    ...(icon ? [icon.bounds] : []),
  ]
  if (parts.length === 0) return { geometry: null, items }
  return { geometry: mergeAll(parts, input.onError), items }
}
```

### Step 7: Atualizar `buildCakeTopper`

Substitua o corpo por:

```ts
export function buildCakeTopper(input: BuildCakeTopperInput): BuildCakeTopperResult {
  const { params, onError } = input
  const plate = extrudePlate(plateShapes(params, onError), params.thickness, onError)
  const plateBounds = plateBoundsOf(plate, params)
  const relief = buildRelief(input, plateBounds)

  return {
    plate,
    relief: relief.geometry,
    support: buildSupport(params, plate, onError),
    contentItems: relief.items,
  }
}
```

### Step 8: Exportar o contorno da placa

Adicione antes de `buildCakeTopper`:

```ts
export function getPlateShapes(params: CakeTopperParams): Shape[] {
  return plateShapes(params)
}
```

### Step 9: Rodar testes e typecheck

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/
npm run typecheck
```
Expected: PASS.

### Step 10: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts \
  tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts
git commit -m "feat(topo-bolo): expõe limites reais dos conteúdos"
```

---

## Task 2: Editor SVG e integração

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.tsx`
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx`
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.test.tsx`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx`

### Step 1: Reescrever `TextPositionEditor.tsx`

Substitua o arquivo inteiro por:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { Button, Flex, Heading } from '@aws-amplify/ui-react'
import { Shape, Vector2 } from 'three'
import type { BuildCakeTopperResult } from './buildCakeTopper'
import { getPlateShapes } from './buildCakeTopper'
import { fitIconHalfSize, iconGeometryHalfSize, ICON_MARGIN } from './iconLayout'
import { clampToOutline, outlineSpec, type PlateBounds } from './placement'
import type { CakeTopperParams } from './schema'

const ICON_ID = 'icon'
const TEXT_MARGIN = 4
const PADDING = 5
const DRAG_THRESHOLD = 0.5
const HEADING_ID = 'content-position-editor-heading'
const KEY_DELTAS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: -1 },
}

interface TextPositionEditorProps {
  params: CakeTopperParams
  geometry: BuildCakeTopperResult | null
  selectedContentId: string
  onSelectContent: (id: string) => void
  onMoveContent: (id: string, x: number, y: number) => void
  onClose: () => void
}

interface EditorContent {
  id: string
  kind: 'text' | 'icon'
  label: string
  x: number
  y: number
  halfWidth: number
  halfHeight: number
  margin: number
}

interface PlateBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function shapeToPath(shape: Shape): string {
  const toPath = (points: Vector2[]): string =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${-point.y}`).join(' ') + ' Z'
  const outer = toPath(shape.getPoints(64))
  const holes = shape.holes.map((hole) => toPath(hole.getPoints(64))).join(' ')
  return holes ? `${outer} ${holes}` : outer
}

function shapesBounds(shapes: Shape[]): PlateBox {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  const expand = (point: Vector2): void => {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }

  for (const shape of shapes) {
    shape.getPoints(64).forEach(expand)
    for (const hole of shape.holes) hole.getPoints(64).forEach(expand)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { minX: -10, maxX: 10, minY: -10, maxY: 10 }
  }
  return { minX, maxX, minY, maxY }
}

export function TextPositionEditor({
  params,
  geometry,
  selectedContentId,
  onSelectContent,
  onMoveContent,
  onClose,
}: TextPositionEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const paramsRef = useRef(params)
  paramsRef.current = params
  const plateBoundsRef = useRef<PlateBounds>({ halfWidth: 1, halfHeight: 1 })
  const contentBoxesRef = useRef<EditorContent[]>([])
  const onMoveContentRef = useRef(onMoveContent)
  onMoveContentRef.current = onMoveContent
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)

  const plateShapes = useMemo(
    () => getPlateShapes(params),
    [params.shape, params.width, params.height, params.cornerRadius, params.contourSvg],
  )
  const plate = useMemo(() => shapesBounds(plateShapes), [plateShapes])
  const plateBounds = useMemo<PlateBounds>(() => ({
    halfWidth: (plate.maxX - plate.minX) / 2,
    halfHeight: (plate.maxY - plate.minY) / 2,
  }), [plate])
  plateBoundsRef.current = plateBounds

  const viewMinX = plate.minX - PADDING
  const viewMinY = -(plate.maxY + PADDING)
  const vbWidth = plate.maxX - plate.minX + 2 * PADDING
  const vbHeight = plate.maxY - plate.minY + 2 * PADDING

  const contentBoxes = useMemo<EditorContent[]>(() => {
    const built = geometry?.contentItems ?? []
    const items: EditorContent[] = params.texts.map((text) => {
      const item = built.find((content) => content.id === text.id)
      const halfWidth = item?.halfWidth ?? text.width / 2
      const halfHeight = item?.halfHeight ?? text.height / 2
      const placed = clampToOutline(
        params,
        plateBounds,
        halfWidth,
        halfHeight,
        text.offsetX,
        text.offsetY,
        TEXT_MARGIN,
      )
      return {
        id: text.id,
        kind: 'text',
        label: text.content || 'Texto',
        x: placed.x,
        y: placed.y,
        halfWidth,
        halfHeight,
        margin: TEXT_MARGIN,
      }
    })

    if (params.svgIcon) {
      const item = built.find((content) => content.id === ICON_ID)
      const raw = iconGeometryHalfSize(
        params.svgIcon,
        params.width,
        params.height,
        params.iconScale,
      )
      const fallback = fitIconHalfSize(raw, params, plateBounds)
      const halfWidth = item?.halfWidth ?? fallback?.halfWidth ?? 4
      const halfHeight = item?.halfHeight ?? fallback?.halfHeight ?? 4
      const placed = clampToOutline(
        params,
        plateBounds,
        halfWidth,
        halfHeight,
        params.iconOffsetX,
        params.iconOffsetY,
        ICON_MARGIN,
      )
      items.push({
        id: ICON_ID,
        kind: 'icon',
        label: 'Ícone',
        x: placed.x,
        y: placed.y,
        halfWidth,
        halfHeight,
        margin: ICON_MARGIN,
      })
    }

    return items
  }, [params, geometry, plateBounds])
  contentBoxesRef.current = contentBoxes

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    if (typeof svg.getScreenCTM === 'function' && typeof svg.createSVGPoint === 'function') {
      const ctm = svg.getScreenCTM()
      if (ctm) {
        const pt = svg.createSVGPoint()
        pt.x = clientX
        pt.y = clientY
        const mapped = pt.matrixTransform(ctm.inverse())
        if (Number.isFinite(mapped.x) && Number.isFinite(mapped.y)) {
          return { x: mapped.x, y: -mapped.y }
        }
      }
    }

    const rect = svg.getBoundingClientRect()
    const scaleX = vbWidth / (rect.width || 1)
    const scaleY = vbHeight / (rect.height || 1)
    return {
      x: (clientX - rect.left) * scaleX + viewMinX,
      y: -((clientY - rect.top) * scaleY + viewMinY),
    }
  }, [vbWidth, vbHeight, viewMinX, viewMinY])

  const clampPosition = useCallback((
    content: EditorContent,
    x: number,
    y: number,
  ): { x: number; y: number } => {
    return clampToOutline(
      paramsRef.current,
      plateBoundsRef.current,
      content.halfWidth,
      content.halfHeight,
      x,
      y,
      content.margin,
    )
  }, [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const pos = toSvg(event.clientX, event.clientY)
      const deltaX = pos.x - drag.startX
      const deltaY = pos.y - drag.startY
      if (!drag.moved && Math.hypot(deltaX, deltaY) <= DRAG_THRESHOLD) return

      const content = contentBoxesRef.current.find((item) => item.id === drag.id)
      if (!content) return

      drag.moved = true
      const next = clampPosition(content, drag.originX + deltaX, drag.originY + deltaY)
      setDragPos({ id: drag.id, x: next.x, y: next.y })
    }

    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      if (drag.moved) {
        const content = contentBoxesRef.current.find((item) => item.id === drag.id)
        const pos = toSvg(event.clientX, event.clientY)
        if (content) {
          const next = clampPosition(
            content,
            drag.originX + pos.x - drag.startX,
            drag.originY + pos.y - drag.startY,
          )
          onMoveContentRef.current(drag.id, next.x, next.y)
        }
      }

      dragRef.current = null
      setDragPos(null)
    }

    const onCancel = () => {
      dragRef.current = null
      setDragPos(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }
  }, [toSvg, clampPosition])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  const handlePointerDown = useCallback((
    id: string,
    event: ReactPointerEvent<SVGGElement>,
  ) => {
    event.stopPropagation()
    onSelectContent(id)

    const content = contentBoxesRef.current.find((item) => item.id === id)
    if (!content) return

    const pos = toSvg(event.clientX, event.clientY)
    dragRef.current = {
      id,
      startX: pos.x,
      startY: pos.y,
      originX: content.x,
      originY: content.y,
      moved: false,
    }
  }, [onSelectContent, toSvg])

  const handleKeyDown = useCallback((
    id: string,
    event: ReactKeyboardEvent<SVGGElement>,
  ) => {
    const delta = KEY_DELTAS[event.key]
    if (!delta) return

    const content = contentBoxesRef.current.find((item) => item.id === id)
    if (!content) return

    event.preventDefault()
    const next = clampPosition(content, content.x + delta.x, content.y + delta.y)
    onMoveContentRef.current(id, next.x, next.y)
  }, [clampPosition])

  const validArea = outlineSpec(params, plateBounds, TEXT_MARGIN)

  return (
    <div
      data-testid="text-editor"
      role="dialog"
      aria-modal="true"
      aria-labelledby={HEADING_ID}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[90vw] max-w-2xl rounded-lg bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="medium">
          <Heading id={HEADING_ID} level={2} fontSize="large">Posicionar conteúdos</Heading>
          <Button
            ref={closeButtonRef}
            size="small"
            variation="link"
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </Button>
        </Flex>

        <svg
          ref={svgRef}
          data-testid="editor-svg"
          viewBox={`${viewMinX} ${viewMinY} ${vbWidth} ${vbHeight}`}
          className="w-full touch-none select-none rounded border border-neutral-200"
        >
          <rect x={viewMinX} y={viewMinY} width={vbWidth} height={vbHeight} fill="#f5f5f5" />
          <g data-testid="editor-base">
            {plateShapes.map((shape, index) => (
              <path
                key={index}
                d={shapeToPath(shape)}
                fill="#e4e4e7"
                stroke="#a1a1aa"
                strokeWidth={0.3}
                fillRule="evenodd"
              />
            ))}
          </g>
          {validArea.box ? (
            <rect
              data-testid="editor-valid-area"
              x={-validArea.rx}
              y={-validArea.ry}
              width={validArea.rx * 2}
              height={validArea.ry * 2}
              fill="none"
              stroke="#14b8a680"
              strokeWidth={0.2}
              strokeDasharray="1,0.5"
            />
          ) : (
            <ellipse
              data-testid="editor-valid-area"
              cx={0}
              cy={0}
              rx={validArea.rx}
              ry={validArea.ry}
              fill="none"
              stroke="#14b8a680"
              strokeWidth={0.2}
              strokeDasharray="1,0.5"
            />
          )}
          {contentBoxes.map((content) => {
            const isDragging = dragPos?.id === content.id
            const x = isDragging ? dragPos.x : content.x
            const y = isDragging ? dragPos.y : content.y
            const selected = content.id === selectedContentId
            return (
              <g
                key={content.id}
                data-testid={`editor-content-${content.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Mover ${content.label}`}
                onPointerDown={(event) => handlePointerDown(content.id, event)}
                onKeyDown={(event) => handleKeyDown(content.id, event)}
                style={{ cursor: 'grab' }}
              >
                <rect
                  x={x - content.halfWidth}
                  y={-y - content.halfHeight}
                  width={content.halfWidth * 2}
                  height={content.halfHeight * 2}
                  fill={selected ? '#14b8a6' : '#0d948899'}
                  stroke={selected ? '#0f766e' : 'transparent'}
                  strokeWidth={0.3}
                />
                <text
                  x={x}
                  y={-y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(content.halfHeight * 1.2, 4)}
                  fill="white"
                  pointerEvents="none"
                >
                  {content.label.slice(0, 10)}
                </text>
              </g>
            )
          })}
        </svg>

        <p className="mt-2 text-sm text-neutral-500">
          Arraste os conteúdos ou use as setas do teclado.
        </p>

        <Flex justifyContent="flex-end" marginTop="medium">
          <Button variation="primary" onClick={onClose}>Concluir</Button>
        </Flex>
      </div>
    </div>
  )
}
```

### Step 2: Integrar no painel

Em `StudioPanel.tsx`:

1. Importe o tipo:
```ts
import type { BuildCakeTopperResult } from './buildCakeTopper'
```

2. Em `StudioPanelProps`, adicione:
```ts
  geometry: BuildCakeTopperResult | null
```

3. Na desestruturação, adicione `geometry`.

4. Adicione o estado:
```ts
  const [selectedContentId, setSelectedContentId] = useState(params.texts[0]?.id ?? '')
```

5. No `useEffect` que seleciona o texto recém-adicionado, atualize também:
```ts
      if (last) {
        setSelectedTextId(last.id)
        setSelectedContentId(last.id)
      }
```

6. Nos botões de texto da lista, troque `aria-pressed` e o clique:
```tsx
                      aria-pressed={text.id === selectedContentId}
                      onClick={() => {
                        setSelectedTextId(text.id)
                        setSelectedContentId(text.id)
                      }}
```

7. Antes do `return`, adicione:
```ts
  const handleMoveContent = (id: string, x: number, y: number) => {
    if (id === 'icon') {
      onMoveIcon(x, y)
    } else {
      onUpdateTextById(id, { offsetX: x, offsetY: y })
    }
  }
```

8. No final, substitua a renderização do editor por:
```tsx
      {editorOpen && selectedText && (
        <TextPositionEditor
          params={params}
          geometry={geometry}
          selectedContentId={selectedContentId}
          onSelectContent={(id) => {
            setSelectedContentId(id)
            if (id !== 'icon') setSelectedTextId(id)
          }}
          onMoveContent={handleMoveContent}
          onClose={() => setEditorOpen(false)}
        />
      )}
```

### Step 3: Passar `geometry` no `StudioPage`

Em `StudioPage.tsx`, no `<TopoBoloTool>`, adicione:
```tsx
            geometry={geometry}
```

### Step 4: Atualizar os testes do painel

Em `StudioPanel.test.tsx`, no `createMockProps`, adicione:
```ts
    geometry: null,
```

E atualize o teste de abertura do editor para verificar o SVG:
```ts
    fireEvent.click(screen.getByText(/posicionar conteúdo/i))
    expect(screen.getByTestId('text-editor')).toBeInTheDocument()
    expect(screen.getByTestId('editor-svg')).toBeInTheDocument()
```

### Step 5: Reescrever os testes do editor

Substitua o conteúdo de `TextPositionEditor.test.tsx` por:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import * as THREE from 'three'
import { TextPositionEditor } from '@/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor'
import {
  defaultCakeTopperParams,
  type CakeTopperParams,
} from '@/features/studio/tools/confeitaria/topo-bolo/schema'
import type { BuildCakeTopperResult } from '@/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper'

if (typeof window.PointerEvent === 'undefined') {
  Object.defineProperty(window, 'PointerEvent', {
    value: MouseEvent,
    configurable: true,
    writable: true,
  })
}

const SVG_RECT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'
const firstTextId = defaultCakeTopperParams.texts[0].id

function mockGeometry(): BuildCakeTopperResult {
  return {
    plate: new THREE.BufferGeometry(),
    relief: null,
    support: null,
    contentItems: [
      { id: firstTextId, kind: 'text', halfWidth: 5, halfHeight: 2 },
    ],
  }
}

function renderEditor(overrides: {
  params?: CakeTopperParams
  geometry?: BuildCakeTopperResult | null
  selectedContentId?: string
  onSelectContent?: (id: string) => void
  onMoveContent?: (id: string, x: number, y: number) => void
  onClose?: () => void
} = {}) {
  return render(
    <TextPositionEditor
      params={overrides.params ?? defaultCakeTopperParams}
      geometry={overrides.geometry === undefined ? mockGeometry() : overrides.geometry}
      selectedContentId={overrides.selectedContentId ?? firstTextId}
      onSelectContent={overrides.onSelectContent ?? (() => undefined)}
      onMoveContent={overrides.onMoveContent ?? (() => undefined)}
      onClose={overrides.onClose ?? (() => undefined)}
    />,
  )
}

function dragContent(id: string, clientX: number, clientY: number): void {
  const element = screen.getByTestId(`editor-content-${id}`)
  fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
  fireEvent.pointerMove(document, { clientX, clientY })
  fireEvent.pointerUp(document, { clientX, clientY })
}

function mockSvgViewport(container: HTMLElement, width: number, height: number): void {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('svg não encontrado')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('TextPositionEditor', () => {
  it('renderiza a placa, a área útil e a caixa do texto', () => {
    renderEditor()
    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-valid-area')).toBeInTheDocument()
    expect(screen.getByTestId(`editor-content-${firstTextId}`)).toBeInTheDocument()
    expect(screen.getByText('Texto')).toBeInTheDocument()
  })

  it('seleciona o conteúdo ao clicar', () => {
    const onSelectContent = vi.fn()
    renderEditor({ selectedContentId: '', onSelectContent })
    fireEvent.pointerDown(screen.getByTestId(`editor-content-${firstTextId}`), {
      clientX: 0,
      clientY: 0,
      button: 0,
      bubbles: true,
    })
    expect(onSelectContent).toHaveBeenCalledWith(firstTextId)
  })

  it('não move ao clicar sem arrastar', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent, selectedContentId: '' })
    const element = screen.getByTestId(`editor-content-${firstTextId}`)
    fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
    fireEvent.pointerUp(document, { clientX: 100, clientY: 100 })
    expect(onMoveContent).not.toHaveBeenCalled()
  })

  it('dispara onMoveContent ao arrastar e soltar', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    dragContent(firstTextId, 140, 140)
    expect(onMoveContent).toHaveBeenCalledWith(firstTextId, expect.any(Number), expect.any(Number))
  })

  it('usa o delta do arraste a partir da posição de origem', () => {
    const params: CakeTopperParams = {
      ...defaultCakeTopperParams,
      texts: [{ ...defaultCakeTopperParams.texts[0], offsetX: 5, offsetY: -2 }],
    }
    const onMoveContent = vi.fn()
    const { container } = renderEditor({ params, onMoveContent })
    const svg = container.querySelector('svg')!
    const [, , vbWidth, vbHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number)
    mockSvgViewport(container, vbWidth, vbHeight)

    const element = screen.getByTestId(`editor-content-${firstTextId}`)
    fireEvent.pointerDown(element, { clientX: 39, clientY: 18.5, button: 0, bubbles: true })
    fireEvent.pointerMove(document, { clientX: 42, clientY: 16.5 })
    fireEvent.pointerUp(document, { clientX: 42, clientY: 16.5 })

    const [id, x, y] = onMoveContent.mock.calls[0]
    expect(id).toBe(firstTextId)
    expect(x).toBeCloseTo(8, 1)
    expect(y).toBeCloseTo(0, 1)
    expect(x).not.toBeCloseTo(12, 1)
  })

  it('limita o arraste à placa', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    dragContent(firstTextId, 5000, 5000)
    const [id, x, y] = onMoveContent.mock.calls[0]
    expect(id).toBe(firstTextId)
    expect(Math.abs(x)).toBeLessThanOrEqual(40)
    expect(Math.abs(y)).toBeLessThanOrEqual(25)
  })

  it('move conteúdo por teclado com as setas', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    fireEvent.keyDown(screen.getByRole('button', { name: /mover texto/i }), { key: 'ArrowRight' })
    expect(onMoveContent).toHaveBeenCalledWith(firstTextId, 1, 0)
  })

  it('fecha ao clicar em Concluir', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha ao clicar no fundo', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.click(screen.getByTestId('text-editor'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fecha ao pressionar Escape', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('foca o botão fechar ao montar', () => {
    renderEditor()
    expect(screen.getByRole('button', { name: /fechar/i })).toHaveFocus()
  })

  it('expõe diálogo modal rotulado pelo título', () => {
    renderEditor()
    const dialog = screen.getByRole('dialog')
    const heading = screen.getByRole('heading', { name: /posicionar conteúdos/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id)
  })

  it('usa tamanhos de fallback sem geometria', () => {
    renderEditor({ geometry: null })
    const rect = screen.getByTestId(`editor-content-${firstTextId}`).querySelector('rect')
    expect(rect).toHaveAttribute('width', '90')
    expect(rect).toHaveAttribute('height', '14')
  })

  it('renderiza o ícone quando configurado', () => {
    const params: CakeTopperParams = {
      ...defaultCakeTopperParams,
      svgIcon: SVG_RECT,
      iconOffsetX: 0,
      iconOffsetY: 0,
    }
    const geometry: BuildCakeTopperResult = {
      ...mockGeometry(),
      contentItems: [
        ...mockGeometry().contentItems,
        { id: 'icon', kind: 'icon', halfWidth: 3, halfHeight: 3 },
      ],
    }
    renderEditor({ params, geometry })
    expect(screen.getByTestId('editor-content-icon')).toBeInTheDocument()
    expect(screen.getByText('Ícone')).toBeInTheDocument()
  })
})
```

### Step 6: Rodar testes, typecheck e lint

Run:
```bash
npm test -- tests/features/studio/tools/confeitaria/topo-bolo/
npm run typecheck
npm run lint
```
Expected: PASS.

### Step 7: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.tsx \
  src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx \
  src/features/studio/StudioPage.tsx \
  tests/features/studio/tools/confeitaria/topo-bolo/TextPositionEditor.test.tsx \
  tests/features/studio/tools/confeitaria/topo-bolo/StudioPanel.test.tsx
git commit -m "feat(topo-bolo): reescreve editor de posicionamento em SVG"
```

---

## Task 3: Atualizar a documentação

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md`
- Modify: `docs/frontend/studio.md`

### Step 1: `AGENTS.md`

Troque:
```md
- `TextPositionEditor.tsx` — Editor 2D de posição de textos e ícone
```
por:
```md
- `TextPositionEditor.tsx` — Editor 2D SVG de posição de textos e ícone, com pointer/touch, nudge por setas e tamanhos reais do build
```

Na seção de regras, acrescente:
```md
- O editor usa o contorno real da placa (incluindo `custom`), os limites reais dos conteúdos (`contentItems`) e fecha por Escape, clique no fundo ou Concluir
```

### Step 2: `docs/frontend/studio.md`

No bullet **Topo de Bolo**, troque:
```md
Textos e ícone são posicionados livremente pelo editor 2D:
```
por:
```md
Textos e ícone são posicionados livremente por um editor 2D SVG (contorno real da placa, tamanhos reais dos conteúdos, arraste pointer/touch e nudge por setas):
```

### Step 3: Commit

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/AGENTS.md docs/frontend/studio.md
git commit -m "docs(topo-bolo): documenta o editor SVG de posicionamento"
```

---

## Task 4: Verificação final

### Step 1: Suíte completa

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
