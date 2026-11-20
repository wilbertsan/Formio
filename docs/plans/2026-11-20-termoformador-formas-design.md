# Termoformador — Formas quadrada, retangular, pirâmide e SVG (v2)

**Data:** 2026-11-20
**Ferramenta:** `lembrancinhas/termoformador`
**Status:** design aprovado; implementação pendente

## Objetivo

Generalizar o Termoformador para que a forma escolhida defina o **conjunto
inteiro** — tela, suporte e macho:

- **círculo** — mantém o modo atual: tela redonda e bacia esférica;
- **quadrado** — tela quadrada e cavidade em bandeja de fundo plano com paredes
  inclinadas;
- **retângulo** — tela retangular e bandeja com paredes inclinadas;
- **pirâmide** — base quadrada, pirâmide truncada com fundo pequeno;
- **SVG** — silhueta única, fechada, sem furos nem ilhas, e bandeja com paredes
  inclinadas.

A tela continua plana e é conformada pelo macho. As três peças continuam
independentes, com três STLs.

## Escopo da v2

Incluído:

- Contorno paramétrico para quadrado, retângulo e pirâmide.
- Silhueta personalizada por SVG, com upload, escala e validação.
- Bandeja de fundo plano e paredes inclinadas para quadrado, retângulo e SVG.
- Pirâmide truncada de base quadrada para o modo pirâmide.
- Tela perfurada com malha hexagonal dentro de qualquer um dos contornos.
- Suporte e macho derivados do contorno, com degrau, rebaixo, cavidade, coroa e
  protrusão.
- Preview, export de três STLs, validação por forma e painel com seletor.
- Spike de CSG antes de generalizar a construção.

Excluído:

- Bacia esférica nas novas formas (o círculo continua com a bacia atual).
- Pirâmide de base retangular.
- SVG com furos, ilhas ou vários contornos externos.
- Peças separadas por ilha, furo de vácuo, corpo, tampa, base, rosca, anel de
  retenção, 3MF/STEP e simulação de termoformagem.
- Perfil de parede variável por face e undercut.

## Parâmetros

| Parâmetro | Faixa | Default |
|---|---|---|
| `shape` | `circle`, `square`, `rectangle`, `pyramid`, `svg` | `circle` |
| `width` | 40–300 mm | 160 |
| `height` | 40–300 mm (só retângulo) | 100 |
| `svgSize` | 40–300 mm (maior dimensão) | 160 |
| `draftAngle` | 0–15° (bandeja) | 5 |
| `pyramidTip` | 0,05–0,30 (fração da base) | 0,10 |
| `svg` | string do arquivo | vazio |
| `diameter` | 60–300 mm (círculo) | 160 |

Os parâmetros existentes continuam: `thickness`, `frameWidth`, `lineWidth`,
`opening`, `wallThickness`, `bottomThickness`, `bowlDepth`, `stepWidth`,
`fitClearance`, `edgeChamfer`, `plugHeight` e `color`.

## Modelo de geometria

### Contorno da tela

- Círculo: a circunferência de `diameter/2`.
- Quadrado: um quadrado de lado `width`.
- Retângulo: um retângulo `width × height`.
- Pirâmide: um quadrado de lado `width`; a cavidade é uma pirâmide truncada.
- SVG: a silhueta achatada, escalada pela maior dimensão para `svgSize`,
  centralizada na origem e com o eixo Y corrigido.

O contorno é fechado e sem furos. Todos os contornos são representados como
polígonos em mm, exceto o círculo, que mantém o caminho circular atual na tela e
no suporte/macho de revolução.

### Tela

- A tela é plana, com espessura `thickness` e moldura sólida de `frameWidth`.
- A região perfurada é o contorno deslocado para dentro em `frameWidth`.
- A malha hexagonal flat-top mantém `spacing = opening + lineWidth`, circunraio
  `opening / √3`, limite de 4.000 favos e crescimento de 15% quando estoura.
- Um favo entra quando seu centro está dentro da região perfurada recuada pelo
  seu circunraio. Favos parciais são descartados.
- A geometria é um `ExtrudeGeometry` do contorno com os `Path` hexagonais,
  girado para deitar em XZ.

### Bandeja e pirâmide

Para quadrado, retângulo e SVG:

```text
effectiveStep = max(stepWidth, frameWidth + fitClearance)
cavityOpening = screen - frameWidth          (abertura = borda interna da moldura)
stepWidthUsed = effectiveStep
bottomScale = 1 - 2 * bowlDepth * tan(draftAngle) / min(width, height)
bottom = cavityOpening * bottomScale
```

- A moldura da tela fica exatamente sobre o degrau; o macho não colide com ela.
- O degrau efetivo é mostrado no painel; se `stepWidth` for menor que
  `frameWidth + fitClearance`, o degrau é ampliado e `support-step-clamped`
  avisa.
- Se `bottomScale < 0,05`, a profundidade efetiva é reduzida para manter o
  fundo mínimo e `support-depth` avisa.
- `support-draft` avisa quando o ângulo de saída é menor que 2°.

Para a pirâmide:

```text
cavityOpening = screen - frameWidth
bottomScale = pyramidTip
bottom = cavityOpening * pyramidTip
```

A pirâmide é truncada: o fundo é um quadrado pequeno, não um ponto. O macho tem
a mesma pirâmide truncada, com ponta plana. `support-tip` avisa quando o fundo
fica menor que 3 mm.

O círculo mantém a bacia esférica, o limite de semi-esfera e as regras atuais.

### Suporte

- Prisma externo = contorno da tela expandido por `fitClearance +
  wallThickness`.
- Rebaixo = contorno + `fitClearance`, de `seatY` até o topo.
- Cavidade = loft do `cavityOpening` em `seatY` até o `bottom` em
  `bottomThickness`.
- `seatY = effectiveDepth + bottomThickness`.
- `height = thickness + effectiveDepth + bottomThickness`.
- A tela apoia no degrau e fica nivelada com o topo.
- O fundo da cavidade fica em `bottomThickness`; a placa inferior é preservada.
- No modo circular, o suporte continua no `LatheGeometry` atual.

### Macho

- Corpo/prisma-guia no contorno da tela, de `contactY` a `bodyTop`.
- `contactY = seatY + thickness`; `bodyTop = contactY + plugHeight`.
- Protrusão = o mesmo loft da cavidade, deslocado por `thickness`: topo em
  `contactY`, fundo em `bottomThickness + thickness`.
- Coroa de contato = região entre o contorno da tela e o `cavityOpening`; ela
  pressiona a moldura.
- Topo plano com recesso cônico central; o raio da pega é derivado de
  `plugHeight` e da menor dimensão do contorno, limitado a 30 mm.
- O macho é exportado girado 180°, com o topo na mesa e a protrusão para cima.
- No modo circular, o macho continua no `LatheGeometry` atual.

### Degrau no modo circular

O modo circular mantém o `stepWidth` atual e o comportamento existente. O
degrau efetivo derivado da moldura vale apenas para as novas formas, onde o
macho tem uma protrusão plana que colidiria com a moldura se o degrau fosse
menor.

## Construção

### Abordagem recomendada: CSG

Para as formas não circulares:

- Suporte = prisma externo − prisma do rebaixo − loft da cavidade.
- Macho = prisma do corpo ∪ loft da protrusão − cone da pega.
- `three-bvh-csg` com `useCDTClipping` (o mesmo caminho do Porta-lata).
- Limpeza de triângulos degenerados por posição após o CSG.
- Prismas via `ExtrudeGeometry`; cavidade/protrusão via loft de dois anéis com
  tampas trianguladas.
- O modo circular continua sem CSG.

O CSG garante contornos côncavos e arbitrários do SVG. A malha de saída precisa
ser fechada, com volume positivo e sem auto-interseções.

### Spike obrigatório

Antes de generalizar:

1. Construir suporte e macho de um quadrado, de uma pirâmide e de um SVG
   côncavo (estrela ou coração).
2. Verificar `isClosed`, volume positivo, bbox e tempo de build no worker.
3. Verificar que o macho entra na cavidade sem colidir com a moldura.
4. Verificar a impressão do suporte (base na mesa) e do macho (topo na mesa).

Se o CSG não fechar de forma confiável, o fallback é um **loft de anéis sem
CSG**: anéis externos e internos do suporte e do macho, com tampas e transições
de degrau/rebaixo. O fallback aumenta o código, mas elimina o risco de CSG.

## SVG

- Upload por `input type="file"` + botão, como no Cortador + Carimbo.
- O `SVGLoader` depende de `DOMParser`, que não existe no worker. O parse roda na
  **main thread**, é cacheado por conteúdo e o worker recebe o `ParsedSvg`.
- Preenchimentos são unidos; traços viram contorno com a largura declarada.
- O resultado precisa ser **uma silhueta única, fechada, sem furos e sem
  ilhas**. Caso contrário: erro `svg-contour`.
- Escala uniforme pela maior dimensão (`svgSize`), centro na origem e correção
  do eixo Y do SVG.
- O contorno é usado pela tela, pelo suporte, pelo macho e pelo padrão.
- SVG ausente: `svg-missing`; SVG ilegível: `svg-parse`; traço fino demais:
  `svg-feature`; contorno maior que o suporte: `svg-size`.
- O painel mostra a largura × altura resultantes.

## UI

Novo acordeão **Forma** no topo, antes de Tela:

1. **Forma** — `SelectField` com Círculo, Quadrado, Retângulo, Pirâmide e SVG;
   campos condicionais; upload do SVG; ângulo de saída; fundo da pirâmide;
   métricas de largura × altura e degrau efetivo.
2. **Tela** — espessura.
3. **Malha** — abertura, linha e aro.
4. **Suporte** — parede, fundo, profundidade, degrau, folga e chanfro.
5. **Macho** — altura do corpo, pega e métricas.
6. **Aparência** — cor PLA única.
7. **Validação** — issues da forma, tela, suporte, macho e SVG.

- Círculo: Diâmetro.
- Quadrado: Lado.
- Retângulo: Largura e Altura.
- Pirâmide: Lado da base e Fundo da pirâmide.
- SVG: Tamanho do SVG, botão de upload e remoção.
- Nota: a tela é exportada plana e conformada com o macho.
- O status bar continua com o envelope do suporte; o painel mostra as medidas
  da tela e do macho.
- Sem componente novo de UI; reutilizar `Accordion`, `SelectField`,
  `SliderField`, `Button`, `Text`, `Flex` e `Alert`.

## Preview

- Suporte na base, tela plana em `seatY` e macho suspenso em
  `effectiveDepth + 8 mm`.
- `fitRadius` pela união suporte + macho suspenso.
- A forma é visível no contorno da tela, no suporte e no macho.
- SVG sem arquivo ou inválido: preview vazio/estado de erro no painel.

## Exportação

- Três STLs binários: `<nome>-tela.stl`, `<nome>-suporte.stl` e
  `<nome>-macho.stl`.
- Tela e suporte como construídos; macho girado 180°.
- Cada peça centralizada na mesa, com a base em `y = 0`.
- O STL não carrega cor.
- Três downloads podem acionar a permissão de múltiplos arquivos.

## Validação

| Código | Severidade | Regra |
|---|---|---|
| `screen-frame` | error | a moldura consome a forma |
| `screen-empty` | warning | nenhum favo cabe |
| `screen-density` | warning | limite de 4.000 favos atingido |
| `screen-opening` | warning | abertura grande para a região perfurada |
| `screen-line` | warning | linha abaixo de 0,4 mm |
| `support-step` | error/warning | degrau não sustenta a tela |
| `support-step-frame` | warning | degrau avança sob a área perfurada |
| `support-step-clamped` | warning | degrau efetivo ampliado para caber sob a moldura |
| `support-wall` | error | parede abaixo de 0,8 mm |
| `support-bottom` | error | fundo abaixo de 0,8 mm |
| `support-clearance` | warning | folga abaixo de 0,2 mm |
| `support-depth` | warning | profundidade limitada pela parede, semi-esfera ou fundo |
| `support-draft` | warning | ângulo de saída abaixo de 2° |
| `support-tip` | warning | fundo da pirâmide abaixo de 3 mm |
| `plug-guide` | error | coroa/protrusão inválida (defensivo) |
| `plug-grip` | warning | pega pequena para a forma (defensivo) |
| `svg-missing` | error | modo SVG sem arquivo |
| `svg-parse` | error | SVG ilegível |
| `svg-contour` | error | não é silhueta única, sem furos/ilhas |
| `svg-feature` | warning | traço mais fino que a linha/frame |
| `svg-size` | error | contorno maior que o suporte |

Avisos não bloqueiam o build; erros de SVG impedem o build até corrigir.

## Arquitetura de arquivos

```text
src/features/studio/tools/lembrancinhas/termoformador/
  schema.ts                 # shape, width, height, svgSize, draftAngle,
                            # pyramidTip, svg, defaults e constantes
  outline.ts                # contorno, offsets, bounds, silhueta SVG
  svgOutline.ts             # parse/validação/escala/orientação do SVG
  screenPattern.ts          # padrão hexagonal por região
  buildScreen.ts            # contorno + favos -> ExtrudeGeometry
  buildSupport.ts           # dispatch círculo (Lathe) / novas formas
  supportTray.ts            # dimensões, loft da cavidade e CSG do suporte
  buildPlug.ts              # dispatch círculo (Lathe) / novas formas
  plugTray.ts               # corpo, protrusão, pega e CSG do macho
  loft.ts                   # loft de anéis, tampas e prismas
  csg.ts                    # evaluator CDT + limpeza (ou shared)
  buildThermoformer.ts      # params + parsedSvg -> { screen, support, plug, seatY }
  validateThermoformer.ts   # issues por forma/SVG
  workerGeometry.ts         # serialização das três peças
  buildScreen.worker.ts     # recebe params + parsedSvg
  workerClient.ts           # build(params, parsedSvg, ...)
  useThermoformer.ts        # estado, parse/cache do SVG, worker, outline
  StudioPanel.tsx           # acordeão Forma, upload, campos condicionais
  ThermoformerPreview.tsx   # três malhas; plugLift pela profundidade efetiva
  exportStl.ts              # três STLs; macho girado
```

Referências compartilhadas:

- `../confeitaria/shared/svgToIconShape.ts` (`parseSvg`, `svgBoundsFromParsed`,
  `svgRawShapesFromParsed`) e `../confeitaria/shared/textOutline.ts`
  (`offsetPaths`, `unionPaths`, `pathsToShapes`, `scalePaths`, `toClipperPaths`).
- `../porta-lata/csg.ts` (`createConformingEvaluator`) e a limpeza de geometria
  do Porta-lata, ou uma cópia compartilhada em `lembrancinhas/shared/`.
- `../porta-lata/geometryCleanup.ts` como referência de limpeza por posição.

## Pipeline

```text
Parâmetros + SVG
  → schema + validação
  → contorno (círculo, quadrado, retângulo, pirâmide, SVG)
  → offsets (rebaixo, suporte, abertura da cavidade, região perfurada)
  → padrão hexagonal e tela
  → dimensões da bandeja/pirâmide
  → buildSupport (Lathe no círculo; CSG nas novas formas)
  → buildPlug (Lathe no círculo; CSG nas novas formas)
  → buildThermoformer ({ screen, support, plug, seatY })
  → worker + serialização
  → preview montado / export dos três STLs
```

## Decisões

- **Conjunto inteiro:** a forma define tela, suporte e macho; não há mistura de
  tela quadrada com suporte circular.
- **Círculo mantém a bacia esférica:** o modo atual não regride.
- **Bandeja com paredes inclinadas:** fundo plano, saída para retirar a tela e o
  macho; o fundo é uma cópia reduzida do contorno.
- **Pirâmide truncada:** base quadrada e fundo pequeno; evita ponta fina e
  mantém o macho imprimível.
- **Degrau efetivo:** nas novas formas, `max(stepWidth, frameWidth +
  fitClearance)` alinha a moldura ao degrau e evita a colisão com o macho.
- **CSG com CDT:** reutiliza o caminho testado do Porta-lata; o modo circular
  continua em `LatheGeometry`.
- **Spike obrigatório:** valida CSG em quadrado, pirâmide e SVG côncavo antes de
  generalizar; fallback em loft de anéis.
- **SVG de silhueta única:** mantém as três peças imprimíveis; furos/ilhas
  ficam fora da v2.
- **Parse do SVG na main thread:** `DOMParser` não existe no worker; o
  `ParsedSvg` é serializável e cacheado.
- **Maior dimensão:** o SVG é dimensionado por `svgSize`, preservando a
  proporção.
- **Uma cor:** as três peças usam a mesma cor PLA; o STL não carrega cor.

## Riscos e mitigação

- **CSG com contornos côncavos:** spike; CDT; limpeza e testes de malha;
  fallback loft.
- **Degrau/moldura:** clamp efetivo e validação; teste de colisão do macho com a
  moldura.
- **SVG complexo:** limite de pontos, validação de silhueta única e build no
  worker.
- **Performance:** CSG + malha hexagonal no worker; medir o pior caso e ajustar
  a resolução.
- **Fundo colapsando:** limite de profundidade e `support-depth`/`support-draft`.
- **Ponta da pirâmide:** fundo mínimo de 3 mm e `support-tip`.
- **Regressão no modo círculo:** testes atuais permanecem e o caminho Lathe não
  é alterado.

## Critérios de conclusão

- O painel permite escolher círculo, quadrado, retângulo, pirâmide e SVG.
- A tela, o suporte e o macho acompanham a forma e continuam encaixando.
- SVG aceita uma silhueta única e rejeita furos/ilhas com erro claro.
- O padrão hexagonal respeita a região perfurada de cada forma.
- Suporte e macho das novas formas são fechados, manifold, com volume positivo,
  e o macho não colide com a moldura.
- O export baixa os três STLs em todas as formas, com o macho na orientação de
  impressão.
- O modo circular continua idêntico ao atual.
- Typecheck, lint, testes e build passam.
- `termoformador/AGENTS.md`, `lembrancinhas/AGENTS.md` e
  `docs/frontend/studio.md` atualizados.
