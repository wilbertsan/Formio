# Design: Novo segmento Lembrancinhas

**Data:** 12 de novembro de 2026
**Status:** Aprovado
**Categoria:** Lembrancinhas
**Ferramentas:** porta-vela, mini-vaso, termoformador

## 1. Visão Geral

Criar o segmento **Lembrancinhas** no Studio 3D para presentes personalizados
de festa e evento, além do equipamento de produção de lembrancinhas. Nesta
fase serão criados **apenas pastas e arquivos `AGENTS.md`** — nenhum código de
ferramenta, schema, build, preview ou registro no seletor.

As três ferramentas entram como **planejadas**, seguindo o padrão já usado por
`molde-doces` e `ejetor-brigadeiro`.

## 2. Escopo

### Incluído

- `tools/lembrancinhas/AGENTS.md` com tabela, regras do domínio, invariantes e
  fora de escopo.
- `tools/lembrancinhas/porta-vela/AGENTS.md`.
- `tools/lembrancinhas/mini-vaso/AGENTS.md`.
- `tools/lembrancinhas/termoformador/AGENTS.md`.
- Documento de design e plano de execução em `docs/plans/`.

### Excluído

- Arquivos `.ts`/`.tsx`, schemas, geometria, preview, exportação STL.
- Registro em `StudioPage` ou `ToolSelector`.
- Alteração de `docs/frontend/studio.md`.
- Alteração das categorias existentes.

## 3. Estrutura

```text
src/features/studio/tools/lembrancinhas/
├── AGENTS.md
├── porta-vela/
│   └── AGENTS.md
├── mini-vaso/
│   └── AGENTS.md
└── termoformador/
    └── AGENTS.md
```

O `AGENTS.md` da categoria segue o formato de `confeitaria`, `chaveiros` e
`letreiros`: título, descrição curta, tabela de ferramentas com status, regras
do domínio, invariantes e fora de escopo.

Cada `AGENTS.md` de ferramenta planejada segue o formato de `molde-doces`:
status, objetivo, parâmetros previstos, regras do domínio e fora de escopo.

## 4. Categoria

- **Nome:** Lembrancinhas.
- **Descrição:** presentes personalizados de festa e evento + equipamento de
  produção de lembrancinhas.
- **Ferramentas:** `porta-vela`, `mini-vaso`, `termoformador` — todas
  `planejada`.

Regras do domínio:

- Personalização por nome/idade/digital em relevo de 1 mm.
- Base estável e sem peças soltas; encaixes com folga de impressão.
- PLA não é resistente ao calor: porta-vela orienta uso com vela LED/tea light.
- Mini-vaso deve ser estanque (paredes e fundo sem poros).
- Peças móveis (tampa, pino, base) exportadas separadamente.
- STL sempre manifold, fechado, pronto para impressão.
- 1 unidade Three.js = 1 mm.

## 5. Porta-vela

**Objetivo:** porta-vela personalizado com rebaixo para vela e nome em relevo.

Parâmetros previstos:

- Formato: redondo ou quadrado arredondado.
- Diâmetro/largura: 40–100 mm.
- Altura: 20–80 mm.
- Parede: 2–4 mm.
- Fundo: 2–5 mm.
- Rebaixo: diâmetro 38–60 mm, profundidade 10–25 mm.
- Folga do rebaixo: 0,3–0,5 mm.
- Nome: texto livre, fonte normal/bold/serif, relevo fixo de 1 mm.
- Cor PLA da base e do relevo.

Regras:

- Parede mínima de 2 mm e fundo mínimo de 2 mm.
- Rebaixo centrado, com folga para a vela e sem furar o fundo.
- Nome em relevo de 1 mm na face externa, com margem mínima de 3 mm.
- Sem alças, furos ou partes soltas.
- Indicar uso com vela LED; não prometer resistência a chama.
- Exportação STL única (base + nome mesclados).

Fora de escopo: vela de cera real, suporte de vela de parede, múltiplas velas.

## 6. Mini-vaso

**Objetivo:** vaso paramétrico de mesa para plantas pequenas, com placa de nome
opcional — lembrancinha de batizado, chá de bebê e casamento.

Parâmetros previstos:

- Formato: redondo ou quadrado arredondado.
- Diâmetro/largura: 30–120 mm.
- Altura: 40–150 mm.
- Parede: 1,6–4 mm.
- Fundo: 2–5 mm.
- Raio de canto: 0–20 mm.
- Furo de drenagem: opcional, diâmetro 4–10 mm.
- Nome: texto livre, fonte normal/bold/serif, relevo fixo de 1 mm.
- Cor PLA da base e do relevo.

Regras:

- Parede mínima de 1,6 mm (4 perímetros) e fundo mínimo de 2 mm.
- Fundo com fillet interno para evitar acúmulo de tensão.
- Furo de drenagem centralizado quando habilitado.
- Nome em relevo de 1 mm, com margem mínima de 3 mm.
- Sem suportes de impressão; overhangs suaves.
- Exportação STL única (vaso + nome mesclados).

Fora de escopo: prato de vaso, vaso autoirrigável, plantas com raízes
agressivas, vedação com resina.

## 7. Termoformador

**Objetivo:** gerar equipamento modular de termoformagem para produção de
lembrancinhas, em peças separadas: corpo, tampa, painel perfurado, pino
lateral e base.

O termoformador é uma ferramenta de produção, não uma lembrancinha de mesa.

### Parâmetros previstos

**Dimensões**

- `width`, `depth`: 60–300 mm.
- `height`: 20–120 mm.
- `corner_radius`: 0–40 mm.
- `wall_thickness`: 1,2–6 mm.
- `bottom_thickness`: 1,2–6 mm.
- `rim_height`: 0–10 mm.
- `rim_thickness`: 1,2–6 mm.

**Acabamento**

- `outer_fillet`, `inner_fillet`, `bottom_fillet`, `top_fillet`.
- `edge_chamfer`: 0–3 mm.

**Tampa**

- `lid_enabled`.
- `lid_thickness`: 1,2–6 mm.
- `lid_height`: 0–30 mm.
- `lid_clearance`: 0,1–0,6 mm.
- `lid_corner_radius`: 0–40 mm.
- `lid_fit_depth`: 2–20 mm.
- `fit_type`: `external` ou `internal`.

**Painel frontal**

- `front_panel_width`, `front_panel_height`: 40–300 mm.
- `front_panel_thickness`: 1–5 mm.
- `front_panel_corner_radius`: 0–40 mm.
- `border_width`: 3–20 mm.
- `surface_curvature`: `flat`, `slightly_convex` ou `slightly_concave`.

**Grade**

- `pattern`: `perforated`, `grid` ou `mesh`.
- `hole_diameter`: 0,8–6 mm.
- `hole_spacing_x`, `hole_spacing_y`: 1–10 mm.
- Linhas/colunas automáticas pelo tamanho da região interna.
- `grid_thickness`: 0,8–4 mm.
- `grid_angle`: 0–90°.

**Pino lateral**

- `handle_enabled`.
- `handle_diameter`: 3–20 mm.
- `handle_length`: 5–60 mm.
- `handle_base_diameter`: 4–30 mm.
- `handle_tip_radius`: 0–5 mm.
- `handle_side`: `left`, `right`, `top` ou `bottom`.
- `handle_height`: posição vertical relativa à altura do corpo.

**Base inferior**

- `base_enabled`.
- `base_height`: 0–30 mm.
- `base_thickness`: 1,2–6 mm.
- `base_corner_radius`: 0–40 mm.

**Impressão**

- `nozzle_diameter`: padrão 0,4 mm.
- `minimum_wall`: padrão 0,8 mm.
- `minimum_feature`: padrão 0,8 mm.
- `print_clearance`: padrão 0,2–0,3 mm.

### Regras do domínio

- Corpo é um sólido único com cavidade interna e fundo plano.
- Tampa é independente e usa `fit_type` + `lid_clearance` para o encaixe.
- Painel frontal preserva moldura sólida de `border_width`; a grade ocupa
  somente a região interna.
- Grade e furos respeitam `minimum_feature` e `minimum_wall`.
- Pino lateral é perpendicular à lateral escolhida e não invade a cavidade.
- Base inferior é independente e, quando desabilitada, o corpo apoia
  diretamente no fundo.
- Evitar operações booleanas desnecessárias; validar a malha ao final.
- STL sempre manifold, fechado, sem auto-interseções e sem peças soltas.

### Pipeline previsto

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

### Exportação

- STLs separados: `body`, `lid`, `front-panel`, `handle`, `base`.
- Ação "Exportar tudo" gera todos os componentes habilitados.
- STL binário nesta fase; 3MF/STEP fora de escopo.
- Peças desabilitadas não são exportadas.

### Validação

- Paredes abaixo de `minimum_wall`.
- Elementos da grade abaixo de `minimum_feature`.
- Furos menores que `minimum_feature`.
- Interseções inválidas e malha não-manifold.
- Componentes desconectados.
- Folga insuficiente entre tampa e corpo.
- Grade sem moldura sólida ou fora da região interna.

### Fora de escopo

- Reconstrução fotogramétrica exata da imagem de referência.
- Motor CSG pesado sem validação; 3MF/STEP nesta fase.
- Aquecimento, vácuo, bomba ou eletrônica do equipamento.
- Outros componentes além de corpo, tampa, painel, pino e base.

## 8. Documentação

Nesta fase:

- criar os quatro `AGENTS.md`;
- criar este design em `docs/plans/2026-11-12-lembrancinhas-design.md`;
- criar o plano de execução em
  `docs/plans/2026-11-12-lembrancinhas.md`.

Não atualizar `docs/frontend/studio.md` até a implementação das ferramentas.

## 9. Decisões

- Seguir o padrão de categoria já existente: um `AGENTS.md` por pasta.
- Status `planejada` para as três ferramentas, sem código.
- Termoformador fica em Lembrancinhas por ser o equipamento de produção do
  segmento.
- Porta-vela e mini-vaso compartilham o pipeline de texto em relevo já usado
  em chaveiros/letreiros quando forem implementados.
- Termoformador terá pipeline próprio por exigir cavidade, grade e encaixe.

## 10. Fora de Escopo desta Fase

- Implementação de qualquer ferramenta.
- Registro no seletor e no `StudioPage`.
- Persistência, backend, autenticação e pagamentos.
- Alteração das categorias existentes.
