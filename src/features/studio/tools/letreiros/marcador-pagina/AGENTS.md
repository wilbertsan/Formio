# Ferramenta: Marcador de Página

## Status

Implementada — build em Web Worker, gera e exporta STL localmente no navegador.

## O que faz

Gera marcadores de página 3D em **duas peças**: uma base plana e um texto em pé
com **encaixe em U na traseira**. Duas barras atrás do texto abraçam a borda da
base. A base pode receber **texturas em relevo** com motivos repetidos
(triângulos, quadrados, círculos, losangos) ou um **SVG repetido como motivo**.

## Parâmetros

| Parâmetro | Tipo | Faixa | Default |
|---|---|---|---|
| productType | literal | `bookmark` | `bookmark` |
| length | number | 50–150mm | 100 |
| width | number | 30–50mm | 50 |
| thickness | number | 1–2mm | 1 |
| baseColor / letterColor | enum | 10 cores PLA | teal / white |
| text | object | 1 texto | `Meu nome` |
| pattern | object | textura da base | `none` |

O objeto `text` tem:

- `content` (texto, mínimo 1 após trim, **sem máximo de caracteres**)
- `fontStyle` (`normal`/`bold`/`serif`)
- `width` (8–60mm) e `height` (4–40mm): a largura é reduzida para caber no alvo,
  sem ampliar; a altura é preservada e independente da largura
- `relief` (0.4–2mm): espessura da parede de texto

O objeto `pattern` tem:

- `type`: `none`, `triangles`, `squares`, `circles`, `diamonds` ou `svg`
- `density`: `low`/`medium`/`high` (células de 12/8/5mm)
- `depth` (0.4–1.5mm): altura do relevo da textura
- `svg`: string do SVG (usado quando `type = svg`)

## Regras do domínio

- Espessura padrão de 1mm (ajustável até 2mm) para não abrir demais o livro.
- Base em pé: largura no eixo X e comprimento no eixo Y.
- Texto em pé, formando 90° com a base: corre ao longo do comprimento (Y) e
  sobe em Z (`TEXT_ROTATION`). `height` é a altura da parede e `relief` a
  espessura da parede.
- Duas peças: base separada e texto separado.
- Base: borda direita em `x = -JOINT_CLEARANCE` (0,2mm da traseira do texto);
  centro em `splitBaseCenterX(width)`.
- Texto: traseira em `x = 0`, centro em `splitTextCenterX(relief)`, base em
  `z = 0`.
- Encaixe em U na traseira do texto: **duas barras** de 1,5mm de profundidade ×
  0,8mm de altura, começando na **metade da espessura do texto** (`relief/2`) e
  indo para trás, com vão entre elas igual à espessura da base + 0,2mm de folga.
  A profundidade das barras é 1,5mm.
  O par de barras é centrado no meio da altura do texto, que coincide com o meio
  da espessura da base; o texto fica centrado na borda da base (metade acima,
  metade abaixo). A barra inferior fica abaixo do fundo da base e a superior
  acima do topo; a base desliza pela lateral entre as barras. A peça montada
  apoia no fundo do texto, na metade inferior.
- O texto é exportado **deitado** para impressão (face frontal na mesa); a base
  já sai plana. São gerados dois STLs: `-base.stl` e `-texto.stl`.
- Texto com margem mínima de 3mm em relação às bordas (`TEXT_MARGIN`).
- Não há adicionar/remover textos nem editor de posicionamento.
- Textura em relevo, repetida em grade com 1mm de margem da base, recuada
  2,5mm da borda direita para não colidir com as barras; o SVG é repetido como
  motivo, com escala uniforme dentro da célula (sem distorção).
- A textura usa a cor da base e é mesclada na geometria da base.
- Apenas parede em relevo; o modo gravado foi removido.
- STL sempre manifold, fechado, pronto para impressão.
- 1 unidade Three.js = 1 mm.

## Arquivos

```
tools/letreiros/marcador-pagina/
  schema.ts              — validação Zod + defaults + sanitizeFilename
  shapes.ts              — contorno retangular em pé + ExtrudeGeometry
  patterns.ts            — motivos, tiling e relevo da textura da base
  autoFit.ts             — reduz a largura do texto ao alvo (preserva a altura)
  positioning.ts         — rotação do texto e margem
  joint.ts               — constantes e barras do encaixe em U
  textToGeometry.ts      — TextGeometry do conteúdo
  buildBookmark.ts       — base + textura + texto com barras
  buildBookmark.worker.ts — build em Web Worker
  workerClient.ts        — client do Worker
  workerGeometry.ts      — serialização do resultado (shared helper)
  exportStl.ts           — dois STLs (base e texto deitado) + download
  fonts.ts               — mapa estilo → typeface.json
  useBookmark.ts         — estado + worker + debounce + isBuilding/error
  StudioPanel.tsx        — painel de parâmetros
  BookmarkPreview.tsx    — preview R3F com 2 materiais
```

Os helpers `../../confeitaria/shared/workerGeometry.ts` (serialização),
`../../confeitaria/shared/svgPattern.ts` (SVG → motivo) e
`../../confeitaria/shared/textOutline.ts` (recorte) são compartilhados.

## Pipeline de geração

`schema.ts` → `shapes.ts`/`patterns.ts`/`autoFit.ts`/`positioning.ts`/
`joint.ts`/`textToGeometry.ts` → `buildBookmark.ts` → `workerGeometry.ts` →
`exportStl.ts`.

O `buildBookmark` roda em Web Worker:

- **main thread** (`useBookmark.ts`) aplica debounce de 200ms, calcula o estilo
  de fonte do texto, parseia o SVG da textura (com cache) e envia
  `{ params, styles, parsedSvg }` ao Worker.
- **Worker** (`buildBookmark.worker.ts`) carrega a fonte necessária e chama
  `buildBookmark`, que gera a textura, aplica o auto-fit, coloca o texto em pé
  (parede perpendicular à base) e o posiciona na borda direita.
- `buildBookmark` mescla a textura na base, gera as barras em U no texto e
  devolve `{ base, text }` (peças separadas).
- `exportStlParts` baixa `-base.stl` e `-texto.stl`; o texto é rotacionado para
  imprimir deitado.
- `workerGeometry.ts` serializa `{ base, text }` de volta para a main thread.
- `isBuilding` controla o aviso “Gerando…” e `error` aparece no overlay da UI; a
  geometria anterior permanece visível durante o rebuild.
- Respostas de worker obsoleto são ignoradas; o worker anterior é encerrado.

O `BookmarkPreview` deita a base no plano e vira o texto para a frente com
`rotation={[-90°, 0, -90°]}`.

## Testes

`tests/features/studio/tools/letreiros/marcador-pagina/` — 11 arquivos, 88 testes:

- `autoFit.test.ts`
- `buildBookmark.test.ts`
- `exportStl.test.ts`
- `joint.test.ts`
- `patterns.test.ts`
- `positioning.test.ts`
- `schema.test.ts`
- `shapes.test.ts`
- `StudioPanel.test.tsx`
- `useBookmark.test.tsx`
- `workerGeometry.test.ts`

## Fora de escopo

Persistência, geração via CadQuery/Lambda, pagamentos, autenticação, novos
formatos (redondo/personalizado), textura gravada, motivos adicionais,
decorações, laço, encaixe com trava/dovetail e exportação em peça única.
