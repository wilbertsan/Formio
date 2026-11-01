# Reformulação do Chaveiro com Recursos de Carimbo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reformular o chaveiro para aceitar itens de conteúdo texto **ou** ícone SVG, com auto-ajuste por formato, fonte em mm e união de contornos no formato "Contorno do Nome".

**Architecture:** União discriminada `ContentItem` (`kind: 'text' | 'icon'`) mantendo 1–3 itens posicionáveis. Um novo motor `autoFit.ts` calcula a região útil por formato e encolhe texto/ícone (nunca aumenta). `buildKeychain` ramifica por tipo; no formato nome, une contornos de texto+ícone via Clipper.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, js-clipper, Vitest.

**Design Doc:** `docs/plans/2026-11-01-chaveiro-reformulacao-design.md`

**Comandos de verificação:** `npm run typecheck`, `npm run lint`, `npx vitest run <arquivo>`.

---

## Task 0: Baseline

**Step 1:** Rode `npm run typecheck && npm run lint && npm test`.
**Expected:** tudo passa antes de começar. Se algo já falhar, registre e não prossiga.

---

## Task 1: Migrar o schema para `ContentItem`

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/schema.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/schema.test.ts`

**Step 1: Write the failing test**

Substitua os testes de `textItemSchema` por:

```ts
import {
  contentItemSchema,
  defaultKeychainParams,
  keychainParamsSchema,
} from '@/features/studio/tools/chaveiros/chaveiro/schema'

describe('conteúdo texto/ícone', () => {
  it('aceita texto com fontSize 6-15', () => {
    const text = {
      id: 't1', kind: 'text', content: 'Ana', fontStyle: 'bold',
      fontSize: 10, offsetX: 0, offsetY: 0,
    }
    expect(contentItemSchema.parse(text)).toEqual(text)
    expect(contentItemSchema.safeParse({ ...text, fontSize: 5 }).success).toBe(false)
    expect(contentItemSchema.safeParse({ ...text, fontSize: 16 }).success).toBe(false)
  })

  it('aceita ícone sem SVG (upload pendente)', () => {
    const icon = {
      id: 'i1', kind: 'icon', svgIcon: null, iconScale: 1,
      iconLineWidth: 0.3, offsetX: 0, offsetY: 0,
    }
    expect(contentItemSchema.parse(icon)).toEqual(icon)
  })

  it('defaults são válidos e incluem reliefDepth', () => {
    expect(keychainParamsSchema.parse(defaultKeychainParams)).toEqual(defaultKeychainParams)
    expect(defaultKeychainParams.reliefDepth).toBe(1)
    expect(defaultKeychainParams.contents).toHaveLength(1)
  })

  it('aceita 1-3 conteúdos e rejeita 0/4', () => {
    for (const count of [1, 2, 3]) {
      const contents = Array.from({ length: count }, (_, i) => ({
        ...defaultKeychainParams.contents[0], id: `c${i}`,
      }))
      expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, contents }).success).toBe(true)
    }
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, contents: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, i) => ({
      ...defaultKeychainParams.contents[0], id: `c${i}`,
    }))
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, contents: four }).success).toBe(false)
  })
})
```

**Step 2:** `npx vitest run tests/features/studio/tools/chaveiros/chaveiro/schema.test.ts` → FAIL.

**Step 3: Implement**

Em `schema.ts`, substitua `textItemSchema`/`TextItem` por:

```ts
const contentBase = {
  id: z.string().min(1),
  offsetX: z.number().min(-20).max(20),
  offsetY: z.number().min(-20).max(20),
}

export const textContentSchema = z.object({
  ...contentBase,
  kind: z.literal('text'),
  content: z.string().trim().min(1).max(12),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(6).max(15),
})

export const iconContentSchema = z.object({
  ...contentBase,
  kind: z.literal('icon'),
  svgIcon: z.string().nullable(),
  iconScale: z.number().min(0.5).max(1.0),
  iconLineWidth: z.number().min(0.1).max(1.5),
})

export const contentItemSchema = z.discriminatedUnion('kind', [
  textContentSchema,
  iconContentSchema,
])

export type TextContent = z.infer<typeof textContentSchema>
export type IconContent = z.infer<typeof iconContentSchema>
export type ContentItem = z.infer<typeof contentItemSchema>
export type FontStyle = TextContent['fontStyle']
```

No `keychainParamsSchema`: troque `texts: z.array(textItemSchema).min(1).max(3)` por `contents: z.array(contentItemSchema).min(1).max(3)` e adicione `reliefDepth: z.number().min(0.4).max(2)`.

No default:

```ts
const defaultContent: TextContent = {
  id: 'content-1', kind: 'text', content: 'Meu nome', fontStyle: 'bold',
  fontSize: 10, offsetX: 0, offsetY: 0,
}

export const defaultKeychainParams: KeychainParams = {
  // ...campos existentes...
  reliefDepth: 1,
  contents: [defaultContent],
}
```

Remova `TextItem` e `defaultText`. Mantenha `normalizeName` e `sanitizeFilename`.

**Step 4:** Rode o teste → PASS.
**Step 5:** `git add src/.../schema.ts tests/.../schema.test.ts && git commit -m "refactor(chaveiro): modela conteúdo como texto ou ícone"`

---

## Task 2: Encaixe de ícone SVG por caixa (helper compartilhado)

**Files:**
- Modify: `src/features/studio/tools/confeitaria/shared/svgToIconShape.ts`
- Test: `tests/features/studio/tools/confeitaria/shared/svgToIconShape.test.ts`

**Step 1:** Adicione teste:

```ts
it('encaixa o ícone em uma caixa com proporção', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="50" fill="#000"/></svg>`
  const geo = buildSvgIconGeometryInBox({
    svg, maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
  })
  geo!.computeBoundingBox()
  const w = geo!.boundingBox!.max.x - geo!.boundingBox!.min.x
  const h = geo!.boundingBox!.max.y - geo!.boundingBox!.min.y
  expect(w).toBeLessThanOrEqual(20.1)
  expect(h).toBeLessThanOrEqual(20.1)
  expect(Math.max(w, h)).toBeGreaterThan(15)
})
```

**Step 2:** Rode → FAIL (import inexistente).

**Step 3: Implement**

Exporte `scaleShape` e adicione:

```ts
export interface SvgIconBoxInput {
  svg: string
  maxWidth: number
  maxHeight: number
  lineWidth: number
  iconScale: number
  depth: number
}

export function buildSvgIconGeometryInBox({
  svg, maxWidth, maxHeight, lineWidth, iconScale, depth,
}: SvgIconBoxInput): BufferGeometry | null {
  const parsed = parseSvg(svg)
  if (!parsed) return null
  const bounds = svgBoundsFromParsed(parsed)
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null

  const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height) * iconScale
  if (scale <= 0) return null

  const shapes = svgShapesFromParsed(parsed, lineWidth / scale).map(s => scaleShape(s, scale))
  if (shapes.length === 0) return null

  const geometries = shapes.map(shape => new ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 1,
  }))
  const iconGeometry = mergeGeometries(geometries)
  geometries.forEach(g => g.dispose())
  if (!iconGeometry) return null

  iconGeometry.computeBoundingBox()
  const bb = iconGeometry.boundingBox!
  iconGeometry.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -bb.min.z)
  iconGeometry.rotateZ(Math.PI)
  return iconGeometry
}
```

Troque `function scaleShape` por `export function scaleShape`.

**Step 4:** Teste → PASS.
**Step 5:** Commit `feat(shared): encaixa ícone SVG em caixa`.

---

## Task 3: Motor de auto-fit

**Files:**
- Create: `src/features/studio/tools/chaveiros/chaveiro/autoFit.ts`
- Modify: `src/features/studio/tools/chaveiros/chaveiro/shapes.ts` (exportar `createOutline`)
- Test: `tests/features/studio/tools/chaveiros/chaveiro/autoFit.test.ts`

**Step 1: Write the failing test**

```ts
import * as THREE from 'three'
import { fitGeometryToRegion, getUsableRegion } from '@/features/studio/tools/chaveiros/chaveiro/autoFit'
import { defaultKeychainParams } from '@/features/studio/tools/chaveiros/chaveiro/schema'

it('retângulo usa área interna à borda', () => {
  const region = getUsableRegion({ ...defaultKeychainParams, borderWidth: 4, width: 50, height: 25 })!
  expect(region).toEqual({ kind: 'rect', minX: -21, maxX: 21, minY: -8.5, maxY: 8.5 })
})

it('círculo usa raio interno', () => {
  const region = getUsableRegion({
    ...defaultKeychainParams, baseShape: 'circle', width: 40, borderWidth: 5,
  })!
  expect(region).toEqual({ kind: 'circle', cx: 0, cy: 0, radius: 15 })
})

it('nunca aumenta e centraliza', () => {
  const geo = new THREE.BoxGeometry(100, 20, 1)
  fitGeometryToRegion(geo, { kind: 'rect', minX: -10, maxX: 10, minY: -10, maxY: 10 })
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  expect(bb.max.x - bb.min.x).toBeLessThanOrEqual(20.01)
  expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(0)
})

it('name não tem região de auto-fit', () => {
  expect(getUsableRegion({ ...defaultKeychainParams, baseShape: 'name' })).toBeNull()
})
```

**Step 2:** Rode → FAIL.

**Step 3: Implement**

Em `shapes.ts`:

```ts
export function createOutline(
  shapeType: Exclude<KeychainShape, 'name'>,
  width: number,
  height: number,
): Shape {
  return buildOutline(shapeType, width, height)
}
```

Em `autoFit.ts`:

```ts
import { BufferGeometry, Shape, Vector2 } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { createOutline } from './shapes'
import { nameToGeometry } from './textToGeometry'
import {
  buildSvgIconGeometry, buildSvgIconGeometryInBox, parseSvg, scaleShape,
  svgBoundsFromParsed, svgShapesFromParsed,
} from '../../confeitaria/shared/svgToIconShape'
import type { BoundingBox2D, Circle2D } from './positioning'
import type { ContentItem, KeychainParams } from './schema'
import { normalizeName } from './schema'

export type UsableRegion =
  | { kind: 'rect'; minX: number; maxX: number; minY: number; maxY: number }
  | { kind: 'circle'; cx: number; cy: number; radius: number }

export function getUsableRegion(params: KeychainParams): UsableRegion | null {
  if (params.baseShape === 'name') return null
  if (params.baseShape === 'circle') {
    return { kind: 'circle', cx: 0, cy: 0, radius: Math.max(1, params.width / 2 - params.borderWidth) }
  }
  if (params.baseShape === 'heart') {
    const points = createOutline('heart', params.width, params.height).getPoints(64)
    const inset = Math.min(...points.map(p => Math.hypot(p.x, p.y)))
    return { kind: 'circle', cx: 0, cy: 0, radius: Math.max(1, inset - params.borderWidth) }
  }
  return {
    kind: 'rect',
    minX: -params.width / 2 + params.borderWidth,
    maxX: params.width / 2 - params.borderWidth,
    minY: -params.height / 2 + params.borderWidth,
    maxY: params.height / 2 - params.borderWidth,
  }
}

export function fitGeometryToRegion(geometry: BufferGeometry, region: UsableRegion): void {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const width = bb.max.x - bb.min.x
  const height = bb.max.y - bb.min.y
  let scale = 1
  if (region.kind === 'rect') {
    scale = Math.min(1, (region.maxX - region.minX) / width, (region.maxY - region.minY) / height)
  } else {
    scale = Math.min(1, (2 * region.radius) / Math.hypot(width, height))
  }
  if (scale < 1) geometry.scale(scale, scale, 1)
  geometry.computeBoundingBox()
  const fitted = geometry.boundingBox!
  geometry.translate(
    -(fitted.min.x + fitted.max.x) / 2,
    -(fitted.min.y + fitted.max.y) / 2,
    -fitted.min.z,
  )
}

export function clampOffset(
  region: UsableRegion,
  halfWidth: number,
  halfHeight: number,
  offset: { x: number; y: number },
): { x: number; y: number } {
  if (region.kind === 'rect') {
    return {
      x: Math.min(region.maxX - halfWidth, Math.max(region.minX + halfWidth, offset.x)),
      y: Math.min(region.maxY - halfHeight, Math.max(region.minY + halfHeight, offset.y)),
    }
  }
  const maxCenter = Math.max(0, region.radius - Math.hypot(halfWidth, halfHeight))
  const distance = Math.hypot(offset.x, offset.y)
  if (distance <= maxCenter || distance === 0) return offset
  const factor = maxCenter / distance
  return { x: offset.x * factor, y: offset.y * factor }
}

export interface FitContext {
  region: UsableRegion | null
  params: KeychainParams
  font: Font
  referenceSize: number
}

export interface FittedContent {
  geometry: BufferGeometry
  halfWidth: number
  halfHeight: number
  x: number
  y: number
}

export function resolveContentGeometry(item: ContentItem, ctx: FitContext): FittedContent | null {
  if (item.kind === 'text') {
    const geometry = nameToGeometry({
      font: ctx.font, name: item.content, size: item.fontSize, depth: ctx.params.reliefDepth,
    })
    if (ctx.region) fitGeometryToRegion(geometry, ctx.region)
    const bb = geometry.boundingBox ?? (geometry.computeBoundingBox(), geometry.boundingBox!)
    const halfWidth = (bb.max.x - bb.min.x) / 2
    const halfHeight = (bb.max.y - bb.min.y) / 2
    const offset = ctx.region
      ? clampOffset(ctx.region, halfWidth, halfHeight, { x: item.offsetX, y: item.offsetY })
      : { x: item.offsetX, y: item.offsetY }
    return { geometry, halfWidth, halfHeight, ...offset }
  }

  if (!item.svgIcon) return null
  let geometry: BufferGeometry | null
  if (ctx.region?.kind === 'circle') {
    geometry = buildSvgIconGeometry({
      svg: item.svgIcon, maxRadius: ctx.region.radius, lineWidth: item.iconLineWidth,
      iconScale: item.iconScale, depth: ctx.params.reliefDepth,
    })
  } else {
    const box = ctx.region
      ? { w: ctx.region.maxX - ctx.region.minX, h: ctx.region.maxY - ctx.region.minY }
      : { w: ctx.referenceSize * 2, h: ctx.referenceSize * 2 }
    geometry = buildSvgIconGeometryInBox({
      svg: item.svgIcon, maxWidth: box.w, maxHeight: box.h,
      lineWidth: item.iconLineWidth, iconScale: item.iconScale, depth: ctx.params.reliefDepth,
    })
  }
  if (!geometry) return null
  if (ctx.region) fitGeometryToRegion(geometry, ctx.region)
  const bb = geometry.boundingBox ?? (geometry.computeBoundingBox(), geometry.boundingBox!)
  const halfWidth = (bb.max.x - bb.min.x) / 2
  const halfHeight = (bb.max.y - bb.min.y) / 2
  const offset = ctx.region
    ? clampOffset(ctx.region, halfWidth, halfHeight, { x: item.offsetX, y: item.offsetY })
    : { x: item.offsetX, y: item.offsetY }
  return { geometry, halfWidth, halfHeight, ...offset }
}

export function buildContentShapes(
  item: ContentItem,
  font: Font,
  referenceSize: number,
): Shape[] {
  if (item.kind === 'text') {
    const shapes = font.generateShapes(normalizeName(item.content), item.fontSize)
    return shapes.map(shape => translateShape(shape, item.offsetX, item.offsetY))
  }
  if (!item.svgIcon) return []
  const parsed = parseSvg(item.svgIcon)
  if (!parsed) return []
  const bounds = svgBoundsFromParsed(parsed)
  if (!bounds || bounds.farthest <= 0) return []
  const scale = (referenceSize / bounds.farthest) * item.iconScale
  const shapes = svgShapesFromParsed(parsed, item.iconLineWidth / scale).map(s => scaleShape(s, scale))
  return shapes.map(shape => {
    const rotated = rotateShape180(shape)
    return translateShape(rotated, item.offsetX, item.offsetY)
  })
}
```

Implemente `translateShape` e `rotateShape180` localmente (copie a lógica de `buildKeychain.translatedShape` e negue x/y). Se preferir, exporte `translatedShape` de `buildKeychain.ts` para reutilizar.

**Step 4:** Rode o teste → PASS.
**Step 5:** Commit `feat(chaveiro): adiciona motor de auto-fit por formato`.

---

## Task 4: Refatorar `nameOutline` para união de shapes

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/nameOutline.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/nameOutline.test.ts`

**Step 1:** Substitua os testes por:

```ts
import * as THREE from 'three'
import { createNameOutline } from '@/features/studio/tools/chaveiros/chaveiro/nameOutline'

it('gera outline com espessura e bounding box da união', () => {
  const shape = new THREE.Shape([
    new THREE.Vector2(-5, -5), new THREE.Vector2(5, -5),
    new THREE.Vector2(5, 5), new THREE.Vector2(-5, 5),
  ])
  const result = createNameOutline({ shapes: [shape], borderWidth: 4, thickness: 3 })
  result.outline.computeBoundingBox()
  expect(result.outline.boundingBox!.max.z).toBeCloseTo(3)
  expect(result.boundingBox.minX).toBeCloseTo(-9)
  expect(result.boundingBox.maxX).toBeCloseTo(9)
})
```

**Step 2:** FAIL.

**Step 3: Implement**

```ts
export interface CreateNameOutlineInput {
  shapes: Shape[]
  borderWidth: number
  thickness: number
}

export interface NameOutlineResult {
  outline: BufferGeometry
  boundingBox: BoundingBox2D
}

export function createNameOutline({
  shapes, borderWidth, thickness,
}: CreateNameOutlineInput): NameOutlineResult {
  if (shapes.length === 0) {
    const empty = new Shape()
    return {
      outline: new ExtrudeGeometry(empty, { depth: thickness, bevelEnabled: false }),
      boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const shape of shapes) {
    for (const p of shape.getPoints()) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
  }

  const union = unionShapes(shapes)
  const expanded = expandShape(union, borderWidth)
  const rectangle = new Shape([
    new Vector2(minX - borderWidth, minY - borderWidth),
    new Vector2(maxX + borderWidth, minY - borderWidth),
    new Vector2(maxX + borderWidth, maxY + borderWidth),
    new Vector2(minX - borderWidth, maxY + borderWidth),
  ])
  const baseShape = intersectShapes(expanded, rectangle)

  return {
    outline: new ExtrudeGeometry(baseShape, { depth: thickness, bevelEnabled: false }),
    boundingBox: {
      minX: minX - borderWidth, maxX: maxX + borderWidth,
      minY: minY - borderWidth, maxY: maxY + borderWidth,
    },
  }
}
```

Remova a assinatura antiga (`font`, `texts`, `relief`) e imports não usados (`Font`, `TextItem`).

**Step 4:** PASS.
**Step 5:** Commit `refactor(chaveiro): une contornos de texto e ícone no formato nome`.

---

## Task 5: Reescrever `buildKeychain`

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/buildKeychain.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/buildKeychain.test.ts`

**Step 1: Write failing tests (substitua os existentes que usam `width/height/relief`)**

```ts
it('gera conteúdo de texto com fontSize', () => {
  const result = buildKeychain(makeInput())
  expect(result.content).toBeDefined()
  expect(result.contentItems[0].halfWidth).toBeGreaterThan(0)
})

it('gera conteúdo de ícone a partir de SVG', () => {
  const params = {
    ...defaultKeychainParams,
    contents: [{
      id: 'i1', kind: 'icon' as const, svgIcon:
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>',
      iconScale: 1, iconLineWidth: 0.3, offsetX: 0, offsetY: 0,
    }],
  }
  const result = buildKeychain(makeInput({ params: params as KeychainParams }))
  expect(result.content).not.toBeNull()
})

it('engraved: pincel CSG corta a face frontal (z dentro da base)', () => {
  csgCalls.length = 0
  buildKeychain(makeInput({ params: { ...defaultKeychainParams, textMode: 'engraved' } }))
  const brush = csgCalls[0].text
  brush.computeBoundingBox()
  expect(brush.boundingBox!.max.z).toBeLessThanOrEqual(defaultKeychainParams.thickness + 0.21)
  expect(brush.boundingBox!.min.z).toBeGreaterThanOrEqual(
    defaultKeychainParams.thickness - defaultKeychainParams.reliefDepth - 0.21,
  )
})

it('formato nome aceita texto e ícone na mesma peça', () => {
  const params = {
    ...defaultKeychainParams,
    baseShape: 'name' as const,
    contents: [
      defaultKeychainParams.contents[0],
      { id: 'i1', kind: 'icon' as const, svgIcon:
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>',
        iconScale: 1, iconLineWidth: 0.3, offsetX: 0, offsetY: 0 },
    ],
  }
  const result = buildKeychain(makeInput({ params: params as KeychainParams }))
  expect(result.base).toBeDefined()
  expect(result.content).not.toBeNull()
})
```

**Step 2:** FAIL.

**Step 3: Implement**

Novos tipos:

```ts
export interface BuildContentItem {
  id: string
  halfWidth: number
  halfHeight: number
  geometry: BufferGeometry | null
}

export interface BuildKeychainResult {
  base: BufferGeometry
  content: BufferGeometry | null
  contentItems: BuildContentItem[]
  pieceBB: BoundingBox2D
  hole: Circle2D
}
```

No `buildKeychain` não-name:

```ts
const region = getUsableRegion(params)
const context: FitContext = {
  region, params, font: resolveFont(fonts, font, params.contents[0].fontStyle),
  referenceSize: 10,
}
const z = params.textMode === 'raised'
  ? params.thickness - 0.01
  : params.thickness - params.reliefDepth + ENGRAVE_EPSILON

for (const item of params.contents) {
  const fitted = resolveContentGeometry(item, context)
  if (!fitted) {
    contentItems.push({ id: item.id, halfWidth: 0, halfHeight: 0, geometry: null })
    continue
  }
  fitted.geometry.translate(fitted.x, fitted.y, z)
  contentGeometries.push(fitted.geometry)
  contentItems.push({
    id: item.id, halfWidth: fitted.halfWidth, halfHeight: fitted.halfHeight,
    geometry: fitted.geometry,
  })
}
```

`raised`: `const content = mergeGeometries(contentGeometries)`; se `null`, `content = null`. `base = mergedBase`.

`engraved`: se houver conteúdo, subtraia de `mergedBase`; senão retorne base com `content = null`.

No formato nome (`buildNameKeychain`):

```ts
const referenceSize = params.contents.find(i => i.kind === 'text')?.fontSize ?? 10
const allShapes = params.contents.flatMap(item =>
  buildContentShapes(item, resolveFont(fonts, font, 'bold'), referenceSize),
)
const { outline, boundingBox } = createNameOutline({
  shapes: allShapes, borderWidth: params.borderWidth, thickness: params.thickness,
})
const contentShape = unionShapes(allShapes)
const contentGeometry = new ExtrudeGeometry(contentShape, { depth: params.reliefDepth, bevelEnabled: false })
```

Aplique o mesmo `z` acima. Para `raised`, mescle `outline` + reforço + conteúdo. Para `engraved`, CSG subtrai o conteúdo de `outline` + reforço.

Ajuste `computeBaseBB` e a argola para usarem a bounding box da união.

**Step 4:** Rode `npx vitest run tests/features/studio/tools/chaveiros/chaveiro/buildKeychain.test.ts` → PASS.
**Step 5:** Commit `refactor(chaveiro): build com texto/ícone, auto-fit e união no formato nome`.

---

## Task 6: Atualizar o hook `useKeychain`

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/useKeychain.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/useKeychain.test.tsx`

**Step 1:** Atualize o mock de `buildKeychain` para `{ base, content, contentItems, pieceBB, hole }` e os testes:

```ts
it('inicia com 1 conteúdo de texto', () => {
  const { result } = renderHook(() => useKeychain())
  expect(result.current.params.contents).toHaveLength(1)
  expect(result.current.params.contents[0]).toMatchObject({ kind: 'text', content: 'Meu nome' })
})

it('addContent adiciona texto até 3', () => { /* addContent() x3 */ })
it('setContentType troca texto por ícone preservando id', () => { /* ... */ })
it('updateContent patcha fontSize/offset', () => { /* ... */ })
it('updateContent aceita svgIcon em item de ícone', () => { /* ... */ })
```

**Step 2:** FAIL.

**Step 3: Implement**

```ts
type KeychainAction =
  | { type: 'update'; key: keyof KeychainParams; value: number | string }
  | { type: 'updateContent'; id: string; patch: Partial<TextContent> | Partial<IconContent> }
  | { type: 'setContentType'; id: string; kind: 'text' | 'icon' }
  | { type: 'addContent' }
  | { type: 'removeContent'; id: string }
  | { type: 'reset' }
```

- `updateContent`: `state.contents.map(c => c.id === id ? { ...c, ...patch } : c)` e valide com `keychainParamsSchema`.
- `setContentType`: substitua o item por `{ ...TEXT_DEFAULTS, id, offsetX, offsetY }` ou `{ ...ICON_DEFAULTS, id, offsetX, offsetY }`.
- `addContent`: respeite `MAX=3`; default texto `{ content: 'Novo texto', fontSize: 10, ... }` com `crypto.randomUUID()`.
- `removeContent`: não remove se `length <= 1`.
- `update` e `reset` iguais.
- `uniqueStyles`: `params.contents.filter(c => c.kind === 'text').map(c => c.fontStyle)`.
- `updateParam` type: `number | string`.

Exponha `updateContent`, `addContent`, `removeContent`, `setContentType`.

**Step 4:** PASS.
**Step 5:** Commit `refactor(chaveiro): estado por item de conteúdo`.

---

## Task 7: Reformular o painel

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/StudioPanel.tsx`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/StudioPanel.test.tsx`

**Step 1:** Atualize o helper `renderPanel` e os testes:

```ts
it('renderiza toggle Texto/Ícone do item selecionado', () => {
  renderPanel()
  expect(screen.getByRole('radio', { name: /texto/i })).toBeChecked()
  expect(screen.getByRole('radio', { name: /ícone/i })).toBeInTheDocument()
})

it('mostra slider de fonte em mm para texto', () => {
  renderPanel()
  expect(screen.getByLabelText('Tamanho da fonte')).toBeInTheDocument()
})

it('mostra upload SVG ao trocar para ícone', async () => {
  const user = userEvent.setup()
  const onSetContentType = vi.fn()
  renderPanel({ onSetContentType })
  await user.click(screen.getByRole('radio', { name: /ícone/i }))
  expect(onSetContentType).toHaveBeenCalledWith(firstContentId, 'icon')
})

it('renderiza blocos Conteúdo, Formato, Relevo, Argola, Aparência', () => {
  renderPanel()
  for (const name of [/conteúdo/i, /formato/i, /relevo/i, /argola/i, /aparência/i]) {
    expect(screen.getByText(name)).toBeInTheDocument()
  }
})
```

**Step 2:** FAIL.

**Step 3: Implement**

Props:

```ts
interface StudioPanelProps {
  params: KeychainParams
  selectedContentId: string
  onSelectContent: (id: string) => void
  onUpdateContent: (id: string, patch: Partial<TextContent> | Partial<IconContent>) => void
  onSetContentType: (id: string, kind: 'text' | 'icon') => void
  onAddContent: () => void
  onRemoveContent: (id: string) => void
  onUpdateParam: (key: keyof KeychainParams, value: number | string) => void
  onReset: () => void
  onOpenEditor: () => void
}
```

Blocos:
1. **Conteúdo** — chips dos itens; botão Adicionar; `RadioGroupField` Texto/Ícone; texto → `TextField` (max 12), `SelectField` estilo, `SliderField` "Tamanho da fonte" 6–15; ícone → input file oculto + botão Upload/Trocar/Remover, `SliderField` escala 0.5–1 e espessura 0.1–1.5; botão "✥ Posicionar".
2. **Formato** — shape, width/height condicionais, thickness, borderWidth.
3. **Relevo** — `SelectField` raised/engraved + `SliderField` "Profundidade do relevo" 0.4–2.
4. **Argola** — controles existentes.
5. **Aparência** — cores.

Use `params.contents.find(...)`. O upload usa `FileReader.readAsText` e chama `onUpdateContent(id, { svgIcon })`.

**Step 4:** PASS.
**Step 5:** Commit `feat(chaveiro): painel com conteúdo texto/ícone e seções do carimbo`.

---

## Task 8: Atualizar o editor 2D

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/TextPositionEditor.tsx`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/TextPositionEditor.test.tsx`

**Step 1:** Atualize o helper de render para novas props `geometry`, `selectedContentId`, `onSelectContent`, `onMoveContent`. Adicione:

```ts
it('renderiza caixa ajustada de item de ícone', () => {
  renderEditor({ geometry: { contentItems: [{ id: 'i1', halfWidth: 4, halfHeight: 3, geometry: null }] } })
  expect(screen.getByTestId('editor-content-i1')).toBeInTheDocument()
  expect(screen.getByText('ícone')).toBeInTheDocument()
})

it('move item usando offset clampado', async () => {
  // pointerdown/up e expect onMoveContent
})
```

**Step 2:** FAIL.

**Step 3: Implement**

- Props: `geometry: BuildKeychainResult | null`.
- Para cada item em `params.contents`, use `geometry?.contentItems.find(i => i.id === item.id)` para `halfWidth/halfHeight` (fallback `4/3` se ainda não construído).
- Renderize `<rect x={x - halfWidth} y={-y - halfHeight} width={halfWidth*2} height={halfHeight*2}>`; para texto, `<text>` com `item.content`; para ícone, `<text>ícone</text>`.
- No `onUp`, use `clampOffset(getUsableRegion(params)!, halfWidth, halfHeight, pos)` para retângulo/círculo; para `name`, mantenha o clamp atual por `pieceBB`.
- No formato nome, desenhe a base a partir de `geometry.pieceBB` (retângulo) em vez de `createNameBaseShape`; remova `createNameBaseShape`.
- `onMoveText` → `onMoveContent`.

**Step 4:** PASS.
**Step 5:** Commit `refactor(chaveiro): editor posiciona textos e ícones ajustados`.

---

## Task 9: Preview, export e integração no StudioPage

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/KeychainPreview.tsx`
- Modify: `src/features/studio/tools/chaveiros/chaveiro/exportStl.ts`
- Modify: `src/features/studio/StudioPage.tsx` (wrapper `ChaveiroToolWrapper`)
- Tests: `tests/features/studio/tools/chaveiros/chaveiro/exportStl.test.ts`

**Step 1:** Atualize `exportStl.test`:

```ts
it('exporta base + content', () => {
  exportStl({ base: baseGeo, content: contentGeo, contentItems: [], pieceBB: ..., hole: ... }, 'Projeto')
  expect(mergeSpy).toHaveBeenCalledWith([baseGeo, contentGeo])
})

it('exporta só a base quando não há content', () => { /* content: null */ })
```

**Step 2:** FAIL.

**Step 3: Implement**

`exportStl.ts`:

```ts
const geometries = geometry.content ? [geometry.base, geometry.content] : [geometry.base]
const merged = mergeGeometries(geometries) ?? geometry.base
```

`KeychainPreview.tsx`: `geometry.text` → `geometry.content`; renderize apenas se não for `null`.

`StudioPage.tsx`:
- `updateText` → `updateContent`, `addText` → `addContent`, `removeText` → `removeContent`; adicione `setContentType`, `selectedContentId`, `onSelectContent`.
- `handleAddContent`: chame `addContent()` e selecione o último item após o próximo render (efeito comparando `params.contents.length`).
- `handleMoveContent` → `updateContent(id, { offsetX, offsetY })`.
- Passe `geometry` ao `TextPositionEditor`.
- `params.texts` → `params.contents`.

**Step 4:** Rode `npx vitest run tests/features/studio/tools/chaveiros/chaveiro/exportStl.test.ts` e os testes do StudioPage → PASS.
**Step 5:** Commit `refactor(chaveiro): preview/export/integração com content`.

---

## Task 10: Docs e verificação final

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Step 1:** Atualize a tabela de parâmetros do AGENTS: `texts[]` → `contents[]` com `kind`, `fontSize`, `svgIcon`, `iconScale`, `iconLineWidth`; adicione `reliefDepth`. Descreva o motor de auto-fit e a união texto+ícone no formato nome. Em `docs/frontend/studio.md`, atualize a seção "Gerador de chaveiros" e a tabela "Como editar" com `autoFit.ts`.

**Step 2:** Rode:

```bash
npm run typecheck
npm run lint
npm test
```

**Expected:** typecheck limpo, lint sem erros, todos os testes passando.

**Step 3:** Commit `docs(chaveiro): documenta conteúdo texto/ícone e auto-fit`.
