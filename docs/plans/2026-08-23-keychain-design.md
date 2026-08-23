# Design — Gerador de Chaveiros Personalizados (3DFormio Studio)

Data: 2026-08-23
Status: Aprovado
Escopo: Frontend puro — ferramenta de chaveiros dentro do Studio, com exportação STL local

## Contexto

O Studio (`/studio`) tem o shell completo (topbar, toolbar, viewport R3F, painel
de parâmetros, status bar) com um cubo de exemplo. O usuário quer a primeira
ferramenta real: gerador de chaveiros personalizados com nomes, 100% frontend,
com exportação STL no navegador. O cubo exemplo é substituído (cumpriu seu papel
de demonstrar o shell; o chaveiro é a primeira ferramenta real).

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Integração | Dentro do Studio atual | Reaproveita shell inteiro; chaveiro vira a ferramenta padrão |
| Formas | Retângulo, Círculo, Coração | Cobertura boa com Shape paths controláveis |
| Texto | Relevo (merge) E Gravado (CSG) | Relevo é o caminho feliz sem deps; gravado via three-bvh-csg só quando selecionado |
| Furo do anel | `shape.holes` nativo do THREE.Shape | Furo manifold sem operação booleana |
| Fonte | helvetiker_bold.typeface.json local (~60KB) | TypeFace do three, TextGeometry sólido exportável |
| Export | STLExporter (three/examples) binário + Blob download | STL pronto para fatiar, zero backend |
| Acentos | Normalizados (removidos) no build | Fonte helvetiker não tem glifos acentuados; hint na UI |

## Arquitetura

Novas deps: `three-bvh-csg` (apenas modo gravado).
Fonte: `src/assets/fonts/helvetiker_bold.typeface.json`.

O Studio passa a ser o gerador de chaveiros. Removidos: `SampleSolid.tsx`,
`useModelParameters.ts`, `config/parameters.ts` (+ seus testes).
`StudioViewport` vira agnóstico de ferramenta (recebe `geometry`).

```
src/features/studio/
├── StudioPage.tsx              # Orquestra (topbar/toolbar/viewport/status)
├── components/
│   ├── StudioTopbar.tsx        # Exportar STL habilitado quando geometria pronta
│   ├── StudioToolbar.tsx       # mantém
│   ├── StudioViewport.tsx      # recebe geometry (agnóstico)
│   ├── StudioParameters.tsx    # painel do chaveiro (nome, forma, modo, sliders)
│   ├── StudioStatusBar.tsx     # width × height × thickness mm do chaveiro
│   └── KeychainPreview.tsx     # mesh do chaveiro no viewport
├── keychain/
│   ├── schema.ts               # Zod: keychainParams
│   ├── shapes.ts               # createBaseShape + getHolePosition (puro, testável)
│   ├── textToGeometry.ts       # nome → TextGeometry centralizada + fit-to-width
│   ├── buildKeychain.ts        # base + texto → BufferGeometry (merge ou CSG)
│   └── exportStl.ts            # STLExporter binário + download
└── hooks/
    └── useKeychain.ts          # useReducer + Zod + debounce 200ms
```

## Parâmetros (schema Zod)

| Parâmetro | Range | Default |
|---|---|---|
| `name` | 1–12 chars | "Meu nome" |
| `shape` | rect / circle / heart | rect |
| `textMode` | raised / engraved | raised |
| `width` | 20–80 mm | 50 |
| `height` | 20–80 mm | 25 |
| `thickness` | 2–6 mm | 3 |
| `textHeight` | 10–24 mm | 16 |
| `textDepth` | 0.4–2 mm | 1 |
| `holeDiameter` | 3–8 mm | 5 |

Retângulo usa width/height; círculo usa width como diâmetro; coração escala
proporcional. Furo no topo (acima do texto) em todas as formas.

## Pipeline de geometria (buildKeychain.ts)

1. **Base:** THREE.Shape por forma. Retângulo com cantos arredondados
   (raio = thickness); círculo via absarc; coração via curvas bezier. Furo:
   Path circular em `shape.holes` (getHolePosition por forma). Extrusão com
   bevel leve.
2. **Texto:** TextGeometry (helvetiker bold), size = textHeight,
   height = textDepth (raised) ou thickness + 1 (engraved, atravessa a base).
   geometry.center() + posicionamento no centro da base. Fit-to-width:
   textHeight efetivo reduz se nome longo não cabe.
3. **Composição:**
   - raised: mergeGeometries(base, texto em z = thickness) — manifold, sem CSG
   - engraved: SUBTRACTION(base, texto) via three-bvh-csg
4. **Resultado:** BufferGeometry única, plano XY, espessura em Z, base em z=0
   (orientação de impressão).

## UI

Painel de parâmetros (StudioParameters → chaveiro):

- TextField nome com contador 1–12 (hint: acentos são removidos)
- Seletor de forma: 3 botões com ícone
- RadioGroupField modo texto: Relevo / Gravado
- Sliders: largura, altura, espessura, tamanho do texto, profundidade do texto,
  diâmetro do furo
- Restaurar padrão (mantido)

Topbar: "Exportar STL" habilitado quando geometria pronta; dispara
`exportStl(geometry, projectName)` — nome sanitizado, download `{nome}.stl`.
"Salvar" permanece disabled (Sprint 2).

Viewport: KeychainPreview = `<mesh geometry>` material teal + ContactShadows.
Câmera reaproximada (~[60, 50, 60]).

## Estado

`useKeychain`: useReducer + Zod (mesmo padrão do useModelParameters) +
debounce 200ms no nome; geometria em useState<BufferGeometry | null>
(null = fonte carregando). useMemo por parâmetros; geometry.dispose() ao
trocar para evitar leak.

## Testes

- `schema.ts`: Zod (nome vazio/longo rejeitado, ranges, defaults)
- `shapes.ts`: puro — cada forma retorna Shape com 1 hole, furo dentro dos
  limites, bounding box esperado
- `textToGeometry.ts`: fontLoader mockado; centralização e fit-to-width
- `buildKeychain.ts`: raised → merge com atributos; engraved → CSG mockado;
  geometria não vazia
- `exportStl.ts`: URL.createObjectURL mockado; Blob; nome sanitizado
- `useKeychain`: reducer + debounce (fake timers)
- Componentes: painel renderiza controles e dispara updates; topbar Exportar
  habilitado com geometria pronta; status bar com dimensões

## Edge cases

- Nome com acentos → normalizado ("João" → "Joao"), hint na UI
- Fonte carregando → Loader no viewport, export disabled
- CSG falha (texto maior que base) → fallback raised + Alert de aviso
- Furo: posição recalculada por forma

## Performance

- Debounce 200ms no nome; useMemo por parâmetros
- CSG apenas em engraved; dispose de geometrias antigas

## Fora de escopo

- Salvar projeto (persistência)
- Upload de fonte customizada
- Mais formas / texto em curva
- Backend/CadQuery

## Definition of Done

- Build sem erros; testes passando; lint limpo; TS strict sem `any`
- STL exportado abre em fatiador (validação manual)
- three-bvh-csg só no chunk do Studio (lazy já cobre)
- Docs: `docs/frontend/studio.md` atualizado com seção chaveiro
- Código morto removido (SampleSolid, useModelParameters, parameters.ts)
