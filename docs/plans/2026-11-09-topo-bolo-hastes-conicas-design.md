# Design: Topo de Bolo — Hastes cônicas e haste dupla

**Data:** 09 de novembro de 2026
**Status:** Aprovado
**Categoria:** Confeitaria
**Ferramenta:** topo-bolo

## Visão Geral

Substituir a fixação por **base de encaixe** por duas opções de haste:

- `haste` — uma haste vertical com ponta cônica.
- `haste-dupla` — duas hastes verticais paralelas, espaçáveis, cada uma com
  ponta cônica.

A ponta é proporcional ao diâmetro da haste e termina em um pequeno plano de
0,8mm, como um lápis apontado.

## Contexto

Hoje `supportType` aceita `haste` (cilindro único) ou `base` (peça separada com
canaleta e CSG). A base adiciona parâmetros e complexidade que não são mais
desejados. A haste atual é um cilindro reto, sem ponta.

## Decisões

### 1. Tipos de fixação

- `supportType: z.enum(['haste', 'haste-dupla'])`.
- Remover `base` e todos os parâmetros associados:
  - `baseWidth`, `baseDepth`, `slotWidth`, `slotDepth`.
  - `buildBase`, `BASE_FLOOR`, `SLOT_CLEARANCE`, `BASE_GAP`.
  - CSG (`three-bvh-csg`) deixa de ser usado no topo de bolo.
- Padrão continua `haste`.

### 2. Geometria da haste

**Abordagem escolhida:** uma única `LatheGeometry` com perfil de cilindro +
ponta cônica. Forma um sólido fechado, sem faces internas.

- `stemLength` continua sendo o comprimento total da haste (topo a ponta).
- `tipLength = min(stemDiameter * 2.5, stemLength * 0.5)`.
- Ponta plana final com `STEM_TIP_FLAT_DIAMETER = 0.8mm`.
- `STEM_EMBED = 2mm` mantido: o topo da haste entra 2mm na placa.
- A haste continua sendo posicionada sob o fundo real da placa via raycast.

**Alternativas rejeitadas:**

- Cilindro + cone mesclados: deixaria tampas internas na junção.
- União booleana CSG: mais pesada e desnecessária para um perfil de revolução.

### 3. Haste dupla

- Duas hastes verticais paralelas e iguais.
- Novo parâmetro `stemSpacing` (10–40mm, padrão 20mm).
- Posições em `x = ±stemSpacing / 2`, simétricas em relação ao centro da placa.
- Cada haste faz raycast no próprio X para achar o fundo local da placa.
- Se o X estiver fora da placa, a haste desliza em direção ao centro até
  encontrar material.
- Ambas usam o mesmo diâmetro, comprimento e ponta cônica.
- Em contornos irregulares, as pontas podem ficar em alturas diferentes; nivelar
  exigiria comprimentos distintos por haste e fica fora de escopo.

### 4. Schema e estado

- Adicionar `stemSpacing: z.number().min(10).max(40)`.
- Remover os parâmetros de base do schema/defaults.
- `useCakeTopper`: `dimensions.height` inclui `stemLength` para os dois tipos.
- Remover as faixas de base de `NUMERIC_RANGES` e adicionar `stemSpacing`.

### 5. Painel

- Select **Tipo de fixação**: `Haste` e `Haste dupla`.
- Diâmetro e comprimento da haste para ambos.
- Slider **Espaçamento das hastes** apenas para `haste-dupla`.
- Remover todos os sliders de base/encaixe.

### 6. Testes

- Schema: aceita `haste-dupla`, rejeita `base`, valida `stemSpacing`.
- Builder:
  - haste única tem ponta cônica (raio pequeno no fundo e raio cheio no topo);
  - haste dupla gera duas hastes com o espaçamento configurado;
  - ambas continuam ancoradas no fundo real da placa.
- Hook: altura total inclui a haste nos dois tipos; `stemSpacing` é atualizável.
- Painel: opções novas, slider de espaçamento condicional, sem campos de base.
- Remover os testes de base.

### 7. Documentação

- `topo-bolo/AGENTS.md`: parâmetros, regras e estrutura.
- `docs/frontend/studio.md`: visão geral, tabela de arquivos e bullet do Topo de
  Bolo.
- `ToolSelector.tsx`: descrição “haste ou haste dupla”.

## Fora de escopo

- Nivelar as pontas em contornos assimétricos.
- Mudar o significado de `stemLength`.
- Alterar placa, texto, relevo, ícone, cores, editor 2D ou exportação STL.
