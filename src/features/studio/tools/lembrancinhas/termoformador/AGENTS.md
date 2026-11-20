# Ferramenta: Termoformador

## Status

implementada (v1: tela + suporte + macho).

## Objetivo

Gerar a tela circular, o suporte côncavo e o macho convexo do termoformador: um
disco plano com aro sólido e malha hexagonal vazada, um berço circular côncavo
com bacia esférica e rebaixo, onde a tela apoia e fica nivelada com o topo, e o
molde convexo que conforma a tela plana aquecida na bacia. A tela permanece
plana; o macho é a ferramenta de conformação. As três peças são independentes e
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

### Macho

| Parâmetro | Faixa | Default |
|---|---|---|
| `plugHeight` | 10–40 mm | 26 |

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
- O macho é derivado da bacia do suporte deslocada por `thickness`; a coroa de
  contato fica em `seatY + thickness` e a parede-guia em `diameter/2`, entrando
  no rebaixo com `fitClearance`.
- A profundidade efetiva da bacia é limitada a `cavityTopRadius` (no máximo uma
  semi-esfera) para o macho poder ser inserido e retirado; `support-depth` avisa
  quando o limite atua.
- A tela é exportada plana e conformada com o macho pelo usuário. O macho não
  tem cavidade interna modelada: é um volume fechado, impresso com 10–15% de
  preenchimento.
- A pega é um recesso cônico central de parede entre 40° e 45°; o macho é
  impresso girado 180°, com o topo plano na mesa e o domo para cima.
- Sem CSG

## Pipeline

```text
Parâmetros
  → schema + validação
  → dimensões do suporte com limite de semi-esfera
  → layout hexagonal
  → buildScreen + buildSupport
  → dimensões e perfil do macho
  → buildPlug (perfil 2D → LatheGeometry)
  → buildThermoformer ({ screen, support, plug, seatY })
  → worker + serialização das três peças
  → preview montado / export dos três STLs
```

## Exportação

- Três STLs binários: `<nome>-tela.stl`, `<nome>-suporte.stl` e
  `<nome>-macho.stl`
- Tela e suporte saem como construídos; o macho é girado 180° com o topo plano
  na mesa e o domo para cima
- Cada peça sai centralizada na mesa, com a base em `y = 0`
- O STL não carrega cor
- Três downloads podem acionar a permissão de múltiplos arquivos do navegador

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
- `support-depth`: profundidade efetiva limitada pela parede ou pela semi-esfera,
  mantendo a parede e a forma imprimível da bacia
- `plug-guide` (error, defensivo): coroa de contato inválida ou parede-guia
  menor que a coroa; a UI não alcança

## Decisões da v1

- `buildSupport` usa `LatheGeometry` com um perfil 2D fechado no plano `(r, y)`
  (fundo → parede externa → aro → parede do rebaixo → degrau → arco esférico →
  centro do fundo), sem CSG; os triângulos degenerados do eixo são removidos.
- O limite de semi-esfera limita a bacia a `cavityTopRadius`; sem ele a bacia
  viraria sobrequeda e o macho não poderia ser retirado.
- `buildPlug` usa `LatheGeometry` com um perfil fechado no plano `(r, y)`:
  polo do domo → domo (bacia deslocada por `thickness`) → coroa plana em
  `seatY + thickness` → parede-guia em `diameter/2` → topo com chanfro → face
  superior → recesso cônico → ápice da pega. Sem CSG; os triângulos degenerados
  dos polos são removidos.
- `buildThermoformer` orquestra `buildScreen`, `buildSupport` e `buildPlug` e
  devolve `{ screen, support, plug, seatY }`, onde
  `seatY = effectiveBowlDepth + bottomThickness`.
- A profundidade efetiva é limitada (`effectiveBowlDepth`) até manter 0,8 mm de
  parede entre a bacia e o raio externo e até a semi-esfera; `support-depth`
  avisa quando o clamp atua.
- Tela, suporte e macho são exportados separadamente, como as peças da Caixa.
- A tela plana evita exportar uma calota que não corresponde ao estado impresso;
  o macho é a ferramenta de conformação.
- A pega cônica imprime sem suporte e mantém o topo plano na mesa, sem marcar a
  face de contato.
- O macho é um volume fechado; a leveza vem do preenchimento de 10–15% no
  fatiador, já que o STL não carrega infill e uma cavidade selada não seria
  imprimível.
- `ExtrudeGeometry` com furos hexagonais nativos, validado por spike com ~1.200
  favos antes de seguir.
- Cada favo é girado em 0,001 rad (`HEXAGON_ANGLE_EPSILON`) para evitar
  vértices exatamente colineares entre favos vizinhos; sem isso o Earcut deixa
  os caps abertos.
- Favos parciais descartados; sem CSG.
- Cor não rebuilda geometria; as três peças usam a mesma cor PLA.
- A linha padrão é 0,4 mm, equivalente a uma extrusão com bico de 0,4 mm; abaixo
  disso a malha fica frágil e a validação avisa.
- O preview mostra a tela plana em `seatY` e o macho suspenso em
  `plugLift = effectiveBowlDepth + 8 mm`; `fitRadius` usa a união suporte +
  macho suspenso. A status bar continua mostrando o envelope do suporte.
- O build roda em worker; configurações extremas (~3.571 favos) levam ~7 s.
- Serialização local das três peças, independente da Caixa.

## Fora de escopo

Tela conformada, cavidade interna modelada no macho, pega em relevo, furo de
vácuo, corpo, tampa, pino lateral, base, rosca, anel de retenção, 3MF/STEP e
outros formatos.
