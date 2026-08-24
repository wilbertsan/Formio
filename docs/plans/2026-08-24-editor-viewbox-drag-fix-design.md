# Design — Fix do Editor 2D: viewBox dinâmico + movimento livre

Data: 2026-08-24
Status: Aprovado (execução direta)

## Problemas

1. viewBox calculado de halfW/halfH fixos não mostra toda a base (especialmente coração)
2. Texto só move horizontalmente por causa do snap automático vertical
3. Usuário quer mover texto livremente dentro da área válida

## Fixes

1. **viewBox dinâmico**: calcular do bounding box real da base shape + padding 10mm
2. **Movimento livre**: remover `snapTextToSupport` do pointerUp, apenas clamp para área válida
3. **Clamp na área válida**: X e Y limitados ao rect tracejado de 4mm
