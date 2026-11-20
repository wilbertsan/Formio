# Categoria: Lembrancinhas

Presentes personalizados de festa e evento, além do equipamento de produção de
lembrancinhas.

## Ferramentas

| Ferramenta | Status |
|---|---|
| porta-vela | planejada |
| mini-vaso | planejada |
| caixa-personalizada | implementada (v1) |
| termoformador | implementada (v1: tela + suporte + macho) |
| porta-lata | implementada (v3: texturas) |

## Regras do domínio

- Personalização por nome/idade/digital sempre em relevo de 1 mm
- Base estável no apoio; evitar peças soltas
- Encaixes com folga de impressão de 0,2–0,3 mm
- PLA não é resistente ao calor: porta-vela orienta uso com vela LED/tea light
- Mini-vaso estanque: paredes e fundo sem poros
- Peças móveis (tampa, puxador e base da caixa; tela, suporte e macho do termoformador) exportadas separadamente
- A tela do termoformador é exportada plana e conformada com o macho; a bacia do suporte não passa de uma semi-esfera para o macho poder ser retirado.
- STL sempre manifold, fechado, sem auto-interseções
- Caixa personalizada: paredes ≥ 0,8 mm, elementos e furos ≥ 0,8 mm
- Porta-lata 350 ml: cavidade interna de 67,8 mm (folga 0,8 mm sobre a lata de
  66,2 mm) e furo de ventilação de 10 mm; parede ≥ 1,8 mm e fundo ≥ 2 mm; texto
  em relevo de 1 mm; bordas decorativas de 0,4–1,5 mm de salto e 4–14 mm de
  largura, coladas na base e no topo, com flancos a 45° (o anel inferior apoia
  na mesa e o superior imprime sem suporte); alça separada de abraçadeira com
  folga de 0,2–0,5 mm; corpo e alça impressos em pé, a alça apoiada na borda
  inferior do laço, com suporte sob a abraçadeira de 200°. Texturas de seis
  estilos (madeira, metal, escamas, onduladas, pedra e pontiagudo) em relevo
  positivo na parede, com profundidade efetiva `min(profundidade, escala/4)`,
  faixa lisa na alça, texto 1 mm acima do envelope da textura e diâmetro máximo
  considerando a textura. Não há capacidade em ml: a capacidade é da lata

## Invariantes

- 1 unidade Three.js = 1 mm
- Schema Zod valida todos os parâmetros
- Gerar geometria apenas sob demanda (debounce)
- Build em Web Worker para geometria pesada
- Peças separadas quando houver encaixe ou montagem

## Fora de escopo

Confeitaria, chaveiros, letreiros, landing, backend.
