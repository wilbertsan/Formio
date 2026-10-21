# Relevo vetorial do Rolo de Textura — Implementation Plan

> **For the executor:** use `superpowers:executing-plans` or `superpowers:subagent-driven-development`.
> **Workspace:** work on the current `main`; commit only the files of each task (the tree has unrelated pending changes).
> **Verification:** `npm test` is configured with a 20s timeout and excludes `.worktrees`.

**Goal:** Replace the rasterized height field with vector relief extruded and bent onto the cylinder, replicating the carimbo smoothness.

**Architecture:** Closed cylindrical body + relief built from `Shape`/`ExtrudeGeometry` on an unrolled flat map, unioned with Clipper, clipped to the body strip, bent onto the cylinder, merged with the body into two closed shells (material groups 0/1). No raster/height field.

**Tech Stack:** Three.js r185 (`ExtrudeGeometry`, `mergeGeometries`, `toCreasedNormals`), js-clipper, React 19, Vitest.

---

## Task 0 — Docs

Create `docs/plans/2026-10-21-rolo-textura-relevo-vetorial-design.md` and this file. Commit:

```bash
git add docs/plans/2026-10-21-rolo-textura-relevo-vetorial-design.md docs/plans/2026-10-21-rolo-textura-relevo-vetorial-implementation.md
git commit -m "docs(rolo-textura): registra design e plano do relevo vetorial"
```

---

## Task 1 — `clipPathsToRect`

**Files:** Modify `src/features/studio/tools/confeitaria/shared/textOutline.ts`; test `tests/features/studio/tools/confeitaria/shared/textOutline.test.ts`.

**Step 1 — failing test**

```ts
import { clipPathsToRect, pathsToShapes, toClipperPaths } from '@/features/studio/tools/confeitaria/shared/textOutline'
import { Shape, Vector2 } from 'three'

it('recorta paths no retângulo preservando a área', () => {
  const square = new Shape([
    new Vector2(0, 0), new Vector2(10, 0), new Vector2(10, 10), new Vector2(0, 10),
  ])
  const clipped = clipPathsToRect(toClipperPaths([square]), 2, 2, 8, 8)
  const shapes = pathsToShapes(clipped)
  expect(shapes).toHaveLength(1)
  const points = shapes[0].getPoints()
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  expect(Math.min(...xs)).toBeCloseTo(2, 2)
  expect(Math.max(...xs)).toBeCloseTo(8, 2)
  expect(Math.min(...ys)).toBeCloseTo(2, 2)
  expect(Math.max(...ys)).toBeCloseTo(8, 2)
})
```

**Step 2:** `npx vitest run tests/features/studio/tools/confeitaria/shared/textOutline.test.ts --exclude '**/.worktrees/**'` → FAIL.

**Step 3 — implementation**

```ts
/** Recorta paths (já em unidades Clipper, ×1000) em um retângulo em mm. */
export function clipPathsToRect(
  paths: ClipperPoint[][],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): ClipperPoint[][] {
  if (paths.length === 0) return []
  const rect: ClipperPoint[] = [
    { X: Math.round(minX * 1000), Y: Math.round(minY * 1000) },
    { X: Math.round(maxX * 1000), Y: Math.round(minY * 1000) },
    { X: Math.round(maxX * 1000), Y: Math.round(maxY * 1000) },
    { X: Math.round(minX * 1000), Y: Math.round(maxY * 1000) },
  ]
  const clipper = new ClipperLib.Clipper()
  clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true)
  clipper.AddPath(rect, ClipperLib.PolyType.ptClip, true)
  const solution = new ClipperLib.Paths()
  clipper.Execute(
    ClipperLib.ClipType.ctIntersection,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  )
  return solution as ClipperPoint[][]
}
```

**Step 4:** test passes. **Step 5:** commit `feat(rolo-textura): adiciona recorte de paths para o relevo`.

---

## Task 2 — SVG resolution and preservation

**Files:** Modify `src/features/studio/tools/confeitaria/shared/svgToIconShape.ts`, `useTextureRoller.ts`; test `tests/features/studio/tools/confeitaria/shared/svgToIconShape.test.ts`.

**Step 1 — tests**

```ts
import { Box2 } from 'three'
import { parseSvg, svgRawShapesFromParsed } from '@/features/studio/tools/confeitaria/shared/svgToIconShape'

it('aumenta a resolução das curvas quando solicitado', () => {
  const low = parseSvg(SVG_CIRCLE, 8)!
  const high = parseSvg(SVG_CIRCLE, 32)!
  expect(high.fills[0].outer.length).toBeGreaterThan(low.fills[0].outer.length)
})

it('preserva a espessura original do traço', () => {
  const parsed = {
    fills: [],
    strokes: [{ points: [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }], width: 0.25 }],
  }
  const shape = svgRawShapesFromParsed(parsed)[0]
  const box = new Box2().setFromPoints(shape.getPoints())
  expect(box.max.x - box.min.x).toBeCloseTo(0.25, 2)
})
```

**Step 3 — implementation**
- `parseSvg(svg: string, curveSegments = 12)`.
- Use `shape.getPoints(curveSegments)` and `subPath.getPoints(curveSegments)`.
- In `useTextureRoller.ts`, `parseSvgCached` calls `parseSvg(svg, 32)`.
- Do not change `svgRawShapesFromParsed`.

**Step 4/5:** tests pass; commit `feat(rolo-textura): preserva o SVG e aumenta a resolução das curvas`.

---

## Task 3 — Smoother built-in motif contours

**Files:** Modify `patterns.ts`; test `patterns.test.ts`.

Add a test:
```ts
it('usa contornos suaves nos motivos curvos', () => {
  expect(motifShapes('geometric', 'dots')[0].outer.length).toBeGreaterThanOrEqual(48)
  expect(motifShapes('floral', 'flower')[0].outer.length).toBeGreaterThanOrEqual(96)
  expect(motifShapes('wave', 'waves')[0].outer.length).toBeGreaterThanOrEqual(96)
})
```
Implementation: `circle` 48, `rose` 96, `waveBand` 96 steps, `lens` 48, `halfDisk` 40.
Commit `feat(rolo-textura): aumenta a resolução dos contornos dos motivos`.

---

## Task 4 — `buildBody.ts`

**Files:** Create `buildBody.ts`; test `buildBody.test.ts`.

Move the revolution profile from `buildTextureRoller.ts` into `buildBody.ts`, removing `body`/`row`/height logic. Use `nSegments = max(64, ceil(2πR/MESH_STEP_MM))`. The body is a closed cylinder with flat caps and 1mm fillets, position/normal/index, no groups.

Tests: indexed; bbox `L × 2R × 2R`; every edge in 2 triangles; normals outward; caps/fillets present.
Commit `feat(rolo-textura): extrai o corpo cilíndrico fechado`.

---

## Task 5 — `buildRelief.ts`

**Files:** Create `buildRelief.ts`; test `buildRelief.test.ts`.

Core code:

```ts
import { BufferGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { svgRawShapesFromParsed, type ParsedSvg } from '../shared/svgToIconShape'
import {
  clipPathsToRect, pathsToShapes, toClipperPaths, unionPaths, type ClipperPoint,
} from '../shared/textOutline'
import { isStaggered, motifShapes, type MotifShape } from './patterns'
import {
  DENSITY_CELL_MM, EDGE_MARGIN_MM, END_FILLET_MM, RELIEF_BEVEL_MM,
  type TextureRollerParams,
} from './schema'

const EMBED_MM = 0.1

function svgMotifShapes(parsed: ParsedSvg | null): MotifShape[] {
  if (!parsed) return []
  const raw = svgRawShapesFromParsed(parsed)
  if (raw.length === 0) return []
  const merged = pathsToShapes(unionPaths(toClipperPaths(raw)))
  if (merged.length === 0) return []

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const shape of merged) {
    for (const p of [...shape.getPoints(), ...shape.holes.flatMap((h) => h.getPoints())]) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
  }
  const span = Math.max(maxX - minX, maxY - minY)
  if (!Number.isFinite(span) || span <= 0) return []
  const scale = 0.88 / span
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return merged.map((shape) => ({
    outer: shape.getPoints().map((p) => ({ x: (p.x - cx) * scale, y: -(p.y - cy) * scale })),
    holes: shape.holes.map((h) => h.getPoints().map((p) => ({ x: (p.x - cx) * scale, y: -(p.y - cy) * scale }))),
  }))
}

export function buildRelief(params: TextureRollerParams, parsedSvg?: ParsedSvg | null): BufferGeometry | null {
  const circumference = Math.PI * params.diameter
  const cellMm = DENSITY_CELL_MM[params.density]
  const cellCols = Math.max(3, Math.round(circumference / cellMm))
  const cellRows = Math.max(2, Math.round(params.length / cellMm))
  const cellW = circumference / cellCols
  const cellH = params.length / cellRows

  const shapes = params.patternSource === 'svg'
    ? svgMotifShapes(parsedSvg ?? null)
    : motifShapes(params.patternFamily, params.patternMotif as never)
  const staggered = params.patternSource !== 'svg' && isStaggered(params.patternMotif as never)
  if (shapes.length === 0) return null

  const paths: ClipperPoint[][] = []
  const shift = Math.round(circumference * 1000)
  for (let row = 0; row < cellRows; row++) {
    const axialCenter = -params.length / 2 + (row + 0.5) * cellH
    const arcOffset = staggered && row % 2 === 1 ? cellW / 2 : 0
    for (let col = 0; col < cellCols; col++) {
      const arcCenter = (col + 0.5) * cellW + arcOffset
      for (const shape of shapes) {
        const mapPoint = (p: { x: number; y: number }) => new Vector2(
          axialCenter + p.y * cellH,
          arcCenter + p.x * cellW,
        )
        const flat = new Shape(shape.outer.map(mapPoint))
        for (const hole of shape.holes) flat.holes.push(new Path(hole.map(mapPoint)))
        for (const path of toClipperPaths([flat])) {
          paths.push(path)
          paths.push(path.map((p) => ({ X: p.X, Y: p.Y + shift })))
          paths.push(path.map((p) => ({ X: p.X, Y: p.Y - shift })))
        }
      }
    }
  }

  const margin = Math.max(EDGE_MARGIN_MM, END_FILLET_MM)
  const clipped = clipPathsToRect(
    unionPaths(paths),
    -params.length / 2 + margin,
    0,
    params.length / 2 - margin,
    circumference,
  )
  if (clipped.length === 0) return null

  const flatShapes = pathsToShapes(clipped)
  if (flatShapes.length === 0) return null

  const bevel = params.patternSource !== 'svg'
  const extrusions = flatShapes.map((shape) => new ExtrudeGeometry(shape, {
    depth: params.reliefDepth + EMBED_MM,
    bevelEnabled: bevel,
    bevelThickness: RELIEF_BEVEL_MM,
    bevelSize: RELIEF_BEVEL_MM,
    bevelSegments: 2,
  }))
  const merged = mergeGeometries(extrusions)
  extrusions.forEach((g) => g.dispose())
  if (!merged) return null

  merged.deleteAttribute('uv')
  merged.computeBoundingBox()
  merged.translate(0, 0, params.reliefDepth - merged.boundingBox!.max.z)

  const position = merged.getAttribute('position')
  const radius = params.diameter / 2
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const arc = position.getY(i)
    const z = position.getZ(i)
    const angle = arc / radius
    const r = radius + z
    position.setXYZ(i, x, r * Math.cos(angle), r * Math.sin(angle))
  }
  position.needsUpdate = true

  const creased = toCreasedNormals(merged, Math.PI / 6)
  merged.dispose()
  creased.setIndex(Array.from({ length: creased.getAttribute('position').count }, (_, i) => i))
  return creased
}
```

Tests: relief non-null for dots; top radius ≈ `R + depth`; radial deviation of a dot top boundary < 0.05mm; SVG stroke width preserved; no NaN.
Commit `feat(rolo-textura): gera relevo vetorial curvado no cilindro`.

---

## Task 6 — Orchestration and raster removal

**Files:** Modify `buildTextureRoller.ts`; delete `tests/.../buildHeightField.test.ts`; update `buildTextureRoller.test.ts`.

```ts
export function buildTextureRoller({ params, parsedSvg }: BuildTextureRollerInput): BuildTextureRollerResult {
  const body = buildBody(params)
  const relief = buildRelief(params, parsedSvg)
  if (!relief) {
    body.addGroup(0, body.index!.count, 0)
    body.addGroup(body.index!.count, 0, 1)
    return { roller: body }
  }
  const merged = mergeGeometries([body, relief], true)
  if (!merged) {
    relief.dispose()
    body.addGroup(0, body.index!.count, 0)
    body.addGroup(body.index!.count, 0, 1)
    return { roller: body }
  }
  body.dispose()
  relief.dispose()
  return { roller: merged }
}
```

Remove `buildHeightField`, `bodyRowForX`, `HeightField`, `buildCellRowMask`, `distTo`, `applyBevel`, `buildProfile`, and orphan imports.

Tests: 2 groups; relief > 0; bbox `L × (2R+2depth) × (2R+2depth)`; closed edges; outward normals; no handles; SVG missing → valid body + empty relief group.
Commit `feat(rolo-textura): mescla corpo e relevo vetorial e remove o raster`.

---

## Task 7 — Hook and preview

**Files:** Modify `useTextureRoller.ts`, `TextureRollerPreview.tsx`; tests.

- `parseSvg(svg, 32)` in the cache.
- Remove `flatShading` from the relief material; keep smooth shading.
- Existing tests must pass.

Commit `refactor(rolo-textura): usa resolução SVG alta e shading suave no preview`.

---

## Task 8 — Docs and final verification

Update `AGENTS.md`, `docs/frontend/studio.md`, design/plan docs:
- Structure: add `buildBody.ts`, `buildRelief.ts`; remove height field/raster.
- Rules: vector extrusion + bend; SVG unchanged; 0.1mm bevel on internal motifs; body+relief merged shells (carimbo pattern).
- Remove mentions of height field, 0.3mm raster, flat shading.
- Tests: remove `buildHeightField.test.ts`; add `buildBody.test.ts`/`buildRelief.test.ts`.

Run:
```bash
npm run typecheck
npm run lint
npm test
```
Expected: 703+ tests passing; lint only the pre-existing `suporte-foto/buildPhotoStand.ts:160` error.

Commit `docs(rolo-textura): atualiza documentação do relevo vetorial`.

---

## Definition of Done
- Smooth vector relief on internal motifs and SVG, no grid aliasing.
- SVG preserved (original stroke/shapes; only uniform scaling).
- Closed body and relief, merged with two material groups.
- Dimensions `L` and `R+depth`; no handles.
- Tests, typecheck, and feature lint green.
- No dead raster/height-field code.

## Risks
- Merged shells (approved) — printable STL, not a single connected solid.
- 0.1mm bevel slightly alters internal motifs; SVG has no bevel.
- Waves/chevrons seam produces an internal coincident wall; slicers resolve it.
- Union/extrusion at high density may take 0.3–1s in the worker.
