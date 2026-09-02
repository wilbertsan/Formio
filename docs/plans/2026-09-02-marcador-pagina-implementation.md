# Marcador de Página 3D - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar ferramenta de marcador de página 3D no Studio, permitindo criação de marcadores retangulares com texto personalizável e furo para fita.

**Architecture:** Abordagem minimalista com código próprio para marcador, reutilizando apenas funções utilitárias (fonts, textToGeometry). Hook useBookmark gerencia estado com useReducer + debounce. buildBookmark gera geometria Three.js com suporte a modos relevo/gravado.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, Zod, Amplify UI, Vitest

**Design Document:** `docs/plans/2026-09-02-marcador-pagina-design.md`

---

## Task 1: Schema Zod + Testes

**Files:**
- Create: `src/features/studio/tools/letreiros/marcador-pagina/schema.ts`
- Create: `tests/features/studio/tools/letreiros/marcador-pagina/schema.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/letreiros/marcador-pagina/schema.test.ts
import {
  defaultBookmarkParams,
  bookmarkParamsSchema,
  textItemSchema,
} from '@/features/studio/tools/letreiros/marcador-pagina/schema'

describe('bookmark schema', () => {
  it('defaults são válidos', () => {
    expect(bookmarkParamsSchema.parse(defaultBookmarkParams)).toEqual(defaultBookmarkParams)
  })

  it('aceita 1, 2 e 3 textos', () => {
    for (const count of [1, 2, 3]) {
      const texts = Array.from({ length: count }, (_, i) => ({
        ...defaultBookmarkParams.texts[0],
        id: `t${i}`,
      }))
      expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, texts }).success).toBe(true)
    }
  })

  it('rejeita 0 textos e 4 textos', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, texts: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, i) => ({ ...defaultBookmarkParams.texts[0], id: `t${i}` }))
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, texts: four }).success).toBe(false)
  })

  it('textItemSchema valida ranges corretamente', () => {
    const valid = defaultBookmarkParams.texts[0]
    expect(textItemSchema.parse(valid)).toEqual(valid)
    expect(textItemSchema.safeParse({ ...valid, content: '' }).success).toBe(false)
    expect(textItemSchema.safeParse({ ...valid, width: 3 }).success).toBe(false)
    expect(textItemSchema.safeParse({ ...valid, height: 25 }).success).toBe(false)
    expect(textItemSchema.safeParse({ ...valid, offsetX: 25 }).success).toBe(false)
  })

  it('length tem range 50-150', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, length: 49 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, length: 151 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, length: 120 }).success).toBe(true)
  })

  it('width tem range 30-50', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, width: 29 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, width: 51 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, width: 40 }).success).toBe(true)
  })

  it('thickness é literal 2', () => {
    expect(bookmarkParamsSchema.shape.thickness.value).toBe(2)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, thickness: 3 }).success).toBe(false)
  })

  it('holeDiameter tem range 3-8', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeDiameter: 2 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeDiameter: 9 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeDiameter: 5 }).success).toBe(true)
  })

  it('holeMargin tem range 5-15', () => {
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeMargin: 4 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeMargin: 16 }).success).toBe(false)
    expect(bookmarkParamsSchema.safeParse({ ...defaultBookmarkParams, holeMargin: 10 }).success).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/schema.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/letreiros/marcador-pagina/schema.ts
import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const textItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().trim().min(1).max(12),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  width: z.number().min(8).max(60),
  height: z.number().min(4).max(20),
  relief: z.number().min(0.4).max(2),
  proportional: z.boolean(),
  offsetX: z.number().min(-20).max(20),
  offsetY: z.number().min(-20).max(20),
})

export type TextItem = z.infer<typeof textItemSchema>

export const bookmarkParamsSchema = z.object({
  productType: z.literal('bookmark'),
  length: z.number().min(50).max(150),
  width: z.number().min(30).max(50),
  thickness: z.literal(2),
  holeDiameter: z.number().min(3).max(8),
  holeMargin: z.number().min(5).max(15),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  textMode: z.enum(['raised', 'engraved']),
  texts: z.array(textItemSchema).min(1).max(3),
})

export type BookmarkParams = z.infer<typeof bookmarkParamsSchema>
export type BookmarkTextMode = BookmarkParams['textMode']
export type FontStyle = TextItem['fontStyle']

const defaultText: TextItem = {
  id: 'text-1',
  content: 'Meu nome',
  fontStyle: 'bold',
  width: 40,
  height: 10,
  relief: 1,
  proportional: false,
  offsetX: 0,
  offsetY: 0,
}

export const defaultBookmarkParams: BookmarkParams = {
  productType: 'bookmark',
  length: 120,
  width: 40,
  thickness: 2,
  holeDiameter: 5,
  holeMargin: 10,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  textMode: 'raised',
  texts: [defaultText],
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'marcador'
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/schema.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/marcador-pagina/schema.ts tests/features/studio/tools/letreiros/marcador-pagina/schema.test.ts
git commit -m "feat: add bookmark schema with Zod validation"
```

---

## Task 2: Hook useBookmark + Testes

**Files:**
- Create: `src/features/studio/tools/letreiros/marcador-pagina/useBookmark.ts`
- Create: `tests/features/studio/tools/letreiros/marcador-pagina/useBookmark.test.tsx`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/letreiros/marcador-pagina/useBookmark.test.tsx
import * as THREE from 'three'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useBookmark } from '@/features/studio/tools/letreiros/marcador-pagina/useBookmark'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'

vi.mock('@/features/studio/tools/letreiros/marcador-pagina/buildBookmark', () => ({
  buildBookmark: vi.fn(() => ({
    base: new THREE.BufferGeometry(),
    text: new THREE.BufferGeometry(),
    textItems: [{ id: 'text-1', geometry: new THREE.BufferGeometry() }],
  })),
}))

vi.mock('@/features/studio/tools/letreiros/marcador-pagina/fonts', () => ({
  fontUrls: { normal: '/font-normal.json', bold: '/font-bold.json', serif: '/font-serif.json' },
}))

vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: class {
    load(_url: string, onLoad: (font: unknown) => void): void {
      onLoad({ glyphs: {} })
    }
  },
}))

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor() { super() }
  },
}))

describe('useBookmark', () => {
  it('inicia com 1 texto no default', () => {
    const { result } = renderHook(() => useBookmark())
    expect(result.current.params.texts).toHaveLength(1)
    expect(result.current.params.texts[0].content).toBe('Meu nome')
  })

  it('updateParam clampa valores da peça', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.updateParam('length', 40))
    expect(result.current.params.length).toBe(50)
  })

  it('reset restaura defaults', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.updateParam('length', 150))
    act(() => result.current.reset())
    expect(result.current.params.length).toBe(defaultBookmarkParams.length)
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('addText adiciona um segundo texto', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(2)
    expect(result.current.params.texts[1].content).toBe('Novo texto')
  })

  it('addText não adiciona além de 3', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.addText())
    act(() => result.current.addText())
    act(() => result.current.addText())
    expect(result.current.params.texts).toHaveLength(3)
  })

  it('removeText remove um texto', () => {
    const { result } = renderHook(() => useBookmark())
    act(() => result.current.addText())
    const id = result.current.params.texts[1].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('removeText não remove se só tem 1', () => {
    const { result } = renderHook(() => useBookmark())
    const id = result.current.params.texts[0].id
    act(() => result.current.removeText(id))
    expect(result.current.params.texts).toHaveLength(1)
  })

  it('updateText patcha o texto correto', () => {
    const { result } = renderHook(() => useBookmark())
    const id = result.current.params.texts[0].id
    act(() => result.current.updateText(id, { content: 'Novo nome', offsetX: 10 }))
    expect(result.current.params.texts[0].content).toBe('Novo nome')
    expect(result.current.params.texts[0].offsetX).toBe(10)
  })

  it('carrega fonte e gera geometria', async () => {
    const { result } = renderHook(() => useBookmark())
    await waitFor(() => expect(result.current.geometry).not.toBeNull())
    expect(result.current.geometry?.base).toBeDefined()
    expect(result.current.geometry?.text).toBeDefined()
  })

  it('dimensions inclui length, width e thickness', () => {
    const { result } = renderHook(() => useBookmark())
    expect(result.current.dimensions.length).toBe(defaultBookmarkParams.length)
    expect(result.current.dimensions.width).toBe(defaultBookmarkParams.width)
    expect(result.current.dimensions.thickness).toBe(defaultBookmarkParams.thickness)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/useBookmark.test.tsx`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/letreiros/marcador-pagina/useBookmark.ts
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from './fonts'
import { defaultBookmarkParams, bookmarkParamsSchema, textItemSchema, type BookmarkParams, type FontStyle, type TextItem } from './schema'
import { buildBookmark, type BuildBookmarkResult } from './buildBookmark'

const TEXT_ITEM_DEFAULTS = {
  content: 'Novo texto',
  fontStyle: 'bold' as const,
  width: 30,
  height: 8,
  relief: 1,
  proportional: false,
  offsetX: 0,
  offsetY: 0,
}

type BookmarkAction =
  | { type: 'update'; key: keyof BookmarkParams; value: number | string }
  | { type: 'updateText'; textKey: string; value: number | string }
  | { type: 'addText' }
  | { type: 'removeText'; id: string }
  | { type: 'updateTextById'; id: string; patch: Partial<TextItem> }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  length: { min: 50, max: 150 },
  width: { min: 30, max: 50 },
  holeDiameter: { min: 3, max: 8 },
  holeMargin: { min: 5, max: 15 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function bookmarkReducer(state: BookmarkParams, action: BookmarkAction): BookmarkParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'updateText': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.textKey, action.value)
        : action.value
      const nextTexts = [...state.texts]
      nextTexts[0] = { ...nextTexts[0], [action.textKey]: clamped }
      const next = { ...state, texts: nextTexts }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'addText': {
      if (state.texts.length >= 3) return state
      const newItem: TextItem = { id: crypto.randomUUID(), ...TEXT_ITEM_DEFAULTS }
      const next = { ...state, texts: [...state.texts, newItem] }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'removeText': {
      if (state.texts.length <= 1) return state
      const next = { ...state, texts: state.texts.filter((t) => t.id !== action.id) }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'updateTextById': {
      const patchResult = textItemSchema.partial().safeParse(action.patch)
      if (!patchResult.success) return state
      const nextTexts = state.texts.map((t) =>
        t.id === action.id ? { ...t, ...action.patch } : t,
      )
      const next = { ...state, texts: nextTexts }
      const parsed = bookmarkParamsSchema.safeParse(next)
      return parsed.success ? next : state
    }
    case 'reset':
      return defaultBookmarkParams
  }
}

export function useBookmark() {
  const [params, dispatch] = useReducer(bookmarkReducer, defaultBookmarkParams)
  const [fontCache, setFontCache] = useState<Map<FontStyle, Font>>(new Map())
  const [fontError, setFontError] = useState(false)
  const [geometry, setGeometry] = useState<BuildBookmarkResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const uniqueStyles = useMemo(() => {
    const styles = new Set(params.texts.map((t) => t.fontStyle))
    return Array.from(styles)
  }, [params.texts])

  useEffect(() => {
    for (const style of uniqueStyles) {
      if (fontCache.has(style)) continue
      const loader = new FontLoader()
      loader.load(
        fontUrls[style],
        (font) => {
          setFontCache((prev) => new Map(prev).set(style, font as unknown as Font))
        },
        undefined,
        () => setFontError(true),
      )
    }
  }, [uniqueStyles, fontCache])

  const font = fontCache.get(params.texts[0]?.fontStyle ?? 'bold') ?? null

  useEffect(() => {
    if (!font) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGeometry((prev) => {
        prev?.base.dispose()
        prev?.text.dispose()
        return buildBookmark({ font, params, onError: () => undefined })
      })
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [font, params])

  const updateParam = useCallback((key: keyof BookmarkParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const addText = useCallback(() => {
    dispatch({ type: 'addText' })
  }, [])

  const removeText = useCallback((id: string) => {
    dispatch({ type: 'removeText', id })
  }, [])

  const updateText = useCallback((id: string, patch: Partial<TextItem>) => {
    dispatch({ type: 'updateTextById', id, patch })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => {
    return {
      length: params.length,
      width: params.width,
      thickness: params.thickness,
    }
  }, [params.length, params.width, params.thickness])

  return { params, geometry, fontError, dimensions, updateParam, addText, removeText, updateText, reset }
}
```

**Step 4: Create stub files for dependencies**

```typescript
// src/features/studio/tools/letreiros/marcador-pagina/fonts.ts
import fontNormal from '@/assets/fonts/helvetiker_regular.typeface.json?url'
import fontBold from '@/assets/fonts/helvetiker_bold.typeface.json?url'
import fontSerif from '@/assets/fonts/optimer_regular.typeface.json?url'

export const fontUrls = {
  normal: fontNormal,
  bold: fontBold,
  serif: fontSerif,
} as const
```

```typescript
// src/features/studio/tools/letreiros/marcador-pagina/buildBookmark.ts
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { BookmarkParams, FontStyle } from './schema'

export interface BuildBookmarkInput {
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  params: BookmarkParams
  onError?: (message: string) => void
}

export interface BuildBookmarkResult {
  base: import('three').BufferGeometry
  text: import('three').BufferGeometry
  textItems: Array<{ id: string; geometry: import('three').BufferGeometry }>
}

export function buildBookmark(_input: BuildBookmarkInput): BuildBookmarkResult {
  // Stub - will be implemented in Task 3
  throw new Error('Not implemented')
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/useBookmark.test.tsx`
Expected: PASS (all tests)

**Step 6: Commit**

```bash
git add src/features/studio/tools/letreiros/marcador-pagina/useBookmark.ts src/features/studio/tools/letreiros/marcador-pagina/fonts.ts src/features/studio/tools/letreiros/marcador-pagina/buildBookmark.ts tests/features/studio/tools/letreiros/marcador-pagina/useBookmark.test.tsx
git commit -m "feat: add useBookmark hook with state management"
```

---

## Task 3: buildBookmark + Testes

**Files:**
- Modify: `src/features/studio/tools/letreiros/marcador-pagina/buildBookmark.ts`
- Create: `tests/features/studio/tools/letreiros/marcador-pagina/buildBookmark.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/letreiros/marcador-pagina/buildBookmark.test.ts
import * as THREE from 'three'
import { buildBookmark } from '@/features/studio/tools/letreiros/marcador-pagina/buildBookmark'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'

vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: class {
    load(_url: string, onLoad: (font: unknown) => void): void {
      onLoad({ glyphs: {} })
    }
  },
}))

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor() { super() }
  },
}))

vi.mock('three-bvh-csg', () => ({
  Evaluator: class {
    evaluate() {
      return { geometry: new THREE.BufferGeometry() }
    }
  },
  SUBTRACTION: 'subtraction',
  Brush: class {},
}))

describe('buildBookmark', () => {
  const mockFont = { glyphs: {} } as any

  it('gera base com furo circular', () => {
    const result = buildBookmark({ font: mockFont, params: defaultBookmarkParams })
    expect(result.base).toBeDefined()
    expect(result.text).toBeDefined()
  })

  it('textos em modo raised são mergeados', () => {
    const params = { ...defaultBookmarkParams, textMode: 'raised' as const }
    const result = buildBookmark({ font: mockFont, params })
    expect(result.textItems).toHaveLength(1)
  })

  it('textos em modo engraved usam CSG', () => {
    const params = { ...defaultBookmarkParams, textMode: 'engraved' as const }
    const result = buildBookmark({ font: mockFont, params })
    expect(result.base).toBeDefined()
  })

  it('respeita margens e posicionamento', () => {
    const params = {
      ...defaultBookmarkParams,
      texts: [{ ...defaultBookmarkParams.texts[0], offsetX: 10, offsetY: 5 }],
    }
    const result = buildBookmark({ font: mockFont, params })
    expect(result.textItems[0].geometry).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/buildBookmark.test.ts`
Expected: FAIL with "Not implemented"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/letreiros/marcador-pagina/buildBookmark.ts
import { type BufferGeometry, ExtrudeGeometry, Path, Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'
import { nameToGeometry } from './textToGeometry'
import type { BookmarkParams, FontStyle, TextItem } from './schema'

export interface BuildBookmarkInput {
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  params: BookmarkParams
  onError?: (message: string) => void
}

export interface BuildBookmarkResult {
  base: BufferGeometry
  text: BufferGeometry
  textItems: Array<{ id: string; geometry: BufferGeometry }>
}

const ENGRAVE_EPSILON = 0.2
const TEXT_MARGIN = 3

function resolveFont(
  fonts: Partial<Record<FontStyle, Font>> | undefined,
  font: Font | undefined,
  style: FontStyle,
): Font {
  if (fonts?.[style]) return fonts[style]!
  if (font) return font
  throw new Error(`No font provided for style "${style}"`)
}

function buildScaledText({
  font,
  name,
  textSize,
  targetWidth,
  depth,
}: {
  font: Font
  name: string
  textSize: number
  targetWidth: number
  depth: number
}): BufferGeometry {
  const geometry = nameToGeometry({ font, name, size: textSize, depth })
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

function buildItemGeometry(
  item: TextItem,
  resolvedFont: Font,
  availableWidth: number,
): BufferGeometry {
  const targetWidth = Math.min(item.width, availableWidth)
  return buildScaledText({
    font: resolvedFont,
    name: item.content,
    textSize: item.height,
    targetWidth,
    depth: item.relief,
  })
}

export function buildBookmark({
  font,
  fonts,
  params,
  onError,
}: BuildBookmarkInput): BuildBookmarkResult {
  // Criar base retangular
  const baseShape = new Shape()
  const halfLength = params.length / 2
  const halfWidth = params.width / 2
  
  baseShape.moveTo(-halfLength, -halfWidth)
  baseShape.lineTo(halfLength, -halfWidth)
  baseShape.lineTo(halfLength, halfWidth)
  baseShape.lineTo(-halfLength, halfWidth)
  baseShape.lineTo(-halfLength, -halfWidth)

  // Criar furo circular no topo
  const holeCenter = { x: 0, y: halfWidth - params.holeMargin }
  const holePath = new Path()
  holePath.absarc(holeCenter.x, holeCenter.y, params.holeDiameter / 2, 0, Math.PI * 2, false)
  baseShape.holes.push(holePath)

  const baseGeometry = new ExtrudeGeometry(baseShape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 1,
  })

  // Gerar textos
  const availableLength = params.length - 2 * TEXT_MARGIN
  const availableWidth = params.width - 2 * TEXT_MARGIN

  const textGeometries: BufferGeometry[] = []
  const textItems: Array<{ id: string; geometry: BufferGeometry }> = []

  for (let i = 0; i < params.texts.length; i++) {
    const item = params.texts[i]
    const resolvedFont = resolveFont(fonts, font, item.fontStyle)
    const textGeometry = buildItemGeometry(item, resolvedFont, availableLength)

    textGeometry.computeBoundingBox()
    const bb = textGeometry.boundingBox!
    const halfTextWidth = (bb.max.x - bb.min.x) / 2
    const halfTextHeight = (bb.max.y - bb.min.y) / 2

    // Clamp para respeitar margens
    const maxOffsetX = availableLength / 2 - halfTextWidth
    const maxOffsetY = availableWidth / 2 - halfTextHeight
    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, item.offsetX))
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, item.offsetY))

    textGeometry.translate(clampedX, clampedY, params.thickness - 0.01)
    textGeometries.push(textGeometry)
    textItems.push({ id: item.id, geometry: textGeometry })
  }

  if (params.textMode === 'raised') {
    const merged = mergeGeometries(textGeometries) ?? textGeometries[0]
    merged.computeVertexNormals()
    baseGeometry.computeVertexNormals()
    return {
      base: baseGeometry,
      text: merged,
      textItems,
    }
  }

  // Modo engraved - usar CSG
  try {
    const mergedText = mergeGeometries(textGeometries) ?? textGeometries[0]
    mergedText.translate(0, 0, ENGRAVE_EPSILON)
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(new Brush(baseGeometry), new Brush(mergedText), SUBTRACTION)
    result.geometry.computeVertexNormals()
    return {
      base: result.geometry,
      text: mergedText,
      textItems,
    }
  } catch {
    onError?.('Falha na gravação; usando relevo')
    const fallbackMerged = mergeGeometries(textGeometries) ?? textGeometries[0]
    fallbackMerged.computeVertexNormals()
    baseGeometry.computeVertexNormals()
    return {
      base: baseGeometry,
      text: fallbackMerged,
      textItems,
    }
  }
}
```

**Step 4: Copy textToGeometry from chaveiro**

```bash
cp src/features/studio/tools/chaveiros/chaveiro/textToGeometry.ts src/features/studio/tools/letreiros/marcador-pagina/textToGeometry.ts
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/buildBookmark.test.ts`
Expected: PASS (all tests)

**Step 6: Commit**

```bash
git add src/features/studio/tools/letreiros/marcador-pagina/buildBookmark.ts src/features/studio/tools/letreiros/marcador-pagina/textToGeometry.ts tests/features/studio/tools/letreiros/marcador-pagina/buildBookmark.test.ts
git commit -m "feat: implement buildBookmark with CSG support"
```

---

## Task 4: StudioPanel + Testes

**Files:**
- Create: `src/features/studio/tools/letreiros/marcador-pagina/StudioPanel.tsx`
- Create: `tests/features/studio/tools/letreiros/marcador-pagina/StudioPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/letreiros/marcador-pagina/StudioPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { StudioPanel } from '@/features/studio/tools/letreiros/marcador-pagina/StudioPanel'
import { defaultBookmarkParams } from '@/features/studio/tools/letreiros/marcador-pagina/schema'

describe('StudioPanel', () => {
  const mockProps = {
    params: defaultBookmarkParams,
    selectedTextId: defaultBookmarkParams.texts[0].id,
    onSelectText: vi.fn(),
    onUpdateText: vi.fn(),
    onAddText: vi.fn(),
    onRemoveText: vi.fn(),
    onUpdateParam: vi.fn(),
    onReset: vi.fn(),
    onOpenEditor: vi.fn(),
  }

  it('renderiza sliders e selects', () => {
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByLabelText(/comprimento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/largura/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/diâmetro/i)).toBeInTheDocument()
  })

  it('dispara callback ao mudar parâmetro', () => {
    render(<StudioPanel {...mockProps} />)
    const slider = screen.getByLabelText(/comprimento/i)
    fireEvent.change(slider, { target: { value: '130' } })
    expect(mockProps.onUpdateParam).toHaveBeenCalledWith('length', 130)
  })

  it('mostra botão adicionar texto', () => {
    render(<StudioPanel {...mockProps} />)
    expect(screen.getByText(/adicionar texto/i)).toBeInTheDocument()
  })

  it('dispara onAddText ao clicar', () => {
    render(<StudioPanel {...mockProps} />)
    fireEvent.click(screen.getByText(/adicionar texto/i))
    expect(mockProps.onAddText).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/StudioPanel.test.tsx`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/letreiros/marcador-pagina/StudioPanel.tsx
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
import { type BookmarkParams, type TextItem, PLA_COLORS } from './schema'

interface StudioPanelProps {
  params: BookmarkParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onUpdateText: (id: string, patch: Partial<TextItem>) => void
  onAddText: () => void
  onRemoveText: (id: string) => void
  onUpdateParam: (key: keyof BookmarkParams, value: number | string) => void
  onReset: () => void
  onOpenEditor: () => void
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
  selectedTextId,
  onSelectText,
  onUpdateText,
  onAddText,
  onRemoveText,
  onUpdateParam,
  onReset,
  onOpenEditor,
}: StudioPanelProps) {
  const selectedText = params.texts.find((t) => t.id === selectedTextId) ?? params.texts[0]
  const canAddText = params.texts.length < 3

  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Marcador de Página
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
              <Flex direction="row" gap="xs" wrap="wrap">
                {params.texts.map((text) => (
                  <Button
                    key={text.id}
                    size="small"
                    aria-pressed={text.id === selectedTextId}
                    onClick={() => onSelectText(text.id)}
                  >
                    {text.content}
                  </Button>
                ))}
                {selectedTextId && params.texts.length > 1 && (
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => onRemoveText(selectedTextId)}
                  >
                    ×
                  </Button>
                )}
              </Flex>

              <Button
                size="small"
                isDisabled={!canAddText}
                onClick={onAddText}
              >
                Adicionar texto
              </Button>

              {selectedText && (
                <>
                  <Button
                    size="small"
                    variation="link"
                    onClick={onOpenEditor}
                    aria-label="Posicionar textos"
                  >
                    ✥ Posicionar textos
                  </Button>

                  <TextField
                    label="Conteúdo"
                    descriptiveText="Até 12 caracteres"
                    value={selectedText.content}
                    maxLength={12}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateText(selectedText.id, { content: e.target.value })
                    }
                  />

                  <SelectField
                    label="Estilo da letra"
                    value={selectedText.fontStyle}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      onUpdateText(selectedText.id, { fontStyle: e.target.value as TextItem['fontStyle'] })
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
                    label=""
                    aria-label="Largura do texto"
                    min={8} max={60} step={1}
                    value={selectedText.width}
                    onChange={(value) => onUpdateText(selectedText.id, { width: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do texto</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.height} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Altura do texto"
                    min={4} max={20} step={0.5}
                    value={selectedText.height}
                    onChange={(value) => onUpdateText(selectedText.id, { height: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do relevo</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.relief} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Altura do relevo"
                    min={0.4} max={2} step={0.1}
                    value={selectedText.relief}
                    onChange={(value) => onUpdateText(selectedText.id, { relief: value as number })}
                  />
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="base">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Base
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Modo de texto"
                value={params.textMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('textMode', e.target.value)
                }
              >
                <option value="raised">Relevo</option>
                <option value="engraved">Gravado</option>
              </SelectField>

              <Text fontSize="xs" color="font.tertiary">
                Cor da base
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.baseColor}
                onSelect={(color) => onUpdateParam('baseColor', color)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Cor das letras
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.letterColor}
                onSelect={(color) => onUpdateParam('letterColor', color)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Comprimento</Text>
                <Text fontSize="xs" color="font.secondary">{params.length} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Comprimento"
                min={50} max={150} step={1}
                value={params.length}
                onChange={(value) => onUpdateParam('length', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura</Text>
                <Text fontSize="xs" color="font.secondary">{params.width} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura"
                min={30} max={50} step={1}
                value={params.width}
                onChange={(value) => onUpdateParam('width', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="furo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Furo
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Diâmetro</Text>
                <Text fontSize="xs" color="font.secondary">{params.holeDiameter} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Diâmetro"
                min={3} max={8} step={0.5}
                value={params.holeDiameter}
                onChange={(value) => onUpdateParam('holeDiameter', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Margem do topo</Text>
                <Text fontSize="xs" color="font.secondary">{params.holeMargin} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Margem do topo"
                min={5} max={15} step={1}
                value={params.holeMargin}
                onChange={(value) => onUpdateParam('holeMargin', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/StudioPanel.test.tsx`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/marcador-pagina/StudioPanel.tsx tests/features/studio/tools/letreiros/marcador-pagina/StudioPanel.test.tsx
git commit -m "feat: add StudioPanel for bookmark parameters"
```

---

## Task 5: BookmarkPreview

**Files:**
- Create: `src/features/studio/tools/letreiros/marcador-pagina/BookmarkPreview.tsx`

**Step 1: Write implementation**

```typescript
// src/features/studio/tools/letreiros/marcador-pagina/BookmarkPreview.tsx
import type { BuildBookmarkResult } from './buildBookmark'

interface BookmarkPreviewProps {
  geometry: BuildBookmarkResult | null
  baseColor: string
  letterColor: string
}

export function BookmarkPreview({ geometry, baseColor, letterColor }: BookmarkPreviewProps) {
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={geometry.text} castShadow>
        <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
      </mesh>
    </group>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/studio/tools/letreiros/marcador-pagina/BookmarkPreview.tsx
git commit -m "feat: add BookmarkPreview component"
```

---

## Task 6: TextPositionEditor

**Files:**
- Create: `src/features/studio/tools/letreiros/marcador-pagina/TextPositionEditor.tsx`

**Step 1: Write implementation**

```typescript
// src/features/studio/tools/letreiros/marcador-pagina/TextPositionEditor.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BookmarkParams } from './schema'

interface TextPositionEditorProps {
  params: BookmarkParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void
  onClose: () => void
}

const TEXT_MARGIN = 3

export function TextPositionEditor({
  params,
  selectedTextId,
  onSelectText,
  onMoveText,
  onClose,
}: TextPositionEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const scale = 2 // pixels per mm
  const canvasWidth = params.length * scale
  const canvasHeight = params.width * scale

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw bookmark background
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Draw hole
    const holeX = canvasWidth / 2
    const holeY = params.holeMargin * scale
    ctx.fillStyle = '#d4d4d4'
    ctx.beginPath()
    ctx.arc(holeX, holeY, (params.holeDiameter / 2) * scale, 0, Math.PI * 2)
    ctx.fill()

    // Draw texts
    params.texts.forEach((text) => {
      const isSelected = text.id === selectedTextId
      const textWidth = text.width * scale
      const textHeight = text.height * scale
      const x = canvasWidth / 2 + text.offsetX * scale - textWidth / 2
      const y = canvasHeight / 2 + text.offsetY * scale - textHeight / 2

      ctx.fillStyle = isSelected ? '#14b8a6' : '#a1a1aa'
      ctx.fillRect(x, y, textWidth, textHeight)

      ctx.strokeStyle = isSelected ? '#0d9488' : '#71717a'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.strokeRect(x, y, textWidth, textHeight)

      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text.content, x + textWidth / 2, y + textHeight / 2)
    })
  }, [params, selectedTextId, canvasWidth, canvasHeight])

  useEffect(() => {
    draw()
  }, [draw])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicked on a text
    for (const text of params.texts) {
      const textWidth = text.width * scale
      const textHeight = text.height * scale
      const textX = canvasWidth / 2 + text.offsetX * scale - textWidth / 2
      const textY = canvasHeight / 2 + text.offsetY * scale - textHeight / 2

      if (x >= textX && x <= textX + textWidth && y >= textY && y <= textY + textHeight) {
        onSelectText(text.id)
        setDragging(text.id)
        setDragStart({ x: e.clientX, y: e.clientY })
        return
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return
    const dx = (e.clientX - dragStart.x) / scale
    const dy = (e.clientY - dragStart.y) / scale

    const text = params.texts.find((t) => t.id === dragging)
    if (!text) return

    const maxOffsetX = params.length / 2 - text.width / 2 - TEXT_MARGIN
    const maxOffsetY = params.width / 2 - text.height / 2 - TEXT_MARGIN

    const newX = Math.max(-maxOffsetX, Math.min(maxOffsetX, text.offsetX + dx))
    const newY = Math.max(-maxOffsetY, Math.min(maxOffsetY, text.offsetY + dy))

    onMoveText(dragging, newX, newY)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Posicionar Textos</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-neutral-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-move border border-neutral-200"
        />
        <p className="mt-2 text-sm text-neutral-500">
          Arraste os textos para reposicionar
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/studio/tools/letreiros/marcador-pagina/TextPositionEditor.tsx
git commit -m "feat: add TextPositionEditor for visual text positioning"
```

---

## Task 7: exportStl

**Files:**
- Create: `src/features/studio/tools/letreiros/marcador-pagina/exportStl.ts`
- Create: `tests/features/studio/tools/letreiros/marcador-pagina/exportStl.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/features/studio/tools/letreiros/marcador-pagina/exportStl.test.ts
import * as THREE from 'three'
import { exportStl } from '@/features/studio/tools/letreiros/marcador-pagina/exportStl'
import type { BuildBookmarkResult } from '@/features/studio/tools/letreiros/marcador-pagina/buildBookmark'

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class {
    parse() {
      return new ArrayBuffer(100)
    }
  },
}))

describe('exportStl', () => {
  it('exporta STL com nome sanitizado', () => {
    const geometry: BuildBookmarkResult = {
      base: new THREE.BufferGeometry(),
      text: new THREE.BufferGeometry(),
      textItems: [],
    }

    const mockClick = vi.fn()
    const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
      click: mockClick,
      href: '',
      download: '',
    } as any)

    exportStl(geometry, 'Meu Marcador! @#')

    expect(mockCreateElement).toHaveBeenCalledWith('a')
    expect(mockClick).toHaveBeenCalled()

    mockCreateElement.mockRestore()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/exportStl.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/features/studio/tools/letreiros/marcador-pagina/exportStl.ts
import { Mesh, Scene } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { sanitizeFilename } from './schema'
import type { BuildBookmarkResult } from './buildBookmark'

export function exportStl(geometry: BuildBookmarkResult, projectName: string): void {
  const merged = mergeGeometries([geometry.base, geometry.text]) ?? geometry.base
  const scene = new Scene()
  scene.add(new Mesh(merged))
  const exporter = new STLExporter()
  const result = exporter.parse(scene, { binary: true })
  const blob = new Blob([result as unknown as BlobPart], { type: 'model/stl' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFilename(projectName)}.stl`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/features/studio/tools/letreiros/marcador-pagina/exportStl.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/marcador-pagina/exportStl.ts tests/features/studio/tools/letreiros/marcador-pagina/exportStl.test.ts
git commit -m "feat: add STL export for bookmark"
```

---

## Task 8: Integração no StudioPage

**Files:**
- Modify: `src/features/studio/components/ToolSelector.tsx`
- Modify: `src/features/studio/StudioPage.tsx`

**Step 1: Update ToolSelector**

```typescript
// src/features/studio/components/ToolSelector.tsx
// Add to ToolId type:
export type ToolId = 'chaveiro' | 'cartao-visita' | 'suporte-bolo' | 'suporte-foto' | 'topo-bolo' | 'carimbo-brigadeiro' | 'marcador-pagina'

// Add to TOOLS array:
{
  id: 'marcador-pagina',
  name: 'Marcador de Página',
  description: 'Marcadores 3D personalizados com texto em relevo e furo para fita',
  icon: '📖',
  category: 'Letreiros',
},
```

**Step 2: Update StudioPage**

```typescript
// src/features/studio/StudioPage.tsx
// Add imports:
import { useBookmark } from './tools/letreiros/marcador-pagina/useBookmark'
import { exportStl } from './tools/letreiros/marcador-pagina/exportStl'

const MarcadorPaginaTool = lazy(() =>
  import('./tools/letreiros/marcador-pagina/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const MarcadorPaginaPreview = lazy(() =>
  import('./tools/letreiros/marcador-pagina/BookmarkPreview').then((m) => ({
    default: m.BookmarkPreview,
  })),
)

// Add wrapper function:
function MarcadorPaginaToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)
  const [selectedTextId, setSelectedTextId] = useState<string>('')
  const [isEditorOpen, setEditorOpen] = useState(false)

  const {
    params,
    geometry,
    dimensions,
    updateParam,
    updateText,
    addText,
    removeText,
    reset,
  } = useBookmark()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (geometry) {
      exportStl(geometry, projectName)
    }
  }, [geometry, projectName])

  const handleSelectText = useCallback((id: string) => {
    setSelectedTextId(id)
  }, [])

  const handleAddText = useCallback(() => {
    addText()
    if (params.texts.length < 3) {
      const next = params.texts[params.texts.length]
      if (next) setSelectedTextId(next.id)
    }
  }, [addText, params.texts])

  const handleMoveText = useCallback((id: string, x: number, y: number) => {
    updateText(id, { offsetX: x, offsetY: y })
  }, [updateText])

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
          <MarcadorPaginaTool
            params={params}
            selectedTextId={selectedTextId}
            onSelectText={handleSelectText}
            onUpdateText={updateText}
            onAddText={handleAddText}
            onRemoveText={removeText}
            onUpdateParam={updateParam}
            onReset={reset}
            onOpenEditor={() => setEditorOpen(true)}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
        >
          <Suspense fallback={null}>
            <MarcadorPaginaPreview
              geometry={geometry}
              baseColor={params.baseColor}
              letterColor={params.letterColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
      {isEditorOpen && (
        <Suspense fallback={null}>
          <TextPositionEditor
            params={params}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
            onMoveText={handleMoveText}
            onClose={() => setEditorOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

// Add to render:
{activeTool === 'marcador-pagina' && (
  <MarcadorPaginaToolWrapper onBack={() => setActiveTool(null)} />
)}
```

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/features/studio/components/ToolSelector.tsx src/features/studio/StudioPage.tsx
git commit -m "feat: integrate bookmark tool into Studio"
```

---

## Task 9: Atualizar Documentação

**Files:**
- Modify: `docs/frontend/studio.md`

**Step 1: Update studio.md**

Adicionar seção sobre marcador de página na documentação do Studio, listando a nova ferramenta e seus parâmetros.

**Step 2: Commit**

```bash
git add docs/frontend/studio.md
git commit -m "docs: add bookmark tool to studio documentation"
```

---

## Task 10: Validação Final

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Run build**

Run: `npm run build`
Expected: Build successful

**Step 5: Manual testing**

- Abrir aplicação em `npm run dev`
- Navegar até `/studio`
- Selecionar "Marcador de Página"
- Testar ajustes de parâmetros
- Testar adição/remoção de textos
- Testar editor de posição
- Testar exportação STL

**Step 6: Final commit (if any fixes needed)**

```bash
git add .
git commit -m "fix: address issues found in final validation"
```

---

## Summary

**Total Tasks:** 10  
**Estimated Time:** 4-6 horas  
**Files Created:** 10  
**Files Modified:** 3  
**Tests Created:** 5

**Próximos Passos:**
1. Executar plano com subagent-driven development (recomendado) ou parallel session
2. Revisar cada task antes de prosseguir
3. Validar integração final manualmente
