# Topo de Bolo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar ferramenta de topo de bolo para o Studio 3D com texto personalizado, upload de ícone SVG e pé integrado.

**Architecture:** Ferramenta segue padrão das existentes (suporte-bolo, suporte-foto): schema Zod + build function + hook de estado + preview R3F + painel Amplify UI. Geometria gerada com Three.js (ExtrudeGeometry, TextGeometry, SVGLoader). Estado local com useReducer + debounce de 200ms.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, Zod, Amplify UI, TailwindCSS 4

---

## Task 1: Schema e Tipos

**Files:**
- Create: `src/features/studio/tools/confeitaria/topo-bolo/schema.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts
import { describe, it, expect } from 'vitest'
import { cakeTopperParamsSchema, defaultCakeTopperParams, PLA_COLORS } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

describe('cakeTopperParamsSchema', () => {
  it('validates default params', () => {
    const result = cakeTopperParamsSchema.safeParse(defaultCakeTopperParams)
    expect(result.success).toBe(true)
  })

  it('rejects invalid text (empty)', () => {
    const invalid = { ...defaultCakeTopperParams, text: '' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects text longer than 40 chars', () => {
    const invalid = { ...defaultCakeTopperParams, text: 'a'.repeat(41) }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects width out of range', () => {
    const invalid = { ...defaultCakeTopperParams, width: 40 }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects invalid shape', () => {
    const invalid = { ...defaultCakeTopperParams, shape: 'triangle' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects invalid baseColor', () => {
    const invalid = { ...defaultCakeTopperParams, baseColor: '#000000' }
    const result = cakeTopperParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe('PLA_COLORS', () => {
  it('has at least 10 colors', () => {
    expect(PLA_COLORS.length).toBeGreaterThanOrEqual(10)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/confeitaria/topo-bolo/schema.ts
import { z } from 'zod'

// Cores PLA disponíveis (reutilizando do cartao-visita)
export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

// Constantes fixas
export const LEG_DEPTH = 3
export const LEG_BOTTOM_WIDTH = 8
export const BORDER_RADIUS = 3

// Schema do topo de bolo
export const cakeTopperParamsSchema = z.object({
  productType: z.literal('cake-topper'),
  text: z.string().min(1).max(40),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(8).max(20),
  shape: z.enum(['circle', 'rectangle', 'oval']),
  width: z.number().min(50).max(120),
  height: z.number().min(30).max(80),
  thickness: z.number().min(2).max(4),
  svgIcon: z.string().nullable(),
  iconPosition: z.enum(['above', 'left', 'right']),
  iconScale: z.number().min(0.5).max(2.0),
  legHeight: z.number().min(30).max(60),
  legWidth: z.number().min(3).max(8),
  baseColor: z.enum(PLA_COLORS),
  textColor: z.enum(PLA_COLORS),
})

export type CakeTopperParams = z.infer<typeof cakeTopperParamsSchema>
export type Shape = CakeTopperParams['shape']
export type IconPosition = CakeTopperParams['iconPosition']

// Valores padrão
export const defaultCakeTopperParams: CakeTopperParams = {
  productType: 'cake-topper',
  text: 'Feliz Aniversário',
  fontStyle: 'bold',
  fontSize: 12,
  shape: 'circle',
  width: 80,
  height: 50,
  thickness: 3,
  svgIcon: null,
  iconPosition: 'above',
  iconScale: 1.0,
  legHeight: 40,
  legWidth: 5,
  baseColor: '#14b8a6',
  textColor: '#f5f5f5',
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/schema.ts tests/features/studio/tools/confeitaria/topo-bolo/schema.test.ts
git commit -m "feat: add cake topper schema with Zod validation"
```

---

## Task 2: Build - Placa (Plate)

**Files:**
- Create: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
import { describe, it, expect } from 'vitest'
import { buildCakeTopper } from '@/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper'
import { defaultCakeTopperParams } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

describe('buildCakeTopper - plate', () => {
  it('builds circle plate', () => {
    const params = { ...defaultCakeTopperParams, shape: 'circle' as const }
    const result = buildCakeTopper({ params, font: null })
    expect(result.plate).toBeDefined()
    expect(result.plate.attributes.position).toBeDefined()
  })

  it('builds rectangle plate', () => {
    const params = { ...defaultCakeTopperParams, shape: 'rectangle' as const }
    const result = buildCakeTopper({ params, font: null })
    expect(result.plate).toBeDefined()
  })

  it('builds oval plate', () => {
    const params = { ...defaultCakeTopperParams, shape: 'oval' as const }
    const result = buildCakeTopper({ params, font: null })
    expect(result.plate).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts
import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { CakeTopperParams, Shape as ShapeType } from './schema'
import { BORDER_RADIUS } from './schema'

export interface BuildCakeTopperInput {
  params: CakeTopperParams
  font: any | null // Font type from three.js
}

export interface BuildCakeTopperResult {
  plate: BufferGeometry
  text: BufferGeometry | null
  icon: BufferGeometry | null
  leg: BufferGeometry
}

// Criar forma circular
function createCircleShape(radius: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

// Criar forma retangular com cantos arredondados
function createRectangleShape(width: number, height: number): Shape {
  const shape = new Shape()
  const r = BORDER_RADIUS
  const hw = width / 2
  const hh = height / 2

  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r)
  shape.lineTo(hw, hh - r)
  shape.quadraticCurveTo(hw, hh, hw - r, hh)
  shape.lineTo(-hw + r, hh)
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r)
  shape.lineTo(-hw, -hh + r)
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh)

  return shape
}

// Criar forma oval (elipse)
function createOvalShape(width: number, height: number): Shape {
  const shape = new Shape()
  const rx = width / 2
  const ry = height / 2

  shape.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0)
  return shape
}

// Construir placa baseado no formato
function buildPlate(params: CakeTopperParams): BufferGeometry {
  let shape: Shape

  switch (params.shape) {
    case 'circle':
      shape = createCircleShape(params.width / 2)
      break
    case 'rectangle':
      shape = createRectangleShape(params.width, params.height)
      break
    case 'oval':
      shape = createOvalShape(params.width, params.height)
      break
  }

  const geometry = new ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 2,
  })

  // Centralizar
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  geometry.translate(-cx, -cy, 0)

  return geometry
}

// Função principal
export function buildCakeTopper({ params, font }: BuildCakeTopperInput): BuildCakeTopperResult {
  const plate = buildPlate(params)

  // TODO: Implementar text, icon, leg
  const text = null
  const icon = null
  const leg = null as any

  return { plate, text, icon, leg }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
git commit -m "feat: implement cake topper plate geometry (circle, rectangle, oval)"
```

---

## Task 3: Build - Pé (Leg)

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Modify: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`

**Step 1: Write the failing test**

```typescript
// Adicionar ao arquivo de teste existente
describe('buildCakeTopper - leg', () => {
  it('builds trapezoidal leg', () => {
    const params = { ...defaultCakeTopperParams }
    const result = buildCakeTopper({ params, font: null })
    expect(result.leg).toBeDefined()
    expect(result.leg.attributes.position).toBeDefined()
  })

  it('leg is positioned below plate', () => {
    const params = { ...defaultCakeTopperParams, legHeight: 40 }
    const result = buildCakeTopper({ params, font: null })
    result.leg.computeBoundingBox()
    const bb = result.leg.boundingBox!
    expect(bb.max.z).toBeCloseTo(0, 1)
    expect(bb.min.z).toBeCloseTo(-40, 1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
Expected: FAIL (leg is null)

**Step 3: Write minimal implementation**

```typescript
// Adicionar ao buildCakeTopper.ts
import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { CakeTopperParams } from './schema'
import { BORDER_RADIUS, LEG_BOTTOM_WIDTH, LEG_DEPTH } from './schema'

// ... (código existente de buildPlate)

// Construir pé trapezoidal
function buildLeg(params: CakeTopperParams): BufferGeometry {
  const shape = new Shape()
  const topWidth = params.legWidth
  const bottomWidth = LEG_BOTTOM_WIDTH
  const height = params.legHeight

  // Forma trapezoidal (mais largo na base)
  shape.moveTo(-bottomWidth / 2, 0)
  shape.lineTo(bottomWidth / 2, 0)
  shape.lineTo(topWidth / 2, height)
  shape.lineTo(-topWidth / 2, height)
  shape.closePath()

  const geometry = new ExtrudeGeometry(shape, {
    depth: LEG_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 1,
  })

  // Centralizar no eixo X e posicionar abaixo da placa (Z negativo)
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  geometry.translate(-cx, 0, -height)

  return geometry
}

// Atualizar função principal
export function buildCakeTopper({ params, font }: BuildCakeTopperInput): BuildCakeTopperResult {
  const plate = buildPlate(params)
  const leg = buildLeg(params)

  // TODO: Implementar text, icon
  const text = null
  const icon = null

  return { plate, text, icon, leg }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
git commit -m "feat: implement cake topper leg geometry (trapezoidal)"
```

---

## Task 4: Build - Texto (Text)

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Modify: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`

**Step 1: Write the failing test**

```typescript
// Adicionar ao arquivo de teste existente
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'

describe('buildCakeTopper - text', () => {
  it('builds text geometry when font is provided', () => {
    const params = { ...defaultCakeTopperParams, text: 'Teste' }
    const mockFont = new Font()
    const result = buildCakeTopper({ params, font: mockFont })
    expect(result.text).toBeDefined()
    expect(result.text).not.toBeNull()
  })

  it('returns null text when font is null', () => {
    const params = { ...defaultCakeTopperParams }
    const result = buildCakeTopper({ params, font: null })
    expect(result.text).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
Expected: FAIL (text is null)

**Step 3: Write minimal implementation**

```typescript
// Adicionar ao buildCakeTopper.ts
import { type BufferGeometry, ExtrudeGeometry, Shape, TextGeometry, Font } from 'three'
import type { CakeTopperParams } from './schema'
import { BORDER_RADIUS, LEG_BOTTOM_WIDTH, LEG_DEPTH } from './schema'

// ... (código existente de buildPlate e buildLeg)

// Construir texto em relevo
function buildText(params: CakeTopperParams, font: Font | null): BufferGeometry | null {
  if (!font) return null

  const textGeometry = new TextGeometry(params.text, {
    font: font,
    size: params.fontSize,
    depth: 1, // Relevo de 1mm
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  })

  // Centralizar texto
  textGeometry.computeBoundingBox()
  const bb = textGeometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  textGeometry.translate(-cx, -cy, params.thickness) // Posicionar sobre a placa

  return textGeometry
}

// Atualizar função principal
export function buildCakeTopper({ params, font }: BuildCakeTopperInput): BuildCakeTopperResult {
  const plate = buildPlate(params)
  const leg = buildLeg(params)
  const text = buildText(params, font)

  // TODO: Implementar icon
  const icon = null

  return { plate, text, icon, leg }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
git commit -m "feat: implement cake topper text geometry with font loading"
```

---

## Task 5: Build - Ícone SVG

**Files:**
- Modify: `src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts`
- Modify: `tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`

**Step 1: Write the failing test**

```typescript
// Adicionar ao arquivo de teste existente
describe('buildCakeTopper - icon', () => {
  it('builds icon from SVG when provided', () => {
    const svgString = '<svg><path d="M0,0 L10,0 L10,10 L0,10 Z"/></svg>'
    const params = { ...defaultCakeTopperParams, svgIcon: svgString }
    const result = buildCakeTopper({ params, font: null })
    expect(result.icon).toBeDefined()
    expect(result.icon).not.toBeNull()
  })

  it('returns null icon when svgIcon is null', () => {
    const params = { ...defaultCakeTopperParams, svgIcon: null }
    const result = buildCakeTopper({ params, font: null })
    expect(result.icon).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
Expected: FAIL (icon is null)

**Step 3: Write minimal implementation**

```typescript
// Adicionar ao buildCakeTopper.ts
import { type BufferGeometry, ExtrudeGeometry, Shape, TextGeometry, Font } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { CakeTopperParams } from './schema'
import { BORDER_RADIUS, LEG_BOTTOM_WIDTH, LEG_DEPTH } from './schema'

// ... (código existente de buildPlate, buildLeg, buildText)

// Construir ícone a partir de SVG
function buildIcon(params: CakeTopperParams): BufferGeometry | null {
  if (!params.svgIcon) return null

  const loader = new SVGLoader()
  const svgData = loader.parse(params.svgIcon)

  const shapes: Shape[] = []
  const geometries: BufferGeometry[] = []

  // Converter paths do SVG em shapes
  for (const path of svgData.paths) {
    const pathShapes = path.toShapes(true)
    shapes.push(...pathShapes)
  }

  if (shapes.length === 0) return null

  // Extrudar cada shape
  for (const shape of shapes) {
    const geometry = new ExtrudeGeometry(shape, {
      depth: params.thickness,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 1,
    })
    geometries.push(geometry)
  }

  // Unir todas as geometrias
  let iconGeometry = mergeGeometries(geometries)
  if (!iconGeometry) return null

  // Limpar geometrias individuais
  geometries.forEach(g => g.dispose())

  // Normalizar bounding box e aplicar escala
  iconGeometry.computeBoundingBox()
  const bb = iconGeometry.boundingBox!
  const sizeX = bb.max.x - bb.min.x
  const sizeY = bb.max.y - bb.min.y
  const maxSize = Math.max(sizeX, sizeY)
  const scale = (params.fontSize * 2 * params.iconScale) / maxSize

  iconGeometry.scale(scale, scale, 1)

  // Centralizar
  iconGeometry.computeBoundingBox()
  const bb2 = iconGeometry.boundingBox!
  const cx = (bb2.min.x + bb2.max.x) / 2
  const cy = (bb2.min.y + bb2.max.y) / 2
  iconGeometry.translate(-cx, -cy, 0)

  // Posicionar conforme iconPosition
  const textHeight = params.fontSize
  const iconHeight = (bb2.max.y - bb2.min.y)

  switch (params.iconPosition) {
    case 'above':
      iconGeometry.translate(0, textHeight / 2 + iconHeight / 2 + 2, params.thickness)
      break
    case 'left':
      iconGeometry.translate(-params.width / 2 - iconHeight / 2 - 2, 0, params.thickness)
      break
    case 'right':
      iconGeometry.translate(params.width / 2 + iconHeight / 2 + 2, 0, params.thickness)
      break
  }

  return iconGeometry
}

// Atualizar função principal
export function buildCakeTopper({ params, font }: BuildCakeTopperInput): BuildCakeTopperResult {
  const plate = buildPlate(params)
  const leg = buildLeg(params)
  const text = buildText(params, font)
  const icon = buildIcon(params)

  return { plate, text, icon, leg }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts`
Expected: PASS (9 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.ts tests/features/studio/tools/confeitaria/topo-bolo/buildCakeTopper.test.ts
git commit -m "feat: implement cake topper icon geometry from SVG upload"
```

---

## Task 6: Hook de Estado

**Files:**
- Create: `src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts`
- Test: `tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCakeTopper } from '@/features/studio/tools/confeitaria/topo-bolo/useCakeTopper'
import { defaultCakeTopperParams } from '@/features/studio/tools/confeitaria/topo-bolo/schema'

// Mock FontLoader
vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((url, onLoad) => {
      onLoad({ type: 'font' })
    }),
  })),
  Font: vi.fn(),
}))

describe('useCakeTopper', () => {
  it('returns default params initially', () => {
    const { result } = renderHook(() => useCakeTopper())
    expect(result.current.params).toEqual(defaultCakeTopperParams)
  })

  it('updates param correctly', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => {
      result.current.updateParam('text', 'Novo Texto')
    })
    expect(result.current.params.text).toBe('Novo Texto')
  })

  it('clamps numeric values', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => {
      result.current.updateParam('width', 200) // Acima do max (120)
    })
    expect(result.current.params.width).toBe(120)
  })

  it('resets to default', () => {
    const { result } = renderHook(() => useCakeTopper())
    act(() => {
      result.current.updateParam('text', 'Teste')
      result.current.reset()
    })
    expect(result.current.params.text).toBe(defaultCakeTopperParams.text)
  })

  it('sets SVG icon', () => {
    const { result } = renderHook(() => useCakeTopper())
    const svg = '<svg><path d="M0,0"/></svg>'
    act(() => {
      result.current.setSvgIcon(svg)
    })
    expect(result.current.params.svgIcon).toBe(svg)
  })

  it('returns dimensions', () => {
    const { result } = renderHook(() => useCakeTopper())
    expect(result.current.dimensions).toHaveProperty('width')
    expect(result.current.dimensions).toHaveProperty('height')
    expect(result.current.dimensions).toHaveProperty('depth')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { defaultCakeTopperParams, cakeTopperParamsSchema, type CakeTopperParams } from './schema'
import { buildCakeTopper, type BuildCakeTopperResult } from './buildCakeTopper'
import { fontUrls } from '../chaveiro/fonts'

type CakeTopperAction =
  | { type: 'update'; key: keyof CakeTopperParams; value: number | string | boolean | null }
  | { type: 'setSvg'; svg: string | null }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  fontSize: { min: 8, max: 20 },
  width: { min: 50, max: 120 },
  height: { min: 30, max: 80 },
  thickness: { min: 2, max: 4 },
  iconScale: { min: 0.5, max: 2.0 },
  legHeight: { min: 30, max: 60 },
  legWidth: { min: 3, max: 8 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function cakeTopperReducer(state: CakeTopperParams, action: CakeTopperAction): CakeTopperParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = cakeTopperParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'setSvg': {
      const next = { ...state, svgIcon: action.svg }
      const parsed = cakeTopperParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultCakeTopperParams
  }
}

export function useCakeTopper() {
  const [params, dispatch] = useReducer(cakeTopperReducer, defaultCakeTopperParams)
  const [geometry, setGeometry] = useState<BuildCakeTopperResult | null>(null)
  const [font, setFont] = useState<Font | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Carregar fonte
  useEffect(() => {
    const loader = new FontLoader()
    const fontStyle = params.fontStyle
    const url = fontUrls[fontStyle] || fontUrls.bold

    loader.load(url, (loadedFont) => {
      setFont(loadedFont)
    })
  }, [params.fontStyle])

  // Debounce para rebuild da geometria
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.plate.dispose()
        prev?.text?.dispose()
        prev?.icon?.dispose()
        prev?.leg.dispose()
        return buildCakeTopper({ params, font })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [params, font])

  const updateParam = useCallback((key: keyof CakeTopperParams, value: number | string | boolean | null) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const setSvgIcon = useCallback((svg: string | null) => {
    dispatch({ type: 'setSvg', svg })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    width: params.width,
    height: params.height + params.legHeight,
    depth: params.thickness,
  }), [params.width, params.height, params.legHeight, params.thickness])

  const cameraPosition = useMemo((): [number, number, number] => {
    const totalHeight = params.height + params.legHeight
    const distance = Math.max(params.width, totalHeight) * 2
    return [0, 0, distance]
  }, [params.width, params.height, params.legHeight])

  return { params, geometry, dimensions, cameraPosition, updateParam, setSvgIcon, reset }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.ts tests/features/studio/tools/confeitaria/topo-bolo/useCakeTopper.test.ts
git commit -m "feat: implement cake topper state hook with font loading and debounce"
```

---

## Task 7: Preview R3F

**Files:**
- Create: `src/features/studio/tools/confeitaria/topo-bolo/CakeTopperPreview.tsx`

**Step 1: Write component**

```typescript
// src/features/studio/tools/confeitaria/topo-bolo/CakeTopperPreview.tsx
import type { BuildCakeTopperResult } from './buildCakeTopper'

interface CakeTopperPreviewProps {
  geometry: BuildCakeTopperResult | null
  baseColor: string
  textColor: string
}

export function CakeTopperPreview({ geometry, baseColor, textColor }: CakeTopperPreviewProps) {
  if (!geometry) return null

  return (
    <group>
      <mesh geometry={geometry.plate} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.text && (
        <mesh geometry={geometry.text} castShadow receiveShadow>
          <meshStandardMaterial color={textColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
      {geometry.icon && (
        <mesh geometry={geometry.icon} castShadow receiveShadow>
          <meshStandardMaterial color={textColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
      <mesh geometry={geometry.leg} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/CakeTopperPreview.tsx
git commit -m "feat: implement cake topper R3F preview component"
```

---

## Task 8: Painel de Parâmetros

**Files:**
- Create: `src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx`

**Step 1: Write component**

```typescript
// src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx
import { useRef } from 'react'
import {
  Accordion,
  Button,
  Flex,
  Heading,
  SelectField,
  SliderField,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react'
import { type CakeTopperParams, PLA_COLORS } from './schema'

interface StudioPanelProps {
  params: CakeTopperParams
  onUpdateParam: (key: keyof CakeTopperParams, value: number | string | boolean | null) => void
  onSetSvgIcon: (svg: string | null) => void
  onReset: () => void
}

function ColorSwatches({
  colors,
  selected,
  onSelect,
}: {
  colors: readonly string[]
  selected: string
  onSelect: (color: string) => void
}) {
  return (
    <Flex direction="row" gap="xs" wrap="wrap">
      {colors.map((color) => (
        <Button
          key={color}
          size="small"
          aria-label={color}
          aria-pressed={color === selected}
          onClick={() => onSelect(color)}
          className="h-7 w-7 rounded-full p-0"
          style={{ backgroundColor: color, border: color === selected ? '2px solid #000' : '2px solid transparent' }}
        />
      ))}
    </Flex>
  )
}

export function StudioPanel({
  params,
  onUpdateParam,
  onSetSvgIcon,
  onReset,
}: StudioPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const svgContent = e.target?.result as string
      onSetSvgIcon(svgContent)
    }
    reader.readAsText(file)
  }

  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Topo de Bolo
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="texto">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Texto
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <TextField
                label="Conteúdo"
                value={params.text}
                maxLength={40}
                onChange={(e) => onUpdateParam('text', e.target.value)}
              />

              <SelectField
                label="Estilo da fonte"
                value={params.fontStyle}
                onChange={(e) => onUpdateParam('fontStyle', e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="bold">Negrito</option>
                <option value="serif">Serif</option>
              </SelectField>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Tamanho</Text>
                <Text fontSize="xs" color="font.secondary">{params.fontSize} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Tamanho da fonte"
                min={8} max={20} step={1}
                value={params.fontSize}
                onChange={(value) => onUpdateParam('fontSize', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="formato">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Formato
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Forma"
                value={params.shape}
                onChange={(e) => onUpdateParam('shape', e.target.value)}
              >
                <option value="circle">Circular</option>
                <option value="rectangle">Retangular</option>
                <option value="oval">Oval</option>
              </SelectField>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura</Text>
                <Text fontSize="xs" color="font.secondary">{params.width} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura"
                min={50} max={120} step={5}
                value={params.width}
                onChange={(value) => onUpdateParam('width', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.height} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura"
                min={30} max={80} step={5}
                value={params.height}
                onChange={(value) => onUpdateParam('height', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Espessura</Text>
                <Text fontSize="xs" color="font.secondary">{params.thickness} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Espessura"
                min={2} max={4} step={0.5}
                value={params.thickness}
                onChange={(value) => onUpdateParam('thickness', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="icone">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Ícone SVG
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />

              {!params.svgIcon ? (
                <Button
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload SVG
                </Button>
              ) : (
                <>
                  <Text fontSize="xs" color="font.secondary">
                    Ícone carregado
                  </Text>
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => onSetSvgIcon(null)}
                  >
                    Remover ícone
                  </Button>
                </>
              )}

              <SelectField
                label="Posição"
                value={params.iconPosition}
                onChange={(e) => onUpdateParam('iconPosition', e.target.value)}
                isDisabled={!params.svgIcon}
              >
                <option value="above">Acima</option>
                <option value="left">Esquerda</option>
                <option value="right">Direita</option>
              </SelectField>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Escala</Text>
                <Text fontSize="xs" color="font.secondary">{params.iconScale.toFixed(1)}x</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Escala do ícone"
                min={0.5} max={2.0} step={0.1}
                value={params.iconScale}
                isDisabled={!params.svgIcon}
                onChange={(value) => onUpdateParam('iconScale', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="suporte">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Suporte (Pé)
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.legHeight} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura do pé"
                min={30} max={60} step={5}
                value={params.legHeight}
                onChange={(value) => onUpdateParam('legHeight', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura</Text>
                <Text fontSize="xs" color="font.secondary">{params.legWidth} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura do pé"
                min={3} max={8} step={0.5}
                value={params.legWidth}
                onChange={(value) => onUpdateParam('legWidth', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="aparencia">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Aparência
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.tertiary">
                Cor da placa
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.baseColor}
                onSelect={(color) => onUpdateParam('baseColor', color)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Cor do texto/ícone
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.textColor}
                onSelect={(color) => onUpdateParam('textColor', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/studio/tools/confeitaria/topo-bolo/StudioPanel.tsx
git commit -m "feat: implement cake topper parameter panel with 5 accordion sections"
```

---

## Task 9: Integração - ToolSelector

**Files:**
- Modify: `src/features/studio/components/ToolSelector.tsx`

**Step 1: Add tool to selector**

```typescript
// Adicionar ao ToolSelector.tsx
export type ToolId = 'chaveiro' | 'cartao-visita' | 'suporte-bolo' | 'suporte-foto' | 'topo-bolo'

const TOOLS = [
  // ... ferramentas existentes
  {
    id: 'topo-bolo',
    name: 'Topo de Bolo',
    category: 'Confeitaria',
    description: 'Toppers decorativos com texto e ícones SVG',
    icon: '🎂',
  },
]
```

**Step 2: Commit**

```bash
git add src/features/studio/components/ToolSelector.tsx
git commit -m "feat: add cake topper tool to tool selector"
```

---

## Task 10: Integração - StudioPage

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`

**Step 1: Add lazy imports**

```typescript
// Adicionar ao StudioPage.tsx
import { useCakeTopper } from './tools/confeitaria/topo-bolo/useCakeTopper'

const TopoBoloTool = lazy(() =>
  import('./tools/confeitaria/topo-bolo/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const TopoBoloPreview = lazy(() =>
  import('./tools/confeitaria/topo-bolo/CakeTopperPreview').then((m) => ({
    default: m.CakeTopperPreview,
  })),
)
```

**Step 2: Add wrapper component**

```typescript
function TopoBoloToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const {
    params,
    geometry,
    dimensions,
    cameraPosition,
    updateParam,
    setSvgIcon,
    reset,
  } = useCakeTopper()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    // TODO: implement cake topper STL export
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <TopoBoloTool
            params={params}
            onUpdateParam={updateParam}
            onSetSvgIcon={setSvgIcon}
            onReset={reset}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
          cameraPosition={cameraPosition}
        >
          <Suspense fallback={null}>
            <TopoBoloPreview
              geometry={geometry}
              baseColor={params.baseColor}
              textColor={params.textColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}
```

**Step 3: Add to render logic**

```typescript
// Adicionar ao StudioPage
{activeTool === 'topo-bolo' && (
  <TopoBoloToolWrapper onBack={() => setActiveTool(null)} />
)}
```

**Step 4: Commit**

```bash
git add src/features/studio/StudioPage.tsx
git commit -m "feat: integrate cake topper tool into studio page"
```

---

## Task 11: Documentação

**Files:**
- Modify: `docs/frontend/studio.md`

**Step 1: Add tool documentation**

```markdown
## Ferramentas

### Topo de Bolo

Ferramenta para gerar toppers decorativos para bolo com texto personalizado e ícones SVG.

**Parâmetros:**
- Texto: conteúdo, estilo da fonte, tamanho
- Formato: circular, retangular, oval
- Dimensões: largura (50-120mm), altura (30-80mm), espessura (2-4mm)
- Ícone SVG: upload de arquivo, posição (acima/esquerda/direita), escala
- Suporte: altura do pé (30-60mm), largura (3-8mm)
- Aparência: cor da placa, cor do texto/ícone

**Arquitetura:**
- Schema Zod com validação
- Build com Three.js (ExtrudeGeometry, TextGeometry, SVGLoader)
- Hook de estado com debounce de 200ms
- Preview R3F com 4 meshes (placa, texto, ícone, pé)
```

**Step 2: Commit**

```bash
git add docs/frontend/studio.md
git commit -m "docs: add cake topper tool documentation"
```

---

## Task 12: Testes Finais e Validação

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors

**Step 4: Run build**

Run: `npm run build`
Expected: Build successful

**Step 5: Manual testing**

- Abrir aplicação em `http://localhost:5173`
- Navegar até Studio
- Selecionar ferramenta "Topo de Bolo"
- Testar upload de SVG
- Testar todos os parâmetros
- Verificar preview 3D
- Testar responsividade (mobile/tablet/desktop)

**Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete cake topper tool implementation"
```

---

## Resumo

**Total de tarefas:** 12  
**Commits esperados:** 12  
**Tempo estimado:** 4-6 horas

**Arquivos criados:**
- `schema.ts`
- `buildCakeTopper.ts`
- `useCakeTopper.ts`
- `CakeTopperPreview.tsx`
- `StudioPanel.tsx`
- Testes para schema, build e hook

**Arquivos modificados:**
- `ToolSelector.tsx`
- `StudioPage.tsx`
- `docs/frontend/studio.md`

**Próximos passos após implementação:**
- Implementar export STL
- Adicionar mais formatos (corações, estrelas)
- Melhorar vectorização de SVGs complexos
