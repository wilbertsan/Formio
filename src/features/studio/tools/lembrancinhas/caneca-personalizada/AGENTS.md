# Ferramenta: Caneca Personalizada

## Status

Planejada (v1: corpo + relevo + alça de abraçadeira).

## Objetivo

Gerar uma caneca de parede simples com nome/idade em relevo de 1 mm no corpo e
uma alça removível de encaixe por pressão. São duas peças independentes: o corpo
(com o relevo) e a alça (abraçadeira em C com laço em D). O corpo é um sólido de
revolução; a alça abraça o corpo na altura escolhida, sem trilho e sem alterar a
parede. Os dois STLs saem separados.

Parede dupla, tampa, base separada, canudo, mais de uma linha de texto, ícone
SVG e 3MF/STEP ficam para versões seguintes.

## Parâmetros

### Corpo

| Parâmetro | Faixa | Default |
|---|---|---|
| `diameterTop` | 70–100 mm | 80 |
| `diameterBottom` | 60–95 mm | 72 |
| `height` | 80–115 mm | 88 |
| `wallThickness` | 1,8–4 mm | 2,4 |
| `bottomThickness` | 2–6 mm | 3,2 |
| `rimChamfer` | 0–2 mm | 0,6 |
| `bodyColor` | 10 cores PLA | `#14b8a6` |

### Alça

| Parâmetro | Faixa | Default |
|---|---|---|
| `handleEnabled` | booleano | `true` |
| `handleHeight` | 35–85 mm | 52 |
| `handleGap` | 24–40 mm | 30 |
| `handleReach` | 30–50 mm | 40 |
| `handleBand` | 5–10 mm | 6,5 |
| `handleWidth` | 8–16 mm | 12 |
| `handleClearance` | 0,2–0,5 mm | 0,3 |
| `accentColor` | 10 cores PLA | `#f5f5f5` |

### Personalização

| Parâmetro | Faixa | Default |
|---|---|---|
| `text` | 0–20 caracteres | `Festa` |
| `textSize` | 6–18 mm | 10 |
| `fontStyle` | `normal`, `bold`, `serif` | `normal` |
| `textCenterY` | 20–90 mm | 60 |

`textDepth` é fixo em 1 mm (`CONTENT_DEPTH`).

## Regras do domínio

- 1 unidade Three.js = 1 mm
- O corpo é um sólido único e fechado, gerado por `LatheGeometry` a partir de um
  perfil 2D fechado; não há CSG no corpo além da união do relevo.
- O relevo do texto é sempre positivo em 1 mm, unido ao corpo por CSG, e fica
  centralizado no lado oposto à alça (180° a partir do +X).
- A alça é uma peça separada, unida por pressão, com abraçadeira em C de 200°
  centrada no +X e laço em D. A folga da abraçadeira é `handleClearance`.
- O raio interno da abraçadeira é o raio externo do corpo na altura
  `handleHeight` mais `handleClearance`; a abraçadeira acompanha a conicidade do
  corpo.
- O laço em D fica no plano vertical XY, extrudado na largura `handleWidth`; a
  abertura da mão é `handleGap` na vertical e
  `handleReach - HANDLE_RING_THICKNESS - 2 * handleBand` na horizontal.
- A alça é impressa deitada, com o laço na mesa; o arco da abraçadeira pode
  exigir suporte leve.
- O corpo é impresso em pé, com o fundo na mesa, sem suporte.
- O texto não pode invadir a borda, o fundo, o arco da abraçadeira nem a área do
  laço; a validação garante margem.
- O texto é curvado no raio externo do corpo na altura `textCenterY`; o arco
  efetivo é calculado pelo comprimento do texto e limitado pelo Zod.
- Capacidade exibida é o volume interno útil (tronco de cone), em ml.
- STL sempre manifold, fechado, sem auto-interseções e sem peças soltas.
- Sem CSG para a alça no corpo; o CSG da alça é interno (abraçadeira + laço).

## Pipeline

```text
Parâmetros
  → schema + validação
  → perfil do corpo (fundo, parede, borda, cavidade)
  → buildBody (LatheGeometry)
  → textToShapes + curvatura no raio
  → CSG union(texto, corpo)
  → buildHandle (abraçadeira + laço + CSG interno)
  → buildMug ({ body, handle })
  → worker + serialização
  → preview montado / export dos dois STLs
```

## Exportação

- Dois STLs binários: `<nome>-corpo.stl` e `<nome>-alca.stl`
- Cada peça centralizada na mesa, com a base em `y = 0`
- A alça é rotacionada para imprimir deitada
- O STL não carrega cor

## Validação

- `mug-wall`: parede abaixo de 1,8 mm (defensiva; a UI já limita)
- `mug-bottom`: fundo abaixo de 2 mm
- `mug-text-fit`: texto não cabe no arco útil da frente
- `mug-text-band`: texto cruza a borda, o fundo ou a faixa da alça
- `mug-text-rail`: texto invade o arco da abraçadeira (defensiva)
- `mug-handle-gap`: abertura da mão pequena demais para o laço
- `mug-handle-reach`: alcance insuficiente para a abertura da mão
- `mug-handle-fit`: folga da abraçadeira abaixo de 0,2 mm
- `mug-handle-band`: abraçadeira mais alta que a parede disponível
- `mug-capacity`: capacidade abaixo de 150 ml ou acima de 500 ml
- `mug-csg`: a união do relevo falhou

Avisos não bloqueiam o build nem o export. Falha de CSG mantém a geometria
anterior e mostra erro no overlay.

## Decisões da v1

- O corpo usa `LatheGeometry` com perfil fechado no plano `(r, y)`; os
  triângulos degenerados do eixo são removidos, como no suporte do Termoformador.
- O relevo reutiliza `textToShapes` e `shapesToGeometry` de
  `confeitaria/shared/textOutline.ts`, depois curva os vértices no raio local do
  corpo antes da união por CSG.
- A alça não usa trilho: uma abraçadeira em C elimina a necessidade de alterar a
  parede e mantém o corpo um sólido de revolução. A fixação é por pressão e a
  peça é removível.
- Abraçadeira e laço são unidos por CSG dentro da própria alça; o corpo recebe
  CSG apenas do texto.
- O texto fica a 180° da alça para não colidir com a abraçadeira; a câmera
  inicial olha o lado do texto (azimute 210°).
- Duas cores no preview: `bodyColor` no corpo e `accentColor` na alça. Troca de
  cor não rebuilda geometria.
- O build roda em worker; a união do relevo é validada por spike antes do
  restante da ferramenta.
- Se o spike de CSG falhar, a implementação migra para a abordagem C
  (plaqueta curva com o nome) antes de seguir.
- O export usa o snapshot `builtParams` do build para preparar as peças.
- `handleWrap` (200°), `HANDLE_RING_THICKNESS` (3,5 mm), `MUG_SEGMENTS` (128) e
  `CONTENT_DEPTH` (1 mm) são constantes do schema, não sliders.

## Fora de escopo

Parede dupla, tampa, base separada, canudo, alça integrada, mais de uma linha de
texto, ícone SVG, textura, 3MF/STEP e outros formatos.
