# Ferramenta: Caneca Personalizada

## Status

Implementada (v1: corpo + relevo + alça de abraçadeira).

## Objetivo

Gerar uma caneca de parede simples com nome/idade em relevo de 1 mm no corpo e
uma alça removível de encaixe por pressão. São duas peças independentes: o corpo
(com o relevo) e a alça (abraçadeira em C com laço em D). O corpo é um sólido de
revolução; a alça abraça o corpo na altura escolhida, sem trilho e sem alterar a
parede. Os dois STLs saem separados.

Parede dupla, tampa, base separada, canudo, mais de uma linha de texto, ícone
SVG e 3MF/STEP ficam para versões seguintes.

## Parâmetros

### Corpo

| Parâmetro | Faixa | Default |
|---|---|---|
| `diameterTop` | 70–100 mm | 80 |
| `diameterBottom` | 60–95 mm | 72 |
| `height` | 80–115 mm | 88 |
| `wallThickness` | 1,8–4 mm | 2,4 |
| `bottomThickness` | 2–6 mm | 3,2 |
| `rimChamfer` | 0–2 mm | 0,6 |
| `bodyColor` | 10 cores PLA | `#14b8a6` |

### Alça

| Parâmetro | Faixa | Default |
|---|---|---|
| `handleEnabled` | booleano | `true` |
| `handleHeight` | 35–85 mm | 52 |
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

`textDepth` é fixo em 1 mm (`CONTENT_DEPTH`).

## Regras do domínio

- 1 unidade Three.js = 1 mm
- O corpo é um sólido único e fechado, gerado por `LatheGeometry` a partir de um
  perfil 2D fechado; não há CSG no corpo além da união do relevo.
- O relevo do texto é sempre positivo em 1 mm, unido ao corpo por CSG, e fica
  centralizado no lado oposto à alça (180° a partir do +X).
- A alça é uma peça separada, unida por pressão e montada por baixo, com
  abraçadeira em C de 200° centrada no +X e laço em D. `handleClearance` é a
  folga nominal na altura `handleHeight`; no topo a interferência é absoluta de
  0,4 mm (`HANDLE_FIT_INTERFERENCE`) para qualquer `handleClearance`, e na base
  a folga é `handleClearance + 0,4 mm`.
- O raio interno da abraçadeira é o raio externo do corpo na altura `y` mais um
  offset quadrático que fixa a interferência absoluta no topo
  (`getBandInnerRadius`); a abraçadeira acompanha a conicidade do corpo.
- O laço em D fica no plano vertical XY, extrudado na largura `handleWidth`, com
  a borda esquerda seguindo o perfil do corpo a
  `handleClearance + HANDLE_LOOP_INSET` da parede. A abertura da mão é
  `handleGap` na vertical e
  `handleReach - handleClearance - HANDLE_LOOP_INSET - 2 * handleBand` na
  horizontal, medida em `handleHeight`; a validação usa a menor largura do furo
  trapezoidal (`handOpeningMinWidth`).
- A alça é impressa em pé, apoiada na borda inferior do laço; a abraçadeira de
  200° exige suporte sob toda a sua face inferior, não apenas um apoio pontual.
- O corpo é impresso em pé, com o fundo na mesa, sem suporte.
- O texto não pode invadir a borda, o fundo, o arco da abraçadeira nem a área do
  laço; a validação garante margem.
- O texto é curvado no raio externo do corpo na altura `textCenterY`; o arco
  efetivo é calculado pelo comprimento do texto e limitado pelo Zod.
- Capacidade exibida é o volume interno útil (tronco de cone), em ml.
- STL sempre manifold, fechado, sem auto-interseções e sem peças soltas.
- Sem CSG para a alça no corpo; o CSG da alça é interno (abraçadeira + laço).

## Pipeline

```text
Parâmetros
  → schema + validação
  → perfil do corpo (fundo, parede, borda, cavidade)
  → buildBody (LatheGeometry)
  → textToShapes + curvatura no raio
  → CSG union(texto, corpo)
  → buildHandle (abraçadeira + laço + CSG interno)
  → buildMug ({ body, handle })
  → worker + serialização
  → preview montado / export dos dois STLs
```

## Exportação

- Dois STLs binários: `<nome>-corpo.stl` e `<nome>-alca.stl`
- Cada peça centralizada na mesa, com a base em `y = 0`
- A alça é impressa em pé, apoiada na borda inferior do laço
- O STL não carrega cor

## Validação

- `mug-taper`: diâmetro do topo menor que o da base
- `mug-wall`: parede abaixo de 1,8 mm (defensiva; a UI já limita)
- `mug-bottom`: fundo abaixo de 2 mm (defensivo, inalcançável pelo schema)
- `mug-text-fit`: estimativa do texto (0,68 × tamanho por caractere) pode
  exceder o arco útil de 120°; o build usa a fonte real e faz auto-fit, então o
  arco limitado mantém o texto longe da abraçadeira de 200°
- `mug-text-band`: texto cruza a borda ou o fundo, limitado por
  `height − chanfro efetivo − 2` e pela altura real do glifo
  (`1,1 × textSize`, já escalada pelo auto-fit); o limite inferior é defensivo,
  inalcançável pelo schema
- `mug-handle-gap`: abertura vertical da mão abaixo de 26 mm
- `mug-handle-reach`: a menor largura do furo trapezoidal da mão é insuficiente
- `mug-handle-fit`: folga nominal da abraçadeira acima de
  `HANDLE_FIT_INTERFERENCE` (0,4 mm) no meio da altura; a interferência no topo
  é absoluta para qualquer folga
- `mug-handle-band`: o vão vertical completo do laço
  (`handleHeight ± (handleGap / 2 + handleBand)`) sai da parede disponível
  (o limite inferior de 2 mm é defensivo, inalcançável pelo schema)
- `mug-capacity`: capacidade abaixo de 150 ml ou acima de 500 ml (o limite
  inferior é defensivo, inalcançável pelo schema)

`mug-invalid`, `mug-font`, `mug-csg` e `mug-build` não são códigos de validação:
são falhas de runtime do worker para parâmetros inválidos, carga da fonte, união
do relevo e serialização, respectivamente. O detalhe fica no `console.error` e o
hook traduz o código em mensagem amigável.

Avisos não bloqueiam o build nem o export. Falha de CSG mantém a geometria
anterior e mostra erro no overlay.

## Decisões da v1

- O corpo usa `LatheGeometry` com perfil fechado no plano `(r, y)`; os
  triângulos degenerados do eixo são removidos, como no suporte do Termoformador.
- O relevo reutiliza `textToShapes` e `shapesToGeometry` de
  `confeitaria/shared/textOutline.ts`, depois curva os vértices no raio local do
  corpo antes da união por CSG.
- A alça não usa trilho: uma abraçadeira em C elimina a necessidade de alterar a
  parede e mantém o corpo um sólido de revolução. A fixação é por pressão e a
  peça é removível.
- A abraçadeira tem interferência absoluta de 0,4 mm no topo e 0,4 mm de folga
  extra na base em relação à folga nominal: a peça entra por baixo, aperta na
  altura escolhida e trava sem trilho.
- A borda esquerda do laço segue a conicidade do corpo, em vez de uma reta; ela
  fica dentro da espessura da abraçadeira em ≈0,8 mm no topo (default), o que
  garante a sobreposição sólida do CSG sem colidir com a parede.
- Abraçadeira e laço são unidos por CSG dentro da própria alça; o corpo recebe
  CSG apenas do texto.
- O texto fica a 180° da alça para não colidir com a abraçadeira; a câmera
  inicial olha o lado do texto (azimute 210°).
- Duas cores no preview: `bodyColor` no corpo e `accentColor` na alça. Troca de
  cor não rebuilda geometria.
- O build roda em worker; o spike de CSG passou e a abordagem A foi mantida (o
  fallback para a plaqueta curva não foi necessário).
- O `three-bvh-csg` usa `useCDTClipping` (splitter CDT) em todas as uniões. O
  splitter legado deixa T-junctions e arestas abertas nas bordas curvas; o CDT
  produz malha fechada e single-shell. O flag é lido de volta pelo
  `createConformingEvaluator`.
- `geometryCleanup.removeDegenerateTriangles` remove triângulos com vértices
  coincidentes na tolerância de 1e-4 mm (mesma do verificador de manifold) e
  preserva position/normal/uv; é aplicado ao corpo e ao resultado do CSG.
- O relevo usa subdivisão conforme de arestas até 2,5 mm antes de curvar, para
  manter 1 mm de relevo visível também no centro de glifos largos
  (sag ≈ 0,02 mm). O auto-fit limita o arco a 120°.
- O build padrão leva ~0,6 s no worker (fonte já carregada); 20 caracteres em
  18 mm levam ~2,4 s. O gate de teste é 4 s e roda em worker para não travar a
  UI.
- A alça é impressa em pé, apoiada na borda inferior do laço, com suporte sob
  toda a face inferior da abraçadeira de 200°; não há rotação no export.
- O export usa os snapshots de geometria do build (`body` e `handle`) e não
  recebe parâmetros; cada peça é clonada antes de centralizar na mesa.
- `handleWrap` (200°), `HANDLE_RING_THICKNESS` (3,5 mm),
  `HANDLE_FIT_INTERFERENCE` (0,4 mm), `HANDLE_LOOP_INSET` (2 mm),
  `MUG_SEGMENTS` (128) e `CONTENT_DEPTH` (1 mm) são constantes do schema, não
  sliders.

## Fora de escopo

Parede dupla, tampa, base separada, canudo, alça integrada, mais de uma linha de
texto, ícone SVG, textura, 3MF/STEP e outros formatos.
