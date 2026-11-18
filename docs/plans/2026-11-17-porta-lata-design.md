# Porta-lata 350 ml — Design da v1

**Data:** 2026-11-17
**Ferramenta:** `lembrancinhas/porta-lata`
**Status:** design aprovado; implementação pendente

## Objetivo

Substituir a **Caneca Personalizada** por um **Porta-lata 350 ml**: um corpo
cilíndrico de parede simples com cavidade reta para uma lata de Coca-Cola de
350 ml, fundo com furo de ventilação e alça removível de abraçadeira. O nome
continua em relevo de 1 mm no corpo, a 180° da alça. O corpo e a alça são peças
independentes, exportadas em dois STLs binários.

A lata não é modelada. O JSON de referência da Coca-Cola 350 ml define apenas o
envelope que o porta-lata precisa aceitar: 66,2 mm de diâmetro de corpo,
122,2 mm de altura, topo de 54 mm e 350 ml. A caneca para beber deixa de existir
no Studio.

## Escopo da v1

Incluído:

- Corpo cilíndrico com cavidade reta de 67,8 mm e altura de cavidade de 108 mm.
- Fundo com furo central de ventilação de 10 mm.
- Borda de entrada cônica para guiar a lata.
- Alça removível de abraçadeira de 200°, com laço em D.
- Nome/idade em relevo de 1 mm, curvado no corpo.
- Duas cores PLA no preview; STLs sem cor.
- Build em Worker, validação de encaixe e export de dois STLs.
- Renomeação completa de pasta, `ToolId`, `productType`, UI, símbolos, testes e
  docs de `caneca-personalizada` para `porta-lata`.

Excluído:

- Modelar a lata, a curvatura do fundo ou o pescoço do topo.
- Tampa, parede dupla, isolamento térmico, canudo e base separada.
- Outras latas (slim, 473 ml etc.) ou sliders de diâmetro/altura da lata.
- 3MF/STEP e texturas.

## Preset da lata

| Constante | Valor |
|---|---|
| `CAN_DIAMETER` | 66,2 mm |
| `CAN_HEIGHT` | 122,2 mm |
| `CAN_TOP_DIAMETER` | 54,0 mm |
| `CAN_VOLUME_ML` | 350 |

As dimensões são referências externas aproximadas. O preset é fixo; o usuário
ajusta a folga, a profundidade da cavidade, as paredes, o furo, a borda, a alça
e o texto.

## Geometria

### Dimensões derivadas

- Diâmetro interno: `CAN_DIAMETER + 2 * canClearance` → 67,8 mm no default.
- Diâmetro externo: `innerDiameter + 2 * wallThickness` → 72,6 mm no default.
- Altura externa: `cavityDepth + bottomThickness` → 111,2 mm no default.
- Altura exposta da lata: `CAN_HEIGHT - cavityDepth` → 14,2 mm no default.
- Raio interno: 33,9 mm; raio externo: 36,3 mm.
- Furo de ventilação: 10 mm de diâmetro; a lata apoia no anel externo do fundo.
- Parede do topo: `wallThickness - rimChamfer - rimLeadIn` → 1,0 mm no default.

### Perfil do corpo

Perfil fechado no plano `(r, y)`, com o furo do fundo:

```text
(ventR, 0)
→ (outerR - baseChamfer, 0)
→ (outerR, baseChamfer)
→ (outerR, outerHeight - rimChamfer)
→ (outerR - rimChamfer, outerHeight)
→ (innerR + rimLeadIn, outerHeight)
→ (innerR, outerHeight - rimLeadIn)
→ (innerR, bottomThickness)
→ (ventR, bottomThickness)
→ (ventR, 0)
```

- `baseChamfer` é uma constante de 0,4 mm para a base não ficar com aresta viva.
- `ventR = ventHoleDiameter / 2`; a parede vertical do furo é o último segmento.
- `LatheGeometry` com 128 segmentos; sem CSG no corpo além do relevo.
- O perfil não toca o eixo, então não há triângulos degenerados de eixo; a
  malha é fechada com gênero 1 (furo passante no fundo).
- A cavidade é reta de `bottomThickness` até `outerHeight - rimLeadIn`; a borda
  de entrada abre para `innerR + rimLeadIn`.
- A lata entra pela abertura de 69,8 mm, desce até o fundo interno em
  `y = bottomThickness` e fica com 14,2 mm acima da borda.

### Alça e personalização

- A alça é a mesma abraçadeira em C de 200° com laço em D: raio interno
  `outerRadius + handleClearance`, interferência absoluta de 0,4 mm no topo,
  folga `handleClearance + 0,4 mm` na base e laço acompanhando o corpo.
- O corpo é cilíndrico (raio externo constante), então a abraçadeira prende pelo
  topo e o laço fica a `handleClearance + HANDLE_LOOP_INSET` da parede.
- O texto é curvado no raio externo constante, a 180° da alça, com relevo
  positivo de 1 mm e auto-fit de 120°.
- O corpo é impresso em pé, sem suporte. A alça é impressa em pé, apoiada na
  borda inferior do laço, com suporte sob toda a face inferior do arco de 200°.

## Parâmetros

### Corpo

| Parâmetro | Faixa | Default |
|---|---|---|
| `cavityDepth` | 80–118 mm | 108 |
| `canClearance` | 0,5–1,2 mm | 0,8 |
| `wallThickness` | 1,8–4 mm | 2,4 |
| `bottomThickness` | 2–6 mm | 3,2 |
| `ventHoleDiameter` | 6–14 mm | 10 |
| `rimLeadIn` | 0,5–2 mm | 1,0 |
| `rimChamfer` | 0–1,5 mm | 0,4 |
| `bodyColor` | 10 cores PLA | `#14b8a6` |

### Alça

| Parâmetro | Faixa | Default |
|---|---|---|
| `handleEnabled` | booleano | `true` |
| `handleHeight` | 35–85 mm | 60 |
| `handleGap` | 24–40 mm | 30 |
| `handleReach` | 30–50 mm | 40 |
| `handleBand` | 5–10 mm | 6,5 |
| `handleWidth` | 8–16 mm | 12 |
| `handleClearance` | 0,2–0,5 mm | 0,3 |
| `accentColor` | 10 cores PLA | `#f5f5f5` |

### Personalização

| Parâmetro | Faixa | Default |
|---|---|---|
| `text` | 0–20 caracteres | `Festa` |
| `textSize` | 6–18 mm | 10 |
| `fontStyle` | `normal`, `bold`, `serif` | `normal` |
| `textCenterY` | 20–90 mm | 60 |

`CONTENT_DEPTH` continua 1 mm. `productType` passa a `'porta-lata'`.

## Validação

| Código | Severidade | Regra |
|---|---|---|
| `can-cavity` | error | profundidade fora de 80–118 mm ou lata exposta abaixo de 6 mm |
| `can-clearance` | warning | folga fora de 0,5–1,2 mm (defensiva) |
| `can-vent` | error | furo grande demais para sobrar apoio para a lata |
| `can-rim` | error | parede do topo abaixo de 0,8 mm |
| `can-wall` | error | parede abaixo de 1,8 mm (defensiva) |
| `can-bottom` | error | fundo abaixo de 2 mm (defensiva) |
| `can-text-fit` | warning | texto pode ser reduzido para caber no arco de 120° |
| `can-text-band` | error | texto cruza a borda ou o fundo |
| `can-handle-gap` | warning | abertura vertical da mão abaixo de 26 mm |
| `can-handle-reach` | warning | menor largura do furo da mão abaixo de 16 mm |
| `can-handle-fit` | warning | folga nominal acima de `HANDLE_FIT_INTERFERENCE` |
| `can-handle-band` | error | vão completo do laço sai da altura do corpo |

Falhas de runtime do worker usam `can-invalid`, `can-font`, `can-csg` e
`can-build`; o detalhe fica no `console.error` e o hook traduz em mensagem
amigável. Avisos não bloqueiam o build nem o export.

## Arquitetura de arquivos

```text
src/features/studio/tools/lembrancinhas/porta-lata/
  AGENTS.md                # spec da v1
  schema.ts                # Zod, preset da lata, defaults e derivados
  shapes.ts                # perfil do corpo, contorno da alça e laço
  buildBody.ts             # LatheGeometry com furo de ventilação
  buildRelief.ts           # texto → relevo curvado
  buildHandle.ts           # abraçadeira + laço + CSG interno
  buildCanHolder.ts        # orquestração + CSG do relevo
  csg.ts                   # evaluator conforme (CDT)
  geometryCleanup.ts       # limpeza de triângulos colapsados
  validateCanHolder.ts     # issues e severidade
  workerGeometry.ts        # serialização das duas peças
  workerClient.ts          # interface do worker
  buildCanHolder.worker.ts # build fora da main thread
  useCanHolder.ts          # reducer + Zod + debounce + worker
  exportStl.ts             # dois STLs binários
  StudioPanel.tsx          # painel de parâmetros
  CanHolderPreview.tsx     # preview R3F em duas cores
```

A pasta antiga `caneca-personalizada/` é removida; os docs antigos
`2026-11-17-caneca-personalizada*` ficam como histórico, com nota de
substituição.

## Pipeline

```text
Parâmetros
  → schema + validação
  → dimensões derivadas (inner/outer/cavity/exposed)
  → perfil do corpo com furo de ventilação
  → buildBody (LatheGeometry)
  → textToShapes + curvatura no raio
  → CSG union(texto, corpo)
  → buildHandle (abraçadeira + laço + CSG interno)
  → buildCanHolder ({ body, handle })
  → worker + serialização
  → preview montado / export dos dois STLs
```

## Integração

- `ToolSelector.tsx`: `ToolId` `'porta-lata'`; card **Porta-lata** em
  Lembrancinhas, ícone `🥤`, descrição
  "Porta-lata 350 ml com nome em relevo e alça removível".
- `StudioPage.tsx`: lazy imports de `StudioPanel` e `CanHolderPreview`, wrapper
  `CanHolderToolWrapper`, `activeTool === 'porta-lata'`, câmera a 210°, status
  bar com diâmetro externo × altura externa × parede.
- `useCanHolder`: `dimensions` com diâmetro externo, altura externa e parede;
  sem capacidade em ml; expõe `exposedHeight` e `outerDiameter` para o painel.
- O worker/testes usam `productType: 'porta-lata'` e os códigos `can-*`.

## UI

Painel em acordeões:

1. **Corpo** — `cavityDepth`, `canClearance`, `wallThickness`,
   `bottomThickness`, `ventHoleDiameter`, `rimLeadIn`, `rimChamfer`; mostra
   `Lata 350 ml · Ø66,2 × 122,2 mm`, `Diâmetro externo: 72,6 mm`,
   `Altura externa: 111,2 mm` e `Altura exposta: 14,2 mm`.
2. **Alça** — os mesmos parâmetros e o switch; desabilita quando desligada.
3. **Personalização** — texto, tamanho, fonte e altura.
4. **Aparência** — cores do corpo e da alça.
5. **Validação** — issues; "Sem avisos" quando vazio.

## Exportação

- Dois STLs binários: `<nome>-corpo.stl` e `<nome>-alca.stl`.
- Corpo centralizado na mesa com o fundo em `y = 0`.
- Alça centralizada em pé, sem rotação, apoiada na borda inferior do laço.
- A alça desabilitada não gera arquivo.
- O furo de ventilação faz parte do corpo; não há peça solta.

## Decisões

- **Substituir a caneca:** o produto anterior deixa de existir; o card, o ID e o
  código passam a `porta-lata`/`CanHolder`. Isso evita um card “Caneca” que não
  gera caneca.
- **Preset fixo:** as medidas da Coca-Cola 350 ml são constantes; o usuário
  ajusta folga e profundidade, não o diâmetro/altura da lata. Menos validação e
  nenhum encaixe impossível.
- **Cavidade reta:** a lata é cilíndrica; uma cavidade cônica balançaria a lata
  e reduziria o contato. A parede fica com espessura constante.
- **Furo de ventilação:** 10 mm no centro do fundo; a lata apoia no anel
  externo, o ar entra, a condensação sai e a remoção não cria sucção.
- **Borda de entrada:** 1,0 mm de cone interno e 0,4 mm de chanfro externo
  deixam 1,0 mm de parede no topo e guiam a lata.
- **Alça reaproveitada:** a abraçadeira de 200° com interferência no topo já foi
  validada; o corpo cilíndrico mantém o encaixe e o laço acompanha o raio.
- **Relevo de 1 mm:** mantém a regra de personalização do domínio; o auto-fit
  de 120° evita a alça.
- **Sem capacidade em ml:** a capacidade é da lata (350 ml); o painel mostra a
  altura exposta e o diâmetro externo, não o volume da cavidade.
- **Renomeação completa:** pasta, símbolos, testes e docs; o histórico da caneca
  fica registrado, mas não é referenciado pelo código ativo.

## Riscos e mitigação

- **Lata presa por sucção:** furo de 10 mm e folga de 0,8 mm; validar o apoio do
  fundo.
- **Lata balançando:** cavidade reta e folga máxima de 1,2 mm; o corpo cobre
  108 mm da lata.
- **Parede fina no topo:** validar `wall - rimChamfer - rimLeadIn >= 0,8`.
- **Furo grande demais:** validar o anel de apoio; o furo máximo é 14 mm.
- **Alça frouxa no corpo cilíndrico:** a interferência absoluta no topo prende;
  os testes medem a folga no meio e a sobreposição do laço.
- **Renomeação quebrar imports/testes:** tarefa mecânica separada, com varredura
  final por `caneca`/`Mug` em `src` e `tests`.
- **Docs/AGENTS desatualizados:** Task final de documentação e verificação.

## Critérios de conclusão

- Card **Porta-lata** em Lembrancinhas abre a ferramenta; não existe mais o card
  Caneca.
- Corpo padrão: cavidade 108 mm, interna 67,8 mm, externa 72,6 mm, altura
  externa 111,2 mm, lata exposta 14,2 mm.
- O furo de 10 mm atravessa o fundo e a malha é fechada, single-shell.
- A lata de 66,2 × 122,2 mm entra e é suportada pelo fundo.
- Alça de abraçadeira e nome em relevo de 1 mm funcionam como na caneca.
- Export gera `<nome>-corpo.stl` e `<nome>-alca.stl`, fechados e manifold.
- Validação lista `can-*` sem bloquear.
- Typecheck, lint, testes e build passam.
- `porta-lata/AGENTS.md`, `lembrancinhas/AGENTS.md`, `docs/frontend/studio.md` e
  os docs da caneca (nota histórica) atualizados.
