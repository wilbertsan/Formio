# Ferramenta: Termoformador

## Status

Implementada (v1: tela circular).

## Objetivo

Gerar a tela circular do termoformador: um disco plano com aro sólido e malha
hexagonal vazada, exportado como STL único. Corpo, tampa, pino lateral e base
ficam para versões seguintes.

## Parâmetros

| Parâmetro | Faixa | Default |
|---|---|---|
| `diameter` | 60–300 mm | 160 |
| `thickness` | 1,2–6 mm | 3 |
| `frameWidth` | 2–30 mm | 6 |
| `lineWidth` | 1,2–4 mm | 2 |
| `opening` | 3–30 mm | 6 |
| `color` | 10 cores PLA | `#14b8a6` |

## Regras do domínio

- 1 unidade Three.js = 1 mm
- Tela plana, espessura constante e aro sólido de `frameWidth`
- Malha hexagonal flat-top: passo `opening + lineWidth` e circunraio
  `opening / √3`
- Só entram favos totalmente dentro de `diameter/2 - frameWidth`; a borda
  sólida efetiva pode chegar a `frameWidth + circunraio`
- Limite de 4.000 favos; acima disso a abertura cresce 15% por iteração
- Malha sempre fechada, manifold e sem favos fora do aro
- Sem CSG

## Pipeline

```text
Parâmetros
  → schema + validação
  → layout hexagonal
  → Shape circular + Paths hexagonais
  → ExtrudeGeometry + rotação para deitar
  → worker + serialização
  → preview / export STL
```

## Exportação

- Um STL binário: `<nome>-tela.stl`
- A peça sai deitada e centralizada na mesa

## Validação

- `screen-frame`: aro consome o disco
- `screen-empty`: nenhum favo cabe
- `screen-density`: limite de favos atingido
- `screen-opening`: abertura maior que o raio interno
- `screen-line`: linha abaixo de 0,8 mm (defensivo)

## Decisões da v1

- `ExtrudeGeometry` com furos hexagonais nativos, validado por spike com ~1.200
  favos antes de seguir.
- Cada favo é girado em 0,001 rad (`HEXAGON_ANGLE_EPSILON`) para evitar
  vértices exatamente colineares entre favos vizinhos; sem isso o Earcut deixa
  os caps abertos.
- Favos parciais descartados; sem CSG.
- Cor não rebuilda geometria.
- `fitRadius` usa a esfera envolvente da geometria, não a diagonal da AABB.
- O build roda em worker; configurações extremas (~3.571 favos) levam ~7 s.
- Serialização local de uma peça, independente da Caixa.

## Fora de escopo

Corpo, tampa, pino lateral, base, curvatura, 3MF/STEP e outros formatos.
