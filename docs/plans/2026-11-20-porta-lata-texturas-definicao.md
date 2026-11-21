# Alta definição das texturas — Plano de implementação

> **Para quem executa:** REQUIRED SUB-SKILL: use `superpowers:executing-plans`
> para implementar este plano tarefa a tarefa.

**Objetivo:** aumentar a definição das texturas importadas no preview e no STL,
com mapa 512 × 256, parede de 512 segmentos/0,4 mm e flat shading no preview.

**Arquitetura:** o `unwrapCylinder` gera mapas maiores; o `buildBody` escolhe
segmentos/passo por estilo; o preview usa flat shading quando a geometria
exibida é importada. O resto do pipeline (u/v, profundidade, offset, validação)
não muda.

**Stack:** Node 24, TypeScript strict, Three.js, React Three Fiber, Vitest.

**Design aprovado:** `docs/plans/2026-11-20-porta-lata-texturas-definicao-design.md`.

**Status:** executado. 512/0,4 mantidos (CPU 5,6–6,5 s), STL ~14,6 MB, 291,6k
triângulos com texto; testes importados divididos em 5 arquivos e os builds
completos em 3; flat shading com remount do material.

**Regras:** 1 unidade = 1 mm; sem `any`; commits semânticos; assets gerados
commitados; `files/` fora do repo.

---

## Task 1: Mapas em 512 × 256

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/textureImport.ts`
- Modificar: `tests/features/studio/tools/lembrancinhas/porta-lata/textureImport.test.ts`
- Modificar: `tests/features/studio/tools/lembrancinhas/porta-lata/importedTextures.test.ts`
- Regenerar: `src/features/studio/tools/lembrancinhas/porta-lata/importedTextures.ts`
- Regenerar: `src/features/studio/tools/lembrancinhas/porta-lata/importedTextureData.ts`

**Step 1: testes**

Em `textureImport.test.ts`, adicione:

```ts
  it('usa 512 × 256 por padrão', () => {
    const map = unwrapCylinder(readBinaryStl(syntheticCylinder()))
    expect(map.width).toBe(512)
    expect(map.height).toBe(256)
    expect(map.data).toHaveLength(512 * 256)
  })
```

Em `importedTextures.test.ts`, troque as expectativas fixas:
- `width` → `512`, `height` → `256`;
- o decode usa `meta.width * meta.height` (131.072), não `18.432`;
- mantenha as faixas de `nativeDepth` (1–5) e `maxSlopeDeg` (20–85).

**Step 2: implementar e regenerar**

Em `textureImport.ts`:
```ts
  const columns = options.columns ?? 512
  const rows = options.rows ?? 256
```
O script não muda; ele usa os defaults.

Rode:
```bash
node scripts/texture-import.mjs
node scripts/texture-import.mjs --check
```
Esperado: 14 mapas 512 × 256, data ~2,4 MB base64, metadata com width/height
novos. O tempo sobe para minutos.

**Step 3: rodar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/textureImport.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/importedTextures.test.ts
npx tsc -b
npm run lint
```

**Step 4: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/textureImport.ts src/features/studio/tools/lembrancinhas/porta-lata/importedTextures.ts src/features/studio/tools/lembrancinhas/porta-lata/importedTextureData.ts tests/features/studio/tools/lembrancinhas/porta-lata/textureImport.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/importedTextures.test.ts
git commit -m "feat: raise imported texture map resolution"
```

---

## Task 2: Parede em 512 segmentos / 0,4 mm

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/schema.ts`
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/buildBody.ts`
- Modificar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildBodyImported.test.ts`

**Step 1: teste**

No `buildBodyImported.test.ts`, adicione a checagem de alta definição:

```ts
    expect(position.count).toBeGreaterThan(100_000)
```

**Step 2: implementar**

Em `schema.ts`, junto às constantes de textura:

```ts
export const IMPORTED_TEXTURE_RADIAL_SEGMENTS = 512
export const IMPORTED_TEXTURE_STEP_MM = 0.4
```

Em `buildBody.ts`:
- importe `IMPORTED_TEXTURE_RADIAL_SEGMENTS`, `IMPORTED_TEXTURE_STEP_MM` e
  `isImportedTexture`;
- `subdivideWall(profile, wall, step)` usa o passo recebido;
- `weldSeamNormals(geometry, pointCount, segments)` usa `segments * pointCount`;
- em `buildBody`, após o early-return de `none`:

```ts
  const imported = isImportedTexture(params.textureStyle)
  const segments = imported
    ? IMPORTED_TEXTURE_RADIAL_SEGMENTS
    : TEXTURE_RADIAL_SEGMENTS
  const step = imported ? IMPORTED_TEXTURE_STEP_MM : TEXTURE_STEP_MM
  ...
  const subdividedProfile = subdivideWall(profile, wall, step)
  const geometry = new LatheGeometry(subdividedProfile, segments)
  displaceWall(geometry, params, wall)
  geometry.computeVertexNormals()
  weldSeamNormals(geometry, subdividedProfile.length, segments)
```

**Step 3: rodar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildBodyImported.test.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildBody.test.ts
npx tsc -b
npm run lint
```

Esperado: 14 corpos importados fechados/1 casca, `position.count > 100k`;
procedurais e `none` inalterados.

**Step 4: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/schema.ts src/features/studio/tools/lembrancinhas/porta-lata/buildBody.ts tests/features/studio/tools/lembrancinhas/porta-lata/buildBodyImported.test.ts
git commit -m "feat: raise imported texture wall resolution"
```

---

## Task 3: Flat shading no preview importado

**Arquivos:**
- Modificar: `src/features/studio/tools/lembrancinhas/porta-lata/CanHolderPreview.tsx`
- Modificar: `src/features/studio/StudioPage.tsx`
- Modificar: `tests/features/studio/tools/lembrancinhas/porta-lata/CanHolderPreview.test.tsx`

**Step 1: testes**

No `CanHolderPreview.test.tsx`:
```ts
  it('aplica flat shading só no corpo quando pedido', () => {
    const { container } = render(
      <CanHolderPreview
        body={new BoxGeometry(80, 88, 80)}
        handle={new BoxGeometry(40, 52, 12)}
        bodyColor="#14b8a6"
        accentColor="#f5f5f5"
        flatShading
      />,
    )
    const materials = container.querySelectorAll('meshstandardmaterial')
    expect(materials[0]).toHaveAttribute('flatShading', 'true')
    expect(materials[1]).not.toHaveAttribute('flatShading')
  })
```
Se o jsdom renderizar a prop com outro casing, ajuste o atributo (ex.
`flatshading`) e o filtro de avisos esperados; não remova a checagem.

**Step 2: implementar**

`CanHolderPreview.tsx`:
```tsx
interface CanHolderPreviewProps {
  body: BufferGeometry | null
  handle: BufferGeometry | null
  bodyColor: string
  accentColor: string
  flatShading?: boolean
}
...
  flatShading = false,
...
<meshStandardMaterial
  color={bodyColor}
  metalness={0.05}
  roughness={0.5}
  flatShading={flatShading}
/>
```
A alça permanece sem flat shading.

`StudioPage.tsx` (wrapper `CanHolderToolWrapper`):
- importe `isImportedTexture` de
  `./tools/lembrancinhas/porta-lata/schema`;
- desestruture `builtParams` de `useCanHolder()`;
- passe:
```tsx
flatShading={
  builtParams !== null && isImportedTexture(builtParams.textureStyle)
}
```

**Step 3: rodar**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/CanHolderPreview.test.tsx tests/features/studio/StudioPage.test.tsx
npx tsc -b
npm run lint
```

**Step 4: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/CanHolderPreview.tsx src/features/studio/StudioPage.tsx tests/features/studio/tools/lembrancinhas/porta-lata/CanHolderPreview.test.tsx
git commit -m "feat: use flat shading for imported textures in preview"
```

---

## Task 4: Build completo, performance e fallback

**Arquivos:**
- Testar: `tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolderImported.test.ts`
- Talvez: `src/features/studio/tools/lembrancinhas/porta-lata/schema.ts` (fallback)

**Step 1: medir**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata/buildCanHolderImported.test.ts
```

O teste mede/roda 2 builds com CSG (paralelepípedos e pedra_hexagonal + texto).
Registre a CPU do build importado.

**Step 2: decisão**

- Se o build importado ficar **≤ 8 s**, mantenha 512/0,4.
- Se passar de **8 s**, troque as constantes para
  `IMPORTED_TEXTURE_RADIAL_SEGMENTS = 448` e `IMPORTED_TEXTURE_STEP_MM = 0.45`,
  rode de novo e registre. A Task 2 usa essas constantes; o mapa continua
  512 × 256.

**Step 3: rodar a suíte da ferramenta**

```bash
npx vitest run tests/features/studio/tools/lembrancinhas/porta-lata
npx tsc -b
npm run lint
```

**Step 4: commit**

Se houve fallback, commit das constantes com
`fix: keep imported texture build under budget`; senão, nada a commitar (a
medição vai para a Task 5/docs).

---

## Task 5: Documentação

**Arquivos:**
- `src/features/studio/tools/lembrancinhas/porta-lata/AGENTS.md`
- `src/features/studio/tools/lembrancinhas/AGENTS.md`
- `docs/frontend/studio.md`
- `docs/plans/2026-11-20-porta-lata-texturas-definicao-design.md`

**Step 1: atualizar**

- Mapa 512 × 256 (~2,4 MB), parede 512/0,4 mm (~250k triângulos), STL ~12 MB.
- Flat shading no preview importado; alça suave; `builtParams`.
- Build medido (valor real) e fallback se aplicado.
- `--check` leva minutos e exige os STLs; manual.
- Design: status `implementado` + desvios (resolução/tempo final).

**Step 2: commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-lata/AGENTS.md src/features/studio/tools/lembrancinhas/AGENTS.md docs/frontend/studio.md docs/plans/2026-11-20-porta-lata-texturas-definicao-design.md
git commit -m "docs: document high definition textures"
```

---

## Task 6: Verificação final

**Step 1: suíte completa**

```bash
npm test
```

**Step 2: typecheck, lint, build**

```bash
npm run typecheck
npm run lint
npm run build
```

**Step 3: assets**

```bash
node scripts/texture-import.mjs --check
```

**Step 4: revisão manual**

- Abrir um estilo importado no preview e conferir o relevo nítido (flat
  shading), o texto e a alça.
- Comparar um procedural (suave) e `none` (liso).
- Conferir o build e o STL exportado.
- Ver o tamanho do worker chunk e do STL.

**Step 5: commit final (se houver ajuste)**

```bash
git add -A
git commit -m "fix: polish high definition textures"
```
