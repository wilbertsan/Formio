# Design — Editor 2D de Posicionamento de Textos

Data: 2026-08-24
Status: Aprovado
Escopo: Frontend — modal SVG 2D para posicionar textos com snapping de contato (texto nunca flutua); remoção dos sliders X/Y e do drag 3D

## Contexto

Os sliders Posição X/Y e o drag 3D ficaram ruins de usar. O usuário quer: um
ícone na aba Texto que abre uma tela 2D com o desenho da base e os textos
arrastáveis; o texto deve SEMPRE ficar conectado (nunca flutuando) — ou topo
do chaveiro, ou furo, ou texto anterior.

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Editor | Modal Amplify UI com SVG (viewBox em mm) | Sobre o Studio; SVG/DOM drag robusto em jsdom |
| Base no editor | `<path>` do THREE.Shape real (`shape.getPoints`) | Mesma geometria do 3D, sem duplicação |
| Anti-flutuação | Snapping de contato (`snapTextToSupport`) | Validação automática — impossível flutuar; sem rejeições frustrantes |
| Snap no build | build aplica o mesmo snap | Fonte única de verdade: o editor mostra a posição impressa |
| Fusão | 0.5mm de overlap no snap | Conexão física garantida para impressão |
| Drag 3D | Removido | Uma única forma de mover (consistência) |
| Sliders X/Y | Removidos | Substituídos pelo editor |
| Seleção | selectedTextId compartilhado (chips + editor) | Sincronizado |

## Editor (TextPositionEditor)

- Aberto pelo botão-ícone ✥ ("Posicionar textos") na header do bloco Texto
- SVG viewBox = bounding box da peça em mm
- Base: path teal claro; furo: círculo branco; anel: círculo teal escuro
- Textos: rect semi-transparente + label (content truncado), arrastáveis
  (pointer events do SVG); selecionado com stroke teal
- Durante drag: rect segue o mouse; no pointerUp aplica snap (texto "pula"
  para a posição conectada)
- Botões: Concluir (fecha), X

## Snapping (positioning.ts)

`snapTextToSupport(text, supports, pieceBB)`:
- Suportes: base do texto anterior (ordem do array), borda inferior do
  furo+anel, topo interno da peça (borda − 4mm)
- Sem suporte acima: snapa lateral (esquerda/direita da área útil)
- Todo texto encosta em algo; overlap de fusão 0.5mm

## Integração

- StudioPage: `isEditorOpen` local; editor recebe params/selectedTextId/
  callbacks; `handleMoveText` → `updateText(id, {offsetX, offsetY})`
- StudioPanel: botão ✥ (onOpenEditor); sem sliders X/Y
- KeychainPreview: volta a renderizar base + texto mergeado (sem drag/seleção)
- buildKeychain: aplica snapTextToSupport por texto antes de posicionar

## Remoções

- Sliders Posição X/Y do StudioPanel
- TextDraggable + props de drag/seleção do Preview/Viewport/StudioPage

## Testes

- positioning: snap para topo interno, base do anterior, borda do anel,
  lateral; ordem preservada
- TextPositionEditor: renderiza base/furo/rects; seleciona; drag dispara
  onMoveText com snap; Concluir fecha; labels dos textos
- StudioPanel: botão ✥; sem sliders X/Y
- KeychainPreview: sem props de drag; base + texto mergeado
- buildKeychain: offsets flutuantes snapados (bbox final conectado)
- StudioPage: abre editor; editor atualiza offsets

## Verificação manual

- Arrastar texto para o meio e soltar → pula para cima (nunca flutua)
- Arrastar para baixo de outro texto → cola nele
- Fechar editor mantém posições; STL mostra textos conectados

## Definition of Done

- lint/typecheck/test/build verdes
- Editor 2D funcional com base real
- Snap coberto por testes puros
- Zero referências a sliders X/Y e TextDraggable
- Docs atualizadas
