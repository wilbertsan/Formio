# Ferramenta: Cortador + Carimbo

## Status

Implementada.

## Objetivo

Gerar, em um único STL, duas peças separadas lado a lado a partir de **texto ou
ícone SVG**: um cortador que recorta o **contorno da forma com margem** (silhueta
única que une os elementos) e um carimbo com base única e a **forma em alto
relevo**. Usa-se em duas etapas: corta com o cortador, pressiona o carimbo dentro
da marca.

## Parâmetros

- Forma: **texto** (1–30 caracteres, estilo normal/bold/serif) **ou** **ícone SVG** (upload)
- Altura da forma: 10–60mm (a largura decorre da forma)
- SVG: escala 0.5–1.0x e espessura mínima de linha 0.1–1.5mm (engrossa traços finos)
- Altura da parede do cortador: 15–40mm
- Espessura da parede do cortador: 0.8–2mm
- Altura do carimbo (relevo + base, sem cabo): 15–25mm nominal (a base ocupa 40%)
- Margem da base: 2–10mm (une os elementos)
- Altura do relevo (alto relevo): 1–3mm
- Cores de preview: cor do cortador e cor do carimbo (10 cores PLA)

## Regras do domínio

- **Duas peças com a forma escolhida** (texto ou ícone SVG) — basta a forma definir a silhueta
- Contornos obtidos de `font.generateShapes` (texto) ou `SVGLoader`+Clipper (SVG),
  processados em `../shared/textOutline.ts`; o SVG usa `../shared/svgToIconShape.ts`
  (`svgBounds`/`svgToShapes`), com engrossamento de traços finos até `iconLineWidth`
- **Cortador**: parede (stroke) de espessura `wallThickness` que contorna a
  abertura `expand(forma, +margem)` — `expand(abertura, +t) − abertura`; extrudada em `wallHeight`.
  A abertura usa apenas o contorno externo (furos preenchidos), então o
  cortador é **uma peça única** (sem paredes internas separadas) e o corte sai sólido
- **Base única do carimbo**: `expand(forma, +margem − folga)` (une os elementos),
  extrudada em `(stampHeight − reliefHeight) × BASE_HEIGHT_RATIO` (sem cabo; a peça
  é mais baixa: base + relevo)
- **Relevo (alto relevo)**: `forma` preenchida, extrudada em `reliefHeight`, na face
  de contato (z = 0), sobre a base
- **SVG**: dimensionado pela altura-alvo (`textHeight × iconScale`); orientação
  corrigida com giro 180° em Z (SVGLoader entrega Y para baixo)
- Folga por lado entre cortador e base: `CLEARANCE_MM = 0.4mm` (fixa)
- Se a largura da forma exceder `MAX_SHAPE_WIDTH_MM = 150mm`, é reduzida proporcionalmente
- Peças posicionadas lado a lado com `PIECE_GAP_MM = 10mm` de espaço, ambas em z ≥ 0
- Texto: acentos preservados; se a fonte não tiver o glifo, cai para texto sem acentos
- 1 unidade Three.js = 1mm

## Performance

- O build (`buildCutterStamp`) roda em **Web Worker** (`buildCutterStamp.worker.ts`),
  com geometrias serializadas (`workerGeometry.ts`), para não travar a UI em formas
  complexas. O hook expõe `isBuilding` (indicador "Gerando…") e termina o worker
  anterior a cada novo build (cancelamento). Em testes, a fábrica do worker é
  injetável (`useCutterStamp({ workerFactory })`).
- **SVG**: o `SVGLoader` depende de `DOMParser`, que **não existe em Web Workers**.
  Por isso o parse (`parseSvg` → `ParsedSvg`) roda na **main thread** (cacheado por
  conteúdo) e só o Clipper/extrusão roda no worker (`svgBoundsFromParsed`/
  `svgShapesFromParsed`). Falha de leitura vira mensagem na UI (`error`).
- `buildCutterStamp` é puro, recebe `font: Font | null` (não usado no modo SVG) e
  `parsedSvg` (dados do SVG já achatados).

## Estrutura de arquivos

```
src/features/studio/tools/confeitaria/cortador-carimbo/
├── AGENTS.md
├── schema.ts              # Schema Zod, constantes e tipos
├── buildCutterStamp.ts    # Geometria: cortador (stroke) e carimbo (base + relevo)
├── buildCutterStamp.worker.ts # Worker: roda o build e serializa as geometrias
├── workerGeometry.ts      # Serialização de BufferGeometry (transferível)
├── workerClient.ts        # Fábrica do Worker e interface
├── useCutterStamp.ts      # Hook de estado (reducer + Zod + debounce + worker)
├── StudioPanel.tsx        # Painel (Texto / Cortador / Carimbo / Aparência)
├── CutterStampPreview.tsx # Preview R3F
└── exportStl.ts           # Exportação STL binário (peças mescladas)
```

Helpers compartilhados: `../shared/textOutline.ts` (texto → contornos → geometria)
e `../shared/svgToIconShape.ts` (SVG → contornos).

## Fora de escopo

Chaveiros, letreiros, backend.
