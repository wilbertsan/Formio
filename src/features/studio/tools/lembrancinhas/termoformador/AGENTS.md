# Ferramenta: Termoformador

## Status

Implementada (v2: círculo, quadrado, retângulo, pirâmide truncada e SVG). A v1
trouxe tela, suporte e macho circulares; a v2 generaliza o conjunto para a forma
escolhida, com bandeja de paredes inclinadas, CSG e silhueta SVG.

## Objetivo

Gerar a tela perfurada, o suporte côncavo e o macho convexo do termoformador: um
disco ou placa plana com aro sólido e malha hexagonal vazada, um berço onde a
tela apoia nivelada com o topo e o molde convexo que conforma a tela plana
aquecida. A forma escolhida define o **conjunto inteiro** — tela, suporte e macho
— e não há mistura de tela quadrada com suporte circular.

- **Círculo** — tela redonda e bacia esférica, como na v1.
- **Quadrado** — tela quadrada e bandeja de fundo plano com paredes inclinadas.
- **Retângulo** — tela retangular e bandeja com paredes inclinadas.
- **Pirâmide** — base quadrada e cavidade em pirâmide truncada, com fundo
  pequeno e plano.
- **SVG** — silhueta única, fechada, sem furos nem ilhas, e bandeja com paredes
  inclinadas.

A tela permanece plana; o macho é a ferramenta de conformação. As três peças são
independentes e saem em STLs separados. Corpo, tampa, pino lateral e base ficam
para versões seguintes.

## Parâmetros

### Forma

| Parâmetro | Faixa | Default |
|---|---|---|
| `shape` | `circle`, `square`, `rectangle`, `pyramid`, `svg` | `circle` |
| `diameter` | 60–300 mm (círculo) | 160 |
| `width` | 40–300 mm | 160 |
| `height` | 40–300 mm (retângulo) | 100 |
| `svgSize` | 40–300 mm (maior dimensão) | 160 |
| `draftAngle` | 0–15° (bandeja) | 5 |
| `pyramidTip` | 0,05–0,30 (fração da base) | 0,10 |
| `svg` | string do arquivo (até 2.000.000 caracteres) | vazio |

### Tela

| Parâmetro | Faixa | Default |
|---|---|---|
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

`edgeChamfer` continua aplicado apenas ao suporte circular; as bandejas das novas
formas são prismas retos.

## Regras do domínio

- 1 unidade Three.js = 1 mm.
- A forma define tela, suporte e macho. O contorno é único e fechado.
- Tela plana, espessura constante e aro sólido de `frameWidth`.
- O contorno da tela é o polígono em mm para quadrado, retângulo, pirâmide e SVG;
  o círculo mantém `diameter/2` e o caminho circular.
- Offsets do contorno:
  - `perforated = offset(paths, -frameWidth)`: região da malha.
  - `effectiveStep = max(stepWidth, frameWidth + fitClearance)` nas novas formas;
    o círculo mantém `stepWidth`.
  - `cavityOpening = offset(paths, fitClearance - effectiveStep)`: borda interna
    da moldura, já recuada pelo degrau efetivo.
  - `recess = offset(paths, +fitClearance)` e
    `supportOuter = offset(recess, +wallThickness)`.
  - `miter` para quadrado, retângulo e pirâmide; `round` para SVG.
- Malha hexagonal flat-top: passo `opening + lineWidth` e circunraio
  `opening / √3`. Só entram favos cujo centro está dentro de `perforated`
  recuado pelo circunraio; favos parciais são descartados.
- Limite de 4.000 favos; acima disso a abertura cresce 15% por iteração.
- Malha sempre fechada, manifold e sem favos fora do aro. Cada favo é girado em
  0,001 rad (`HEXAGON_ANGLE_EPSILON`) para evitar vértices exatamente colineares
  entre favos vizinhos; sem isso o Earcut deixa os caps abertos.
- A tela apoia no degrau e fica nivelada com o topo:
  `seatY = effectiveDepth + bottomThickness`;
  `height = thickness + effectiveDepth + bottomThickness`;
  `contactY = seatY + thickness`; `bodyTop = contactY + plugHeight`.
- Bandeja (quadrado, retângulo e SVG):
  `bottomScale = 1 - 2 × effectiveDepth × tan(draftAngle) / min(cavityOpening)`,
  onde `min(cavityOpening)` é a menor dimensão da abertura. Abaixo de 5%, a
  profundidade efetiva é reduzida para manter `bottomScale = 0,05` (`support-depth`
  avisa). O fundo é uma cópia reduzida do contorno, com paredes inclinadas para
  desmoldar.
- Pirâmide truncada: `bottomScale = pyramidTip` e
  `bottomMin = bottomScale × min(cavityOpening)`. O fundo é um quadrado pequeno,
  não um ponto; `support-tip` avisa quando fica abaixo de 3 mm. O macho tem a
  mesma pirâmide truncada, com ponta plana.
- O degrau efetivo é mostrado no painel. Se `stepWidth` for menor que
  `frameWidth + fitClearance`, o degrau é ampliado e `support-step-clamped` avisa;
  se `stepWidth` for maior, o degrau avança sob a área perfurada e
  `support-step-frame` avisa. `support-draft` avisa quando o ângulo de saída fica
  abaixo de 2° nas formas de bandeja.
- SVG:
  - Upload por `input type="file"` + botão, como no Cortador + Carimbo.
  - O `SVGLoader` depende de `DOMParser`, que não existe no worker. O parse roda
    na **main thread**, é cacheado pelo conteúdo e o worker recebe o `ParsedSvg`.
  - Preenchimentos são unidos; traços viram contorno com a largura declarada. O
    resultado precisa ser uma silhueta única, fechada, sem furos e sem ilhas;
    caso contrário, o erro é `svg-contour`.
  - Escala uniforme pela maior dimensão (`svgSize`), centro na origem e correção
    do eixo Y do SVG; o Y do contorno vira -Z nas peças.
  - O SVG é usado pela tela, pelo suporte, pelo macho e pelo padrão.
  - SVG ausente (`svg-missing`) ou ilegível (`svg-parse`) não chama o worker.
    `svg-size` (**error**) bloqueia quando o contorno da tela passa de 300 mm
    (defensivo; `svgSize` já é limitado a 300). `svg-feature` (**error**)
    bloqueia quando algum offset deixa de ser uma única silhueta ou quando o
    contorno passa de 1.500 pontos.
- Suporte das novas formas: prisma externo − prisma do rebaixo − loft da
  cavidade, com CSG. O rebaixo vai de `seatY` ao topo; a cavidade vai de
  `bottomThickness` a `seatY`, com topo em `cavityOpening` e fundo em
  `cavityOpening × bottomScale`. A base fica em `y = 0` e o topo em `height`.
- Macho das novas formas: prisma do corpo de `contactY` a `bodyTop` ∪ loft da
  protrusão, com topo em `contactY` e fundo em
  `bottomThickness + thickness`; a coroa entre o contorno da tela e
  `cavityOpening` pressiona a moldura. O cone da pega é subtraído do topo.
- O CSG usa `three-bvh-csg` com CDT (`useCDTClipping`), o mesmo caminho do
  Porta-lata. O avaliador restringe os atributos a `position`/`normal`, remove
  triângulos degenerados (`removeDegenerateTriangles`) e repara T-junctions
  (`splitTJunctions`) antes de devolver a malha. As uniões sobem 0,1 mm
  (`PLUG_PROTRUSION_OVERLAP_MM`) e o corte da pega começa 0,1 mm acima do topo
  (`PLUG_GRIP_OVERLAP_MM`) para o CSG não cortar faces coplanares.
- A pega das novas formas é segura: o centro só é aceito se o disco do raio
  inteiro cabe no material. O algoritmo encolhe o contorno pelo raio pedido,
  escolhe a maior ilha, usa o centro do envelope quando ele está dentro e, senão,
  o baricentro do maior triângulo da triangulação. Sem centro interior ou sem
  material, a pega é desabilitada, o macho sai com topo plano e `plug-grip` avisa.
- A profundidade da pega é limitada para manter 6 mm de material
  (`PLUG_GRIP_MIN_MATERIAL_MM`). Sobre a cavidade, o piso é
  `bottomThickness + thickness`; fora dela, é a face de contato (`contactY`), para
  o cone não furar a coroa. O raio acompanha a profundidade (`depth / 1,2`, parede
  de 40–45°), com máximo de 30 mm e mínimo de 0,5 mm.
- O círculo mantém a v1: suporte e macho em `LatheGeometry`, bacia esférica
  fechada, limite de semi-esfera e perfil de revolução, sem CSG. As novas formas
  usam prismas/lofts e CSG; não há caminho poligonal no modo circular.
- O diâmetro do suporte circular é derivado da tela
  (`recessRadius = D/2 + fitClearance`,
  `outerRadius = recessRadius + wallThickness`). O macho circular é a bacia
  deslocada por `thickness`, com coroa em `seatY + thickness` e parede-guia em
  `diameter/2`.
- A profundidade efetiva da bacia circular é limitada a `cavityTopRadius` (no
  máximo uma semi-esfera) para o macho poder ser inserido e retirado;
  `support-depth` avisa quando o limite atua.
- A tela é exportada plana e conformada com o macho pelo usuário. O macho não tem
  cavidade interna modelada: é um volume fechado, impresso com 10–15% de
  preenchimento.
- O macho é impresso girado 180°, com o topo plano na mesa e a peça convexa para
  cima; assim imprime sem suporte e a face de contato não recebe marcas.
- Cor não rebuilda geometria; as três peças usam a mesma cor PLA.

## Pipeline

```text
Parâmetros + SVG
  → schema + validação (main thread)
  → contorno (círculo, quadrado, retângulo, pirâmide ou SVG)
  → offsets (perforated, cavityOpening, recess, supportOuter) e degrau efetivo
  → padrão hexagonal e buildScreen
  → dimensões da bandeja/pirâmide (getTrayDimensions)
  → buildSupport (Lathe no círculo; CSG nas novas formas)
  → buildPlug (Lathe no círculo; CSG nas novas formas)
  → buildThermoformer ({ screen, support, plug, seatY })
  → worker + serialização das três peças
  → preview montado / export dos três STLs
```

## UI

- Acordeões: **Forma** (novo, antes de Tela), Tela, Malha, Suporte, Macho,
  Aparência e Validação.
- **Forma** — `SelectField` com Círculo, Quadrado, Retângulo, Pirâmide e SVG;
  campos condicionais (Diâmetro, Lado, Largura/Altura, Lado da base/Fundo da
  pirâmide, Tamanho do SVG), upload/remoção do SVG e ângulo de saída.
- O painel mostra largura × altura da tela, envelope e altura do suporte, degrau
  efetivo, parede da cavidade, guia e pega do macho. O SVG carregado exibe o nome
  do arquivo e o erro em um `Alert`.
- O status bar continua mostrando o envelope do suporte.
- A nota do macho lembra que a tela é exportada plana e conformada pelo usuário.

## Exportação

- Três STLs binários: `<nome>-tela.stl`, `<nome>-suporte.stl` e
  `<nome>-macho.stl`.
- Tela e suporte saem como construídos; o macho é girado 180° com o topo plano
  na mesa e a peça convexa para cima.
- Cada peça sai centralizada na mesa, com a base em `y = 0`.
- O STL não carrega cor.
- Três downloads podem acionar a permissão de múltiplos arquivos do navegador.

## Validação

Círculo:

- `screen-frame`: aro consome o disco.
- `screen-empty`: nenhum favo cabe.
- `screen-density`: limite de 4.000 favos atingido.
- `screen-opening`: abertura maior que o raio interno.
- `screen-line`: linha abaixo de 0,4 mm (defensivo).
- `support-step` (error/warning, defensivo): degrau não sustenta a tela ou sustenta
  menos de 1 mm; a UI não alcança (mínimo de 1,4 mm).
- `support-step-frame`: degrau avança sob a área perfurada da tela.
- `support-wall`: parede abaixo de 0,8 mm (defensivo).
- `support-bottom`: fundo abaixo de 0,8 mm (defensivo).
- `support-clearance`: folga da tela abaixo de 0,2 mm.
- `support-depth`: profundidade efetiva limitada pela parede ou pela semi-esfera.
- `plug-guide` (error, defensivo): coroa de contato inválida ou parede-guia menor
  que a coroa; a UI não alcança.

Novas formas:

- `screen-frame`: o aro consome a forma.
- `screen-empty`: nenhum favo cabe.
- `screen-density`: limite de 4.000 favos atingido.
- `screen-opening`: abertura grande para a menor dimensão da área perfurada.
- `screen-line`: linha abaixo de 0,4 mm (defensivo).
- `support-step-clamped`: degrau efetivo ampliado para caber sob a moldura.
- `support-step-frame`: degrau avança sob a área perfurada.
- `support-draft`: ângulo de saída abaixo de 2° nas formas de bandeja.
- `support-tip`: fundo da pirâmide abaixo de 3 mm.
- `support-wall`: parede abaixo de 0,8 mm (defensivo).
- `support-bottom`: fundo abaixo de 0,8 mm (defensivo).
- `support-clearance`: folga da tela abaixo de 0,2 mm.
- `support-depth`: profundidade efetiva reduzida para o fundo não colapsar.
- `plug-grip`: pega desabilitada ou pequena para a forma; o macho sai com topo
  plano.
- `svg-missing`: modo SVG sem arquivo.
- `svg-parse`: SVG ilegível.
- `svg-contour`: não é uma silhueta única, sem furos ou ilhas.
- `svg-feature`: offset do SVG dividido em ilhas ou contorno acima de 1.500
  pontos. É **error** no código (o design previa warning) e impede o build.
- `svg-size`: contorno da tela acima de 300 mm (defensivo; o envelope do
  suporte pode passar de 300 mm). É **error** e bloqueia o build.

Avisos não bloqueiam o build. Erros de SVG (`svg-feature`/`svg-size`) impedem o
build antes do worker; uma falha de CSG ou do worker aparece no overlay.

## Decisões

- **Conjunto inteiro:** a forma define tela, suporte e macho; não há mistura de
  tela quadrada com suporte circular.
- **Círculo sem regressão:** o modo circular mantém `LatheGeometry`, a bacia
  esférica, o limite de semi-esfera e a pega cônica atuais.
- **Bandeja com paredes inclinadas:** fundo plano e saída para retirar a tela e o
  macho; o fundo é uma cópia reduzida do contorno.
- **Pirâmide truncada:** base quadrada e fundo pequeno; evita ponta fina e mantém
  o macho imprimível.
- **Degrau efetivo:** `max(stepWidth, frameWidth + fitClearance)` alinha a moldura
  ao degrau e evita a colisão com o macho nas novas formas.
- **CSG com CDT:** reutiliza o caminho testado do Porta-lata. O modo circular
  continua em `LatheGeometry`; não há CSG no círculo.
- **Spike obrigatório:** o CSG foi provado em quadrado, pirâmide, retângulo,
  estrela e C antes da generalização. O fallback de loft de anéis não foi
  necessário.
- **Limpeza e T-junctions:** a malha do CSG passa por remoção de triângulos
  degenerados e reparo de T-junctions; os testes exigem `isClosed`, volume
  positivo e nenhum triângulo de área zero.
- **Pega segura:** o centro vem do maior componente interior, não do centro do
  envelope, para não cair no vão de formas côncavas como C e L.
- **SVG de silhueta única:** mantém as três peças imprimíveis; furos/ilhas ficam
  fora da v2.
- **Parse do SVG na main thread:** `DOMParser` não existe no worker; o
  `ParsedSvg` é serializável e cacheado pelo conteúdo.
- **Maior dimensão:** o SVG é dimensionado por `svgSize`, preservando a
  proporção.
- **Uma cor:** as três peças usam a mesma cor PLA; o STL não carrega cor.
- **Build em worker:** as novas formas acrescentam CSG; o build continua fora da
  main thread, com descarte de respostas obsoletas.
- **Export por snapshot:** as geometrias do build são clonadas e centralizadas na
  mesa; a tela e o suporte saem como construídos e o macho é girado.

## Riscos e limitações conhecidas

- **CSG com contornos côncavos:** o CDT e o reparo de T-junctions fecham os casos
  testados, mas SVGs muito recortados ainda são o maior custo e o maior risco de
  malha. O teste de fechamento e volume é a barreira.
- **C próximo do limite:** com uma barra estreita logo acima do raio da pega, o
  suporte pode apresentar uma costura capilar e `isClosed` falso; o macho
  correspondente fecha e é o caso coberto por teste. A validação não sinaliza
  essa costura (`svg-feature` só pega offsets que viram ilhas ou contornos acima
  de 1.500 pontos); evite SVGs nesse limite ou simplifique o contorno.
- **Degrau/moldura:** o degrau efetivo e a validação reduzem o risco de colisão,
  mas o macho depende de a moldura ficar exatamente sobre o degrau.
- **SVG complexo:** o limite de 1.500 pontos e o parse na main thread mantêm o
  custo controlado; o build roda no worker.
- **Performance:** o pior caso circular (~3.571 favos) levou ~7 s; as novas formas
  acrescentam CSG e também rodam no worker para não travar a UI.
- **Fundo colapsando:** a profundidade é limitada a 5% da abertura e
  `support-depth` avisa; a pirâmide tem o limite de 3 mm em `support-tip`.
- **Regressão no círculo:** os testes da v1 continuam e o caminho Lathe não é
  alterado.
- **Chanfro:** `edgeChamfer` só vale para o círculo; as bandejas são prismas
  retos.
- **Três downloads:** podem acionar a permissão de múltiplos arquivos do
  navegador.

## Fora de escopo

Bacia esférica nas novas formas, pirâmide de base retangular, SVG com furos,
ilhas ou vários contornos externos, tela conformada, cavidade interna modelada no
macho, pega em relevo, furo de vácuo, corpo, tampa, pino lateral, base, rosca,
anel de retenção, perfil de parede variável por face, undercut, 3MF/STEP e outros
formatos.
