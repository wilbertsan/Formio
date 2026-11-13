# Ferramenta: Caixa Personalizada

## Status

Implementada (v1).

## Objetivo

Gerar equipamento modular de termoformagem para produção de lembrancinhas, em
peças separadas: corpo, tampa, painel perfurado, pino lateral e base.

## Parâmetros previstos

### Dimensões

- `width`, `depth`: 60–300 mm
- `height`: 20–120 mm
- `corner_radius`: 0–40 mm
- `wall_thickness`: 1,2–6 mm
- `bottom_thickness`: 1,2–6 mm
- `rim_height`: 0–10 mm
- `rim_thickness`: 1,2–6 mm

### Acabamento

- `edge_chamfer`: 0–3 mm

### Tampa

- `lid_enabled`
- `lid_thickness`: 1,2–6 mm
- `lid_height`: 0–30 mm
- `lid_clearance`: 0,1–0,6 mm
- `lid_corner_radius`: 0–40 mm
- `lid_fit_depth`: 2–20 mm
- `fit_type`: `external` ou `internal`

### Painel frontal

- `front_panel_width`, `front_panel_height`: 40–300 mm
- `front_panel_thickness`: 1–5 mm
- `front_panel_corner_radius`: 0–40 mm
- `border_width`: 3–20 mm
- `surface_curvature`: `flat`, `slightly_convex` ou `slightly_concave`

### Grade

- `pattern`: `perforated`, `grid` ou `mesh`
- `hole_diameter`: 0,8–6 mm
- `hole_spacing_x`, `hole_spacing_y`: 1–10 mm
- Linhas/colunas automáticas pelo tamanho da região interna
- `grid_thickness`: 0,8–4 mm
- `grid_angle`: 0–90°

### Pino lateral

- `handle_enabled`
- `handle_diameter`: 3–20 mm
- `handle_length`: 5–60 mm
- `handle_base_diameter`: 4–30 mm
- `handle_tip_radius`: 0–5 mm
- `handle_side`: v1 expõe `left` e `right`; `top` e `bottom` ficam reservados
  e avisam via código `handle-side`
- `handle_height`: posição vertical relativa à altura do corpo

### Base inferior

- `base_enabled`
- `base_height`: 0–30 mm
- `base_thickness`: 1,2–6 mm
- `base_corner_radius`: 0–40 mm

### Impressão

- `minimum_wall` e `minimum_feature`: constantes fixas de 0,8 mm usadas apenas
  na validação
- `print_clearance`: padrão 0,2–0,3 mm

## Regras do domínio

- Corpo é um sólido único com cavidade interna e fundo plano
- Tampa é independente e usa `fit_type` + `lid_clearance` para o encaixe
- Painel frontal preserva moldura sólida de `border_width`; a grade ocupa
  somente a região interna
- Grade e furos respeitam `minimum_feature` e `minimum_wall`
- Pino lateral é perpendicular à lateral escolhida e não invade a cavidade
- Base inferior é independente e, quando desabilitada, o corpo apoia
  diretamente no fundo
- Evitar operações booleanas desnecessárias; validar a malha ao final
- STL sempre manifold, fechado, sem auto-interseções e sem peças soltas

## Pipeline previsto

```text
Parâmetros
  → contorno externo arredondado
  → extrusão
  → cavidade interna
  → fillets
  → borda superior
  → encaixe da tampa
  → painel frontal
  → matriz de furos/grade
  → pino lateral
  → base
  → validação de geometria
  → exportação STL
```

## Exportação

- STLs separados: `corpo`, `tampa`, `painel`, `pino`, `base`
- "Exportar tudo" gera todos os componentes habilitados
- Peças desabilitadas não são exportadas
- STL binário nesta fase; 3MF/STEP fora de escopo

## Validação

- Paredes abaixo de `minimum_wall`
- Elementos da grade abaixo de `minimum_feature`
- Furos menores que `minimum_feature`
- Interseções inválidas e malha não-manifold
- Componentes desconectados
- Folga insuficiente entre tampa e corpo
- Grade sem moldura sólida ou fora da região interna

## Decisões da v1

- Corpo, tampa e base são **lofts de anéis** de retângulo arredondado, sem CSG.
  A base usa `buildRingShell`, um anel loftado com amostragem exata de cantos e
  arestas (não `ExtrudeGeometry`). O raio interno da base segue o raio do canto
  do corpo + `printClearance`; `baseCornerRadius` é um teto e
  `getBaseDimensions` reporta o valor efetivo.
- Os quatro fillets previstos (`outer_fillet`, `inner_fillet`, `bottom_fillet`,
  `top_fillet`) foram substituídos por um único `edgeChamfer` (0–3 mm, default
  0,4 mm) aplicado às arestas externas de corpo, tampa e base. Fillets 3D reais
  ficam fora da v1.
- O painel é **montado na face frontal** do corpo (+Z), sem janela passante. A
  moldura sólida de `borderWidth` é preservada e os furos são recortados contra
  o retângulo interno arredondado. A grade é limitada a **800 aberturas**
  (`MAX_PANEL_OPENINGS`); se exceder, o espaçamento cresce 15% por iteração.
  `grid` e `mesh` usam um epsilon de 0,001 rad somente no builder para manter a
  triangulação do earcut fechada.
- Na tampa `external`, o raio interno é um teto (`bodyRadius + lidClearance`) e
  o externo é `inner + lidThickness`; `lidCornerRadius` é um pedido limitado pelo
  encaixe do corpo, e `getLidDimensions` reporta o valor efetivo. A tampa
  externa assenta em `lidHeight = 0`; valores maiores elevam a tampa no preview e
  exigem junta/suporte. No encaixe `internal`, a tampa é um plugue dentro da
  abertura (sem flange de apoio) e `lidFitDepth` é limitado a
  `bodyTop - bottomThickness` para não atingir o fundo.
- O pino usa flange **colado na face**, sem furo passante. O raio da ponta é
  limitado ao raio da haste (`min(handleTipRadius, availableTip, shaftRadius)`) e
  os triângulos degenerados do polo do `LatheGeometry` são removidos. A UI
  restringe a lateral a `left`/`right`; `top`/`bottom` ficam reservados e avisam
  via `handle-side`.
- A montagem é validada com avisos de colisão: painel/base, painel/tampa,
  pino/base e pino/tampa (`panel-base`, `panel-lid`, `handle-base-collision`,
  `handle-lid-collision`).
- Duas cores no preview: `bodyColor` no corpo e `accentColor` na tampa, painel,
  pino e base. Troca de cor não rebuilda geometria; o STL exportado não carrega
  cor.
- O export usa o snapshot **`builtParams`** do build (não os parâmetros atuais)
  para desfazer a matriz de posicionamento do pino e centralizar cada peça.
- `nozzleDiameter`, 3MF e STEP ficam fora da v1. `nozzleDiameter` não altera a
  geometria; a impressão usa `printClearance` e as constantes de 0,8 mm.
- `frontPanelHeight` tem default **50 mm** (não 80 mm) para caber no corpo
  padrão (`height 60 + rimHeight 3`) sem aviso inicial.

## Fora de escopo

Reconstrução fotogramétrica exata, 3MF/STEP nesta fase, aquecimento, vácuo,
bomba, eletrônica e outros componentes além de corpo, tampa, painel, pino e
base.
