# Termoformador — Design da tela circular (v1)

**Data:** 2026-11-14
**Ferramenta:** `lembrancinhas/termoformador`
**Status:** design aprovado; implementação pendente

## Objetivo

Criar a primeira entrega do **Termoformador**: uma peça única, a **tela
circular**, formada por um aro sólido e uma malha hexagonal vazada com linhas de
2 mm. A peça é visualizada no Studio 3D, gerada em Web Worker e exportada como
STL binário.

Corpo, tampa, pino lateral e base descritos no `AGENTS.md` da ferramenta ficam
para versões seguintes. A ferramenta começa do zero, sem importar a geometria da
Caixa Personalizada.

## Escopo da v1

Incluído:

- Disco circular plano, espessura constante e aro sólido.
- Malha hexagonal (favos vazados) interna, alinhada, com linhas de 2 mm.
- Parâmetros de diâmetro, espessura, aro, linha e abertura do favo.
- Preview R3F de uma malha, cor única PLA.
- Build em Web Worker, validação de domínio e export STL único.
- Card **Termoformador** na categoria Lembrancinhas.

Excluído:

- Corpo, tampa, pino lateral e base.
- Curvatura da tela, múltiplos formatos e múltiplas peças.
- 3MF e STEP.
- Texto, ícone ou personalização.

## Parâmetros

| Parâmetro | Faixa | Default | Observação |
|---|---|---|---|
| `diameter` | 60–300 mm | 160 | diâmetro externo do disco |
| `thickness` | 1,2–6 mm | 3 | espessura da placa |
| `frameWidth` | 2–30 mm | 6 | largura do aro sólido |
| `lineWidth` | 1,2–4 mm | 2 | espessura das linhas da malha |
| `opening` | 3–30 mm | 6 | abertura do favo entre lados opostos |
| `color` | 10 cores PLA | `#14b8a6` | apenas preview; STL não carrega cor |

`productType` é o literal `'termoformador'`.

## Geometria

- A geometria da malha é um favo hexagonal **flat-top**.
- Circunraio do favo: `Rc = opening / √3`.
- Passo entre centros: `d = opening + lineWidth`.
- Treliça flat-top com passo horizontal `(√3/2)·(opening + lineWidth)` e
  vertical `opening + lineWidth`, com colunas ímpares deslocadas meia linha.
- Só entram favos **totalmente dentro** do raio interno do aro:
  `distância do centro + Rc ≤ diameter/2 − frameWidth`. Favos parciais são
  descartados, então a borda sólida efetiva pode chegar a `frameWidth + Rc`.
- Construção: `Shape` circular externo com um `Path` hexagonal por favo, em
  `ExtrudeGeometry` com `depth = thickness` e sem bevel. A geometria é girada
  para deitar (`rotateX(-π/2)`), com a base em `Y = 0` e a espessura em `Y`.
- Limite de **4.000 favos** (`MAX_SCREEN_OPENINGS`). Ao exceder, `opening` cresce
  15% por iteração até caber, com a issue `screen-density`.
- Sem CSG; a malha nasce fechada e é validada por contagem de arestas.

### Abordagem escolhida

`ExtrudeGeometry` com furos hexagonais nativos.

Alternativas descartadas:

- **Malha procedural de nervuras:** garante manifold em qualquer densidade, mas
  exige triangulação própria e muito mais código. Fica como fallback caso o
  spike de geometria falhe.
- **Limite baixo de favos (~800):** obrigaria a aumentar a abertura em telas
  grandes, contrariando o pedido de linhas finas.

### Spike obrigatório

Antes de construir o restante, validar com ~1.500 favos que:

1. a malha é fechada (cada aresta aparece em exatamente 2 triângulos);
2. o build termina em tempo aceitável (< ~1,5 s no worker);
3. não há favos fora do aro nem sobreposição.

Se o spike falhar, a implementação migra para a malha procedural antes de
continuar.

## Arquitetura de arquivos

```text
src/features/studio/tools/lembrancinhas/termoformador/
  AGENTS.md                # spec da v1 (tela)
  schema.ts                # Zod, defaults, cores e constantes
  shapes.ts                # círculo externo e caminho hexagonal
  screenPattern.ts         # layout dos favos, limite e métricas
  buildScreen.ts           # geometria final (Extrude + rotação)
  validateScreen.ts        # issues e severidade
  workerGeometry.ts        # serialização da geometria única
  workerClient.ts          # interface do worker
  buildScreen.worker.ts    # build fora da main thread
  useThermoformer.ts       # reducer + Zod + debounce + worker
  exportStl.ts             # STL binário único
  StudioPanel.tsx          # painel de parâmetros
  ScreenPreview.tsx        # preview R3F
```

## Pipeline

```text
Parâmetros
  → schema + validação
  → layout hexagonal (centros, favos e cap)
  → Shape circular + Paths hexagonais
  → ExtrudeGeometry + rotação para deitar
  → worker + serialização
  → preview / export STL
```

## Integração

- `ToolSelector.tsx`: adicionar `'termoformador'` ao `ToolId` e o card
  **Termoformador** em Lembrancinhas, com ícone `⬡` e descrição
  "Tela circular perfurada com malha hexagonal e aro sólido".
- `StudioPage.tsx`: lazy imports de `StudioPanel` e `ScreenPreview`, wrapper
  `ThermoformerToolWrapper` com topbar, estados de build, validação e export.
- O viewport usa a câmera derivada do `fitRadius` como nas demais ferramentas.
- Status bar mostra largura × altura × espessura; para a tela, diâmetro ×
  diâmetro × espessura (ex.: 160 × 160 × 3 mm).

## UI

Painel em acordeões:

1. **Tela** — diâmetro e espessura.
2. **Malha** — abertura do favo, espessura da linha e largura do aro.
3. **Aparência** — cor PLA.
4. **Validação** — issues, quando existirem.

Componentes: Amplify UI `Accordion`, `SliderField`, `Text`, `Flex`, seguindo o
tema claro e os tokens de `docs/ui/*`. Sem componente novo de UI.

## Validação

| Código | Severidade | Regra |
|---|---|---|
| `screen-frame` | error | `frameWidth ≥ diameter/2` consome o disco |
| `screen-empty` | warning | nenhum favo cabe na área interna |
| `screen-density` | warning | limite de favos atingido e abertura ampliada |
| `screen-opening` | warning | abertura não cabe no raio interno |
| `screen-line` | warning | linha efetiva abaixo de 0,8 mm |

Avisos não bloqueiam o build nem o export.

## Exportação

- Um único STL binário: `<nome>-tela.stl`.
- O `prepareScreenForPrint` centraliza a peça na mesa e mantém a tela deitada
  como foi construída.
- O nome usa `sanitizeFilename(projectName)`.

## Decisões

- **Uma peça por vez:** a v1 entrega somente a tela para validar o conceito de
  equipamento modular antes de corpo/tampa/pino/base.
- **Favo flat-top:** melhor encaixe visual no contorno circular e linhas de 2 mm
  uniformes.
- **Favos parciais descartados:** evita CSG e mantém a malha fechada; o aro
  efetivo é documentado e mostrado no painel.
- **Cor não rebuilda:** `color` fica fora dos parâmetros de geometria.
- **Cap de 4.000 favos:** mantém o earcut previsível; o espaçamento cresce com
  aviso em vez de gerar malha instável.
- **Serialização local:** o contrato de uma peça é específico; não se acopla à
  Caixa nem ao serializador da confeitaria.
- **Spike primeiro:** a viabilidade do `ExtrudeGeometry` é provada antes do
  restante, com fallback definido.

## Riscos e mitigação

- **Earcut com muitos furos:** spike no início; cap de 4.000 e build em worker.
- **Malha não-manifold por favos degenerados:** teste `isClosed` em toda geometria
  gerada; validar também a contagem de favos.
- **Borda sólida maior que o esperado:** reportar `frameWidth` efetivo na seção de
  validação e documentar.
- **Performance de preview:** uma única geometria, sem duplicação de malha.
- **Regressão em ferramentas existentes:** mudanças em `ToolSelector` e
  `StudioPage` cobertas por testes.

## Critérios de conclusão

- Card **Termoformador** abre a ferramenta em Lembrancinhas.
- Tela circular com aro sólido e malha hexagonal de linha 2 mm é gerada.
- Sliders atualizam a geometria com debounce e build em worker.
- Validação lista as issues esperadas sem bloquear.
- Export baixa `<nome>-tela.stl` deitado, fechado e manifold.
- Typecheck, lint, testes e build passam.
- `termoformador/AGENTS.md`, `lembrancinhas/AGENTS.md` e
  `docs/frontend/studio.md` atualizados.
