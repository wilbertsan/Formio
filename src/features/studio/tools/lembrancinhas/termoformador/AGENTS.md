# Ferramenta: Termoformador

## Status

Implementada (v1: tela + suporte).

## Objetivo

Gerar a tela circular e o suporte côncavo do termoformador: um disco plano com
aro sólido e malha hexagonal vazada, e um berço circular côncavo com bacia
esférica e rebaixo, onde a tela apoia e fica nivelada com o topo. As duas peças
saem em STLs separados. Corpo, tampa, pino lateral e base ficam para versões
seguintes.

## Parâmetros

| Parâmetro | Faixa | Default |
|---|---|---|
| `diameter` | 60–300 mm | 160 |
| `thickness` | 1,2–6 mm | 3 |
| `frameWidth` | 2–30 mm | 6 |
| `lineWidth` | 0,4–4 mm | 0,4 |
| `opening` | 3–30 mm | 6 |
| `color` | 10 cores PLA | `#14b8a6` |

### Suporte

| Parâmetro | Faixa | Default |
|---|---|---|
| `wallThickness` | 2–10 mm | 4 |
| `bottomThickness` | 2–10 mm | 4 |
| `bowlDepth` | 5–60 mm | 20 |
| `stepWidth` | 2–15 mm | 5 |
| `fitClearance` | 0,1–0,6 mm | 0,3 |
| `edgeChamfer` | 0–3 mm | 0,6 |

## Regras do domínio

- 1 unidade Three.js = 1 mm
- Tela plana, espessura constante e aro sólido de `frameWidth`
- Malha hexagonal flat-top: passo `opening + lineWidth` e circunraio
  `opening / √3`
- Só entram favos totalmente dentro de `diameter/2 - frameWidth`; a borda
  sólida efetiva pode chegar a `frameWidth + circunraio`
- Limite de 4.000 favos; acima disso a abertura cresce 15% por iteração
- Malha sempre fechada, manifold e sem favos fora do aro
- O suporte é uma peça independente, com bacia esférica fechada e fundo fechado.
- A tela apoia no degrau e fica nivelada com o topo.
- O diâmetro do suporte é derivado do diâmetro da tela
  (`recessRadius = D/2 + fitClearance`, `outerRadius = recessRadius + wallThickness`).
- A profundidade efetiva é limitada para manter 0,8 mm entre a bacia e a parede
  externa.
- Sem CSG

## Pipeline

```text
Parâmetros
  → schema + validação
  → layout hexagonal
  → buildScreen (Shape circular + Paths hexagonais → ExtrudeGeometry)
  → buildSupport (perfil 2D → LatheGeometry)
  → buildThermoformer ({ screen, support, seatY })
  → worker + serialização
  → preview montado / export dos dois STLs
```

## Exportação

- Dois STLs binários: `<nome>-tela.stl` e `<nome>-suporte.stl`
- Cada peça sai centralizada na mesa, com a base em `y = 0`
- O STL não carrega cor

## Validação

- `screen-frame`: aro consome o disco
- `screen-empty`: nenhum favo cabe
- `screen-density`: limite de favos atingido
- `screen-opening`: abertura maior que o raio interno
- `screen-line`: linha abaixo de 0,4 mm (defensivo)
- `support-step` (error/warning, defensivo): degrau não sustenta a tela ou
  sustenta menos de 1 mm; a UI não alcança (mínimo de 1,4 mm)
- `support-step-frame`: degrau avança sob a área perfurada da tela
- `support-wall`: parede abaixo de 0,8 mm (defensivo)
- `support-bottom`: fundo abaixo de 0,8 mm (defensivo)
- `support-clearance`: folga da tela abaixo de 0,2 mm
- `support-depth`: profundidade da bacia limitada para manter a parede mínima

## Decisões da v1

- `buildSupport` usa `LatheGeometry` com um perfil 2D fechado no plano `(r, y)`
  (fundo → parede externa → aro → parede do rebaixo → degrau → arco esférico →
  centro do fundo), sem CSG; os triângulos degenerados do eixo são removidos.
- `buildThermoformer` orquestra `buildScreen` e `buildSupport` e devolve
  `{ screen, support, seatY }`, onde `seatY = effectiveBowlDepth + bottomThickness`.
- A profundidade efetiva é limitada (`effectiveBowlDepth`) até manter 0,8 mm de
  parede entre a bacia e o raio externo; `support-depth` avisa quando o clamp
  atua.
- Suporte e tela são exportados separadamente, como as peças da Caixa.
- `ExtrudeGeometry` com furos hexagonais nativos, validado por spike com ~1.200
  favos antes de seguir.
- Cada favo é girado em 0,001 rad (`HEXAGON_ANGLE_EPSILON`) para evitar
  vértices exatamente colineares entre favos vizinhos; sem isso o Earcut deixa
  os caps abertos.
- Favos parciais descartados; sem CSG.
- Cor não rebuilda geometria; as duas peças usam a mesma cor PLA.
- A linha padrão é 0,4 mm, equivalente a uma extrusão com bico de 0,4 mm; abaixo
  disso a malha fica frágil e a validação avisa.
- `fitRadius` usa a esfera envolvente do suporte, não a diagonal da AABB.
- O build roda em worker; configurações extremas (~3.571 favos) levam ~7 s.
- Serialização local de duas peças, independente da Caixa.

## Fora de escopo

Corpo, tampa, pino lateral, base, curvatura, furo de vácuo, rosca, anel de
retenção, 3MF/STEP e outros formatos.
