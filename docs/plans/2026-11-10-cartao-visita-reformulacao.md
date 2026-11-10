# Reformulação do Cartão de Visita — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reescrever a ferramenta Cartão de Visita com o pipeline do Chaveiro: conteúdo livre (texto/ícone), auto-fit, build em Web Worker, editor 2D, preview de 2 materiais e export STL.

**Architecture:** Zod valida 1–3 conteúdos discriminados (`text` | `icon`). A geometria é gerada em `buildCard.ts`, executado em `buildCard.worker.ts`; `useCard.ts` mantém o estado, parseia SVGs na main thread e faz debounce. O painel usa os componentes Amplify UI já padrão do Studio, e o editor SVG posiciona os itens por pointer/touch e teclado.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Amplify UI, Tailwind, Vitest, Web Worker.

---

## Pré-requisitos

- Ler o design aprovado: `docs/plans/2026-11-10-cartao-visita-reformulacao-design.md`.
- Referências de implementação: `src/features/studio/tools/chaveiros/chaveiro/` (pipeline completo) e `docs/frontend/studio.md`.
- Criar uma branch antes de começar:

```bash
git checkout -b feat/cartao-visita-reformulacao
```

- Comandos de validação usados no plano:

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita
npm run typecheck
npm run lint
npm test
npm run build
```

---

### Task 1: Schema, constantes e defaults

**Files:**
- Modify: `src/features/studio/tools/letreiros/cartao-visita/schema.ts`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/schema.test.ts`

**Step 1: Escrever o teste falho**

Substitua todo o conteúdo de `tests/features/studio/tools/letreiros/cartao-visita/schema.test.ts` por:

```ts
import {
  BASE_BEVEL,
  CONTENT_DEPTH,
  CONTENT_MARGIN,
  PLA_COLORS,
  cardParamsSchema,
  defaultCardParams,
  normalizeName,
  sanitizeFilename,
  textContentSchema,
  type CardContent,
} from '@/features/studio/tools/letreiros/cartao-visita/schema'

function textContent(overrides: Partial<CardContent> = {}): CardContent {
  return {
    ...defaultCardParams.contents[0],
    ...overrides,
  } as CardContent
}

describe('cartao-visita schema', () => {
  it('defaults são válidos', () => {
    expect(cardParamsSchema.parse(defaultCardParams)).toEqual(defaultCardParams)
  })

  it('exporta constantes do domínio', () => {
    expect(CONTENT_DEPTH).toBe(1)
    expect(CONTENT_MARGIN).toBe(3)
    expect(BASE_BEVEL).toBe(0.1)
  })

  it('aceita 1, 2 e 3 conteúdos', () => {
    for (const count of [1, 2, 3]) {
      const contents = defaultCardParams.contents.slice(0, count)
      expect(cardParamsSchema.safeParse({ ...defaultCardParams, contents }).success).toBe(true)
    }
  })

  it('rejeita 0 e 4 conteúdos', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, contents: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, index) => ({
      ...textContent(),
      id: `c${index}`,
    }))
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, contents: four }).success).toBe(false)
  })

  it('remove layout, textMode e relevo do modelo', () => {
    const parsed = cardParamsSchema.parse({
      ...defaultCardParams,
      layout: 'left',
      textMode: 'engraved',
    })
    expect(parsed).not.toHaveProperty('layout')
    expect(parsed).not.toHaveProperty('textMode')
    expect(parsed.contents[0]).not.toHaveProperty('relief')
  })

  it('aceita texto vazio e sem limite de caracteres', () => {
    const empty = textContent({ content: '' })
    const long = textContent({ content: 'x'.repeat(200) })
    expect(textContentSchema.safeParse(empty).success).toBe(true)
    expect(textContentSchema.safeParse(long).success).toBe(true)
  })

  it('valida os ranges do texto', () => {
    const valid = textContent()
    expect(textContentSchema.safeParse({ ...valid, fontSize: 2.9 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...valid, fontSize: 12.1 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...valid, offsetX: -41 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...valid, offsetY: 41 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...valid, fontSize: 3 }).success).toBe(true)
    expect(textContentSchema.safeParse({ ...valid, fontSize: 12 }).success).toBe(true)
  })

  it('valida os ranges do ícone', () => {
    const icon: CardContent = {
      id: 'icon-1',
      kind: 'icon',
      svgIcon: null,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, contents: [icon] }).success).toBe(true)
    expect(cardParamsSchema.safeParse({
      ...defaultCardParams,
      contents: [{ ...icon, iconScale: 0.4 }],
    }).success).toBe(false)
    expect(cardParamsSchema.safeParse({
      ...defaultCardParams,
      contents: [{ ...icon, iconLineWidth: 1.6 }],
    }).success).toBe(false)
  })

  it('valida dimensões, espessura e cantos', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, width: 49 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, width: 90 }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, height: 29 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, height: 60 }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, thickness: 0.9 }).success).toBe(false)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, thickness: 3 }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, cornerRadius: 11 }).success).toBe(false)
  })

  it('aceita apenas cores PLA válidas', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, baseColor: '#14b8a6' }).success).toBe(true)
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, baseColor: '#ff0000' }).success).toBe(false)
    expect(PLA_COLORS).toHaveLength(10)
  })

  it('productType é literal card', () => {
    expect(cardParamsSchema.safeParse({ ...defaultCardParams, productType: 'keychain' }).success).toBe(false)
  })

  it('normalizeName remove acentos e cedilha', () => {
    expect(normalizeName('José Ção')).toBe('Jose Cao')
  })

  it('sanitizeFilename remove caracteres inválidos', () => {
    expect(sanitizeFilename('Meu Cartão! @#')).toBe('Meu-Carto')
    expect(sanitizeFilename('')).toBe('cartao-visita')
  })
})
```

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/schema.test.ts
```

Esperado: FAIL porque `BASE_BEVEL`, `defaultCardParams.contents` discriminados e os helpers ainda não existem.

**Step 3: Implementar o schema**

Substitua `src/features/studio/tools/letreiros/cartao-visita/schema.ts` por:

```ts
import { z } from 'zod'

export const CONTENT_DEPTH = 1
export const CONTENT_MARGIN = 3
export const BASE_BEVEL = 0.1

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

const contentFields = {
  id: z.string().min(1),
  offsetX: z.number().min(-40).max(40),
  offsetY: z.number().min(-40).max(40),
}

export const textContentSchema = z.object({
  ...contentFields,
  kind: z.literal('text'),
  content: z.string().trim(),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(3).max(12),
})

export const iconContentSchema = z.object({
  ...contentFields,
  kind: z.literal('icon'),
  svgIcon: z.string().min(1).nullable(),
  iconScale: z.number().min(0.5).max(1),
  iconLineWidth: z.number().min(0.1).max(1.5),
})

export const contentItemSchema = z.discriminatedUnion('kind', [
  textContentSchema,
  iconContentSchema,
])

export type TextContent = z.infer<typeof textContentSchema>
export type IconContent = z.infer<typeof iconContentSchema>
export type CardContent = z.infer<typeof contentItemSchema>
export type FontStyle = TextContent['fontStyle']

export const cardParamsSchema = z.object({
  productType: z.literal('card'),
  width: z.number().min(50).max(90),
  height: z.number().min(30).max(60),
  thickness: z.number().min(1).max(3),
  cornerRadius: z.number().min(0).max(10),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  contents: z.array(contentItemSchema).min(1).max(3),
})

export type CardParams = z.infer<typeof cardParamsSchema>

const defaultContents: CardContent[] = [
  {
    id: 'content-1',
    kind: 'text',
    content: 'Seu Nome',
    fontStyle: 'bold',
    fontSize: 7,
    offsetX: 0,
    offsetY: 10,
  },
  {
    id: 'content-2',
    kind: 'text',
    content: 'Seu Cargo',
    fontStyle: 'normal',
    fontSize: 4,
    offsetX: 0,
    offsetY: 0,
  },
  {
    id: 'content-3',
    kind: 'text',
    content: 'seu@email.com',
    fontStyle: 'normal',
    fontSize: 3,
    offsetX: 0,
    offsetY: -10,
  },
]

export const defaultCardParams: CardParams = {
  productType: 'card',
  width: 85,
  height: 55,
  thickness: 2,
  cornerRadius: 3,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  contents: defaultContents,
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/gi, 'c')
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'cartao-visita'
}
```

**Step 4: Rodar o teste novamente**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/schema.test.ts
```

Esperado: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/schema.ts tests/features/studio/tools/letreiros/cartao-visita/schema.test.ts
git commit -m "feat(cartao-visita): reformula schema com conteúdos livres"
```

---

### Task 2: Forma do cartão (`shapes.ts`)

**Files:**
- Create: `src/features/studio/tools/letreiros/cartao-visita/shapes.ts`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/shapes.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/cartao-visita/shapes.test.ts`:

```ts
import { createCardShape } from '@/features/studio/tools/letreiros/cartao-visita/shapes'

function bounds(shape: ReturnType<typeof createCardShape>) {
  const points = shape.getPoints(64)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    points,
  }
}

describe('createCardShape', () => {
  it('respeita as dimensões externas', () => {
    const result = bounds(createCardShape(85, 55, 3))
    expect(result.width).toBeCloseTo(85, 1)
    expect(result.height).toBeCloseTo(55, 1)
  })

  it('gera mais pontos com cantos arredondados', () => {
    const sharp = createCardShape(85, 55, 0).getPoints(8)
    const rounded = createCardShape(85, 55, 3).getPoints(8)
    expect(rounded.length).toBeGreaterThan(sharp.length)
  })

  it('clampa o raio à metade do menor lado', () => {
    const result = bounds(createCardShape(50, 20, 100))
    expect(result.width).toBeCloseTo(50, 1)
    expect(result.height).toBeCloseTo(20, 1)
  })
})
```

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/shapes.test.ts
```

Esperado: FAIL porque `shapes.ts` não existe.

**Step 3: Implementar `shapes.ts`**

Crie `src/features/studio/tools/letreiros/cartao-visita/shapes.ts`:

```ts
import { Shape } from 'three'

/**
 * Contorno retangular centralizado na origem, com cantos arredondados.
 * O raio é limitado à metade do menor lado para não degenerar a forma.
 */
export function createCardShape(width: number, height: number, radius: number): Shape {
  const shape = new Shape()
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  const halfWidth = width / 2
  const halfHeight = height / 2

  if (r <= 0) {
    shape.moveTo(-halfWidth, -halfHeight)
    shape.lineTo(halfWidth, -halfHeight)
    shape.lineTo(halfWidth, halfHeight)
    shape.lineTo(-halfWidth, halfHeight)
    shape.closePath()
    return shape
  }

  shape.moveTo(-halfWidth + r, -halfHeight)
  shape.lineTo(halfWidth - r, -halfHeight)
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r)
  shape.lineTo(halfWidth, halfHeight - r)
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight)
  shape.lineTo(-halfWidth + r, halfHeight)
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r)
  shape.lineTo(-halfWidth, -halfHeight + r)
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight)
  shape.closePath()

  return shape
}
```

**Step 4: Rodar o teste novamente**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/shapes.test.ts
```

Esperado: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/shapes.ts tests/features/studio/tools/letreiros/cartao-visita/shapes.test.ts
git commit -m "feat(cartao-visita): adiciona forma do cartão com cantos arredondados"
```

---

### Task 3: Auto-fit e clamp (`autoFit.ts`)

**Files:**
- Create: `src/features/studio/tools/letreiros/cartao-visita/autoFit.ts`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/autoFit.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/cartao-visita/autoFit.test.ts`:

```ts
import * as THREE from 'three'
import {
  clampOffset,
  fitGeometryToRegion,
  getUsableRegion,
  resolveContentGeometry,
} from '@/features/studio/tools/letreiros/cartao-visita/autoFit'
import { defaultCardParams, type CardContent } from '@/features/studio/tools/letreiros/cartao-visita/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

const SVG_RECT =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>'

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text?: string, parameters?: { size: number; depth: number }) {
      super()
      if (!parameters) return
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
           -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

const fontStub = { glyphs: {} } as never

function textItem(overrides: Partial<CardContent> = {}): CardContent {
  return {
    id: 'content-1',
    kind: 'text',
    content: 'Nome',
    fontStyle: 'bold',
    fontSize: 8,
    offsetX: 0,
    offsetY: 0,
    ...overrides,
  } as CardContent
}

function geometryBounds(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  return {
    width: bb.max.x - bb.min.x,
    height: bb.max.y - bb.min.y,
    minZ: bb.min.z,
    centerX: (bb.min.x + bb.max.x) / 2,
    centerY: (bb.min.y + bb.max.y) / 2,
  }
}

describe('autoFit', () => {
  it('define a área útil recuada pela margem', () => {
    expect(getUsableRegion(defaultCardParams)).toEqual({
      kind: 'rect',
      minX: -39.5,
      maxX: 39.5,
      minY: -24.5,
      maxY: 24.5,
    })
  })

  it('reduz apenas quando necessário e centraliza', () => {
    const region = getUsableRegion(defaultCardParams)
    const geometry = new THREE.BoxGeometry(100, 10, 1)
    fitGeometryToRegion(geometry, region)
    const result = geometryBounds(geometry)
    expect(result.width).toBeCloseTo(79, 1)
    expect(result.height).toBeCloseTo(7.9, 1)
    expect(result.centerX).toBeCloseTo(0, 5)
    expect(result.centerY).toBeCloseTo(0, 5)
    expect(result.minZ).toBeCloseTo(0, 5)
  })

  it('nunca amplia a geometria', () => {
    const region = getUsableRegion(defaultCardParams)
    const geometry = new THREE.BoxGeometry(10, 10, 1)
    fitGeometryToRegion(geometry, region)
    const result = geometryBounds(geometry)
    expect(result.width).toBeCloseTo(10, 5)
    expect(result.height).toBeCloseTo(10, 5)
  })

  it('clampa o offset dentro da área útil', () => {
    const region = getUsableRegion(defaultCardParams)
    const clamped = clampOffset(region, 8, 4, { x: 100, y: -100 })
    expect(clamped.x).toBeCloseTo(31.5, 5)
    expect(clamped.y).toBeCloseTo(-20.5, 5)
  })

  it('resolve texto com auto-fit e offset', () => {
    const region = getUsableRegion(defaultCardParams)
    const fitted = resolveContentGeometry(
      textItem({ offsetX: 10 }),
      { region, font: fontStub },
    )
    expect(fitted).not.toBeNull()
    expect(fitted!.halfWidth).toBeCloseTo(16, 1)
    expect(fitted!.halfHeight).toBeCloseTo(4, 1)
    expect(fitted!.x).toBeCloseTo(10, 5)
    expect(fitted!.y).toBeCloseTo(0, 5)
  })

  it('retorna null para texto vazio ou sem fonte', () => {
    const region = getUsableRegion(defaultCardParams)
    expect(resolveContentGeometry(textItem({ content: '' }), { region, font: fontStub })).toBeNull()
    expect(resolveContentGeometry(textItem(), { region })).toBeNull()
  })

  it('resolve ícone SVG dentro da caixa', () => {
    const region = getUsableRegion(defaultCardParams)
    const iconItem: CardContent = {
      id: 'icon-1',
      kind: 'icon',
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    const parsed = parseSvg(SVG_RECT)
    expect(parsed).not.toBeNull()
    const fitted = resolveContentGeometry(iconItem, { region }, parsed)
    expect(fitted).not.toBeNull()
    expect(fitted!.halfWidth).toBeGreaterThan(0)
    expect(fitted!.halfHeight).toBeGreaterThan(0)
  })
})
```

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/autoFit.test.ts
```

Esperado: FAIL porque `autoFit.ts` não existe.

**Step 3: Implementar `autoFit.ts`**

Crie `src/features/studio/tools/letreiros/cartao-visita/autoFit.ts`:

```ts
import { type BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import {
  buildSvgIconGeometryInBoxFromParsed,
  parseSvg,
  type ParsedSvg,
} from '../../confeitaria/shared/svgToIconShape'
import {
  CONTENT_DEPTH,
  CONTENT_MARGIN,
  type CardContent,
  type CardParams,
} from './schema'
import { textToGeometry } from './textToGeometry'

export interface RectRegion {
  kind: 'rect'
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface FitContext {
  region: RectRegion
  font?: Font
}

export interface FittedContent {
  geometry: BufferGeometry
  halfWidth: number
  halfHeight: number
  x: number
  y: number
}

export function getUsableRegion(params: CardParams): RectRegion {
  const halfWidth = Math.max(0.5, params.width / 2 - CONTENT_MARGIN)
  const halfHeight = Math.max(0.5, params.height / 2 - CONTENT_MARGIN)
  return {
    kind: 'rect',
    minX: -halfWidth,
    maxX: halfWidth,
    minY: -halfHeight,
    maxY: halfHeight,
  }
}

export function fitGeometryToRegion(geometry: BufferGeometry, region: RectRegion): void {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (!bb) return

  const width = bb.max.x - bb.min.x
  const height = bb.max.y - bb.min.y
  const scale = Math.min(
    1,
    ratio(region.maxX - region.minX, width),
    ratio(region.maxY - region.minY, height),
  )

  if (scale < 1) {
    geometry.scale(scale, scale, 1)
    geometry.computeBoundingBox()
  }

  const fitted = geometry.boundingBox
  if (!fitted) return

  const centerX = (fitted.min.x + fitted.max.x) / 2
  const centerY = (fitted.min.y + fitted.max.y) / 2
  geometry.translate(-centerX, -centerY, -fitted.min.z)
}

export function clampOffset(
  region: RectRegion,
  halfWidth: number,
  halfHeight: number,
  offset: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: Math.min(region.maxX - halfWidth, Math.max(region.minX + halfWidth, offset.x)),
    y: Math.min(region.maxY - halfHeight, Math.max(region.minY + halfHeight, offset.y)),
  }
}

export function resolveContentGeometry(
  item: CardContent,
  ctx: FitContext,
  parsedSvg?: ParsedSvg | null,
): FittedContent | null {
  if (item.kind === 'text') {
    if (!item.content.trim() || !ctx.font) return null
    const geometry = textToGeometry({
      font: ctx.font,
      text: item.content,
      size: item.fontSize,
      depth: CONTENT_DEPTH,
    })
    fitGeometryToRegion(geometry, ctx.region)
    return fittedContent(geometry, item, ctx.region)
  }

  const parsed = resolveParsedSvg(item, parsedSvg)
  if (!parsed) return null

  const geometry = safeIconGeometry(() => buildSvgIconGeometryInBoxFromParsed(parsed, {
    maxWidth: ctx.region.maxX - ctx.region.minX,
    maxHeight: ctx.region.maxY - ctx.region.minY,
    lineWidth: item.iconLineWidth,
    iconScale: item.iconScale,
    depth: CONTENT_DEPTH,
  }))
  if (!geometry) return null

  fitGeometryToRegion(geometry, ctx.region)
  return fittedContent(geometry, item, ctx.region)
}

function ratio(available: number, size: number): number {
  return size > 0 ? available / size : Infinity
}

function resolveParsedSvg(
  item: Extract<CardContent, { kind: 'icon' }>,
  parsedSvg: ParsedSvg | null | undefined,
): ParsedSvg | null {
  if (parsedSvg === null) return null
  if (parsedSvg) return parsedSvg
  if (!item.svgIcon) return null
  try {
    return parseSvg(item.svgIcon)
  } catch {
    return null
  }
}

function safeIconGeometry(create: () => BufferGeometry | null): BufferGeometry | null {
  try {
    return create()
  } catch {
    return null
  }
}

function fittedContent(
  geometry: BufferGeometry,
  item: CardContent,
  region: RectRegion,
): FittedContent {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  const halfWidth = bb ? (bb.max.x - bb.min.x) / 2 : 0
  const halfHeight = bb ? (bb.max.y - bb.min.y) / 2 : 0
  const position = clampOffset(region, halfWidth, halfHeight, {
    x: item.offsetX,
    y: item.offsetY,
  })
  return { geometry, halfWidth, halfHeight, x: position.x, y: position.y }
}
```

**Step 4: Rodar o teste novamente**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/autoFit.test.ts
```

Esperado: PASS (o teste de texto usa o mock de `TextGeometry`).

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/autoFit.ts tests/features/studio/tools/letreiros/cartao-visita/autoFit.test.ts
git commit -m "feat(cartao-visita): adiciona auto-fit e clamp do conteúdo"
```

---

### Task 4: Texto 3D (`textToGeometry.ts`)

**Files:**
- Create: `src/features/studio/tools/letreiros/cartao-visita/textToGeometry.ts`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/textToGeometry.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/cartao-visita/textToGeometry.test.ts`:

```ts
import * as THREE from 'three'
import { textToGeometry } from '@/features/studio/tools/letreiros/cartao-visita/textToGeometry'

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text: string, parameters: { size: number; depth: number }) {
      super()
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
           -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

const fontStub = { glyphs: {} } as never

describe('textToGeometry', () => {
  it('gera geometria centralizada com proporção do tamanho', () => {
    const geometry = textToGeometry({ font: fontStub, text: 'ANA', size: 16, depth: 1 })
    geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    geometry.boundingBox?.getSize(size)
    expect(size.x).toBeCloseTo(64, 0)
    expect(size.y).toBeCloseTo(16, 0)
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-size.x / 2, 0)
  })

  it('usa depth como profundidade em z', () => {
    const geometry = textToGeometry({ font: fontStub, text: 'ANA', size: 16, depth: 1 })
    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.max.z).toBeGreaterThan(0)
  })
})
```

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/textToGeometry.test.ts
```

Esperado: FAIL porque `textToGeometry.ts` não existe.

**Step 3: Implementar `textToGeometry.ts`**

Crie `src/features/studio/tools/letreiros/cartao-visita/textToGeometry.ts`:

```ts
import type { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { normalizeName } from './schema'

interface TextToGeometryInput {
  font: Font
  text: string
  size: number
  depth: number
}

export function textToGeometry({ font, text, size, depth }: TextToGeometryInput): BufferGeometry {
  const geometry = new TextGeometry(normalizeName(text), {
    font,
    size,
    depth,
    curveSegments: 8,
    bevelEnabled: false,
  })
  geometry.center()
  return geometry
}
```

**Step 4: Rodar o teste novamente**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/textToGeometry.test.ts
```

Esperado: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/textToGeometry.ts tests/features/studio/tools/letreiros/cartao-visita/textToGeometry.test.ts
git commit -m "feat(cartao-visita): adiciona geometria de texto normalizada"
```

---

### Task 5: Build do cartão (`buildCard.ts`)

**Files:**
- Modify: `src/features/studio/tools/letreiros/cartao-visita/buildCard.ts`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/buildCard.test.ts`

**Step 1: Escrever o teste falho**

Substitua `tests/features/studio/tools/letreiros/cartao-visita/buildCard.test.ts` por:

```ts
import * as THREE from 'three'
import { buildCard, type BuildCardInput } from '@/features/studio/tools/letreiros/cartao-visita/buildCard'
import {
  BASE_BEVEL,
  CONTENT_DEPTH,
  defaultCardParams,
  type CardContent,
  type CardParams,
} from '@/features/studio/tools/letreiros/cartao-visita/schema'
import { parseSvg } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

const SVG_RECT =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>'

const fontStub = { glyphs: {} } as never

vi.mock('three/examples/jsm/geometries/TextGeometry.js', () => ({
  TextGeometry: class extends THREE.BufferGeometry {
    constructor(_text?: string, parameters?: { size: number; depth: number }) {
      super()
      if (!parameters) return
      const w = parameters.size * 4
      const h = parameters.size
      const d = parameters.depth
      this.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0,
           -w / 2, -h / 2, d, w / 2, -h / 2, d, w / 2, h / 2, d, -w / 2, h / 2, d],
          3,
        ),
      )
      this.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 7, 4, 0, 3, 7, 1, 5, 6, 1, 6, 2])
    }
  },
}))

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: (geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    if (geos.length === 1) return geos[0].clone()
    const merged = new THREE.BufferGeometry()
    const posArrays: Float32Array[] = []
    const idxArrays: number[][] = []
    let vertexOffset = 0
    for (const geo of geos) {
      const pos = geo.getAttribute('position') as THREE.BufferAttribute
      posArrays.push(new Float32Array(pos.array))
      const idx = geo.getIndex()
      if (idx) idxArrays.push(Array.from(idx.array).map((v) => v + vertexOffset))
      vertexOffset += pos.count
    }
    const allPos = new Float32Array(posArrays.reduce((sum, array) => sum + array.length, 0))
    let offset = 0
    for (const array of posArrays) {
      allPos.set(array, offset)
      offset += array.length
    }
    merged.setAttribute('position', new THREE.BufferAttribute(allPos, 3))
    if (idxArrays.length > 0) merged.setIndex(idxArrays.flat())
    return merged
  },
}))

function makeInput(
  params: Partial<CardParams> = {},
  extra: Partial<BuildCardInput> = {},
): BuildCardInput {
  return {
    fonts: { bold: fontStub, normal: fontStub, serif: fontStub },
    params: { ...defaultCardParams, ...params },
    onError: () => undefined,
    ...extra,
  }
}

function boundsOf(geometry: THREE.BufferGeometry | null): THREE.Box3 {
  if (!geometry) throw new Error('geometria ausente')
  geometry.computeBoundingBox()
  return geometry.boundingBox!
}

function textItem(overrides: Partial<CardContent> = {}): CardContent {
  return {
    id: 'content-1',
    kind: 'text',
    content: 'Nome',
    fontStyle: 'bold',
    fontSize: 4,
    offsetX: 0,
    offsetY: 0,
    ...overrides,
  } as CardContent
}

describe('buildCard', () => {
  it('gera base com dimensões e espessura corretas', () => {
    const result = buildCard(makeInput())
    const bb = boundsOf(result.base)
    expect(bb.max.x - bb.min.x).toBeCloseTo(85, 0)
    expect(bb.max.y - bb.min.y).toBeCloseTo(55, 0)
    expect(bb.max.z - bb.min.z).toBeCloseTo(2 + 2 * BASE_BEVEL, 1)
    expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(0, 5)
    expect((bb.min.y + bb.max.y) / 2).toBeCloseTo(0, 5)
  })

  it('respeita largura, altura e espessura customizadas', () => {
    const result = buildCard(makeInput({ width: 70, height: 40, thickness: 1 }))
    const bb = boundsOf(result.base)
    expect(bb.max.x - bb.min.x).toBeCloseTo(70, 0)
    expect(bb.max.y - bb.min.y).toBeCloseTo(40, 0)
    expect(bb.max.z - bb.min.z).toBeCloseTo(1 + 2 * BASE_BEVEL, 1)
  })

  it('muda a geometria quando o raio dos cantos muda', () => {
    const sharp = buildCard(makeInput({ cornerRadius: 0 }))
    const rounded = buildCard(makeInput({ cornerRadius: 5 }))
    const a = Array.from(sharp.base.getAttribute('position').array)
    const b = Array.from(rounded.base.getAttribute('position').array)
    expect(a).not.toEqual(b)
  })

  it('sem fontes gera base e nenhum conteúdo', () => {
    const result = buildCard(makeInput({}, { fonts: {} }))
    expect(result.content).toBeNull()
    expect(result.contentItems).toHaveLength(3)
    expect(result.contentItems[0].geometry).toBeNull()
    expect(result.contentItems[0].halfWidth).toBe(0)
  })

  it('gera conteúdo de texto com relevo fixo de 1 mm', () => {
    const result = buildCard(makeInput())
    expect(result.content).not.toBeNull()
    const bb = boundsOf(result.content)
    expect(bb.min.z).toBeCloseTo(2 + BASE_BEVEL - 0.01, 2)
    expect(bb.max.z - bb.min.z).toBeCloseTo(CONTENT_DEPTH, 1)
    expect(result.contentItems[0].halfWidth).toBeGreaterThan(0)
    expect(result.contentItems[0].halfHeight).toBeGreaterThan(0)
  })

  it('aplica offset X e Y no conteúdo', () => {
    const result = buildCard(makeInput({
      contents: [textItem({ offsetX: 10, offsetY: -5 })],
    }))
    const bb = boundsOf(result.content)
    expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(10, 1)
    expect((bb.min.y + bb.max.y) / 2).toBeCloseTo(-5, 1)
  })

  it('clampa o offset à área útil', () => {
    const result = buildCard(makeInput({
      contents: [textItem({ fontSize: 4, offsetX: 100 })],
    }))
    const bb = boundsOf(result.content)
    expect(bb.max.x).toBeLessThanOrEqual(39.5 + 0.01)
  })

  it('gera conteúdo de ícone a partir do SVG parseado', () => {
    const icon: CardContent = {
      id: 'icon-1',
      kind: 'icon',
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    const parsed = parseSvg(SVG_RECT)
    const result = buildCard(makeInput(
      { contents: [icon] },
      { parsedSvgs: { 'icon-1': parsed } },
    ))
    expect(result.content).not.toBeNull()
    expect(result.contentItems[0].halfWidth).toBeGreaterThan(0)
  })

  it('ignora texto vazio', () => {
    const result = buildCard(makeInput({ contents: [textItem({ content: '' })] }))
    expect(result.content).toBeNull()
    expect(result.contentItems[0].halfWidth).toBe(0)
  })
})
```

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/buildCard.test.ts
```

Esperado: FAIL porque o `BuildCardResult` atual expõe `text`/`textBlocks`.

**Step 3: Implementar `buildCard.ts`**

Substitua `src/features/studio/tools/letreiros/cartao-visita/buildCard.ts` por:

```ts
import { type BufferGeometry, ExtrudeGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getUsableRegion, resolveContentGeometry } from './autoFit'
import { createCardShape } from './shapes'
import {
  BASE_BEVEL,
  type CardParams,
  type FontStyle,
} from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'

export interface BuildCardInput {
  params: CardParams
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  parsedSvgs?: Record<string, ParsedSvg | null>
  onError?: (message: string) => void
}

export interface BuildContentItem {
  id: string
  halfWidth: number
  halfHeight: number
  geometry: BufferGeometry | null
}

export interface BuildCardResult {
  base: BufferGeometry
  content: BufferGeometry | null
  contentItems: BuildContentItem[]
}

function resolveFont(
  fonts: Partial<Record<FontStyle, Font>> | undefined,
  font: Font | undefined,
  style: FontStyle,
): Font | undefined {
  return fonts?.[style] ?? font
}

function mergeOrFirst(
  geometries: BufferGeometry[],
  onError?: (message: string) => void,
): BufferGeometry {
  const merged = mergeGeometries(geometries)
  if (merged) return merged
  onError?.('Falha ao combinar geometrias')
  return geometries[0] ?? new BufferGeometry()
}

function disposeAll(geometries: BufferGeometry[], keep?: BufferGeometry): void {
  for (const geometry of geometries) {
    if (geometry !== keep) geometry.dispose()
  }
}

export function buildCard({
  params,
  font,
  fonts,
  parsedSvgs,
  onError,
}: BuildCardInput): BuildCardResult {
  const shape = createCardShape(params.width, params.height, params.cornerRadius)
  const base = new ExtrudeGeometry(shape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: BASE_BEVEL,
    bevelSize: BASE_BEVEL,
    bevelSegments: 1,
  })

  base.computeBoundingBox()
  const baseBB = base.boundingBox
  if (baseBB) {
    base.translate(
      -(baseBB.min.x + baseBB.max.x) / 2,
      -(baseBB.min.y + baseBB.max.y) / 2,
      0,
    )
  }
  base.computeVertexNormals()

  const region = getUsableRegion(params)
  const contentZ = params.thickness + BASE_BEVEL - 0.01
  const contentGeometries: BufferGeometry[] = []
  const contentItems: BuildContentItem[] = []

  for (const item of params.contents) {
    const itemFont = item.kind === 'text' && item.content.trim()
      ? resolveFont(fonts, font, item.fontStyle)
      : undefined
    const fitted = resolveContentGeometry(
      item,
      { region, font: itemFont },
      parsedSvgs?.[item.id],
    )

    if (!fitted) {
      contentItems.push({
        id: item.id,
        halfWidth: 0,
        halfHeight: 0,
        geometry: null,
      })
      continue
    }

    fitted.geometry.translate(fitted.x, fitted.y, contentZ)
    contentItems.push({
      id: item.id,
      halfWidth: fitted.halfWidth,
      halfHeight: fitted.halfHeight,
      geometry: null,
    })
    contentGeometries.push(fitted.geometry)
  }

  const content = contentGeometries.length > 0
    ? mergeOrFirst(contentGeometries, onError)
    : null
  disposeAll(contentGeometries, content ?? undefined)
  content?.computeVertexNormals()

  return { base, content, contentItems }
}
```

**Step 4: Rodar o teste novamente**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/buildCard.test.ts
```

Esperado: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/buildCard.ts tests/features/studio/tools/letreiros/cartao-visita/buildCard.test.ts
git commit -m "feat(cartao-visita): reescreve build com conteúdo livre e relevo fixo"
```

---

### Task 6: Worker, serialização e client

**Files:**
- Create: `src/features/studio/tools/letreiros/cartao-visita/workerGeometry.ts`
- Create: `src/features/studio/tools/letreiros/cartao-visita/workerClient.ts`
- Create: `src/features/studio/tools/letreiros/cartao-visita/buildCard.worker.ts`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/workerGeometry.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/cartao-visita/workerGeometry.test.ts`:

```ts
import * as THREE from 'three'
import {
  deserializeCardResult,
  serializeCardResult,
} from '@/features/studio/tools/letreiros/cartao-visita/workerGeometry'
import type { BuildCardResult } from '@/features/studio/tools/letreiros/cartao-visita/buildCard'

function result(): BuildCardResult {
  return {
    base: new THREE.BoxGeometry(10, 8, 3),
    content: new THREE.BoxGeometry(5, 2, 1),
    contentItems: [{ id: 'c1', halfWidth: 2.5, halfHeight: 1, geometry: null }],
  }
}

it('serializa e desserializa base, conteúdo e metadados', () => {
  const original = result()
  const { data, transfer } = serializeCardResult(original)
  const restored = deserializeCardResult(data)

  expect(restored.base.getAttribute('position').count).toBe(24)
  expect(restored.content?.getAttribute('position').count).toBe(24)
  expect(restored.contentItems).toEqual([
    { id: 'c1', halfWidth: 2.5, halfHeight: 1, geometry: null },
  ])
  expect(restored.base.getAttribute('normal')).toBeDefined()
  expect(transfer).toHaveLength(8)
  expect(new Set(transfer).size).toBe(8)
  expect(data.base.position.buffer).toBe(transfer[0])
  expect(original.base.getAttribute('position').count).toBe(24)
})

it('não compartilha metadados com o resultado original', () => {
  const original = result()
  const { data } = serializeCardResult(original)
  const restored = deserializeCardResult(data)
  expect(restored.contentItems).not.toBe(data.contentItems)
  expect(restored.contentItems[0]).not.toBe(data.contentItems[0])
})

it('aceita conteúdo nulo', () => {
  const { data, transfer } = serializeCardResult({ ...result(), content: null })
  expect(deserializeCardResult(data).content).toBeNull()
  expect(transfer).toHaveLength(4)
})
```

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/workerGeometry.test.ts
```

Esperado: FAIL porque `workerGeometry.ts` não existe.

**Step 3: Implementar `workerGeometry.ts`**

Crie `src/features/studio/tools/letreiros/cartao-visita/workerGeometry.ts`:

```ts
import type { BuildCardResult } from './buildCard'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from '../../confeitaria/shared/workerGeometry'

export interface SerializedCardResult {
  base: SerializedGeometry
  content: SerializedGeometry | null
  contentItems: Array<{ id: string; halfWidth: number; halfHeight: number }>
}

export function serializeCardResult(result: BuildCardResult): {
  data: SerializedCardResult
  transfer: ArrayBuffer[]
} {
  const base = serializeGeometry(result.base)
  const content = result.content ? serializeGeometry(result.content) : null
  return {
    data: {
      base: base.data,
      content: content?.data ?? null,
      contentItems: result.contentItems.map(({ id, halfWidth, halfHeight }) => ({
        id,
        halfWidth,
        halfHeight,
      })),
    },
    transfer: [...base.transfer, ...(content?.transfer ?? [])],
  }
}

export function deserializeCardResult(data: SerializedCardResult): BuildCardResult {
  return {
    base: deserializeGeometry(data.base),
    content: data.content ? deserializeGeometry(data.content) : null,
    contentItems: data.contentItems.map((item) => ({ ...item, geometry: null })),
  }
}
```

**Step 4: Implementar `workerClient.ts`**

Crie `src/features/studio/tools/letreiros/cartao-visita/workerClient.ts`:

```ts
import type { CardParams, FontStyle } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import type { SerializedCardResult } from './workerGeometry'

export interface CardWorkerRequest {
  params: CardParams
  parsedSvgs: Record<string, ParsedSvg | null>
  styles: FontStyle[]
}

export interface CardWorker {
  build(
    request: CardWorkerRequest,
    onResult: (data: SerializedCardResult) => void,
    onError?: (message: string) => void,
  ): void
  terminate(): void
}

export function createCardWorker(): CardWorker {
  const worker = new Worker(new URL('./buildCard.worker.ts', import.meta.url), { type: 'module' })
  let terminated = false
  return {
    build(request, onResult, onError) {
      if (terminated) {
        onError?.('Worker encerrado')
        return
      }
      worker.onmessage = (event: MessageEvent<{ data?: SerializedCardResult; error?: string }>) => {
        if (event.data.error) onError?.(event.data.error)
        else if (event.data.data) onResult(event.data.data)
      }
      worker.onerror = () => onError?.('Falha ao gerar a peça')
      worker.onmessageerror = () => onError?.('Falha ao gerar a peça')
      worker.postMessage(request)
    },
    terminate() {
      terminated = true
      worker.terminate()
    },
  }
}
```

**Step 5: Implementar `buildCard.worker.ts`**

Crie `src/features/studio/tools/letreiros/cartao-visita/buildCard.worker.ts`:

```ts
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildCard } from './buildCard'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'
import { serializeCardResult } from './workerGeometry'
import type { CardParams, FontStyle } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'

interface BuildRequest {
  params: CardParams
  parsedSvgs: Record<string, ParsedSvg | null>
  styles: FontStyle[]
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

function loadFont(style: FontStyle): Promise<Font> {
  return new Promise((resolve, reject) => {
    new FontLoader().load(fontUrls[style], resolve, undefined, reject)
  })
}

scope.onmessage = async (event) => {
  try {
    const { params, parsedSvgs, styles } = event.data
    const fonts: Partial<Record<FontStyle, Font>> = {}
    const loaded = await Promise.all(styles.map(loadFont))
    styles.forEach((style, index) => {
      fonts[style] = loaded[index]
    })

    const safeParsedSvgs = { ...parsedSvgs }
    for (const item of params.contents) {
      if (item.kind === 'icon' && item.svgIcon && safeParsedSvgs[item.id] === undefined) {
        safeParsedSvgs[item.id] = null
      }
    }

    const { data, transfer } = serializeCardResult(
      buildCard({ params, fonts, parsedSvgs: safeParsedSvgs }),
    )
    scope.postMessage({ data }, transfer)
  } catch (error) {
    scope.postMessage({
      error: error instanceof Error ? error.message : 'Falha ao gerar a peça',
    })
  }
}
```

**Step 6: Rodar os testes**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/workerGeometry.test.ts
npx tsc -b
```

Esperado: testes PASS e typecheck sem erros.

**Step 7: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/workerGeometry.ts \
  src/features/studio/tools/letreiros/cartao-visita/workerClient.ts \
  src/features/studio/tools/letreiros/cartao-visita/buildCard.worker.ts \
  tests/features/studio/tools/letreiros/cartao-visita/workerGeometry.test.ts
git commit -m "feat(cartao-visita): adiciona build em web worker"
```

---

### Task 7: Hook de estado (`useCard.ts`)

**Files:**
- Modify: `src/features/studio/tools/letreiros/cartao-visita/useCard.ts`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/useCard.test.ts`

**Step 1: Escrever o teste falho**

Substitua `tests/features/studio/tools/letreiros/cartao-visita/useCard.test.ts` por:

```ts
import * as THREE from 'three'
import { act, renderHook } from '@testing-library/react'
import { useCard } from '@/features/studio/tools/letreiros/cartao-visita/useCard'
import { defaultCardParams } from '@/features/studio/tools/letreiros/cartao-visita/schema'
import {
  serializeCardResult,
  type SerializedCardResult,
} from '@/features/studio/tools/letreiros/cartao-visita/workerGeometry'
import type { CardWorker, CardWorkerRequest } from '@/features/studio/tools/letreiros/cartao-visita/workerClient'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'
const EMPTY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>'

function serialized(): SerializedCardResult {
  return serializeCardResult({
    base: new THREE.BoxGeometry(85, 55, 2),
    content: new THREE.BoxGeometry(10, 4, 1),
    contentItems: [{ id: 'content-1', halfWidth: 5, halfHeight: 2, geometry: null }],
  }).data
}

interface WorkerRecord {
  pending: ((data: SerializedCardResult) => void) | null
  fail: ((message: string) => void) | null
  terminate: ReturnType<typeof vi.fn>
}

function makeWorkerFixture() {
  const workers: WorkerRecord[] = []
  let lastRequest: CardWorkerRequest | null = null
  const factory = (): CardWorker => {
    const record: WorkerRecord = { pending: null, fail: null, terminate: vi.fn() }
    workers.push(record)
    return {
      build: (request, onResult, onError) => {
        lastRequest = request
        record.pending = onResult
        record.fail = onError ?? null
      },
      terminate: record.terminate,
    }
  }
  return {
    factory,
    workers,
    respond: (data: SerializedCardResult = serialized(), index = workers.length - 1) =>
      workers[index]?.pending?.(data),
    fail: (message = 'Falha ao gerar a peça', index = workers.length - 1) =>
      workers[index]?.fail?.(message),
    getRequest: () => lastRequest,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCard', () => {
  it('inicia com 3 conteúdos de texto', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    expect(result.current.params.contents).toHaveLength(3)
    expect(result.current.params.contents[0].kind).toBe('text')
    if (result.current.params.contents[0].kind === 'text') {
      expect(result.current.params.contents[0].content).toBe('Seu Nome')
    }
  })

  it('updateParam clampa valores da peça', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => result.current.updateParam('width', 40))
    expect(result.current.params.width).toBe(50)
    act(() => result.current.updateParam('cornerRadius', 20))
    expect(result.current.params.cornerRadius).toBe(10)
  })

  it('reset restaura defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => result.current.updateParam('width', 70))
    act(() => result.current.reset())
    expect(result.current.params).toEqual(defaultCardParams)
  })

  it('addContent respeita o limite de 3 e retorna o id', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    expect(result.current.addContent()).toBeNull()

    const removedId = result.current.params.contents[1].id
    act(() => result.current.removeContent(removedId))
    let addedId: string | null = null
    act(() => {
      addedId = result.current.addContent()
    })
    expect(addedId).not.toBeNull()
    expect(result.current.params.contents).toHaveLength(3)
  })

  it('removeContent não remove o último item', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => result.current.removeContent(result.current.params.contents[0].id))
    act(() => result.current.removeContent(result.current.params.contents[0].id))
    expect(result.current.params.contents).toHaveLength(1)
    act(() => result.current.removeContent(result.current.params.contents[0].id))
    expect(result.current.params.contents).toHaveLength(1)
  })

  it('updateContent patcha e clampa valores', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, {
      content: 'Maria',
      fontSize: 99,
      offsetX: -99,
    }))
    const updated = result.current.params.contents[0]
    expect(updated.kind).toBe('text')
    if (updated.kind === 'text') {
      expect(updated.content).toBe('Maria')
      expect(updated.fontSize).toBe(12)
    }
    expect(updated.offsetX).toBe(-40)
  })

  it('setContentType alterna texto/ícone preservando id e offsets', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { offsetX: 7, offsetY: -3 }))
    act(() => result.current.setContentType(id, 'icon'))
    const icon = result.current.params.contents[0]
    expect(icon.kind).toBe('icon')
    expect(icon.offsetX).toBe(7)
    expect(icon.offsetY).toBe(-3)
    if (icon.kind === 'icon') {
      expect(icon.svgIcon).toBeNull()
      expect(icon.iconScale).toBe(1)
    }
    act(() => result.current.setContentType(id, 'text'))
    const text = result.current.params.contents[0]
    expect(text.kind).toBe('text')
    if (text.kind === 'text') expect(text.content).toBe('Novo texto')
  })

  it('começa sem geometria, sem build e sem erro', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    expect(result.current.geometry).toBeNull()
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('inicia o worker após 200ms e envia os estilos', () => {
    const { factory, getRequest } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.isBuilding).toBe(true)
    expect(getRequest()?.styles).toEqual(['bold', 'normal'])
  })

  it('expõe erro quando o worker não inicia', () => {
    const factory = (): CardWorker => {
      throw new Error('boom')
    }
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBe('Não foi possível iniciar a geração')
  })

  it('define a geometria quando o worker responde', () => {
    const { factory, respond } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      respond()
    })
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.isBuilding).toBe(false)
  })

  it('expõe erro quando o worker falha', () => {
    const { factory, fail } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => {
      fail('Falha ao gerar a peça')
    })
    expect(result.current.error).toBe('Falha ao gerar a peça')
    expect(result.current.isBuilding).toBe(false)
  })

  it('parseia SVG válido e rejeita SVG vazio', () => {
    const { factory, getRequest } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: SVG }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(getRequest()?.parsedSvgs[id]).not.toBeNull()

    act(() => result.current.updateContent(id, { svgIcon: EMPTY_SVG }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current.error).toBe('Não foi possível ler o SVG')
  })

  it('ignora resposta de worker obsoleto', () => {
    const { factory, workers } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    act(() => result.current.updateParam('width', 60))
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(workers).toHaveLength(2)

    act(() => {
      workers[0].pending?.(serialized())
    })
    expect(result.current.geometry).toBeNull()

    act(() => {
      workers[1].pending?.(serialized())
    })
    expect(result.current.geometry).not.toBeNull()
  })

  it('dimensions reflete os parâmetros', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCard({ workerFactory: factory }))
    expect(result.current.dimensions).toEqual({
      width: 85,
      height: 55,
      thickness: 2,
    })
  })
})
```

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/useCard.test.ts
```

Esperado: FAIL porque o hook atual usa `blocks`, `layout` e não tem worker.

**Step 3: Implementar `useCard.ts`**

Substitua `src/features/studio/tools/letreiros/cartao-visita/useCard.ts` por:

```ts
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  defaultCardParams,
  cardParamsSchema,
  type CardContent,
  type CardParams,
  type FontStyle,
  type IconContent,
  type TextContent,
} from './schema'
import type { BuildCardResult } from './buildCard'
import { parseSvg, type ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import { deserializeCardResult, type SerializedCardResult } from './workerGeometry'
import { createCardWorker, type CardWorker } from './workerClient'

const TEXT_DEFAULTS = {
  content: 'Novo texto',
  fontStyle: 'normal' as const,
  fontSize: 5,
  offsetX: 0,
  offsetY: 0,
}

const ICON_DEFAULTS = {
  svgIcon: null as string | null,
  iconScale: 1,
  iconLineWidth: 0.3,
  offsetX: 0,
  offsetY: 0,
}

type CardAction =
  | { type: 'update'; key: keyof CardParams; value: number | string }
  | { type: 'updateContent'; id: string; patch: Partial<TextContent> | Partial<IconContent> }
  | { type: 'setContentType'; id: string; kind: 'text' | 'icon' }
  | { type: 'addContent'; id: string }
  | { type: 'removeContent'; id: string }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  width: { min: 50, max: 90 },
  height: { min: 30, max: 60 },
  thickness: { min: 1, max: 3 },
  cornerRadius: { min: 0, max: 10 },
}

const CONTENT_NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  fontSize: { min: 3, max: 12 },
  iconScale: { min: 0.5, max: 1 },
  iconLineWidth: { min: 0.1, max: 1.5 },
  offsetX: { min: -40, max: 40 },
  offsetY: { min: -40, max: 40 },
}

function clampValue(key: string, value: number): number {
  const range = NUMERIC_RANGES[key]
  if (!range) return value
  return Math.min(range.max, Math.max(range.min, value))
}

function clampContentPatch(
  patch: Partial<TextContent> | Partial<IconContent>,
): Partial<TextContent> | Partial<IconContent> {
  const result: Record<string, unknown> = { ...patch }
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value !== 'number') continue
    const range = CONTENT_NUMERIC_RANGES[key]
    if (range) result[key] = Math.min(range.max, Math.max(range.min, value))
  }
  return result as Partial<TextContent> | Partial<IconContent>
}

function freshDefaults(): CardParams {
  return {
    ...defaultCardParams,
    contents: defaultCardParams.contents.map((item) => ({ ...item })),
  }
}

function cardReducer(state: CardParams, action: CardAction): CardParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'updateContent': {
      if (!state.contents.some((item) => item.id === action.id)) return state
      const patch = clampContentPatch(action.patch)
      const nextContents = state.contents.map((item) =>
        item.id === action.id ? ({ ...item, ...patch } as CardContent) : item,
      )
      const next = { ...state, contents: nextContents }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'setContentType': {
      const target = state.contents.find((item) => item.id === action.id)
      if (!target || target.kind === action.kind) return state
      const nextContents = state.contents.map((item) => {
        if (item.id !== action.id) return item
        if (action.kind === 'text') {
          const replacement: TextContent = {
            id: item.id,
            kind: 'text',
            ...TEXT_DEFAULTS,
            offsetX: item.offsetX,
            offsetY: item.offsetY,
          }
          return replacement
        }
        const replacement: IconContent = {
          id: item.id,
          kind: 'icon',
          ...ICON_DEFAULTS,
          offsetX: item.offsetX,
          offsetY: item.offsetY,
        }
        return replacement
      })
      const next = { ...state, contents: nextContents }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'addContent': {
      if (state.contents.length >= 3) return state
      const newItem: TextContent = {
        id: action.id,
        kind: 'text',
        ...TEXT_DEFAULTS,
        offsetY: state.contents.length === 1 ? -12 : 12,
      }
      const next = { ...state, contents: [...state.contents, newItem] }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'removeContent': {
      if (state.contents.length <= 1) return state
      const next = { ...state, contents: state.contents.filter((item) => item.id !== action.id) }
      const parsed = cardParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'reset':
      return freshDefaults()
  }
}

const PARSE_CACHE_LIMIT = 20

function parseSvgCached(cache: Map<string, ParsedSvg | null>, svg: string): ParsedSvg | null {
  if (!cache.has(svg)) {
    try {
      cache.set(svg, parseSvg(svg))
    } catch {
      cache.set(svg, null)
    }
    if (cache.size > PARSE_CACHE_LIMIT) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
  }
  return cache.get(svg) ?? null
}

export interface UseCardOptions {
  workerFactory?: () => CardWorker
}

export function useCard(options: UseCardOptions = {}) {
  const workerFactory = options.workerFactory ?? createCardWorker
  const [params, dispatch] = useReducer(cardReducer, defaultCardParams)
  const [geometry, setGeometry] = useState<BuildCardResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const geometryRef = useRef<BuildCardResult | null>(null)
  const workerRef = useRef<CardWorker | null>(null)
  const workerFactoryRef = useRef(workerFactory)
  const parseCacheRef = useRef<Map<string, ParsedSvg | null>>(new Map())
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    workerFactoryRef.current = workerFactory
  }, [workerFactory])

  // Cor não altera a geometria: o build só depende destes campos.
  const buildKey = useMemo(() => JSON.stringify({
    width: params.width,
    height: params.height,
    thickness: params.thickness,
    cornerRadius: params.cornerRadius,
    contents: params.contents,
  }), [
    params.width,
    params.height,
    params.thickness,
    params.cornerRadius,
    params.contents,
  ])

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = paramsRef.current
      const parsedSvgs: Record<string, ParsedSvg | null> = {}
      for (const item of current.contents) {
        if (item.kind !== 'icon' || !item.svgIcon) continue
        const parsed = parseSvgCached(parseCacheRef.current, item.svgIcon)
        if (!parsed) {
          setIsBuilding(false)
          setError('Não foi possível ler o SVG')
          return
        }
        parsedSvgs[item.id] = parsed
      }
      setError(null)

      const styles = new Set<FontStyle>()
      for (const item of current.contents) {
        if (item.kind === 'text' && item.content.trim()) styles.add(item.fontStyle)
      }
      const styleList = Array.from(styles)
      let worker: CardWorker
      try {
        worker = workerFactoryRef.current()
      } catch {
        setIsBuilding(false)
        setError('Não foi possível iniciar a geração')
        return
      }
      workerRef.current = worker
      setIsBuilding(true)

      try {
        worker.build({ params: current, parsedSvgs, styles: styleList }, (data: SerializedCardResult) => {
          if (workerRef.current !== worker) return
          let next: BuildCardResult
          try {
            next = deserializeCardResult(data)
          } catch {
            workerRef.current = null
            worker.terminate()
            setIsBuilding(false)
            setError('Falha ao gerar a peça')
            return
          }
          workerRef.current = null
          worker.terminate()
          const previous = geometryRef.current
          geometryRef.current = next
          setGeometry(next)
          previous?.base.dispose()
          previous?.content?.dispose()
          setIsBuilding(false)
          setError(null)
        }, (message) => {
          if (workerRef.current !== worker) return
          workerRef.current = null
          worker.terminate()
          setIsBuilding(false)
          setError(message)
        })
      } catch {
        worker.terminate()
        if (workerRef.current === worker) workerRef.current = null
        setIsBuilding(false)
        setError('Falha ao gerar a peça')
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [buildKey])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      geometryRef.current?.base.dispose()
      geometryRef.current?.content?.dispose()
    }
  }, [])

  const updateParam = useCallback((key: keyof CardParams, value: number | string) => {
    dispatch({ type: 'update', key, value })
  }, [])

  const updateContent = useCallback(
    (id: string, patch: Partial<TextContent> | Partial<IconContent>) => {
      dispatch({ type: 'updateContent', id, patch })
    },
    [],
  )

  const setContentType = useCallback((id: string, kind: 'text' | 'icon') => {
    dispatch({ type: 'setContentType', id, kind })
  }, [])

  const addContent = useCallback((): string | null => {
    if (params.contents.length >= 3) return null
    const id = crypto.randomUUID()
    dispatch({ type: 'addContent', id })
    return id
  }, [params.contents.length])

  const removeContent = useCallback((id: string) => {
    dispatch({ type: 'removeContent', id })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const dimensions = useMemo(() => ({
    width: params.width,
    height: params.height,
    thickness: params.thickness,
  }), [params.width, params.height, params.thickness])

  return {
    params,
    geometry,
    isBuilding,
    error,
    dimensions,
    updateParam,
    updateContent,
    setContentType,
    addContent,
    removeContent,
    reset,
  }
}
```

**Step 4: Rodar o teste novamente**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/useCard.test.ts
```

Esperado: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/useCard.ts tests/features/studio/tools/letreiros/cartao-visita/useCard.test.ts
git commit -m "feat(cartao-visita): reescreve hook com worker e conteúdos livres"
```

---

### Task 8: Exportação STL (`exportStl.ts`)

**Files:**
- Create: `src/features/studio/tools/letreiros/cartao-visita/exportStl.ts`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/exportStl.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/cartao-visita/exportStl.test.ts`:

```ts
import * as THREE from 'three'
import type { MockInstance } from 'vitest'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { exportStl } from '@/features/studio/tools/letreiros/cartao-visita/exportStl'
import type { BuildCardResult } from '@/features/studio/tools/letreiros/cartao-visita/buildCard'

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: vi.fn((geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    return geos[0].clone()
  }),
}))

const mergeMock = vi.mocked(mergeGeometries)

function makeGeometry(content: THREE.BufferGeometry | null): BuildCardResult {
  return {
    base: new THREE.BoxGeometry(85, 55, 2),
    content,
    contentItems: [],
  }
}

function expectedPosition(geometry: THREE.BufferGeometry): number[] {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  const positions = Array.from(
    (source.getAttribute('position') as THREE.BufferAttribute).array,
  )
  if (source !== geometry) source.dispose()
  return positions
}

function lastMergeArguments(): THREE.BufferGeometry[] {
  const calls = mergeMock.mock.calls
  const lastCall = calls[calls.length - 1]
  if (!lastCall) throw new Error('mergeGeometries não foi chamado')
  return lastCall[0]
}

let urlDescriptors: {
  createObjectURL?: PropertyDescriptor
  revokeObjectURL?: PropertyDescriptor
} = {}
let createElementSpy: MockInstance | null = null
let bodyDescriptors: {
  appendChild?: PropertyDescriptor
  removeChild?: PropertyDescriptor
} = {}

function setupDownloadHarness() {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  urlDescriptors = {
    createObjectURL: Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL'),
    revokeObjectURL: Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL'),
  }
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: createObjectURL,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: revokeObjectURL,
    writable: true,
    configurable: true,
  })

  const clickSpy = vi.fn()
  const anchorStub = { click: clickSpy, href: '', download: '' }
  createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorStub as never)
  bodyDescriptors = {
    appendChild: Object.getOwnPropertyDescriptor(document.body, 'appendChild'),
    removeChild: Object.getOwnPropertyDescriptor(document.body, 'removeChild'),
  }
  Object.defineProperty(document.body, 'appendChild', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })
  Object.defineProperty(document.body, 'removeChild', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })

  return { createObjectURL, revokeObjectURL, clickSpy, anchorStub }
}

function restoreProperty(
  target: object,
  name: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) Object.defineProperty(target, name, descriptor)
  else delete (target as Record<string, unknown>)[name]
}

describe('exportStl', () => {
  beforeEach(() => {
    mergeMock.mockClear()
  })

  afterEach(() => {
    createElementSpy?.mockRestore()
    createElementSpy = null
    restoreProperty(document.body, 'appendChild', bodyDescriptors.appendChild)
    restoreProperty(document.body, 'removeChild', bodyDescriptors.removeChild)
    bodyDescriptors = {}
    restoreProperty(window.URL, 'createObjectURL', urlDescriptors.createObjectURL)
    restoreProperty(window.URL, 'revokeObjectURL', urlDescriptors.revokeObjectURL)
    urlDescriptors = {}
  })

  it('baixa um STL binário com nome sanitizado', () => {
    const harness = setupDownloadHarness()
    exportStl(makeGeometry(new THREE.BoxGeometry(5, 5, 1)), 'Meu Cartão! @#')
    expect(harness.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.anchorStub.download).toBe('Meu-Carto.stl')
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('combina base e conteúdo na ordem correta', () => {
    setupDownloadHarness()
    const content = new THREE.BoxGeometry(5, 5, 1)
    const geometry = makeGeometry(content)
    exportStl(geometry, 'Com conteúdo')
    const merged = lastMergeArguments()
    expect(merged).toHaveLength(2)
    expect(Array.from(
      (merged[0].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(geometry.base))
    expect(Array.from(
      (merged[1].getAttribute('position') as THREE.BufferAttribute).array,
    )).toEqual(expectedPosition(content))
  })

  it('combina apenas a base quando não há conteúdo', () => {
    setupDownloadHarness()
    const geometry = makeGeometry(null)
    exportStl(geometry, 'Sem conteúdo')
    expect(lastMergeArguments()).toHaveLength(1)
  })
})
```

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/exportStl.test.ts
```

Esperado: FAIL porque `exportStl.ts` não existe.

**Step 3: Implementar `exportStl.ts`**

Crie `src/features/studio/tools/letreiros/cartao-visita/exportStl.ts`:

```ts
import { BufferAttribute, BufferGeometry, Mesh, Scene } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { sanitizeFilename } from './schema'
import type { BuildCardResult } from './buildCard'

function normalizeForMerge(geometry: BufferGeometry): BufferGeometry {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  const out = new BufferGeometry()
  out.setAttribute('position', (source.getAttribute('position') as BufferAttribute).clone())
  if (source.getAttribute('normal')) {
    out.setAttribute('normal', (source.getAttribute('normal') as BufferAttribute).clone())
  } else {
    source.computeVertexNormals()
    out.setAttribute('normal', (source.getAttribute('normal') as BufferAttribute).clone())
  }
  if (source !== geometry) source.dispose()
  return out
}

export function exportStl(geometry: BuildCardResult, projectName: string): void {
  const geometries = geometry.content
    ? [geometry.base, geometry.content]
    : [geometry.base]
  const normalized = geometries.map(normalizeForMerge)
  const merged = mergeGeometries(normalized) ?? normalized[0]
  normalized.forEach((item) => {
    if (item !== merged) item.dispose()
  })

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

**Step 4: Rodar o teste novamente**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/exportStl.test.ts
```

Esperado: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/exportStl.ts tests/features/studio/tools/letreiros/cartao-visita/exportStl.test.ts
git commit -m "feat(cartao-visita): adiciona exportação STL"
```

---

### Task 9: Painel de parâmetros (`StudioPanel.tsx`)

**Files:**
- Modify: `src/features/studio/tools/letreiros/cartao-visita/StudioPanel.tsx`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/StudioPanel.test.tsx`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/cartao-visita/StudioPanel.test.tsx`:

```tsx
import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioPanel } from '@/features/studio/tools/letreiros/cartao-visita/StudioPanel'
import {
  defaultCardParams,
  type CardParams,
  type IconContent,
} from '@/features/studio/tools/letreiros/cartao-visita/schema'

type PanelProps = ComponentProps<typeof StudioPanel>

const firstId = defaultCardParams.contents[0].id

function createPanelProps(overrides: Partial<PanelProps> = {}): PanelProps {
  return {
    params: defaultCardParams,
    selectedContentId: firstId,
    onSelectContent: vi.fn(),
    onUpdateContent: vi.fn(),
    onSetContentType: vi.fn(),
    onAddContent: vi.fn(),
    onRemoveContent: vi.fn(),
    onUpdateParam: vi.fn(),
    onReset: vi.fn(),
    onOpenEditor: vi.fn(),
    ...overrides,
  }
}

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const props = createPanelProps(overrides)
  render(<StudioPanel {...props} />)
  return props
}

function iconParams(svgIcon: string | null = null): CardParams {
  const icon: IconContent = {
    id: 'icon-1',
    kind: 'icon',
    svgIcon,
    iconScale: 1,
    iconLineWidth: 0.3,
    offsetX: 0,
    offsetY: 0,
  }
  return { ...defaultCardParams, contents: [icon] }
}

function getSlider(label: string): HTMLElement {
  return within(screen.getByLabelText(label)).getByRole('slider')
}

describe('StudioPanel', () => {
  it('renderiza título, chips, adicionar e tipo de conteúdo', () => {
    renderPanel()
    expect(screen.getByRole('heading', { level: 2, name: 'Cartão de Visita' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seu nome/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Texto' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Ícone' })).not.toBeChecked()
  })

  it('usa "Texto" no chip quando o conteúdo está vazio', () => {
    const first = defaultCardParams.contents[0]
    if (first.kind !== 'text') throw new Error('conteúdo inesperado')
    const params: CardParams = {
      ...defaultCardParams,
      contents: [{ ...first, content: '' }],
    }
    renderPanel({ params })
    expect(screen.getByRole('button', { name: 'Texto' })).toBeInTheDocument()
  })

  it('desabilita Adicionar texto com três conteúdos', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeDisabled()
  })

  it('seleciona, adiciona e remove conteúdos', async () => {
    const user = userEvent.setup()
    const props = renderPanel({
      params: {
        ...defaultCardParams,
        contents: [defaultCardParams.contents[0], defaultCardParams.contents[1]],
      },
    })
    await user.click(screen.getByRole('button', { name: /seu cargo/i }))
    expect(props.onSelectContent).toHaveBeenCalledWith(defaultCardParams.contents[1].id)

    await user.click(screen.getByRole('button', { name: /adicionar texto/i }))
    expect(props.onAddContent).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Remover conteúdo' }))
    expect(props.onRemoveContent).toHaveBeenCalledWith(firstId)
  })

  it('não mostra remover com um único conteúdo', () => {
    renderPanel({ params: { ...defaultCardParams, contents: [defaultCardParams.contents[0]] } })
    expect(screen.queryByRole('button', { name: 'Remover conteúdo' })).not.toBeInTheDocument()
  })

  it('edita texto sem limite de caracteres e dispara callbacks', async () => {
    const user = userEvent.setup()
    const props = renderPanel()
    expect(screen.getByLabelText('Conteúdo')).not.toHaveAttribute('maxlength')

    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'Maria' } })
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstId, { content: 'Maria' })

    await user.selectOptions(screen.getByLabelText('Estilo da letra'), 'serif')
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstId, { fontStyle: 'serif' })

    fireEvent.keyDown(getSlider('Tamanho da fonte'), { key: 'ArrowRight' })
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstId, { fontSize: 7.5 })
  })

  it('alterna para ícone e mostra upload', async () => {
    const user = userEvent.setup()
    const props = renderPanel()
    await user.click(screen.getByRole('radio', { name: 'Ícone' }))
    expect(props.onSetContentType).toHaveBeenCalledWith(firstId, 'icon')
  })

  it('faz upload de SVG e chama onUpdateContent', async () => {
    const props = renderPanel({ params: iconParams() })
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>'], 'logo.svg', { type: 'image/svg+xml' })
    fireEvent.change(screen.getByTestId('icon-upload'), { target: { files: [file] } })
    await waitFor(() => {
      expect(props.onUpdateContent).toHaveBeenCalledWith('icon-1', {
        svgIcon: expect.stringContaining('<svg'),
      })
    })
  })

  it('rejeita arquivo que não é SVG', async () => {
    renderPanel({ params: iconParams() })
    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('icon-upload'), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Envie um arquivo SVG de até 1 MB.')
  })

  it('desabilita sliders do ícone sem SVG', () => {
    renderPanel({ params: iconParams(null) })
    expect(screen.getByLabelText('Escala do ícone')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByLabelText('Espessura da linha do ícone')).toHaveAttribute('aria-disabled', 'true')
  })

  it('atualiza parâmetros do cartão', () => {
    const props = renderPanel()
    fireEvent.keyDown(getSlider('Largura'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('width', 86)
    fireEvent.keyDown(getSlider('Altura'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('height', 56)
    fireEvent.keyDown(getSlider('Espessura'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('thickness', 2.5)
    fireEvent.keyDown(getSlider('Cantos arredondados'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('cornerRadius', 3.5)
  })

  it('abre o editor e restaura defaults', async () => {
    const user = userEvent.setup()
    const props = renderPanel()
    await user.click(screen.getByRole('button', { name: /posicionar conteúdos/i }))
    expect(props.onOpenEditor).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(props.onReset).toHaveBeenCalledTimes(1)
  })

  it('não exibe seções Layout ou Relevo', () => {
    renderPanel()
    expect(screen.queryByText('Layout')).not.toBeInTheDocument()
    expect(screen.queryByText('Relevo')).not.toBeInTheDocument()
    expect(screen.getByText(/elevados em 1 mm/i)).toBeInTheDocument()
  })
})
```

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/StudioPanel.test.tsx
```

Esperado: FAIL porque o painel atual usa blocos e não tem upload/editor.

**Step 3: Implementar `StudioPanel.tsx`**

Substitua `src/features/studio/tools/letreiros/cartao-visita/StudioPanel.tsx` por:

```tsx
import { useEffect, useRef, useState } from 'react'
import {
  Accordion,
  Button,
  Flex,
  Heading,
  Radio,
  RadioGroupField,
  SelectField,
  SliderField,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react'
import {
  type CardParams,
  type FontStyle,
  type IconContent,
  type TextContent,
  PLA_COLORS,
} from './schema'

interface StudioPanelProps {
  params: CardParams
  selectedContentId: string
  onSelectContent: (id: string) => void
  onUpdateContent: (id: string, patch: Partial<TextContent> | Partial<IconContent>) => void
  onSetContentType: (id: string, kind: 'text' | 'icon') => void
  onAddContent: () => void
  onRemoveContent: (id: string) => void
  onUpdateParam: (key: keyof CardParams, value: number | string) => void
  onReset: () => void
  onOpenEditor: () => void
}

const MAX_SVG_BYTES = 1024 * 1024
const SVG_ERROR_MESSAGE = 'Envie um arquivo SVG de até 1 MB.'
const SVG_READ_ERROR_MESSAGE = 'Não foi possível ler o arquivo.'

function LabeledSlider({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  isDisabled,
}: {
  label: string
  value: number
  unit: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  isDisabled?: boolean
}) {
  return (
    <>
      <Flex direction="row" justifyContent="space-between">
        <Text fontSize="xs" color="font.tertiary">{label}</Text>
        <Text fontSize="xs" color="font.secondary">{value} {unit}</Text>
      </Flex>
      <SliderField
        label=""
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        isDisabled={isDisabled}
        isValueHidden
        onChange={(next) => onChange(next as number)}
      />
    </>
  )
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
          style={{
            backgroundColor: color,
            border: color === selected ? '2px solid #000' : '2px solid transparent',
          }}
        />
      ))}
    </Flex>
  )
}

export function StudioPanel({
  params,
  selectedContentId,
  onSelectContent,
  onUpdateContent,
  onSetContentType,
  onAddContent,
  onRemoveContent,
  onUpdateParam,
  onReset,
  onOpenEditor,
}: StudioPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [svgError, setSvgError] = useState<string | null>(null)
  const selected = params.contents.find((item) => item.id === selectedContentId) ?? params.contents[0]
  const canAddContent = params.contents.length < 3
  const iconItems = params.contents.filter((item) => item.kind === 'icon')
  const hasMultipleIcons = iconItems.length > 1

  useEffect(() => {
    setSvgError(null)
  }, [selectedContentId])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) {
      input.value = ''
      return
    }

    if (!file.name.toLowerCase().endsWith('.svg') || file.size > MAX_SVG_BYTES) {
      setSvgError(SVG_ERROR_MESSAGE)
      input.value = ''
      return
    }

    const contentId = selected.id
    const reader = new FileReader()
    reader.onload = (event) => {
      const svgContent = event.target?.result as string
      setSvgError(null)
      onUpdateContent(contentId, { svgIcon: svgContent })
      input.value = ''
    }
    reader.onerror = () => {
      setSvgError(SVG_READ_ERROR_MESSAGE)
      input.value = ''
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
          Cartão de Visita
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="conteudo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Conteúdo
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" gap="xs" wrap="wrap">
                {params.contents.map((item) => (
                  <Button
                    key={item.id}
                    size="small"
                    aria-pressed={item.id === selected.id}
                    onClick={() => onSelectContent(item.id)}
                  >
                    {item.kind === 'text'
                      ? item.content || 'Texto'
                      : hasMultipleIcons
                        ? `Ícone ${iconItems.findIndex((icon) => icon.id === item.id) + 1}`
                        : 'Ícone'}
                  </Button>
                ))}
                {params.contents.length > 1 && (
                  <Button
                    size="small"
                    variation="link"
                    aria-label="Remover conteúdo"
                    onClick={() => {
                      setSvgError(null)
                      onRemoveContent(selected.id)
                    }}
                  >
                    ×
                  </Button>
                )}
              </Flex>

              <Button size="small" isDisabled={!canAddContent} onClick={onAddContent}>
                Adicionar texto
              </Button>

              <RadioGroupField
                legend="Tipo de conteúdo"
                name="contentType"
                value={selected.kind}
                onChange={(event) =>
                  onSetContentType(selected.id, event.target.value as 'text' | 'icon')
                }
              >
                <Radio value="text">Texto</Radio>
                <Radio value="icon">Ícone</Radio>
              </RadioGroupField>

              {selected.kind === 'text' ? (
                <>
                  <TextField
                    label="Conteúdo"
                    descriptiveText="Acentos são removidos automaticamente. Textos longos são reduzidos."
                    value={selected.content}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateContent(selected.id, { content: event.target.value })
                    }
                  />

                  <SelectField
                    label="Estilo da letra"
                    value={selected.fontStyle}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                      onUpdateContent(selected.id, { fontStyle: event.target.value as FontStyle })
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Negrito</option>
                    <option value="serif">Serifada</option>
                  </SelectField>

                  <LabeledSlider
                    label="Tamanho da fonte"
                    value={selected.fontSize}
                    unit="mm"
                    min={3}
                    max={12}
                    step={0.5}
                    onChange={(value) => onUpdateContent(selected.id, { fontSize: value })}
                  />
                </>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg"
                    data-testid="icon-upload"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  {!selected.svgIcon ? (
                    <Button size="small" onClick={() => fileInputRef.current?.click()}>
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
                        onClick={() => {
                          setSvgError(null)
                          onUpdateContent(selected.id, { svgIcon: null })
                        }}
                      >
                        Remover ícone
                      </Button>
                    </>
                  )}

                  {svgError && (
                    <Text role="alert" fontSize="xs" className="text-red-600">
                      {svgError}
                    </Text>
                  )}

                  <LabeledSlider
                    label="Escala do ícone"
                    value={selected.iconScale}
                    unit="x"
                    min={0.5}
                    max={1}
                    step={0.1}
                    isDisabled={!selected.svgIcon}
                    onChange={(value) => onUpdateContent(selected.id, { iconScale: value })}
                  />

                  <LabeledSlider
                    label="Espessura da linha do ícone"
                    value={selected.iconLineWidth}
                    unit="mm"
                    min={0.1}
                    max={1.5}
                    step={0.05}
                    isDisabled={!selected.svgIcon}
                    onChange={(value) => onUpdateContent(selected.id, { iconLineWidth: value })}
                  />
                </>
              )}

              <Text fontSize="xs" color="font.tertiary">
                Textos e ícones elevados em 1 mm.
              </Text>

              <Button
                size="small"
                variation="link"
                onClick={onOpenEditor}
                aria-label="Posicionar conteúdos"
              >
                ✥ Posicionar conteúdos
              </Button>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="cartao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Cartão
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider
                label="Largura"
                value={params.width}
                unit="mm"
                min={50}
                max={90}
                step={1}
                onChange={(value) => onUpdateParam('width', value)}
              />
              <LabeledSlider
                label="Altura"
                value={params.height}
                unit="mm"
                min={30}
                max={60}
                step={1}
                onChange={(value) => onUpdateParam('height', value)}
              />
              <LabeledSlider
                label="Espessura"
                value={params.thickness}
                unit="mm"
                min={1}
                max={3}
                step={0.5}
                onChange={(value) => onUpdateParam('thickness', value)}
              />
              <LabeledSlider
                label="Cantos arredondados"
                value={params.cornerRadius}
                unit="mm"
                min={0}
                max={10}
                step={0.5}
                onChange={(value) => onUpdateParam('cornerRadius', value)}
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
                Cor da base
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.baseColor}
                onSelect={(color) => onUpdateParam('baseColor', color)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Cor do texto
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.letterColor}
                onSelect={(color) => onUpdateParam('letterColor', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
```

**Step 4: Rodar o teste novamente**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/StudioPanel.test.tsx
```

Esperado: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/StudioPanel.tsx tests/features/studio/tools/letreiros/cartao-visita/StudioPanel.test.tsx
git commit -m "feat(cartao-visita): reformula painel com conteúdo, cartão e aparência"
```

---

### Task 10: Preview 3D (`CardPreview.tsx`)

**Files:**
- Modify: `src/features/studio/tools/letreiros/cartao-visita/CardPreview.tsx`

**Step 1: Atualizar o componente**

Substitua `src/features/studio/tools/letreiros/cartao-visita/CardPreview.tsx` por:

```tsx
import type { BuildCardResult } from './buildCard'

interface CardPreviewProps {
  geometry: BuildCardResult | null
  baseColor: string
  letterColor: string
}

export function CardPreview({ geometry, baseColor, letterColor }: CardPreviewProps) {
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.content && (
        <mesh geometry={geometry.content} castShadow>
          <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
    </group>
  )
}
```

**Step 2: Typecheck**

```bash
npx tsc -b
```

Esperado: sem erros.

**Step 3: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/CardPreview.tsx
git commit -m "feat(cartao-visita): atualiza preview para o novo resultado"
```

---

### Task 11: Editor 2D de posicionamento

**Files:**
- Create: `src/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.tsx`
- Test: `tests/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.test.tsx`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import * as THREE from 'three'
import { TextPositionEditor } from '@/features/studio/tools/letreiros/cartao-visita/TextPositionEditor'
import {
  defaultCardParams,
  type CardParams,
  type IconContent,
} from '@/features/studio/tools/letreiros/cartao-visita/schema'
import type { BuildCardResult } from '@/features/studio/tools/letreiros/cartao-visita/buildCard'

if (typeof window.PointerEvent === 'undefined') {
  Object.defineProperty(window, 'PointerEvent', {
    value: MouseEvent,
    configurable: true,
    writable: true,
  })
}

const firstId = defaultCardParams.contents[0].id

function mockGeometry(): BuildCardResult {
  return {
    base: new THREE.BufferGeometry(),
    content: new THREE.BufferGeometry(),
    contentItems: [{ id: firstId, halfWidth: 5, halfHeight: 2, geometry: null }],
  }
}

function iconParams(offsetX = 0, offsetY = 0): CardParams {
  const icon: IconContent = {
    id: 'icon-1',
    kind: 'icon',
    svgIcon: null,
    iconScale: 1,
    iconLineWidth: 0.3,
    offsetX,
    offsetY,
  }
  return { ...defaultCardParams, contents: [icon] }
}

function renderEditor(overrides: {
  params?: CardParams
  geometry?: BuildCardResult | null
  selectedContentId?: string
  onSelectContent?: (id: string) => void
  onMoveContent?: (id: string, x: number, y: number) => void
  onClose?: () => void
} = {}) {
  return render(
    <TextPositionEditor
      params={overrides.params ?? defaultCardParams}
      geometry={overrides.geometry === undefined ? mockGeometry() : overrides.geometry}
      selectedContentId={overrides.selectedContentId ?? firstId}
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

describe('TextPositionEditor', () => {
  it('renderiza base, área útil e caixa de conteúdo', () => {
    renderEditor()
    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-valid-area')).toBeInTheDocument()
    expect(screen.getByTestId(`editor-content-${firstId}`)).toBeInTheDocument()
    expect(screen.getByText('Seu Nome')).toBeInTheDocument()
  })

  it('usa viewBox do cartão com padding', () => {
    const { container } = renderEditor()
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-47.5 -32.5 95 65')
  })

  it('não move ao clicar sem arrastar e seleciona', () => {
    const onMoveContent = vi.fn()
    const onSelectContent = vi.fn()
    renderEditor({ onMoveContent, onSelectContent, selectedContentId: '' })
    const element = screen.getByTestId(`editor-content-${firstId}`)
    fireEvent.pointerDown(element, { clientX: 100, clientY: 100, button: 0, bubbles: true })
    fireEvent.pointerUp(document, { clientX: 100, clientY: 100 })
    expect(onSelectContent).toHaveBeenCalledWith(firstId)
    expect(onMoveContent).not.toHaveBeenCalled()
  })

  it('dispara onMoveContent ao arrastar', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    dragContent(firstId, 140, 140)
    expect(onMoveContent).toHaveBeenCalledWith(firstId, expect.any(Number), expect.any(Number))
  })

  it('clampa o conteúdo à área útil', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    dragContent(firstId, 5000, 5000)
    const [, x, y] = onMoveContent.mock.calls[0]
    expect(x).toBeCloseTo(34.5, 1)
    expect(y).toBeCloseTo(22.5, 1)
  })

  it('move com as setas do teclado', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    fireEvent.keyDown(screen.getByTestId(`editor-content-${firstId}`), { key: 'ArrowRight' })
    expect(onMoveContent).toHaveBeenCalledWith(firstId, 1, 10)
  })

  it('fecha por Concluir, fundo e Escape', () => {
    const onClose = vi.fn()
    const { container } = renderEditor({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(container.firstChild as Element)
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('foca o botão fechar e expõe diálogo modal', () => {
    renderEditor()
    expect(screen.getByRole('button', { name: /fechar/i })).toHaveFocus()
    const dialog = screen.getByRole('dialog')
    const heading = screen.getByRole('heading', { name: /posicionar conteúdos/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id)
  })

  it('usa caixas de fallback sem geometria', () => {
    renderEditor({ geometry: null })
    const rect = screen.getByTestId(`editor-content-${firstId}`).querySelector('rect')
    expect(rect).toHaveAttribute('width', '8')
    expect(rect).toHaveAttribute('height', '6')
  })

  it('mostra placeholder de ícone e label de texto vazio', () => {
    renderEditor({ params: iconParams() })
    expect(screen.getByText('ícone')).toBeInTheDocument()
  })

  it('usa "Texto" como label para conteúdo vazio', () => {
    const first = defaultCardParams.contents[0]
    if (first.kind !== 'text') throw new Error('conteúdo inesperado')
    const params: CardParams = {
      ...defaultCardParams,
      contents: [{ ...first, content: '' }],
    }
    renderEditor({ params })
    expect(screen.getByText('Texto')).toBeInTheDocument()
  })
})
```

> O teste "move com as setas" espera `y = 10`, porque o conteúdo default
> `Seu Nome` tem `offsetY = 10`. Ajuste se os defaults do Task 1 forem
> diferentes.

**Step 2: Rodar o teste para confirmar a falha**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.test.tsx
```

Esperado: FAIL porque `TextPositionEditor.tsx` não existe.

**Step 3: Implementar `TextPositionEditor.tsx`**

Crie `src/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { Button, Flex, Heading } from '@aws-amplify/ui-react'
import { clampOffset, getUsableRegion } from './autoFit'
import { createCardShape } from './shapes'
import type { CardParams } from './schema'
import type { BuildCardResult } from './buildCard'

const FALLBACK_HALF_WIDTH = 4
const FALLBACK_HALF_HEIGHT = 3
const FALLBACK_PADDING = 5
const DRAG_THRESHOLD = 0.5
const HEADING_ID = 'card-position-editor-heading'

const KEY_DELTAS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: -1 },
}

function halfSize(built: { halfWidth: number; halfHeight: number } | undefined): {
  halfWidth: number
  halfHeight: number
} {
  return {
    halfWidth: built && built.halfWidth > 0 ? built.halfWidth : FALLBACK_HALF_WIDTH,
    halfHeight: built && built.halfHeight > 0 ? built.halfHeight : FALLBACK_HALF_HEIGHT,
  }
}

function labelOf(item: CardParams['contents'][number]): string {
  if (item.kind === 'text') return item.content || 'Texto'
  return 'ícone'
}

interface TextPositionEditorProps {
  params: CardParams
  geometry: BuildCardResult | null
  selectedContentId: string
  onSelectContent: (id: string) => void
  onMoveContent: (id: string, x: number, y: number) => void
  onClose: () => void
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
  const onMoveContentRef = useRef(onMoveContent)
  onMoveContentRef.current = onMoveContent
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)

  const region = useMemo(() => getUsableRegion(params), [params])

  const { minX, minY, maxY, vbWidth, vbHeight, basePoints } = useMemo(() => {
    const points = createCardShape(params.width, params.height, params.cornerRadius).getPoints(64)
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    const min = Math.min(...xs) - FALLBACK_PADDING
    const max = Math.max(...xs) + FALLBACK_PADDING
    const minYValue = Math.min(...ys) - FALLBACK_PADDING
    const maxYValue = Math.max(...ys) + FALLBACK_PADDING
    return {
      minX: min,
      minY: minYValue,
      maxY: maxYValue,
      vbWidth: max - min,
      vbHeight: maxYValue - minYValue,
      basePoints: points.map((point) => `${point.x},${-point.y}`).join(' '),
    }
  }, [params.width, params.height, params.cornerRadius])

  const contentBoxes = params.contents.map((item) => {
    const built = geometry?.contentItems.find((content) => content.id === item.id)
    const { halfWidth, halfHeight } = halfSize(built)
    const position = clampOffset(region, halfWidth, halfHeight, {
      x: item.offsetX,
      y: item.offsetY,
    })
    return {
      id: item.id,
      label: labelOf(item),
      x: position.x,
      y: position.y,
      halfWidth,
      halfHeight,
    }
  })
  const contentBoxesRef = useRef(contentBoxes)
  contentBoxesRef.current = contentBoxes

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    if (typeof svg.getScreenCTM === 'function' && typeof svg.createSVGPoint === 'function') {
      const matrix = svg.getScreenCTM()
      if (matrix) {
        const point = svg.createSVGPoint()
        point.x = clientX
        point.y = clientY
        const mapped = point.matrixTransform(matrix.inverse())
        if (Number.isFinite(mapped.x) && Number.isFinite(mapped.y)) {
          return { x: mapped.x, y: -mapped.y }
        }
      }
    }

    const rect = svg.getBoundingClientRect()
    const scaleX = vbWidth / (rect.width || 1)
    const scaleY = vbHeight / (rect.height || 1)
    return {
      x: (clientX - rect.left) * scaleX + minX,
      y: -((clientY - rect.top) * scaleY + minY),
    }
  }, [vbWidth, vbHeight, minX, minY])

  const clampPosition = useCallback((
    position: { x: number; y: number },
    halfWidth: number,
    halfHeight: number,
  ) => {
    const currentRegion = getUsableRegion(paramsRef.current)
    return clampOffset(currentRegion, halfWidth, halfHeight, position)
  }, [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const position = toSvg(event.clientX, event.clientY)
      const deltaX = position.x - drag.startX
      const deltaY = position.y - drag.startY
      if (!drag.moved && Math.hypot(deltaX, deltaY) <= DRAG_THRESHOLD) return

      const box = contentBoxesRef.current.find((content) => content.id === drag.id)
      if (!box) return

      drag.moved = true
      const next = clampPosition(
        { x: drag.originX + deltaX, y: drag.originY + deltaY },
        box.halfWidth,
        box.halfHeight,
      )
      setDragPos({ id: drag.id, x: next.x, y: next.y })
    }

    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      if (drag.moved) {
        const box = contentBoxesRef.current.find((content) => content.id === drag.id)
        const position = toSvg(event.clientX, event.clientY)
        if (box) {
          const next = clampPosition(
            {
              x: drag.originX + position.x - drag.startX,
              y: drag.originY + position.y - drag.startY,
            },
            box.halfWidth,
            box.halfHeight,
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

  const handlePointerDown = useCallback((id: string, event: ReactPointerEvent) => {
    event.stopPropagation()
    onSelectContent(id)

    const box = contentBoxesRef.current.find((content) => content.id === id)
    if (!box) return

    const position = toSvg(event.clientX, event.clientY)
    dragRef.current = {
      id,
      startX: position.x,
      startY: position.y,
      originX: box.x,
      originY: box.y,
      moved: false,
    }
  }, [onSelectContent, toSvg])

  const handleKeyDown = useCallback((
    id: string,
    event: ReactKeyboardEvent<SVGGElement>,
  ) => {
    const delta = KEY_DELTAS[event.key]
    if (!delta) return

    const box = contentBoxesRef.current.find((content) => content.id === id)
    if (!box) return

    event.preventDefault()
    const next = clampPosition(
      { x: box.x + delta.x, y: box.y + delta.y },
      box.halfWidth,
      box.halfHeight,
    )
    onMoveContentRef.current(id, next.x, next.y)
  }, [clampPosition])

  return (
    <div
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
          <Heading id={HEADING_ID} level={2} fontSize="large">
            Posicionar conteúdos
          </Heading>
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
          viewBox={`${minX} ${-maxY} ${vbWidth} ${vbHeight}`}
          className="w-full touch-none select-none rounded border border-neutral-200"
        >
          <rect x={minX} y={-maxY} width={vbWidth} height={vbHeight} fill="#f5f5f5" />
          <polygon
            data-testid="editor-base"
            points={basePoints}
            fill="#ccfbf1"
            stroke="#14b8a6"
            strokeWidth="0.3"
          />
          <rect
            data-testid="editor-valid-area"
            x={region.minX}
            y={-region.maxY}
            width={region.maxX - region.minX}
            height={region.maxY - region.minY}
            fill="none"
            stroke="#14b8a680"
            strokeWidth="0.2"
            strokeDasharray="1,0.5"
          />

          {contentBoxes.map((box) => {
            const isDragging = dragPos?.id === box.id
            const x = isDragging ? dragPos.x : box.x
            const y = isDragging ? dragPos.y : box.y
            const selected = box.id === selectedContentId
            return (
              <g
                key={box.id}
                data-testid={`editor-content-${box.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Mover ${box.label}`}
                onPointerDown={(event) => handlePointerDown(box.id, event)}
                onKeyDown={(event) => handleKeyDown(box.id, event)}
                style={{ cursor: 'grab' }}
              >
                <rect
                  x={x - box.halfWidth}
                  y={-y - box.halfHeight}
                  width={box.halfWidth * 2}
                  height={box.halfHeight * 2}
                  fill={selected ? '#14b8a6' : '#0d948899'}
                  stroke={selected ? '#0f766e' : 'transparent'}
                  strokeWidth="0.3"
                />
                <text
                  x={x}
                  y={-y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(box.halfHeight * 1.2, 4)}
                  fill="white"
                  pointerEvents="none"
                >
                  {box.label.slice(0, 10)}
                </text>
              </g>
            )
          })}
        </svg>

        <Flex justifyContent="flex-end" marginTop="medium">
          <Button variation="primary" onClick={onClose}>
            Concluir
          </Button>
        </Flex>
      </div>
    </div>
  )
}
```

**Step 4: Rodar o teste novamente**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.test.tsx
```

Esperado: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.tsx tests/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.test.tsx
git commit -m "feat(cartao-visita): adiciona editor 2D de posicionamento"
```

---

### Task 12: Integração no `StudioPage`

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Adicionar testes de integração**

No topo de `tests/features/studio/StudioPage.test.tsx`, adicione os imports eager:

```ts
import '@/features/studio/tools/letreiros/cartao-visita/StudioPanel'
import '@/features/studio/tools/letreiros/cartao-visita/TextPositionEditor'
```

No final do `describe('StudioPage', ...)`, adicione:

```ts
it('abre a ferramenta Cartão de Visita com o painel de conteúdo', async () => {
  renderStudioPage()
  fireEvent.click(screen.getByRole('button', { name: /cartão de visita/i }))

  expect(await screen.findByRole('heading', { level: 2, name: 'Cartão de Visita' }, LAZY_TIMEOUT)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /seu nome/i })).toBeInTheDocument()
  expect(screen.getByText('85 × 55 × 2 mm')).toBeInTheDocument()
})

it('mostra Gerando… no Cartão de Visita', async () => {
  renderStudioPage()
  fireEvent.click(screen.getByRole('button', { name: /cartão de visita/i }))
  const status = await screen.findByRole('status', {}, LAZY_TIMEOUT)
  expect(status).toHaveTextContent('Gerando…')
  expect(screen.getByTestId('canvas-mock').closest('[aria-busy="true"]')).toBeInTheDocument()
})

it('abre o editor de posicionamento do Cartão de Visita', async () => {
  renderStudioPage()
  fireEvent.click(screen.getByRole('button', { name: /cartão de visita/i }))
  fireEvent.click(await screen.findByRole('button', { name: /posicionar conteúdos/i }, LAZY_TIMEOUT))
  expect(screen.getByRole('heading', { name: /posicionar conteúdos/i })).toBeInTheDocument()
})
```

**Step 2: Rodar os testes para confirmar a falha**

```bash
npx vitest run tests/features/studio/StudioPage.test.tsx
```

Esperado: FAIL porque o wrapper atual usa `blocks`/editor inexistente.

**Step 3: Atualizar imports do `StudioPage.tsx`**

No bloco de imports, adicione:

```ts
import { exportStl as exportCardStl } from './tools/letreiros/cartao-visita/exportStl'
import { TextPositionEditor as CardTextPositionEditor } from './tools/letreiros/cartao-visita/TextPositionEditor'
```

**Step 4: Substituir `CartaoVisitaToolWrapper`**

Substitua a função `CartaoVisitaToolWrapper` (linhas atuais 267–330) por:

```tsx
function CartaoVisitaToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)
  const [selectedContentId, setSelectedContentId] = useState<string>('')
  const [isEditorOpen, setEditorOpen] = useState(false)

  const {
    params,
    geometry,
    isBuilding,
    error,
    dimensions,
    updateParam,
    updateContent,
    addContent,
    removeContent,
    setContentType,
    reset,
  } = useCard()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (geometry) {
      exportCardStl(geometry, projectName)
    }
  }, [geometry, projectName])

  const handleSelectContent = useCallback((id: string) => {
    setSelectedContentId(id)
  }, [])

  const handleAddContent = useCallback(() => {
    const id = addContent()
    if (id) setSelectedContentId(id)
  }, [addContent])

  const handleMoveContent = useCallback((id: string, x: number, y: number) => {
    updateContent(id, { offsetX: x, offsetY: y })
  }, [updateContent])

  const effectiveSelectedContentId = params.contents.some((content) => content.id === selectedContentId)
    ? selectedContentId
    : params.contents[0].id

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="relative flex min-h-0 flex-1">
        {error ? (
          <div
            role="alert"
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-red-200 bg-white/95 px-3 py-1 text-xs text-red-600 shadow-sm"
          >
            {error}
          </div>
        ) : isBuilding ? (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-neutral-200 bg-white/90 px-3 py-1 text-xs text-neutral-600 shadow-sm"
          >
            Gerando…
          </div>
        ) : null}
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <CartaoVisitaTool
            params={params}
            selectedContentId={effectiveSelectedContentId}
            onSelectContent={handleSelectContent}
            onUpdateContent={updateContent}
            onSetContentType={setContentType}
            onAddContent={handleAddContent}
            onRemoveContent={removeContent}
            onUpdateParam={updateParam}
            onReset={reset}
            onOpenEditor={() => setEditorOpen(true)}
          />
        </Suspense>
        <div className="flex min-h-0 flex-1" aria-busy={isBuilding}>
          <StudioViewport
            hasGeometry={geometry !== null}
            resetCameraSignal={resetCameraSignal}
            onResetCamera={handleResetCamera}
          >
            <Suspense fallback={null}>
              <CartaoVisitaPreview
                geometry={geometry}
                baseColor={params.baseColor}
                letterColor={params.letterColor}
              />
            </Suspense>
          </StudioViewport>
        </div>
      </div>
      <StudioStatusBar dimensions={dimensions} />
      {isEditorOpen && (
        <Suspense fallback={null}>
          <CardTextPositionEditor
            params={params}
            geometry={geometry}
            selectedContentId={effectiveSelectedContentId}
            onSelectContent={setSelectedContentId}
            onMoveContent={handleMoveContent}
            onClose={() => setEditorOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
```

**Step 5: Rodar os testes de integração**

```bash
npx vitest run tests/features/studio/StudioPage.test.tsx
```

Esperado: PASS.

**Step 6: Commit**

```bash
git add src/features/studio/StudioPage.tsx tests/features/studio/StudioPage.test.tsx
git commit -m "feat(cartao-visita): integra worker, editor e export ao Studio"
```

---

### Task 13: Documentação

**Files:**
- Modify: `src/features/studio/tools/letreiros/cartao-visita/AGENTS.md`
- Modify: `src/features/studio/tools/letreiros/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Step 1: Atualizar `cartao-visita/AGENTS.md`**

Substitua o conteúdo por:

```md
# Ferramenta: Cartão de Visita

## Status

Implementada — gera e exporta STL localmente no navegador.

## O que faz

Gera cartões de visita 3D retangulares com cantos arredondados, conteúdo livre
(1–3 textos ou ícones SVG), texto em relevo fixo de 1 mm e posicionamento no
editor 2D.

## Parâmetros

| Parâmetro | Tipo | Faixa | Default |
|---|---|---|---|
| width | number | 50–90mm | 85 |
| height | number | 30–60mm | 55 |
| thickness | number | 1–3mm | 2 |
| cornerRadius | number | 0–10mm | 3 |
| baseColor / letterColor | enum | 10 cores PLA | teal / white |
| contents[] | array | 1–3 itens | 3 textos |

Cada item de `contents[]` é uma união discriminada por `kind` (`text` | `icon`)
com `id` e `offsetX/Y` (-40–40mm):

- `text`: `content` (string, sem limite de caracteres, vazio permitido),
  `fontStyle` (normal/bold/serif), `fontSize` (3–12mm)
- `icon`: `svgIcon` (string|null), `iconScale` (0.5–1.0),
  `iconLineWidth` (0.1–1.5mm)

Texto e ícone são sempre elevados com `CONTENT_DEPTH = 1`mm. O cartão usa
`CONTENT_MARGIN = 3`mm e bevel de `BASE_BEVEL = 0.1`mm.

## Arquivos

```
tools/letreiros/cartao-visita/
  schema.ts              — validação Zod + defaults (contents discriminados)
  shapes.ts              — Shape do cartão com cantos arredondados
  autoFit.ts             — área útil, auto-fit e clamp
  textToGeometry.ts      — TextGeometry + normalização de acentos
  buildCard.ts           — composição base + conteúdo (merge)
  buildCard.worker.ts    — build em Web Worker
  workerClient.ts        — client do Worker
  workerGeometry.ts      — serialização do resultado
  exportStl.ts           — STL binário + download
  useCard.ts             — hook: estado + parse SVG + worker + debounce
  StudioPanel.tsx        — painel de parâmetros
  CardPreview.tsx        — preview R3F com 2 materiais
  TextPositionEditor.tsx — editor 2D SVG de posicionamento
```

O auto-fit só reduz a escala (nunca amplia), normaliza Z e centraliza. Os
offsets são clampados à área útil de 3 mm. Textos longos são reduzidos até
caber.

## Pipeline de geração

`schema.ts` → `autoFit.ts` / `shapes.ts` → `textToGeometry.ts` → `buildCard.ts`
→ `exportStl.ts`, com `svgToIconShape.ts` compartilhado para ícones. O build
roda em Web Worker:

- **main thread** (`useCard.ts`) parseia cada SVG e envia
  `{ params, parsedSvgs, styles }`;
- **worker** carrega as fontes necessárias e chama `buildCard`;
- `workerGeometry.ts` serializa o resultado `{ base, content, contentItems }`;
- `isBuilding` controla “Gerando…” e erros aparecem no overlay; a geometria
  anterior permanece visível durante o rebuild.

## Editor 2D

`TextPositionEditor` usa SVG com o contorno real do cartão e a área útil
tracejada. As caixas usam `contentItems` reais do build. Suporta arraste
pointer/touch, nudge por setas, seleção, `Escape`, clique no fundo, botão X e
**Concluir**. O foco inicial vai para o botão de fechar.

## Testes

`tests/features/studio/tools/letreiros/cartao-visita/`:

- `schema.test.ts`
- `shapes.test.ts`
- `autoFit.test.ts`
- `textToGeometry.test.ts`
- `buildCard.test.ts`
- `workerGeometry.test.ts`
- `exportStl.test.ts`
- `useCard.test.ts`
- `StudioPanel.test.tsx`
- `TextPositionEditor.test.tsx`

## Fora de escopo

Persistência, geração via CadQuery/Lambda, pagamentos, autenticação, novos
formatos de cartão e cavidade para ímã.
```

**Step 2: Atualizar `letreiros/AGENTS.md`**

Na tabela de ferramentas, troque:

```md
| cartao-visita | planejada |
```

por:

```md
| cartao-visita | implementada |
```

E acrescente nas regras do domínio:

```md
- Cartão de visita: conteúdo livre (texto/ícone), relevo fixo de 1 mm, margem de 3 mm
```

**Step 3: Atualizar `docs/frontend/studio.md`**

Na tabela **Como editar**, substitua as linhas do Cartão de Visita por:

```md
| **Cartão de Visita** | |
| Schema + tipos | `src/features/studio/tools/letreiros/cartao-visita/schema.ts` |
| Forma com cantos arredondados | `src/features/studio/tools/letreiros/cartao-visita/shapes.ts` |
| Área útil + auto-fit | `src/features/studio/tools/letreiros/cartao-visita/autoFit.ts` |
| Texto 3D | `src/features/studio/tools/letreiros/cartao-visita/textToGeometry.ts` |
| Composição base + conteúdo | `src/features/studio/tools/letreiros/cartao-visita/buildCard.ts` |
| Worker + serialização | `src/features/studio/tools/letreiros/cartao-visita/buildCard.worker.ts` |
| Interface do worker | `src/features/studio/tools/letreiros/cartao-visita/workerClient.ts` |
| Serialização da geometria | `src/features/studio/tools/letreiros/cartao-visita/workerGeometry.ts` |
| Hook de estado | `src/features/studio/tools/letreiros/cartao-visita/useCard.ts` |
| Painel de parâmetros | `src/features/studio/tools/letreiros/cartao-visita/StudioPanel.tsx` |
| Preview R3F | `src/features/studio/tools/letreiros/cartao-visita/CardPreview.tsx` |
| Editor de posição | `src/features/studio/tools/letreiros/cartao-visita/TextPositionEditor.tsx` |
| Export STL | `src/features/studio/tools/letreiros/cartao-visita/exportStl.ts` |
```

Na seção **Decisões**, adicione um bullet:

```md
- **Cartão de Visita:** Peça retangular (50–90 × 30–60mm, 1–3mm de espessura)
  com cantos arredondados. Conteúdo livre de 1–3 itens texto/ícone SVG, com
  texto sem limite de caracteres e auto-fit à área útil de 3mm. Relevo fixo de
  1mm. Build em Web Worker, editor 2D SVG com medidas reais e export STL
  binário. Sem argola.
```

**Step 4: Commit**

```bash
git add src/features/studio/tools/letreiros/cartao-visita/AGENTS.md \
  src/features/studio/tools/letreiros/AGENTS.md \
  docs/frontend/studio.md
git commit -m "docs(cartao-visita): documenta a reformulação"
```

---

### Task 14: Validação final

**Step 1: Rodar a suíte da ferramenta**

```bash
npx vitest run tests/features/studio/tools/letreiros/cartao-visita
```

Esperado: todos os testes PASS.

**Step 2: Rodar os testes do Studio**

```bash
npx vitest run tests/features/studio/StudioPage.test.tsx
```

Esperado: PASS.

**Step 3: Typecheck**

```bash
npm run typecheck
```

Esperado: sem erros.

**Step 4: Lint**

```bash
npm run lint
```

Esperado: sem erros.

**Step 5: Suíte completa**

```bash
npm test
```

Esperado: todos os testes PASS.

**Step 6: Build**

```bash
npm run build
```

Esperado: build concluído sem warnings.

**Step 7: Revisão manual**

- Abrir `/studio`, selecionar **Cartão de Visita**.
- Confirmar o cartão 85×55×2mm e os três textos default.
- Trocar um item para ícone, enviar um SVG e conferir o preview.
- Abrir **Posicionar conteúdos**, arrastar e usar as setas.
- Trocar cores e conferir os dois materiais.
- Exportar STL e validar o arquivo no fatiador.
- Testar em viewport mobile (painel com overflow vertical e editor utilizável).

**Step 8: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore(cartao-visita): valida reformulação"
```

---

## Critérios de aceite

- [ ] Schema com 1–3 conteúdos discriminados e texto sem limite.
- [ ] Cartão retangular com cantos arredondados, sem argola.
- [ ] Auto-fit reduz e clampa o conteúdo em 3 mm.
- [ ] Build em Worker com `{ base, content, contentItems }`.
- [ ] Preview com duas cores.
- [ ] Painel sem Layout/Relevo e com upload de ícone.
- [ ] Editor 2D com contorno real, arraste, teclado e acessibilidade.
- [ ] Export STL binário funcional.
- [ ] Testes, typecheck, lint e build verdes.
- [ ] Documentação atualizada.
