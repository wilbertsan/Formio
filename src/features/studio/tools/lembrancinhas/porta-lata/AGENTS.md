# Ferramenta: Porta-lata

## Status

Implementada (v1: corpo com furo de ventilação + relevo + alça de abraçadeira).

## Objetivo

Substituir a antiga Caneca Personalizada por um **Porta-lata 350 ml**. O corpo é
um sólido de revolução de parede simples com cavidade reta para uma lata de
Coca-Cola de 350 ml, borda de entrada cônica e furo central de ventilação no
fundo. O nome/idade fica em relevo de 1 mm no corpo, a 180° da alça. A alça é
uma peça separada de encaixe por pressão: uma abraçadeira em C de 200° com laço
em D. São dois STLs independentes (`-corpo` e `-alca`).

A lata não é modelada. As medidas abaixo são um preset fixo de referência; o
usuário ajusta a folga, a profundidade da cavidade, as paredes, o furo, a borda,
a alça e o texto.

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
| `cavityDepth` | 80–118 mm | 108 |
| `canClearance` | 0,5–1,2 mm | 0,8 |
| `wallThickness` | 1,8–4 mm | 2,4 |
| `bottomThickness` | 2–6 mm | 3,2 |
| `ventHoleDiameter` | 6–14 mm | 10 |
| `rimLeadIn` | 0,5–2 mm | 1,0 |
| `rimChamfer` | 0–1,5 mm | 0,4 |
| `bodyColor` | 10 cores PLA | `#14b8a6` |

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
- Diâmetro externo: `innerDiameter + 2 * wallThickness` → **72,6 mm**.
- Altura externa: `cavityDepth + bottomThickness` → **111,2 mm**.
- Altura exposta da lata: `CAN_HEIGHT - cavityDepth` → **14,2 mm**.
- Parede do topo (top land): `wallThickness - chanfro efetivo - lead-in efetivo`
  → **1,0 mm**.
- Raios: interno 33,9 mm, externo 36,3 mm.
- Abertura de entrada: `innerDiameter + 2 * rimLeadIn` → 69,8 mm.
- Anel de apoio no fundo: `innerRadius - ventRadius` → **28,9 mm** de largura
  radial; a lata apoia nesse anel, não no furo.

O painel mostra diâmetro externo, altura externa, altura exposta e parede do
topo. Não há capacidade em ml: a capacidade é da lata (350 ml).

## Regras do domínio

- 1 unidade Three.js = 1 mm.
- O corpo é um sólido único, fechado e de gênero 1 (furo passante no fundo),
  gerado por `LatheGeometry` (128 segmentos) a partir de um perfil 2D fechado.
  Não há CSG no corpo além da união do relevo.
- Perfil do corpo no plano `(r, y)`:

  ```text
  (ventR, 0)
  → (outerR - baseChamfer, 0)
  → (outerR, baseChamfer)
  → (outerR, outerHeight - chamfer)
  → (outerR - chamfer, outerHeight)
  → (innerR + leadIn, outerHeight)
  → (innerR, outerHeight - leadIn)
  → (innerR, bottomThickness)
  → (ventR, bottomThickness)
  → (ventR, 0)
  ```

  - `baseChamfer` é uma constante de 0,4 mm (`BASE_CHAMFER_MM`), limitada a 20%
    do raio externo.
  - `ventR = ventHoleDiameter / 2`; o último segmento é a parede vertical do
    furo de ventilação.
  - O perfil não toca o eixo `r = 0`, então não há leques degenerados; ainda
    assim `removeDegenerateTriangles` roda como defesa.
  - A cavidade é reta de `bottomThickness` até `outerHeight - leadIn`; a borda
    abre para `innerR + leadIn` e guia a lata.
  - O fundo tem um anel de apoio de 3,2 mm de espessura; o furo central de 10 mm
    alivia a sucção, deixa o ar entrar e a condensação sair.
- `getEffectiveLeadIn` e `getEffectiveRimChamfer` limitam os valores pedidos
  para preservar `MIN_TOP_LAND_MM` (0,8 mm) de parede no topo. A validação
  `can-rim` usa a regra crua, antes do clamp do perfil.
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
  (`handleHeight ± handleWidth / 2`), que precisa ficar sobre a parede. O laço em
  D pode ultrapassar a borda superior do corpo sem invalidar a peça; a v1 não
  recorta o laço.
- O corpo é impresso em pé, com o fundo na mesa, sem suporte.
- A alça é impressa em pé, apoiada na borda inferior do laço; a abraçadeira de
  200° exige suporte sob toda a sua face inferior, não apenas um apoio pontual.
- O texto não pode invadir a borda, o fundo, o arco da abraçadeira nem a área do
  laço; a validação garante margem de 2 mm.
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
  → dimensões derivadas (inner/outer/altura exposta/top land)
  → perfil do corpo com furo de ventilação
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
- O corpo sai como construído (em pé). A alça também sai em pé, apoiada na
  borda inferior do laço, sem rotação.
- A alça desabilitada não gera arquivo.
- O STL não carrega cor; o furo de ventilação faz parte do corpo e não há peça
  solta.

## Validação

| Código | Severidade | Regra |
|---|---|---|
| `can-cavity` | error | profundidade fora de 80–118 mm ou lata exposta abaixo de 6 mm |
| `can-clearance` | warning | folga fora de 0,5–1,2 mm (defensiva) |
| `can-vent` | error | furo grande demais: raio do furo > raio interno − 3 mm |
| `can-rim` | error | parede do topo abaixo de 0,8 mm (valores crus, antes do clamp) |
| `can-wall` | error | parede abaixo de 1,8 mm (defensiva; a UI já limita) |
| `can-bottom` | error | fundo abaixo de 2 mm (defensivo, inalcançável pelo schema) |
| `can-text-fit` | warning | estimativa do texto (0,68 × tamanho por caractere) pode exceder o arco útil de 120°; o build usa a fonte real e faz auto-fit |
| `can-text-band` | error | texto cruza a borda ou o fundo; a faixa usa `1,1 × textSize` já escalado pelo auto-fit e margem de 2 mm |
| `can-handle-gap` | warning | abertura vertical da mão abaixo de 26 mm |
| `can-handle-reach` | warning | menor largura do furo da mão abaixo de 16 mm |
| `can-handle-fit` | warning | folga nominal acima de `HANDLE_FIT_INTERFERENCE` (0,4 mm); a interferência no topo é sempre absoluta |
| `can-handle-band` | error | a banda da abraçadeira (`handleHeight ± handleWidth / 2`) sai da parede disponível; o laço pode passar da borda |

`can-invalid`, `can-font`, `can-csg` e `can-build` não são códigos de validação:
são falhas de runtime do worker para parâmetros inválidos, carga da fonte, união
do relevo e serialização, respectivamente. O detalhe fica no `console.error` e o
hook traduz o código em mensagem amigável.

Avisos não bloqueiam o build nem o export. Falha de CSG mantém a geometria
anterior e mostra erro no overlay.

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
- **Corpo por revolução:** o build usa o `LatheGeometry` fechado; o relevo
  reutiliza `textToShapes`/`shapesToGeometry` de
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
  (0,4 mm) e `CONTENT_DEPTH` (1 mm).
- **Painel mostra a parede do topo:** `Parede do topo` usa `getTopLand` e expõe o
  valor efetivo depois dos clamps de borda, evitando um helper só de teste.

## Fora de escopo

Modelar a lata ou a curvatura do fundo/pescoço, tampa, parede dupla,
isolamento térmico, canudo, base separada, outras latas (slim, 473 ml etc.),
alça integrada, mais de uma linha de texto, ícone SVG, textura e 3MF/STEP.
