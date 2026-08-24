# Editor 2D viewBox + movimento livre — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir o viewBox do editor 2D para mostrar toda a base e permitir movimento livre do texto (X e Y) dentro da área válida.

**Architecture:** viewBox calculado do bounding box real da base shape; drag sem snap automático, apenas clamp para área válida.

**Tech Stack:** React, SVG, three.js Shape.

---

### Task 1: viewBox dinâmico + movimento livre

**Files:**
- Modify: `src/features/studio/components/TextPositionEditor.tsx`
- Test: `tests/features/studio/components/TextPositionEditor.test.tsx`

**Step 1: Calcular viewBox do bounding box real**

Substituir o cálculo de viewBox:

```ts
// Calcular bounding box da base shape
const points = baseShape.getPoints(64)
const xs = points.map(p => p.x)
const ys = points.map(p => p.y)
const minX = Math.min(...xs) - 5
const maxX = Math.max(...xs) + 5
const minY = Math.min(...ys) - 5
const maxY = Math.max(...ys) + 5
const vbWidth = maxX - minX
const vbHeight = maxY - minY
```

**Step 2: Remover snap do pointerUp**

No `onUp` handler, substituir:
```ts
// ANTES:
const snapped = snapTextToSupport(...)
onMoveTextRef.current(drag.id, snapped.x, snapped.y)

// DEPOIS:
const clampedX = clamp(pos.x, minX + TEXT_BORDER_MIN, maxX - TEXT_BORDER_MIN - item.width)
const clampedY = clamp(pos.y, minY + TEXT_BORDER_MIN + item.height, maxY - TEXT_BORDER_MIN)
onMoveTextRef.current(drag.id, clampedX, clampedY)
```

**Step 3: Atualizar toSvg para usar o viewBox dinâmico**

```ts
const toSvg = useCallback((clientX: number, clientY: number) => {
  const svg = svgRef.current
  if (!svg) return { x: 0, y: 0 }
  const rect = svg.getBoundingClientRect()
  const scaleX = vbWidth / (rect.width || 1)
  const scaleY = vbHeight / (rect.height || 1)
  return {
    x: (clientX - rect.left) * scaleX + minX,
    y: -((clientY - rect.top) * scaleY + minY),
  }
}, [vbWidth, vbHeight, minX, minY])
```

**Step 4: Atualizar SVG viewBox e elementos**

```tsx
<svg viewBox={`${minX} ${-maxY} ${vbWidth} ${vbHeight}`} ...>
```

**Step 5: Atualizar área válida**

```tsx
<rect
  data-testid="editor-valid-area"
  x={minX + TEXT_BORDER_MIN}
  y={-(maxY - TEXT_BORDER_MIN)}
  width={vbWidth - TEXT_BORDER_MIN * 2}
  height={vbHeight - TEXT_BORDER_MIN * 2}
  ...
/>
```

**Step 6: Testar**

```bash
npm run lint && npm run typecheck && npm run test
```

**Step 7: Commit**

```bash
git add -A && git commit -m "fix: editor 2d — viewBox dinâmico e movimento livre"
```

---

## Verification final

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: todos os testes passam, viewBox mostra toda a base, texto move livremente.
