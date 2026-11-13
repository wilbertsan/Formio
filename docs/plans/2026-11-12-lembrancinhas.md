# Lembrancinhas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Criar o segmento `lembrancinhas` no Studio 3D com três ferramentas planejadas documentadas em `AGENTS.md`.

**Architecture:** Apenas documentação. Uma pasta de categoria com `AGENTS.md` e três subpastas de ferramentas (`porta-vela`, `mini-vaso`, `termoformador`), cada uma com seu `AGENTS.md`, seguindo o padrão de `confeitaria`, `chaveiros` e `letreiros`.

**Tech Stack:** Markdown; nenhum código, teste ou dependência nova.

---

## Contexto

- O design aprovado está em `docs/plans/2026-11-12-lembrancinhas-design.md`.
- O padrão de categoria está em `src/features/studio/tools/letreiros/AGENTS.md`.
- O padrão de ferramenta planejada está em
  `src/features/studio/tools/confeitaria/molde-doces/AGENTS.md`.
- Nenhum arquivo `.ts`/`.tsx` deve ser criado ou alterado.
- `docs/frontend/studio.md` só será atualizado na implementação real.

---

### Task 1: Criar o `AGENTS.md` da categoria

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/AGENTS.md`

**Step 1: Criar o arquivo**

Conteúdo completo:

```markdown
# Categoria: Lembrancinhas

Presentes personalizados de festa e evento, além do equipamento de produção de
lembrancinhas.

## Ferramentas

| Ferramenta | Status |
|---|---|
| porta-vela | planejada |
| mini-vaso | planejada |
| termoformador | planejada |

## Regras do domínio

- Personalização por nome/idade/digital sempre em relevo de 1 mm
- Base estável no apoio; evitar peças soltas
- Encaixes com folga de impressão de 0,2–0,3 mm
- PLA não é resistente ao calor: porta-vela orienta uso com vela LED/tea light
- Mini-vaso estanque: paredes e fundo sem poros
- Peças móveis (tampa, pino, base do termoformador) exportadas separadamente
- STL sempre manifold, fechado, sem auto-interseções
- Termoformador: paredes ≥ 0,8 mm, elementos e furos ≥ 0,8 mm

## Invariantes

- 1 unidade Three.js = 1 mm
- Schema Zod valida todos os parâmetros
- Gerar geometria apenas sob demanda (debounce)
- Build em Web Worker para geometria pesada
- Peças separadas quando houver encaixe ou montagem

## Fora de escopo

Confeitaria, chaveiros, letreiros, landing, backend.
```

**Step 2: Verificar o arquivo**

Run: `sed -n '1,40p' src/features/studio/tools/lembrancinhas/AGENTS.md`

Expected: o conteúdo acima, com a tabela contendo as três ferramentas como
`planejada`.

**Step 3: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/AGENTS.md
git commit -m "docs: add lembrancinhas category"
```

---

### Task 2: Criar o `AGENTS.md` do porta-vela

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/porta-vela/AGENTS.md`

**Step 1: Criar o arquivo**

Conteúdo completo:

```markdown
# Ferramenta: Porta-vela

## Status

Planejada.

## Objetivo

Gerar porta-velas personalizados com rebaixo para vela e nome em relevo.

## Parâmetros previstos

- Formato: redondo ou quadrado arredondado
- Diâmetro/largura: 40–100 mm
- Altura: 20–80 mm
- Espessura da parede: 2–4 mm
- Espessura do fundo: 2–5 mm
- Rebaixo: diâmetro 38–60 mm, profundidade 10–25 mm
- Folga do rebaixo: 0,3–0,5 mm
- Nome: texto livre, fonte normal/bold/serif, relevo fixo de 1 mm
- Cores PLA: base e relevo

## Regras do domínio

- Parede mínima de 2 mm e fundo mínimo de 2 mm
- Rebaixo centrado, com folga para a vela e sem furar o fundo
- Nome em relevo de 1 mm na face externa, com margem mínima de 3 mm
- Sem alças, furos ou partes soltas
- Indicar uso com vela LED; não prometer resistência a chama
- STL único com base e nome mesclados

## Fora de escopo

Vela de cera real, suporte de parede, múltiplas velas, backend.
```

**Step 2: Verificar o arquivo**

Run: `sed -n '1,40p' src/features/studio/tools/lembrancinhas/porta-vela/AGENTS.md`

Expected: o conteúdo acima, começando por `# Ferramenta: Porta-vela`.

**Step 3: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/porta-vela/AGENTS.md
git commit -m "docs: add porta-vela tool spec"
```

---

### Task 3: Criar o `AGENTS.md` do mini-vaso

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/mini-vaso/AGENTS.md`

**Step 1: Criar o arquivo**

Conteúdo completo:

```markdown
# Ferramenta: Mini-vaso

## Status

Planejada.

## Objetivo

Gerar vasos paramétricos de mesa para plantas pequenas, com placa de nome
opcional.

## Parâmetros previstos

- Formato: redondo ou quadrado arredondado
- Diâmetro/largura: 30–120 mm
- Altura: 40–150 mm
- Espessura da parede: 1,6–4 mm
- Espessura do fundo: 2–5 mm
- Raio de canto: 0–20 mm
- Furo de drenagem: opcional, diâmetro 4–10 mm
- Nome: texto livre, fonte normal/bold/serif, relevo fixo de 1 mm
- Cores PLA: base e relevo

## Regras do domínio

- Parede mínima de 1,6 mm (4 perímetros) e fundo mínimo de 2 mm
- Fundo com fillet interno para evitar acúmulo de tensão
- Furo de drenagem centralizado quando habilitado
- Nome em relevo de 1 mm, com margem mínima de 3 mm
- Sem suportes de impressão; overhangs suaves
- STL único com vaso e nome mesclados

## Fora de escopo

Prato de vaso, vaso autoirrigável, vedação com resina, backend.
```

**Step 2: Verificar o arquivo**

Run: `sed -n '1,40p' src/features/studio/tools/lembrancinhas/mini-vaso/AGENTS.md`

Expected: o conteúdo acima, começando por `# Ferramenta: Mini-vaso`.

**Step 3: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/mini-vaso/AGENTS.md
git commit -m "docs: add mini-vaso tool spec"
```

---

### Task 4: Criar o `AGENTS.md` do termoformador

**Files:**
- Create: `src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md`

**Step 1: Criar o arquivo**

Conteúdo completo:

```markdown
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
```

**Step 2: Verificar o arquivo**

Run: `sed -n '1,30p' src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md`

Expected: o conteúdo acima, começando por `# Ferramenta: Termoformador`.

**Step 3: Commit**

```bash
git add src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md
git commit -m "docs: add termoformador tool spec"
```

---

### Task 5: Verificação final e commit da documentação

**Files:**
- Verify: `src/features/studio/tools/lembrancinhas/`
- Create (já criado): `docs/plans/2026-11-12-lembrancinhas-design.md`
- Create: `docs/plans/2026-11-12-lembrancinhas.md`

**Step 1: Verificar a árvore**

Run: `find src/features/studio/tools/lembrancinhas -type f | sort`

Expected:

```text
src/features/studio/tools/lembrancinhas/AGENTS.md
src/features/studio/tools/lembrancinhas/mini-vaso/AGENTS.md
src/features/studio/tools/lembrancinhas/porta-vela/AGENTS.md
src/features/studio/tools/lembrancinhas/termoformador/AGENTS.md
```

**Step 2: Verificar que nenhum código foi alterado**

Run: `git status --short`

Expected: apenas os quatro `AGENTS.md` e os dois arquivos em `docs/plans/`
como novos/alterados.

**Step 3: Verificar o status das ferramentas**

Run: `grep -r "Status" -A1 src/features/studio/tools/lembrancinhas/*/AGENTS.md`

Expected: `Planejada.` nos três `AGENTS.md` de ferramenta.

**Step 4: Commit da documentação restante**

```bash
git add docs/plans/2026-11-12-lembrancinhas-design.md docs/plans/2026-11-12-lembrancinhas.md
git commit -m "docs: add lembrancinhas design and plan"
```

---

## Critérios de Conclusão

- Quatro `AGENTS.md` criados em `lembrancinhas/`.
- Nenhum arquivo de código criado ou alterado.
- Design e plano salvos em `docs/plans/`.
- Commits semânticos `docs:`.
- `git status --short` limpo ao final.
