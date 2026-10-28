# Hero Video — Design

Data: 2026-10-10

## Objetivo

Substituir o cubo SVG isométrico do Hero da landing page (`HeroVisual.tsx`) por um
vídeo demonstrativo em autoplay.

## Decisões

- O vídeo (`v10771g5000cdb5c5u7og65t35aq2tqg.mp4`) é movido para `public/hero.mp4`
  e servido pela raiz do Vite.
- `HeroVisual.tsx` passa a renderizar um `<video>` com `autoPlay`, `loop`, `muted`,
  `playsInline` e `aria-label` descritivo, mantendo as dimensões originais.
  Sem animação de flutuação e sem sombra (feedback posterior).
- O componente mantém nome, posição e import, minimizando o diff.
- O teste do Hero passa a localizar o vídeo por `aria-label` (vídeo não possui
  `role` implícito) e valida os atributos de reprodução.
- `AGENTS.md` do segmento atualizado para refletir o novo visual.

## Fora de escopo

- Otimização/compressão do vídeo.
- Uso de `<source>` com múltiplos formatos.
