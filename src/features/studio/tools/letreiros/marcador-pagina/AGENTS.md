# Ferramenta: Marcador de Página

## Status

Implementada — build em Web Worker, gera e exporta STL localmente no navegador.

## O que faz

Gera marcadores de página 3D finos e retangulares (50mm de largura por 100mm de
comprimento), com **um único texto, sem limite de caracteres**, em pé e
perpendicular à base, formando um perfil em “L”: o marcador é a aba horizontal e
o texto é uma parede vertical ao longo do comprimento. A base pode receber
**texturas em relevo** com motivos repetidos (triângulos, quadrados, círculos,
losangos) ou um **SVG repetido como motivo**.

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
- `width` (8–60mm) e `height` (4–20mm): o texto é reduzido para caber na largura
  alvo, sem ampliar
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
- Posição fixa: a parede fica na borda direita (`fixedTextX`) e o texto é
  **centralizado no comprimento**; a base é deslocada (`bookmarkBaseCenterX`)
  para a lateral entrar **metade da espessura da parede**, formando o perfil em
  “L”.
- O texto começa no **fundo da base** (z = 0) e sobe no eixo Z; há uma pequena
  sobreposição (`TEXT_Z_OFFSET`) para fundir as peças.
- Texto com margem mínima de 3mm em relação às bordas (`TEXT_MARGIN`).
- Não há adicionar/remover textos nem editor de posicionamento.
- Textura em relevo, repetida em grade com 1mm de margem da base; o SVG é
  repetido como motivo, com escala uniforme dentro da célula (sem distorção).
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
  autoFit.ts             — reduz a largura do texto ao alvo (nunca amplia)
  positioning.ts         — rotação para texto em pé, margem, offset Z e posição fixa
  textToGeometry.ts      — TextGeometry do conteúdo
  buildBookmark.ts       — composição base + textura + parede de texto
  buildBookmark.worker.ts — build em Web Worker
  workerClient.ts        — client do Worker
  workerGeometry.ts      — serialização do resultado (shared helper)
  exportStl.ts           — STL binário + download
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
`textToGeometry.ts` → `buildBookmark.ts` → `workerGeometry.ts` → `exportStl.ts`.

O `buildBookmark` roda em Web Worker:

- **main thread** (`useBookmark.ts`) aplica debounce de 200ms, calcula o estilo
  de fonte do texto, parseia o SVG da textura (com cache) e envia
  `{ params, styles, parsedSvg }` ao Worker.
- **Worker** (`buildBookmark.worker.ts`) carrega a fonte necessária e chama
  `buildBookmark`, que gera a textura, aplica o auto-fit, coloca o texto em pé
  (parede perpendicular à base) e o posiciona na borda direita.
- `buildBookmark` mescla a textura na base e devolve `{ base, text }`.
- `workerGeometry.ts` serializa `{ base, text }` de volta para a main thread.
- `isBuilding` controla o aviso “Gerando…” e `error` aparece no overlay da UI; a
  geometria anterior permanece visível durante o rebuild.
- Respostas de worker obsoleto são ignoradas; o worker anterior é encerrado.

O `BookmarkPreview` deita a base no plano e vira o texto para a frente com
`rotation={[-90°, 0, -90°]}`.

## Testes

`tests/features/studio/tools/letreiros/marcador-pagina/` — 10 arquivos, 86 testes:

- `autoFit.test.ts`
- `buildBookmark.test.ts`
- `exportStl.test.ts`
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
decorações e laço.
