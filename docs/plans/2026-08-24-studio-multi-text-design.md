# Design — Textos Múltiplos com Seleção, Proporcional e Drag 3D

Data: 2026-08-24
Status: Aprovado
Escopo: Frontend — até 3 textos no chaveiro, empilhados e configuráveis individualmente; toggle proporcional por texto; arrastar texto no viewport com clamp de borda e furo

## Contexto

O Studio suporta um único texto global (name/textWidth/textSize/fontStyle/
letterHeight). O usuário quer: adicionar mais textos (um abaixo do outro),
selecionar qual texto configurar (sliders afetam o selecionado), toggle de
tamanho proporcional à peça e mover o texto clicando e arrastando no
viewport, respeitando borda e furo.

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Modelo | `texts: TextItem[]` (1–3) no schema | Substitui campos globais; escala com seleção/add/remove |
| Empilhamento | posições base centradas, cada texto abaixo do outro (espaçamento altura+2mm) | Pedido explícito; offsets do usuário são relativos |
| Proporcional | boolean por texto | Pedido explícito (toggle por texto) |
| Drag | onPointerDown/Move R3F + raycast no plano da peça | Interação natural; OrbitControls desabilitado durante o drag |
| Clamp | borda via AABB; furo via distância centro-a-centro | Simplificação suficiente; função pura testável |
| Gravado | CSG único subtraindo a união dos textos | Performance preservada |
| Cor das letras | global (não por texto) | YAGNI; merge em um mesh de texto no resultado |
| Seleção | selectedTextId no StudioPage (UI), não no schema | Estado de UI fora do modelo |
| Migração | troca direta, sem backward-compat | Sem persistência existente |

## Modelo de dados

```ts
interface TextItem {
  id: string          // uuid curto
  content: string     // 1–12 chars
  fontStyle: 'normal' | 'bold' | 'serif'
  width: number       // 8–60 mm (usado quando !proportional)
  height: number      // 4–20 mm (usado quando !proportional)
  relief: number      // 0.4–2 mm
  proportional: boolean
  offsetX: number     // −20–20 mm
  offsetY: number     // −20–20 mm
}
```

Schema: campos de peça/argola/cores/textMode mantidos + `texts` (1–3).
Defaults: 1 texto ("Meu nome", bold, 40×10, relevo 1, proporcional off).

## Build (v3)

- Por item: TextGeometry com size = height, escala por width (ou área útil
  × 0.9 quando proportional), clamp 4mm, translate(offsetX, baseY+offsetY, z)
- baseY do item N = (n − (total−1)/2) × −(altura+2mm) — empilhamento
- result.text = merge das geometrias dos itens (um mesh no preview)
- Gravado: um único evaluate CSG(base, união dos textos)
- Fontes: hook carrega cada fontStyle presente em texts[] (cache Map)

## UI (bloco Texto)

- Chips de seleção por texto (content truncado, aria-pressed) + botão "+"
  (até 3) + lixeira no selecionado (se >1)
- Controles do selecionado: conteúdo (TextField), estilo (SelectField),
  ToggleField "Proporcional à peça", sliders Largura/Altura (ocultos quando
  proporcional), Altura do relevo, posição X/Y (−20–20) sincronizados com o
  drag
- Modo Relevo/Gravado mantido

## Drag (viewport)

- Cada texto = mesh próprio (raycast individual) em `TextDraggable`
- onPointerDown seleciona + inicia drag; onPointerMove projeta ponteiro no
  plano Z da peça e move o mesh; onPointerUp committa offsetX/offsetY no
  reducer (durante o drag só o mesh move — 60fps)
- OrbitControls desabilitado durante o drag; cursor grab/grabbing
- Texto selecionado com emissive teal sutil
- Clique no 3D sincroniza o chip no painel (selectedTextId compartilhado)
- Clamp: `clampTextPosition(textBB, pieceBB, holeCircle)` — borda AABB +
  distância centro do texto ao círculo do furo+anel

## Nova unidade pura

`keychain/positioning.ts`: `clampTextPosition` e
`defaultStackOffsets(heights, count)` — usadas pelo build e pelo drag;
testáveis sem WebGL.

## Testes

- schema: texts 1–3, TextItem ranges, defaults
- positioning: clamp de borda/furo; offsets de empilhamento
- buildKeychain: 1 texto = atual; 2 empilhados sem overlap; offset move;
  proporcional ignora width/height; gravado = 1 CSG
- useKeychain: addText (máx 3), removeText (mín 1), updateText, fontes
  múltiplas
- StudioPanel: chips, seleção, +, lixeira, toggle esconde sliders, X/Y
- Preview/TextDraggable: mocks R3F; meshes por texto; seleção via callback
- StudioPage: integração selectedTextId

## Fora de escopo

Cor por texto, rotação de texto, undo/redo, persistência, refinamento AABB
completo do furo.

## Definition of Done

- lint/typecheck/test/build verdes
- 3 textos empilhados, seleção e edição individual
- Drag com clamp de borda e furo funcionando
- Toggle proporcional por texto
- Gravado raso mantido
- Código morto removido (campos globais de texto)
- Docs atualizadas
