# Categoria: Letreiros

Itens planos de exibição com foco em tipografia e fixação — cartões, placas, suportes.

## Ferramentas

| Ferramenta | Status |
|---|---|
| cartao-visita | implementada |
| placa-loja | planejada |
| suporte-foto | planejada |

## Regras do domínio

- Tipografia: fontes legíveis; 3mm de altura como referência, com auto-fit para textos longos
- Espessura típica: 1–4mm para cartões, 3–8mm para placas
- Fixação: furos para parafuso/.dupla-face, base para pé (suporte de foto)
- Posicionamento: livre no editor 2D, com clamp à área útil
- Cartão de visita: conteúdo livre (texto/ícone), relevo fixo de 1 mm, margem de 3 mm
- Margem mínima de 3mm entre texto e borda
- Superfícies planas: sem curvaturas, boa adesão de filament
- STL sempre manifold, fechado, pronto para impressão

## Invariantes

- 1 unidade Three.js = 1 mm
- Schema Zod valida todos os parâmetros
- Gerar geometria apenas sob demanda (debounce)
- Preview 3D leve antes da geração final

## Fora de escopo

Confeitaria, chaveiros, landing, backend.
