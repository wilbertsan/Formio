# Painel Único do Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrar o Studio para um painel esquerdo único com dropdown de produto e 4 blocos Accordion (Texto, Base, Argola, Relevo), novos parâmetros (estilo de letra, borda externa, 6 controles de argola, cores) e regras de segurança: texto sempre com borda de 4mm e furo da argola sempre a 2mm da borda.

**Architecture:** `schema.ts` estendido (17 params), `shapes.ts` com posicionamento de furo parametrizado (posição/offsets/encaixe) + anel de reforço, `buildKeychain` retorna `{base, text}` para 2 cores no preview, `useKeychain` com fontes lazy por estilo, novo `StudioPanel` com Accordion Amplify UI substituindo toolbar+painel direito. STL exporta merge.

**Tech Stack:** Amplify UI 6 (Accordion, SelectField, SliderField, TextField), Tailwind 4, three TextGeometry com 3 fontes typeface.json, three-bvh-csg, Vitest.

**Design doc:** `docs/plans/2026-08-23-studio-panel-design.md`

---

## Convenções para o executor

- **TDD obrigatório:** @superpowers:test-driven-development — teste → falha → implementação → pass → commit. Tasks 8 e 10 são infra/docs.
- **Commits semânticos** após cada task; toda task termina com lint+typecheck+test verdes (mocks de R3F/drei/CSG/TextGeometry/fontes já padronizados nos testes existentes — copie os padrões de `tests/features/studio/`).
- **Comandos:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- **Contexto:** repo `/opt/projects/BELIS3D`, branch `main`, 92 testes verdes. Fontes já baixadas em `src/assets/fonts/`: `helvetiker_bold.typeface.json` (existente), `helvetiker_regular.typeface.json`, `optimer_regular.typeface.json` (novas).
- **Mapeamento fontes:** `normal → helvetiker_regular`, `bold → helvetiker_bold`, `serif → optimer_regular`. Imports via `?url` (padrão do `useKeychain` atual).
- **Regras de segurança (constantes exportadas de `schema.ts`):** `TEXT_BORDER_MIN = 4` (margem do texto) e `RING_EDGE_MARGIN = 2` (furo à borda). O schema valida `borderWidth >= 4`; o build clampa a posição do furo.
- **Accordion:** usar o padrão `Accordion.Container` + `Accordion.Item` + `Accordion.Trigger` (API real do Amplify UI v6, como na FAQ da landing — veja `src/features/landing/components/FaqSection.tsx`).
- **Remoções no fim (Task 9):** `StudioToolbar`, `StudioParameters` antigos e testes.

---

### Task 1: Fontes + schema estendido (TDD)

**Files:**
- Create: `src/features/studio/keychain/fonts.ts`
- Modify: `src/features/studio/keychain/schema.ts`
- Test: `tests/features/studio/keychain/schema.test.ts` (reescrito)

**Step 1: Criar `src/features/studio/keychain/fonts.ts`** (mapa estilo → URL):

```ts
import helvetikerRegular from '@/assets/fonts/helvetiker_regular.typeface.json?url'
import helvetikerBold from '@/assets/fonts/helvetiker_bold.typeface.json?url'
import optimerRegular from '@/assets/fonts/optimer_regular.typeface.json?url'
import type { FontStyle } from './schema'

export const fontUrls: Record<FontStyle, string> = {
  normal: helvetikerRegular,
  bold: helvetikerBold,
  serif: optimerRegular,
}
```

**Step 2: Reescrever o teste** — substituir TODO o conteúdo de `tests/features/studio/keychain/schema.test.ts`:

```ts
import {
  defaultKeychainParams,
  keychainParamsSchema,
  normalizeName,
  sanitizeFilename,
  TEXT_BORDER_MIN,
  RING_EDGE_MARGIN,
} from '@/features/studio/keychain/schema'

describe('keychain schema', () => {
  it('defaults são válidos', () => {
    expect(keychainParamsSchema.parse(defaultKeychainParams)).toEqual(defaultKeychainParams)
  })

  it('aceita formas, modos, fontes, posições de argola e cores válidas', () => {
    for (const baseShape of ['rect', 'circle', 'heart'] as const) {
      for (const fontStyle of ['normal', 'bold', 'serif'] as const) {
        for (const ringPosition of ['top', 'bottom', 'left', 'right'] as const) {
          const parsed = keychainParamsSchema.safeParse({
            ...defaultKeychainParams,
            baseShape,
            fontStyle,
            ringPosition,
          })
          expect(parsed.success).toBe(true)
        }
      }
    }
  })

  it('rejeita nome vazio ou maior que 12 chars', () => {
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, name: '' }).success).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, name: 'a'.repeat(13) }).success,
    ).toBe(false)
  })

  it('rejeita borda externa menor que 4mm', () => {
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, borderWidth: 3.9 }).success,
    ).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, borderWidth: 4 }).success,
    ).toBe(true)
  })

  it('rejeita ajuste radial negativo e encaixe fora do range', () => {
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, ringRadialOffset: -1 }).success,
    ).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, ringEmbedding: 4 }).success,
    ).toBe(false)
  })

  it('rejeita valores fora dos ranges numéricos', () => {
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, width: 10 }).success).toBe(false)
    expect(keychainParamsSchema.safeParse({ ...defaultKeychainParams, thickness: 8 }).success).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, ringInnerDiameter: 2 }).success,
    ).toBe(false)
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, ringLateralOffset: 15 }).success,
    ).toBe(false)
  })

  it('rejeita cores fora da paleta PLA', () => {
    expect(
      keychainParamsSchema.safeParse({ ...defaultKeychainParams, baseColor: '#ff0000' }).success,
    ).toBe(false)
  })

  it('exporta constantes de segurança', () => {
    expect(TEXT_BORDER_MIN).toBe(4)
    expect(RING_EDGE_MARGIN).toBe(2)
  })

  it('normalizeName remove acentos e ç', () => {
    expect(normalizeName('João Çaça')).toBe('Joao Caca')
  })

  it('sanitizeFilename gera nome de arquivo seguro', () => {
    expect(sanitizeFilename('Meu Projeto! @#')).toBe('Meu-Projeto')
    expect(sanitizeFilename('///')).toBe('chaveiro')
  })
})
```

**Step 3: Rodar → FAIL**

**Step 4: Reescrever `src/features/studio/keychain/schema.ts`**:

```ts
import { z } from 'zod'

export const TEXT_BORDER_MIN = 4
export const RING_EDGE_MARGIN = 2

export const PLA_COLORS = [
  '#14b8a6',
  '#ef4444',
  '#3b82f6',
  '#eab308',
  '#22c55e',
  '#f97316',
  '#ec4899',
  '#8b5cf6',
  '#171717',
  '#f5f5f5',
] as const

export type PlaColor = (typeof PLA_COLORS)[number]

export const keychainParamsSchema = z.object({
  productType: z.literal('keychain'),
  name: z.string().trim().min(1).max(12),
  fontStyle: z.enum(['normal', 'bold', 'serif']),
  baseShape: z.enum(['rect', 'circle', 'heart']),
  textMode: z.enum(['raised', 'engraved']),
  width: z.number().min(20).max(80),
  borderWidth: z.number().min(4).max(10),
  thickness: z.number().min(2).max(6),
  letterHeight: z.number().min(0.4).max(2),
  ringPosition: z.enum(['top', 'bottom', 'left', 'right']),
  ringInnerDiameter: z.number().min(3).max(10),
  ringThickness: z.number().min(1.5).max(4),
  ringEmbedding: z.number().min(0).max(3),
  ringLateralOffset: z.number().min(-10).max(10),
  ringRadialOffset: z.number().min(0).max(5),
  baseColor: z.enum(PLA_COLORS),
  letterColor: z.enum(PLA_COLORS),
})

export type KeychainParams = z.infer<typeof keychainParamsSchema>
export type KeychainShape = KeychainParams['baseShape']
export type KeychainTextMode = KeychainParams['textMode']
export type FontStyle = KeychainParams['fontStyle']
export type RingPosition = KeychainParams['ringPosition']

export const defaultKeychainParams: KeychainParams = {
  productType: 'keychain',
  name: 'Meu nome',
  fontStyle: 'bold',
  baseShape: 'rect',
  textMode: 'raised',
  width: 50,
  borderWidth: 4,
  thickness: 3,
  letterHeight: 1,
  ringPosition: 'top',
  ringInnerDiameter: 5,
  ringThickness: 2,
  ringEmbedding: 0,
  ringLateralOffset: 0,
  ringRadialOffset: 0,
  baseColor: '#14b8a6',
  letterColor: '#f5f5f5',
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/gi, 'c')
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-')
  return cleaned.length > 0 ? cleaned : 'chaveiro'
}
```

**Step 5: Rodar → PASS**

**Step 6: Commit**

```bash
git add src/features/studio/keychain/schema.ts src/features/studio/keychain/fonts.ts src/assets/fonts tests/features/studio/keychain/schema.test.ts
git commit -m "feat: estende schema com fonte, argola parametrizada e cores"
```

---

### Task 2: Shapes com furo posicionável + anel de reforço (TDD)

**Files:**
- Modify: `src/features/studio/keychain/shapes.ts` (reescrito)
- Test: `tests/features/studio/keychain/shapes.test.ts` (reescrito)

**Step 1: Reescrever o teste**:

```ts
import * as THREE from 'three'
import {
  createBaseShape,
  createReinforcementRing,
  getRingPosition,
} from '@/features/studio/keychain/shapes'
import { defaultKeychainParams, RING_EDGE_MARGIN } from '@/features/studio/keychain/schema'

const ring = {
  position: 'top' as const,
  innerDiameter: 5,
  thickness: 2,
  embedding: 0,
  lateralOffset: 0,
  radialOffset: 0,
}

function shapeGeometry(shape: THREE.Shape): THREE.ShapeGeometry {
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.computeBoundingBox()
  return geometry
}

describe('createBaseShape', () => {
  it('retângulo com um furo', () => {
    const shape = createBaseShape('rect', 50, 25, ring)
    expect(shape.holes).toHaveLength(1)
  })

  it('círculo e coração com um furo', () => {
    expect(createBaseShape('circle', 50, 25, ring).holes).toHaveLength(1)
    expect(createBaseShape('heart', 50, 25, ring).holes).toHaveLength(1)
  })

  it('furo sempre a pelo menos 2mm da borda para todas as formas e posições', () => {
    for (const baseShape of ['rect', 'circle', 'heart'] as const) {
      for (const position of ['top', 'bottom', 'left', 'right'] as const) {
        const shape = createBaseShape(baseShape, 50, 50, { ...ring, position })
        const geometry = shapeGeometry(shape)
        const bb = geometry.boundingBox
        expect(bb).not.toBeNull()
        const hole = shape.holes[0]
        const holeBB = new THREE.Box3().setFromPoints(hole.getPoints(32))
        const marginX = Math.min(
          (holeBB.min.x ?? 0) - (bb?.min.x ?? 0),
          (bb?.max.x ?? 0) - (holeBB.max.x ?? 0),
        )
        const marginY = Math.min(
          (holeBB.min.y ?? 0) - (bb?.min.y ?? 0),
          (bb?.max.y ?? 0) - (holeBB.max.y ?? 0),
        )
        expect(Math.min(marginX, marginY)).toBeGreaterThanOrEqual(RING_EDGE_MARGIN - 0.5)
      }
    }
  })

  it('offsets movem o furo mas mantêm margem mínima', () => {
    const shape = createBaseShape('rect', 50, 25, { ...ring, lateralOffset: 8, radialOffset: 3 })
    const geometry = shapeGeometry(shape)
    const bb = geometry.boundingBox
    const holeBB = new THREE.Box3().setFromPoints(shape.holes[0].getPoints(32))
    const marginX = Math.min(
      (holeBB.min.x ?? 0) - (bb?.min.x ?? 0),
      (bb?.max.x ?? 0) - (holeBB.max.x ?? 0),
    )
    const marginY = Math.min(
      (holeBB.min.y ?? 0) - (bb?.min.y ?? 0),
      (bb?.max.y ?? 0) - (holeBB.max.y ?? 0),
    )
    expect(Math.min(marginX, marginY)).toBeGreaterThanOrEqual(RING_EDGE_MARGIN - 0.5)
  })
})

describe('getRingPosition', () => {
  it('posiciona o furo no lado escolhido com margem e encaixe', () => {
    const top = getRingPosition('rect', 50, 25, { ...ring, position: 'top' })
    expect(top.y).toBeCloseTo(25 / 2 - RING_EDGE_MARGIN - ring.innerDiameter / 2)
    const bottom = getRingPosition('rect', 50, 25, { ...ring, position: 'bottom' })
    expect(bottom.y).toBeCloseTo(-25 / 2 + RING_EDGE_MARGIN + ring.innerDiameter / 2)
    const right = getRingPosition('rect', 50, 25, { ...ring, position: 'right' })
    expect(right.x).toBeCloseTo(50 / 2 - RING_EDGE_MARGIN - ring.innerDiameter / 2)
  })

  it('encaixe move o centro para dentro da peça', () => {
    const withoutEmbed = getRingPosition('rect', 50, 25, { ...ring, position: 'top', embedding: 0 })
    const withEmbed = getRingPosition('rect', 50, 25, { ...ring, position: 'top', embedding: 2 })
    expect(withEmbed.y).toBeLessThan(withoutEmbed.y)
  })

  it('ajuste lateral desloca perpendicular ao lado', () => {
    const base = getRingPosition('rect', 50, 25, { ...ring, position: 'top' })
    const shifted = getRingPosition('rect', 50, 25, { ...ring, position: 'top', lateralOffset: 5 })
    expect(shifted.x).toBeCloseTo(base.x + 5)
    expect(shifted.y).toBeCloseTo(base.y)
  })
})

describe('createReinforcementRing', () => {
  it('gera anel externo que contém o furo interno', () => {
    const ringShape = createReinforcementRing(ring)
    expect(ringShape.holes).toHaveLength(1)
    const geometry = shapeGeometry(ringShape)
    const holeBB = new THREE.Box3().setFromPoints(ringShape.holes[0].getPoints(32))
    const outerBB = geometry.boundingBox
    const outerRadius = (outerBB?.max.x ?? 0)
    const holeRadius = (holeBB.max.x ?? 0)
    expect(outerRadius).toBeGreaterThan(holeRadius)
    expect(outerRadius - holeRadius).toBeGreaterThanOrEqual(ring.thickness - 0.1)
  })
})
```

**Step 2: Rodar → FAIL**

**Step 3: Reescrever `src/features/studio/keychain/shapes.ts`**:

```ts
import { Path, Shape, Vector2 } from 'three'
import { RING_EDGE_MARGIN, type KeychainShape, type RingPosition } from './schema'

export interface RingParams {
  position: RingPosition
  innerDiameter: number
  thickness: number
  embedding: number
  lateralOffset: number
  radialOffset: number
}

export function createBaseShape(
  shapeType: KeychainShape,
  width: number,
  height: number,
  ring: RingParams,
): Shape {
  const shape = buildOutline(shapeType, width, height)
  let center = getRingPosition(shapeType, width, height, ring)
  const radius = ring.innerDiameter / 2
  center = clampHoleInside(shape, center, radius)
  const hole = new Path()
  hole.absarc(center.x, center.y, radius, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

export function getRingPosition(
  shapeType: KeychainShape,
  width: number,
  height: number,
  ring: RingParams,
): Vector2 {
  const half = { x: width / 2, y: height / 2 }
  const radius = ring.innerDiameter / 2
  const inset = RING_EDGE_MARGIN + radius + ring.radialOffset - ring.embedding
  let x = 0
  let y = 0
  switch (ring.position) {
    case 'top':
      y = half.y - inset
      x = ring.lateralOffset
      break
    case 'bottom':
      y = -half.y + inset
      x = ring.lateralOffset
      break
    case 'right':
      x = half.x - inset
      y = ring.lateralOffset
      break
    case 'left':
      x = -half.x + inset
      y = ring.lateralOffset
      break
  }
  if (shapeType === 'circle') {
    const circleRadius = width / 2
    const diag = Math.SQRT1_2 * (circleRadius - inset)
    switch (ring.position) {
      case 'top':
        return new Vector2(ring.lateralOffset, circleRadius - inset)
      case 'bottom':
        return new Vector2(ring.lateralOffset, -circleRadius + inset)
      case 'right':
        return new Vector2(circleRadius - inset, ring.lateralOffset)
      case 'left':
        return new Vector2(-circleRadius + inset, ring.lateralOffset)
    }
  }
  return new Vector2(x, y)
}

function clampHoleInside(shape: Shape, center: Vector2, radius: number): Vector2 {
  const points = shape.getPoints(64)
  let limited = center.clone()
  for (let i = 0; i < 8; i += 1) {
    const nearest = nearestPointDistance(points, limited)
    if (nearest >= radius + RING_EDGE_MARGIN - 0.05) break
    const direction = center.lengthSq() > 0.001 ? center.clone().normalize() : new Vector2(0, 0)
    if (direction.lengthSq() < 0.001) break
    limited.sub(direction.clone().multiplyScalar(0.5))
  }
  return limited
}

function nearestPointDistance(points: Vector2[], target: Vector2): number {
  let min = Infinity
  for (const point of points) {
    const distance = point.distanceTo(target)
    if (distance < min) min = distance
  }
  return min
}

export function createReinforcementRing(ring: RingParams): Shape {
  const outerRadius = ring.innerDiameter / 2 + ring.thickness
  const shape = new Shape()
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false)
  const hole = new Path()
  hole.absarc(0, 0, ring.innerDiameter / 2, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

function buildOutline(shapeType: KeychainShape, width: number, height: number): Shape {
  switch (shapeType) {
    case 'rect':
      return rectShape(width, height)
    case 'circle':
      return circleShape(width)
    case 'heart':
      return heartShape(width, height)
  }
}

function rectShape(width: number, height: number): Shape {
  const radius = Math.min(3, width / 4, height / 4)
  const w = width / 2
  const h = height / 2
  const shape = new Shape()
  shape.moveTo(-w + radius, -h)
  shape.lineTo(w - radius, -h)
  shape.quadraticCurveTo(w, -h, w, -h + radius)
  shape.lineTo(w, h - radius)
  shape.quadraticCurveTo(w, h, w - radius, h)
  shape.lineTo(-w + radius, h)
  shape.quadraticCurveTo(-w, h, -w, h - radius)
  shape.lineTo(-w, -h + radius)
  shape.quadraticCurveTo(-w, -h, -w + radius, -h)
  return shape
}

function circleShape(diameter: number): Shape {
  const shape = new Shape()
  shape.absarc(0, 0, diameter / 2, 0, Math.PI * 2, false)
  return shape
}

function heartShape(width: number, height: number): Shape {
  const s = Math.min(width / 16, height / 14)
  const shape = new Shape()
  shape.moveTo(0, 5 * s)
  shape.bezierCurveTo(5 * s, 12 * s, 12 * s, 6 * s, 12 * s, 0)
  shape.bezierCurveTo(12 * s, -6 * s, 6 * s, -9 * s, 0, -14 * s)
  shape.bezierCurveTo(-6 * s, -9 * s, -12 * s, -6 * s, -12 * s, 0)
  shape.bezierCurveTo(-12 * s, 6 * s, -5 * s, 12 * s, 0, 5 * s)
  return shape
}
```

Notas do executor:
- `height` do retângulo: hoje o chaveiro usa `width` × `height` fixos; o novo schema só tem `width` — **decisão**: altura derivada da forma (rect = width/2, circle = width, heart = width × 14/16). Se preferir manter height implícito assim, exponha `getBaseDimensions(baseShape, width): {width, height}` e use-a em createBaseShape/buildKeychain/StatusBar (o schema não tem height — YAGNI, largura final é o parâmetro do usuário).
- `clampHoleInside` protege coração e offsets extremos: se o furo não couber com margem, puxa para o centro em passos de 0.5mm. Se os testes de margem falharem no coração, aumente o número de iterações ou refine o passo.
- A variável `diag` no branch do círculo está não usada — remova-a (lint).

**Step 4: Rodar → PASS** (ajuste clamps conforme necessário)

**Step 5: Commit**

```bash
git add src/features/studio/keychain/shapes.ts tests/features/studio/keychain/shapes.test.ts
git commit -m "feat: furo parametrizável com margem de 2mm e anel de reforço"
```

---

### Task 3: buildKeychain v2 — {base, text} + margem 4mm (TDD)

**Files:**
- Modify: `src/features/studio/keychain/buildKeychain.ts` (reescrito)
- Test: `tests/features/studio/keychain/buildKeychain.test.ts` (reescrito)

**Step 1: Reescrever o teste** (padrão de mocks do arquivo atual — TextGeometry/CSG/merge mockados; ver `git show HEAD:tests/features/studio/keychain/buildKeychain.test.ts`):

Testes requeridos:
1. `retorna base e texto separados` — `result.base` e `result.text` com atributos de posição
2. `base contém um furo` — construir `ShapeGeometry` indiretamente não é possível (ExtrudeGeometry real); assert via mock de ExtrudeGeometry OU pular este (coberto em shapes.test) — use o bounding box da base com `min/max` coerentes (base maior que texto em X)
3. `texto cabe na área útil (width - 2 * borderWidth)` — mock de TextGeometry com largura = size × name.length × factor; assert que letterSize aplicado ≤ (width − 2×borderWidth) / (name.length × factor)
4. `raised: texto acima da espessura` — `result.text.boundingBox.max.z > thickness`
5. `engraved: recesso raso, verso intacto` — `result.base.boundingBox.min.z > -0.3` (texto subtraído não fura o verso; com o mock de CSG retornando a base clonada, assert que o CSG foi chamado com texto cujo `max.z ≤ thickness + 0.3`)
6. `borderWidth mínimo de 4mm respeitado no fit` — com `borderWidth: 10` e nome longo, letterSize reduz mais que com `borderWidth: 4`
7. `usa a fonte recebida` — build chama nameToGeometry com font do input (spy)

Estrutura do resultado:

```ts
export interface KeychainGeometry {
  base: BufferGeometry
  text: BufferGeometry
}
```

**Step 2: Rodar → FAIL**

**Step 3: Reescrever `src/features/studio/keychain/buildKeychain.ts`**:

```ts
import { type BufferGeometry, ExtrudeGeometry, Shape } from 'three'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'
import {
  createBaseShape,
  createReinforcementRing,
  getRingPosition,
  type RingParams,
} from './shapes'
import { fitTextHeight, nameToGeometry } from './textToGeometry'
import { TEXT_BORDER_MIN, type KeychainParams } from './schema'

export interface BuildKeychainInput {
  font: Font
  params: KeychainParams
  onError?: (message: string) => void
}

export interface KeychainGeometry {
  base: BufferGeometry
  text: BufferGeometry
}

const TEXT_WIDTH_FACTOR = 0.62
const ENGRAVE_EPSILON = 0.2

export function buildKeychain({ font, params, onError }: BuildKeychainInput): KeychainGeometry {
  const ring: RingParams = {
    position: params.ringPosition,
    innerDiameter: params.ringInnerDiameter,
    thickness: params.ringThickness,
    embedding: params.ringEmbedding,
    lateralOffset: params.ringLateralOffset,
    radialOffset: params.ringRadialOffset,
  }

  const ringCenter = getRingPosition(params.baseShape, params.width, params.width, ring)
  const baseShape = createBaseShape(params.baseShape, params.width, params.width, ring)
  const baseGeometry = new ExtrudeGeometry(baseShape, {
    depth: params.thickness,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 1,
  })

  const ringShape = createReinforcementRing(ring)
  const ringGeometry = new ExtrudeGeometry(
    translatedShape(ringShape, ringCenter.x, ringCenter.y),
    {
      depth: params.thickness,
      bevelEnabled: false,
    },
  )
  const baseWithRing = mergeGeometries([baseGeometry, ringGeometry]) ?? baseGeometry

  const borderWidth = Math.max(params.borderWidth, TEXT_BORDER_MIN)
  const availableWidth = params.width - 2 * borderWidth
  const textSize = fitTextHeight({
    name: params.name,
    requestedSize: params.width * 0.32,
    maxWidth: availableWidth,
    factor: TEXT_WIDTH_FACTOR,
  })

  if (params.textMode === 'raised') {
    const textGeometry = nameToGeometry({
      font,
      name: params.name,
      size: textSize,
      depth: params.letterHeight,
    })
    textGeometry.translate(0, 0, params.thickness - 0.01)
    return { base: baseWithRing, text: textGeometry }
  }

  try {
    const textGeometry = nameToGeometry({
      font,
      name: params.name,
      size: textSize,
      depth: params.letterHeight + ENGRAVE_EPSILON,
    })
    textGeometry.translate(0, 0, params.thickness - params.letterHeight - ENGRAVE_EPSILON / 2)
    const evaluator = new Evaluator()
    const result = evaluator.evaluate(
      new Brush(baseWithRing),
      new Brush(textGeometry),
      SUBTRACTION,
    )
    result.geometry.computeVertexNormals()
    return { base: result.geometry, text: textGeometry }
  } catch {
    onError?.('Falha na gravação; usando relevo')
    const fallback = nameToGeometry({
      font,
      name: params.name,
      size: textSize,
      depth: params.letterHeight,
    })
    fallback.translate(0, 0, params.thickness - 0.01)
    return { base: baseWithRing, text: fallback }
  }
}

function translatedShape(shape: Shape, x: number, y: number): Shape {
  const translated = shape.clone()
  for (const point of translated.getPoints(64)) {
    point.set(point.x + x, point.y + y)
  }
  return translated
}
```

Notas do executor:
- `translatedShape` via clone+set é frágil (Shape.clone não copia curves) — implemente melhor: construa o anel já centrado em (x, y) passando o centro ao `createReinforcementRing(ring, centerX, centerY)` (absarc com centro parametrizado). Ajuste a assinatura e o teste da Task 2 em conformidade (`createReinforcementRing(ring, 0, 0)` nos testes existentes).
- `requestedSize: params.width * 0.32` substitui o `textHeight` antigo (schema novo não tem textHeight; o tamanho deriva do espaço). Se preferir manter textHeight no schema, reconcilie com o design aprovado (letterHeight é o relevo; o TAMANHO do texto agora é auto-fit) — **decisão do design: tamanho automático pelo fit**.
- Height da base: `getBaseDimensions` da Task 2 (não codar width×width) — use as dimensões corretas por forma.

**Step 4: Rodar → PASS**

**Step 5: Commit**

```bash
git add src/features/studio/keychain/buildKeychain.ts tests/features/studio/keychain/buildKeychain.test.ts
git commit -m "feat: build retorna base e texto separados com margem de 4mm"
```

---

### Task 4: exportStl com merge (TDD)

**Files:**
- Modify: `src/features/studio/keychain/exportStl.ts`
- Test: `tests/features/studio/keychain/exportStl.test.ts` (atualizado)

**Step 1: Atualizar o teste** — nova assinatura `exportStl(geometry: KeychainGeometry, projectName)`:

```ts
it('exporta a união de base e texto', () => {
  // mocks de URL/anchor como no teste atual
  const base = new THREE.BoxGeometry(10, 10, 10)
  const text = new THREE.BoxGeometry(5, 5, 5)
  vi.mocked(mergeGeometries) // ou spy via vi.mock de BufferGeometryUtils
  exportStl({ base, text }, 'Meu Projeto')
  // assert: blob criado; download 'Meu-Projeto.stl'; merge chamado com [base, text]
})
```

Mock de `three/examples/jsm/utils/BufferGeometryUtils.js` com `mergeGeometries: vi.fn((geos) => geos[0])`.

**Step 2: FAIL → implementar**:

```ts
import { type BufferGeometry } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { sanitizeFilename } from './schema'
import type { KeychainGeometry } from './buildKeychain'

export function exportStl(geometry: KeychainGeometry, projectName: string): void {
  const merged = mergeGeometries([geometry.base, geometry.text]) ?? geometry.base
  const exporter = new STLExporter()
  const result = exporter.parse(merged, { binary: true })
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

**Step 3: PASS → Commit** `feat: exporta stl com união de base e texto`

---

### Task 5: useKeychain com fontes lazy e cores (TDD)

**Files:**
- Modify: `src/features/studio/hooks/useKeychain.ts` (reescrito)
- Test: `tests/features/studio/hooks/useKeychain.test.tsx` (reescrito)

**Comportamentos testados:**
1. defaults do schema novo
2. `updateParam` com clamp (borderWidth 2 → 4; ringRadialOffset −1 → 0)
3. `updateName` válida/inválida
4. `reset` restaura
5. fonte carrega (mock FontLoader.load com callback síncrono) e `geometry` = `{base, text}` não nulos
6. trocar `fontStyle` carrega a fonte do estilo (mock resolve URL diferente por import; assert que FontLoader.load recebeu a URL do estilo — capture via spy no mock do módulo `fonts.ts` com `fontUrls` mockado)
7. `updateParam('baseColor', ...)` NÃO rebuilda geometria: guarda referência `result.current.geometry` antes/depois e compara `toBe` (mesma instância) — cores saem via `params`, aplicadas no material do preview
8. dimensions = `{width, height, thickness}` com height derivado da forma

**Implementação (esqueleto):**
- `useReducer` com schema novo (clamp genérico por campo via `keychainParamsSchema.safeParse` — mantém o padrão atual)
- `const [fonts, setFonts] = useState<Partial<Record<FontStyle, Font>>>({})`
- effect: se `params.fontStyle` ainda não carregado, `FontLoader().load(fontUrls[style], ...)` → adiciona ao cache
- effect do debounce: quando `fonts[params.fontStyle]` existe, `setGeometry(prev => { prev?.base.dispose(); prev?.text.dispose(); return buildKeychain({font, params}) })` — dependências `[fonts, params]`
- retorna `{ params, geometry, fontError, dimensions, updateParam, updateName, reset }`

**Commit** `feat: hook com fontes lazy por estilo e rebuild apenas em geometria`

---

### Task 6: StudioPanel — dropdown + 4 blocos Accordion (TDD)

**Files:**
- Create: `src/features/studio/components/StudioPanel.tsx`
- Test: `tests/features/studio/components/StudioPanel.test.tsx`

**Componente (props):**

```ts
interface StudioPanelProps {
  params: KeychainParams
  onUpdateParam: (key: keyof KeychainParams, value: number | string) => void
  onUpdateName: (name: string) => void
  onReset: () => void
}
```

**Estrutura:**
- `SelectField` "Produto" com única opção "Chaveiro" (label, disabled de troca real — valor fixo `params.productType`)
- `Accordion.Container allowMultiple` com 4 `Accordion.Item`:
  1. **Texto** (aberto default — `defaultOpen` se disponível na API; senão controlado com estado interno): TextField nome; 3 botões estilo (Normal/Negrito/Serifada, `aria-pressed`); 10 swatches letterColor (botões redondos `w-6 h-6 rounded-full` com `aria-label` do nome da cor, `aria-pressed`, borda teal quando ativo)
  2. **Base**: 3 botões forma (▭ ◯ ♥); swatches baseColor; sliders Largura (20–80), Borda externa (4–10), Espessura (2–6)
  3. **Argola**: 4 botões posição (↑ ↓ ← →); sliders Diâmetro interno (3–10), Espessura (1.5–4), Encaixe (0–3), Ajuste lateral (−10–10), Ajuste radial (0–5)
  4. **Relevo**: slider Altura do relevo (0.4–2); 2 botões modo (Relevo A▲ / Gravado A▼, `aria-pressed`)
- Botão "Restaurar padrão" no rodapé do painel
- Painel: `w-75 border-r border-neutral-200 bg-white overflow-y-auto p-3 flex flex-col gap-2` + classe `.studio-parameters` (CSS de compactação existente)
- Sliders: padrão condensado da Task anterior (label row text-xs + SliderField label="")
- Swatch grid: `flex flex-wrap gap-1.5`

**Testes:** renderiza dropdown e 4 blocos; controles de cada bloco disparam `onUpdateParam` com chave/valor corretos (forma, estilo, posição, modo, cor via `aria-label` do swatch); nome dispara `onUpdateName`; restaurar dispara `onReset`; swatch ativo tem `aria-pressed=true`.

**Commit** `feat: painel único com blocos de expansão`

---

### Task 7: KeychainPreview 2 cores + viewport com reset flutuante (TDD)

**Files:**
- Modify: `src/features/studio/components/KeychainPreview.tsx`
- Modify: `src/features/studio/components/StudioViewport.tsx`
- Test: `tests/features/studio/components/StudioViewport.test.tsx` (atualizado)

**Mudanças:**
- `KeychainPreview` props `{ geometry: KeychainGeometry | null, baseColor: string, letterColor: string }` → 2 meshes com `meshStandardMaterial` das cores (base recebe `receiveShadow castShadow`; texto idem)
- `StudioViewport` props `{ geometry: KeychainGeometry | null, resetCameraSignal: number, baseColor, letterColor }`; botão flutuante reset câmera **mantém via signal** (StudioPage incrementa) — o botão flutuante vive NO Viewport e chama `onResetCamera` (nova prop) que dispara o signal; posicionado `absolute right-3 top-3 z-10` com ícone ⌂, estilo `bg-white/90 border border-neutral-200 rounded-md h-9 w-9`
- Grid distante e câmera mantidos

**Testes:** preview renderiza 2 meshes (via mock: `data-testid="mesh-base"`/`"mesh-text"`); botão reset flutuante visível e dispara `onResetCamera`; cores passadas (mock material recebe color). Atualizar `StudioPage.test` mocks.

**Commit** `feat: preview com cores de base e letras e reset flutuante`

---

### Task 8: StudioPage integrando painel único

**Files:**
- Modify: `src/features/studio/StudioPage.tsx`
- Test: `tests/features/studio/StudioPage.test.tsx` (atualizado)

**Mudanças:**
- Remove toolbar/painel direito; layout: `StudioPanel` esquerda + `StudioViewport` resto + `StudioStatusBar` (dimensions do hook)
- `handleExport` chama `exportStl(geometry, projectName)` (nova assinatura KeychainGeometry)
- Passa `baseColor={params.baseColor}` e `letterColor={params.letterColor}` ao viewport

**Testes:** painel presente (dropdown produto); sem toolbar antiga; sem painel direito antigo (`queryByRole('complementary', ...)` ainda existe — painel novo é o complementary agora); export habilita com geometria pronta.

**Commit** `feat: studio com painel único à esquerda`

---

### Task 9: Remoção de código morto

**Files:**
- Delete: `src/features/studio/components/StudioToolbar.tsx`
- Delete: `src/features/studio/components/StudioParameters.tsx`
- Delete: `tests/features/studio/components/StudioToolbar.test.tsx`
- Delete: `tests/features/studio/components/StudioParameters.test.tsx`

**Steps:**
1. `grep -rn "StudioToolbar\|StudioParameters" src/ tests/` → apenas os arquivos a deletar
2. `git rm` nos 4 arquivos
3. `npm run lint && npm run typecheck && npm run test && npm run build`
4. Commit: `refactor: remove toolbar e painel antigos do studio`

---

### Task 10: Docs + verificação final

**Files:**
- Modify: `docs/frontend/studio.md`

**Conteúdo:** atualizar visão geral (painel único com 4 blocos), tabela "como editar" (fonts.ts, novos params), decisões (regras 4mm/2mm, fontes lazy, 2 cores, tamanho de texto auto-fit), verificação manual (posições de argola, margem de texto, estilos de letra, cores sem rebuild).

**Verificação final:**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
git log --oneline -12
```

**Manual (registrar no relatório):**
```bash
npm run dev
# /studio:
# 1. Dropdown Produto no topo do painel esquerdo
# 2. Bloco Texto aberto; Base/Argola/Relevo fechados; abrir/fechar funciona
# 3. Trocar estilo de letra muda o desenho do nome
# 4. Swatches mudam cores de base/letras instantaneamente (sem rebuild)
# 5. Posição da argola: furo em cima/baixo/esquerda/direita, sempre 2mm da borda
# 6. Ajustes lateral/radial/encaixe movem o furo sem sair da peça
# 7. Nome longo nunca encosta na borda (4mm)
# 8. Exportar STL baixa arquivo; abrir em fatiador mostra base+letras unidas
```

**Commit** `docs: documenta painel único do studio`

---

## Verification final (executor)

```bash
npm run lint && npm run typecheck && npm run test && npm run build
git log --oneline -12
```

Expected: 10 commits semânticos; testes verdes (92 existentes adaptados + novos); painel único funcional; regras 4mm/2mm cobertas.
