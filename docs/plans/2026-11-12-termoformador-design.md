# Termoformador — Design

**Data:** 2026-11-12
**Ferramenta:** `lembrancinhas/termoformador`
**Status:** design aprovado; implementado (v1)

## Objetivo

Criar a ferramenta **Termoformador** no Studio 3D, gerando um equipamento
modular de termoformagem em cinco peças separadas:

- corpo
- tampa
- painel frontal perfurado
- pino lateral
- base inferior

Cada peça é exportada como STL binário independente. Peças desabilitadas não
são geradas nem exportadas.

## Abordagem

**Malha por loft + geometrias nativas, sem CSG.**

- Corpo e tampa usam um loft de anéis de retângulo arredondado. A casca já nasce
  fechada e manifold, com fundo, paredes, cavidade, rim e encaixe.
- Painel usa `ExtrudeGeometry` com furos nativos no `Shape`.
- Base usa um anel extrudado.
- Pino usa `LatheGeometry` com um único perfil fechado.

Alternativas descartadas:

- **Extrude + `three-bvh-csg`:** menos código, mas risco de artefatos
  coplanares, malha não-manifold e custo alto no worker.
- **Extrusão + merge do fundo:** cria arestas não-manifold na junção
  fundo/parede, violando o invariante de malha fechada.

## Arquitetura de arquivos

```text
src/features/studio/tools/lembrancinhas/termoformador/
  schema.ts                    # Zod, defaults, cores, constantes
  shapes.ts                    # retângulo arredondado, loops e paths
  shell.ts                     # loft genérico de casca (corpo/tampa)
  buildBody.ts
  buildLid.ts
  buildFrontPanel.ts
  panelPattern.ts              # grade, furos, limite de aberturas
  buildHandle.ts
  buildBase.ts
  validateThermoformer.ts
  buildThermoformer.ts         # orquestra e posiciona as peças
  workerGeometry.ts            # serializa as cinco peças
  workerClient.ts
  buildThermoformer.worker.ts
  useThermoformer.ts
  exportStl.ts
  StudioPanel.tsx
  ThermoformerPreview.tsx
```

Integração:

- `src/features/studio/components/ToolSelector.tsx` — nova categoria
  **Lembrancinhas** e card **Termoformador**.
- `src/features/studio/StudioPage.tsx` — lazy import, wrapper, exportação e
  estados de build.

## Parâmetros da v1

Todos em camelCase, validados por Zod.

### Dimensões

| Parâmetro | Faixa | Default |
|---|---|---|
| `width` | 60–300 | 160 |
| `depth` | 60–300 | 120 |
| `height` | 20–120 | 60 |
| `cornerRadius` | 0–40 | 10 |
| `wallThickness` | 1,2–6 | 2,4 |
| `bottomThickness` | 1,2–6 | 2,4 |
| `rimHeight` | 0–10 | 3 |
| `rimThickness` | 1,2–6 | 3 |

### Acabamento

| Parâmetro | Faixa | Default |
|---|---|---|
| `edgeChamfer` | 0–3 | 0,4 |

Os quatro fillets previstos (`outer_fillet`, `inner_fillet`, `bottom_fillet`,
`top_fillet`) são substituídos por um único `edgeChamfer` aplicado às arestas
externas do corpo, tampa e base. Fillets 3D reais ficam fora da v1.

### Tampa

| Parâmetro | Faixa | Default |
|---|---|---|
| `lidEnabled` | boolean | true |
| `lidThickness` | 1,2–6 | 2,4 |
| `lidHeight` | 0–30 | 6 |
| `lidClearance` | 0,1–0,6 | 0,3 |
| `lidCornerRadius` | 0–40 | 14 |
| `lidFitDepth` | 2–20 | 6 |
| `fitType` | `external` \| `internal` | `external` |

`lidHeight` é a altura interna da tampa acima da borda do corpo; a placa
superior começa nessa altura. `lidFitDepth` é a sobreposição vertical da saia
sobre o corpo/cavidade.

### Painel frontal

| Parâmetro | Faixa | Default |
|---|---|---|
| `frontPanelWidth` | 40–300 | 140 |
| `frontPanelHeight` | 40–300 | 50 |
| `frontPanelThickness` | 1–5 | 3 |
| `frontPanelCornerRadius` | 0–40 | 8 |
| `borderWidth` | 3–20 | 8 |
| `surfaceCurvature` | `flat` \| `slightly_convex` \| `slightly_concave` | `flat` |
| `pattern` | `perforated` \| `grid` \| `mesh` | `perforated` |
| `holeDiameter` | 0,8–6 | 2,5 |
| `holeSpacingX` | 1–10 | 5 |
| `holeSpacingY` | 1–10 | 5 |
| `gridThickness` | 0,8–4 | 1,5 |
| `gridAngle` | 0–90 | 0 |

> Nota de implementação: o default de `frontPanelHeight` foi ajustado para
> 50 mm para caber no corpo padrão (`height 60 + rimHeight 3`) sem aviso inicial.

### Pino lateral

| Parâmetro | Faixa | Default |
|---|---|---|
| `handleEnabled` | boolean | true |
| `handleDiameter` | 3–20 | 8 |
| `handleLength` | 5–60 | 25 |
| `handleBaseDiameter` | 4–30 | 16 |
| `handleTipRadius` | 0–5 | 2 |
| `handleSide` | `left` \| `right` \| `top` \| `bottom` | `right` |
| `handleHeight` | 0–1 | 0,5 |

`handleHeight` é a posição relativa ao longo da lateral escolhida: vertical em
`left/right`, horizontal em `top/bottom`.

### Base inferior

| Parâmetro | Faixa | Default |
|---|---|---|
| `baseEnabled` | boolean | true |
| `baseHeight` | 0–30 | 6 |
| `baseThickness` | 1,2–6 | 2,4 |
| `baseCornerRadius` | 0–40 | 13 |

### Impressão e aparência

| Parâmetro | Faixa | Default |
|---|---|---|
| `printClearance` | 0,2–0,3 | 0,25 |
| `bodyColor` | PLA_COLORS | `#22c55e` |
| `accentColor` | PLA_COLORS | `#f5f5f5` |

`minimumWall` e `minimumFeature` são constantes de 0,8 mm usadas apenas na
validação. `nozzleDiameter` fica fora da v1 por não alterar a geometria.

## Geometria por peça

### Corpo

Casca loftada com:

- fundo plano de `bottomThickness`;
- cavidade interna com `wallThickness`;
- rim de `rimHeight` e `rimThickness` (espessura radial, nunca menor que
  `wallThickness`);
- chanfro `edgeChamfer` nos extremos externos.

Superfícies: fundo externo, parede externa, parede interna, fundo interno,
degrau do rim, parede interna do rim e anel superior. Todas costuradas por
anéis com o mesmo número de pontos; triângulos orientados por normal de
referência e `computeVertexNormals()`.

### Tampa

Casca fechada em cima e aberta embaixo:

- placa superior com `lidThickness`;
- saia com `lidFitDepth`;
- altura interna `lidHeight` acima da borda do corpo;
- `fitType external`: envolve o corpo com `lidClearance`;
- `fitType internal`: encaixa dentro da abertura do rim com `lidClearance`.

A tampa é posicionada com a saia sobre o corpo, de modo que a face inferior da
placa fique a `lidHeight` acima da borda.

### Painel frontal

- Retângulo arredondado com moldura sólida de `borderWidth`.
- Furos somente na região interna.
- `perforated`: círculos de `holeDiameter`.
- `grid`: quadrados alinhados, rotacionados por `gridAngle`.
- `mesh`: losangos (quadrados rotacionados em 45° + `gridAngle`).
- Espaçamento centro-a-centro `holeSpacingX/Y`; o tamanho efetivo é reduzido
  para preservar `gridThickness` entre aberturas.
- Linhas e colunas calculadas pelo tamanho da região interna.
- Limite de ~800 aberturas para manter o worker responsivo; se exceder, o
  espaçamento é aumentado e a validação informa o ajuste.
- Curvatura aplicada apenas na face frontal: convexa empurra a face para fora;
  côncava recua sem comprometer a espessura mínima. A face traseira permanece
  plana para apoiar no corpo.
- Peça apoiada na face frontal do corpo, sem abrir janela no corpo.

### Pino lateral

- Perfil de revolução com flange de `handleBaseDiameter`, haste de
  `handleDiameter`, comprimento `handleLength` e ponta arredondada de
  `handleTipRadius`.
- Perpendicular à lateral escolhida, apoiado na face externa.
- Não atravessa a parede nem invade a cavidade.

### Base inferior

- Anel/pedestal extrudado.
- Face interna com folga `printClearance` em relação ao corpo.
- Altura `baseHeight`, espessura radial `baseThickness`, raio externo
  `baseCornerRadius`.
- Quando desabilitada, o corpo apoia diretamente no fundo.

### Montagem

- Corpo com a base em `y = 0`, centrado em X/Z.
- Base envolvendo a parte inferior do corpo.
- Tampa sobre a borda do corpo.
- Painel centrado na face frontal.
- Pino na lateral escolhida, com a base apoiada na face.

## Pipeline de dados

```text
StudioPanel
  → useThermoformer (reducer + debounce 250 ms)
  → buildThermoformer.worker.ts
  → buildThermoformer.ts
      → buildBody / buildLid / buildFrontPanel / buildHandle / buildBase
      → validateThermoformer (main thread, antes do build)
  → workerGeometry.ts (serializa as cinco peças)
  → ThermoformerPreview (R3F, duas cores)
  → exportStl.ts (um STL por peça habilitada)
```

- `useThermoformer` expõe `params`, `geometry`, `isBuilding`, `error`,
  `issues`, `dimensions`, `cameraPosition`, `fitRadius`, `updateParam` e
  `reset`.
- Troca de cor não rebuilda geometria; apenas troca o material.
- Resultados de worker obsoleto são ignorados; a peça anterior permanece
  visível durante o rebuild.
- Falha no worker aparece no overlay de erro do Studio.

## Validação

`validateThermoformer(params)` retorna uma lista de `issues` com severidade
`error` ou `warning`.

Principais verificações:

- moldura do painel sem área útil;
- furos ou nervuras abaixo de `minimumFeature`;
- painel maior que a face frontal do corpo;
- folga da tampa menor que `printClearance`;
- tampa interna sem cavidade possível;
- flange do pino maior que a lateral disponível;
- `lidFitDepth` maior que a altura do corpo;
- base mais alta que o corpo;
- limite de aberturas do painel atingido;
- raios de canto acima da metade das dimensões.

O build continua com clamps seguros; erros e avisos aparecem no painel. A
validação não bloqueia os sliders.

## UI

Painel com as seções:

1. Dimensões
2. Acabamento
3. Painel frontal
4. Tampa
5. Pino lateral
6. Base
7. Impressão
8. Aparência
9. Validação

Controles condicionais:

- parâmetros de tampa só aparecem com `lidEnabled`;
- parâmetros do pino só aparecem com `handleEnabled`;
- parâmetros da base só aparecem com `baseEnabled`;
- `gridAngle` só aparece para `grid` e `mesh`.

Componentes Amplify UI reutilizados: `Accordion`, `SliderField`,
`SelectField`, `SwitchField`, `RadioGroupField`, `Alert`, `Button`, `Flex`,
`Heading`, `Text` e `View`.

O seletor ganha a categoria **Lembrancinhas** com o card **Termoformador**.
As categorias existentes permanecem.

## Exportação

Um clique em Exportar baixa os STLs separados das peças habilitadas:

```text
<nome>-corpo.stl
<nome>-tampa.stl
<nome>-painel.stl
<nome>-pino.stl
<nome>-base.stl
```

Orientações de impressão:

- corpo e base: como construídos;
- tampa: invertida, com a placa na mesa e a saia para cima;
- painel: deitado, com a face traseira na mesa;
- pino: em pé sobre o flange.

Todas as peças são centralizadas na mesa antes do download. As geometrias de
preview não são mutadas: o export usa clones.

## Testes

- `schema.test.ts`: defaults, faixas, enums e clamps.
- `shapes.test.ts` / `shell.test.ts`: loops, dimensões e malha fechada por
  arestas.
- `buildBody.test.ts`: fundo, cavidade, rim e manifold.
- `buildLid.test.ts`: external/internal, alturas e manifold.
- `panelPattern.test.ts`: contagem de furos, espaçamento, limite e rotação.
- `buildFrontPanel.test.ts`: moldura, furos e curvatura.
- `buildHandle.test.ts`: perfil, orientação e manifold.
- `buildBase.test.ts`: anel, folga e manifold.
- `buildThermoformer.test.ts`: peças habilitadas/desabilitadas e montagem.
- `validateThermoformer.test.ts`: erros e avisos.
- `workerGeometry.test.ts`: roundtrip das cinco peças.
- `useThermoformer.test.ts`: debounce, worker, erro, cores sem rebuild,
  dimensões e reset.
- `StudioPanel.test.tsx`: seções, condicionais, validação e reset.
- `ThermoformerPreview.test.tsx`: sem geometria e com geometria.
- `exportStl.test.ts`: cinco downloads, nomes, peças desabilitadas e
  orientações de impressão.
- `ToolSelector.test.tsx` e `StudioPage.test.tsx`: nova categoria e abertura da
  ferramenta.

## Documentação

- Atualizar `docs/frontend/studio.md` com a ferramenta, os arquivos e as
  decisões.
- Atualizar `src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md`
  com status e decisões da v1.
- Atualizar `src/features/studio/tools/lembrancinhas/AGENTS.md` com o status da
  ferramenta.

## Fora de escopo na v1

- Fillets 3D reais e controle separado de `outer/inner/bottom/top`.
- Janela frontal no corpo ou encaixe passante do painel.
- Furo passante para o pino lateral.
- Curvatura produzida por molde real; a v1 aproxima só a face frontal.
- `nozzleDiameter`, 3MF, STEP, aquecimento, vácuo, bomba e eletrônica.
- Reconstrução fotogramétrica.

## Atualizações de implementação

Desvios encontrados durante a execução em relação ao design original:

- A base usa um **loft de anel próprio** (`buildRingShell`, em `shell.ts`) em vez
  de `ExtrudeGeometry`. O anel amostra cantos e arestas com contagem exata,
  aplica `printClearance` na face interna e limita o chanfro para manter pelo
  menos `MINIMUM_FEATURE_MM` (0,8 mm) de anel no topo.
- Na tampa externa, o raio interno é um **teto** (`bodyRadius + lidClearance`) e
  o externo é `inner + lidThickness`. `lidCornerRadius` é apenas um pedido,
  limitado pelo encaixe do corpo; o valor efetivo é reportado por
  `getLidDimensions`.
- A profundidade do encaixe interno (`lidFitDepth`) é limitada a
  `bodyTop - bottomThickness` para não atingir o fundo do corpo.
- Os furos do painel são recortados contra o **retângulo interno arredondado**
  (cantos respeitados) e a grade tem teto de 800 aberturas. `grid` e `mesh`
  recebem um epsilon de 0,001 rad somente no builder para o earcut fechar a
  malha.
- O raio da ponta do pino é limitado ao raio da haste; os triângulos
  degenerados do polo do `LatheGeometry` são removidos; o posicionamento em
  `top`/`bottom` é medido ao longo da largura e limitado dentro do corpo
  (0,5 = centrado).
- O preview usa duas cores (`bodyColor` no corpo e `accentColor` nas demais
  peças); troca de cor não rebuilda geometria e o STL não carrega cor.
- O export usa o snapshot **`builtParams`** do build para o transform do pino,
  em vez dos parâmetros correntes do painel.
- O limite de **800 aberturas** e os códigos finais de validação
  (`corner-radius`, `wall`, `panel-border`, `panel-empty`, `panel-hole`,
  `panel-rib`, `panel-density`, `panel-overhang`, `panel-height`, `panel-radius`,
  `lid-clearance`, `lid-fit-depth`, `lid-internal`, `handle-tip`, `handle-base`,
  `handle-flange`, `base-height`, `base-thin`) foram confirmados na
  implementação.
