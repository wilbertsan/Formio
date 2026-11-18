# Ferramenta: Porta-lata

## Status

Implementada (v1: corpo com anéis decorativos, furo de ventilação + relevo +
alça de abraçadeira).

## Objetivo

Substituir a antiga Caneca Personalizada por um **Porta-lata 350 ml**. O corpo é
um sólido de revolução de parede simples com cavidade reta para uma lata de
Coca-Cola de 350 ml, borda de entrada cônica e furo central de ventilação no
fundo. Dois anéis decorativos de revolução ficam colados na base e no topo,
compartilhando salto e largura. O nome/idade fica em relevo de 1 mm no corpo, a
180° da alça. A alça é uma peça separada de encaixe por pressão: uma abraçadeira
em C de 200° com laço em D. São dois STLs independentes (`-corpo` e `-alca`).

A lata não é modelada. As medidas abaixo são um preset fixo de referência; o
usuário ajusta a folga, a profundidade da cavidade, as paredes, o furo, a borda,
os anéis, a alça e o texto.

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
- Diâmetro externo com os anéis (`getMaxOuterDiameter`):
  `72,6 + 2 * salto efetivo` → **74,6 mm**. Não inclui o relevo do texto.
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
- Folga do laço da alça até o anel: **≥ 0,7 mm** na folga mínima da alça
  (`handleClearance` 0,2), porque o salto máximo é 1,5 mm.

O painel mostra diâmetro externo (com anéis), altura externa, altura exposta e
parede do topo; a seção **Bordas** mostra `Texto entre X e Y mm` a partir de
`getTextBand`. São 17 sliders no total e o status bar mostra
**74.6 × 111.2 × 2.4 mm**. Não há capacidade em ml: a capacidade é da lata
(350 ml).

## Regras do domínio

- 1 unidade Three.js = 1 mm.
- O corpo é um sólido único, fechado e de gênero 1 (furo passante no fundo),
  gerado por `LatheGeometry` (128 segmentos) a partir de um perfil 2D fechado.
  Não há CSG no corpo além da união do relevo.
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
- `getEffectiveLeadIn` e `getEffectiveRimChamfer` limitam os valores pedidos
  para preservar `MIN_TOP_LAND_MM` (0,8 mm) de parede no topo. A validação
  `can-rim` usa a regra crua, antes do clamp do perfil.
- Os dois anéis compartilham `edgeRimProtrusion` e `edgeRimWidth` e são colados
  na base e no topo. Cada um tem um único flanco de 45°; a aresta oposta é o
  chanfro de base (inferior) ou o `rimChamfer` efetivo (superior).
  `getEffectiveRingProtrusion` devolve 0 com os anéis desligados e limita o
  salto a `(edgeRimWidth - MIN_EDGE_RIM_FLAT_MM) / 2`; o clamp é defensivo e
  inalcançável pelo schema.
- `getMaxOuterDiameter` é `(outerR + p) * 2` e não inclui o relevo do texto. É a
  medida do painel, do status bar e do `fallbackFitRadius`. `getOuterRadius`
  continua sendo o raio da parede, usado por alça, laço e relevo.
- `getTopLand` soma o salto efetivo dos anéis, então o painel expõe a parede
  real do topo (`2,0 mm` no default).
- `getRingWallBand` é a faixa vertical entre os anéis, sem margem:
  `[w, outerHeight - w]` com os anéis ligados e `[0, outerHeight]` desligados.
  `getTextBand` é a **fonte única** da faixa do texto: parte daquela faixa,
  respeita `bottomThickness` e o chanfro efetivo e acrescenta
  `TEXT_BAND_MARGIN_MM` (2 mm) em cada ponta. `buildRelief.clampCenterY` e a
  validação usam o mesmo helper; `can-handle-band` usa `getRingWallBand`.
- Como o relevo é curvado em `getOuterRadius` e fica entre os anéis, o texto não
  sobe sobre o anel. O laço da alça fica a `handleClearance + HANDLE_LOOP_INSET`
  da parede; com o salto máximo de 1,5 mm e a folga mínima de 0,2 mm, ainda
  sobram ≥ 0,7 mm até o anel, então não há colisão.
- O relevo do texto é positivo em 1 mm, unido ao corpo por CSG, e fica
  centralizado no lado oposto à alça (180° a partir do +X).
- A alça é uma peça separada, montada por pressão **por baixo**, com abraçadeira
  em C de 200° centrada no +X e laço em D. `handleClearance` é a folga nominal no
  meio da banda; no topo a interferência é absoluta de 0,4 mm
  (`HANDLE_FIT_INTERFERENCE`) para qualquer `handleClearance`, e na base a folga
  é `handleClearance + 0,4 mm`.
- O raio interno da abraçadeira em `y` é o raio externo do corpo mais um offset
  quadrático em `t` (`getBandInnerRadius`). O corpo é cilíndrico, então a
  abraçadeira acompanha a altura, aperta no topo e trava sem trilho.
- O laço em D fica no plano vertical XY, extrudado na largura `handleWidth`. A
  borda esquerda é vertical, a `handleClearance + HANDLE_LOOP_INSET` da parede;
  a abertura da mão é `handleGap` na vertical e
  `handleReach - handleClearance - HANDLE_LOOP_INSET - 2 * handleBand` na
  horizontal, medida em `handleHeight`. A largura é constante na altura, então
  `handOpeningMinWidth` é a própria largura.
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
- O texto é curvado no raio externo do corpo na altura `textCenterY`; o arco
  efetivo é calculado pelo comprimento do texto e limitado pelo auto-fit
  (`MAX_TEXT_ARC`, 120°). O Zod limita apenas o comprimento e o tamanho.
- STL sempre manifold, fechado, sem auto-interseções e sem peças soltas. O corpo
  fica com casca única mesmo com o furo passante; a alça tem CSG interno
  (abraçadeira + laço), mas nenhum CSG no corpo.
- Trocar cor não rebuilda geometria: `bodyColor` e `accentColor` ficam fora do
  `canHolderGeometryParamsSchema`.

## Pipeline

```text
Parâmetros
  → schema + validação (main thread)
  → dimensões derivadas (inner/outer/altura exposta/top land/faixa do texto)
  → perfil do corpo com anéis decorativos e furo de ventilação
  → buildBody (LatheGeometry + limpeza)
  → textToShapes + curvatura no raio + subdivisão conforme
  → CSG union(texto, corpo) com CDT
  → buildHandle (abraçadeira + laço + CSG interno)
  → buildCanHolder ({ body, handle })
  → worker + serialização (position/normal/index)
  → preview montado / export dos dois STLs
```

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
| `can-text-fit` | warning | estimativa do texto (0,68 × tamanho por caractere) pode exceder o arco útil de 120°; o build usa a fonte real e faz auto-fit |
| `can-text-band` | error | texto cruza a borda, o fundo ou os anéis decorativos; a faixa vem de `getTextBand` (`1,1 × textSize` já escalado pelo auto-fit, com 2 mm de margem) |
| `can-handle-gap` | warning | abertura vertical da mão abaixo de 26 mm |
| `can-handle-reach` | warning | menor largura do furo da mão abaixo de 16 mm |
| `can-handle-fit` | warning | folga nominal acima de `HANDLE_FIT_INTERFERENCE` (0,4 mm); a interferência no topo é sempre absoluta |
| `can-handle-band` | error | a banda da abraçadeira (`handleHeight ± handleWidth / 2`) precisa ficar entre os anéis: `w + 2` até `min(altura - chanfro, altura - w) - 2`; o laço pode passar da borda |

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
  deixam 1,0 mm de parede no topo e guiam a lata.
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
- **Relevo de 1 mm:** mantém a regra de personalização do domínio. A subdivisão
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
  (0,4 mm), `MIN_EDGE_RIM_FLAT_MM` (1 mm), `TEXT_BAND_MARGIN_MM` (2 mm) e
  `CONTENT_DEPTH` (1 mm).
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
- **Medida nominal com anéis:** `getMaxOuterDiameter` inclui o salto e alimenta
  painel, status bar e `fallbackFitRadius`; o relevo de 1 mm fica fora, como nas
  demais medidas nominais.

## Fora de escopo

Modelar a lata ou a curvatura do fundo/pescoço, tampa, parede dupla,
isolamento térmico, canudo, base separada, outras latas (slim, 473 ml etc.),
alça integrada, mais de uma linha de texto, ícone SVG, textura e 3MF/STEP.
