# Chaveiro em Web Worker — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mover o build do chaveiro para um Web Worker e exibir “Gerando…” durante a geração, sem travar a UI.

**Architecture:** `useKeychain` parseia SVGs na main thread, envia `{ params, parsedSvgs, styles }` para um Worker; o Worker carrega fontes, chama `buildKeychain` e devolve geometria serializada. O hook expõe `isBuilding`/`error`; o StudioPage mostra o overlay como no Cortador + Carimbo.

**Tech Stack:** React 19, TypeScript strict, Three.js, Zod, Vite Worker, Vitest.

**Design Doc:** `docs/plans/2026-11-02-chaveiro-worker-design.md`

**Comandos:** `npm run typecheck`, `npm run lint`, `npx vitest run <arquivo>`, `npm test`.

---

## Task 0: Baseline

**Step 1:** `npm run typecheck && npm run lint && npm test`.
**Expected:** 70 arquivos / 778 testes passando.

---

## Task 1: Extrair serialização genérica para shared

**Files:**
- Create: `src/features/studio/tools/confeitaria/shared/workerGeometry.ts`
- Modify: `src/features/studio/tools/confeitaria/cortador-carimbo/workerGeometry.ts`
- Test: `tests/features/studio/tools/confeitaria/cortador-carimbo/workerGeometry.test.ts`

### Step 1: Implement
Mova de `cortador-carimbo/workerGeometry.ts` para `shared/workerGeometry.ts`:
```ts
import { BufferAttribute, BufferGeometry } from 'three'

export interface SerializedGeometry {
  position: Float32Array
  normal: Float32Array
  uv: Float32Array
  index: Uint32Array | null
}

function floatArray(geometry: BufferGeometry, name: 'position' | 'normal' | 'uv'): Float32Array {
  const attribute = geometry.getAttribute(name)
  return attribute ? (attribute.array as Float32Array).slice() : new Float32Array(0)
}

export function serializeGeometry(geometry: BufferGeometry): { data: SerializedGeometry; transfer: ArrayBuffer[] } {
  const position = floatArray(geometry, 'position')
  const normal = floatArray(geometry, 'normal')
  const uv = floatArray(geometry, 'uv')
  const indexAttribute = geometry.getIndex()
  const index = indexAttribute ? new Uint32Array(indexAttribute.array).slice() : null
  const transfer: ArrayBuffer[] = [
    position.buffer as ArrayBuffer,
    normal.buffer as ArrayBuffer,
    uv.buffer as ArrayBuffer,
  ]
  if (index) transfer.push(index.buffer as ArrayBuffer)
  return { data: { position, normal, uv, index }, transfer }
}

export function deserializeGeometry(data: SerializedGeometry): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.position, 3))
  if (data.normal.length > 0) geometry.setAttribute('normal', new BufferAttribute(data.normal, 3))
  if (data.uv.length > 0) geometry.setAttribute('uv', new BufferAttribute(data.uv, 2))
  if (data.index) geometry.setIndex(new BufferAttribute(data.index, 1))
  return geometry
}
```

Em `cortador-carimbo/workerGeometry.ts`, remova as definições duplicadas e importe/reexporte:
```ts
export { serializeGeometry, deserializeGeometry, type SerializedGeometry } from '../shared/workerGeometry'
import { serializeGeometry, deserializeGeometry, type SerializedGeometry } from '../shared/workerGeometry'
```
Mantenha `SerializedBuildResult` e as funções específicas do cortador.

### Step 2: Verify
`npx vitest run tests/features/studio/tools/confeitaria/cortador-carimbo/workerGeometry.test.ts` → PASS.
`npx eslint src/features/studio/tools/confeitaria/shared/workerGeometry.ts src/features/studio/tools/confeitaria/cortador-carimbo/workerGeometry.ts` → clean.

### Step 3: Commit
```bash
git add src/features/studio/tools/confeitaria/shared/workerGeometry.ts src/features/studio/tools/confeitaria/cortador-carimbo/workerGeometry.ts
git commit -m "refactor(shared): extrai serialização de geometria para worker"
```

---

## Task 2: Worker geometry do chaveiro

**Files:**
- Create: `src/features/studio/tools/chaveiros/chaveiro/workerGeometry.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/workerGeometry.test.ts`

### Step 1: Test
```ts
import * as THREE from 'three'
import { serializeKeychainResult, deserializeKeychainResult } from '@/features/studio/tools/chaveiros/chaveiro/workerGeometry'
import type { BuildKeychainResult } from '@/features/studio/tools/chaveiros/chaveiro/buildKeychain'

function result(): BuildKeychainResult {
  return {
    base: new THREE.BoxGeometry(10, 8, 3),
    content: new THREE.BoxGeometry(5, 2, 1),
    contentItems: [{ id: 'c1', halfWidth: 2.5, halfHeight: 1, geometry: null }],
    pieceBB: { minX: -5, maxX: 5, minY: -4, maxY: 4 },
    hole: { x: 0, y: 3, radius: 1.5 },
  }
}

it('serializa e desserializa base, conteúdo e metadados', () => {
  const { data } = serializeKeychainResult(result())
  const restored = deserializeKeychainResult(data)
  expect(restored.base.getAttribute('position').count).toBe(24)
  expect(restored.content).not.toBeNull()
  expect(restored.contentItems).toEqual([{ id: 'c1', halfWidth: 2.5, halfHeight: 1, geometry: null }])
  expect(restored.pieceBB).toEqual({ minX: -5, maxX: 5, minY: -4, maxY: 4 })
  expect(restored.hole).toEqual({ x: 0, y: 3, radius: 1.5 })
})

it('aceita conteúdo nulo', () => {
  const { data } = serializeKeychainResult({ ...result(), content: null })
  expect(deserializeKeychainResult(data).content).toBeNull()
})
```

### Step 2: Implement
```ts
import type { BuildContentItem, BuildKeychainResult } from './buildKeychain'
import type { BoundingBox2D, Circle2D } from './positioning'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from '../confeitaria/shared/workerGeometry'

export interface SerializedKeychainResult {
  base: SerializedGeometry
  content: SerializedGeometry | null
  contentItems: Array<Pick<BuildContentItem, 'id' | 'halfWidth' | 'halfHeight'>>
  pieceBB: BoundingBox2D
  hole: Circle2D
}

export function serializeKeychainResult(result: BuildKeychainResult): {
  data: SerializedKeychainResult
  transfer: ArrayBuffer[]
} {
  const base = serializeGeometry(result.base)
  const content = result.content ? serializeGeometry(result.content) : null
  return {
    data: {
      base: base.data,
      content: content?.data ?? null,
      contentItems: result.contentItems.map(({ id, halfWidth, halfHeight }) => ({ id, halfWidth, halfHeight })),
      pieceBB: result.pieceBB,
      hole: result.hole,
    },
    transfer: [...base.transfer, ...(content?.transfer ?? [])],
  }
}

export function deserializeKeychainResult(data: SerializedKeychainResult): BuildKeychainResult {
  return {
    base: deserializeGeometry(data.base),
    content: data.content ? deserializeGeometry(data.content) : null,
    contentItems: data.contentItems.map((item) => ({ ...item, geometry: null })),
    pieceBB: data.pieceBB,
    hole: data.hole,
  }
}
```

### Step 3: Verify + commit
`npx vitest run tests/features/studio/tools/chaveiros/chaveiro/workerGeometry.test.ts` → PASS.
```bash
git add src/features/studio/tools/chaveiros/chaveiro/workerGeometry.ts tests/features/studio/tools/chaveiros/chaveiro/workerGeometry.test.ts
git commit -m "feat(chaveiro): serializa resultado do build para worker"
```

---

## Task 3: Variantes `fromParsed` no svgToIconShape

**Files:**
- Modify: `src/features/studio/tools/confeitaria/shared/svgToIconShape.ts`
- Test: `tests/features/studio/tools/confeitaria/shared/svgToIconShape.test.ts`

### Step 1: Test
```ts
it('gera geometria a partir de ParsedSvg', () => {
  const parsed = parseSvg(SVG_RECT)!
  const geo = buildSvgIconGeometryFromParsed(parsed, {
    maxRadius: 10, lineWidth: 0.3, iconScale: 1, depth: 1,
  })
  geo!.computeBoundingBox()
  expect(geo!.boundingBox!.max.x - geo!.boundingBox!.min.x).toBeLessThanOrEqual(20.1)
})

it('encaixa em caixa a partir de ParsedSvg', () => {
  const parsed = parseSvg(SVG_RECT)!
  const geo = buildSvgIconGeometryInBoxFromParsed(parsed, {
    maxWidth: 20, maxHeight: 20, lineWidth: 0.3, iconScale: 1, depth: 1,
  })
  geo!.computeBoundingBox()
  expect(geo!.boundingBox!.max.y - geo!.boundingBox!.min.y).toBeLessThanOrEqual(20.1)
})
```

### Step 2: Implement
- Extraia o miolo de `buildSvgIconGeometry` para:
```ts
export function buildSvgIconGeometryFromParsed(
  parsed: ParsedSvg,
  { maxRadius, lineWidth, iconScale, depth }: Omit<SvgIconInput, 'svg'>,
): BufferGeometry | null
```
- Extraia o miolo de `buildSvgIconGeometryInBox` para:
```ts
export function buildSvgIconGeometryInBoxFromParsed(
  parsed: ParsedSvg,
  { maxWidth, maxHeight, lineWidth, iconScale, depth }: Omit<SvgIconBoxInput, 'svg'>,
): BufferGeometry | null
```
- As versões string fazem `parseSvg` e delegam.

### Step 3: Verify + commit
`npx vitest run tests/features/studio/tools/confeitaria/shared/svgToIconShape.test.ts` → PASS.
```bash
git add src/features/studio/tools/confeitaria/shared/svgToIconShape.ts tests/features/studio/tools/confeitaria/shared/svgToIconShape.test.ts
git commit -m "feat(shared): aceita ParsedSvg na geometria de ícone"
```

---

## Task 4: `buildKeychain`/`autoFit` aceitam `parsedSvgs`

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/autoFit.ts`
- Modify: `src/features/studio/tools/chaveiros/chaveiro/buildKeychain.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/buildKeychain.test.ts`

### Step 1: Test
```ts
it('usa ParsedSvg fornecido sem DOMParser', () => {
  const parsed = parseSvg(SVG_RECT)!
  const result = buildKeychain(makeInput({
    params: { ...defaultKeychainParams, contents: [iconItem] },
    parsedSvgs: { i1: parsed },
  }))
  expect(result.content).not.toBeNull()
})
```

### Step 2: Implement
- `BuildKeychainInput` ganha `parsedSvgs?: Record<string, ParsedSvg | null>`.
- `resolveContentGeometry(item, ctx, parsedSvg?)`:
  - ícone com `parsedSvg` → `buildSvgIconGeometryFromParsed` / `buildSvgIconGeometryInBoxFromParsed`.
  - `parsedSvg === undefined` → funções string atuais.
- `buildContentShapes(item, font, referenceSize, parsedSvg?)`:
  - ícone com `parsedSvg` → `svgShapesFromParsed(parsedSvg, ...)`.
  - `undefined` → `parseSvg(item.svgIcon)` atual.
- `buildRegularKeychain`/`buildNameKeychain` passam `parsedSvgs?.[item.id]`.

### Step 3: Verify + commit
`npx vitest run tests/features/studio/tools/chaveiros/chaveiro/buildKeychain.test.ts tests/features/studio/tools/chaveiros/chaveiro/autoFit.test.ts` → PASS.
```bash
git add src/features/studio/tools/chaveiros/chaveiro/autoFit.ts src/features/studio/tools/chaveiros/chaveiro/buildKeychain.ts tests/features/studio/tools/chaveiros/chaveiro/buildKeychain.test.ts
git commit -m "feat(chaveiro): build aceita SVGs pré-parseados"
```

---

## Task 5: Worker e client

**Files:**
- Create: `src/features/studio/tools/chaveiros/chaveiro/buildKeychain.worker.ts`
- Create: `src/features/studio/tools/chaveiros/chaveiro/workerClient.ts`

### Step 1: Worker
```ts
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { buildKeychain } from './buildKeychain'
import { fontUrls } from './fonts'
import { serializeKeychainResult } from './workerGeometry'
import type { FontStyle, KeychainParams } from './schema'
import type { ParsedSvg } from '../confeitaria/shared/svgToIconShape'

interface BuildRequest {
  params: KeychainParams
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
    styles.forEach((style, index) => { fonts[style] = loaded[index] })
    const { data, transfer } = serializeKeychainResult(
      buildKeychain({ params, fonts, parsedSvgs }),
    )
    scope.postMessage({ data }, transfer)
  } catch (error) {
    scope.postMessage({
      error: error instanceof Error ? error.message : 'Falha ao gerar a peça',
    })
  }
}
```

### Step 2: Client
```ts
import type { FontStyle, KeychainParams } from './schema'
import type { ParsedSvg } from '../confeitaria/shared/svgToIconShape'
import type { SerializedKeychainResult } from './workerGeometry'

export interface KeychainWorkerRequest {
  params: KeychainParams
  parsedSvgs: Record<string, ParsedSvg | null>
  styles: FontStyle[]
}

export interface KeychainWorker {
  build(
    request: KeychainWorkerRequest,
    onResult: (data: SerializedKeychainResult) => void,
    onError?: (message: string) => void,
  ): void
  terminate(): void
}

export function createKeychainWorker(): KeychainWorker {
  const worker = new Worker(new URL('./buildKeychain.worker.ts', import.meta.url), { type: 'module' })
  return {
    build(request, onResult, onError) {
      worker.onmessage = (event: MessageEvent<{ data?: SerializedKeychainResult; error?: string }>) => {
        if (event.data.error) onError?.(event.data.error)
        else if (event.data.data) onResult(event.data.data)
      }
      worker.onerror = () => onError?.('Falha ao gerar a peça')
      worker.postMessage(request)
    },
    terminate() {
      worker.terminate()
    },
  }
}
```

### Step 3: Verify + commit
`npm run typecheck` → clean.
```bash
git add src/features/studio/tools/chaveiros/chaveiro/buildKeychain.worker.ts src/features/studio/tools/chaveiros/chaveiro/workerClient.ts
git commit -m "feat(chaveiro): adiciona worker de geração"
```

---

## Task 6: `useKeychain` no Worker

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/useKeychain.ts`
- Test: `tests/features/studio/tools/chaveiros/chaveiro/useKeychain.test.tsx`

### Step 1: Tests
Migre o teste para um Worker falso controlável:
```ts
function makeWorkerFixture() {
  let pending: ((data: SerializedKeychainResult) => void) | null = null
  let fail: ((message: string) => void) | null = null
  const terminate = vi.fn()
  let lastRequest: KeychainWorkerRequest | null = null
  const factory = (): KeychainWorker => ({
    build: (request, onResult, onError) => {
      lastRequest = request
      pending = onResult
      fail = onError ?? null
    },
    terminate,
  })
  return {
    factory, terminate,
    respond: () => pending?.(serializedResult()),
    fail: (message = 'Falha ao gerar a peça') => fail?.(message),
    getRequest: () => lastRequest,
  }
}
```
Casos:
1. inicia com 1 conteúdo, sem geometria, `isBuilding=false`, `error=null`.
2. após 250ms, `isBuilding=true` e o Worker foi criado.
3. `respond()` → geometria definida, `isBuilding=false`.
4. `fail()` → `error` definido, `isBuilding=false`.
5. SVG de ícone é parseado na main e enviado em `lastRequest.parsedSvgs`.
6. SVG inválido → `error='Não foi possível ler o SVG'`, Worker não é criado.
7. rebuild mantém a geometria anterior visível até a resposta.
8. `terminate` no rebuild e no unmount.
9. dimensões após resposta.
10. CRUD de conteúdo (manter os testes atuais de add/remove/setContentType/updateContent).

Remova os mocks de `FontLoader` e `TextGeometry` (não são mais usados na main thread).

### Step 2: Implement
- Remova `FontLoader`, `fontCache`, `fontError`, `fonts`, `ready`.
- Adicione `workerFactory?: () => KeychainWorker` às opções.
- `isBuilding`, `error`, `workerRef`, `parseCacheRef`.
- `styleKey` dos estilos de texto não vazios.
- Efeito de build:
  - 200ms.
  - `workerRef.current?.terminate()`.
  - Parseia SVGs (cache). Se falhar: `setIsBuilding(false)`, `setError('Não foi possível ler o SVG')`, return.
  - `setError(null)`, cria Worker, `setIsBuilding(true)`.
  - `worker.build({ params, parsedSvgs, styles }, onResult, onError)`.
- `onResult`: desserializa, troca geometria, descarta a anterior, `setIsBuilding(false)`.
- `onError`: `setIsBuilding(false)`, `setError(message)`.
- Unmount: `terminate` + dispose.
- Retorne `isBuilding` e `error`.

### Step 3: Verify + commit
`npx vitest run tests/features/studio/tools/chaveiros/chaveiro/useKeychain.test.tsx` → PASS.
```bash
git add src/features/studio/tools/chaveiros/chaveiro/useKeychain.ts tests/features/studio/tools/chaveiros/chaveiro/useKeychain.test.tsx
git commit -m "refactor(chaveiro): gera geometria em worker"
```

---

## Task 7: Overlay “Gerando…” no StudioPage

**Files:**
- Modify: `src/features/studio/StudioPage.tsx` (`ChaveiroToolWrapper`)
- Test: `tests/features/studio/StudioPage.test.tsx`

### Step 1: Test
```ts
it('mostra Gerando… ao gerar o chaveiro', async () => {
  renderStudioPage()
  fireEvent.click(screen.getByRole('button', { name: /chaveiro/i }))
  expect(await screen.findByText('Gerando…', {}, { timeout: 3000 })).toBeInTheDocument()
})
```

### Step 2: Implement
- Destructure `isBuilding` e `error` do hook; remova `fontError`.
- Container principal: `className="relative flex min-h-0 flex-1"` e `aria-busy={isBuilding}`.
- Renderize:
```tsx
{error ? (
  <div role="alert" className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-red-200 bg-white/95 px-3 py-1 text-xs text-red-600 shadow-sm">
    {error}
  </div>
) : isBuilding ? (
  <div role="status" aria-live="polite" className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-neutral-200 bg-white/90 px-3 py-1 text-xs text-neutral-600 shadow-sm">
    Gerando…
  </div>
) : null}
```
- Remova o banner antigo de `fontError`.

### Step 3: Verify + commit
`npx vitest run tests/features/studio/StudioPage.test.tsx` → PASS.
```bash
git add src/features/studio/StudioPage.tsx tests/features/studio/StudioPage.test.tsx
git commit -m "feat(chaveiro): mostra Gerando durante a geração"
```

---

## Task 8: Docs e verificação final

**Files:**
- Modify: `src/features/studio/tools/chaveiros/chaveiro/AGENTS.md`
- Modify: `docs/frontend/studio.md`

### Step 1: Docs
- `AGENTS.md`: adicionar `buildKeychain.worker.ts`, `workerClient.ts`, `workerGeometry.ts`; descrever:
  - SVG parseado na main, `ParsedSvg` enviado ao Worker.
  - Fontes carregadas no Worker.
  - Resultado serializado; `isBuilding`/“Gerando…”.
- `docs/frontend/studio.md`: pipeline com Worker e decisão de build assíncrono + overlay.
- Atualizar contagens de testes com o resultado real.

### Step 2: Verificação
```bash
npm run typecheck
npm run lint
npm test
grep -rnE "new FontLoader|fontCache|fontError" src/features/studio/tools/chaveiros/chaveiro
```
Expected: `FontLoader` apenas no worker; sem `fontCache`/`fontError` no hook.

### Step 3: Commit
```bash
git add src/features/studio/tools/chaveiros/chaveiro/AGENTS.md docs/frontend/studio.md
git commit -m "docs(chaveiro): documenta build em worker e Gerando"
```
