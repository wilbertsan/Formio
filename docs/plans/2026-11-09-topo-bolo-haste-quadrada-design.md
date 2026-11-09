# Design: Topo de Bolo — Haste com largura igual à espessura da placa

**Data:** 09 de novembro de 2026
**Status:** Aprovado
**Categoria:** Confeitaria
**Ferramenta:** topo-bolo

## Visão Geral

Remover o controle **Largura da haste** da seção Fixação. A largura passa a ser
igual à espessura da placa, tornando a seção da haste quadrada
(`espessura × espessura`), com a mesma ponta chanfrada.

## Contexto

A haste plana atual usa `stemWidth` (3–8mm) em X e `params.thickness` (2–4mm) em
Z. O usuário quer eliminar essa escolha e usar a espessura da placa como largura.

## Decisão

**Abordagem escolhida:** remover `stemWidth` do schema/estado/painel e derivar a
meia-largura da haste de `params.thickness / 2` no builder.

**Alternativas rejeitadas:**

- Manter `stemWidth` no schema e apenas esconder o slider: deixaria estado morto.
- Usar uma constante fixa independente da placa: não atende “mesma espessura da
  placa”.

## Escopo

### 1. Schema e estado

- Remover `stemWidth` de `cakeTopperParamsSchema` e dos defaults.
- Remover `stemWidth` de `NUMERIC_RANGES` no `useCakeTopper`.
- Nenhum parâmetro novo.

### 2. Builder

- Em `buildStem`, usar `const halfWidth = params.thickness / 2`.
- A extrusão continua com `depth = params.thickness`, resultando em seção
  `thickness × thickness`.
- `tipLength = min(params.thickness * STEM_TIP_RATIO, params.stemLength * STEM_MAX_TIP_LENGTH_RATIO)`.
- `isStemXValid`, `stemTopY`, `collectValidStemXs`, `resolveStemX`,
  `resolveDoubleStemXs` e `buildSingleStem` recebem `params.thickness / 2` como
  meia-largura.
- `stemTopY`, ancoragem, espaçamento mínimo e fallback não mudam de lógica.

### 3. Painel

- Remover o bloco do slider **Largura da haste** da seção Fixação.
- Manter **Comprimento da haste** e **Espaçamento das hastes** (condicional).

### 4. Testes

- Remover `stemWidth` dos testes e usar `params.thickness` nas expectativas de
  largura.
- Atualizar o teste da haste plana para verificar `X = Z = thickness`.
- Atualizar testes de haste dupla, aproximação, fallback, contorno desconexo e
  entalhe para a nova meia-largura.
- Manter a cobertura da ponta chanfrada e do cap de `tipLength`.

### 5. Documentação

- `topo-bolo/AGENTS.md`: remover “largura 3–8mm” e documentar que a largura é a
  espessura da placa.
- `docs/frontend/studio.md`: refletir a seção quadrada.

## Fora de escopo

- Mudar comprimento da haste, espaçamento, formato da ponta, ancoragem ou
  fallback.
- Alterar placa, texto, relevo, ícone, editor 2D ou exportação STL.
