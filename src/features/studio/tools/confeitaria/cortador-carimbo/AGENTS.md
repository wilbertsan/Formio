# Ferramenta: Cortador + Carimbo

## Status

Implementada.

## Objetivo

Gerar, em um único STL, duas peças separadas lado a lado com a **forma do
texto**: um cortador que recorta o **contorno da palavra com margem** (silhueta
única que une as letras) e um carimbo com essa base única e o **texto em alto
relevo**. Usa-se em duas etapas: corta com o cortador, pressiona o carimbo dentro
da marca.

## Parâmetros

- Texto: 1–30 caracteres
- Estilo da fonte: normal, bold ou serif
- Altura da letra: 10–60mm (a largura decorre do texto)
- Altura da parede do cortador: 15–40mm
- Espessura da parede do cortador: 0.8–2mm
- Altura total do carimbo (relevo + base + cabo): 15–25mm
- Margem da base: 2–10mm (une as letras)
- Altura do relevo (alto relevo): 1–3mm
- Cores de preview: cor do cortador e cor do carimbo (10 cores PLA)

## Regras do domínio

- **Duas peças com a forma do texto** (a palavra substitui círculo/retângulo/estrela)
- Contornos obtidos de `font.generateShapes` e processados via Clipper
  (`../shared/textOutline.ts`), com suporte a letras desconexas e counters
- **Cortador**: parede (stroke) de espessura `wallThickness` que contorna a
  abertura `expand(texto, +margem)` — `expand(abertura, +t) − abertura`; extrudada em `wallHeight`.
  A abertura usa apenas o contorno externo (furos das letras preenchidos), então o
  cortador é **uma peça única** (sem paredes internas separadas) e o corte sai sólido
- **Base única do carimbo**: `expand(texto, +margem − folga)` (une as letras),
  extrudada em `(stampHeight − reliefHeight) × (1 − HANDLE_HEIGHT_RATIO)`
- **Relevo (alto relevo)**: `texto` preenchido, extrudado em `reliefHeight`, na face
  de contato (z = 0), sobre a base
- **Cabo** cilíndrico central: raio `HANDLE_RADIUS_RATIO = 0.35` da altura do texto;
  altura `(stampHeight − reliefHeight) × HANDLE_HEIGHT_RATIO`
- Folga por lado entre cortador e base: `CLEARANCE_MM = 0.4mm` (fixa)
- Se a largura do texto exceder `MAX_TEXT_WIDTH_MM = 150mm`, o texto é reduzido
  proporcionalmente para caber
- Peças posicionadas lado a lado com `PIECE_GAP_MM = 10mm` de espaço, ambas em z ≥ 0
- Acentos são preservados; se a fonte não tiver o glifo, cai para texto sem acentos
- 1 unidade Three.js = 1mm

## Estrutura de arquivos

```
src/features/studio/tools/confeitaria/cortador-carimbo/
├── AGENTS.md
├── schema.ts              # Schema Zod, constantes e tipos
├── buildCutterStamp.ts    # Geometria: cortador (stroke) e carimbo (base + relevo + cabo)
├── useCutterStamp.ts      # Hook de estado (reducer + Zod + debounce)
├── StudioPanel.tsx        # Painel (Texto / Cortador / Carimbo / Aparência)
├── CutterStampPreview.tsx # Preview R3F
└── exportStl.ts           # Exportação STL binário (peças mescladas)
```

Helper compartilhado: `../shared/textOutline.ts` (texto → contornos → geometria,
multi-componente).

## Fora de escopo

Chaveiros, letreiros, backend.
