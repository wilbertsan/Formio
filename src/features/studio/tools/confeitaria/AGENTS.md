# Categoria: Confeitaria

Ferramentas para confeiteiros e cake designers — moldes, carimbos, rolos, suportes.

## Ferramentas

| Ferramenta | Status |
|---|---|
| molde-doces | planejada |
| carimbo-brigadeiro | planejada |
| rolo-textura | implementada |
| cortador-carimbo | implementada |
| topo-bolo | implementada |
| ejetor-brigadeiro | planejada |
| suporte-bolo | implementada |

## Regras do domínio

- Peças em contato com alimento: arestas arredondadas, sem furos internos que prendam massa
- Espessura mínima de parede de corte: 0.8mm
- Folga para corte: 0.2–0.5mm dependendo do material (massa, fondant, chocolate)
- Altura típica: 15–60mm para cortadores, 5–20mm para carimbos
- Superfícies de impressão: textura FDM aceitável; acabamento liso preferido para carimbos
- STL sempre manifold, fechado, sem auto-interseções

## Invariantes

- 1 unidade Three.js = 1 mm
- Validar parâmetros antes de gerar geometria
- Evitar operações booleanas desnecessárias
- Gerar geometria apenas sob demanda (debounce)

## Fora de escopo

Chaveiros, letreiros, landing, backend.
