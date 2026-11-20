# Texturas importadas dos STLs — Plano de implementação

> **Para quem executa:** REQUIRED SUB-SKILL: use `superpowers:executing-plans`
> para implementar este plano tarefa a tarefa.

**Objetivo:** transformar os 14 rolos STL de `files/` em 14 estilos de textura
importados, aplicados como relevo positivo na parede do porta-lata, com a
profundidade nativa de cada arquivo e a alça adaptada ao envelope.

**Arquitetura:** um script offline desenrola a superfície externa de cada STL em
um mapa de altura normalizado (192 × 96) e gera dois módulos (metadados e dados
em base64). O runtime mantém o motor de deslocamento do `buildBody`, amostra o
mapa em `(u, v)` e move o laço/engrossa a abraçadeira pelo envelope da textura.

**Stack:** Node 24 (type stripping), TypeScript strict, Three.js, Zod, Vitest.

**Design aprovado:** `docs/plans/2026-11-20-porta-lata-texturas-importadas-design.md`.

**Regras:** 1 unidade = 1 mm; sem `any`; sem código morto; commits semânticos;
`files/` fora do versionamento; asset gerado commitado.

---

## Task 1: Biblioteca de conversão STL → mapa de altura

**Arquivos:**
- Criar: `src/features/studio/tools/lembrancinhas/porta-lata/textureImport.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/textureImport.test.ts`

**Step 1: teste com um cilindro sintético**

```ts
import { describe, it, expect } from 'vitest'
import {
  readBinaryStl,
  unwrapCylinder,
} from '@/features/studio/tools/lembrancinhas/porta-lata/textureImport'

/** Cilindro de raio 10 + 1.5·sin(3θ), altura 20, com tampas. */
function syntheticCylinder(): ArrayBuffer {
  const segments = 48
  const height = 20
  const triangles: number[][] = []
  const point = (i: number, z: number): [number, number, number] => {
    const theta = (i / segments) * Math.PI * 2
    const radius = 10 + 1.5 * Math.sin(3 * theta) + 0.4 * Math.sin(z / 2)
    return [radius * Math.cos(theta), radius * Math.sin(theta), z]
  }
  for (let i = 0; i < segments; i++) {
    const a = point(i, 0)
    const b = point(i + 1, 0)
    const c = point(i + 1, height)
    const d = point(i, height)
    triangles.push([...a, ...b, ...c], [...a, ...c, ...d])
  }
  for (let i = 0; i < segments; i++) {
    const a = point(i, 0)
    const b = point(i + 1, 0)
    triangles.push([0, 0, 0, ...a, ...b])
    const c = point(i, height)
    const d = point(i + 1, height)
    triangles.push([0, 0, height, ...c, ...d])
  }
  const buffer = new ArrayBuffer(84 + triangles.length * 50)
  const view = new DataView(buffer)
  view.setUint32(80, triangles.length, true)
  let offset = 84
  for (const triangle of triangles) {
    for (let i = 0; i < 12; i++) {
      view.setFloat32(offset + i * 4, i < 3 ? 0 : triangle[i - 3], true)
    }
    offset += 50
  }
  return buffer
}

describe('textureImport', () => {
  it('lê STL binário e desenrola o cilindro', () => {
    const mesh = readBinaryStl(syntheticCylinder())
    expect(mesh.triangleCount).toBeGreaterThan(0)

    const map = unwrapCylinder(mesh, { columns: 48, rows: 24 })
    expect(map.width).toBe(48)
    expect(map.height).toBe(24)
    expect(map.data).toHaveLength(48 * 24)
    expect(map.nativeDepth).toBeGreaterThan(2.5)
    expect(map.nativeDepth).toBeLessThan(5)
    expect(map.maxSlopeDeg).toBeGreaterThan(0)
    expect(new Set(Array.from(map.data)).size).toBeGreaterThan(8)
    expect(Math.max(...map.data) - Math.min(...map.data)).toBeGreaterThan(100)
  })

  it('falha em buffer que não é STL binário', () => {
    expect(() => readBinaryStl(new ArrayBuffer(100))).toThrow()
  })
})
```

**Step 2: rodar e ver falhar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/textureImport.test.ts
```

**Step 3: implementar `textureImport.ts`**

```ts
export interface StlMesh {
  positions: Float32Array
  triangleCount: number
}

export function readBinaryStl(buffer: ArrayBuffer): StlMesh {
  if (buffer.byteLength < 84) throw new Error('STL binário inválido')
  const view = new DataView(buffer)
  const triangleCount = view.getUint32(80, true)
  if (84 + triangleCount * 50 !== buffer.byteLength) {
    throw new Error('STL binário inválido')
  }
  const positions = new Float32Array(triangleCount * 9)
  let offset = 84
  for (let i = 0; i < triangleCount; i++) {
    offset += 12
    for (let v = 0; v < 9; v++) {
      positions[i * 9 + v] = view.getFloat32(offset, true)
      offset += 4
    }
    offset += 2
  }
  return { positions, triangleCount }
}

export interface UnwrapOptions {
  columns?: number
  rows?: number
  wallBandMm?: number
  variationThresholdMm?: number
}

export interface UnwrappedTexture {
  width: number
  height: number
  data: Uint8Array
  nativeDepth: number
  maxSlopeDeg: number
}

const TAU = Math.PI * 2

export function unwrapCylinder(
  mesh: StlMesh,
  options: UnwrapOptions = {},
): UnwrappedTexture {
  const columns = options.columns ?? 192
  const rows = options.rows ?? 96
  const wallBandMm = options.wallBandMm ?? 99.2
  const threshold = options.variationThresholdMm ?? 0.3

  // 1. bounds/centro
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  const p = mesh.positions
  for (let i = 0; i < p.length; i += 3) {
    if (p[i] < minX) minX = p[i]
    if (p[i] > maxX) maxX = p[i]
    if (p[i + 1] < minY) minY = p[i + 1]
    if (p[i + 1] > maxY) maxY = p[i + 1]
    if (p[i + 2] < minZ) minZ = p[i + 2]
    if (p[i + 2] > maxZ) maxZ = p[i + 2]
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const height = maxZ - minZ
  if (!(height > 0)) throw new Error('STL sem altura')

  let maxR = 0
  for (let i = 0; i < p.length; i += 3) {
    maxR = Math.max(maxR, Math.hypot(p[i] - cx, p[i + 1] - cy))
  }

  // 2. rasteriza max r em (θ,z); devolve a grade e a faixa ativa
  const rasterize = (z0: number, z1: number, rowCount: number, colCount: number): Float32Array => {
    const grid = new Float32Array(rowCount * colCount).fill(-1)
    const zSpan = z1 - z0
    for (let t = 0; t < mesh.triangleCount; t++) {
      const base = t * 9
      const xs = [p[base], p[base + 3], p[base + 6]]
      const ys = [p[base + 1], p[base + 4], p[base + 7]]
      const zs = [p[base + 2], p[base + 5], p[base + 8]]
      if (Math.max(...zs) < z0 || Math.min(...zs) > z1) continue
      const r = xs.map((x, k) => Math.hypot(x - cx, ys[k] - cy))
      const theta0 = Math.atan2(ys[0] - cy, xs[0] - cx)
      const angles = xs.map((x, k) => {
        let a = Math.atan2(ys[k] - cy, x - cx)
        while (a - theta0 > Math.PI) a -= TAU
        while (a - theta0 < -Math.PI) a += TAU
        return a
      })
      const minA = Math.min(...angles)
      const maxA = Math.max(...angles)
      const c0 = Math.floor(((minA + Math.PI) / TAU) * colCount) - 1
      const c1 = Math.ceil(((maxA + Math.PI) / TAU) * colCount) + 1
      const r0 = Math.floor(((Math.min(...zs) - z0) / zSpan) * (rowCount - 1)) - 1
      const r1 = Math.ceil(((Math.max(...zs) - z0) / zSpan) * (rowCount - 1)) + 1
      const det =
        (angles[1] - angles[0]) * (zs[2] - zs[0]) -
        (angles[2] - angles[0]) * (zs[1] - zs[0])
      if (Math.abs(det) < 1e-12) continue
      for (let row = Math.max(0, r0); row <= Math.min(rowCount - 1, r1); row++) {
        const zc = z0 + (row / (rowCount - 1)) * zSpan
        for (let col = Math.max(0, c0); col <= Math.min(colCount - 1, c1); col++) {
          const ac = -Math.PI + ((col + 0.5) / colCount) * TAU
          const w1 =
            ((ac - angles[0]) * (zs[2] - zs[0]) - (angles[2] - angles[0]) * (zc - zs[0])) /
            det
          const w2 =
            ((angles[1] - angles[0]) * (zc - zs[0]) - (ac - angles[0]) * (zs[1] - zs[0])) /
            det
          const w0 = 1 - w1 - w2
          if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue
          const radius = w0 * r[0] + w1 * r[1] + w2 * r[2]
          const index = row * colCount + col
          if (radius > grid[index]) grid[index] = radius
        }
      }
    }
    return grid
  }

  const active = (grid: Float32Array, rowCount: number, colCount: number): boolean[] => {
    const result: boolean[] = []
    for (let row = 0; row < rowCount; row++) {
      const values = Array.from(grid.slice(row * colCount, (row + 1) * colCount))
        .filter((value) => value > maxR * 0.75)
        .sort((a, b) => a - b)
      if (values.length < colCount * 0.5) {
        result.push(false)
        continue
      }
      const low = values[Math.floor(values.length * 0.02)]
      const high = values[Math.floor(values.length * 0.98)]
      result.push(high - low > threshold)
    }
    return result
  }

  const coarseRows = Math.max(32, Math.round(height))
  const coarse = rasterize(minZ, maxZ, coarseRows, columns)
  const flags = active(coarse, coarseRows, columns)
  let bestStart = 0
  let bestLength = 0
  let start = -1
  for (let row = 0; row <= flags.length; row++) {
    if (row < flags.length && flags[row]) {
      if (start < 0) start = row
    } else if (start >= 0) {
      if (row - start > bestLength) {
        bestLength = row - start
        bestStart = start
      }
      start = -1
    }
  }
  if (bestLength === 0) {
    bestStart = 1
    bestLength = coarseRows - 2
  }
  const rowStep = height / (coarseRows - 1)
  const z0 = minZ + Math.max(0, bestStart - 1) * rowStep
  const z1 = minZ + Math.min(coarseRows - 1, bestStart + bestLength) * rowStep

  // 3. mapa final
  const grid = rasterize(z0, z1, rows, columns)
  const fill = (): void => {
    for (let iteration = 0; iteration < 8; iteration++) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const index = row * columns + col
          if (grid[index] >= 0) continue
          let sum = 0
          let count = 0
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const r = row + dr
              const c = (col + dc + columns) % columns
              if (r < 0 || r >= rows) continue
              const value = grid[r * columns + c]
              if (value >= 0) {
                sum += value
                count += 1
              }
            }
          }
          if (count > 0) grid[index] = sum / count
        }
      }
    }
  }
  fill()

  const values = Array.from(grid).filter((value) => value >= 0).sort((a, b) => a - b)
  if (values.length < columns * rows * 0.8) throw new Error('Superfície incompleta')
  const low = values[Math.floor(values.length * 0.01)]
  const high = values[Math.floor(values.length * 0.99)]
  const nativeDepth = high - low
  if (!(nativeDepth > 0.2)) throw new Error('Textura sem relevo')

  const data = new Uint8Array(columns * rows)
  for (let i = 0; i < grid.length; i++) {
    const normalized = Math.min(1, Math.max(0, (grid[i] - low) / nativeDepth))
    data[i] = Math.round(normalized * 255)
  }

  const spacing = wallBandMm / (rows - 1)
  let maxSlope = 0
  for (let row = 1; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const upper = data[row * columns + col] / 255
      const lower = data[(row - 1) * columns + col] / 255
      const slope = (nativeDepth * Math.abs(upper - lower)) / spacing
      if (slope > maxSlope) maxSlope = slope
    }
  }

  return {
    width: columns,
    height: rows,
    data,
    nativeDepth,
    maxSlopeDeg: (Math.atan(maxSlope) * 180) / Math.PI,
  }
}
```

**Step 4: rodar e confirmar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/textureImport.test.ts
```

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/textureImport.ts tests/features/studio/tools/lembrancinhas/porta-lata/textureImport.test.ts
git commit -m "feat: add stl to height map conversion"
```

---

## Task 2: Script de importação e assets gerados

**Arquivos:**
- Criar: `scripts/texture-import.mjs`
- Gerar: `src/features/studio/tools/lembrancinhas/porta-lata/importedTextures.ts`
- Gerar: `src/features/studio/tools/lembrancinhas/porta-lata/importedTextureData.ts`

**Step 1: script**

O script lê `files/*.stl`, chama `readBinaryStl`/`unwrapCylinder` (importando
`../src/features/studio/tools/lembrancinhas/porta-lata/textureImport.ts`; Node 24
faz type stripping) e escreve os dois módulos. Tabela de fontes:

```js
const SOURCES = [
  { file: '24tiles1inchgrid.stl', id: 'azulejos', label: 'Azulejos 1"' },
  { file: 'Mosaic_Tile.stl', id: 'mosaico', label: 'Mosaico' },
  { file: 'Small_Bricks.stl', id: 'tijolos_pequenos', label: 'Tijolos pequenos' },
  { file: 'Small_broken_plaster.stl', id: 'reboco_pequeno', label: 'Reboco quebrado pequeno' },
  { file: 'brick.stl', id: 'tijolos_rusticos', label: 'Tijolos rústicos' },
  { file: 'broken_plaster.stl', id: 'reboco_quebrado', label: 'Reboco quebrado' },
  { file: 'clean_bricks.stl', id: 'tijolos_limpos', label: 'Tijolos limpos' },
  { file: 'cobble.stl', id: 'paralelepipedos', label: 'Paralelepípedos' },
  { file: 'cobble_smooth_edges.stl', id: 'paralelepipedos_suaves', label: 'Paralelepípedos suaves' },
  { file: 'diamond_plate.stl', id: 'placa_diamantada', label: 'Placa diamantada' },
  { file: 'hex_stone.stl', id: 'pedra_hexagonal', label: 'Pedra hexagonal' },
  { file: 'road.stl', id: 'asfalto', label: 'Asfalto' },
  { file: 'scifi_hex.stl', id: 'hex_scifi', label: 'Hex sci-fi' },
  { file: 'smallscifihex.stl', id: 'hex_scifi_pequeno', label: 'Hex sci-fi pequeno' },
]
```

Saída de `importedTextures.ts`:

```ts
// Gerado por scripts/texture-import.mjs — não editar à mão.
export const IMPORTED_TEXTURE_IDS = [
  'azulejos', 'mosaico', 'tijolos_pequenos', 'reboco_pequeno',
  'tijolos_rusticos', 'reboco_quebrado', 'tijolos_limpos', 'paralelepipedos',
  'paralelepipedos_suaves', 'placa_diamantada', 'pedra_hexagonal', 'asfalto',
  'hex_scifi', 'hex_scifi_pequeno',
] as const

export type ImportedTextureId = (typeof IMPORTED_TEXTURE_IDS)[number]

export interface ImportedTextureMeta {
  label: string
  nativeDepth: number
  maxSlopeDeg: number
  width: number
  height: number
}

export const IMPORTED_TEXTURES: Record<ImportedTextureId, ImportedTextureMeta> = {
  // valores medidos pelo script
}
```

Saída de `importedTextureData.ts`:

```ts
// Gerado por scripts/texture-import.mjs — não editar à mão.
import type { ImportedTextureId } from './importedTextures'

export const IMPORTED_TEXTURE_DATA: Record<ImportedTextureId, string> = {
  // base64 do mapa 192 × 96, uma string por id
}
```

O script deve:
- cortar `.stl` do buffer para ArrayBuffer antes de chamar a lib;
- gravar com `writeFileSync`;
- com `--check`, comparar o conteúdo gerado ao existente e sair com código 1 se
  divergir;
- arredondar profundidade/inclinação para 2 casas na metadata.

**Step 2: gerar**

```bash
node scripts/texture-import.mjs
```

Esperado: dois arquivos gerados; `importedTextureData.ts` com ~350 KB e
`importedTextures.ts` com 14 entradas.

**Step 3: conferir**

```bash
node scripts/texture-import.mjs --check
```

Esperado: saída 0 e "assets atualizados".

**Step 4: commit**

```bash
git add scripts/texture-import.mjs src/features/studio/tools/lembrancinhas/porta-lata/importedTextures.ts src/features/studio/tools/lembrancinhas/porta-lata/importedTextureData.ts
git commit -m "feat: generate imported can holder texture assets"
```

---

## Task 3: Schema, tipos e envelopes

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/schema.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts`

**Step 1: testes**

```ts
import {
  IMPORTED_TEXTURE_IDS,
  IMPORTED_TEXTURES,
} from '@/features/studio/tools/lembrancinhas/porta-lata/importedTextures'
import {
  PROCEDURAL_TEXTURE_STYLES,
  TEXTURE_STYLES,
  getLoopOffset,
  getMaxOuterDiameter,
  getTextureEnvelope,
  isImportedTexture,
} from '@/features/studio/tools/lembrancinhas/porta-lata/schema'

  it('inclui os 14 estilos importados', () => {
    expect(IMPORTED_TEXTURE_IDS).toHaveLength(14)
    expect(TEXTURE_STYLES).toHaveLength(7 + 14)
    for (const id of IMPORTED_TEXTURE_IDS) {
      expect(isImportedTexture(id)).toBe(true)
      expect(IMPORTED_TEXTURES[id].nativeDepth).toBeGreaterThan(0.2)
      expect(IMPORTED_TEXTURES[id].nativeDepth).toBeLessThan(6)
      expect(IMPORTED_TEXTURES[id].label.length).toBeGreaterThan(0)
    }
    for (const style of PROCEDURAL_TEXTURE_STYLES) {
      expect(isImportedTexture(style)).toBe(false)
    }
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, textureStyle: 'paralelepipedos' }).success).toBe(true)
    expect(canHolderParamsSchema.safeParse({ ...defaultCanHolderParams, textureStyle: 'nao-existe' }).success).toBe(false)
  })

  it('usa a profundidade nativa e o offset do laço nos importados', () => {
    const imported = { ...defaultCanHolderParams, textureStyle: 'paralelepipedos' as const }
    const meta = IMPORTED_TEXTURES.paralelepipedos
    expect(getTextureEnvelope(imported)).toBeCloseTo(meta.nativeDepth, 6)
    expect(getMaxOuterDiameter(imported)).toBeCloseTo(72.6 + 2 * meta.nativeDepth, 5)
    expect(getLoopOffset(imported)).toBeGreaterThan(0)

    const procedural = { ...defaultCanHolderParams, textureStyle: 'wood' as const, textureDepth: 1.5 }
    expect(getLoopOffset(procedural)).toBe(0)
    expect(getTextureEnvelope(defaultCanHolderParams)).toBe(0)
  })
```

**Step 2: implementar**

Atualize também os testes que iteram `TEXTURE_STYLES` no campo procedural
(`texture.test.ts` e `buildBody.test.ts`) para `PROCEDURAL_TEXTURE_STYLES`,
senão os importados entram nos laços com `textureDepth: 1.5` e quebram as
expectativas de raio.

Em `schema.ts`:

```ts
import {
  IMPORTED_TEXTURE_IDS,
  IMPORTED_TEXTURES,
  type ImportedTextureId,
} from './importedTextures'

export const PROCEDURAL_TEXTURE_STYLES = [
  'none', 'wood', 'metal', 'scales', 'waves', 'stone', 'spikes',
] as const
export type ProceduralTextureStyle = (typeof PROCEDURAL_TEXTURE_STYLES)[number]

export const TEXTURE_STYLES = [
  ...PROCEDURAL_TEXTURE_STYLES,
  ...IMPORTED_TEXTURE_IDS,
] as const
export type TextureStyle = (typeof TEXTURE_STYLES)[number]

const IMPORTED_STYLE_SET = new Set<string>(IMPORTED_TEXTURE_IDS)

export function isImportedTexture(style: TextureStyle): style is ImportedTextureId {
  return IMPORTED_STYLE_SET.has(style)
}

export function isProceduralTexture(style: TextureStyle): style is ProceduralTextureStyle {
  return !isImportedTexture(style)
}

export const MIN_LOOP_GAP_MM = 0.7

export function getEffectiveTextureDepth(params: CanHolderGeometryParams): number {
  if (params.textureStyle === 'none') return 0
  if (isImportedTexture(params.textureStyle)) {
    return IMPORTED_TEXTURES[params.textureStyle].nativeDepth
  }
  return Math.min(params.textureDepth, params.textureScale / 4)
}

export function getTextureEnvelope(params: CanHolderGeometryParams): number {
  return getEffectiveTextureDepth(params)
}

/** Deslocamento do laço para manter 0,7 mm de folga do envelope. */
export function getLoopOffset(params: CanHolderGeometryParams): number {
  return Math.max(
    0,
    getTextureEnvelope(params) -
      (params.handleClearance + HANDLE_LOOP_INSET - MIN_LOOP_GAP_MM),
  )
}
```

`getMaxOuterDiameter` já usa `getTextureEnvelope`; não muda.

**Step 3: rodar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts
```

**Step 4: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/schema.ts tests/features/studio/tools/lembrancinhas/porta-lata/schema.test.ts
git commit -m "feat: add imported texture styles to the schema"
```

---

## Task 4: Amostragem do mapa no motor de textura

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/texture.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/texture.test.ts`

**Step 1: testes**

Adicione:

```ts
  it('amostra o mapa importado com período em u e faixa nativa', () => {
    const params = { ...defaultCanHolderParams, textureStyle: 'paralelepipedos' as const }
    const meta = IMPORTED_TEXTURES.paralelepipedos
    const a = textureDisplacement(params, 0.2, 40, WALL_MIN, WALL_MAX)
    const b = textureDisplacement(params, 0.2 + TAU, 40, WALL_MIN, WALL_MAX)
    const c = textureDisplacement(params, 0.2, 88, WALL_MIN, WALL_MAX)
    expect(a).toBeCloseTo(b, 6)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(meta.nativeDepth + 1e-9)
    expect(c).toBeGreaterThanOrEqual(0)
    expect(c).toBeLessThanOrEqual(meta.nativeDepth + 1e-9)
    expect(a).not.toBeCloseTo(c, 3)
  })

  it('mantém a faixa da abraçadeira lisa com textura importada', () => {
    const params = { ...defaultCanHolderParams, textureStyle: 'paralelepipedos' as const }
    expect(textureDisplacement(params, 1, 60, WALL_MIN, WALL_MAX)).toBe(0)
  })
```

Os testes procedurais existentes que iteram `TEXTURE_STYLES.filter(...)` devem
passar a usar `PROCEDURAL_TEXTURE_STYLES.filter(...)` (o campo importado depende
de `u/v` e não é coberto por `textureHeight`).

**Step 2: implementar**

Em `texture.ts`:

```ts
import {
  getEffectiveTextureDepth,
  isImportedTexture,
  type ImportedTextureId,
} from './schema'
import { IMPORTED_TEXTURES } from './importedTextures'
import { IMPORTED_TEXTURE_DATA } from './importedTextureData'

const decodedMaps = new Map<ImportedTextureId, Uint8Array>()

function decodeMap(id: ImportedTextureId): Uint8Array {
  const cached = decodedMaps.get(id)
  if (cached) return cached
  const binary = atob(IMPORTED_TEXTURE_DATA[id])
  const data = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i)
  decodedMaps.set(id, data)
  return data
}

/** Altura importada em mm; `u` em voltas e `v` em 0..1 sobre a parede. */
export function importedTextureHeight(
  style: ImportedTextureId,
  u: number,
  v: number,
): number {
  const meta = IMPORTED_TEXTURES[style]
  const data = decodeMap(style)
  const wrapped = ((u % 1) + 1) % 1
  const x = wrapped * meta.width
  const x0 = Math.floor(x) % meta.width
  const x1 = (x0 + 1) % meta.width
  const fx = x - Math.floor(x)
  const y = Math.min(1, Math.max(0, v)) * (meta.height - 1)
  const y0 = Math.floor(y)
  const y1 = Math.min(meta.height - 1, y0 + 1)
  const fy = y - y0
  const at = (row: number, col: number): number => data[row * meta.width + col] / 255
  const top = lerp(at(y0, x0), at(y0, x1), fx)
  const bottom = lerp(at(y1, x0), at(y1, x1), fx)
  return lerp(top, bottom, fy) * meta.nativeDepth
}
```

Em `textureDisplacement`:

```ts
export function textureDisplacement(
  params: CanHolderGeometryParams,
  theta: number,
  y: number,
  wallMin: number,
  wallMax: number,
): number {
  if (params.textureStyle === 'none') return 0
  if (isImportedTexture(params.textureStyle)) {
    const v = (y - wallMin) / (wallMax - wallMin)
    return (
      importedTextureHeight(params.textureStyle, theta / TAU, v) *
      textureMask(params, y, wallMin, wallMax)
    )
  }
  return textureHeight(params, theta, y) * textureMask(params, y, wallMin, wallMax)
}
```

Em `textureHeight`, antes do switch:

```ts
  if (isImportedTexture(params.textureStyle)) return 0
```

Em `textureMask`:

```ts
  const imported = isImportedTexture(params.textureStyle)
  const depth = getEffectiveTextureDepth(params)
  const cap = imported ? 4 : Number.POSITIVE_INFINITY
  const fade = Math.min(
    Math.max(TEXTURE_EDGE_FADE_MM, 3 * depth),
    cap,
    (wallMax - wallMin) / 4,
  )
  ...
  const bandFade = Math.min(Math.max(TEXTURE_HANDLE_FADE_MM, 3 * depth), cap)
```

**Step 3: rodar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/texture.test.ts
```

**Step 4: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/texture.ts tests/features/studio/tools/lembrancinhas/porta-lata/texture.test.ts
git commit -m "feat: sample imported can holder textures"
```

---

## Task 5: Laço e abraçadeira com offset

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/shapes.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildHandle.test.ts`

**Step 1: testes**

```ts
  it('afasta o laço e engrossa a abraçadeira pelo envelope importado', () => {
    const imported = { ...defaultCanHolderParams, textureStyle: 'paralelepipedos' as const }
    const meta = IMPORTED_TEXTURES.paralelepipedos
    const offset = getLoopOffset(imported)
    expect(offset).toBeCloseTo(
      meta.nativeDepth - (imported.handleClearance + 2 - 0.7),
      5,
    )
    expect(getLoopLeftX(imported)).toBeCloseTo(
      getOuterRadius(imported) + imported.handleClearance + 2 + offset,
      6,
    )
    const metrics = getHandleMetrics(imported)
    expect(metrics.handOpeningWidth).toBeLessThan(
      getHandleMetrics(defaultCanHolderParams).handOpeningWidth,
    )
    expect(metrics.handOpeningWidth).toBeGreaterThan(0)
    const bandOuterTop = getBandOuterRadius(imported, imported.handleHeight + imported.handleWidth / 2)
    expect(bandOuterTop - getLoopLeftX(imported)).toBeGreaterThan(0.5)
  })

  it('não muda a alça com textura procedural', () => {
    const procedural = { ...defaultCanHolderParams, textureStyle: 'wood' as const, textureDepth: 1.5 }
    expect(getLoopOffset(procedural)).toBe(0)
    expect(getLoopLeftX(procedural)).toBeCloseTo(getLoopLeftX(defaultCanHolderParams), 6)
  })
```

**Step 2: implementar**

Em `shapes.ts`:

```ts
import { getLoopOffset, ... } from './schema'

export function getLoopLeftX(params: CanHolderGeometryParams): number {
  return (
    getOuterRadius(params) +
    params.handleClearance +
    HANDLE_LOOP_INSET +
    getLoopOffset(params)
  )
}

export function getBandOuterRadius(
  params: CanHolderGeometryParams,
  y: number,
): number {
  const nominal = getOuterRadius(params) + params.handleClearance
  return (
    (nominal + HANDLE_RING_THICKNESS + getLoopOffset(params)) *
    (getBandInnerRadius(params, y) / nominal)
  )
}

export function getHandleMetrics(params: CanHolderGeometryParams): HandleMetrics {
  const bodyRadius = getOuterRadius(params)
  const innerRadius = bodyRadius + params.handleClearance
  const outerRadius = innerRadius + HANDLE_RING_THICKNESS + getLoopOffset(params)
  ...
}
```

Atualize o comentário do `handleLoopShape` para explicar que o offset preserva a
folga de 0,7 mm e a sobreposição com o anel.

**Step 3: rodar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildHandle.test.ts
```

**Step 4: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/shapes.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildHandle.test.ts
git commit -m "feat: offset can holder loop for deep textures"
```

---

## Task 6: Validação

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.test.ts`

**Step 1: testes**

```ts
  it('avisa quando a textura importada passa de 45°', () => {
    const steep = Object.values(IMPORTED_TEXTURES).find((meta) => meta.maxSlopeDeg > 45)
    expect(steep).toBeDefined()
    const id = IMPORTED_TEXTURE_IDS.find((key) => IMPORTED_TEXTURES[key] === steep)!
    const params = withParams({ textureStyle: id })
    expect(validateCanHolder(params)).toContainEqual(
      expect.objectContaining({ code: 'can-texture-slope', severity: 'warning' }),
    )
    expect(
      validateCanHolder(defaultCanHolderParams).some(
        (issue) => issue.code === 'can-texture-slope',
      ),
    ).toBe(false)
  })

  it('não aplica o limite de escala aos importados', () => {
    const imported = withParams({ textureStyle: 'paralelepipedos', textureDepth: 1.5, textureScale: 4 })
    expect(
      validateCanHolder(imported).some((issue) => issue.code === 'can-texture'),
    ).toBe(false)
  })

  it('avisa a abertura da mão com textura profunda e alcance curto', () => {
    const imported = withParams({
      textureStyle: 'paralelepipedos',
      handleReach: 30,
      handleBand: 10,
    })
    expect(
      validateCanHolder(imported).some((issue) => issue.code === 'can-handle-reach'),
    ).toBe(true)
  })
```

**Step 2: implementar**

- adicione `'can-texture-slope'` ao union;
- importe `IMPORTED_TEXTURES`, `isImportedTexture`, `isProceduralTexture`;
- `can-texture` passa a exigir `isProceduralTexture(params.textureStyle)` e
  `params.textureStyle !== 'none'`;
- adicione o bloco:

```ts
  if (isImportedTexture(params.textureStyle)) {
    const meta = IMPORTED_TEXTURES[params.textureStyle]
    if (meta.maxSlopeDeg > 45) {
      issues.push({
        code: 'can-texture-slope',
        severity: 'warning',
        message: `A textura ${meta.label} tem flancos acima de 45° e pode exigir suporte.`,
      })
    }
  }
```

`can-handle-reach` já usa `getHandleMetrics`, que passa a incluir o offset.

**Step 3: rodar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.test.ts
```

**Step 4: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.ts tests/features/studio/tools/lembrancinhas/porta-lata/validateCanHolder.test.ts
git commit -m "feat: warn about steep imported textures"
```

---

## Task 7: Painel com grupos e estados importados

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.tsx`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx`

**Step 1: testes**

```ts
  it('mostra os estilos importados em um grupo separado', () => {
    render(<StudioPanel {...defaultProps} />)
    expect(screen.getAllByRole('option')).toHaveLength(21)
    expect(screen.getByRole('group', { name: 'Importadas' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Paralelepípedos' })).toBeDefined()
  })

  it('desabilita profundidade e escala no estilo importado', () => {
    const onUpdateParam = vi.fn()
    render(
      <StudioPanel
        {...defaultProps}
        params={{ ...defaultCanHolderParams, textureStyle: 'paralelepipedos' }}
        onUpdateParam={onUpdateParam}
      />,
    )
    for (const name of TEXTURE_SLIDERS) {
      expect.soft(screen.getByRole('slider', { name }), name).toHaveAttribute('data-disabled')
    }
    expect(screen.getByText(/Textura importada: profundidade/)).toBeDefined()
    expect(screen.queryByText(TEXTURE_DISABLED_HINT)).toBeNull()
  })
```

**Step 2: implementar**

- importe `IMPORTED_TEXTURE_IDS`, `IMPORTED_TEXTURES`,
  `PROCEDURAL_TEXTURE_STYLES`, `isImportedTexture`;
- `PROCEDURAL_TEXTURE_LABELS` para os 7 + `textureLabel(style)` que devolve o
  label importado quando aplicável;
- select com dois `<optgroup>`:
  - `Procedurais`: `PROCEDURAL_TEXTURE_STYLES`;
  - `Importadas`: `IMPORTED_TEXTURE_IDS`.
- `const importedMeta = isImportedTexture(params.textureStyle) ? IMPORTED_TEXTURES[params.textureStyle] : null`;
- sliders desabilitados com `params.textureStyle === 'none' || importedMeta !== null`;
- textos:
  - procedural: comportamento atual;
  - importado: `Textura importada: profundidade {formatMm(importedMeta.nativeDepth)} mm do arquivo.` e, se `maxSlopeDeg > 45`, `Flancos acima de 45°: pode precisar de suporte.`;
  - nenhum: dica atual.
- A linha de profundidade efetiva só aparece para procedurais.

**Step 3: rodar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx
```

**Step 4: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.tsx tests/features/studio/tools/lembrancinhas/porta-lata/StudioPanel.test.tsx
git commit -m "feat: add imported texture group to the panel"
```

---

## Task 8: Hook, build completo e performance

**Arquivos:**
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts`
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts`

**Step 1: testes**

Em `useCanHolder.test.ts`:

```ts
  it('usa a profundidade nativa no diâmetro externo importado', () => {
    const { factory } = makeWorkerFixture()
    const { result } = renderHook(() => useCanHolder({ workerFactory: factory }))
    act(() => { result.current.updateParam('textureStyle', 'paralelepipedos') })
    const depth = IMPORTED_TEXTURES.paralelepipedos.nativeDepth
    expect(result.current.outerDiameter).toBeCloseTo(72.6 + 2 * depth, 5)
  })
```

Em `buildBody.test.ts`, separe o `it.each` procedural e adicione:

```ts
  it.each(IMPORTED_TEXTURE_IDS)('fecha o corpo importado (%s)', (style) => {
    const params = { ...defaultCanHolderParams, textureStyle: style }
    const geometry = buildBody(params)
    const position = geometry.getAttribute('position')
    const outerR = getOuterRadius(params)
    let maxRadius = 0
    for (let i = 0; i < position.count; i++) {
      maxRadius = Math.max(maxRadius, Math.hypot(position.getX(i), position.getZ(i)))
    }
    expect(isClosed(geometry)).toBe(true)
    expect(countShells(geometry)).toBe(1)
    expect(signedVolume(geometry)).toBeGreaterThan(0)
    expect(maxRadius).toBeGreaterThan(outerR + IMPORTED_TEXTURES[style].nativeDepth * 0.95)
    expect(maxRadius).toBeLessThanOrEqual(outerR + IMPORTED_TEXTURES[style].nativeDepth + 1e-3)
    geometry.dispose()
  })
```

Em `buildCanHolder.test.ts`, adicione ao `it.each` de manifold:

```ts
    { name: 'textura importada paralelepípedos', params: { textureStyle: 'paralelepipedos' } },
```

e um teste com texto:

```ts
  it('une o texto a um corpo com textura importada', () => {
    const params = { ...defaultCanHolderParams, textureStyle: 'pedra_hexagonal' as const }
    const result = buildCanHolder(params, realFont())
    expect(isClosed(result.body)).toBe(true)
    expect(countShells(result.body)).toBe(1)
    expect(signedVolume(result.body)).toBeGreaterThan(0)
    expect(result.handle).not.toBeNull()
    expect(isClosed(result.handle!)).toBe(true)
    disposeCanHolderResult(result)
  })
```

**Step 2: rodar e medir**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts
```

Anote o tempo do build importado. O gate de 4 s de CPU do build default deve
continuar; se o importado passar de ~3 s, registre e reduza a resolução do mapa
(192×96 → 160×80) no script e regenere.

**Step 3: commit**

```bash
git add tests/features/studio/tools/lembrancinhas/porta-lata/useCanHolder.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolder.test.ts
git commit -m "test: cover imported can holder textures"
```

---

## Task 9: Documentação

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/AGENTS.md`
- Modificar: `src/features/studio/tools/lembrancinhas/AGENTS.md`
- Modificar: `docs/frontend/studio.md`
- Modificar: `docs/plans/2026-11-20-porta-lata-texturas-importadas-design.md`

**Step 1: `porta-lata/AGENTS.md`**

- Status v4 com 14 texturas importadas; 20 estilos + none.
- Origem/licença; `files/` fora do repo; asset gerado.
- Pipeline `scripts/texture-import.mjs` → `importedTextures.ts` +
  `importedTextureData.ts`.
- Mapeamento u/v (preenche a parede, distorção), profundidade nativa,
  `getTextureEnvelope`, `getMaxOuterDiameter`.
- Offset do laço (`getLoopOffset`, 0,7 mm), engrossamento da abraçadeira,
  abertura da mão e `can-handle-reach`.
- `can-texture-slope`; `can-texture` só procedural.
- UI com grupos, sliders bloqueados, notas.
- Como regenerar (`node scripts/texture-import.mjs [--check]`).

**Step 2: `lembrancinhas/AGENTS.md`**

Na regra do porta-lata, citar os 14 estilos importados, profundidade nativa,
aviso de 45° e laço deslocado.

**Step 3: `docs/frontend/studio.md`**

Atualizar a seção Porta-lata: 20 estilos, módulos gerados, amostragem, offset,
validação, UI e performance. Citar o limite do asset (~350 KB) e que os STLs não
vão para o bundle.

**Step 4: design**

Marcar `design aprovado; implementado` e registrar desvios (profundidades
medidas, labels finais, resolução, tempos, qualquer caso de textura excluído).

**Step 5: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/AGENTS.md src/features/studio/tools/lembrancinhas/AGENTS.md docs/frontend/studio.md docs/plans/2026-11-20-porta-lata-texturas-importadas-design.md
git commit -m "docs: document imported can holder textures"
```

---

## Task 10: Verificação final

**Step 1: suíte da ferramenta**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata tests/features/studio/tools/lembrancinhas/porta-lata/textureImport.test.ts
```

**Step 2: suíte completa**

```bash
npm test
```

**Step 3: typecheck, lint e build**

```bash
npm run typecheck
npm run lint
npm run build
```

**Step 4: revisão manual**

- Os 14 estilos aparecem em "Importadas" e geram corpos distintos.
- `paralelepípedos` e `pedra_hexagonal` com texto: anéis lisos, faixa da alça
  lisa, texto acima do pico.
- Conferir o laço afastado e a abraçadeira engrossada; a alça encaixa.
- Ver o aviso de 45° nos estilos profundos.
- Exportar dois STLs e conferir manifold.
- Conferir o diâmetro externo no status bar.
- Rodar `node scripts/texture-import.mjs --check`.

**Step 5: commit final (se houver ajuste)**

```bash
git add -A
git commit -m "fix: polish imported can holder textures"
```
