# Design — Painel Único do Studio com Blocos de Configuração

Data: 2026-08-23
Status: Aprovado
Escopo: Frontend — todos os controles à esquerda (dropdown produto + 4 blocos accordion), novos parâmetros de argola/fonte/cores, regras de segurança 4mm/2mm

## Contexto

O Studio funciona com toolbar de formas à esquerda e painel de parâmetros à
direita. O usuário pediu: todos os controles num único painel esquerdo, com
dropdown de tipo de produto (chaveiro) e blocos de expansão agrupando
controles semelhantes; novos parâmetros (estilo de letra, borda externa,
controles completos da argola, cores); texto sempre preservado com borda de
4mm; furo da argola sempre a 2mm da borda.

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Layout | Painel esquerdo único (~300px) + viewport único | Pedido explícito; fluxo top-down |
| Agrupamento | 4 blocos Accordion Amplify UI (Texto, Base, Argola, Relevo) | Padrão já usado na FAQ; visão progressiva |
| Dropdown produto | SelectField no topo, só "Chaveiro" | Gancho para futuros produtos |
| Fontes | 3 typeface.json do three (helvetiker, helvetiker_bold, optimer) | Zero custo no TextGeometry |
| Cores | 10 swatches PLA fixos | Simplicidade; STL não carrega cor |
| Argola | Furo simples + anel de reforço extrudado ao redor | Confirmado pelo usuário |
| 2 cores no preview | build retorna {base, text} separados; 2 meshes | Cores distintas de base/letras |
| Reset câmera | Botão flutuante no viewport | Toolbar removida |

## Schema (Zod)

| Parâmetro | Range | Default |
|---|---|---|
| productType | 'keychain' | keychain |
| name | 1–12 chars | "Meu nome" |
| fontStyle | normal / bold / serif | bold |
| baseShape | rect / circle / heart | rect |
| width | 20–80 mm | 50 |
| borderWidth | 4–10 mm | 4 |
| thickness | 2–6 mm | 3 |
| letterHeight | 0.4–2 mm | 1 |
| textMode | raised / engraved | raised |
| ringPosition | top / bottom / left / right | top |
| ringInnerDiameter | 3–10 mm | 5 |
| ringThickness | 1.5–4 mm | 2 |
| ringEmbedding | 0–3 mm | 0 |
| ringLateralOffset | −10–10 mm | 0 |
| ringRadialOffset | 0–5 mm | 0 |
| baseColor | 10 swatches | teal |
| letterColor | 10 swatches | branco |

## Regras de segurança (clamp no build)

1. **Texto com borda ≥ 4mm:** área útil = width − 8mm; letterSize reduz
   (fit-to-width) para caber — o texto nunca encosta na borda.
2. **Furo a ≥ 2mm da borda:** posição do furo = borda − 2mm −
   ringRadialOffset (clamp para nunca sair da peça); ringEmbedding empurra o
   centro para dentro; ringLateralOffset desloca perpendicular.
3. Anel de reforço (furo + ringThickness) precisa caber com material ao
   redor; se não couber, reposiciona radialmente para dentro.

## Layout

```
┌──────────────────────────────────────────────┐
│ Topbar: logo | nome | Exportar/Salvar        │
├──────────────┬───────────────────────────────┤
│ [Produto ▾]  │                               │
│ ▼ Texto      │      Viewport (tudo)          │
│ ▶ Base       │  base+letras 2 cores          │
│ ▶ Argola     │  ⌂ reset câmera (flutuante)  │
│ ▶ Relevo     │                               │
│ [Restaurar]  │                               │
├──────────────┴───────────────────────────────┤
│ Status: dimensões | dicas                   │
└──────────────────────────────────────────────┘
```

- Texto aberto por default; demais blocos fechados; allowMultiple
- Reset câmera: botão absoluto no canto superior direito do viewport

## Blocos

1. **Texto:** nome (TextField), estilo da letra (3 botões normal/bold/serif),
   cor das letras (10 swatches)
2. **Base:** forma (3 botões), cor da base (10 swatches), largura,
   borda externa, espessura (sliders)
3. **Argola:** posição (4 botões top/bottom/left/right), diâmetro interno,
   espessura, encaixe, ajuste lateral, ajuste radial (sliders)
4. **Relevo:** altura do relevo (slider), modo relevo/gravado (2 botões)

## Geometria (buildKeychain v2)

- Retorna `{ base: BufferGeometry, text: BufferGeometry }`
- Furo em shape.holes conforme regras de posição; anel de reforço via
  ExtrudeGeometry de anel (círculo externo = furo + ringThickness), mergeado
  na base
- Fontes carregadas lazy por estilo, cacheadas no hook
- Preview: 2 meshes com materiais das cores escolhidas; troca de cor NÃO
  rebuilda geometria (só material)
- Export STL: mergeGeometries([base, text]) — cores ficam de fora

## Remoções

- `StudioToolbar` (+ teste) — formas/modos migram para os blocos
- `StudioParameters` antigo — substituído pelo painel de blocos
- Schema antigo substituído

## Testes

- schema: novos campos, ranges, defaults, rejeições (borderWidth < 4 etc.)
- shapes: furo a 2mm+ da borda em todas as formas/posições/offsets; anel
  contém o furo
- buildKeychain: retorna {base, text}; texto dentro da margem 4mm; engraved
  raso mantido; estilos de fonte geram geometrias distintas
- useKeychain: fontes lazy; troca de estilo rebuilda; cor não rebuilda
- exportStl: merge base+text
- Componentes: dropdown + 4 blocos; controles disparam updates; swatches;
  reset flutuante
- StudioPage: composição nova

## Verificação manual

- Cada posição de argola com furo dentro da peça
- Texto nunca encosta na borda (4mm)
- Trocar estilo de letra muda o desenho
- Cores mudam o preview sem travar (sem rebuild)

## Definition of Done

- lint/typecheck/test/build verdes
- 4 blocos com os 16 controles funcionando
- Regras 4mm/2mm cobertas por testes
- 3 fontes carregam sob demanda
- STL exporta a união
- Código morto removido; docs atualizadas
