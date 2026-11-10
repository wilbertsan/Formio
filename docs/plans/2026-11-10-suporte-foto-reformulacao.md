# Reformulação do Suporte para Foto — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reescrever a ferramenta Suporte para Foto com o pipeline do Chaveiro: peça de perfil lateral extrudado (base + faixa frontal + fenda de 2 mm + painel inclinado), conteúdo livre (texto/ícone) com auto-fit, build em Web Worker, editor 2D, preview de 2 materiais e export STL.

**Architecture:** Zod valida 1–3 conteúdos discriminados (`text` | `icon`). O perfil lateral é um polígono único extrudado na largura da foto, em `shapes.ts`. `buildPhotoStand.ts` compõe base + conteúdo e roda em `buildPhotoStand.worker.ts`; `usePhotoStand.ts` mantém o estado, parseia SVGs na main thread e faz debounce. O painel usa os componentes Amplify UI padrão do Studio e o editor SVG posiciona os itens por pointer/touch e teclado.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Amplify UI, Tailwind, Vitest, Web Worker.

---

## Pré-requisitos

- Ler o design aprovado: `docs/plans/2026-11-10-suporte-foto-reformulacao-design.md`.
- Referências de implementação: `src/features/studio/tools/letreiros/cartao-visita/` (pipeline completo com worker) e `src/features/studio/tools/chaveiros/chaveiro/` (origem do padrão).
- Criar uma branch antes de começar:

```bash
git checkout -b feat/suporte-foto-reformulacao
```

- Comandos de validação usados no plano:

```bash
npx vitest run tests/features/studio/tools/letreiros/suporte-foto
npm run typecheck
npm run lint
npm test
npm run build
```

- Todos os arquivos de `src/features/studio/tools/letreiros/suporte-foto/` do modelo antigo são substituídos. `PhotoStandPreview.tsx` é reescrito no novo contrato.

---

### Task 1: Schema, constantes e defaults

**Files:**
- Modify: `src/features/studio/tools/letreiros/suporte-foto/schema.ts`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/schema.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/schema.test.ts`:

```ts
import {
  CONTENT_DEPTH,
  CONTENT_MARGIN,
  PHOTO_SIZE_KEYS,
  PHOTO_SIZES,
  PLATE_REAR_MIN,
  PLA_COLORS,
  SLOT_GAP,
  defaultPhotoStandParams,
  iconContentSchema,
  normalizeName,
  photoStandParamsSchema,
  sanitizeFilename,
  textContentSchema,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'

describe('suporte-foto schema', () => {
  it('defaults são válidos', () => {
    expect(photoStandParamsSchema.parse(defaultPhotoStandParams)).toEqual(defaultPhotoStandParams)
  })

  it('exporta constantes do domínio', () => {
    expect(CONTENT_DEPTH).toBe(1)
    expect(CONTENT_MARGIN).toBe(3)
    expect(SLOT_GAP).toBe(2)
    expect(PLATE_REAR_MIN).toBe(2)
  })

  it('define os três tamanhos de foto', () => {
    expect(PHOTO_SIZE_KEYS).toEqual(['10x15', '13x18', '15x20'])
    expect(PHOTO_SIZES['10x15']).toEqual({ width: 100, height: 150 })
    expect(PHOTO_SIZES['13x18']).toEqual({ width: 130, height: 180 })
    expect(PHOTO_SIZES['15x20']).toEqual({ width: 150, height: 200 })
  })

  it('aceita 1, 2 e 3 conteúdos', () => {
    for (const count of [1, 2, 3]) {
      const contents = Array.from({ length: count }, (_, index) => ({
        ...defaultPhotoStandParams.contents[0],
        id: `c${index}`,
      }))
      expect(photoStandParamsSchema.safeParse({ ...defaultPhotoStandParams, contents }).success).toBe(true)
    }
  })

  it('rejeita 0 e 4 conteúdos', () => {
    expect(photoStandParamsSchema.safeParse({ ...defaultPhotoStandParams, contents: [] }).success).toBe(false)
    const four = Array.from({ length: 4 }, (_, index) => ({
      ...defaultPhotoStandParams.contents[0],
      id: `c${index}`,
    }))
    expect(photoStandParamsSchema.safeParse({ ...defaultPhotoStandParams, contents: four }).success).toBe(false)
  })

  it('aceita texto vazio e sem limite de caracteres', () => {
    const base = defaultPhotoStandParams.contents[0]
    if (base.kind !== 'text') throw new Error('conteúdo inesperado')
    expect(textContentSchema.safeParse({ ...base, content: '' }).success).toBe(true)
    expect(textContentSchema.safeParse({ ...base, content: 'x'.repeat(200) }).success).toBe(true)
  })

  it('valida os ranges do texto', () => {
    const base = defaultPhotoStandParams.contents[0]
    if (base.kind !== 'text') throw new Error('conteúdo inesperado')
    expect(textContentSchema.safeParse({ ...base, fontSize: 2.9 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...base, fontSize: 15.1 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...base, offsetX: -91 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...base, offsetY: 26 }).success).toBe(false)
    expect(textContentSchema.safeParse({ ...base, fontSize: 3 }).success).toBe(true)
    expect(textContentSchema.safeParse({ ...base, fontSize: 15 }).success).toBe(true)
  })

  it('valida os ranges do ícone', () => {
    const icon = {
      id: 'icon-1',
      kind: 'icon' as const,
      svgIcon: null,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    expect(iconContentSchema.safeParse(icon).success).toBe(true)
    expect(iconContentSchema.safeParse({ ...icon, iconScale: 0.4 }).success).toBe(false)
    expect(iconContentSchema.safeParse({ ...icon, iconLineWidth: 2 }).success).toBe(false)
    expect(iconContentSchema.safeParse({ ...icon, svgIcon: '' }).success).toBe(false)
  })

  it('valida os ranges da peça', () => {
    const valid = defaultPhotoStandParams
    expect(photoStandParamsSchema.safeParse({ ...valid, sideMargin: 2.9 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, bandHeight: 41 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, depth: 29 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, thickness: 1.9 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, angle: 59 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, angle: 86 }).success).toBe(false)
    expect(photoStandParamsSchema.safeParse({ ...valid, productType: 'card' }).success).toBe(false)
  })

  it('mantém as 10 cores PLA', () => {
    expect(PLA_COLORS).toHaveLength(10)
    expect(PLA_COLORS).toContain(defaultPhotoStandParams.baseColor)
    expect(PLA_COLORS).toContain(defaultPhotoStandParams.letterColor)
  })

  it('remove acentos', () => {
    expect(normalizeName('Família Coração')).toBe('Familia Coracao')
  })

  it('sanitiza o nome do arquivo', () => {
    expect(sanitizeFilename('Suporte Família! @#')).toBe('Suporte-Familia')
    expect(sanitizeFilename('***')).toBe('suporte-foto')
  })
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/schema.test.ts`
Expected: FAIL — `CONTENT_DEPTH`/`PHOTO_SIZES` não existem no módulo.

**Step 3: Implementar**

Substitua todo o conteúdo de `src/features/studio/tools/letreiros/suporte-foto/schema.ts` por:

```ts
import { z } from 'zod'

export const CONTENT_DEPTH = 1
export const CONTENT_MARGIN = 3
export const SLOT_GAP = 2
export const PLATE_REAR_MIN = 2

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PHOTO_SIZES = {
  '10x15': { width: 100, height: 150 },
  '13x18': { width: 130, height: 180 },
  '15x20': { width: 150, height: 200 },
} as const

export type PhotoSizeKey = keyof typeof PHOTO_SIZES

export const PHOTO_SIZE_KEYS = ['10x15', '13x18', '15x20'] as [
  PhotoSizeKey,
  ...PhotoSizeKey[],
]

const contentFields = {
  id: z.string().min(1),
  offsetX: z.number().min(-90).max(90),
  offsetY: z.number().min(-25).max(25),
}

export const textContentSchema = z.object({
  ...contentFields,
  kind: z.literal('text'),
  content: z.string(),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  fontSize: z.number().min(3).max(15),
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
export type PhotoStandContent = z.infer<typeof contentItemSchema>
export type FontStyle = TextContent['fontStyle']

export const photoStandParamsSchema = z.object({
  productType: z.literal('photo-stand'),
  photoSize: z.enum(PHOTO_SIZE_KEYS),
  sideMargin: z.number().min(3).max(20),
  bandHeight: z.number().min(15).max(40),
  depth: z.number().min(30).max(60),
  thickness: z.number().min(2).max(4),
  angle: z.number().min(60).max(85),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
  contents: z.array(contentItemSchema).min(1).max(3),
})

export type PhotoStandParams = z.infer<typeof photoStandParamsSchema>

export const defaultPhotoStandParams: PhotoStandParams = {
  productType: 'photo-stand',
  photoSize: '10x15',
  sideMargin: 10,
  bandHeight: 25,
  depth: 40,
  thickness: 3,
  angle: 75,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
  contents: [
    {
      id: 'content-1',
      kind: 'text',
      content: 'Família',
      fontStyle: 'bold',
      fontSize: 10,
      offsetX: 0,
      offsetY: 0,
    },
  ],
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/gi, 'c')
}

export function sanitizeFilename(name: string): string {
  const normalized = normalizeName(name)
  const cleaned = normalized.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'suporte-foto'
}
```

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/schema.ts tests/features/studio/tools/letreiros/suporte-foto/schema.test.ts
git commit -m "feat(suporte-foto): reformula schema com foto, faixa e ângulo"
```

---

### Task 2: Perfil lateral e extrusão

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/shapes.ts`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/shapes.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/shapes.test.ts`:

```ts
import * as THREE from 'three'
import {
  createStandGeometry,
  createStandShape,
  getEffectiveDepth,
  getRibBack,
  getRibRun,
  getStandWidth,
} from '@/features/studio/tools/letreiros/suporte-foto/shapes'
import {
  SLOT_GAP,
  defaultPhotoStandParams,
  type PhotoStandParams,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'

const RAD = Math.PI / 180

function profilePoints(params: PhotoStandParams): Array<[number, number]> {
  const { shape } = createStandShape(params).extractPoints(1)
  return shape.map((point) => [
    Number(point.x.toFixed(4)),
    Number(point.y.toFixed(4)),
  ])
}

function vertexKey(x: number, y: number, z: number): string {
  return `${x.toFixed(4)}|${y.toFixed(4)}|${z.toFixed(4)}`
}

function expectClosedManifold(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position')
  const ids = new Map<string, number>()
  const idOf = (index: number): number => {
    const key = vertexKey(position.getX(index), position.getY(index), position.getZ(index))
    const existing = ids.get(key)
    if (existing !== undefined) return existing
    const id = ids.size
    ids.set(key, id)
    return id
  }
  const index = geometry.getIndex()
  const order = index
    ? Array.from(index.array)
    : Array.from({ length: position.count }, (_, i) => i)

  const edges = new Map<string, number>()
  for (let i = 0; i < order.length; i += 3) {
    const triangle = [idOf(order[i]), idOf(order[i + 1]), idOf(order[i + 2])]
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge]
      const b = triangle[(edge + 1) % 3]
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
  }

  for (const count of edges.values()) {
    expect(count).toBe(2)
  }
}

describe('suporte-foto shapes', () => {
  it('deriva a largura da foto e da margem lateral', () => {
    expect(getStandWidth(defaultPhotoStandParams)).toBe(120)
    expect(getStandWidth({ ...defaultPhotoStandParams, photoSize: '15x20', sideMargin: 5 })).toBe(160)
  })

  it('calcula o avanço e o fundo do painel pelo ângulo', () => {
    expect(getRibRun(defaultPhotoStandParams)).toBeCloseTo(
      (25 - 3) / Math.tan(75 * RAD),
      6,
    )
    expect(getRibBack(defaultPhotoStandParams)).toBeCloseTo(
      3 + SLOT_GAP + (25 - 3) / Math.tan(75 * RAD) + 3,
      6,
    )
  })

  it('mantém a profundidade informada quando o perfil cabe', () => {
    expect(getEffectiveDepth(defaultPhotoStandParams)).toBe(40)
  })

  it('amplia a profundidade quando o perfil não cabe', () => {
    const tight: PhotoStandParams = {
      ...defaultPhotoStandParams,
      depth: 30,
      bandHeight: 40,
      thickness: 4,
      angle: 60,
    }
    expect(getEffectiveDepth(tight)).toBeGreaterThan(tight.depth)
    expect(getEffectiveDepth(tight)).toBeCloseTo(getRibBack(tight) + 2, 6)
  })

  it('gera o perfil com faixa, fenda de 2 mm e painel inclinado', () => {
    const params = defaultPhotoStandParams
    const depth = getEffectiveDepth(params)
    const run = getRibRun(params)
    const ribBack = getRibBack(params)
    const points = profilePoints(params)
    const expected: Array<[number, number]> = [
      [0, 0],
      [0, params.bandHeight],
      [-params.thickness, params.bandHeight],
      [-params.thickness, params.thickness],
      [-(params.thickness + SLOT_GAP), params.thickness],
      [-(params.thickness + SLOT_GAP + run), params.bandHeight],
      [-ribBack, params.bandHeight],
      [-ribBack, params.thickness],
      [-depth, params.thickness],
      [-depth, 0],
    ]

    for (const point of expected) {
      expect(points).toContainEqual([
        Number(point[0].toFixed(4)),
        Number(point[1].toFixed(4)),
      ])
    }
  })

  it('extruda na largura e centraliza a peça', () => {
    const geometry = createStandGeometry(defaultPhotoStandParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const size = box.getSize(new THREE.Vector3())

    expect(size.x).toBeCloseTo(120, 3)
    expect(size.y).toBeCloseTo(25, 3)
    expect(size.z).toBeCloseTo(40, 3)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5)
    expect((box.min.y + box.max.y) / 2).toBeCloseTo(0, 5)
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 5)
  })

  it('deixa a face do conteúdo voltada para +Z', () => {
    const geometry = createStandGeometry(defaultPhotoStandParams)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.z).toBeCloseTo(20, 5)
  })

  it('gera uma base fechada (cada aresta em dois triângulos)', () => {
    expectClosedManifold(createStandGeometry(defaultPhotoStandParams))
  })
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/shapes.test.ts`
Expected: FAIL — módulo `shapes.ts` não existe.

**Step 3: Implementar**

Crie `src/features/studio/tools/letreiros/suporte-foto/shapes.ts`:

```ts
import { ExtrudeGeometry, Shape } from 'three'
import {
  PHOTO_SIZES,
  PLATE_REAR_MIN,
  SLOT_GAP,
  type PhotoStandParams,
} from './schema'

export function getStandWidth(params: PhotoStandParams): number {
  return PHOTO_SIZES[params.photoSize].width + params.sideMargin * 2
}

/** Avanço horizontal da face inclinada do painel, do topo até a base. */
export function getRibRun(params: PhotoStandParams): number {
  const radians = (params.angle * Math.PI) / 180
  return (params.bandHeight - params.thickness) / Math.tan(radians)
}

/** Posição da face traseira do painel, medida da frente da peça. */
export function getRibBack(params: PhotoStandParams): number {
  return params.thickness + SLOT_GAP + getRibRun(params) + params.thickness
}

/**
 * Profundidade usada no build. Nunca menor que o perfil exige, para a fenda e o
 * painel continuarem válidos em qualquer combinação de parâmetros.
 */
export function getEffectiveDepth(params: PhotoStandParams): number {
  return Math.max(params.depth, getRibBack(params) + PLATE_REAR_MIN)
}

/**
 * Perfil lateral no plano XY, com `x` espelhando a profundidade (`x = -z`) para
 * que a extrusão em `+Z` gere a largura. Frente da peça em `x = 0`.
 */
export function createStandShape(params: PhotoStandParams): Shape {
  const height = params.bandHeight
  const thickness = params.thickness
  const depth = getEffectiveDepth(params)
  const run = getRibRun(params)
  const ribBack = getRibBack(params)

  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(0, height)
  shape.lineTo(-thickness, height)
  shape.lineTo(-thickness, thickness)
  shape.lineTo(-(thickness + SLOT_GAP), thickness)
  shape.lineTo(-(thickness + SLOT_GAP + run), height)
  shape.lineTo(-ribBack, height)
  shape.lineTo(-ribBack, thickness)
  shape.lineTo(-depth, thickness)
  shape.lineTo(-depth, 0)
  shape.closePath()
  return shape
}

/**
 * Base da peça: perfil lateral extrudado na largura da foto, centralizada em
 * X/Y/Z, com a face do conteúdo em `z = +depth/2`.
 */
export function createStandGeometry(params: PhotoStandParams): ExtrudeGeometry {
  const width = getStandWidth(params)
  const height = params.bandHeight
  const depth = getEffectiveDepth(params)

  const geometry = new ExtrudeGeometry(createStandShape(params), {
    depth: width,
    bevelEnabled: false,
    curveSegments: 1,
  })

  geometry.rotateY(-Math.PI / 2)
  geometry.translate(width / 2, -height / 2, depth / 2)
  geometry.computeVertexNormals()
  return geometry
}
```

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/shapes.test.ts`
Expected: PASS. Se o teste de manifold falhar por vértices duplicados do `ExtrudeGeometry`, o helper já sela por posição; se ainda falhar, investigar o perfil (vértices coincidentes ou ordem dos pontos) antes de seguir.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/shapes.ts tests/features/studio/tools/letreiros/suporte-foto/shapes.test.ts
git commit -m "feat(suporte-foto): adiciona perfil lateral com fenda e painel"
```

---

### Task 3: Auto-fit da faixa

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/autoFit.ts`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/autoFit.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/autoFit.test.ts`:

```ts
import * as THREE from 'three'
import {
  clampOffset,
  fitGeometryToRegion,
  getUsableRegion,
  resolveContentGeometry,
} from '@/features/studio/tools/letreiros/suporte-foto/autoFit'
import {
  defaultPhotoStandParams,
  type PhotoStandContent,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'
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

const TEXT_ITEM: PhotoStandContent = {
  id: 'content-1',
  kind: 'text',
  content: 'Nome',
  fontStyle: 'bold',
  fontSize: 8,
  offsetX: 0,
  offsetY: 0,
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

describe('suporte-foto autoFit', () => {
  it('define a área útil recuada pela margem da faixa', () => {
    expect(getUsableRegion(defaultPhotoStandParams)).toEqual({
      kind: 'rect',
      minX: -57,
      maxX: 57,
      minY: -9.5,
      maxY: 9.5,
    })
  })

  it('acompanha a largura da foto e a altura da faixa', () => {
    const region = getUsableRegion({
      ...defaultPhotoStandParams,
      photoSize: '15x20',
      sideMargin: 5,
      bandHeight: 40,
    })
    expect(region.maxX).toBeCloseTo(77, 5)
    expect(region.maxY).toBeCloseTo(17, 5)
  })

  it('reduz apenas quando necessário e centraliza', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const geometry = new THREE.BoxGeometry(200, 10, 1)
    fitGeometryToRegion(geometry, region)
    const result = geometryBounds(geometry)
    expect(result.width).toBeCloseTo(114, 1)
    expect(result.height).toBeCloseTo(5.7, 1)
    expect(result.centerX).toBeCloseTo(0, 5)
    expect(result.centerY).toBeCloseTo(0, 5)
    expect(result.minZ).toBeCloseTo(0, 5)
  })

  it('nunca amplia a geometria', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const geometry = new THREE.BoxGeometry(10, 4, 1)
    fitGeometryToRegion(geometry, region)
    const result = geometryBounds(geometry)
    expect(result.width).toBeCloseTo(10, 5)
    expect(result.height).toBeCloseTo(4, 5)
  })

  it('clampa o offset dentro da área útil', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const clamped = clampOffset(region, 8, 4, { x: 100, y: -100 })
    expect(clamped.x).toBeCloseTo(49, 5)
    expect(clamped.y).toBeCloseTo(-5.5, 5)
  })

  it('resolve texto com auto-fit e offset', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const fitted = resolveContentGeometry(
      { ...TEXT_ITEM, offsetX: 10 },
      { region, font: fontStub },
    )
    expect(fitted).not.toBeNull()
    expect(fitted!.halfWidth).toBeCloseTo(16, 1)
    expect(fitted!.halfHeight).toBeCloseTo(4, 1)
    expect(fitted!.x).toBeCloseTo(10, 5)
    expect(fitted!.y).toBeCloseTo(0, 5)
  })

  it('encolhe texto maior que a faixa', () => {
    const region = getUsableRegion({ ...defaultPhotoStandParams, bandHeight: 15 })
    const fitted = resolveContentGeometry(
      { ...TEXT_ITEM, fontSize: 15 },
      { region, font: fontStub },
    )
    expect(fitted).not.toBeNull()
    expect(fitted!.geometry.boundingBox!.max.y - fitted!.geometry.boundingBox!.min.y)
      .toBeCloseTo(9, 1)
  })

  it('retorna null para texto vazio ou sem fonte', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    expect(resolveContentGeometry({ ...TEXT_ITEM, content: '' }, { region, font: fontStub })).toBeNull()
    expect(resolveContentGeometry(TEXT_ITEM, { region })).toBeNull()
  })

  it('resolve ícone SVG dentro da caixa', () => {
    const region = getUsableRegion(defaultPhotoStandParams)
    const iconItem: PhotoStandContent = {
      id: 'icon-1',
      kind: 'icon',
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    const parsed = parseSvg(SVG_RECT)
    const fitted = resolveContentGeometry(iconItem, { region }, parsed)
    expect(fitted).not.toBeNull()
    expect(fitted!.halfWidth).toBeGreaterThan(0)
    expect(fitted!.halfHeight).toBeGreaterThan(0)
    const bb = fitted!.geometry.boundingBox!
    expect(bb.max.z - bb.min.z).toBeCloseTo(1, 2)
  })
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/autoFit.test.ts`
Expected: FAIL — módulo `autoFit.ts` não existe.

**Step 3: Implementar**

Crie `src/features/studio/tools/letreiros/suporte-foto/autoFit.ts`:

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
  type PhotoStandContent,
  type PhotoStandParams,
} from './schema'
import { getStandWidth } from './shapes'
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

/** Área útil da faixa frontal: largura da peça × altura da faixa, menos 3 mm. */
export function getUsableRegion(params: PhotoStandParams): RectRegion {
  const halfWidth = Math.max(0.5, getStandWidth(params) / 2 - CONTENT_MARGIN)
  const halfHeight = Math.max(0.5, params.bandHeight / 2 - CONTENT_MARGIN)
  return { kind: 'rect', minX: -halfWidth, maxX: halfWidth, minY: -halfHeight, maxY: halfHeight }
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
  item: PhotoStandContent,
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
    normalizeDepth(geometry, CONTENT_DEPTH)
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

  normalizeDepth(geometry, CONTENT_DEPTH)
  fitGeometryToRegion(geometry, ctx.region)
  return fittedContent(geometry, item, ctx.region)
}

function ratio(available: number, size: number): number {
  return size > 0 ? available / size : Infinity
}

/**
 * Normaliza a espessura final em Z. O builder de ícones aplica bevel e pode
 * entregar mais que a profundidade nominal; o texto já sai com a profundidade
 * exata. Garante o relevo fixo de 1 mm para os dois tipos.
 */
function normalizeDepth(geometry: BufferGeometry, depth: number): void {
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (!bb) return

  const current = bb.max.z - bb.min.z
  if (current <= 0) return

  const scale = depth / current
  if (Math.abs(scale - 1) > 1e-6) {
    geometry.scale(1, 1, scale)
    geometry.computeBoundingBox()
  }

  const scaled = geometry.boundingBox
  if (scaled) geometry.translate(0, 0, -scaled.min.z)
}

function resolveParsedSvg(
  item: Extract<PhotoStandContent, { kind: 'icon' }>,
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
  item: PhotoStandContent,
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

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/autoFit.test.ts`
Expected: PASS (depende do `textToGeometry.ts` da Task 4; se rodar antes, crie o arquivo da Task 4 nesta etapa).

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/autoFit.ts tests/features/studio/tools/letreiros/suporte-foto/autoFit.test.ts
git commit -m "feat(suporte-foto): adiciona auto-fit da faixa frontal"
```

---

### Task 4: Geometria de texto

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/textToGeometry.ts`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/textToGeometry.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/textToGeometry.test.ts`:

```ts
import * as THREE from 'three'
import { textToGeometry } from '@/features/studio/tools/letreiros/suporte-foto/textToGeometry'

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
    const geometry = textToGeometry({ font: fontStub, text: 'ANA', size: 10, depth: 1 })
    geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    geometry.boundingBox?.getSize(size)
    expect(size.x).toBeCloseTo(40, 0)
    expect(size.y).toBeCloseTo(10, 0)
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-size.x / 2, 0)
  })

  it('usa depth como profundidade em z', () => {
    const geometry = textToGeometry({ font: fontStub, text: 'ANA', size: 10, depth: 1 })
    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.max.z).toBeGreaterThan(0)
  })
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/textToGeometry.test.ts`
Expected: FAIL — módulo não existe.

**Step 3: Implementar**

Crie `src/features/studio/tools/letreiros/suporte-foto/textToGeometry.ts`:

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
  const geometry = new TextGeometry(normalizeName(text).trim(), {
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

**Step 4: Rodar os testes das Tasks 3 e 4**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/textToGeometry.test.ts tests/features/studio/tools/letreiros/suporte-foto/autoFit.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/textToGeometry.ts tests/features/studio/tools/letreiros/suporte-foto/textToGeometry.test.ts
git commit -m "feat(suporte-foto): adiciona geometria de texto normalizada"
```

---

### Task 5: Build da peça

**Files:**
- Modify: `src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.ts`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.test.ts`:

```ts
import * as THREE from 'three'
import { buildPhotoStand, type BuildPhotoStandInput } from '@/features/studio/tools/letreiros/suporte-foto/buildPhotoStand'
import {
  CONTENT_DEPTH,
  defaultPhotoStandParams,
  type PhotoStandContent,
  type PhotoStandParams,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'
import { getEffectiveDepth } from '@/features/studio/tools/letreiros/suporte-foto/shapes'
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
      if (idx) idxArrays.push(Array.from(idx.array).map((value) => value + vertexOffset))
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
  params: Partial<PhotoStandParams> = {},
  extra: Partial<BuildPhotoStandInput> = {},
): BuildPhotoStandInput {
  return {
    fonts: { bold: fontStub, normal: fontStub, serif: fontStub },
    params: { ...defaultPhotoStandParams, ...params },
    onError: () => undefined,
    ...extra,
  }
}

function boundsOf(geometry: THREE.BufferGeometry | null): THREE.Box3 {
  if (!geometry) throw new Error('geometria ausente')
  geometry.computeBoundingBox()
  return geometry.boundingBox!
}

function textItem(overrides: Partial<PhotoStandContent> = {}): PhotoStandContent {
  return {
    id: 'content-1',
    kind: 'text',
    content: 'Nome',
    fontStyle: 'bold',
    fontSize: 8,
    offsetX: 0,
    offsetY: 0,
    ...overrides,
  } as PhotoStandContent
}

describe('buildPhotoStand', () => {
  it('gera base com largura, altura e profundidade corretas', () => {
    const result = buildPhotoStand(makeInput())
    const bb = boundsOf(result.base)
    expect(bb.max.x - bb.min.x).toBeCloseTo(120, 0)
    expect(bb.max.y - bb.min.y).toBeCloseTo(25, 0)
    expect(bb.max.z - bb.min.z).toBeCloseTo(40, 1)
    expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(0, 5)
    expect((bb.min.y + bb.max.y) / 2).toBeCloseTo(0, 5)
  })

  it('acompanha foto, margem, faixa e espessura', () => {
    const result = buildPhotoStand(makeInput({
      photoSize: '15x20',
      sideMargin: 5,
      bandHeight: 40,
      thickness: 4,
      depth: 50,
    }))
    const bb = boundsOf(result.base)
    expect(bb.max.x - bb.min.x).toBeCloseTo(160, 0)
    expect(bb.max.y - bb.min.y).toBeCloseTo(40, 0)
    expect(bb.max.z - bb.min.z).toBeCloseTo(50, 1)
  })

  it('usa a profundidade efetiva quando a informada é pequena', () => {
    const params = {
      ...defaultPhotoStandParams,
      depth: 30,
      bandHeight: 40,
      thickness: 4,
      angle: 60,
    }
    const result = buildPhotoStand(makeInput(params))
    const bb = boundsOf(result.base)
    expect(bb.max.z - bb.min.z).toBeCloseTo(getEffectiveDepth(params), 3)
  })

  it('muda a base quando o ângulo muda', () => {
    const a = buildPhotoStand(makeInput({ angle: 65 })).base
    const b = buildPhotoStand(makeInput({ angle: 85 })).base
    expect(Array.from(a.getAttribute('position').array))
      .not.toEqual(Array.from(b.getAttribute('position').array))
  })

  it('sem fontes gera base e nenhum conteúdo', () => {
    const result = buildPhotoStand(makeInput({}, { fonts: {} }))
    expect(result.content).toBeNull()
    expect(result.contentItems).toHaveLength(1)
    expect(result.contentItems[0].halfWidth).toBe(0)
  })

  it('gera conteúdo de texto com relevo fixo de 1 mm sobre a face frontal', () => {
    const result = buildPhotoStand(makeInput())
    expect(result.content).not.toBeNull()
    const bb = boundsOf(result.content)
    expect(bb.min.z).toBeCloseTo(20 - 0.01, 2)
    expect(bb.max.z - bb.min.z).toBeCloseTo(CONTENT_DEPTH, 1)
    expect(result.contentItems[0].halfWidth).toBeGreaterThan(0)
    expect(result.contentItems[0].halfHeight).toBeGreaterThan(0)
  })

  it('aplica offset X e Y no conteúdo', () => {
    const result = buildPhotoStand(makeInput({
      contents: [textItem({ offsetX: 10, offsetY: -5 })],
    }))
    const bb = boundsOf(result.content)
    expect((bb.min.x + bb.max.x) / 2).toBeCloseTo(10, 1)
    expect((bb.min.y + bb.max.y) / 2).toBeCloseTo(-5, 1)
  })

  it('clampa o offset à área útil', () => {
    const result = buildPhotoStand(makeInput({
      contents: [textItem({ fontSize: 4, offsetX: 100 })],
    }))
    const bb = boundsOf(result.content)
    expect(bb.max.x).toBeLessThanOrEqual(57.01)
  })

  it('gera conteúdo de ícone a partir do SVG parseado', () => {
    const icon: PhotoStandContent = {
      id: 'icon-1',
      kind: 'icon',
      svgIcon: SVG_RECT,
      iconScale: 1,
      iconLineWidth: 0.3,
      offsetX: 0,
      offsetY: 0,
    }
    const parsed = parseSvg(SVG_RECT)
    const result = buildPhotoStand(makeInput(
      { contents: [icon] },
      { parsedSvgs: { 'icon-1': parsed } },
    ))
    expect(result.content).not.toBeNull()
    expect(result.contentItems[0].halfWidth).toBeGreaterThan(0)
    const bb = boundsOf(result.content)
    expect(bb.max.z - bb.min.z).toBeCloseTo(CONTENT_DEPTH, 2)
  })

  it('ignora texto vazio', () => {
    const result = buildPhotoStand(makeInput({ contents: [textItem({ content: '' })] }))
    expect(result.content).toBeNull()
    expect(result.contentItems[0].halfWidth).toBe(0)
  })
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.test.ts`
Expected: FAIL — o build atual devolve `leftText/rightText`.

**Step 3: Implementar**

Substitua todo o conteúdo de `src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.ts` por:

```ts
import { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getUsableRegion, resolveContentGeometry } from './autoFit'
import { createStandGeometry, getEffectiveDepth } from './shapes'
import type { FontStyle, PhotoStandParams } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'

export interface BuildPhotoStandInput {
  params: PhotoStandParams
  font?: Font
  fonts?: Partial<Record<FontStyle, Font>>
  parsedSvgs?: Record<string, ParsedSvg | null>
  onError?: (message: string) => void
}

export interface BuildContentItem {
  id: string
  halfWidth: number
  halfHeight: number
}

export interface BuildPhotoStandResult {
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

export function buildPhotoStand({
  params,
  font,
  fonts,
  parsedSvgs,
  onError,
}: BuildPhotoStandInput): BuildPhotoStandResult {
  const base = createStandGeometry(params)

  const region = getUsableRegion(params)
  const contentZ = getEffectiveDepth(params) / 2 - 0.01
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
      })
      continue
    }

    fitted.geometry.translate(fitted.x, fitted.y, contentZ)
    contentItems.push({
      id: item.id,
      halfWidth: fitted.halfWidth,
      halfHeight: fitted.halfHeight,
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

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.ts tests/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.test.ts
git commit -m "feat(suporte-foto): reescreve build sobre o perfil extrudado"
```

---

### Task 6: Worker e serialização

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/workerGeometry.ts`
- Create: `src/features/studio/tools/letreiros/suporte-foto/workerClient.ts`
- Create: `src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.worker.ts`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/workerGeometry.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/workerGeometry.test.ts`:

```ts
import * as THREE from 'three'
import {
  deserializePhotoStandResult,
  serializePhotoStandResult,
} from '@/features/studio/tools/letreiros/suporte-foto/workerGeometry'
import type { BuildPhotoStandResult } from '@/features/studio/tools/letreiros/suporte-foto/buildPhotoStand'

function result(): BuildPhotoStandResult {
  return {
    base: new THREE.BoxGeometry(120, 25, 40),
    content: new THREE.BoxGeometry(40, 8, 1),
    contentItems: [{ id: 'c1', halfWidth: 20, halfHeight: 4 }],
  }
}

it('serializa e desserializa base, conteúdo e metadados', () => {
  const original = result()
  const { data, transfer } = serializePhotoStandResult(original)
  const restored = deserializePhotoStandResult(data)

  expect(restored.base.getAttribute('position').count).toBe(24)
  expect(restored.content?.getAttribute('position').count).toBe(24)
  expect(restored.contentItems).toEqual([
    { id: 'c1', halfWidth: 20, halfHeight: 4 },
  ])
  expect(restored.base.getAttribute('normal')).toBeDefined()
  expect(transfer).toHaveLength(8)
  expect(new Set(transfer).size).toBe(8)
  expect(data.base.position.buffer).toBe(transfer[0])
  expect(original.base.getAttribute('position').count).toBe(24)
})

it('não compartilha metadados com o resultado original', () => {
  const original = result()
  const { data } = serializePhotoStandResult(original)
  const restored = deserializePhotoStandResult(data)
  expect(restored.contentItems).not.toBe(data.contentItems)
  expect(restored.contentItems[0]).not.toBe(data.contentItems[0])
})

it('aceita conteúdo nulo', () => {
  const { data, transfer } = serializePhotoStandResult({ ...result(), content: null })
  expect(deserializePhotoStandResult(data).content).toBeNull()
  expect(transfer).toHaveLength(4)
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/workerGeometry.test.ts`
Expected: FAIL — módulos não existem.

**Step 3: Implementar**

Crie `src/features/studio/tools/letreiros/suporte-foto/workerGeometry.ts`:

```ts
import type { BuildPhotoStandResult } from './buildPhotoStand'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from '../../confeitaria/shared/workerGeometry'

export interface SerializedPhotoStandResult {
  base: SerializedGeometry
  content: SerializedGeometry | null
  contentItems: Array<{ id: string; halfWidth: number; halfHeight: number }>
}

export function serializePhotoStandResult(result: BuildPhotoStandResult): {
  data: SerializedPhotoStandResult
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

export function deserializePhotoStandResult(data: SerializedPhotoStandResult): BuildPhotoStandResult {
  return {
    base: deserializeGeometry(data.base),
    content: data.content ? deserializeGeometry(data.content) : null,
    contentItems: data.contentItems.map((item) => ({ ...item })),
  }
}
```

Crie `src/features/studio/tools/letreiros/suporte-foto/workerClient.ts`:

```ts
import type { FontStyle, PhotoStandParams } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import type { SerializedPhotoStandResult } from './workerGeometry'

export interface PhotoStandWorkerRequest {
  params: PhotoStandParams
  parsedSvgs: Record<string, ParsedSvg | null>
  styles: FontStyle[]
}

export interface PhotoStandWorker {
  build(
    request: PhotoStandWorkerRequest,
    onResult: (data: SerializedPhotoStandResult) => void,
    onError?: (message: string) => void,
  ): void
  terminate(): void
}

export function createPhotoStandWorker(): PhotoStandWorker {
  const worker = new Worker(new URL('./buildPhotoStand.worker.ts', import.meta.url), { type: 'module' })
  let terminated = false
  return {
    build(request, onResult, onError) {
      if (terminated) {
        onError?.('Worker encerrado')
        return
      }
      worker.onmessage = (event: MessageEvent<{ data?: SerializedPhotoStandResult; error?: string }>) => {
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

Crie `src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.worker.ts`:

```ts
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildPhotoStand } from './buildPhotoStand'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'
import { serializePhotoStandResult } from './workerGeometry'
import type { FontStyle, PhotoStandParams } from './schema'
import type { ParsedSvg } from '../../confeitaria/shared/svgToIconShape'

interface BuildRequest {
  params: PhotoStandParams
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

    // O worker não tem DOMParser: SVGs precisam chegar já parseados pela main thread.
    const safeParsedSvgs = { ...parsedSvgs }
    for (const item of params.contents) {
      if (item.kind === 'icon' && item.svgIcon && safeParsedSvgs[item.id] === undefined) {
        safeParsedSvgs[item.id] = null
      }
    }

    const { data, transfer } = serializePhotoStandResult(
      buildPhotoStand({ params, fonts, parsedSvgs: safeParsedSvgs }),
    )
    scope.postMessage({ data }, transfer)
  } catch (error) {
    scope.postMessage({
      error: error instanceof Error ? error.message : 'Falha ao gerar a peça',
    })
  }
}
```

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/workerGeometry.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/workerGeometry.ts src/features/studio/tools/letreiros/suporte-foto/workerClient.ts src/features/studio/tools/letreiros/suporte-foto/buildPhotoStand.worker.ts tests/features/studio/tools/letreiros/suporte-foto/workerGeometry.test.ts
git commit -m "feat(suporte-foto): adiciona build em Web Worker"
```

---

### Task 7: Exportação STL

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/exportStl.ts`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/exportStl.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/exportStl.test.ts` (mesma estrutura do cartão, com o nome de arquivo da nova ferramenta):

```ts
import * as THREE from 'three'
import type { MockInstance } from 'vitest'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { exportStl } from '@/features/studio/tools/letreiros/suporte-foto/exportStl'
import type { BuildPhotoStandResult } from '@/features/studio/tools/letreiros/suporte-foto/buildPhotoStand'

vi.mock('three/examples/jsm/utils/BufferGeometryUtils.js', () => ({
  mergeGeometries: vi.fn((geos: THREE.BufferGeometry[]) => {
    if (geos.length === 0) return null
    return geos[0].clone()
  }),
}))

const mergeMock = vi.mocked(mergeGeometries)

function makeGeometry(content: THREE.BufferGeometry | null): BuildPhotoStandResult {
  return {
    base: new THREE.BoxGeometry(120, 25, 40),
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
    exportStl(makeGeometry(new THREE.BoxGeometry(40, 8, 1)), 'Suporte Família! @#')
    expect(harness.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (harness.createObjectURL.mock.calls as unknown[][])[0]![0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(harness.anchorStub.download).toBe('Suporte-Familia.stl')
    expect(harness.clickSpy).toHaveBeenCalledTimes(1)
    expect(harness.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('combina base e conteúdo na ordem correta', () => {
    setupDownloadHarness()
    const content = new THREE.BoxGeometry(40, 8, 1)
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
    exportStl(makeGeometry(null), 'Sem conteúdo')
    expect(lastMergeArguments()).toHaveLength(1)
  })

  it('informa erro e não baixa quando a mesclagem falha', () => {
    const harness = setupDownloadHarness()
    mergeMock.mockReturnValueOnce(null as unknown as THREE.BufferGeometry)
    const onError = vi.fn()

    exportStl(makeGeometry(new THREE.BoxGeometry(40, 8, 1)), 'Falha', onError)

    expect(onError).toHaveBeenCalledWith('Falha ao mesclar geometrias para exportação')
    expect(harness.createObjectURL).not.toHaveBeenCalled()
  })
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/exportStl.test.ts`
Expected: FAIL — módulo não existe.

**Step 3: Implementar**

Crie `src/features/studio/tools/letreiros/suporte-foto/exportStl.ts`:

```ts
import { BufferAttribute, BufferGeometry, Mesh, Scene } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { sanitizeFilename } from './schema'
import type { BuildPhotoStandResult } from './buildPhotoStand'

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

export function exportStl(
  geometry: BuildPhotoStandResult,
  projectName: string,
  onError?: (message: string) => void,
): void {
  const geometries = geometry.content
    ? [geometry.base, geometry.content]
    : [geometry.base]
  const normalized = geometries.map(normalizeForMerge)
  const merged = mergeGeometries(normalized)
  if (!merged) {
    normalized.forEach((item) => item.dispose())
    onError?.('Falha ao mesclar geometrias para exportação')
    return
  }
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

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/exportStl.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/exportStl.ts tests/features/studio/tools/letreiros/suporte-foto/exportStl.test.ts
git commit -m "feat(suporte-foto): adiciona exportação STL"
```

---

### Task 8: Hook com worker

**Files:**
- Modify: `src/features/studio/tools/letreiros/suporte-foto/usePhotoStand.ts`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/usePhotoStand.test.ts`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/usePhotoStand.test.ts`:

```ts
import * as THREE from 'three'
import { act, renderHook } from '@testing-library/react'
import { usePhotoStand } from '@/features/studio/tools/letreiros/suporte-foto/usePhotoStand'
import { defaultPhotoStandParams } from '@/features/studio/tools/letreiros/suporte-foto/schema'
import {
  serializePhotoStandResult,
  type SerializedPhotoStandResult,
} from '@/features/studio/tools/letreiros/suporte-foto/workerGeometry'
import type {
  PhotoStandWorker,
  PhotoStandWorkerRequest,
} from '@/features/studio/tools/letreiros/suporte-foto/workerClient'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect x="0" y="0" width="20" height="10" fill="#000"/></svg>'
const INVALID_SVG = 'não é svg'

function serialized(): SerializedPhotoStandResult {
  return serializePhotoStandResult({
    base: new THREE.BoxGeometry(120, 25, 40),
    content: new THREE.BoxGeometry(40, 8, 1),
    contentItems: [{ id: 'content-1', halfWidth: 20, halfHeight: 4 }],
  }).data
}

interface WorkerRecord {
  pending: ((data: SerializedPhotoStandResult) => void) | null
  fail: ((message: string) => void) | null
  terminate: ReturnType<typeof vi.fn>
}

function makeWorkerFixture() {
  const workers: WorkerRecord[] = []
  let lastRequest: PhotoStandWorkerRequest | null = null
  const factory = (): PhotoStandWorker => {
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
    respond: (data: SerializedPhotoStandResult = serialized(), index = workers.length - 1) =>
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

describe('usePhotoStand', () => {
  it('inicia com um conteúdo de texto', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    expect(result.current.params.contents).toHaveLength(1)
    const first = result.current.params.contents[0]
    expect(first.kind).toBe('text')
    if (first.kind === 'text') expect(first.content).toBe('Família')
  })

  it('expõe dimensões de fallback antes da geometria', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    expect(result.current.dimensions).toEqual({ width: 120, height: 25, thickness: 40 })
    expect(result.current.fitRadius).toBeGreaterThan(0)
  })

  it('updateParam clampa valores da peça', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    act(() => result.current.updateParam('sideMargin', 1))
    expect(result.current.params.sideMargin).toBe(3)
    act(() => result.current.updateParam('angle', 100))
    expect(result.current.params.angle).toBe(85)
    act(() => result.current.updateParam('photoSize', '15x20'))
    expect(result.current.params.photoSize).toBe('15x20')
    expect(result.current.dimensions.width).toBe(170)
  })

  it('reset restaura defaults', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    act(() => result.current.updateParam('bandHeight', 35))
    act(() => result.current.reset())
    expect(result.current.params).toEqual(defaultPhotoStandParams)
  })

  it('addContent respeita o limite de 3 e retorna o id', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    act(() => {
      result.current.addContent()
      result.current.addContent()
    })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current.params.contents.length).toBeLessThanOrEqual(3)
    expect(result.current.addContent()).toBeNull()
  })

  it('removeContent não remove o último item', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    act(() => result.current.removeContent(result.current.params.contents[0].id))
    expect(result.current.params.contents).toHaveLength(1)
  })

  it('updateContent patcha e clampa valores', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { fontSize: 20, offsetX: 200 }))
    const item = result.current.params.contents[0]
    if (item.kind !== 'text') throw new Error('conteúdo inesperado')
    expect(item.fontSize).toBe(15)
    expect(item.offsetX).toBe(90)
  })

  it('troca o tipo de conteúdo preservando os offsets', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: factory }))
    const id = result.current.params.contents[0].id
    act(() => result.current.updateContent(id, { offsetX: 5, offsetY: -3 }))
    act(() => result.current.setContentType(id, 'icon'))
    const item = result.current.params.contents[0]
    expect(item.kind).toBe('icon')
    expect(item.offsetX).toBe(5)
    expect(item.offsetY).toBe(-3)
  })

  it('gera a peça no worker após o debounce', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.isBuilding).toBe(true)
    expect(fixture.getRequest()?.params.productType).toBe('photo-stand')

    act(() => fixture.respond())
    expect(result.current.geometry).not.toBeNull()
    expect(result.current.isBuilding).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.dimensions).toEqual({ width: 120, height: 25, thickness: 40 })
  })

  it('ignora resposta de worker obsoleto', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))

    act(() => {
      vi.advanceTimersByTime(200)
    })
    const staleIndex = fixture.workers.length - 1

    act(() => result.current.updateParam('bandHeight', 30))
    act(() => {
      vi.advanceTimersByTime(200)
    })

    act(() => fixture.respond(serialized(), staleIndex))
    expect(result.current.geometry).toBeNull()

    act(() => fixture.respond())
    expect(result.current.geometry).not.toBeNull()
  })

  it('informa erro quando o worker falha', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => fixture.fail('Falha ao gerar a peça'))
    expect(result.current.error).toBe('Falha ao gerar a peça')
    expect(result.current.isBuilding).toBe(false)
  })

  it('informa erro ao ler um SVG inválido', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))
    const id = result.current.params.contents[0].id

    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: INVALID_SVG }))
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.error).toBe('Não foi possível ler o SVG')
  })

  it('envia o SVG parseado e os estilos usados ao worker', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))
    const id = result.current.params.contents[0].id

    act(() => result.current.setContentType(id, 'icon'))
    act(() => result.current.updateContent(id, { svgIcon: SVG }))
    act(() => {
      vi.advanceTimersByTime(200)
    })

    const request = fixture.getRequest()
    expect(request?.parsedSvgs[id]).toBeTruthy()
    expect(request?.styles).toEqual([])
  })

  it('trocar cor não reconstrói a geometria', () => {
    const fixture = makeWorkerFixture()
    const { result } = renderHook(() => usePhotoStand({ workerFactory: fixture.factory }))

    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => fixture.respond())
    const workersAfterBuild = fixture.workers.length

    act(() => result.current.updateParam('baseColor', '#ef4444'))
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(fixture.workers.length).toBe(workersAfterBuild)
  })
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/usePhotoStand.test.ts`
Expected: FAIL — o hook atual usa `FontLoader` na main thread e não tem ações de conteúdo.

**Step 3: Implementar**

Substitua todo o conteúdo de `src/features/studio/tools/letreiros/suporte-foto/usePhotoStand.ts` por:

```ts
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Box3, Vector3 } from 'three'
import {
  defaultPhotoStandParams,
  photoStandParamsSchema,
  type FontStyle,
  type IconContent,
  type PhotoStandContent,
  type PhotoStandParams,
  type TextContent,
} from './schema'
import type { BuildPhotoStandResult } from './buildPhotoStand'
import { parseSvg, type ParsedSvg } from '../../confeitaria/shared/svgToIconShape'
import {
  deserializePhotoStandResult,
  type SerializedPhotoStandResult,
} from './workerGeometry'
import { createPhotoStandWorker, type PhotoStandWorker } from './workerClient'
import { getEffectiveDepth, getStandWidth } from './shapes'

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

type PhotoStandAction =
  | { type: 'update'; key: keyof PhotoStandParams; value: number | string }
  | { type: 'updateContent'; id: string; patch: Partial<TextContent> | Partial<IconContent> }
  | { type: 'setContentType'; id: string; kind: 'text' | 'icon' }
  | { type: 'addContent'; id: string }
  | { type: 'removeContent'; id: string }
  | { type: 'reset' }

const NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  sideMargin: { min: 3, max: 20 },
  bandHeight: { min: 15, max: 40 },
  depth: { min: 30, max: 60 },
  thickness: { min: 2, max: 4 },
  angle: { min: 60, max: 85 },
}

const CONTENT_NUMERIC_RANGES: Record<string, { min: number; max: number }> = {
  fontSize: { min: 3, max: 15 },
  iconScale: { min: 0.5, max: 1 },
  iconLineWidth: { min: 0.1, max: 1.5 },
  offsetX: { min: -90, max: 90 },
  offsetY: { min: -25, max: 25 },
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

function freshDefaults(): PhotoStandParams {
  return {
    ...defaultPhotoStandParams,
    contents: defaultPhotoStandParams.contents.map((item) => ({ ...item })),
  }
}

function photoStandReducer(state: PhotoStandParams, action: PhotoStandAction): PhotoStandParams {
  switch (action.type) {
    case 'update': {
      const clamped = typeof action.value === 'number'
        ? clampValue(action.key, action.value)
        : action.value
      const next = { ...state, [action.key]: clamped }
      const parsed = photoStandParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'updateContent': {
      if (!state.contents.some((item) => item.id === action.id)) return state
      const patch = clampContentPatch(action.patch)
      const nextContents = state.contents.map((item) =>
        item.id === action.id ? ({ ...item, ...patch } as PhotoStandContent) : item,
      )
      const next = { ...state, contents: nextContents }
      const parsed = photoStandParamsSchema.safeParse(next)
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
      const parsed = photoStandParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'addContent': {
      if (state.contents.length >= 3) return state
      const newItem: TextContent = {
        id: action.id,
        kind: 'text',
        ...TEXT_DEFAULTS,
        offsetY: state.contents.length === 1 ? -6 : 6,
      }
      const next = { ...state, contents: [...state.contents, newItem] }
      const parsed = photoStandParamsSchema.safeParse(next)
      return parsed.success ? parsed.data : state
    }
    case 'removeContent': {
      if (state.contents.length <= 1) return state
      const next = { ...state, contents: state.contents.filter((item) => item.id !== action.id) }
      const parsed = photoStandParamsSchema.safeParse(next)
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

export interface UsePhotoStandOptions {
  workerFactory?: () => PhotoStandWorker
}

export function usePhotoStand(options: UsePhotoStandOptions = {}) {
  const workerFactory = options.workerFactory ?? createPhotoStandWorker
  const [params, dispatch] = useReducer(photoStandReducer, defaultPhotoStandParams)
  const [geometry, setGeometry] = useState<BuildPhotoStandResult | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const geometryRef = useRef<BuildPhotoStandResult | null>(null)
  const workerRef = useRef<PhotoStandWorker | null>(null)
  const workerFactoryRef = useRef(workerFactory)
  const parseCacheRef = useRef<Map<string, ParsedSvg | null>>(new Map())
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    workerFactoryRef.current = workerFactory
  }, [workerFactory])

  // Cor não altera a geometria: o build só depende destes campos.
  // Serializa em ordem fixa (arrays) para não depender da ordem das chaves do Zod.
  const buildKey = useMemo(() => JSON.stringify({
    photoSize: params.photoSize,
    sideMargin: params.sideMargin,
    bandHeight: params.bandHeight,
    depth: params.depth,
    thickness: params.thickness,
    angle: params.angle,
    contents: params.contents.map((item) => item.kind === 'text'
      ? ['text', item.id, item.content, item.fontStyle, item.fontSize, item.offsetX, item.offsetY]
      : ['icon', item.id, item.svgIcon, item.iconScale, item.iconLineWidth, item.offsetX, item.offsetY]),
  }), [
    params.photoSize,
    params.sideMargin,
    params.bandHeight,
    params.depth,
    params.thickness,
    params.angle,
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
      let worker: PhotoStandWorker
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
        worker.build({ params: current, parsedSvgs, styles: styleList }, (data: SerializedPhotoStandResult) => {
          if (workerRef.current !== worker) return
          let next: BuildPhotoStandResult
          try {
            next = deserializePhotoStandResult(data)
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

  const updateParam = useCallback((key: keyof PhotoStandParams, value: number | string) => {
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

  const objectBounds = useMemo(() => {
    const fallback = {
      width: getStandWidth(params),
      height: params.bandHeight,
      depth: getEffectiveDepth(params),
    }
    if (!geometry) return fallback

    const box = new Box3()
    geometry.base.computeBoundingBox()
    if (geometry.base.boundingBox) box.union(geometry.base.boundingBox)
    if (geometry.content) {
      geometry.content.computeBoundingBox()
      if (geometry.content.boundingBox) box.union(geometry.content.boundingBox)
    }
    const size = box.getSize(new Vector3())
    return { width: size.x, height: size.y, depth: size.z }
  }, [geometry, params])

  const dimensions = useMemo(() => ({
    width: Number(objectBounds.width.toFixed(1)),
    height: Number(objectBounds.height.toFixed(1)),
    thickness: Number(objectBounds.depth.toFixed(1)),
  }), [objectBounds])

  const fitRadius = useMemo(
    () => Math.max(
      1,
      0.5 * Math.hypot(objectBounds.width, objectBounds.height, objectBounds.depth),
    ),
    [objectBounds],
  )

  const cameraPosition = useMemo((): [number, number, number] => {
    const distance = fitRadius * 2.2
    const elevation = (25 * Math.PI) / 180
    const azimuth = (210 * Math.PI) / 180
    const x = distance * Math.sin(azimuth) * Math.cos(elevation)
    const z = distance * Math.cos(azimuth) * Math.cos(elevation)
    const y = distance * Math.sin(elevation)
    return [Number(x.toFixed(1)), Number(y.toFixed(1)), Number(z.toFixed(1))]
  }, [fitRadius])

  return {
    params,
    geometry,
    isBuilding,
    error,
    dimensions,
    cameraPosition,
    fitRadius,
    updateParam,
    updateContent,
    setContentType,
    addContent,
    removeContent,
    reset,
  }
}
```

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/usePhotoStand.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/usePhotoStand.ts tests/features/studio/tools/letreiros/suporte-foto/usePhotoStand.test.ts
git commit -m "feat(suporte-foto): reescreve hook com worker e conteúdos"
```

---

### Task 9: Painel de parâmetros

**Files:**
- Modify: `src/features/studio/tools/letreiros/suporte-foto/StudioPanel.tsx`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/StudioPanel.test.tsx`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/StudioPanel.test.tsx`:

```tsx
import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioPanel } from '@/features/studio/tools/letreiros/suporte-foto/StudioPanel'
import {
  defaultPhotoStandParams,
  PHOTO_SIZES,
  type IconContent,
  type PhotoStandParams,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'

type PanelProps = ComponentProps<typeof StudioPanel>

const firstId = defaultPhotoStandParams.contents[0].id

function createPanelProps(overrides: Partial<PanelProps> = {}): PanelProps {
  return {
    params: defaultPhotoStandParams,
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

function iconParams(svgIcon: string | null = null): PhotoStandParams {
  const icon: IconContent = {
    id: 'icon-1',
    kind: 'icon',
    svgIcon,
    iconScale: 1,
    iconLineWidth: 0.3,
    offsetX: 0,
    offsetY: 0,
  }
  return { ...defaultPhotoStandParams, contents: [icon] }
}

function getSlider(label: string): HTMLElement {
  return within(screen.getByLabelText(label)).getByRole('slider')
}

describe('StudioPanel', () => {
  it('renderiza título, chips, adicionar e tipo de conteúdo', () => {
    renderPanel()
    expect(screen.getByRole('heading', { level: 2, name: 'Suporte para Foto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /família/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /adicionar texto/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Texto' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Ícone' })).not.toBeChecked()
  })

  it('usa "Texto" no chip quando o conteúdo está vazio', () => {
    const first = defaultPhotoStandParams.contents[0]
    if (first.kind !== 'text') throw new Error('conteúdo inesperado')
    renderPanel({
      params: { ...defaultPhotoStandParams, contents: [{ ...first, content: '' }] },
    })
    expect(screen.getByRole('button', { name: 'Texto' })).toBeInTheDocument()
  })

  it('seleciona, adiciona e remove conteúdos', async () => {
    const user = userEvent.setup()
    const second = {
      ...defaultPhotoStandParams.contents[0],
      id: 'content-2',
      content: 'Segundo',
    }
    const props = renderPanel({
      params: { ...defaultPhotoStandParams, contents: [defaultPhotoStandParams.contents[0], second] },
    })
    await user.click(screen.getByRole('button', { name: /segundo/i }))
    expect(props.onSelectContent).toHaveBeenCalledWith('content-2')

    await user.click(screen.getByRole('button', { name: /adicionar texto/i }))
    expect(props.onAddContent).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Remover conteúdo' }))
    expect(props.onRemoveContent).toHaveBeenCalledWith(firstId)
  })

  it('não mostra remover com um único conteúdo', () => {
    renderPanel()
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
    expect(props.onUpdateContent).toHaveBeenCalledWith(firstId, { fontSize: 10.5 })
  })

  it('alterna para ícone', async () => {
    const user = userEvent.setup()
    const props = renderPanel()
    await user.click(screen.getByRole('radio', { name: 'Ícone' }))
    expect(props.onSetContentType).toHaveBeenCalledWith(firstId, 'icon')
  })

  it('faz upload de SVG e chama onUpdateContent', async () => {
    const props = renderPanel({ params: iconParams() })
    const file = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#000"/></svg>'],
      'logo.svg',
      { type: 'image/svg+xml' },
    )
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

  it('atualiza parâmetros da foto e da base', () => {
    const props = renderPanel()
    fireEvent.keyDown(getSlider('Margem lateral'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('sideMargin', 11)
    fireEvent.keyDown(getSlider('Inclinação'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('angle', 76)
    fireEvent.keyDown(getSlider('Altura da faixa'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('bandHeight', 26)
    fireEvent.keyDown(getSlider('Profundidade'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('depth', 41)
    fireEvent.keyDown(getSlider('Espessura'), { key: 'ArrowRight' })
    expect(props.onUpdateParam).toHaveBeenCalledWith('thickness', 3.5)
  })

  it('troca o tamanho da foto', async () => {
    const user = userEvent.setup()
    const props = renderPanel()
    await user.selectOptions(screen.getByLabelText('Tamanho da foto'), '13x18')
    expect(props.onUpdateParam).toHaveBeenCalledWith('photoSize', '13x18')
  })

  it('mostra o tamanho da foto como referência', () => {
    renderPanel()
    expect(screen.getByText(`Foto de ${PHOTO_SIZES['10x15'].width} × ${PHOTO_SIZES['10x15'].height} mm`)).toBeInTheDocument()
  })

  it('abre o editor e restaura defaults', async () => {
    const user = userEvent.setup()
    const props = renderPanel()
    await user.click(screen.getByRole('button', { name: /posicionar conteúdos/i }))
    expect(props.onOpenEditor).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /restaurar/i }))
    expect(props.onReset).toHaveBeenCalledTimes(1)
  })

  it('explica relevo, cobertura da foto e estabilidade', () => {
    renderPanel()
    expect(screen.getByText(/elevados em 1 mm/i)).toBeInTheDocument()
    expect(screen.getByText(/faixa cobre a borda inferior/i)).toBeInTheDocument()
    expect(screen.getByText(/ângulos menores exigem base mais profunda/i)).toBeInTheDocument()
  })
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/StudioPanel.test.tsx`
Expected: FAIL — painel atual só tem Texto/Foto/Base/Aparência sem chips nem editor.

**Step 3: Implementar**

Substitua todo o conteúdo de `src/features/studio/tools/letreiros/suporte-foto/StudioPanel.tsx` por:

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
  type FontStyle,
  type IconContent,
  type PhotoStandParams,
  type TextContent,
  PHOTO_SIZES,
  PLA_COLORS,
} from './schema'

interface StudioPanelProps {
  params: PhotoStandParams
  selectedContentId: string
  onSelectContent: (id: string) => void
  onUpdateContent: (id: string, patch: Partial<TextContent> | Partial<IconContent>) => void
  onSetContentType: (id: string, kind: 'text' | 'icon') => void
  onAddContent: () => void
  onRemoveContent: (id: string) => void
  onUpdateParam: (key: keyof PhotoStandParams, value: number | string) => void
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
  const photo = PHOTO_SIZES[params.photoSize]

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
    reader.onload = (loadEvent) => {
      const svgContent = loadEvent.target?.result as string
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
          Suporte para Foto
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
                    max={15}
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

        <Accordion.Item value="foto">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Foto
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Tamanho da foto"
                value={params.photoSize}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('photoSize', event.target.value)
                }
              >
                <option value="10x15">10 × 15 cm</option>
                <option value="13x18">13 × 18 cm</option>
                <option value="15x20">15 × 20 cm</option>
              </SelectField>

              <Text fontSize="xs" color="font.tertiary">
                Foto de {photo.width} × {photo.height} mm
              </Text>

              <LabeledSlider
                label="Margem lateral"
                value={params.sideMargin}
                unit="mm"
                min={3}
                max={20}
                step={1}
                onChange={(value) => onUpdateParam('sideMargin', value)}
              />

              <LabeledSlider
                label="Inclinação"
                value={params.angle}
                unit="°"
                min={60}
                max={85}
                step={1}
                onChange={(value) => onUpdateParam('angle', value)}
              />

              <Text fontSize="xs" color="font.tertiary">
                A faixa cobre a borda inferior da foto. Ângulos menores exigem base mais profunda.
              </Text>
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
              <LabeledSlider
                label="Altura da faixa"
                value={params.bandHeight}
                unit="mm"
                min={15}
                max={40}
                step={1}
                onChange={(value) => onUpdateParam('bandHeight', value)}
              />
              <LabeledSlider
                label="Profundidade"
                value={params.depth}
                unit="mm"
                min={30}
                max={60}
                step={1}
                onChange={(value) => onUpdateParam('depth', value)}
              />
              <LabeledSlider
                label="Espessura"
                value={params.thickness}
                unit="mm"
                min={2}
                max={4}
                step={0.5}
                onChange={(value) => onUpdateParam('thickness', value)}
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

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/StudioPanel.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/StudioPanel.tsx tests/features/studio/tools/letreiros/suporte-foto/StudioPanel.test.tsx
git commit -m "feat(suporte-foto): reformula painel com conteúdo, foto e base"
```

---

### Task 10: Editor 2D da faixa

**Files:**
- Create: `src/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor.tsx`
- Test: `tests/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor.test.tsx`

**Step 1: Escrever o teste falho**

Crie `tests/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import * as THREE from 'three'
import { PhotoPositionEditor } from '@/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor'
import {
  defaultPhotoStandParams,
  type IconContent,
  type PhotoStandParams,
} from '@/features/studio/tools/letreiros/suporte-foto/schema'
import type { BuildPhotoStandResult } from '@/features/studio/tools/letreiros/suporte-foto/buildPhotoStand'

if (typeof window.PointerEvent === 'undefined') {
  Object.defineProperty(window, 'PointerEvent', {
    value: MouseEvent,
    configurable: true,
    writable: true,
  })
}

const firstId = defaultPhotoStandParams.contents[0].id

function mockGeometry(): BuildPhotoStandResult {
  return {
    base: new THREE.BufferGeometry(),
    content: new THREE.BufferGeometry(),
    contentItems: [{ id: firstId, halfWidth: 5, halfHeight: 2 }],
  }
}

function iconParams(offsetX = 0, offsetY = 0): PhotoStandParams {
  const icon: IconContent = {
    id: 'icon-1',
    kind: 'icon',
    svgIcon: null,
    iconScale: 1,
    iconLineWidth: 0.3,
    offsetX,
    offsetY,
  }
  return { ...defaultPhotoStandParams, contents: [icon] }
}

function renderEditor(overrides: {
  params?: PhotoStandParams
  geometry?: BuildPhotoStandResult | null
  selectedContentId?: string
  onSelectContent?: (id: string) => void
  onMoveContent?: (id: string, x: number, y: number) => void
  onClose?: () => void
} = {}) {
  return render(
    <PhotoPositionEditor
      params={overrides.params ?? defaultPhotoStandParams}
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

describe('PhotoPositionEditor', () => {
  it('renderiza faixa, área útil e caixa de conteúdo', () => {
    renderEditor()
    expect(screen.getByTestId('editor-base')).toBeInTheDocument()
    expect(screen.getByTestId('editor-valid-area')).toBeInTheDocument()
    expect(screen.getByTestId(`editor-content-${firstId}`)).toBeInTheDocument()
    expect(screen.getByText('Família')).toBeInTheDocument()
  })

  it('usa viewBox da faixa com padding', () => {
    const { container } = renderEditor()
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-65 -17.5 130 35')
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
    expect(x).toBeCloseTo(52, 1)
    expect(y).toBeCloseTo(-7.5, 1)
  })

  it('seleciona ao focar e ativa com Enter', () => {
    const onSelectContent = vi.fn()
    renderEditor({ onSelectContent, selectedContentId: '' })
    const element = screen.getByTestId(`editor-content-${firstId}`)

    fireEvent.focus(element)
    expect(onSelectContent).toHaveBeenCalledWith(firstId)

    fireEvent.keyDown(element, { key: 'Enter' })
    expect(onSelectContent).toHaveBeenCalledTimes(2)
  })

  it('move com as setas do teclado', () => {
    const onMoveContent = vi.fn()
    renderEditor({ onMoveContent })
    fireEvent.keyDown(screen.getByTestId(`editor-content-${firstId}`), { key: 'ArrowRight' })
    expect(onMoveContent).toHaveBeenCalledWith(firstId, 1, 0)
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

  it('mostra placeholder de ícone', () => {
    renderEditor({ params: iconParams() })
    expect(screen.getByText('ícone')).toBeInTheDocument()
  })

  it('usa "Texto" como label para conteúdo vazio', () => {
    const first = defaultPhotoStandParams.contents[0]
    if (first.kind !== 'text') throw new Error('conteúdo inesperado')
    renderEditor({
      params: { ...defaultPhotoStandParams, contents: [{ ...first, content: '' }] },
    })
    expect(screen.getByText('Texto')).toBeInTheDocument()
  })
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor.test.tsx`
Expected: FAIL — módulo não existe.

**Step 3: Implementar**

Crie `src/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { Button, Flex, Heading } from '@aws-amplify/ui-react'
import { clampOffset, getUsableRegion } from './autoFit'
import { getStandWidth } from './shapes'
import type { PhotoStandParams } from './schema'
import type { BuildPhotoStandResult } from './buildPhotoStand'

const FALLBACK_HALF_WIDTH = 4
const FALLBACK_HALF_HEIGHT = 3
const FALLBACK_PADDING = 5
const DRAG_THRESHOLD = 0.5
const HEADING_ID = 'photo-stand-position-editor-heading'

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

function labelOf(item: PhotoStandParams['contents'][number]): string {
  if (item.kind === 'text') return item.content || 'Texto'
  return 'ícone'
}

interface PhotoPositionEditorProps {
  params: PhotoStandParams
  geometry: BuildPhotoStandResult | null
  selectedContentId: string
  onSelectContent: (id: string) => void
  onMoveContent: (id: string, x: number, y: number) => void
  onClose: () => void
}

export function PhotoPositionEditor({
  params,
  geometry,
  selectedContentId,
  onSelectContent,
  onMoveContent,
  onClose,
}: PhotoPositionEditorProps) {
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

  const { width, height, minX, minY, maxY, vbWidth, vbHeight } = useMemo(() => {
    const standWidth = getStandWidth(params)
    const bandHeight = params.bandHeight
    const padding = FALLBACK_PADDING
    return {
      width: standWidth,
      height: bandHeight,
      minX: -standWidth / 2 - padding,
      minY: -bandHeight / 2 - padding,
      maxY: bandHeight / 2 + padding,
      vbWidth: standWidth + padding * 2,
      vbHeight: bandHeight + padding * 2,
    }
  }, [params])

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
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectContent(id)
      return
    }

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
  }, [clampPosition, onSelectContent])

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
          <rect
            data-testid="editor-base"
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            rx={1}
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
                onFocus={() => onSelectContent(box.id)}
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
                  {box.label.slice(0, 16)}
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

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor.tsx tests/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor.test.tsx
git commit -m "feat(suporte-foto): adiciona editor 2D da faixa"
```

---

### Task 11: Preview 3D

**Files:**
- Modify: `src/features/studio/tools/letreiros/suporte-foto/PhotoStandPreview.tsx`

**Step 1: Implementar**

Substitua todo o conteúdo de `src/features/studio/tools/letreiros/suporte-foto/PhotoStandPreview.tsx` por:

```tsx
import type { BuildPhotoStandResult } from './buildPhotoStand'

interface PhotoStandPreviewProps {
  geometry: BuildPhotoStandResult | null
  baseColor: string
  letterColor: string
}

export function PhotoStandPreview({ geometry, baseColor, letterColor }: PhotoStandPreviewProps) {
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

**Step 2: Validar tipos**

Run: `npm run typecheck`
Expected: PASS (o wrapper do `StudioPage` ainda usa o hook antigo, que já foi reescrito na Task 8 — se houver erro, ele será resolvido na Task 12).

**Step 3: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/PhotoStandPreview.tsx
git commit -m "feat(suporte-foto): atualiza preview para o novo resultado"
```

---

### Task 12: Integração no Studio

**Files:**
- Modify: `src/features/studio/StudioPage.tsx` (imports e `SuporteFotoToolWrapper`)
- Modify: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Escrever o teste falho**

Em `tests/features/studio/StudioPage.test.tsx`:

1. Adicione os imports eager junto aos das outras ferramentas:

```ts
import '@/features/studio/tools/letreiros/suporte-foto/StudioPanel'
import '@/features/studio/tools/letreiros/suporte-foto/PhotoPositionEditor'
import { exportStl as exportPhotoStandStl } from '@/features/studio/tools/letreiros/suporte-foto/exportStl'
import {
  serializePhotoStandResult,
  type SerializedPhotoStandResult,
} from '@/features/studio/tools/letreiros/suporte-foto/workerGeometry'
```

2. Substitua o `WorkerMock` para responder às duas ferramentas:

```ts
let cardWorkerResponse: SerializedCardResult | null = null
let photoWorkerResponse: SerializedPhotoStandResult | null = null

class WorkerMock {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  postMessage(message: unknown): void {
    const request = message as { params?: { productType?: string } }
    const deliver = (data: unknown) => setTimeout(() => {
      this.onmessage?.({ data: { data } } as MessageEvent)
    }, 0)

    if (request.params?.productType === 'card' && cardWorkerResponse) deliver(cardWorkerResponse)
    if (request.params?.productType === 'photo-stand' && photoWorkerResponse) deliver(photoWorkerResponse)
  }
  terminate(): void {}
}
```

3. Adicione o mock de exportação da ferramenta:

```ts
vi.mock('@/features/studio/tools/letreiros/suporte-foto/exportStl', () => ({
  exportStl: vi.fn(),
}))
```

4. No `beforeEach`, zere também `photoWorkerResponse`:

```ts
beforeEach(() => {
  cardWorkerResponse = null
  photoWorkerResponse = null
  vi.mocked(exportCardStl).mockClear()
  vi.mocked(exportPhotoStandStl).mockClear()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
```

5. Adicione os casos no final do `describe('StudioPage')`:

```ts
it('abre a ferramenta Suporte para Foto com o painel de conteúdo', async () => {
  renderStudioPage()
  fireEvent.click(screen.getByRole('button', { name: /suporte para foto/i }))

  expect(await screen.findByRole('heading', { level: 2, name: 'Suporte para Foto' }, LAZY_TIMEOUT)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /família/i })).toBeInTheDocument()
  expect(screen.getByText('120 × 25 × 40 mm')).toBeInTheDocument()
})

it('mostra Gerando… no Suporte para Foto', async () => {
  renderStudioPage()
  fireEvent.click(screen.getByRole('button', { name: /suporte para foto/i }))
  const status = await screen.findByRole('status', {}, LAZY_TIMEOUT)
  expect(status).toHaveTextContent('Gerando…')
  expect(screen.getByTestId('canvas-mock').closest('[aria-busy="true"]')).toBeInTheDocument()
})

it('abre o editor de posicionamento do Suporte para Foto', async () => {
  renderStudioPage()
  fireEvent.click(screen.getByRole('button', { name: /suporte para foto/i }))
  fireEvent.click(await screen.findByRole('button', { name: /posicionar conteúdos/i }, LAZY_TIMEOUT))
  expect(screen.getByRole('heading', { name: /posicionar conteúdos/i })).toBeInTheDocument()
})

it('habilita e executa a exportação do Suporte para Foto', async () => {
  photoWorkerResponse = serializePhotoStandResult({
    base: new THREE.BoxGeometry(120, 25, 40),
    content: new THREE.BoxGeometry(40, 8, 1),
    contentItems: [{ id: 'content-1', halfWidth: 20, halfHeight: 4 }],
  }).data

  renderStudioPage()
  fireEvent.click(screen.getByRole('button', { name: /suporte para foto/i }))

  const exportButton = screen.getByRole('button', { name: 'Exportar STL' })
  await waitFor(() => expect(exportButton).toBeEnabled())
  fireEvent.click(exportButton)

  expect(exportPhotoStandStl).toHaveBeenCalledWith(
    expect.objectContaining({ base: expect.anything() }),
    'Projeto sem título',
    expect.any(Function),
  )
})
```

**Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run tests/features/studio/StudioPage.test.tsx`
Expected: FAIL — o wrapper antigo não exporta nem mostra o painel novo.

**Step 3: Implementar**

Em `src/features/studio/StudioPage.tsx`:

1. Adicione os imports:

```ts
import { exportStl as exportPhotoStandStl } from './tools/letreiros/suporte-foto/exportStl'
import { PhotoPositionEditor as PhotoStandPositionEditor } from './tools/letreiros/suporte-foto/PhotoPositionEditor'
```

2. Substitua a função `SuporteFotoToolWrapper` inteira por:

```tsx
function SuporteFotoToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)
  const [selectedContentId, setSelectedContentId] = useState<string>('')
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const {
    params,
    geometry,
    isBuilding,
    error,
    dimensions,
    cameraPosition,
    fitRadius,
    updateParam,
    updateContent,
    addContent,
    removeContent,
    setContentType,
    reset,
  } = usePhotoStand()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (!geometry) return
    setExportError(null)
    exportPhotoStandStl(geometry, projectName, setExportError)
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
        {error ?? exportError ? (
          <div
            role="alert"
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-red-200 bg-white/95 px-3 py-1 text-xs text-red-600 shadow-sm"
          >
            {error ?? exportError}
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
          <SuporteFotoTool
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
            cameraPosition={cameraPosition}
            fitRadius={fitRadius}
          >
            <Suspense fallback={null}>
              <SuporteFotoPreview
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
          <PhotoStandPositionEditor
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

**Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run tests/features/studio/StudioPage.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/StudioPage.tsx tests/features/studio/StudioPage.test.tsx
git commit -m "feat(suporte-foto): integra worker, editor e export ao Studio"
```

---

### Task 13: Documentação

**Files:**
- Modify: `src/features/studio/tools/letreiros/suporte-foto/AGENTS.md`
- Modify: `src/features/studio/tools/letreiros/AGENTS.md`
- Modify: `docs/frontend/studio.md`

**Step 1: Reescrever `AGENTS.md` da ferramenta**

```md
# Ferramenta: Suporte para Foto

## Status

Implementada — gera e exporta STL localmente no navegador.

## O que faz

Gera suportes de mesa para fotos 10×15, 13×18 e 15×20 cm. A peça é única:
base horizontal, faixa frontal vertical com conteúdo em relevo de 1 mm e painel
inclinado atrás, separado da faixa por uma fenda de 2 mm onde a foto encaixa.

## Parâmetros

| Parâmetro | Tipo | Faixa | Default |
|---|---|---|---|
| photoSize | enum | 10x15, 13x18, 15x20 | 10x15 |
| sideMargin | number | 3–20mm | 10 |
| bandHeight | number | 15–40mm | 25 |
| depth | number | 30–60mm | 40 |
| thickness | number | 2–4mm | 3 |
| angle | number | 60–85° | 75 |
| baseColor / letterColor | enum | 10 cores PLA | teal / white |
| contents[] | array | 1–3 itens | 1 texto |

Cada item de `contents[]` é uma união discriminada por `kind` (`text` | `icon`)
com `id` e `offsetX/Y` (-90–90 / -25–25mm):

- `text`: `content` (string, sem limite, vazio permitido), `fontStyle`
  (normal/bold/serif), `fontSize` (3–15mm)
- `icon`: `svgIcon` (string|null), `iconScale` (0.5–1.0), `iconLineWidth`
  (0.1–1.5mm)

Todos os conteúdos são elevados com `CONTENT_DEPTH = 1`mm e recuados
`CONTENT_MARGIN = 3`mm da faixa. A fenda é fixa em `SLOT_GAP = 2`mm.

## Geometria

- Largura `W = largura da foto + 2 × sideMargin`.
- Perfil lateral único (placa + faixa + fenda + painel inclinado), extrudado na
  largura; sem CSG, portanto manifold por construção.
- Profundidade efetiva = `max(depth, ribBack + 2)`, com
  `ribBack = thickness + 2 + (bandHeight − thickness)/tan(angle) + thickness`.
- Face do conteúdo em `z = +profundidade/2`, voltada para a câmera.
- A faixa cobre a borda inferior da foto em `bandHeight − thickness`;
  ângulos menores exigem base mais profunda (aviso no painel).

## Arquivos

```
tools/letreiros/suporte-foto/
  schema.ts                 — validação Zod + defaults (contents discriminados)
  shapes.ts                 — perfil lateral, extrusão e medidas derivadas
  autoFit.ts                — área útil da faixa, auto-fit e clamp
  textToGeometry.ts         — TextGeometry + normalização de acentos
  buildPhotoStand.ts        — composição base + conteúdo (merge)
  buildPhotoStand.worker.ts — build em Web Worker
  workerClient.ts           — client do Worker
  workerGeometry.ts         — serialização { base, content, contentItems }
  exportStl.ts              — STL binário + download
  usePhotoStand.ts          — hook: estado + parse SVG + worker + debounce
  StudioPanel.tsx           — painel de parâmetros
  PhotoStandPreview.tsx     — preview R3F com 2 materiais
  PhotoPositionEditor.tsx   — editor 2D da faixa
```

O helper `../../confeitaria/shared/svgToIconShape.ts` é compartilhado para o
parse de SVG, e `../../confeitaria/shared/workerGeometry.ts` para serializar a
geometria. As fontes vêm de `../../chaveiros/chaveiro/fonts.ts`.

## Pipeline de geração

`schema.ts` → `shapes.ts` → `textToGeometry.ts`/`autoFit.ts` →
`buildPhotoStand.ts` → `exportStl.ts`.

- **main thread** (`usePhotoStand.ts`) parseia cada SVG e envia
  `{ params, parsedSvgs, styles }` ao Worker;
- **Worker** carrega as fontes necessárias e chama `buildPhotoStand`;
- `workerGeometry.ts` serializa o resultado de volta;
- `isBuilding` alimenta “Gerando…”, erros aparecem no overlay e a geometria
  anterior permanece visível durante o rebuild;
- trocar cor não reconstrói a peça.

## Testes

`tests/features/studio/tools/letreiros/suporte-foto/`:

- `schema.test.ts`
- `shapes.test.ts`
- `autoFit.test.ts`
- `textToGeometry.test.ts`
- `buildPhotoStand.test.ts`
- `workerGeometry.test.ts`
- `exportStl.test.ts`
- `usePhotoStand.test.ts`
- `StudioPanel.test.tsx`
- `PhotoPositionEditor.test.tsx`

## Fora de escopo

Persistência, geração via CadQuery/Lambda, pagamentos, autenticação, múltiplas
fotos, molduras com janela e peças articuladas.
```

**Step 2: Atualizar `letreiros/AGENTS.md`**

Na tabela de ferramentas, marque `suporte-foto` como `implementada` e ajuste as
regras do domínio do suporte:

```md
- Suporte de foto: peça única com base, faixa frontal, fenda de 2 mm e painel
  inclinado; conteúdo em relevo de 1 mm na faixa
- Fenda fixa de 2 mm; inclinação 60–85°; profundidade efetiva nunca menor que o
  perfil exige
- Faixa cobre a borda inferior da foto; ângulos menores exigem base profunda
```

**Step 3: Atualizar `docs/frontend/studio.md`**

Na seção da ferramenta Suporte para Foto, documente:

- conceito (base + faixa + fenda + painel inclinado);
- parâmetros e faixas;
- modelo de conteúdo (1–3 itens texto/ícone, relevo de 1 mm, auto-fit);
- build em Web Worker, preview de 2 materiais e export STL;
- editor 2D da faixa.

**Step 4: Validar**

Run: `npm run lint`
Expected: PASS, sem arquivos de documentação pendentes.

**Step 5: Commit**

```bash
git add src/features/studio/tools/letreiros/suporte-foto/AGENTS.md src/features/studio/tools/letreiros/AGENTS.md docs/frontend/studio.md
git commit -m "docs(suporte-foto): documenta a reformulação"
```

---

### Task 14: Validação final

**Files:**
- Nenhum arquivo novo.

**Step 1: Rodar a suíte da ferramenta**

Run: `npx vitest run tests/features/studio/tools/letreiros/suporte-foto`
Expected: PASS em todos os arquivos.

**Step 2: Rodar a suíte completa**

Run: `npm test`
Expected: PASS.

**Step 3: Rodar typecheck, lint e build**

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: PASS nos três, sem warnings novos.

**Step 4: Revisar resíduos do modelo antigo**

```bash
grep -rn "leftText\|rightText\|fontError\|SLOT_ANGLE\|baseMinWidth" src/features/studio/tools/letreiros/suporte-foto
```

Expected: nenhum resultado.

**Step 5: Commit final**

```bash
git add -A
git commit -m "chore(suporte-foto): valida reformulação"
```

---

## Critérios de conclusão

- Todos os testes de `tests/features/studio/tools/letreiros/suporte-foto/` passam.
- `StudioPage` abre a ferramenta, mostra “Gerando…”, abre o editor e exporta STL.
- Nenhum resíduo do modelo antigo (texto dividido, `fontError`, `SLOT_ANGLE`).
- Documentação atualizada nos três arquivos.
- `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` passam.
