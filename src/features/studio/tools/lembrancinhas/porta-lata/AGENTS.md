# Ferramenta: Porta-lata

## Status

Implementada (v4: 20 estilos de textura — 6 procedurais + 14 importados — e
`none`). A v1 trouxe o corpo com anéis decorativos, furo de ventilação, relevo e
alça de abraçadeira; a v2, as bordas decorativas; a v3, seis texturas
procedurais em relevo positivo; a v4, 14 mapas de altura gerados dos STLs de
rolos de textura.

## Objetivo

Substituir a antiga Caneca Personalizada por um **Porta-lata 350 ml**. O corpo é
um sólido de revolução de parede simples com cavidade reta para uma lata de
Coca-Cola de 350 ml, borda de entrada cônica e furo central de ventilação no
fundo. Dois anéis decorativos de revolução ficam colados na base e no topo,
compartilhando salto e largura. O nome/idade fica em relevo de 1 mm no corpo, a
180° da alça. A alça é uma peça separada de encaixe por pressão: uma abraçadeira
em C de 200° com laço em D. São dois STLs independentes (`-corpo` e `-alca`).

O corpo aceita 20 estilos de textura decorativa em relevo positivo, aplicados
apenas à parede cilíndrica entre os anéis: seis procedurais (madeira, metal,
escamas, onduladas, pedra e pontiagudo) e 14 importados de rolos de textura
(`azulejos` a `hex_scifi_pequeno`). Os importados vêm dos STLs em `files/`, que
fica fora do repositório (~400 MB, no `.gitignore`); a licença foi liberada pelo
usuário e só os assets gerados (`importedTextures.ts` e
`importedTextureData.ts`) são commitados. Eles preservam a profundidade nativa
do arquivo (1,21–4,23 mm), podem exigir suporte (flancos de 49–74°) e ignoram os
sliders de profundidade e escala. A faixa da abraçadeira fica lisa e o nome é
elevado pelo envelope da textura; o laço da alça se afasta para não colidir com
o relevo.

A lata não é modelada. As medidas abaixo são um preset fixo de referência; o
usuário ajusta a folga, a profundidade da cavidade, as paredes, o furo, a borda,
os anéis, a textura, a alça e o texto.

## Preset da lata

| Constante | Valor |
|---|---|
| `CAN_DIAMETER` | 66,2 mm |
| `CAN_HEIGHT` | 122,2 mm |
| `CAN_TOP_DIAMETER` | 54,0 mm |
| `CAN_VOLUME_ML` | 350 |

## Parâmetros

### Corpo

| Parâmetro | Faixa | Default |
|---|---|---|
| `cavityDepth` | 80–116 mm | 108 |
| `canClearance` | 0,5–1,2 mm | 0,8 |
| `wallThickness` | 1,8–4 mm | 2,4 |
| `bottomThickness` | 2–6 mm | 3,2 |
| `ventHoleDiameter` | 6–14 mm | 10 |
| `rimLeadIn` | 0,5–2 mm | 1,0 |
| `rimChamfer` | 0–1,5 mm | 0,4 |
| `bodyColor` | 10 cores PLA | `#14b8a6` |

### Bordas

| Parâmetro | Faixa | Default |
|---|---|---|
| `edgeRimEnabled` | booleano | `true` |
| `edgeRimProtrusion` | 0,4–1,5 mm | 1,0 |
| `edgeRimWidth` | 4–14 mm | 6 |

`edgeRimWidth` é a largura total do anel no corpo. `MIN_EDGE_RIM_FLAT_MM` (1 mm)
é a face plana mínima no centro do anel. `getEffectiveRingProtrusion` devolve 0
com os anéis desligados e, senão, limita o salto a
`(edgeRimWidth - MIN_EDGE_RIM_FLAT_MM) / 2`; o clamp é defensivo e inalcançável
pelo schema. `TEXT_BAND_MARGIN_MM` (2 mm) é a margem em cada ponta da faixa do
texto.

### Textura

| Parâmetro | Faixa | Default |
|---|---|---|
| `textureStyle` | `none`, 6 procedurais e 14 importados | `none` |
| `textureDepth` | 0,4–1,5 mm (só procedural) | 0,8 |
| `textureScale` | 4–16 mm (só procedural) | 8 |

`PROCEDURAL_TEXTURE_STYLES` são `none`, `wood`, `metal`, `scales`, `waves`,
`stone` e `spikes`; `TEXTURE_STYLES` acrescenta os 14 ids importados.
`isImportedTexture`/`isProceduralTexture` discriminam os dois grupos.
`textureDepth` e `textureScale` continuam no schema (e nos sliders), mas só
valem para os procedurais; nos importados o build usa a profundidade nativa do
mapa e ignora ambos.

| Id | Nome no painel | Profundidade | Flancos |
|---|---|---|---|
| `azulejos` | Azulejos 1" | 2,25 mm | ~65° |
| `mosaico` | Mosaico | 3,17 mm | ~72° |
| `tijolos_pequenos` | Tijolos pequenos | 1,59 mm | ~56° |
| `reboco_pequeno` | Reboco quebrado pequeno | 2,26 mm | ~49° |
| `tijolos_rusticos` | Tijolos rústicos | 2,40 mm | ~63° |
| `reboco_quebrado` | Reboco quebrado | 2,08 mm | ~61° |
| `tijolos_limpos` | Tijolos limpos | 1,21 mm | ~49° |
| `paralelepipedos` | Paralelepípedos | 1,79 mm | ~60° |
| `paralelepipedos_suaves` | Paralelepípedos suaves | 1,79 mm | ~60° |
| `placa_diamantada` | Placa diamantada | 2,89 mm | ~70° |
| `pedra_hexagonal` | Pedra hexagonal | 4,23 mm | ~73° |
| `asfalto` | Asfalto | 2,54 mm | ~65° |
| `hex_scifi` | Hex sci-fi | 3,88 mm | ~74° |
| `hex_scifi_pequeno` | Hex sci-fi pequeno | 2,96 mm | ~71° |

`textureStyle: 'none'` devolve o corpo atual, sem detalhe e sem custo extra.
`getEffectiveTextureDepth` devolve 0 com `none`, `min(textureDepth,
textureScale / 4)` nos procedurais e a profundidade nativa nos importados.
`getTextureEnvelope` é a profundidade efetiva (`nativeDepth` nos importados).

Constantes: `TEXTURE_RADIAL_SEGMENTS` (256), `TEXTURE_STEP_MM` (1 mm),
`TEXTURE_EDGE_FADE_MM` (2 mm), `TEXTURE_HANDLE_GAP_MM` (1 mm),
`TEXTURE_HANDLE_FADE_MM` (2 mm) e `MIN_LOOP_GAP_MM` (0,7 mm).

### Alça

| Parâmetro | Faixa | Default |
|---|---|---|
| `handleEnabled` | booleano | `true` |
| `handleHeight` | 35–85 mm | 60 |
| `handleGap` | 24–40 mm | 30 |
| `handleReach` | 30–50 mm | 40 |
| `handleBand` | 5–10 mm | 6,5 |
| `handleWidth` | 8–16 mm | 12 |
| `handleClearance` | 0,2–0,5 mm | 0,3 |
| `accentColor` | 10 cores PLA | `#f5f5f5` |

### Personalização

| Parâmetro | Faixa | Default |
|---|---|---|
| `text` | 0–20 caracteres | `Festa` |
| `textSize` | 6–18 mm | 10 |
| `fontStyle` | `normal`, `bold`, `serif` | `normal` |
| `textCenterY` | 20–90 mm | 60 |

`CONTENT_DEPTH` é fixo em 1 mm.

## Dimensões derivadas (default)

- Diâmetro interno: `CAN_DIAMETER + 2 * canClearance` → **67,8 mm**.
- Diâmetro externo da parede: `innerDiameter + 2 * wallThickness` → **72,6 mm**.
- Diâmetro externo máximo (`getMaxOuterDiameter`):
  `72,6 + 2 * max(salto efetivo dos anéis, envelope da textura)` → **74,6 mm**
  no default (o anel de 1,0 mm supera a textura de 0,8 mm). Não inclui o relevo
  do texto. Com textura procedural de 1,5 mm e escala ≥ 6 → **75,6 mm**; com
  escala 4 a profundidade efetiva é 1,0 mm e o anel ainda define o máximo →
  **74,6 mm**. Com importada o envelope é a profundidade nativa: `paralelepípedos`
  → **76,2 mm**; `pedra_hexagonal` (4,23 mm, o maior) → **81,1 mm**.
- Altura externa: `cavityDepth + bottomThickness` → **111,2 mm**.
- Altura exposta da lata: `CAN_HEIGHT - cavityDepth` → **14,2 mm**.
- Parede do topo (top land):
  `wallThickness - chanfro efetivo - lead-in efetivo + salto efetivo`
  → **2,0 mm**.
- Raios: interno 33,9 mm, externo 36,3 mm e do anel 37,3 mm.
- Abertura de entrada: `innerDiameter + 2 * rimLeadIn` → 69,8 mm.
- Anel de apoio no fundo: `innerRadius - ventRadius` → **28,9 mm** de largura
  radial; a lata apoia nesse anel, não no furo.
- Faixa da parede entre os anéis (`getRingWallBand`): **6,0–105,2 mm**, sem
  margem.
- Faixa útil do texto (`getTextBand`): **8,0–103,2 mm**, com 2 mm de margem em
  cada ponta.
- Folga do laço da alça até o anel ou o pico da textura: **≥ 0,7 mm** em todo
  estilo. Nos procedurais o envelope é ≤ 1,5 mm e o offset é 0; nos importados o
  laço se afasta por `getLoopOffset` para preservar `MIN_LOOP_GAP_MM`.
- Abertura da mão no default: **24,7 mm** sem textura; com `pedra_hexagonal` cai
  para **22,07 mm** (offset de 2,63 mm), ainda acima do aviso de 16 mm.

O painel mostra diâmetro máximo (anel ou textura), altura externa, altura
exposta e parede do topo; a seção **Bordas** mostra `Texto entre X e Y mm` a
partir de `getTextBand`. O status bar mostra **74.6 × 111.2 × 2.4 mm** no
default. Não há capacidade em ml: a capacidade é da lata (350 ml).

## Regras do domínio

- 1 unidade Three.js = 1 mm.
- O corpo é um sólido único, fechado e de gênero 1 (furo passante no fundo),
  gerado por `LatheGeometry` (128 segmentos; 256 com textura) a partir de um
  perfil 2D fechado. Não há CSG no corpo além da união do relevo.
- Perfil do corpo no plano `(r, y)` com os anéis ligados:

  ```text
  (ventR, 0)
  → (ringR - base, 0)
  → (ringR, base)
  → (ringR, w - p)
  → (outerR, w)
  → (outerR, height - w)
  → (ringR, height - w + p)
  → (ringR, height - chamfer)
  → (ringR - chamfer, height)
  → (innerR + leadIn, height)
  → (innerR, height - leadIn)
  → (innerR, bottomThickness)
  → (ventR, bottomThickness)
  → (ventR, 0)
  ```

  - `ringR = outerR + p`, `w = edgeRimWidth`, `p` é o salto efetivo e
    `chamfer`/`leadIn` são os valores efetivos da borda de entrada.
  - O anel inferior apoia na mesa com a face plana em `y = 0`, de `ventR` até
    `ringR - base`; o chanfro de base mantém a aresta viva fora do contato. O
    flanco superior do anel sobe a 45° de `(ringR, w - p)` para
    `(outerR, w)`, e a face vertical fica em `ringR`.
  - O anel superior é o par invertido: o flanco inferior desce a 45° de
    `(outerR, height - w)` para `(ringR, height - w + p)`, o que permite imprimir
    sem suporte. O ponto vertical `(ringR, height - chamfer)` fica entre esse
    flanco e o chanfro da borda; sem ele o anel superior perde a face vertical e
    o `getTopLand` não fecha.
  - Com `edgeRimEnabled` falso, `p = 0` e o perfil volta ao corpo reto, sem
    nenhum ponto novo: `(ventR, 0) → (outerR - base, 0) → (outerR, base) →
    (outerR, height - chamfer) → (outerR - chamfer, height) → ...`.
  - `base` é `BASE_CHAMFER_MM` (0,4 mm) limitado a 20% do `outerR`. A validação
    crua garante `2 * p + 1 ≤ w`, então `w - p > base`; `dedupePoints` ainda
    remove pontos coincidentes em objetos construídos fora do Zod.
  - `ventR = ventHoleDiameter / 2`; o último segmento é a parede vertical do
    furo de ventilação.
  - O perfil não toca o eixo `r = 0`, então não há leques degenerados; ainda
    assim `removeDegenerateTriangles` roda como defesa.
  - A cavidade é reta de `bottomThickness` até `outerHeight - leadIn`; a borda
    abre para `innerR + leadIn` e guia a lata.
  - O fundo tem um anel de apoio de 3,2 mm de espessura; o furo central de 10 mm
    alivia a sucção, deixa o ar entrar e a condensação sair.
- Os dois anéis são pontos do mesmo perfil de revolução: não há CSG, peça
  separada nem recorte onde a alça passa.
- A textura é um campo de altura determinístico e periódico em θ, aplicado só à
  parede externa entre os anéis. Nos seis estilos procedurais o campo é
  analítico; nos 14 importados vem de um mapa de altura 192 × 96 amostrado com
  `u = θ / 2π` e `v = (y − paredeMin) / (paredeMax − paredeMin)`.
  `findOuterWall` escolhe o segmento vertical mais longo fora da cavidade (entre
  os anéis com eles ligados; da base ao chanfro da borda sem anéis). A parede é
  subdividida em passos de `TEXTURE_STEP_MM` (1 mm) e o `LatheGeometry` usa
  `TEXTURE_RADIAL_SEGMENTS` (256) quando há textura; sem textura continuam o
  perfil e os 128 segmentos originais.
- O deslocamento é radial e só atinge vértices com raio ≈ `outerR` dentro da
  faixa da parede: `r = outerR + h(θ, y) × máscara(y)`. Anéis, base, borda,
  cavidade e furo ficam intactos; a topologia não muda e a parede continua
  fechada e single-shell.
- A máscara combina o fade de borda e a faixa lisa da abraçadeira. O fade de
  borda é `max(2 mm, 3 × depthEfetivo)`, limitado a 1/4 do comprimento da
  parede e, nos importados, a **4 mm** para o padrão não virar um colar liso.
  Com a alça ligada, a faixa
  `[handleHeight − handleWidth/2 − 1, handleHeight + handleWidth/2 + 1]` fica em
  `outerR` (máscara 0), com fade de `max(2 mm, 3 × depthEfetivo)` nas duas
  pontas (também limitado a 4 mm nos importados). Assim `getBandInnerRadius`, a
  folga e a interferência da alça continuam valendo.
- Nos importados a amostragem é bilinear: `u` é periódico em 1 (a coluna 191
  emenda na 0) e `v` é clampado em 0..1. A altura devolvida é
  `mapa × nativeDepth`, então o relevo radial preserva a profundidade medida no
  STL e o padrão é esticado para a parede entre os anéis (~99 mm no default). A
  distorção horizontal resultante é de ~1,5–2,1×; é o preço de fechar 360° sem
  emenda e está documentada nos riscos.
- O campo procedural é determinístico: o hash é inteiro por célula (sem
  `Math.random`) e a contagem de células em θ é inteira,
  `max(3, round(circunferência / escala))` (~29 células de 7,87 mm na escala 8).
  Isso fecha a emenda em θ = 0/2π; as normais das duas colunas da emenda são
  soldadas depois de `computeVertexNormals` no `buildBody` e novamente no corpo
  final depois do CSG do texto (que reindexa e recalcula as normais).
- Estilos procedurais: **madeira** tem veios verticais senoidais (mínimo 3, ≥14
  no schema) deformados por um warp lento em `y`; **metal** é um knurl de dois
  senos diagonais cruzados; **escamas** são calotas de 0,55 × escala em fileiras
  de 0,6 × escala, alternadas, avaliando três fileiras para não criar degrau;
  **onduladas** são senos horizontais modulados por um seno inteiro em θ;
  **pedra** é ruído de valor de duas oitavas com interpolação suave;
  **pontiagudo** é um cone por célula com meia-base
  `max(depthEfetivo, 0,3 × escala)`.
- A profundidade efetiva procedural é `min(textureDepth, textureScale / 4)`, o
  que mantém os flancos nominais em ≤ 45° mesmo na profundidade máxima; é uma
  defesa contra flancos mais íngremes que o imprimível. Nos importados não há
  clamp: a profundidade nativa (1,21–4,23 mm) é preservada e os flancos medidos
  ficam em 49–74°, cobertos pela nota de suporte do painel.
- `getEffectiveLeadIn` e `getEffectiveRimChamfer` limitam os valores pedidos
  para preservar `MIN_TOP_LAND_MM` (0,8 mm) de parede no topo. A validação
  `can-rim` usa a regra crua, antes do clamp do perfil.
- Os dois anéis compartilham `edgeRimProtrusion` e `edgeRimWidth` e são colados
  na base e no topo. Cada um tem um único flanco de 45°; a aresta oposta é o
  chanfro de base (inferior) ou o `rimChamfer` efetivo (superior).
  `getEffectiveRingProtrusion` devolve 0 com os anéis desligados e limita o
  salto a `(edgeRimWidth - MIN_EDGE_RIM_FLAT_MM) / 2`; o clamp é defensivo e
  inalcançável pelo schema.
- `getMaxOuterDiameter` é
  `outerDiameter + 2 * max(salto efetivo dos anéis, envelope da textura)` e não
  inclui o relevo do texto. É a medida do painel, do status bar e do
  `fallbackFitRadius`. `getOuterRadius` continua sendo o raio da parede, usado
  por alça, laço, textura e relevo. Nos importados o envelope é a profundidade
  nativa, então o diâmetro máximo chega a **81,1 mm** com `pedra_hexagonal`.
- `getTopLand` soma o salto efetivo dos anéis, então o painel expõe a parede
  real do topo (`2,0 mm` no default).
- `getRingWallBand` é a faixa vertical entre os anéis, sem margem:
  `[w, outerHeight - w]` com os anéis ligados e `[0, outerHeight]` desligados.
  `getTextBand` é a **fonte única** da faixa do texto: parte daquela faixa,
  respeita `bottomThickness` e o chanfro efetivo e acrescenta
  `TEXT_BAND_MARGIN_MM` (2 mm) em cada ponta. `buildRelief.clampCenterY` e a
  validação usam o mesmo helper; `can-handle-band` usa `getRingWallBand`.
- Como o relevo é curvado em `outerR + envelope` e fica entre os anéis, o texto
  não sobe sobre o anel. O laço da alça fica a
  `handleClearance + HANDLE_LOOP_INSET + getLoopOffset` da parede. Com
  procedurais (envelope ≤ 1,5 mm) o offset é 0 e a folga mínima de 0,7 mm vem da
  própria folga da alça; com importados o offset é
  `max(0, envelope − (handleClearance + HANDLE_LOOP_INSET − 0,7))`, então a folga
  até o pico continua ≥ 0,7 mm.
- O `getLoopOffset` é global e conservador: usa o envelope máximo do estilo, não
  a altura local do padrão. O laço pode ficar alguns milímetros mais longe do
  que o necessário em trechos rasos, mas nunca colide com o relevo.
- O relevo do texto é positivo em 1 mm acima do envelope da textura, unido ao
  corpo por CSG, e fica centralizado no lado oposto à alça (180° a partir do
  +X). Com importados profundos a frente do texto pode ficar até ~5,2 mm acima
  da parede (1 mm + os 4,23 mm de `pedra_hexagonal`).
- A alça é uma peça separada, montada por pressão **por baixo**, com abraçadeira
  em C de 200° centrada no +X e laço em D. `handleClearance` é a folga nominal no
  meio da banda; no topo a interferência é absoluta de 0,4 mm
  (`HANDLE_FIT_INTERFERENCE`) para qualquer `handleClearance`, e na base a folga
  é `handleClearance + 0,4 mm`.
- O raio interno da abraçadeira em `y` é o raio externo do corpo mais um offset
  quadrático em `t` (`getBandInnerRadius`). O corpo é cilíndrico, então a
  abraçadeira acompanha a altura, aperta no topo e trava sem trilho.
- O laço em D fica no plano vertical XY, extrudado na largura `handleWidth`. A
  borda esquerda é vertical, a `handleClearance + HANDLE_LOOP_INSET +
  getLoopOffset` da parede (`getLoopLeftX`); a abertura da mão é `handleGap` na
  vertical e `handleReach - handleClearance - HANDLE_LOOP_INSET - offset -
  2 * handleBand` na horizontal, medida em `handleHeight`. A largura é constante
  na altura, então `handOpeningMinWidth` é a própria largura.
- `getBandOuterRadius` e `getHandleMetrics.outerRadius` somam o mesmo offset: a
  abraçadeira engrossa **para fora** junto com o laço. O raio interno
  (`getBandInnerRadius`) e o encaixe por pressão não mudam. A sobreposição
  sólida de ~1,5 mm no meio e ~0,7 mm no topo entre laço e abraçadeira vale no
  plano central (z = 0); no canto lateral da borda vertical a sobreposição pode
  ficar levemente negativa com offset grande, o que é cosmético e não solta a
  peça.
- O laço mais afastado reduz a abertura da mão; `can-handle-reach` avisa abaixo
  de 16 mm. O recorte não muda: o laço não corta a textura.
- **A validação `can-handle-band` cobre só a banda da abraçadeira**
  (`handleHeight ± handleWidth / 2`), que precisa ficar sobre a parede entre os
  anéis: o limite inferior é `w + 2` e o superior é
  `min(outerHeight - chamfer, outerHeight - w) - 2`. O laço em D pode
  ultrapassar a borda superior do corpo sem invalidar a peça; a v1 não recorta o
  laço.
- O corpo é impresso em pé, sem suporte: o anel inferior é a superfície de
  apoio, com a face plana em `y = 0`, e o anel superior tem a face inferior a
  45°.
- A alça é impressa em pé, apoiada na borda inferior do laço; a abraçadeira de
  200° exige suporte sob toda a sua face inferior, não apenas um apoio pontual.
- O texto não pode invadir a borda, o fundo, os anéis decorativos, o arco da
  abraçadeira nem a área do laço. A faixa `getTextBand` já aplica 2 mm de margem
  em cada ponta e o build clampa o centro nela.
- `buildRelief` extruda `CONTENT_DEPTH + RELIEF_EMBED + envelope` (1 + 0,2 +
  envelope), curva os vértices em `outerR + envelope` na altura `textCenterY` e
  deixa a base do glifo em `outerR − 0,2`; a frente fica 1 mm acima do pico da
  textura. A faixa `getTextBand` e o auto-fit (`MAX_TEXT_ARC`, 120°) não mudam.
  O arco efetivo é calculado pelo comprimento do texto; o Zod limita apenas o
  comprimento e o tamanho.
- STL sempre manifold, fechado, sem auto-interseções e sem peças soltas. O corpo
  fica com casca única mesmo com o furo passante; a alça tem CSG interno
  (abraçadeira + laço), mas nenhum CSG no corpo.
- Trocar cor não rebuilda geometria: `bodyColor` e `accentColor` ficam fora do
  `canHolderGeometryParamsSchema`.

## Pipeline

```text
files/*.stl (fora do repo, ~400 MB)
  → scripts/texture-import.mjs (manual)
  → importedTextures.ts (metadados)
  → importedTextureData.ts (mapas 192 × 96 em base64)
```

```text
Parâmetros
  → schema + validação (main thread)
  → dimensões derivadas (inner/outer/altura exposta/top land/faixa do texto/envelope)
  → perfil do corpo com anéis decorativos e furo de ventilação
  → findOuterWall + subdivisão da parede em passos de 1 mm
  → buildBody (LatheGeometry 256 + texture.ts: procedural ou mapa importado + máscaras + limpeza)
  → textToShapes + curvatura em outerR + envelope + subdivisão conforme
  → CSG union(texto elevado, corpo) com CDT
  → buildHandle (abraçadeira + laço + CSG interno, com offset do envelope)
  → buildCanHolder ({ body, handle })
  → worker + serialização (position/normal/index)
  → preview montado / export dos dois STLs
```

### Pipeline das texturas importadas

- `scripts/texture-import.mjs` lê os 14 STLs binários de `files/` e gera
  `importedTextures.ts` (metadados: id, label, profundidade nativa, inclinação,
  dimensões) e `importedTextureData.ts` (mapas em base64, 192 × 96, ~337 KB). O
  primeiro é importado por schema e painel; o segundo só por `texture.ts`, que
  roda no chunk do worker.
- `readBinaryStl` valida o cabeçalho (84 bytes + 50 por triângulo) e devolve só
  as posições. `unwrapCylinder` usa Z como eixo do rolo, centra X/Y nos bounds e
  rasteriza a superfície externa numa grade fixa de 192 colunas (θ) × 96 linhas
  (v), guardando o **maior raio** por célula — a casca externa vence a parede do
  furo.
- As pontas (flange, lip, taper) são cortadas pela **mediana do raio**: um
  raster grosseiro de ~1 linha/mm calcula a mediana de cada linha, a referência
  interior vem do miolo (25–75%) e as pontas saem enquanto a mediana se afasta
  mais de 0,8 mm, no máximo metade da altura de cada lado. A faixa útil fica em
  ~97–107 mm nos 14 arquivos.
- O filtro de furo descarta células abaixo de `0,78 × maior raio da faixa
  final`; nos 14 o corte efetivo fica em 0,720–0,780 do raio máximo e os furos
  reais em 0,1–0,3. Células vazias são preenchidas pela média dos vizinhos (até
  8 passadas); o mapa precisa de ≥ 80% de cobertura.
- A normalização usa os percentis **p1/p99** do mapa preenchido:
  `nativeDepth = high − low` (1,21–4,23 mm) e cada célula vira 8 bits em 0..255.
  A inclinação máxima é medida com o mapa já mapeado para a parede nominal de
  99,2 mm (`depth × |Δv| / (99,2/95)`), em graus (49–74°).
- No runtime `importedTextureHeight` decodifica o base64 uma vez por worker e
  faz amostragem bilinear com `u` periódico e `v` clampado; o resultado é
  multiplicado por `nativeDepth` e pela máscara de `textureMask`.

### Regeneração

- `node scripts/texture-import.mjs` regenera os dois assets e imprime a tabela
  de id/profundidade/inclinação; `--check` regenera em memória e compara com os
  arquivos commitados, saindo com erro na primeira diferença.
- Requisitos: **Node 24** (o script importa `textureImport.ts` direto e depende
  do type stripping), `files/` local com os 14 STLs (~400 MB, fora do repo) e
  execução **manual** — o script não roda no CI, e o `--check` também exige os
  STLs. A escrita é atômica (`.tmp` + `rename`) e o script entra no lint
  (`eslint.config.js` cobre `scripts/**/*.mjs`).

## Exportação

- Dois STLs binários: `<nome>-corpo.stl` e `<nome>-alca.stl`.
- Cada peça é clonada pelo `exportStl` e centralizada na mesa, com a base em
  `y = 0`.
- O corpo sai como construído (em pé), com o anel inferior como superfície de
  apoio em `y = 0`; o chanfro da base mantém a aresta fora do contato e o anel
  superior imprime sem suporte. A alça também sai em pé, apoiada na borda
  inferior do laço, sem rotação.
- A alça desabilitada não gera arquivo.
- O STL não carrega cor; o furo de ventilação faz parte do corpo e não há peça
  solta.

## UI

- Acordeões: Corpo, Bordas, Textura, Alça, Personalização, Aparência e Validação
  (7 seções; 19 sliders no total).
- **Textura** fica entre Bordas e Alça: `SelectField` "Estilo da textura" com
  dois `optgroup`: **Procedurais** (Nenhuma, Madeira, Metal, Escamas, Onduladas,
  Pedra, Pontiagudo) e **Importadas** (os 14 rótulos da tabela). Os sliders
  "Profundidade da textura" (0,4–1,5 mm, passo 0,1) e "Escala da textura"
  (4–16 mm, passo 1) ficam desabilitados com "Nenhuma" e também em qualquer
  estilo importado.
- Com estilo nenhum, a nota é "Escolha um estilo para ajustar os parâmetros.";
  com procedural, "Relevo positivo. A faixa da alça fica lisa e o nome fica 1 mm
  acima da textura." e, se a profundidade pedida passar da efetiva,
  "Profundidade efetiva: X mm (limitada pela escala).".
- Com importado, a nota é "Textura importada: profundidade X mm · flancos ~Y°.
  Pode exigir suporte."; a linha "limitada pela escala" não aparece.
- O status bar mostra o diâmetro máximo de `getMaxOuterDiameter` (anel ou
  textura, incluindo o envelope importado), a altura externa e a espessura da
  parede: **74,6 × 111,2 × 2,4 mm** no default.

## Validação

| Código | Severidade | Regra |
|---|---|---|
| `can-cavity` | error | profundidade fora de 80–116 mm (schema/UI) ou lata exposta abaixo de 6 mm |
| `can-clearance` | warning | folga fora de 0,5–1,2 mm (defensiva) |
| `can-vent` | error | furo grande demais: raio do furo > raio interno − 3 mm |
| `can-rim` | error | parede do topo abaixo de 0,8 mm (valores crus, antes do clamp) |
| `can-wall` | error | parede abaixo de 1,8 mm (defensiva; a UI já limita) |
| `can-bottom` | error | fundo abaixo de 2 mm (defensivo, inalcançável pelo schema) |
| `can-edge-rim` | error | `2 × edgeRimProtrusion + MIN_EDGE_RIM_FLAT_MM > edgeRimWidth` (valores crus) ou, defensivo, `2 × edgeRimWidth + 4 mm > altura` |
| `can-texture` | warning | **só procedural**: profundidade acima de `textureScale / 4` (valores crus); o build usa `min(textureDepth, textureScale / 4)`. Importados usam a profundidade nativa e não geram aviso |
| `can-text-fit` | warning | estimativa do texto (0,68 × tamanho por caractere) pode exceder o arco útil de 120°; o build usa a fonte real e faz auto-fit |
| `can-text-band` | error | texto cruza a borda, o fundo ou os anéis decorativos; a faixa vem de `getTextBand` (`1,1 × textSize` já escalado pelo auto-fit, com 2 mm de margem) |
| `can-handle-gap` | warning | abertura vertical da mão abaixo de 26 mm |
| `can-handle-reach` | warning | menor largura do furo da mão abaixo de 16 mm; inclui a redução causada pelo `getLoopOffset` das texturas importadas |
| `can-handle-fit` | warning | folga nominal acima de `HANDLE_FIT_INTERFERENCE` (0,4 mm); a interferência no topo é sempre absoluta |
| `can-handle-band` | error | a banda da abraçadeira (`handleHeight ± handleWidth / 2`) precisa ficar entre os anéis: `w + 2` até `min(altura - chanfro, altura - w) - 2`; o laço pode passar da borda |

**Não existe `can-texture-slope`.** Os 14 importados medem 49–74° (todos acima
de 45° em algum ponto), então um aviso por estilo não discriminaria; a nota
"Pode exigir suporte." fica na seção Textura do painel e não bloqueia build nem
export. `maxSlopeDeg` permanece na metadata e é exibido na nota. `can-handle-reach`
continua sendo o único aviso que reage à textura importada, via abertura da mão
reduzida.

`can-invalid`, `can-font`, `can-csg` e `can-build` não são códigos de validação:
são falhas de runtime do worker para parâmetros inválidos, carga da fonte, união
do relevo e serialização, respectivamente. O detalhe fica no `console.error` e o
hook traduz o código em mensagem amigável.

Avisos e erros de validação não bloqueiam o build nem o export: a validação é
consultiva e aparece no painel. Falha de CSG mantém a geometria anterior e
mostra erro no overlay.

## Decisões da v1

- **A caneca antiga foi substituída:** o produto anterior deixa de existir; o
  card, o `ToolId`, o `productType` e os símbolos passam a
  `porta-lata`/`CanHolder`. O histórico da caneca fica só nos docs de plano.
- **Preset fixo da lata:** as medidas da Coca-Cola 350 ml são constantes; o
  usuário ajusta folga e profundidade, não o diâmetro/altura da lata. Menos
  validação e nenhum encaixe impossível.
- **Cavidade reta:** a lata é cilíndrica; uma cavidade cônica balançaria a lata
  e reduziria o contato. A parede fica com espessura constante.
- **Furo de ventilação:** 10 mm no centro do fundo; a lata apoia no anel
  externo de 28,9 mm, o ar entra, a condensação sai e a remoção não cria sucção.
- **Borda de entrada:** 1,0 mm de cone interno e 0,4 mm de chanfro externo
  deixam 1,0 mm de parede no topo sem os anéis (2,0 mm com o anel) e guiam a
  lata.
- **Alça reaproveitada:** a abraçadeira de 200° com interferência no topo já foi
  validada; o corpo cilíndrico mantém o encaixe e o laço tem borda esquerda
  vertical. A fixação é por pressão e a peça é removível.
- **Corpo por revolução:** o build usa o `LatheGeometry` fechado; os anéis
  entram como pontos do mesmo perfil. O relevo reutiliza
  `textToShapes`/`shapesToGeometry` de
  `confeitaria/shared/textOutline.ts`, curva os vértices no raio local e é unido
  com `ADDITION`.
- **CDT em todas as uniões:** o `three-bvh-csg` usa `useCDTClipping` (splitter
  CDT). O splitter legado deixa T-junctions e arestas abertas nas bordas curvas;
  o CDT produz malha fechada e single-shell. O flag é lido de volta pelo
  `createConformingEvaluator`, que falha explicitamente se o runtime não o tiver.
- **Limpeza de geometria:** `removeDegenerateTriangles` remove triângulos com
  vértices coincidentes na tolerância de 1e-4 mm (a mesma do verificador de
  manifold), preserva position/normal/uv e roda no corpo e no resultado do CSG.
- **Relevo de 1 mm acima do envelope:** mantém a regra de personalização do
  domínio. A subdivisão
  conforme de arestas até 2,5 mm antes de curvar mantém 1 mm visível no centro
  de glifos largos (sag ≈ 0,02 mm); 0,2 mm ficam embutidos para a união. O
  auto-fit limita o arco a 120°, o que mantém o texto longe da abraçadeira.
- **Sem CSG no corpo além do relevo:** abraçadeira e laço são unidos por CSG
  dentro da própria alça. O corpo continua um sólido de revolução.
- **Sem trilho:** a abraçadeira elimina a necessidade de alterar a parede. A
  interferência absoluta de 0,4 mm no topo e a folga extra de 0,4 mm na base
  fazem a peça entrar por baixo, apertar na altura escolhida e travar.
- **Banda, não laço:** `can-handle-band` valida só a banda que abraça o corpo.
  O laço em D pode passar da borda superior sem invalidar a peça; a v1 não
  recorta o laço para caber.
- **Duas cores no preview:** `bodyColor` no corpo e `accentColor` na alça.
  Troca de cor não rebuilda geometria.
- **Build em worker:** a primeira medição de CPU do build default ficou em
  ~0,8 s; com JIT quente, ~0,6 s. O pior caso do schema (20 caracteres em
  18 mm) ficou em ~1,1 s. O teste roda no processo do Vitest, inclui a fonte e
  as asserções (~1,0 s no default) e usa gate de 4 s com
  `process.threadCpuUsage` (fallback `process.cpuUsage` em Node < 22.15), não
  relógio de parede — a suíte roda vários arquivos de geometria em paralelo.
- **Export por snapshot:** o export usa as geometrias `body` e `handle` do build
  e não recebe parâmetros; cada peça é clonada antes de centralizar na mesa.
- **Constantes fora dos sliders:** `handleWrap` (200°),
  `HANDLE_RING_THICKNESS` (3,5 mm), `HANDLE_FIT_INTERFERENCE` (0,4 mm),
  `HANDLE_LOOP_INSET` (2 mm), `HOLDER_SEGMENTS` (128), `BASE_CHAMFER_MM`
  (0,4 mm), `MIN_EDGE_RIM_FLAT_MM` (1 mm), `TEXT_BAND_MARGIN_MM` (2 mm),
  `CONTENT_DEPTH` (1 mm), `TEXTURE_RADIAL_SEGMENTS` (256), `TEXTURE_STEP_MM`
  (1 mm), `TEXTURE_EDGE_FADE_MM` (2 mm), `TEXTURE_HANDLE_GAP_MM` (1 mm),
  `TEXTURE_HANDLE_FADE_MM` (2 mm) e `MIN_LOOP_GAP_MM` (0,7 mm).
- **Painel mostra a parede do topo:** `Parede do topo` usa `getTopLand` e expõe o
  valor efetivo depois dos clamps de borda, evitando um helper só de teste.

### Decisões das bordas decorativas

- **Anéis compartilhados:** um switch e dois valores servem aos dois anéis; não
  há posição nem salto independente. Menos parâmetros e o corpo continua
  simétrico.
- **Perfil trapezoidal a 45°:** cada anel tem um único flanco de 45°; o inferior
  apoia na mesa e o superior imprime sem suporte, com o ponto vertical
  `(ringR, height - chamfer)` fechando a face e o chanfro da borda.
- **Sem recorte na alça:** o laço fica a `handleClearance + HANDLE_LOOP_INSET`
  da parede; com o salto máximo de 1,5 mm sobram ≥ 0,7 mm até o anel na folga
  mínima, então o anel não precisa ser recortado.
- **Faixa única:** `getRingWallBand` define a parede entre os anéis e
  `getTextBand` é a fonte única da faixa do texto no build (`clampCenterY`) e na
  validação. O painel mostra `Texto entre X e Y mm` a partir do mesmo helper.
- **Clamp e validação defensivos:** o schema já garante a face plana de 1 mm e a
  altura suficiente; `getEffectiveRingProtrusion` e `can-edge-rim` só protegem
  objetos construídos fora do Zod.
- **Medida nominal:** `getMaxOuterDiameter` usa o maior envelope (salto do anel
  ou profundidade efetiva da textura) e alimenta painel, status bar e
  `fallbackFitRadius`; o relevo de 1 mm fica fora, como nas demais medidas
  nominais.

### Decisões das texturas

- **Sem textura, corpo idêntico:** `none` mantém o perfil, os 128 segmentos e a
  bbox atuais; a subdivisão, os 256 segmentos e as máscaras só entram quando há
  estilo escolhido.
- **Campo de altura, não CSG:** a textura desloca radialmente só os vértices da
  parede em `outerR`. A topologia do lathe é preservada, então a malha continua
  fechada e single-shell, sem custo de união CSG para o padrão.
- **Relevo positivo:** a parede nominal é a mínima e os picos somam até a
  profundidade efetiva; não há entalhe nem risco de furar a parede.
- **Faixa lisa na alça:** a região da abraçadeira fica em `outerR`, com fade de
  2 mm ou `3 × depthEfetivo` (limitado a 4 mm nos importados), preservando
  `getBandInnerRadius`, a folga e a interferência do encaixe.
- **Envelope máximo:** `getMaxOuterDiameter` usa o maior entre o salto do anel e
  o envelope da textura; o relevo do texto continua fora, como nas demais
  medidas nominais.
- **Resolução 256/1,0 mantida:** o build texturado completo mediu ~1,06 s de CPU
  no default, dentro do gate de 4 s, então não foi preciso reduzir para 192
  segmentos ou passo de 1,2 mm.
- **Pedra e pontiagudo imprimíveis:** a pedra troca o bisel por interpolação
  suave (smoothstep) e o pontiagudo usa cone com meia-base
  `max(depthEfetivo, 0,3 × escala)`, mantendo os flancos próximos de 45°.

### Decisões das texturas importadas

- **Campo de altura, não STL no runtime:** o app não carrega os rolos nem
  preserva a malha original; o script reduz cada um a um mapa 192 × 96 e o
  runtime aplica como deslocamento radial. Assets pequenos, build determinístico
  e nenhum parser STL no bundle.
- **Profundidade nativa:** os importados ignoram `textureDepth`/`textureScale` e
  preservam a profundidade medida (1,21–4,23 mm). Fidelidade ao rolo vale mais
  que o clamp procedural de `escala/4`, que reduziria drasticamente o relevo.
- **u/v normalizado:** `u = θ/2π` fecha a volta sem emenda e `v` preenche a
  parede entre os anéis; o padrão é esticado (~1,5–2,1× na horizontal), aceito
  em troca de uma textura contínua em 360°.
- **Trim por mediana:** cortar flange/lip/taper pela mediana do raio é mais
  estável que detectar variação em θ; a tolerância de 0,8 mm é apertada, mas os
  14 arquivos ficam em ~97–107 mm de faixa útil.
- **Corte de furo em 0,78:** o maior raio da faixa final separa a casca externa
  da parede do furo. O valor fica logo abaixo de 0,80 para não apagar vales
  legítimos das texturas profundas.
- **Sem `can-texture-slope`:** todos os 14 medem 49–74°, então o aviso
  dispararia em todos e não ajudaria a escolher; a nota de suporte no painel
  cobre o risco e mantém build/export livres.
- **Offset global conservador:** o laço usa o envelope máximo do estilo, não a
  altura local; pode sobrar espaço em trechos rasos, mas a garantia de 0,7 mm é
  simples e independente da amostragem.
- **Assets gerados commitados:** `importedTextures.ts` e
  `importedTextureData.ts` entram no repositório; `files/` (~400 MB) fica no
  `.gitignore` e é necessário só para regenerar. O `--check` detecta asset
  desatualizado localmente.

## Riscos

- **Custo de malha e CSG:** a parede texturada passa de ~25 mil quads; o build
  completo mediu ~1,06 s de CPU no default texturado (gate de 4 s). Se um estilo
  estourar o orçamento, reduzir para 192 segmentos ou passo de 1,2 mm.
- **Aliasing em pedra e pontiagudo na escala 4:** o passo de 1 mm é o limite; a
  pedra usa interpolação suave e o preview serve de revisão. O relevo positivo
  mantém o pior caso imprimível.
- **Emenda em θ (procedurais):** a contagem de células é inteira e as funções
  são periódicas; as normais das colunas duplicadas são soldadas no corpo final.
  O teste compara alturas em 0 e 2π e as normais após o CSG. Nos importados a
  emenda é contínua porque `u` é periódico na amostragem bilinear.
- **Flancos medidos:** as facetas da parede procedural medem no máximo ~42,5°
  (spikes, escala 6, profundidade 1,5, ombro da máscara), abaixo do limite de
  45°; a discretização de 1 mm × 256 segmentos é o que define o valor impresso.
- **Overhangs importados:** os 14 estilos medem 49–74° e a profundidade nativa
  chega a 4,23 mm; a impressão pode exigir suporte. A nota do painel avisa, mas
  build e STL continuam válidos e manifold.
- **Distorção u/v:** o padrão é esticado ~1,5–2,1× na horizontal e a escala
  vertical depende da altura do rolo; é o preço de fechar 360° sem emenda. O
  relevo radial é fiel à profundidade.
- **Laço mais afastado:** com `pedra_hexagonal` a abertura da mão cai para
  ~22 mm; `can-handle-reach` avisa abaixo de 16 mm. O offset não altera o raio
  interno nem o encaixe.
- **Asset desatualizado:** o `--check` compara os módulos gerados com os STLs
  locais; sem `files/` ele não roda. Os testes de metadata e de mapa cobrem
  contagem, dimensões e faixa de profundidade.
- **Texturas parecidas:** são 14 opções, algumas próximas (`tijolos_*`,
  `reboco_*`, `paralelepipedos*` e `hex_scifi*`); os rótulos em português e o
  preview deixam a escolha clara.

## Fora de escopo

Modelar a lata ou a curvatura do fundo/pescoço, tampa, parede dupla,
isolamento térmico, canudo, base separada, outras latas (slim, 473 ml etc.),
alça integrada, mais de uma linha de texto, ícone SVG e 3MF/STEP. Na textura:
upload de STL/PNG em runtime; textura nos anéis, na base, na cavidade, na borda,
na alça ou no relevo do texto; relevo entalhado (negativo); textura por SVG ou
imagem; cor por textura; material/bump no preview (o STL carrega só a
geometria).
