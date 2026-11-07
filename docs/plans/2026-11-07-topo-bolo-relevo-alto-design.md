# Design: Topo de Bolo — Relevo alto fixo

**Data:** 07 de novembro de 2026
**Status:** Aprovado
**Categoria:** Confeitaria
**Ferramenta:** topo-bolo

## Visão Geral

Remover o seletor **Modo do conteúdo** (`Relevo` / `Corte vazado`) do topo de
bolo. A ferramenta passa a gerar sempre **relevo alto**, mantendo o slider
**Altura do relevo** por texto (0,4–3 mm).

## Contexto

O painel atual expõe `textMode` com dois valores:

- `raised` — texto e ícone em relevo (padrão).
- `cut` — texto e ícone vazados via CSG, com fallback para relevo.

O usuário quer eliminar a escolha e manter somente o relevo. Como não há
persistência de projetos nem API pública consumindo `textMode`, o campo pode ser
removido por completo em vez de mantido como valor fixo.

## Decisão

**Abordagem escolhida:** remover `textMode` do schema, do estado, do builder e
do painel; excluir todo o caminho de corte vazado.

**Alternativas rejeitadas:**

- Manter `textMode` como `z.literal('raised')` e apenas esconder o select:
  deixaria campo e caminho de corte mortos.
- Manter o caminho de corte atrás de uma constante interna: complexidade sem
  possibilidade de uso pela UI.

## Escopo

### 1. Schema

- Remover `textMode: z.enum(['raised', 'cut'])`.
- Remover `textMode: 'raised'` de `defaultCakeTopperParams`.
- Remover o tipo `TextMode`.
- Manter `relief` do texto com 0,4–3 mm e o restante do schema intacto.

### 2. Builder

- `buildCakeTopper` sempre retorna `relief`; nunca subtrai texto/ícone da placa.
- `buildTextGeometries` e `buildIconGeometry` perdem o parâmetro `mode`.
- Texto usa `item.relief` e `shapesToGeometry(..., true)`; ícone usa
  `ICON_DEPTH` (1 mm).
- Posicionamento em Z fixo em `params.thickness - TEXT_Z_OFFSET`.
- Remover `cutFits`, `CUT_BORDER`, `CUT_Z_OFFSET` e `disposeAll`.
- `containsCorner` deixa de ser usado e é removido de `placement.ts`.
- `three-bvh-csg` permanece apenas para o encaixe da base (`buildBase`).

### 3. Painel

- Remover o `SelectField` **Modo do conteúdo**.
- Manter lista/edição de textos, **Altura do relevo**, subseção **Ícone SVG** e
  botão **Posicionar conteúdo**.
- Nenhuma mudança visual além da remoção do select.

### 4. Hook

- Nenhuma mudança funcional. A ação `update` continua aceitando as demais
  chaves; apenas o teste de `textMode` sai.

### 5. Testes

- Remover `rejects invalid textMode` do schema.
- Remover `updateParam atualiza textMode` do hook.
- Remover o teste do painel que muda o modo.
- Remover o bloco `describe('buildCakeTopper - corte (cut)')`.
- Manter os testes de relevo existentes (texto, ícone, offsets e clamp).
- Adicionar um teste curto garantindo que o build padrão sempre expõe `relief`
  e nunca uma placa vazada.

### 6. Documentação

- `topo-bolo/AGENTS.md`: substituir menções a `raised`/`cut` por “sempre relevo
  alto”; remover a regra de fallback de corte.
- `docs/frontend/studio.md`: atualizar o bullet do Topo de Bolo.
- Não reescrever planos históricos.

## Fora de escopo

- Mudar a altura padrão do relevo (continua 1 mm por texto).
- Alterar o relevo do ícone (continua 1 mm).
- Mudar fixação, formatos, cores, editor 2D ou exportação STL.
