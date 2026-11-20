# Termoformador — Macho convexo (v1)

**Data:** 2026-11-20
**Ferramenta:** `lembrancinhas/termoformador`
**Status:** design aprovado; implementado

## Objetivo

Adicionar ao Termoformador a **peça superior convexa** — o **macho** — que
pressiona a tela perfurada aquecida dentro da bacia côncava do suporte. A tela
continua sendo exportada plana, como sai da impressora; o macho é a ferramenta
que a conforma na calota do suporte.

A ferramenta passa a gerar três peças independentes:

- `tela` — disco perfurado plano;
- `suporte` — berço côncavo com bacia esférica;
- `macho` — molde convexo com coroa de contato e pega central.

## Escopo da v1

Incluído:

- Macho de revolução com domo de contato igual à bacia deslocada pela espessura
  da tela.
- Coroa plana que pressiona o aro sólido da tela.
- Parede-guia que entra no rebaixo com a folga de encaixe existente.
- Corpo com topo plano e pega por recesso cônico central.
- Exportação de três STLs: `<nome>-tela.stl`, `<nome>-suporte.stl` e
  `<nome>-macho.stl`.
- Preview com o macho suspenso acima do conjunto.
- Validação do macho e do limite de semi-esfera da bacia.

Excluído:

- Corpo, tampa, pino lateral e base do equipamento.
- Tela já conformada em calota; a tela é formada pelo usuário.
- Cavidade interna modelada no macho (a peça é um volume fechado impresso com
  preenchimento baixo).
- Pega em relevo, peça avulsa de pega, furo de vácuo, rosca e anel de retenção.
- Segundo material/cor e 3MF/STEP.

## Parâmetros

| Parâmetro | Faixa | Default |
|---|---|---|
| `plugHeight` | 10–40 mm | 26 |

Os demais parâmetros do macho são derivados do suporte e da tela. A cor continua
única para as três peças.

## Dimensões derivadas

Com `screenRadius = diameter/2`, `recessRadius = screenRadius + fitClearance`,
`contactRadius = recessRadius - stepWidth` e
`contactY = seatY + thickness` (= altura do suporte):

- Raio-guia: `guideRadius = screenRadius` (entra no rebaixo com `fitClearance`).
- Topo do corpo: `bodyTop = contactY + plugHeight`.
- Domo de contato:
  `y(r) = sphereCenterY + thickness - sqrt(sphereRadius² - r²)`, para
  `r = 0..contactRadius`.
  - No centro: `y = bottomThickness + thickness`.
  - Na borda: `y = contactY`.
- Chanfro do topo externo: 0,8 mm (constante).
- Raio da pega:
  `gripRadius = min(0.9 * plugHeight, 0.4 * guideRadius, 30)`.
- Profundidade da pega:
  `gripDepth = min(1.2 * gripRadius, effectiveBowlDepth + plugHeight - 6)`.
  O recesso é mais fundo que largo (parede entre 40° e 45°), garantindo
  impressão sem suporte e pelo menos 6 mm de material sobre o domo.
- Altura total da peça (impressa): `effectiveBowlDepth + plugHeight`.
- Diâmetro do macho: `diameter`.

Com os defaults (tela 160 × 3, suporte com degrau 5, folga 0,3):

- diâmetro do macho 160 mm;
- `contactRadius` 75,3 mm;
- `contactY` 27 mm;
- `bodyTop` 53 mm;
- centro do domo em 7 mm, profundidade de 20 mm;
- pega cônica ~Ø46,8 × 28 mm;
- altura impressa 46 mm.

## Geometria

- Perfil 2D único, fechado, no plano `(r, y)`, na orientação de uso:
  polo do domo → domo (centro → borda) → coroa plana → parede-guia → topo com
  chanfro → face superior → recesso cônico → ápice da pega.
- `LatheGeometry` com 128 segmentos e 32 amostras no domo.
- Os dois extremos do perfil ficam no eixo; os triângulos degenerados dos polos
  são removidos, como no suporte.
- O domo é a superfície da bacia deslocada em `thickness` para cima: a tela fica
  exatamente entre o domo e a bacia, sem folga adicional.
- A coroa plana em `contactY` cobre `contactRadius..guideRadius` e pressiona o
  aro sólido da tela. A parede-guia sobe a partir daí.
- Sem CSG. A peça nasce fechada, manifold e com volume positivo.
- O macho é um volume fechado; a leveza vem do preenchimento de 10–15% no
  fatiador. Uma cavidade selada modelada exigiria uma ponte interna grande e não
  seria imprimível; uma cavidade aberta exigiria suporte no teto.
- Não há canal de ar: a tela é perfurada e o ar escapa pelos favos.

### Orientação de impressão

- O STL é construído na orientação de uso (domo para baixo).
- No export, o macho é girado 180° para a face superior ficar na mesa e o domo
  para cima. Assim imprime sem suporte e a superfície de contato não recebe
  marcas.
- O recesso cônico fica aberto para a mesa e imprime com parede de 40–45°.
- A peça preparada é centralizada na mesa; a altura impressa é
  `effectiveBowlDepth + plugHeight`.

## Ajuste no suporte: limite de semi-esfera

O macho só pode ser inserido e retirado se a bacia não tiver sobrequeda. Isso
exige que a profundidade não passe do raio de abertura:

```text
effectiveBowlDepth = min(bowlDepth, limite da parede, cavityTopRadius)
```

- `cavityTopRadius = recessRadius - stepWidth`.
- Com a profundidade menor ou igual à abertura, a calota tem no máximo uma
  semi-esfera; a retirada vertical do macho é possível.
- O limite de 0,8 mm de parede entre a bacia e o raio externo continua como
  guarda defensiva.
- Os defaults não mudam (`20 ≤ 75,3`).
- Em configurações extremas (ex.: Ø60, degrau 15, profundidade 60, folga 0,6), a
  profundidade efetiva passa a ser 15,6 mm e `support-depth` avisa.
- A mensagem de `support-depth` passa a citar a parede e a forma imprimível da
  bacia.

## UI

Painel em acordeões, com um novo item **Macho** depois de **Suporte**:

1. **Tela** — diâmetro e espessura.
2. **Malha** — abertura, linha e aro.
3. **Suporte** — parede, fundo, profundidade, degrau, folga e chanfro, com
   métricas.
4. **Macho** — altura do corpo (10–40 mm), diâmetro, altura total e medidas da
   pega. Nota: “A tela é exportada plana; aqueça e pressione com o macho para
   conformá-la na bacia.”
5. **Aparência** — cor PLA única.
6. **Validação** — issues da tela, do suporte e do macho.

- A status bar continua mostrando o envelope do suporte; as medidas do macho
  ficam no painel.
- Um único botão **Exportar STL** baixa as três peças.
- Sem componente novo de UI: `Accordion`, `SliderField`, `Text`, `Flex` e
  `Alert`, seguindo `docs/ui/*`.

## Preview

- Suporte na base, tela plana em `seatY` e macho suspenso acima.
- Afastamento do macho: `effectiveBowlDepth + 8 mm`, para o domo ficar 8 mm
  acima da tela plana.
- `fitRadius` considera a união suporte + macho suspenso; a câmera abre o
  suficiente para enquadrar a peça mais alta.
- Cor única para as três peças.
- Sem alternador de estados; o macho suspenso mostra a relação de encaixe.

## Arquitetura de arquivos

```text
src/features/studio/tools/lembrancinhas/termoformador/
  schema.ts                    # + plugHeight e default
  latheUtils.ts                # dedupe + remoção de triângulos degenerados
  buildSupport.ts              # + limite de semi-esfera; usa latheUtils
  buildPlug.ts                 # dimensões, perfil e LatheGeometry do macho
  buildThermoformer.ts         # { screen, support, plug, seatY }
  validateThermoformer.ts      # + plug-guide; support-depth atualizado
  workerGeometry.ts            # serializa as três peças
  buildScreen.worker.ts        # chama buildThermoformer (sem mudança)
  workerClient.ts              # resultado com três peças
  useThermoformer.ts           # estado, worker, plug, plugLift e fitRadius
  exportStl.ts                 # três STLs e preparePlugForPrint
  StudioPanel.tsx              # + acordeão Macho e nota
  ThermoformerPreview.tsx      # + malha do macho suspensa
```

## Pipeline

```text
Parâmetros
  → schema + validação
  → dimensões do suporte com limite de semi-esfera
  → layout hexagonal da tela
  → buildScreen + buildSupport
  → dimensões e perfil do macho
  → buildPlug
  → montagem { screen, support, plug, seatY }
  → worker + serialização das três peças
  → preview montado / export de três STLs
```

## Validação

| Código | Severidade | Regra |
|---|---|---|
| `support-depth` | warning | profundidade efetiva limitada pela parede ou pela semi-esfera |
| `plug-guide` | error | defensivo: coroa de contato inválida ou parede-guia menor que a coroa |
| demais códigos | — | inalterados (tela, degrau, parede, fundo, folga) |

- A UI não alcança `plug-guide`; o schema garante `contactRadius > 0` e
  `guideRadius > contactRadius`.
- Avisos não bloqueiam o build.

## Exportação

- Três STLs binários: `<nome>-tela.stl`, `<nome>-suporte.stl` e
  `<nome>-macho.stl`.
- Tela e suporte saem como construídos.
- O macho é girado com a face superior na mesa, centralizado e apoiado em
  `y = 0`.
- O STL não carrega cor.
- Três downloads podem acionar a permissão de múltiplos arquivos do navegador.

## Decisões

- **Macho derivado do suporte:** o domo é a bacia deslocada por `thickness`; o
  encaixe acompanha qualquer mudança de diâmetro, profundidade, degrau ou folga.
- **Tela plana:** a peça impressa é plana; o macho é usado para conformá-la. Isso
  mantém o fluxo térmico e evita exportar uma calota que não corresponde ao
  estado impresso.
- **Limite de semi-esfera:** sem ele a bacia vira sobrequeda e o macho não pode
  ser retirado. O clamp é aplicado no suporte e avisado por `support-depth`.
- **Pega cônica:** um pino em relevo obrigaria suporte de impressão e poderia
  marcar a face de contato. O recesso cônico imprime sem suporte e mantém o topo
  plano na mesa.
- **Volume fechado com infill:** a cavidade selada não é imprimível; o STL não
  carrega preenchimento. A leveza fica a cargo do fatiador (10–15%).
- **LatheGeometry:** um perfil fechado gera o sólido inteiro sem CSG, como no
  suporte.
- **Macho suspenso:** o preview mostra a relação de encaixe sem precisar simular
  a conformação.
- **Cor única:** as três peças usam a mesma cor PLA.

## Riscos e mitigação

- **Malha aberta nos polos do domo e da pega:** remover triângulos degenerados e
  validar com `isClosed` e volume positivo.
- **Sobrequeda em configurações extremas:** clamp de semi-esfera com aviso;
  testes nos extremos do schema.
- **Folga insuficiente no rebaixo:** reaproveita `fitClearance`; a validação
  `support-clearance` continua avisando abaixo de 0,2 mm.
- **Face de contato marcada:** imprimir com o topo na mesa e o domo para cima.
- **Pega pequena em telas pequenas:** a pega é proporcional ao raio-guia; nos
  extremos fica ~Ø24 mm, ainda utilizável com um dedo.
- **Enquadramento do preview:** `fitRadius` passa a usar a união das peças;
  testes de `useThermoformer` atualizados.
- **Três downloads:** o navegador pode pedir permissão; documentado.
- **Regressão no suporte:** os testes existentes de malha e dimensões continuam;
  o caso de profundidade 45,1 mm passa a validar o limite de semi-esfera.

## Critérios de conclusão

- O painel permite ajustar a altura do corpo do macho e mostra as medidas.
- O preview mostra suporte, tela plana e macho suspenso.
- O macho é fechado, manifold, com volume positivo e domo concordante com a
  bacia + espessura.
- O suporte limita a bacia à semi-esfera e avisa quando o limite atua.
- O export baixa `<nome>-tela.stl`, `<nome>-suporte.stl` e `<nome>-macho.stl`,
  com o macho na orientação de impressão.
- Typecheck, lint, testes e build passam.
- `termoformador/AGENTS.md`, `lembrancinhas/AGENTS.md` e
  `docs/frontend/studio.md` atualizados.
