# Design — Fix: posições do editor afetam a peça 3D

Data: 2026-08-24
Status: Aprovado (execução direta)

## Problema

O editor permite mover textos e salva offsetX/offsetY no schema, mas o
buildKeychain chama `snapTextToSupport` que IGNORA essas posições e usa
suas próprias posições fixas. Resultado: o texto no editor não altera
a peça 3D.

## Correções

1. Remover `snapTextToSupport` do buildKeychain — usar offsetX/offsetY direto
2. Clamp de segurança: texto não sai da área útil (width - 2 * borderWidth)
3. Valida consistência: editor e build usam os mesmos limites (halfW, halfH, 4mm)
