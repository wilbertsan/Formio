# Carimbo para Brigadeiro - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar ferramenta de carimbo paramétrico para marcar brigadeiros com texto, ícones SVG e relevo negativo/positivo.

**Architecture:** Seguir padrão do topo-bolo: schema Zod + build function + hook com debounce + painel Amplify UI + preview R3F. Reutilizar lógica de texto/SVG/fontes existente.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, Zod, Amplify UI, Vitest

**Design Doc:** `docs/plans/2026-09-01-carimbo-brigadeiro-design.md`

---

## Task 1: Schema e Validação

**Files:**
- Create: `src/features/studio/tools/confeitaria/carimbo-brigadeiro/schema.ts`
- Test: `tests/features/studio/tools/confeitaria/carimbo-brigadeiro/schema.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/confeitaria/carimbo-brigadeiro/schema.test.ts
import { describe, it, expect } from 'vitest'
import { stampParamsSchema, defaultStampParams } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/schema'

describe('stampParamsSchema', () => {
  it('validates default params', () => {
    const result = stampParamsSchema.safeParse(defaultStampParams)
    expect(result.success).toBe(true)
  })

  it('rejects diameter below 10mm', () => {
    const invalid = { ...defaultStampParams, diameter: 5 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects diameter above 30mm', () => {
    const invalid = { ...defaultStampParams, diameter: 35 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects height below 15mm', () => {
    const invalid = { ...defaultStampParams, height: 10 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects height above 25mm', () => {
    const invalid = { ...defaultStampParams, height: 30 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects text longer than 30 chars', () => {
    const invalid = { ...defaultStampParams, text: 'a'.repeat(31) }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects fontSize below 6mm', () => {
    const invalid = { ...defaultStampParams, fontSize: 5 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects fontSize above 15mm', () => {
    const invalid = { ...defaultStampParams, fontSize: 16 }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('validates reliefType as negative or positive', () => {
    const valid1 = { ...defaultStampParams, reliefType: 'negative' }
    const valid2 = { ...defaultStampParams, reliefType: 'positive' }
    expect(stampParamsSchema.safeParse(valid1).success).toBe(true)
    expect(stampParamsSchema.safeParse(valid2).success).toBe(true)
  })

  it('rejects invalid reliefType', () => {
    const invalid = { ...defaultStampParams, reliefType: 'invalid' }
    const result = stampParamsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/schema.test.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/confeitaria/carimbo-brigadeiro/schema.ts
import { z } from 'zod'

// Cores PLA disponíveis (reutilizando do topo-bolo)
export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

// Constantes fixas
export const RELIEF_DEPTH = 1
export const HANDLE_HEIGHT_RATIO = 0.6

// Schema do carimbo
export const stampParamsSchema = z.object({
  productType: z.literal('stamp'),
  text: z.string().min(1).max(30),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(6).max(15),
  diameter: z.number().min(10).max(30),
  height: z.number().min(15).max(25),
  reliefType: z.enum(['negative', 'positive']),
  svgIcon: z.string().nullable(),
  iconScale: z.number().min(0.5).max(2.0),
  baseColor: z.enum(PLA_COLORS),
  reliefColor: z.enum(PLA_COLORS),
})

export type StampParams = z.infer<typeof stampParamsSchema>
export type ReliefType = StampParams['reliefType']

// Valores padrão
export const defaultStampParams: StampParams = {
  productType: 'stamp',
  text: 'Parabéns',
  fontStyle: 'bold',
  fontSize: 10,
  diameter: 20,
  height: 20,
  reliefType: 'negative',
  svgIcon: null,
  iconScale: 1.0,
  baseColor: '#14b8a6',
  reliefColor: '#f5f5f5',
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/schema.test.ts
```

Expected: PASS (10 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/carimbo-brigadeiro/schema.ts tests/features/studio/tools/confeitaria/carimbo-brigadeiro/schema.test.ts
git commit -m "feat: add stamp schema with validation"
```

---

## Task 2: Build Function - Base e Cabo

**Files:**
- Create: `src/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.ts`
- Test: `tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
import { describe, it, expect } from 'vitest'
import { buildStamp } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp'
import { defaultStampParams } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/schema'

describe('buildStamp', () => {
  it('builds base geometry', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.base).toBeDefined()
    expect(result.base.attributes.position).toBeDefined()
  })

  it('builds handle geometry', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.handle).toBeDefined()
    expect(result.handle.attributes.position).toBeDefined()
  })

  it('returns null for text when font is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.text).toBeNull()
  })

  it('returns null for icon when svgIcon is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.icon).toBeNull()
  })

  it('base height is 40% of total height', () => {
    const params = { ...defaultStampParams, height: 20 }
    const result = buildStamp({ params, font: null })
    
    result.base.computeBoundingBox()
    const bb = result.base.boundingBox!
    const baseHeight = bb.max.z - bb.min.z
    
    expect(baseHeight).toBeCloseTo(8, 1) // 20 * 0.4 = 8mm
  })

  it('handle height is 60% of total height', () => {
    const params = { ...defaultStampParams, height: 20 }
    const result = buildStamp({ params, font: null })
    
    result.handle.computeBoundingBox()
    const bb = result.handle.boundingBox!
    const handleHeight = bb.max.z - bb.min.z
    
    expect(handleHeight).toBeCloseTo(12, 1) // 20 * 0.6 = 12mm
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.ts
import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { StampParams } from './schema'
import { HANDLE_HEIGHT_RATIO, RELIEF_DEPTH } from './schema'

export interface BuildStampInput {
  params: StampParams
  font: Font | null
}

export interface BuildStampResult {
  base: BufferGeometry
  handle: BufferGeometry
  text: BufferGeometry | null
  icon: BufferGeometry | null
}

function createCircleShape(radius: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

function buildBase(params: StampParams): BufferGeometry {
  const radius = params.diameter / 2
  const shape = createCircleShape(radius)
  const baseHeight = params.height * (1 - HANDLE_HEIGHT_RATIO)

  const geometry = new ExtrudeGeometry(shape, {
    depth: baseHeight,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
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

function buildHandle(params: StampParams): BufferGeometry {
  const handleRadius = params.diameter * 0.3
  const shape = createCircleShape(handleRadius)
  const handleHeight = params.height * HANDLE_HEIGHT_RATIO
  const baseHeight = params.height * (1 - HANDLE_HEIGHT_RATIO)

  const geometry = new ExtrudeGeometry(shape, {
    depth: handleHeight,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  })

  // Centralizar e posicionar acima da base
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  geometry.translate(-cx, -cy, baseHeight)

  return geometry
}

export function buildStamp({ params, font }: BuildStampInput): BuildStampResult {
  const base = buildBase(params)
  const handle = buildHandle(params)

  // TODO: Implementar texto e ícone nas próximas tasks

  return { base, handle, text: null, icon: null }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.ts tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
git commit -m "feat: implement stamp base and handle geometry"
```

---

## Task 3: Build Function - Texto

**Files:**
- Modify: `src/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.ts`
- Test: `tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts`

**Step 1: Write the failing test**

```typescript
// Adicionar ao arquivo de teste existente
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'

describe('buildStamp - text', () => {
  it('builds text geometry when font is provided', () => {
    const mockFont = new Font()
    const params = { ...defaultStampParams, text: 'Teste' }
    const result = buildStamp({ params, font: mockFont })
    
    expect(result.text).toBeDefined()
    expect(result.text).not.toBeNull()
  })

  it('returns null for text when font is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.text).toBeNull()
  })

  it('text depth is RELIEF_DEPTH (1mm)', () => {
    const mockFont = new Font()
    const result = buildStamp({ params: defaultStampParams, font: mockFont })
    
    if (result.text) {
      result.text.computeBoundingBox()
      const bb = result.text.boundingBox!
      const depth = bb.max.z - bb.min.z
      expect(depth).toBeCloseTo(1, 1)
    }
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
```

Expected: FAIL (text is always null)

**Step 3: Write minimal implementation**

```typescript
// Adicionar ao buildStamp.ts
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'

function buildText(params: StampParams, font: Font | null): BufferGeometry | null {
  if (!font) return null

  const textGeometry = new TextGeometry(params.text, {
    font: font,
    size: params.fontSize,
    depth: RELIEF_DEPTH,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  })

  // Centralizar texto na face inferior da base
  textGeometry.computeBoundingBox()
  const bb = textGeometry.boundingBox!
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  
  // Posicionar na face inferior (z = 0) com relevo negativo ou positivo
  const zOffset = params.reliefType === 'negative' ? -RELIEF_DEPTH : 0
  textGeometry.translate(-cx, -cy, zOffset)

  return textGeometry
}

// Atualizar buildStamp
export function buildStamp({ params, font }: BuildStampInput): BuildStampResult {
  const base = buildBase(params)
  const handle = buildHandle(params)
  const text = buildText(params, font)

  return { base, handle, text, icon: null }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
```

Expected: PASS (9 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.ts tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
git commit -m "feat: implement stamp text geometry with relief types"
```

---

## Task 4: Build Function - Ícone SVG

**Files:**
- Modify: `src/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.ts`
- Test: `tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts`

**Step 1: Write the failing test**

```typescript
// Adicionar ao arquivo de teste existente
describe('buildStamp - icon', () => {
  it('builds icon geometry when svgIcon is provided', () => {
    const svgString = '<svg><circle cx="10" cy="10" r="5"/></svg>'
    const params = { ...defaultStampParams, svgIcon: svgString }
    const result = buildStamp({ params, font: null })
    
    expect(result.icon).toBeDefined()
    expect(result.icon).not.toBeNull()
  })

  it('returns null for icon when svgIcon is null', () => {
    const result = buildStamp({ params: defaultStampParams, font: null })
    expect(result.icon).toBeNull()
  })

  it('icon is scaled by iconScale parameter', () => {
    const svgString = '<svg><circle cx="10" cy="10" r="5"/></svg>'
    const params1 = { ...defaultStampParams, svgIcon: svgString, iconScale: 1.0 }
    const params2 = { ...defaultStampParams, svgIcon: svgString, iconScale: 2.0 }
    
    const result1 = buildStamp({ params: params1, font: null })
    const result2 = buildStamp({ params: params2, font: null })
    
    if (result1.icon && result2.icon) {
      result1.icon.computeBoundingBox()
      result2.icon.computeBoundingBox()
      
      const size1 = result1.icon.boundingBox!.max.x - result1.icon.boundingBox!.min.x
      const size2 = result2.icon.boundingBox!.max.x - result2.icon.boundingBox!.min.x
      
      expect(size2).toBeGreaterThan(size1)
    }
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
```

Expected: FAIL (icon is always null)

**Step 3: Write minimal implementation**

```typescript
// Adicionar ao buildStamp.ts
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function buildIcon(params: StampParams): BufferGeometry | null {
  if (!params.svgIcon) return null

  const loader = new SVGLoader()
  const svgData = loader.parse(params.svgIcon)

  const shapes: Shape[] = []

  for (const path of svgData.paths) {
    const pathShapes = path.toShapes()
    shapes.push(...pathShapes)
  }

  if (shapes.length === 0) return null

  const geometries: BufferGeometry[] = []
  for (const shape of shapes) {
    const geometry = new ExtrudeGeometry(shape, {
      depth: RELIEF_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 1,
    })
    geometries.push(geometry)
  }

  const iconGeometry = mergeGeometries(geometries)
  if (!iconGeometry) return null

  geometries.forEach(g => g.dispose())

  // Escalar e centralizar
  iconGeometry.computeBoundingBox()
  const bb = iconGeometry.boundingBox!
  const sizeX = bb.max.x - bb.min.x
  const sizeY = bb.max.y - bb.min.y
  const maxSize = Math.max(sizeX, sizeY)
  const scale = (params.fontSize * 2 * params.iconScale) / maxSize

  iconGeometry.scale(scale, scale, 1)

  iconGeometry.computeBoundingBox()
  const bb2 = iconGeometry.boundingBox!
  const cx = (bb2.min.x + bb2.max.x) / 2
  const cy = (bb2.min.y + bb2.max.y) / 2
  
  // Posicionar na face inferior
  const zOffset = params.reliefType === 'negative' ? -RELIEF_DEPTH : 0
  iconGeometry.translate(-cx, -cy, zOffset)

  return iconGeometry
}

// Atualizar buildStamp
export function buildStamp({ params, font }: BuildStampInput): BuildStampResult {
  const base = buildBase(params)
  const handle = buildHandle(params)
  const text = buildText(params, font)
  const icon = buildIcon(params)

  return { base, handle, text, icon }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
```

Expected: PASS (12 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.ts tests/features/studio/tools/confeitaria/carimbo-brigadeiro/buildStamp.test.ts
git commit -m "feat: implement stamp icon geometry from SVG upload"
```

---

## Task 5: Hook de Estado

**Files:**
- Create: `src/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp.ts`
- Test: `tests/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStamp } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp'
import { defaultStampParams } from '@/features/studio/tools/confeitaria/carimbo-brigadeiro/schema'

describe('useStamp', () => {
  it('initializes with default params', () => {
    const { result } = renderHook(() => useStamp())
    expect(result.current.params).toEqual(defaultStampParams)
  })

  it('updates param correctly', () => {
    const { result } = renderHook(() => useStamp())
    
    act(() => {
      result.current.updateParam('diameter', 25)
    })
    
    expect(result.current.params.diameter).toBe(25)
  })

  it('clamps diameter to max 30mm', () => {
    const { result } = renderHook(() => useStamp())
    
    act(() => {
      result.current.updateParam('diameter', 35)
    })
    
    expect(result.current.params.diameter).toBe(30)
  })

  it('clamps diameter to min 10mm', () => {
    const { result } = renderHook(() => useStamp())
    
    act(() => {
      result.current.updateParam('diameter', 5)
    })
    
    expect(result.current.params.diameter).toBe(10)
  })

  it('resets to default params', () => {
    const { result } = renderHook(() => useStamp())
    
    act(() => {
      result.current.updateParam('diameter', 25)
    })
    
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.params).toEqual(defaultStampParams)
  })

  it('sets SVG icon', () => {
    const { result } = renderHook(() => useStamp())
    const svgString = '<svg><circle cx="10" cy="10" r="5"/></svg>'
    
    act(() => {
      result.current.setSvgIcon(svgString)
    })
    
    expect(result.current.params.svgIcon).toBe(svgString)
  })

  it('returns correct dimensions', () => {
    const { result } = renderHook(() => useStamp())
    
    expect(result.current.dimensions).toEqual({
      diameter: 20,
      height: 20,
    })
  })

  it('returns camera position based on diameter', () => {
    const { result } = renderHook(() => useStamp())
    
    expect(result.current.cameraPosition).toEqual([0, 0, 40]) // 20 * 2
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp.test.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp.ts
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { defaultStampParams, stampParamsSchema, type StampParams } from './schema'
import { buildStamp, type BuildStampResult } from './buildStamp'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'

type StampAction =
  | { type: 'update'; key: keyof StampParams; value: number | string | boolean | null }
  | { type: 'setSvg'; svg: string | null }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  fontSize: { min: 6, max: 15 },
  diameter: { min: 10, max: 30 },
  height: { min: 15, max: 25 },
  iconScale: { min: 0.5, max: 2.0 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function stampReducer(state: StampParams, action: StampAction): StampParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = stampParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'setSvg': {
      const next = { ...state, svgIcon: action.svg }
      const parsed = stampParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultStampParams
  }
}

export function useStamp() {
  const [params, dispatch] = useReducer(stampReducer, defaultStampParams)
  const [geometry, setGeometry] = useState<BuildStampResult | null>(null)
  const [font, setFont] = useState<Font | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const loader = new FontLoader()
    const fontStyle = params.fontStyle
    const url = fontUrls[fontStyle] || fontUrls.bold

    loader.load(url, (loadedFont) => {
      setFont(loadedFont)
    })
  }, [params.fontStyle])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.base.dispose()
        prev?.handle.dispose()
        prev?.text?.dispose()
        prev?.icon?.dispose()
        return buildStamp({ params, font })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [params, font])

  const updateParam = useCallback((key: keyof StampParams, value: number | string | boolean | null) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const setSvgIcon = useCallback((svg: string | null) => {
    dispatch({ type: 'setSvg', svg })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    diameter: params.diameter,
    height: params.height,
  }), [params.diameter, params.height])

  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = params.diameter * 2
    return [0, 0, distance]
  }, [params.diameter])

  return { params, geometry, dimensions, cameraPosition, updateParam, setSvgIcon, reset }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp.test.ts
```

Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp.ts tests/features/studio/tools/confeitaria/carimbo-brigadeiro/useStamp.test.ts
git commit -m "feat: implement stamp state hook with debounce and font loading"
```

---

## Task 6: Preview R3F

**Files:**
- Create: `src/features/studio/tools/confeitaria/carimbo-brigadeiro/StampPreview.tsx`

**Step 1: Write component**

```typescript
// src/features/studio/tools/confeitaria/carimbo-brigadeiro/StampPreview.tsx
import type { BuildStampResult } from './buildStamp'

interface StampPreviewProps {
  geometry: BuildStampResult | null
  baseColor: string
  reliefColor: string
}

export function StampPreview({ geometry, baseColor, reliefColor }: StampPreviewProps) {
  if (!geometry) return null

  return (
    <group>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={geometry.handle} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.text && (
        <mesh geometry={geometry.text} castShadow receiveShadow>
          <meshStandardMaterial color={reliefColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
      {geometry.icon && (
        <mesh geometry={geometry.icon} castShadow receiveShadow>
          <meshStandardMaterial color={reliefColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
    </group>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/studio/tools/confeitaria/carimbo-brigadeiro/StampPreview.tsx
git commit -m "feat: implement stamp R3F preview component"
```

---

## Task 7: Painel de Controle

**Files:**
- Create: `src/features/studio/tools/confeitaria/carimbo-brigadeiro/StudioPanel.tsx`

**Step 1: Write component**

```typescript
// src/features/studio/tools/confeitaria/carimbo-brigadeiro/StudioPanel.tsx
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
import { type StampParams, PLA_COLORS } from './schema'

interface StudioPanelProps {
  params: StampParams
  onUpdateParam: (key: keyof StampParams, value: number | string | boolean | null) => void
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
          Carimbo Brigadeiro
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
                maxLength={30}
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
                min={6} max={15} step={1}
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
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Diâmetro</Text>
                <Text fontSize="xs" color="font.secondary">{params.diameter} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Diâmetro"
                min={10} max={30} step={1}
                value={params.diameter}
                onChange={(value) => onUpdateParam('diameter', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.height} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura"
                min={15} max={25} step={1}
                value={params.height}
                onChange={(value) => onUpdateParam('height', value as number)}
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

        <Accordion.Item value="relevo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Relevo
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Tipo"
                value={params.reliefType}
                onChange={(e) => onUpdateParam('reliefType', e.target.value)}
              >
                <option value="negative">Negativo (afundado)</option>
                <option value="positive">Positivo (em relevo)</option>
              </SelectField>
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
                Cor da base
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.baseColor}
                onSelect={(color) => onUpdateParam('baseColor', color)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Cor do relevo
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.reliefColor}
                onSelect={(color) => onUpdateParam('reliefColor', color)}
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
git add src/features/studio/tools/confeitaria/carimbo-brigadeiro/StudioPanel.tsx
git commit -m "feat: implement stamp parameter panel with 5 accordion sections"
```

---

## Task 8: Integração no StudioPage

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`

**Step 1: Adicionar ao toolSelector**

Localizar o `toolSelector` no `StudioPage.tsx` e adicionar:

```typescript
{
  id: 'carimbo-brigadeiro',
  name: 'Carimbo Brigadeiro',
  category: 'confeitaria',
  icon: '🔖',
  component: lazy(() => import('./tools/confeitaria/carimbo-brigadeiro/StudioPanel')),
  preview: lazy(() => import('./tools/confeitaria/carimbo-brigadeiro/StampPreview')),
}
```

**Step 2: Commit**

```bash
git add src/features/studio/StudioPage.tsx
git commit -m "feat: integrate stamp tool into studio page"
```

---

## Task 9: Atualizar Documentação

**Files:**
- Modify: `docs/frontend/studio.md`

**Step 1: Adicionar seção sobre carimbo-brigadeiro**

Adicionar na tabela de ferramentas:

```markdown
| carimbo-brigadeiro | Carimbo para marcar brigadeiros com texto/ícone |
```

**Step 2: Commit**

```bash
git add docs/frontend/studio.md
git commit -m "docs: add stamp tool documentation"
```

---

## Task 10: Testes Finais e Validação

**Step 1: Executar todos os testes**

```bash
npm test
```

Expected: Todos os testes passando

**Step 2: Executar typecheck**

```bash
npm run typecheck
```

Expected: Sem erros de tipo

**Step 3: Executar lint**

```bash
npm run lint
```

Expected: Sem erros de lint

**Step 4: Executar build**

```bash
npm run build
```

Expected: Build bem-sucedido

**Step 5: Testar manualmente no browser**

1. Abrir aplicação em `/studio`
2. Selecionar "Carimbo Brigadeiro" no seletor de ferramentas
3. Testar ajustes de parâmetros (diâmetro, altura, texto, relevo)
4. Testar upload de SVG
5. Testar troca de cores
6. Verificar preview 3D atualiza corretamente

**Step 6: Commit final**

```bash
git add .
git commit -m "feat: complete stamp tool implementation"
```

---

## Checklist Final

- [ ] Schema com validação Zod
- [ ] Build function com base, cabo, texto e ícone
- [ ] Hook com debounce e font loading
- [ ] Preview R3F com materiais corretos
- [ ] Painel com 5 seções de accordion
- [ ] Integração no StudioPage
- [ ] Testes unitários passando
- [ ] Typecheck sem erros
- [ ] Lint sem erros
- [ ] Build bem-sucedido
- [ ] Documentação atualizada
- [ ] Teste manual no browser

---

## Comandos Úteis

```bash
# Executar testes específicos
npm test -- tests/features/studio/tools/confeitaria/carimbo-brigadeiro/

# Executar typecheck
npm run typecheck

# Executar lint
npm run lint

# Executar build
npm run build

# Executar aplicação em dev
npm run dev
```
