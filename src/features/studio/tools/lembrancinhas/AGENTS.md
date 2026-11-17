# Categoria: Lembrancinhas

Presentes personalizados de festa e evento, além do equipamento de produção de
lembrancinhas.

## Ferramentas

| Ferramenta | Status |
|---|---|
| porta-vela | planejada |
| mini-vaso | planejada |
| caixa-personalizada | implementada (v1) |
| termoformador | implementada (v1: tela + suporte) |
| caneca-personalizada | planejada |

## Regras do domínio

- Personalização por nome/idade/digital sempre em relevo de 1 mm
- Base estável no apoio; evitar peças soltas
- Encaixes com folga de impressão de 0,2–0,3 mm
- PLA não é resistente ao calor: porta-vela orienta uso com vela LED/tea light
- Mini-vaso estanque: paredes e fundo sem poros
- Peças móveis (tampa, puxador e base da caixa; tampa, pino e base do termoformador) exportadas separadamente
- STL sempre manifold, fechado, sem auto-interseções
- Caixa personalizada: paredes ≥ 0,8 mm, elementos e furos ≥ 0,8 mm
- Caneca personalizada: parede ≥ 1,8 mm e fundo ≥ 2 mm; texto em relevo de
  1 mm; alça separada de abraçadeira com folga de 0,2–0,5 mm; corpo impresso em
  pé e alça deitada

## Invariantes

- 1 unidade Three.js = 1 mm
- Schema Zod valida todos os parâmetros
- Gerar geometria apenas sob demanda (debounce)
- Build em Web Worker para geometria pesada
- Peças separadas quando houver encaixe ou montagem

## Fora de escopo

Confeitaria, chaveiros, letreiros, landing, backend.
