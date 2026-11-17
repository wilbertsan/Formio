# Caneca Personalizada — Design da v1

**Data:** 2026-11-17
**Ferramenta:** `lembrancinhas/caneca-personalizada`
**Status:** design aprovado; implementação pendente

## Objetivo

Criar a primeira entrega da **Caneca Personalizada**: uma caneca de parede
simples, com nome/idade em relevo de 1 mm e alça removível de encaixe por
pressão. O corpo e a alça são peças independentes, geradas no Studio 3D, build
em Web Worker e exportadas como dois STLs binários.

A ferramenta começa do zero: não reutiliza geometria da Caixa, do Termoformador
nem dos rolos. Apenas o helper de contorno de texto da confeitaria é
compartilhado.

## Escopo da v1

Incluído:

- Corpo de revolução com fundo, parede cônica, borda chanfrada e cavidade.
- Texto de até 20 caracteres em relevo positivo de 1 mm, curvado no corpo.
- Alça separada: abraçadeira em C de 200° com laço em D.
- Duas cores PLA no preview; STL sem cor.
- Build em Worker, validação e export de dois STLs.
- Card **Caneca Personalizada** na categoria Lembrancinhas.

Excluído:

- Parede dupla, tampa, base separada, canudo e alça integrada.
- Mais de uma linha de texto, ícone SVG e textura.
- Escala de capacidade, medidas em onças e 3MF/STEP.
- Qualquer alteração no corpo para fixar a alça.

## Parâmetros

### Corpo

| Parâmetro | Faixa | Default | Observação |
|---|---|---|---|
| `diameterTop` | 70–100 mm | 80 | diâmetro externo na borda |
| `diameterBottom` | 60–95 mm | 72 | diâmetro externo na base |
| `height` | 80–115 mm | 88 | altura externa total |
| `wallThickness` | 1,8–4 mm | 2,4 | parede lateral |
| `bottomThickness` | 2–6 mm | 3,2 | fundo |
| `rimChamfer` | 0–2 mm | 0,6 | chanfro da borda |
| `bodyColor` | 10 cores PLA | `#14b8a6` | apenas preview |

`diameterTop` deve ser maior ou igual a `diameterBottom`; a validação
`mug-taper` cobre o caso defensivo.

### Alça

| Parâmetro | Faixa | Default | Observação |
|---|---|---|---|
| `handleEnabled` | booleano | `true` | liga/desliga a alça |
| `handleHeight` | 35–85 mm | 52 | centro da abraçadeira |
| `handleGap` | 24–40 mm | 30 | abertura vertical da mão |
| `handleReach` | 30–50 mm | 40 | alcance a partir da parede |
| `handleBand` | 5–10 mm | 6,5 | espessura do laço |
| `handleWidth` | 8–16 mm | 12 | altura da abraçadeira e largura do laço |
| `handleClearance` | 0,2–0,5 mm | 0,3 | folga da abraçadeira |
| `accentColor` | 10 cores PLA | `#f5f5f5` | apenas preview |

A abertura horizontal da mão é derivada:
`handleReach - HANDLE_RING_THICKNESS - 2 * handleBand`.

### Personalização

| Parâmetro | Faixa | Default | Observação |
|---|---|---|---|
| `text` | 0–20 caracteres | `Festa` | vazio desliga o relevo |
| `textSize` | 6–18 mm | 10 | altura da fonte |
| `fontStyle` | `normal`, `bold`, `serif` | `normal` | mapa de fontes do chaveiro |
| `textCenterY` | 20–90 mm | 60 | centro vertical do texto |

`textDepth` é a constante `CONTENT_DEPTH = 1` mm.

`productType` é o literal `'caneca-personalizada'`.

## Geometria

### Corpo

- Perfil 2D fechado no plano `(r, y)`, no sentido anti-horário:
  eixo no fundo `(0, 0)` → raio externo do fundo → parede externa cônica →
  borda com `rimChamfer` → parede interna → fundo interno → eixo
  `(0, bottomThickness)`.
- `LatheGeometry` com `MUG_SEGMENTS = 128` e remoção dos triângulos degenerados
  do eixo (mesma limpeza do suporte do Termoformador).
- O fundo tem uma sapata plana; não há anel de pé na v1.
- A capacidade útil é o volume do tronco de cone interno:
  `π/3 · (h - bottomThickness) · (r1² + r1·r2 + r2²) / 1000` ml, com `r1` e
  `r2` os raios internos no fundo e na borda.
- O corpo é impresso em pé, com o fundo na mesa, sem suporte.

### Relevo do texto

- `textToShapes(font, text, textSize)` gera os contornos; `shapesToGeometry`
  extrudа em `CONTENT_DEPTH` com bevel desligado.
- Os vértices são curvados no raio externo do corpo na altura `textCenterY`:
  `x → ângulo` e `z → deslocamento radial`, com o texto apoiado 0,2 mm dentro
  da parede para a união limpa.
- O texto é centralizado no lado oposto à alça (180° a partir do +X) e a
  câmera inicial olha esse lado (azimute 210°).
- O arco do texto é `largura / raio`; a validação reduz a fonte ou avisa quando
  o texto não cabe na faixa útil.
- O relevo é unido ao corpo com `three-bvh-csg` (`UNION`). A malha final é
  validada com `isClosed`/`signedVolume`.

### Alça

- **Abraçadeira:** anel parcial de 200° centrado no +X, com raio interno
  `R(handleHeight) + handleClearance` e espessura radial
  `HANDLE_RING_THICKNESS = 3,5` mm, altura `handleWidth`. O perfil acompanha a
  conicidade do corpo; a folga é constante.
- **Laço:** forma em D no plano vertical XY, com abertura de mão
  `handleGap × (handleReach - 3,5 - 2·handleBand)` e banda de `handleBand`;
  extrudado em `handleWidth` no eixo Z.
- Abraçadeira e laço são unidos por CSG dentro da alça, formando uma peça única
  e fechada.
- A alça é impressa deitada (laço na mesa); o arco superior da abraçadeira pode
  exigir suporte leve.
- A montagem não altera o corpo: a abraçadeira abraça a parede e a remoção é
  por pressão.

## Arquitetura de arquivos

```text
src/features/studio/tools/lembrancinhas/caneca-personalizada/
  AGENTS.md                # spec da v1
  schema.ts                # Zod, defaults, cores e constantes
  shapes.ts                # perfil do corpo, seção da abraçadeira e laço em D
  buildBody.ts             # LatheGeometry + limpeza do eixo
  buildRelief.ts           # texto → geometria curvada
  buildHandle.ts           # abraçadeira + laço + CSG interno
  buildMug.ts              # orquestração, CSG do relevo e snapshot
  validateMug.ts           # issues e severidade
  workerGeometry.ts        # serialização das duas peças
  workerClient.ts          # interface do worker
  buildMug.worker.ts       # build fora da main thread
  useMug.ts                # reducer + Zod + debounce + worker
  exportStl.ts             # dois STLs binários
  StudioPanel.tsx          # painel de parâmetros
  MugPreview.tsx           # preview R3F em duas cores
```

## Pipeline

```text
Parâmetros
  → schema + validação
  → perfil do corpo
  → buildBody (LatheGeometry)
  → textToShapes + curvatura no raio
  → CSG union(texto, corpo)
  → buildHandle (abraçadeira + laço + CSG interno)
  → buildMug ({ body, handle })
  → worker + serialização
  → preview montado / export dos dois STLs
```

## Integração

- `ToolSelector.tsx`: adicionar `'caneca-personalizada'` ao `ToolId` e o card
  **Caneca Personalizada** em Lembrancinhas, ícone `☕` e descrição
  "Caneca 3D com nome em relevo e alça removível de encaixe".
- `StudioPage.tsx`: lazy imports de `StudioPanel` e `MugPreview`, wrapper
  `MugToolWrapper` com topbar, estados de build, validação e export.
- `StudioViewport` com `cameraPosition` derivada do `fitRadius`,
  `resetAzimuth=210` para olhar o lado do texto.
- `StudioStatusBar`: largura × altura × espessura (diâmetro, altura, parede).
- A alça desligada exporta só o corpo e não gera aviso de encaixe.

## UI

Painel em acordeões:

1. **Corpo** — diâmetros, altura, paredes e chanfro.
2. **Alça** — habilitar, altura, abertura, alcance, banda, largura e folga.
3. **Personalização** — texto, tamanho, fonte e altura.
4. **Aparência** — cores PLA do corpo e da alça.
5. **Validação** — issues, quando existirem.

A seção **Corpo** mostra a capacidade calculada (ex.: `320 ml`). Componentes
Amplify UI `Accordion`, `SliderField`, `TextField`, `SelectField`, `SwitchField`,
seguindo o tema claro do Studio. Nenhum componente novo de UI.

## Validação

| Código | Severidade | Regra |
|---|---|---|
| `mug-taper` | error | `diameterTop < diameterBottom` |
| `mug-wall` | error | parede abaixo de 1,8 mm (defensiva) |
| `mug-bottom` | error | fundo abaixo de 2 mm (defensiva) |
| `mug-text-fit` | warning | texto não cabe no arco útil e a fonte foi reduzida |
| `mug-text-band` | error | texto cruza a borda, o fundo ou a faixa da alça |
| `mug-text-rail` | warning | texto invade o arco da abraçadeira |
| `mug-handle-gap` | warning | abertura da mão menor que 18 mm |
| `mug-handle-reach` | warning | alcance não deixa abertura horizontal de 16 mm |
| `mug-handle-fit` | error | folga da abraçadeira abaixo de 0,2 mm |
| `mug-handle-band` | error | abraçadeira não cabe na altura do corpo |
| `mug-capacity` | warning | capacidade fora de 150–500 ml |
| `mug-csg` | error | a união do relevo falhou |

Avisos não bloqueiam o build nem o export. Falha de CSG mantém a geometria
anterior e aparece no overlay.

## Exportação

- Dois STLs binários: `<nome>-corpo.stl` e `<nome>-alca.stl`.
- O corpo é centralizado na mesa com o fundo em `y = 0`.
- A alça é rotacionada para imprimir deitada (laço na mesa) e centralizada.
- O nome usa `sanitizeFilename(projectName)`.
- A alça desabilitada não gera arquivo.

## Decisões

- **Corpo de revolução:** `LatheGeometry` com perfil fechado entrega corpo
  manifold sem CSG; o único CSG do corpo é a união do relevo.
- **Relevo curvado:** o texto nasce plano, é extrudado e só então curvado no
  raio; isso preserva os contornos da fonte e evita distorcer as letras.
- **Alça de abraçadeira em vez de trilho:** um trilho fixo na parede não
  permite montar uma alça com túnel fechado sem rasgo-chave. A abraçadeira
  elimina o trilho, mantém o corpo liso e é removível.
- **CSG interno na alça:** abraçadeira e laço têm eixos perpendiculares; a união
  por CSG mantém a peça fechada e imprimível.
- **Texto a 180° da alça:** evita colisão com a abraçadeira e deixa a
  personalização visível na câmera inicial.
- **Duas cores:** `bodyColor` no corpo e `accentColor` na alça; trocar cor não
  rebuilda geometria.
- **Capacidade calculada:** o painel mostra o volume interno útil sem prometer
  estanqueidade ou uso alimentar.
- **Spike primeiro:** a união do relevo por CSG é provada com uma palavra antes
  do restante; se falhar, migra para a abordagem C (plaqueta curva com o nome).
- **Serialização local:** o contrato de duas peças é específico e não se acopla
  ao serializador da Caixa.
- **`handleWrap` fixo em 200°:** menos sliders e encaixe previsível; a folga é o
  parâmetro de ajuste.

## Riscos e mitigação

- **CSG frágil em texto com muitos glifos:** spike com 6 letras e `isClosed`;
  fallback para plaqueta curva antes de seguir.
- **Malha não-manifold na união:** validar corpo, relevo e alça separadamente
  e validar o corpo unido no teste de spike.
- **Abraçadeira frouxa ou rígida demais:** folga padrão de 0,3 mm; a validação
  impede folga abaixo de 0,2 mm e a peça é removível por projeto.
- **Texto colidindo com a alça:** posição fixa a 180° e validação de arco.
- **Alça com overhang:** impressão deitada documentada; suporte leve aceitável.
- **Regressão em ferramentas existentes:** mudanças em `ToolSelector` e
  `StudioPage` cobertas por testes.
- **Capacidade divergente da realidade:** o volume é geométrico, não
  estanqueidade; a UI rotula "capacidade aproximada".

## Critérios de conclusão

- Card **Caneca Personalizada** abre a ferramenta em Lembrancinhas.
- Corpo de 80 × 88 mm com parede 2,4 mm é gerado em menos de 1,5 s no worker.
- Texto em relevo de 1 mm acompanha a curvatura do corpo.
- Alça de abraçadeira encaixa no corpo com 0,3 mm de folga e sai em STL
  separado.
- Validação lista as issues esperadas sem bloquear.
- Export baixa `<nome>-corpo.stl` e `<nome>-alca.stl` fechados e manifold.
- Typecheck, lint, testes e build passam.
- `AGENTS.md` da ferramenta, `lembrancinhas/AGENTS.md` e
  `docs/frontend/studio.md` atualizados.
