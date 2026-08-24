# Design — Bloco Argola com Posição em Dropdown

Data: 2026-08-24
Status: Aprovado
Escopo: Frontend — posição da argola em SelectField, remoção do controle de espessura do anel

## Contexto

O bloco Argola do StudioPanel usa ButtonGroup para a posição (mesmo problema
de overflow do estilo de letra, já resolvido com SelectField) e expõe o slider
"Espessura do anel", que o usuário não quer controlar. Decisão: o bloco fica
somente com Posição (dropdown), Diâmetro interno e Embutimento.

## Mudanças

### UI (bloco Argola)

1. `SelectField` "Posição" (Cima/Baixo/Esquerda/Direita) — substitui o ButtonGroup
2. Slider Diâmetro interno (mantém)
3. Slider Embutimento (mantém)
4. Slider Espessura do anel — removido

### Schema

`ringThickness` removido do `keychainParamsSchema` e dos defaults.

### Shapes/Build

`RingParams.ringThickness` deixa de vir dos params; o anel de reforço usa a
constante interna `RING_WALL = 2` (mm) em `shapes.ts`.

### Testes

- schema: sem `ringThickness`; rejeita objeto que o contenha? (Zod strip por
  default — apenas remover testes do campo e defaults)
- shapes: anel de reforço com espessura fixa de 2mm
- StudioPanel: combobox Posição com 4 opções; sem slider Espessura do anel;
  diâmetro interno e embutimento presentes

## Fora de escopo

Ajustes lateral/radial na UI (continuam no schema, sem controle exposto),
persistência.

## Definition of Done

- lint/typecheck/test/build verdes
- Dropdown de posição funcional sem overflow
- Bloco Argola com 3 controles (posição, diâmetro interno, embutimento)
- Anel de reforço com 2mm fixo coberto por teste
- Docs atualizadas
