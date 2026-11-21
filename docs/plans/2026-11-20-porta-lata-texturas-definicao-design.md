# Porta-lata 350 ml — Alta definição das texturas (design)

**Data:** 2026-11-20
**Ferramenta:** `lembrancinhas/porta-lata`
**Status:** design aprovado; implementado

## Desvios da implementação

- **512/0,4 mantido, sem fallback**: o pior caso de CPU foi 6,5 s (pedra
  hexagonal, build frio), abaixo do gate de 8 s.
- **Números finais**: parede importada 266.240 triângulos (133.893 vértices);
  com o texto ~291.632 triângulos e STL do corpo ~14,6 MB.
- **Mapa**: 512 × 256, 14 × 131.072 B; asset 2.447.258 B (~2,4 MB; gzip
  ~1,28 MB); `--check` ~33 s / ~420 MB. `nativeDepth` 1,21–4,25 mm;
  `maxSlopeDeg` 67,8–82,7° (medido só em Δv, na grade de 256 linhas; é um
  limite inferior — a 1024×512 a pedra chega a ~85,75°).
- **Worker**: o data é baixado no mount mesmo com `textureStyle: none`
  (~1,40 MB gzip), porque o chunk do worker o inclui; import dinâmico ou
  compressão ficam como follow-up.
- **Testes**: 14 corpos importados em 5 arquivos; os builds completos foram
  divididos em 3 arquivos (`buildCanHolder`, `...Textures`, `...Extremes`) com
  timeout de 60 s para não estourar o RPC do Vitest. O utilitário de malha foi
  otimizado (canonicalização + chaves numéricas) e a suíte completa fica em
  1622 testes / ~95 s.
- **Preview**: o R3F 9.7.0 não marca `needsUpdate` ao trocar `flatShading`;
  o material do corpo usa `key` (`flat`/`smooth`) para remontar e recompilar.

## Objetivo

Aumentar a definição das texturas importadas no preview **e** no STL impresso.
O gargalo atual é duplo: o mapa de altura é 192 × 96 (~1,2 × 1,0 mm) e a parede
do corpo é gerada com 256 segmentos e passos de 1 mm; além disso, as normais
suavizadas escondem as facetas no preview. Os STLs de origem têm detalhe bem
abaixo de 1 mm.

A meta é **512 × 256 no mapa** e **512 segmentos × 0,4 mm na parede**, com flat
shading no preview dos estilos importados.

## Escopo

Incluído:

- Regenerar os 14 mapas em 512 × 256 (~2,4 MB base64).
- Parede dos estilos importados em 512 segmentos e passos de 0,4 mm
  (~250k triângulos).
- `weldSeamNormals` parametrizado pelo número de segmentos.
- Flat shading no corpo do preview quando a geometria é de um estilo importado.
- Medição de CPU, gate de ~8 s e fallback 448 × 0,45 se necessário.
- Testes, docs e regeneração dos assets.

Fora do escopo:

- Mudar o mapeamento u/v, a profundidade nativa, os offsets da alça, o trim ou o
  filtro de furo.
- Alterar procedural (`256/1`) ou o corpo liso (`128`).
- Iluminação/Environment do viewport compartilhado.
- Compressão PNG/WebP dos mapas (fica como follow-up se o asset pesar).

## Números

| Item | Antes | Depois |
|---|---|---|
| Mapa | 192 × 96 (1,2 × 1,0 mm) | **512 × 256 (0,45 × 0,39 mm)** |
| Parede importada | 256 × 1 mm | **512 × 0,4 mm** |
| Triângulos da parede | ~51k | **266k** |
| Asset | ~344 KB | **~2,4 MB base64** |
| STL do corpo | ~3 MB | **~14,6 MB** (291,6k tris com texto) |
| Build importado | ~1,6–2,2 s | **5,6–6,5 s de CPU** |

Procedurais continuam 256/1; `none` continua 128. O detalhe útil para bico
0,4 mm é ~0,4 mm, então 512 é o teto razoável.

Constantes novas:

```ts
export const IMPORTED_TEXTURE_RADIAL_SEGMENTS = 512
export const IMPORTED_TEXTURE_STEP_MM = 0.4
```

## Geração dos mapas

- `unwrapCylinder` passa a ter defaults `columns: 512`, `rows: 256`; o script
  usa os defaults.
- O trim por mediana, o filtro de furo 0,78, a normalização e o cálculo de
  profundidade/inclinação continuam; `nativeDepth`/`maxSlopeDeg` podem variar um
  pouco com a resolução e serão regravados nos metadados.
- O `importedTextures.ts` declara `width: 512`, `height: 256`; o data base64
  cresce para ~2,4 MB, ainda lazy e só no chunk do worker.
- `--check` continua comparando byte a byte; o tempo de geração sobe para
  minutos (manual, com os STLs locais).

## Malha e normais

- `buildBody` escolhe segmentos/passo conforme o estilo:
  - importado → 512 / 0,4 mm;
  - procedural → 256 / 1 mm;
  - `none` → 128 / sem subdivisão.
- `subdivideWall(profile, wall, step)` recebe o passo.
- `weldSeamNormals(geometry, pointCount, segments)` recebe o número de
  segmentos; hoje assume `TEXTURE_RADIAL_SEGMENTS`.
- A malha continua fechada/single-shell; o mapa é amostrado por `u/v` como hoje.
- O CSG do texto opera sobre ~250k triângulos; a medição define se o fallback
  448 × 0,45 é necessário.

## Preview

- `CanHolderPreview` ganha `flatShading?: boolean` (default false). O corpo usa
  `flatShading` no `meshStandardMaterial`; a alça continua suave.
- `StudioPage` passa `flatShading` a partir de `builtParams`:
  `builtParams !== null && isImportedTexture(builtParams.textureStyle)`.
  Assim o shading corresponde à geometria exibida (snapshot), não ao slider em
  edição.
- O flat shading mostra as facetas reais de 0,4 mm — o STL é facetado; o preview
  deixa de suavizar o relevo.
- Nenhum controle novo; a nota de importados continua
  “profundidade X mm · flancos ~N°. Pode exigir suporte.”.

## Performance

- Build importado: medir CPU do build completo com texto. Meta ≤ 8 s.
- Se passar de 8 s, cair para **448 segmentos × 0,45 mm** (constantes e
  regeneração não mudam; só a malha) e registrar. O fallback mantém ~200k
  triângulos e detalhe próximo.
- O worker evita travar a UI; o preview mantém a geometria anterior enquanto o
  novo build chega.
- Teste `buildBodyImported` (14 corpos) e `buildCanHolderImported` (2 builds com
  CSG) ficam em arquivos separados para não estourar o watchdog de 60 s.
- Asset de 2,4 MB: lazy no chunk do worker; o painel não carrega os mapas.
  Compressão fica como follow-up se o bundle pesar.

## Arquitetura de arquivos

```text
porta-lata/
  textureImport.ts   # defaults 512×256
  schema.ts          # constantes de alta definição
  buildBody.ts       # passo/segmentos por estilo + weld parametrizado
  importedTextures.ts / importedTextureData.ts  # regenerados
  CanHolderPreview.tsx  # prop flatShading
StudioPage.tsx       # liga flatShading ao builtParams
scripts/texture-import.mjs  # sem mudança de lógica; regenera
```

## Testes

- Assets: 512 × 256, 14 mapas, base64 decodifica `width × height`, metadata
  coerente; `--check`.
- BuildBody importado: 14 corpos fechados/single-shell, raio máximo no envelope
  e `position.count` alto (~>100k) provando a malha de alta definição.
- Build completo importado com texto e alça: manifold, single-shell, volume > 0;
  medir CPU.
- Preview: material do corpo com `flatShading` quando a prop é true; alça sem
  flat shading; sem prop, comportamento atual.
- Procedurais e `none` inalterados (256/1 e 128).
- Suíte, typecheck, lint, build e `--check`.

## Riscos e mitigação

- **Build 5–8 s**: worker + geometria anterior; fallback 448/0,45 se >8 s.
- **STL ~12 MB**: inerente ao detalhe; export binário.
- **Asset ~2,4 MB**: lazy no worker; compressão como follow-up.
- **GPU fraca**: 250k triângulos é modesto; flat shading não tem custo extra.
- **Mapa 8 bits**: 0,016 mm por passo na profundidade máxima; não é o gargalo.
- **Fonte**: campo de altura perde undercuts, agora com ~0,4 mm de amostra;
  abaixo disso o bico 0,4 mm não reproduz.
- **Regeneração**: `--check` leva minutos e exige os STLs locais; manual.

## Critérios de conclusão

- Mapas 512 × 256 gerados e commitados; `--check` verde.
- Corpo importado com 512 segmentos e passos de 0,4 mm, fechado/single-shell.
- Preview importado em flat shading; alça suave; STL com o mesmo detalhe.
- Build medido e documentado; fallback aplicado se >8 s.
- Suíte, typecheck, lint e build passando.
- Docs (`AGENTS.md` da ferramenta/categoria e `docs/frontend/studio.md`) com os
  números finais.
