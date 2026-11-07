# Design: Topo de Bolo — Texto padrão e largura/altura independentes

**Data:** 07 de novembro de 2026
**Status:** Aprovado
**Categoria:** Confeitaria
**Ferramenta:** topo-bolo

## Visão Geral

Trocar o texto padrão de `Feliz Aniversário` para `Texto` e tornar a largura e a
altura do texto independentes, com o mesmo comportamento do marcador de página:
`height` define o tamanho da fonte e `width` é um limite máximo que comprime
apenas o eixo X quando excedido.

## Contexto

Hoje o topo de bolo gera os contornos do texto com
`textToShapes(font, content, item.height)` e, se a largura natural exceder o
alvo, aplica escala uniforme:

```ts
geometry.scale(factor, factor, 1)
```

Isso reduz largura e altura juntas. No marcador de página, o helper
`fitGeometryWidth` reduz apenas X:

```ts
geometry.scale(scale, 1, 1)
```

Assim, a altura definida pelo usuário é preservada mesmo quando o texto é
comprimido horizontalmente.

## Decisão

**Abordagem escolhida:** ajuste local no bloco de auto-fit já existente no
`buildCakeTopper.ts`, trocando a escala uniforme por escala apenas em X.

**Alternativas rejeitadas:**

- Extrair `fitGeometryWidth` para um helper compartilhado: mais DRY, mas mexe
  em outra ferramenta para uma mudança de uma linha.
- Esticar o texto para preencher exatamente `width × height`: não é o
  comportamento do marcador de página e deformaria a tipografia nos dois eixos.

## Escopo

### 1. Texto padrão

- `defaultText.content` passa de `'Feliz Aniversário'` para `'Texto'`.
- Nenhum outro default muda.

### 2. Auto-fit independente

Em `buildTextGeometries`:

```ts
const targetWidth = Math.min(item.width, params.width - 2 * TEXT_MARGIN)
if (naturalWidth > targetWidth && naturalWidth > 0) {
  const factor = targetWidth / naturalWidth
  geometry.scale(factor, 1, 1)
}
centerXY(geometry)
```

- A altura natural (definida por `item.height` como tamanho da fonte) é
  preservada.
- O texto nunca é ampliado; a largura só é reduzida.
- O posicionamento, clamp no contorno e relevo continuam iguais.

### 3. Editor 2D

- Sem mudanças. A caixa visual do editor continua sendo uma aproximação de
  `width × height`; a geometria real é ajustada pelo builder.

### 4. Testes

- Novo teste no builder: o mesmo texto com `width` pequena e grande deve ter a
  mesma altura; a largura menor deve ser reduzida.
- Teste de default: `defaultText.content === 'Texto'`.
- Atualizar `StudioPanel.test.tsx`, que referencia `Feliz Aniversário` em labels
  e asserções.

### 5. Documentação

- `topo-bolo/AGENTS.md`: documentar que `width` é limite máximo e `height` é
  independente/preservado.
- `docs/frontend/studio.md`: refletir o comportamento no bullet do Topo de Bolo.

## Fora de escopo

- Alterar limites de `width`/`height`.
- Mudar o editor 2D ou a caixa visual dos textos.
- Alterar o marcador de página.
- Mudar relevo, ícone, fixação ou exportação STL.
