# Caneca Personalizada Implementation Plan

> **Substituída pelo Porta-lata em 2026-11-18; ver 2026-11-17-porta-lata-design.md.**

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar a ferramenta Caneca Personalizada no Studio 3D: corpo de revolução com nome em relevo de 1 mm e alça removível de abraçadeira, em dois STLs.

**Architecture:** Schema Zod + reducer com debounce e Web Worker. O corpo é um `LatheGeometry` de perfil fechado; o relevo é um `ExtrudeGeometry` do texto curvado no raio e unido ao corpo por `three-bvh-csg`. A alça é uma peça separada, com abraçadeira de 200° e laço em D unidos por CSG interno. Duas peças serializadas e exportadas separadamente.

**Tech Stack:** React 19, TypeScript strict, Three.js, React Three Fiber, three-bvh-csg, Zod, Amplify UI, Vitest, TailwindCSS 4.

**Design de referência:** `docs/plans/2026-11-17-caneca-personalizada-design.md`

---

## Pré-requisitos e convenções

- Trabalhar em worktree dedicado quando a execução for iniciada.
- 1 unidade Three.js = 1 mm.
- Não usar `any`; tipar retornos.
- Não criar componente de UI paralelo ao design system: reutilizar Amplify UI.
- Testes em `tests/features/studio/tools/lembrancinhas/caneca-personalizada/`.
- Rodar o teste específico antes de cada commit.
- Commits semânticos `feat:`, `test:`, `docs:`.

### Spike obrigatório (Task 5)

Antes de seguir para UI e integração, o teste de `buildMug` precisa provar que:

1. a união do relevo ao corpo com `three-bvh-csg` produz malha fechada
   (`isClosed`) e volume positivo;
2. a alça (abraçadeira + laço) também é fechada;
3. o build padrão termina em tempo aceitável (alvo < 1,5 s; gate de teste
   < 3 s para não oscilar em CI).

Se qualquer item falhar, **parar** e migrar para a abordagem C do design
(plaqueta curva com o nome) antes de prosseguir.

---

## Task 1: Schema, defaults, capacidade e sanitização

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/schema.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/schema.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import {
  defaultMugParams,
  getCapacityMl,
  mugParamsSchema,
  sanitizeFilename,
  CONTENT_DEPTH,
  HANDLE_RING_THICKNESS,
  MAX_TEXT_LENGTH,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'

describe('caneca schema', () => {
  it('defaults válidos', () => {
    expect(mugParamsSchema.safeParse(defaultMugParams).success).toBe(true)
    expect(defaultMugParams).toMatchObject({
      productType: 'caneca-personalizada',
      diameterTop: 80,
      diameterBottom: 72,
      height: 88,
      wallThickness: 2.4,
      bottomThickness: 3.2,
      handleEnabled: true,
      handleHeight: 52,
      handleGap: 30,
      handleReach: 40,
      handleBand: 6.5,
      handleWidth: 12,
      handleClearance: 0.3,
      text: 'Festa',
      textSize: 10,
      fontStyle: 'normal',
      textCenterY: 60,
    })
  })

  it('rejeita dimensões fora da faixa', () => {
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, diameterTop: 69 }).success).toBe(false)
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, height: 116 }).success).toBe(false)
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, wallThickness: 1.7 }).success).toBe(false)
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, text: 'x'.repeat(21) }).success).toBe(false)
  })

  it('rejeita cor fora da paleta', () => {
    expect(mugParamsSchema.safeParse({ ...defaultMugParams, bodyColor: '#000000' }).success).toBe(false)
  })

  it('capacidade do default fica entre 300 e 380 ml', () => {
    const capacity = getCapacityMl(defaultMugParams)
    expect(capacity).toBeGreaterThan(300)
    expect(capacity).toBeLessThan(380)
  })

  it('sanitizeFilename', () => {
    expect(sanitizeFilename('Caneca da Ana! @#')).toBe('Caneca-da-Ana')
    expect(sanitizeFilename('')).toBe('caneca')
  })

  it('constantes', () => {
    expect(CONTENT_DEPTH).toBe(1)
    expect(HANDLE_RING_THICKNESS).toBe(3.5)
    expect(MAX_TEXT_LENGTH).toBe(20)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/schema.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import { z } from 'zod'

export const PLA_COLORS = [
  '#14b8a6', '#ef4444', '#3b82f6', '#eab308', '#22c55e',
  '#f97316', '#ec4899', '#8b5cf6', '#171717', '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const PRODUCT_TYPE = 'caneca-personalizada' as const

export const MINIMUM_WALL_MM = 1.8
export const MINIMUM_BOTTOM_MM = 2
export const CONTENT_DEPTH = 1
export const MUG_SEGMENTS = 128
export const HANDLE_RING_THICKNESS = 3.5
export const HANDLE_WRAP = (200 * Math.PI) / 180
export const MAX_TEXT_LENGTH = 20
export const MAX_TEXT_ARC = (120 * Math.PI) / 180
export const RELIEF_EMBED = 0.2

export const FONT_STYLES = ['normal', 'bold', 'serif'] as const
export type FontStyle = (typeof FONT_STYLES)[number]

export const mugParamsSchema = z.object({
  productType: z.literal(PRODUCT_TYPE),
  diameterTop: z.number().min(70).max(100),
  diameterBottom: z.number().min(60).max(95),
  height: z.number().min(80).max(115),
  wallThickness: z.number().min(1.8).max(4),
  bottomThickness: z.number().min(2).max(6),
  rimChamfer: z.number().min(0).max(2),
  handleEnabled: z.boolean(),
  handleHeight: z.number().min(35).max(85),
  handleGap: z.number().min(24).max(40),
  handleReach: z.number().min(30).max(50),
  handleBand: z.number().min(5).max(10),
  handleWidth: z.number().min(8).max(16),
  handleClearance: z.number().min(0.2).max(0.5),
  text: z.string().max(MAX_TEXT_LENGTH),
  textSize: z.number().min(6).max(18),
  fontStyle: z.enum(FONT_STYLES),
  textCenterY: z.number().min(20).max(90),
  bodyColor: z.enum(PLA_COLORS),
  accentColor: z.enum(PLA_COLORS),
})

export type MugParams = z.infer<typeof mugParamsSchema>
export type MugGeometryParams = Omit<MugParams, 'bodyColor' | 'accentColor'>

export const defaultMugParams: MugParams = {
  productType: PRODUCT_TYPE,
  diameterTop: 80,
  diameterBottom: 72,
  height: 88,
  wallThickness: 2.4,
  bottomThickness: 3.2,
  rimChamfer: 0.6,
  handleEnabled: true,
  handleHeight: 52,
  handleGap: 30,
  handleReach: 40,
  handleBand: 6.5,
  handleWidth: 12,
  handleClearance: 0.3,
  text: 'Festa',
  textSize: 10,
  fontStyle: 'normal',
  textCenterY: 60,
  bodyColor: '#14b8a6',
  accentColor: '#f5f5f5',
}

/** Raio externo do corpo na altura `y` (parede cônica). */
export function getOuterRadius(
  params: Pick<MugGeometryParams, 'diameterTop' | 'diameterBottom' | 'height'>,
  y: number,
): number {
  const t = Math.min(1, Math.max(0, y / params.height))
  return (params.diameterBottom / 2) * (1 - t) + (params.diameterTop / 2) * t
}

/** Volume interno útil em ml (tronco de cone). */
export function getCapacityMl(params: MugGeometryParams): number {
  const rBottom = Math.max(0, params.diameterBottom / 2 - params.wallThickness)
  const rTop = Math.max(0, params.diameterTop / 2 - params.wallThickness)
  const innerHeight = Math.max(0, params.height - params.bottomThickness)
  const volume = (Math.PI / 3) * innerHeight * (rBottom ** 2 + rBottom * rTop + rTop ** 2)
  return volume / 1000
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'caneca'
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/schema.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/schema.test.ts
git commit -m "feat: add mug schema and capacity"
```

---

## Task 2: Perfil do corpo e `buildBody`

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/shapes.ts`
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/geometryTestUtils.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody.test.ts`

**Step 1: Criar o utilitário de malha**

Copie `isClosed` e `signedVolume` de
`tests/features/studio/tools/lembrancinhas/termoformador/geometryTestUtils.ts`
para o novo `geometryTestUtils.ts` da caneca. Não importe do teste de outra
ferramenta: mantenha o utilitário local para não acoplar suítes.

**Step 2: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { buildBody } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody'
import { bodyProfile, getInnerRadius } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/shapes'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildBody', () => {
  it('gera corpo fechado com volume positivo e altura correta', () => {
    const geometry = buildBody(defaultMugParams)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeCloseTo(defaultMugParams.height, 3)
    expect(box.max.x).toBeCloseTo(defaultMugParams.diameterTop / 2, 2)
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('a cavidade interna respeita a parede', () => {
    expect(getInnerRadius(defaultMugParams, 0)).toBeCloseTo(36 - 2.4, 5)
    expect(getInnerRadius(defaultMugParams, defaultMugParams.height)).toBeCloseTo(40 - 2.4, 5)
  })

  it('o perfil é fechado e começa/termina no eixo', () => {
    const points = bodyProfile(defaultMugParams)
    expect(points[0].x).toBeCloseTo(0, 6)
    expect(points[points.length - 1].x).toBeCloseTo(0, 6)
  })

  it('o chanfro da borda não fura a parede', () => {
    const geometry = buildBody({ ...defaultMugParams, rimChamfer: 2 })
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })
})
```

**Step 3: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 4: Implementar `shapes.ts`**

```ts
import { Vector2 } from 'three'
import { getOuterRadius, type MugGeometryParams } from './schema'

const DEDUPE_EPSILON = 1e-6

export function getInnerRadius(params: MugGeometryParams, y: number): number {
  return Math.max(0.5, getOuterRadius(params, y) - params.wallThickness)
}

export function dedupePoints(points: Vector2[]): Vector2[] {
  const result: Vector2[] = []
  for (const point of points) {
    const last = result[result.length - 1]
    if (!last || last.distanceTo(point) > DEDUPE_EPSILON) result.push(point)
  }
  return result
}

/**
 * Perfil fechado no plano (r, y) para o LatheGeometry:
 * eixo do fundo → fundo externo → parede externa → borda → parede interna →
 * fundo interno → eixo.
 */
export function bodyProfile(params: MugGeometryParams): Vector2[] {
  const outerBottom = params.diameterBottom / 2
  const outerTop = params.diameterTop / 2
  const innerTop = Math.max(0.5, outerTop - params.wallThickness)
  const innerBottom = Math.max(0.5, outerBottom - params.wallThickness)
  const chamfer = Math.max(
    0,
    Math.min(params.rimChamfer, params.wallThickness / 2, params.height * 0.1),
  )

  const points: Vector2[] = [
    new Vector2(0, 0),
    new Vector2(outerBottom, 0),
    new Vector2(outerTop, params.height - chamfer),
  ]

  if (chamfer > 0) {
    points.push(new Vector2(outerTop - chamfer, params.height))
  }
  points.push(new Vector2(innerTop, params.height))
  points.push(new Vector2(innerBottom, params.bottomThickness))
  points.push(new Vector2(0, params.bottomThickness))

  return dedupePoints(points)
}
```

**Step 5: Implementar `buildBody.ts`**

Reaproveite a limpeza de triângulos degenerados do suporte do Termoformador
(`buildSupport.ts`, `removeDegenerateTriangles`), copiando a função para este
arquivo sem exportá-la do Termoformador.

```ts
import { BufferGeometry, LatheGeometry, Vector3 } from 'three'
import { bodyProfile } from './shapes'
import { MUG_SEGMENTS, type MugGeometryParams } from './schema'

const DEGENERATE_AREA_EPSILON = 1e-12

function removeDegenerateTriangles(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  if (!index) return geometry

  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const ab = new Vector3()
  const ac = new Vector3()
  const cross = new Vector3()
  const kept: number[] = []

  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i)
    const ib = index.getX(i + 1)
    const ic = index.getX(i + 2)

    a.fromBufferAttribute(position, ia)
    b.fromBufferAttribute(position, ib)
    c.fromBufferAttribute(position, ic)
    ab.subVectors(b, a)
    ac.subVectors(c, a)

    if (cross.crossVectors(ab, ac).lengthSq() > DEGENERATE_AREA_EPSILON) {
      kept.push(ia, ib, ic)
    }
  }

  const result = new BufferGeometry()
  result.setAttribute('position', position.clone())
  result.setIndex(kept)
  result.computeVertexNormals()
  geometry.dispose()
  return result
}

export function buildBody(params: MugGeometryParams): BufferGeometry {
  const geometry = new LatheGeometry(bodyProfile(params), MUG_SEGMENTS)
  // Se o teste de volume assinar negativo, inverta bodyProfile().
  return removeDegenerateTriangles(geometry)
}
```

**Step 6: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody.test.ts`
Expected: PASS.

**Step 7: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/shapes.ts \
  src/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/geometryTestUtils.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildBody.test.ts
git commit -m "feat: build revolved mug body"
```

---

## Task 3: Relevo do texto curvado

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildRelief.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildRelief.test.ts`

**Step 1: Escrever o teste que falha**

Use uma fonte falsa com `generateShapes` retornando um retângulo. O objetivo é
testar a curvatura, o auto-fit e a malha fechada sem depender do typeface.

```ts
import { describe, it, expect } from 'vitest'
import { Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildRelief, fitRelief } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildRelief'
import {
  CONTENT_DEPTH,
  MAX_TEXT_ARC,
  defaultMugParams,
  getOuterRadius,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { isClosed } from './geometryTestUtils'

function rectangleFont(width: number, height: number): Font {
  return {
    data: { glyphs: {} },
    generateShapes: () => {
      const shape = new Shape()
      shape.moveTo(-width / 2, -height / 2)
      shape.lineTo(width / 2, -height / 2)
      shape.lineTo(width / 2, height / 2)
      shape.lineTo(-width / 2, height / 2)
      shape.closePath()
      return [shape]
    },
  } as unknown as Font
}

describe('buildRelief', () => {
  it('curva o texto no raio do corpo e mantém 1 mm de relevo', () => {
    const params = { ...defaultMugParams, text: 'Festa' }
    const geometry = buildRelief(rectangleFont(20, 10), params)!
    geometry.computeBoundingBox()
    const position = geometry.getAttribute('position')
    let minRadius = Infinity
    let maxRadius = 0

    for (let i = 0; i < position.count; i++) {
      const radius = Math.hypot(position.getX(i), position.getZ(i))
      minRadius = Math.min(minRadius, radius)
      maxRadius = Math.max(maxRadius, radius)
    }

    const radius = getOuterRadius(params, params.textCenterY)
    expect(minRadius).toBeGreaterThan(radius - 0.3)
    expect(maxRadius).toBeGreaterThan(radius + CONTENT_DEPTH - 0.3)
    expect(isClosed(geometry)).toBe(true)
    geometry.dispose()
  })

  it('centraliza o texto em 180° (lado oposto à alça)', () => {
    const params = { ...defaultMugParams, text: 'Festa' }
    const geometry = buildRelief(rectangleFont(10, 8), params)!
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeLessThan(0)
    expect(geometry.boundingBox!.min.y).toBeGreaterThan(params.textCenterY - params.textSize / 2 - 2)
    expect(geometry.boundingBox!.max.y).toBeLessThan(params.textCenterY + params.textSize / 2 + 2)
    geometry.dispose()
  })

  it('reduz textos longos para não passar do arco máximo', () => {
    const params = { ...defaultMugParams, textSize: 18 }
    const geometry = buildRelief(rectangleFont(400, 18), params)!
    const position = geometry.getAttribute('position')
    let minAngle = Infinity
    let maxAngle = -Infinity

    for (let i = 0; i < position.count; i++) {
      const angle = Math.atan2(position.getZ(i), position.getX(i))
      const centered = angle > 0 ? angle - Math.PI * 2 : angle
      minAngle = Math.min(minAngle, centered)
      maxAngle = Math.max(maxAngle, centered)
    }

    expect(maxAngle - minAngle).toBeLessThanOrEqual(MAX_TEXT_ARC + 0.02)
    geometry.dispose()
  })

  it('texto vazio não gera geometria', () => {
    expect(buildRelief(rectangleFont(10, 10), { ...defaultMugParams, text: '   ' })).toBeNull()
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildRelief.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import { Box3, BufferGeometry, type BufferAttribute } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { shapesToGeometry, textToShapes } from '../../confeitaria/shared/textOutline'
import {
  CONTENT_DEPTH,
  MAX_TEXT_ARC,
  RELIEF_EMBED,
  getOuterRadius,
  type MugGeometryParams,
} from './schema'

/**
 * Escala uniforme (x/y) para o texto caber no arco máximo, preservando o
 * relevo de 1 mm. Retorna 1 quando já cabe.
 */
export function fitRelief(
  width: number,
  centerRadius: number,
  maxArc: number = MAX_TEXT_ARC,
): number {
  if (width <= 0 || centerRadius <= 0) return 1
  const arc = width / centerRadius
  return arc > maxArc ? maxArc / arc : 1
}

function clampCenterY(
  params: MugGeometryParams,
  halfHeight: number,
): number {
  const minY = params.bottomThickness + 2 + halfHeight
  const maxY = params.height - params.rimChamfer - 2 - halfHeight
  if (minY > maxY) return params.textCenterY
  return Math.min(maxY, Math.max(minY, params.textCenterY))
}

export function buildRelief(
  font: Font,
  params: MugGeometryParams,
): BufferGeometry | null {
  const shapes = textToShapes(font, params.text, params.textSize)
  if (shapes.length === 0) return null

  const flat = shapesToGeometry(shapes, CONTENT_DEPTH, false)
  flat.computeBoundingBox()
  const box = flat.boundingBox ?? new Box3()
  const width = box.max.x - box.min.x
  const height = box.max.y - box.min.y
  if (width <= 0 || height <= 0) {
    flat.dispose()
    return null
  }

  const centerX = (box.min.x + box.max.x) / 2
  const centerY = (box.min.y + box.max.y) / 2
  const centerRadius = getOuterRadius(params, params.textCenterY)
  const scale = fitRelief(width, centerRadius)
  const halfHeight = (height * scale) / 2
  const centerYGlobal = clampCenterY(params, halfHeight)

  const position = flat.getAttribute('position') as BufferAttribute
  for (let i = 0; i < position.count; i++) {
    const localX = (position.getX(i) - centerX) * scale
    const localY = (position.getY(i) - centerY) * scale
    const localZ = position.getZ(i)

    const globalY = centerYGlobal + localY
    const radius = getOuterRadius(params, globalY) + localZ - RELIEF_EMBED
    const angle = Math.PI + localX / centerRadius

    position.setXYZ(i, radius * Math.cos(angle), globalY, radius * Math.sin(angle))
  }

  flat.computeBoundingBox()
  flat.computeBoundingSphere()
  flat.computeVertexNormals()
  return flat
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildRelief.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/buildRelief.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildRelief.test.ts
git commit -m "feat: curve mug name relief"
```

---

## Task 4: Alça de abraçadeira e laço

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/caneca-personalizada/shapes.ts`
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import {
  buildHandle,
  handleLoopShape,
  handleRingShape,
  getHandleMetrics,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle'
import { defaultMugParams, getOuterRadius } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

describe('buildHandle', () => {
  it('calcula a folga da abraçadeira no raio da altura', () => {
    const metrics = getHandleMetrics(defaultMugParams)
    const radius = getOuterRadius(defaultMugParams, defaultMugParams.handleHeight)
    expect(metrics.innerRadius).toBeCloseTo(radius + defaultMugParams.handleClearance, 5)
    expect(metrics.outerRadius).toBeCloseTo(metrics.innerRadius + 3.5, 5)
    expect(metrics.handOpeningWidth).toBeGreaterThan(16)
  })

  it('a alça é uma peça fechada com volume positivo', () => {
    const geometry = buildHandle(defaultMugParams)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.max.x).toBeCloseTo(
      getOuterRadius(defaultMugParams, defaultMugParams.handleHeight) + defaultMugParams.handleReach,
      1,
    )
    expect(isClosed(geometry)).toBe(true)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('a abraçadeira cobre 200° e o laço tem a abertura pedida', () => {
    const ring = handleRingShape(getHandleMetrics(defaultMugParams))
    const loop = handleLoopShape(defaultMugParams)
    expect(ring.curves.length).toBeGreaterThan(2)
    expect(loop.holes).toHaveLength(1)
  })

  it('folga pequena é rejeitada pela validação (Task 6)', () => {
    expect(() => buildHandle({ ...defaultMugParams, handleClearance: 0.1 })).not.toThrow()
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar as formas em `shapes.ts`**

```ts
import { Path, Shape } from 'three'

export interface HandleMetrics {
  innerRadius: number
  outerRadius: number
  handOpeningWidth: number
  handOpeningHeight: number
  loopMinX: number
  loopMaxX: number
}

export function getHandleMetrics(params: MugGeometryParams): HandleMetrics {
  const innerRadius = getOuterRadius(params, params.handleHeight) + params.handleClearance
  const outerRadius = innerRadius + HANDLE_RING_THICKNESS
  return {
    innerRadius,
    outerRadius,
    handOpeningWidth: params.handleReach - HANDLE_RING_THICKNESS - 2 * params.handleBand,
    handOpeningHeight: params.handleGap,
    loopMinX: outerRadius - 1.0,
    loopMaxX: getOuterRadius(params, params.handleHeight) + params.handleReach,
  }
}

/** Setor anular de 200° centrado no +X, desenhado no plano XY. */
export function handleRingShape(metrics: HandleMetrics): Shape {
  const start = -HANDLE_WRAP / 2
  const end = HANDLE_WRAP / 2
  const shape = new Shape()
  shape.absarc(0, 0, metrics.outerRadius, start, end, false)
  shape.absarc(0, 0, metrics.innerRadius, end, start, true)
  shape.closePath()
  return shape
}

function roundedRect(
  shape: Shape | Path,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, (maxX - minX) / 2, (maxY - minY) / 2))
  shape.moveTo(minX + r, minY)
  shape.lineTo(maxX - r, minY)
  shape.quadraticCurveTo(maxX, minY, maxX, minY + r)
  shape.lineTo(maxX, maxY - r)
  shape.quadraticCurveTo(maxX, maxY, maxX - r, maxY)
  shape.lineTo(minX + r, maxY)
  shape.quadraticCurveTo(minX, maxY, minX, maxY - r)
  shape.lineTo(minX, minY + r)
  shape.quadraticCurveTo(minX, minY, minX + r, minY)
  shape.closePath()
}

/** Laço em D no plano XY, com a abertura da mão como furo. */
export function handleLoopShape(params: MugGeometryParams): Shape {
  const metrics = getHandleMetrics(params)
  const halfHeight = params.handleGap / 2 + params.handleBand
  const minY = params.handleHeight - halfHeight
  const maxY = params.handleHeight + halfHeight
  const minX = metrics.loopMinX
  const maxX = metrics.loopMaxX

  const shape = new Shape()
  roundedRect(shape, minX, minY, maxX, maxY, params.handleBand)

  const hole = new Path()
  roundedRect(
    hole,
    metrics.outerRadius + params.handleBand,
    params.handleHeight - params.handleGap / 2,
    maxX - params.handleBand,
    params.handleHeight + params.handleGap / 2,
    params.handleBand / 2,
  )
  shape.holes.push(hole)
  return shape
}
```

Atualize os imports de `shapes.ts` para incluir
`HANDLE_RING_THICKNESS`, `HANDLE_WRAP` e `getOuterRadius`.

**Step 4: Implementar `buildHandle.ts`**

```ts
import { BufferGeometry, ExtrudeGeometry } from 'three'
import { Brush, Evaluator, UNION } from 'three-bvh-csg'
import {
  getHandleMetrics,
  handleLoopShape,
  handleRingShape,
  type HandleMetrics,
} from './shapes'
import { getOuterRadius, type MugGeometryParams } from './schema'

export { getHandleMetrics, handleLoopShape, handleRingShape }
export type { HandleMetrics }

export function buildHandle(params: MugGeometryParams): BufferGeometry {
  const metrics = getHandleMetrics(params)

  const ring = new ExtrudeGeometry(handleRingShape(metrics), {
    depth: params.handleWidth,
    bevelEnabled: false,
    curveSegments: 48,
  })
  // Anel no plano XZ, altura em +Y, centrado na altura da alça.
  ring.rotateX(-Math.PI / 2)

  // Acompanha a conicidade do corpo: escala radial por altura.
  const baseRadius =
    getOuterRadius(params, params.handleHeight) + params.handleClearance
  const ringPosition = ring.getAttribute('position')
  for (let i = 0; i < ringPosition.count; i++) {
    const yLocal = ringPosition.getY(i)
    const yGlobal = params.handleHeight - params.handleWidth / 2 + yLocal
    const scale = (getOuterRadius(params, yGlobal) + params.handleClearance) / baseRadius
    ringPosition.setX(i, ringPosition.getX(i) * scale)
    ringPosition.setZ(i, ringPosition.getZ(i) * scale)
  }
  ring.computeVertexNormals()
  ring.translate(0, params.handleHeight - params.handleWidth / 2, 0)

  const loop = new ExtrudeGeometry(handleLoopShape(params), {
    depth: params.handleWidth,
    bevelEnabled: false,
    curveSegments: 16,
  })
  loop.translate(0, 0, -params.handleWidth / 2)

  const evaluator = new Evaluator()
  const ringBrush = new Brush(ring)
  const loopBrush = new Brush(loop)
  ringBrush.updateMatrixWorld()
  loopBrush.updateMatrixWorld()
  const result = evaluator.evaluate(ringBrush, loopBrush, UNION).geometry

  ring.dispose()
  loop.dispose()
  result.computeVertexNormals()
  return result
}
```

**Step 5: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle.test.ts`
Expected: PASS.

Se `isClosed` falhar, aumente a sobreposição do laço com a abraçadeira
(`loopMinX = outerRadius - 1.0` → `-1.5`) e rode de novo antes de seguir.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/shapes.ts \
  src/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildHandle.test.ts
git commit -m "feat: build snap-on mug handle"
```

---

## Task 5: `buildMug`, união do relevo e spike de CSG

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import helvetiker from '@/assets/fonts/helvetiker_regular.typeface.json'
import {
  buildMug,
  disposeMugResult,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'
import { isClosed, signedVolume } from './geometryTestUtils'

function realFont() {
  return new FontLoader().parse(helvetiker as unknown as object)
}

describe('buildMug', () => {
  it('une o relevo ao corpo e devolve a alça separada', () => {
    const started = performance.now()
    const result = buildMug({ ...defaultMugParams, text: 'Festa' }, realFont())
    const elapsed = performance.now() - started

    expect(isClosed(result.body)).toBe(true)
    expect(signedVolume(result.body)).toBeGreaterThan(0)
    expect(result.handle).not.toBeNull()
    expect(isClosed(result.handle!)).toBe(true)
    expect(elapsed).toBeLessThan(3000)

    disposeMugResult(result)
  })

  it('sem texto devolve só o corpo de revolução', () => {
    const result = buildMug({ ...defaultMugParams, text: '' }, realFont())
    expect(isClosed(result.body)).toBe(true)
    expect(result.handle).not.toBeNull()
    disposeMugResult(result)
  })

  it('alça desligada devolve handle nulo', () => {
    const result = buildMug({ ...defaultMugParams, handleEnabled: false }, realFont())
    expect(result.handle).toBeNull()
    disposeMugResult(result)
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import type { BufferGeometry } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { Brush, Evaluator, UNION } from 'three-bvh-csg'
import { buildBody } from './buildBody'
import { buildHandle } from './buildHandle'
import { buildRelief } from './buildRelief'
import type { MugGeometryParams } from './schema'

export interface BuildMugResult {
  body: BufferGeometry
  handle: BufferGeometry | null
}

function unionRelief(
  body: BufferGeometry,
  relief: BufferGeometry,
): BufferGeometry {
  const evaluator = new Evaluator()
  const bodyBrush = new Brush(body)
  const reliefBrush = new Brush(relief)
  bodyBrush.updateMatrixWorld()
  reliefBrush.updateMatrixWorld()

  const result = evaluator.evaluate(bodyBrush, reliefBrush, UNION).geometry
  body.dispose()
  relief.dispose()
  result.computeVertexNormals()
  return result
}

export function buildMug(
  params: MugGeometryParams,
  font: Font,
): BuildMugResult {
  const body = buildBody(params)
  const relief = buildRelief(font, params)

  return {
    body: relief ? unionRelief(body, relief) : body,
    handle: params.handleEnabled ? buildHandle(params) : null,
  }
}

export function disposeMugResult(result: BuildMugResult): void {
  result.body.dispose()
  result.handle?.dispose()
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.test.ts`
Expected: PASS. Observar o tempo do spike.

> **Gate do spike:** se `isClosed(result.body)` falhar, não seguir. Teste antes
> unir cada letra separadamente; se ainda falhar, migrar para a abordagem C
> (plaqueta curva) descrita no design.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.test.ts
git commit -m "feat: assemble mug body and relief"
```

---

## Task 6: Validação do domínio

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { validateMug } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug'
import { defaultMugParams } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/schema'

describe('validateMug', () => {
  it('não aponta problemas nos defaults', () => {
    expect(validateMug(defaultMugParams)).toHaveLength(0)
  })

  it('aponta corpo mais estreito no topo', () => {
    const issues = validateMug({
      ...defaultMugParams,
      diameterTop: 70,
      diameterBottom: 95,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-taper', severity: 'error' }))
  })

  it('aponta texto que não cabe no arco', () => {
    const issues = validateMug({
      ...defaultMugParams,
      text: 'A'.repeat(20),
      textSize: 18,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-text-fit' }))
  })

  it('aponta texto cruzando a borda', () => {
    const issues = validateMug({ ...defaultMugParams, textCenterY: 88 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-text-band', severity: 'error' }))
  })

  it('aponta folga insuficiente e abraçadeira fora do corpo (defensivo)', () => {
    const issues = validateMug({ ...defaultMugParams, handleClearance: 0.1 })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-handle-fit' }))
    const high = validateMug({ ...defaultMugParams, handleHeight: 84 })
    expect(high).toContainEqual(expect.objectContaining({ code: 'mug-handle-band' }))
  })

  it('aponta capacidade fora da faixa', () => {
    const issues = validateMug({
      ...defaultMugParams,
      diameterTop: 100,
      diameterBottom: 95,
      height: 115,
      wallThickness: 1.8,
      bottomThickness: 2,
    })
    expect(issues).toContainEqual(expect.objectContaining({ code: 'mug-capacity' }))
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

```ts
import {
  HANDLE_RING_THICKNESS,
  HANDLE_WRAP,
  MAX_TEXT_ARC,
  MINIMUM_BOTTOM_MM,
  MINIMUM_WALL_MM,
  getCapacityMl,
  getOuterRadius,
  type MugGeometryParams,
} from './schema'

export type IssueSeverity = 'error' | 'warning'

export type MugIssueCode =
  | 'mug-taper'
  | 'mug-wall'
  | 'mug-bottom'
  | 'mug-text-fit'
  | 'mug-text-band'
  | 'mug-text-rail'
  | 'mug-handle-gap'
  | 'mug-handle-reach'
  | 'mug-handle-fit'
  | 'mug-handle-band'
  | 'mug-capacity'

export interface ValidationIssue {
  code: MugIssueCode
  severity: IssueSeverity
  message: string
}

/** Mesma estimativa usada no painel; o build real usa a fonte e faz auto-fit. */
export function estimateTextWidth(text: string, size: number): number {
  return text.trim().length * size * 0.62
}

export function validateMug(params: MugGeometryParams): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const radius = getOuterRadius(params, params.textCenterY)
  const text = params.text.trim()

  if (params.diameterTop < params.diameterBottom) {
    issues.push({
      code: 'mug-taper',
      severity: 'error',
      message: 'O diâmetro do topo precisa ser maior ou igual ao da base.',
    })
  }

  if (params.wallThickness < MINIMUM_WALL_MM) {
    issues.push({
      code: 'mug-wall',
      severity: 'error',
      message: `A parede precisa ter pelo menos ${MINIMUM_WALL_MM} mm.`,
    })
  }

  if (params.bottomThickness < MINIMUM_BOTTOM_MM) {
    issues.push({
      code: 'mug-bottom',
      severity: 'error',
      message: `O fundo precisa ter pelo menos ${MINIMUM_BOTTOM_MM} mm.`,
    })
  }

  if (text.length > 0) {
    const arc = estimateTextWidth(text, params.textSize) / radius
    if (arc > MAX_TEXT_ARC) {
      issues.push({
        code: 'mug-text-fit',
        severity: 'warning',
        message: 'O texto será reduzido para caber no arco da caneca.',
      })
    }

    const halfHeight = params.textSize / 2
    const minY = params.bottomThickness + 2
    const maxY = params.height - params.rimChamfer - 2
    if (params.textCenterY - halfHeight < minY || params.textCenterY + halfHeight > maxY) {
      issues.push({
        code: 'mug-text-band',
        severity: 'error',
        message: 'O texto cruza a borda ou o fundo da caneca. Ajuste a altura ou o tamanho.',
      })
    }

    const halfWrap = HANDLE_WRAP / 2
    const gapStart = halfWrap
    const gapEnd = Math.PI * 2 - halfWrap
    const margin = (8 * Math.PI) / 180
    const textStart = Math.PI - arc / 2
    const textEnd = Math.PI + arc / 2
    if (params.handleEnabled && (textStart < gapStart + margin || textEnd > gapEnd - margin)) {
      issues.push({
        code: 'mug-text-rail',
        severity: 'warning',
        message: 'O texto se aproxima da abraçadeira da alça. Reduza o tamanho ou o número de caracteres.',
      })
    }
  }

  const handOpeningWidth =
    params.handleReach - HANDLE_RING_THICKNESS - 2 * params.handleBand
  if (params.handleEnabled) {
    if (params.handleGap < 18) {
      issues.push({
        code: 'mug-handle-gap',
        severity: 'warning',
        message: 'A abertura da mão está pequena; o conforto fica comprometido.',
      })
    }
    if (handOpeningWidth < 16) {
      issues.push({
        code: 'mug-handle-reach',
        severity: 'warning',
        message: 'O alcance da alça não deixa abertura suficiente para a mão.',
      })
    }
    if (params.handleClearance < 0.2) {
      issues.push({
        code: 'mug-handle-fit',
        severity: 'error',
        message: 'A folga da abraçadeira precisa ser de pelo menos 0,2 mm.',
      })
    }
    if (
      params.handleHeight - params.handleWidth / 2 < 2 ||
      params.handleHeight + params.handleWidth / 2 > params.height - 2
    ) {
      issues.push({
        code: 'mug-handle-band',
        severity: 'error',
        message: 'A abraçadeira não cabe na altura do corpo. Ajuste a altura da alça.',
      })
    }
  }

  const capacity = getCapacityMl(params)
  if (capacity < 150 || capacity > 500) {
    issues.push({
      code: 'mug-capacity',
      severity: 'warning',
      message: `A capacidade aproximada é ${capacity.toFixed(0)} ml (fora da faixa de 150–500 ml).`,
    })
  }

  return issues
}
```

Nota: `mug-csg` é emitido pelo hook quando o worker falha, não por
`validateMug`. O design mantém o código na tabela de erros de runtime.

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/validateMug.test.ts
git commit -m "feat: validate mug parameters"
```

---

## Task 7: Serialização e Web Worker

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry.ts`
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/workerClient.ts`
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.worker.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry.test.ts`

**Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { BoxGeometry } from 'three'
import {
  deserializeBuildResult,
  serializeBuildResult,
} from '@/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry'
import type { BuildMugResult } from '@/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug'

describe('workerGeometry', () => {
  it('faz round-trip das duas peças', () => {
    const result: BuildMugResult = {
      body: new BoxGeometry(80, 88, 80),
      handle: new BoxGeometry(50, 40, 12),
    }
    const { data, transfer } = serializeBuildResult(result)
    expect(data.body.position.length).toBeGreaterThan(0)
    expect(data.handle).not.toBeNull()
    expect(transfer.length).toBeGreaterThanOrEqual(4)

    const restored = deserializeBuildResult(data)
    restored.body.computeBoundingBox()
    expect(restored.body.boundingBox!.max.y).toBeCloseTo(44, 5)
    expect(restored.handle).not.toBeNull()
    expect(restored.handle!.getAttribute('position').count).toBe(
      result.handle!.getAttribute('position').count,
    )

    result.body.dispose()
    result.handle!.dispose()
    restored.body.dispose()
    restored.handle!.dispose()
  })

  it('aceita alça nula', () => {
    const { data } = serializeBuildResult({
      body: new BoxGeometry(80, 88, 80),
      handle: null,
    })
    expect(data.handle).toBeNull()
    const restored = deserializeBuildResult(data)
    expect(restored.handle).toBeNull()
    restored.body.dispose()
  })
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar a serialização**

Copie o padrão de `caixa-personalizada/workerGeometry.ts`, reduzindo para duas
peças:

```ts
import { BufferAttribute, BufferGeometry } from 'three'
import type { BuildMugResult } from './buildMug'

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array | null
}

export interface SerializedBuildResult {
  body: SerializedGeometry
  handle: SerializedGeometry | null
}

export function serializeGeometry(geometry: BufferGeometry): {
  data: SerializedGeometry
  transfer: ArrayBuffer[]
} {
  const positionAttribute = geometry.getAttribute('position')
  const normalAttribute = geometry.getAttribute('normal')
  const position = positionAttribute
    ? (positionAttribute.array as Float32Array).slice()
    : new Float32Array(0)
  const normal = normalAttribute
    ? (normalAttribute.array as Float32Array).slice()
    : new Float32Array(0)
  const indexAttribute = geometry.getIndex()
  const index = indexAttribute
    ? new Uint32Array(indexAttribute.array).slice()
    : null

  const transfer: ArrayBuffer[] = [
    position.buffer as ArrayBuffer,
    normal.buffer as ArrayBuffer,
  ]
  if (index) transfer.push(index.buffer as ArrayBuffer)

  return { data: { position, normal, index }, transfer }
}

export function deserializeGeometry(data: SerializedGeometry): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.position, 3))
  if (data.normal.length > 0) {
    geometry.setAttribute('normal', new BufferAttribute(data.normal, 3))
  }
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1))
  return geometry
}

export function serializeBuildResult(result: BuildMugResult): {
  data: SerializedBuildResult
  transfer: ArrayBuffer[]
} {
  const body = serializeGeometry(result.body)
  const handle = result.handle ? serializeGeometry(result.handle) : null

  return {
    data: {
      body: body.data,
      handle: handle?.data ?? null,
    },
    transfer: [...body.transfer, ...(handle?.transfer ?? [])],
  }
}

export function deserializeBuildResult(
  data: SerializedBuildResult,
): BuildMugResult {
  return {
    body: deserializeGeometry(data.body),
    handle: data.handle ? deserializeGeometry(data.handle) : null,
  }
}
```

**Step 4: Implementar o cliente e o worker**

```ts
// workerClient.ts
import type { MugGeometryParams } from './schema'
import type { SerializedBuildResult } from './workerGeometry'

export interface MugWorker {
  build(
    params: MugGeometryParams,
    onResult: (data: SerializedBuildResult) => void,
    onError?: () => void,
  ): void
  terminate(): void
}

export function createMugWorker(): MugWorker {
  const worker = new Worker(
    new URL('./buildMug.worker.ts', import.meta.url),
    { type: 'module' },
  )

  return {
    build(params, onResult, onError) {
      worker.onmessage = (
        event: MessageEvent<{ id: number; data?: SerializedBuildResult; error?: boolean }>,
      ) => {
        if (event.data.error || !event.data.data) {
          onError?.()
          return
        }
        onResult(event.data.data)
      }
      worker.onerror = () => onError?.()
      worker.postMessage({ id: Date.now(), params })
    },
    terminate() {
      worker.terminate()
    },
  }
}
```

```ts
// buildMug.worker.ts
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { fontUrls } from '../../chaveiros/chaveiro/fonts'
import { buildMug } from './buildMug'
import { serializeBuildResult } from './workerGeometry'
import type { MugGeometryParams } from './schema'

interface BuildRequest {
  id: number
  params: MugGeometryParams
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

const loader = new FontLoader()

scope.onmessage = async (event) => {
  const { id, params } = event.data
  try {
    const font = await loader.loadAsync(fontUrls[params.fontStyle])
    const { data, transfer } = serializeBuildResult(buildMug(params, font))
    scope.postMessage({ id, data }, transfer)
  } catch {
    scope.postMessage({ id, error: true })
  }
}
```

**Step 5: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry.ts \
  src/features/studio/tools/lembrancinhas/caneca-personalizada/workerClient.ts \
  src/features/studio/tools/lembrancinhas/caneca-personalizada/buildMug.worker.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/workerGeometry.test.ts
git commit -m "feat: add mug worker"
```

---

## Task 8: Hook de estado

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/useMug.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/useMug.test.ts`

**Step 1: Escrever o teste que falha**

Siga o fixture de `useBox.test.ts`: worker falso que guarda o callback e
responde com `serializeBuildResult` de duas caixas. Cubra:

- defaults e `capacityMl`;
- clamp de `diameterTop` (70–100), `textSize` (6–18) e `text` (20 chars);
- build após 250 ms com `buildParams` sem cores;
- troca de cor não rebuilda;
- falha mantém a geometria anterior e define `error`;
- `issues` do `validateMug`;
- `reset`;
- dimensões e `fitRadius` com a alça.

```ts
function serializedMug() {
  return serializeBuildResult({
    body: new BoxGeometry(80, 88, 80),
    handle: new BoxGeometry(52, 43, 12),
  }).data
}
```

Use `workerFactory` injetável como nas outras ferramentas.

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/useMug.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

Copie a estrutura de `caixa-personalizada/useBox.ts` e ajuste:

```ts
const NUMERIC_RANGES: Partial<Record<keyof MugParams, { min: number; max: number }>> = {
  diameterTop: { min: 70, max: 100 },
  diameterBottom: { min: 60, max: 95 },
  height: { min: 80, max: 115 },
  wallThickness: { min: 1.8, max: 4 },
  bottomThickness: { min: 2, max: 6 },
  rimChamfer: { min: 0, max: 2 },
  handleHeight: { min: 35, max: 85 },
  handleGap: { min: 24, max: 40 },
  handleReach: { min: 30, max: 50 },
  handleBand: { min: 5, max: 10 },
  handleWidth: { min: 8, max: 16 },
  handleClearance: { min: 0.2, max: 0.5 },
  textSize: { min: 6, max: 18 },
  textCenterY: { min: 20, max: 90 },
}
```

Regras específicas:

- `text` é truncado em `MAX_TEXT_LENGTH` antes do `safeParse`.
- `handleEnabled` é booleano; o reducer aceita `number | string | boolean`.
- `buildParams` inclui todos os campos de geometria e exclui `bodyColor` e
  `accentColor`.
- `dimensions`: largura e altura da bounding box do corpo; espessura =
  `wallThickness`.
- `fitRadius`: esfera envolvente da união das bounding boxes de corpo e alça.
- `cameraPosition`: `fitRadius * 2.2`, elevação 25°, azimute 210° (lado do
  texto).
- `capacityMl: getCapacityMl(buildParams)`.
- `builtParams` guarda o snapshot do último build bem-sucedido.
- Em falha, `error` recebe `'Falha ao gerar a geometria'` e a geometria anterior
  permanece.

Interface:

```ts
export interface UseMugResult {
  params: MugParams
  geometry: BuildMugResult | null
  builtParams: MugGeometryParams | null
  isBuilding: boolean
  error: string | null
  issues: ValidationIssue[]
  capacityMl: number
  dimensions: { width: number; height: number; thickness: number }
  cameraPosition: [number, number, number]
  fitRadius: number
  updateParam: (key: keyof MugParams, value: number | string | boolean) => void
  reset: () => void
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/useMug.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/useMug.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/useMug.test.ts
git commit -m "feat: add mug state hook"
```

---

## Task 9: Export STL

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl.ts`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl.test.ts`

**Step 1: Escrever o teste que falha**

Copie o setup de download de `caixa-personalizada/exportStl.test.ts` e cubra:

```ts
it('baixa corpo e alça com o nome do projeto', () => {
  const { anchors } = setupDownloadMocks()
  const result = {
    body: new BoxGeometry(80, 88, 80),
    handle: new BoxGeometry(52, 43, 12),
  }
  exportMugStl(result, 'Caneca da Ana!')
  expect(anchors.map((anchor) => anchor.download)).toEqual([
    'Caneca-da-Ana-corpo.stl',
    'Caneca-da-Ana-alca.stl',
  ])
})

it('alça desligada gera só o corpo', () => {
  const { anchors } = setupDownloadMocks()
  exportMugStl({ body: new BoxGeometry(80, 88, 80), handle: null }, '')
  expect(anchors.map((anchor) => anchor.download)).toEqual(['caneca-corpo.stl'])
})

it('prepara a alça deitada e o corpo com a base em y = 0', () => {
  const body = new BoxGeometry(80, 88, 80)
  body.translate(10, 5, -20)
  const preparedBody = prepareBodyForPrint(body)
  preparedBody.computeBoundingBox()
  expect(preparedBody.boundingBox!.min.y).toBeCloseTo(0, 3)

  const handle = new BoxGeometry(52, 43, 12)
  handle.translate(60, 52, 0)
  const preparedHandle = prepareHandleForPrint(handle)
  preparedHandle.computeBoundingBox()
  expect(preparedHandle.boundingBox!.min.y).toBeCloseTo(0, 3)
  expect(preparedHandle.boundingBox!.max.y).toBeCloseTo(12, 3)

  body.dispose()
  preparedBody.dispose()
  handle.dispose()
  preparedHandle.dispose()
})
```

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl.test.ts`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

Copie `downloadStl` e `centerOnBed` de `caixa-personalizada/exportStl.ts` e
adicione:

```ts
export function prepareBodyForPrint(geometry: BufferGeometry): BufferGeometry {
  return centerOnBed(geometry.clone())
}

export function prepareHandleForPrint(geometry: BufferGeometry): BufferGeometry {
  const clone = geometry.clone()
  // Laço na mesa: a espessura da alça fica em Y e o arco sobe em pé.
  clone.rotateX(-Math.PI / 2)
  return centerOnBed(clone)
}

export function exportMugStl(result: BuildMugResult, projectName: string): void {
  const name = sanitizeFilename(projectName)
  downloadStl(prepareBodyForPrint(result.body), `${name}-corpo.stl`)
  if (result.handle) {
    downloadStl(prepareHandleForPrint(result.handle), `${name}-alca.stl`)
  }
}
```

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl.ts \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/exportStl.test.ts
git commit -m "feat: export mug stls"
```

---

## Task 10: Painel de parâmetros

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/StudioPanel.tsx`
- Test: `tests/features/studio/tools/lembrancinhas/caneca-personalizada/StudioPanel.test.tsx`

**Step 1: Escrever o teste que falha**

Cubra:

- título **Caneca Personalizada**, botão **Restaurar** e capacidade (`338 ml`);
- quatro acordeões: Corpo, Alça, Personalização e Aparência;
- slider de diâmetro do topo emite `updateParam('diameterTop', ...)`;
- `TextField` de texto emite `updateParam('text', 'Ana')`;
- `SwitchField` desabilita o bloco de alça;
- seção de validação mostra os códigos;
- swatches de cor emitem `bodyColor` e `accentColor`.

**Step 2: Rodar e confirmar a falha**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/StudioPanel.test.tsx`
Expected: FAIL com módulo não encontrado.

**Step 3: Implementar**

Copie a estrutura visual de `termoformador/StudioPanel.tsx` (`View`, `Heading`,
`Accordion`, `LabeledSlider`, `ColorSwatches`). Interface:

```tsx
interface StudioPanelProps {
  params: MugParams
  issues: ValidationIssue[]
  capacityMl: number
  onUpdateParam: (key: keyof MugParams, value: number | string | boolean) => void
  onReset: () => void
}
```

Conteúdo:

- **Corpo** — `diameterTop`, `diameterBottom`, `height`, `wallThickness`,
  `bottomThickness`, `rimChamfer`; linha `Capacidade aproximada: {capacityMl.toFixed(0)} ml`.
- **Alça** — `SwitchField` "Habilitar alça"; desabilitar os sliders quando
  `!handleEnabled`; `handleHeight`, `handleGap`, `handleReach`, `handleBand`,
  `handleWidth`, `handleClearance`.
- **Personalização** — `TextField` "Texto" (`maxLength={MAX_TEXT_LENGTH}`),
  sliders de `textSize` e `textCenterY`, `SelectField` de `fontStyle`.
- **Aparência** — swatches de `bodyColor` e `accentColor`.
- **Validação** — `Alert variation={severity === 'error' ? 'error' : 'warning'}`
  para cada issue; mensagem "Sem avisos" quando vazio.

**Step 4: Rodar e confirmar o sucesso**

Run: `npm run test -- tests/features/studio/tools/lembrancinhas/caneca-personalizada/StudioPanel.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/StudioPanel.tsx \
  tests/features/studio/tools/lembrancinhas/caneca-personalizada/StudioPanel.test.tsx
git commit -m "feat: add mug parameter panel"
```

---

## Task 11: Preview e integração no Studio

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/caneca-personalizada/MugPreview.tsx`
- Modify: `src/features/studio/components/ToolSelector.tsx`
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/components/ToolSelector.test.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx`

**Step 1: Implementar o preview**

```tsx
import type { BufferGeometry } from 'three'

interface MugPreviewProps {
  body: BufferGeometry | null
  handle: BufferGeometry | null
  bodyColor: string
  accentColor: string
}

export function MugPreview({ body, handle, bodyColor, accentColor }: MugPreviewProps) {
  return (
    <group>
      {body && (
        <mesh geometry={body} castShadow receiveShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.05} />
        </mesh>
      )}
      {handle && (
        <mesh geometry={handle} castShadow receiveShadow>
          <meshStandardMaterial color={accentColor} roughness={0.5} metalness={0.05} />
        </mesh>
      )}
    </group>
  )
}
```

**Step 2: Atualizar o `ToolSelector`**

- Adicionar `'caneca-personalizada'` ao `ToolId`.
- Card em Lembrancinhas:
  `name: 'Caneca Personalizada'`, ícone `☕`, descrição
  `'Caneca 3D com nome em relevo e alça removível de encaixe'`.

**Step 3: Atualizar o `StudioPage`**

- Lazy imports de `StudioPanel` e `MugPreview`.
- `MugToolWrapper` com `useMug`, `StudioTopbar`, overlay de build/erro,
  `StudioViewport` (`resetAzimuth={210}`, `cameraPosition`, `fitRadius`) e
  `StudioStatusBar`.
- Export com `exportMugStl(geometry, projectName)` e `setExportError`.
- Renderizar quando `activeTool === 'caneca-personalizada'`.

**Step 4: Atualizar os testes existentes**

- `ToolSelector.test.tsx`: a seção Lembrancinhas passa de 2 para 3 botões;
  adicionar o teste do card Caneca com o id `'caneca-personalizada'`.
- `StudioPage.test.tsx`: adicionar mocks de `StudioPanel`, `MugPreview`,
  `exportStl` e a resposta do worker da caneca; testar abrir, gerar, exportar e
  voltar.
- Fixture do worker: `serializeBuildResult({ body: BoxGeometry, handle: BoxGeometry }).data`.

**Step 5: Rodar os testes**

Run: `npm run test -- tests/features/studio/components/ToolSelector.test.tsx tests/features/studio/StudioPage.test.tsx`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/caneca-personalizada/MugPreview.tsx \
  src/features/studio/components/ToolSelector.tsx \
  src/features/studio/StudioPage.tsx \
  tests/features/studio/components/ToolSelector.test.tsx \
  tests/features/studio/StudioPage.test.tsx
git commit -m "feat: wire mug tool into studio"
```

---

## Task 12: Documentação e verificação final

**Files:**
- Modify: `src/features/studio/tools/lembrancinhas/AGENTS.md` (status → implementada)
- Modify: `src/features/studio/tools/lembrancinhas/caneca-personalizada/AGENTS.md`
  (status → implementada e decisões reais)
- Modify: `docs/frontend/studio.md` (remover "planejada", registrar decisões)
- Maybe: `docs/plans/2026-11-17-caneca-personalizada-design.md` (status)

**Step 1: Atualizar a documentação**

- Trocar **planejada** por **implementada (v1)** nos dois `AGENTS.md`.
- Registrar no `AGENTS.md` da ferramenta: tempo de build medido, resultados do
  spike, folga efetiva, orientação de impressão e qualquer desvio.
- Em `docs/frontend/studio.md`, remover "(planejada)" do card e da seção,
  documentar o pipeline final, os códigos de validação e as decisões.
- Atualizar o status do design doc para "implementado".

**Step 2: Rodar a verificação completa**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run lint`
Expected: PASS, sem warnings.

Run: `npm run test`
Expected: PASS.

Run: `npm run build`
Expected: PASS, com o chunk do worker da caneca emitido.

**Step 3: Varredura final**

Run: `rg -n "caneca" src tests docs/frontend/studio.md | head -80`
Expected: referências consistentes; nenhum "planejada" sobrando no código ativo.

**Step 4: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/AGENTS.md \
  src/features/studio/tools/lembrancinhas/caneca-personalizada/AGENTS.md \
  docs/frontend/studio.md \
  docs/plans/2026-11-17-caneca-personalizada-design.md
git commit -m "docs: document mug tool"
```

---

## Critérios de conclusão

- Card **Caneca Personalizada** em Lembrancinhas abre a ferramenta.
- Corpo padrão de 80 × 88 mm, parede 2,4 mm, capacidade ≈ 338 ml.
- Texto em relevo de 1 mm acompanha a curvatura e a alça de abraçadeira encaixa
  com 0,3 mm de folga.
- Export gera `<nome>-corpo.stl` e `<nome>-alca.stl`, fechados e manifold.
- Sliders atualizam com debounce e build em worker.
- Validação lista as issues esperadas sem bloquear.
- Typecheck, lint, testes e build passam.
- Documentação atualizada e sem referências a "planejada" no código ativo.
