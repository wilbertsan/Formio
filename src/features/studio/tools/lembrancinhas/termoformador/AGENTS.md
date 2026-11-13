# Ferramenta: Termoformador

## Status

Planejada.

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

- `outer_fillet`, `inner_fillet`, `bottom_fillet`, `top_fillet`
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
- `handle_side`: `left`, `right`, `top` ou `bottom`
- `handle_height`: posição vertical relativa à altura do corpo

### Base inferior

- `base_enabled`
- `base_height`: 0–30 mm
- `base_thickness`: 1,2–6 mm
- `base_corner_radius`: 0–40 mm

### Impressão

- `nozzle_diameter`: padrão 0,4 mm
- `minimum_wall`: padrão 0,8 mm
- `minimum_feature`: padrão 0,8 mm
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

- STLs separados: `body`, `lid`, `front-panel`, `handle`, `base`
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

## Fora de escopo

Reconstrução fotogramétrica exata, 3MF/STEP nesta fase, aquecimento, vácuo,
bomba, eletrônica e outros componentes além de corpo, tampa, painel, pino e
base.
