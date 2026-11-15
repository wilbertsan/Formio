# Termoformador — Suporte côncavo (v1)

**Data:** 2026-11-14
**Ferramenta:** `lembrancinhas/termoformador`
**Status:** design aprovado; implementação pendente

## Objetivo

Adicionar ao Termoformador o **suporte côncavo** que encaixa a tela circular.
O suporte é um berço circular com bacia esférica interna, rebaixo com degrau e
folga radial de impressão. A tela fica nivelada com o topo do suporte.

A ferramenta passa a gerar duas peças independentes:

- `tela` — disco perfurado já implementado;
- `suporte` — berço côncavo novo.

## Escopo da v1

Incluído:

- Suporte circular com bacia esférica fechada e fundo fechado.
- Rebaixo interno com degrau; a tela apoia no degrau e fica nivelada.
- Diâmetro do suporte derivado do diâmetro da tela.
- Exportação de dois STLs: `<nome>-tela.stl` e `<nome>-suporte.stl`.
- Preview do conjunto montado, com a tela assentada no suporte.
- Validação do encaixe e dos parâmetros do suporte.

Excluído:

- Corpo, tampa, pino lateral e base do equipamento.
- Furo de vácuo, rosca, anel de retenção e outras formas de fixação.
- Segunda cor para o suporte.
- 3MF e STEP.

## Parâmetros

Além dos parâmetros atuais da tela:

| Parâmetro | Faixa | Default |
|---|---|---|
| `wallThickness` | 2–10 mm | 4 |
| `bottomThickness` | 2–10 mm | 4 |
| `bowlDepth` | 5–60 mm | 20 |
| `stepWidth` | 2–15 mm | 5 |
| `fitClearance` | 0,1–0,6 mm | 0,3 |
| `edgeChamfer` | 0–3 mm | 0,6 |

## Dimensões derivadas

- Raio do rebaixo: `Rs = diameter/2 + fitClearance`.
- Raio externo: `Ro = Rs + wallThickness`.
- Altura total: `H = thickness + bowlDepth + bottomThickness`.
- Plano do assento: `seatY = bowlDepth + bottomThickness`.
- Raio interno do degrau: `Rtop = Rs − stepWidth`.
- Sobreposição do degrau sob a tela: `stepWidth − fitClearance`.
- Raio da esfera da bacia: `Rb = (Rtop² + bowlDepth²) / (2·bowlDepth)`.
- Centro da esfera: `yc = bottomThickness + Rb`.
- Profundidade efetiva: limitada para manter pelo menos 0,8 mm entre a
  parede externa e o raio máximo da bacia (`cavityWall`).

Com os defaults (tela 160 × 3, aro 6):

- diâmetro externo 168,6 mm;
- altura 27 mm;
- assento em 24 mm;
- `Rtop` 75,3 mm;
- sobreposição do degrau 4,7 mm;
- raio da bacia ~151,75 mm.

## Geometria

- Perfil 2D fechado no plano `(r, y)`:
  centro do fundo → base externa → parede externa → aro superior →
  parede do rebaixo → degrau → arco esférico → centro do fundo.
- Chanfro de 45° nas arestas externas superior e inferior.
- `LatheGeometry` com 128 segmentos.
- A peça nasce fechada e manifold; triângulos degenerados no eixo são removidos
  se a validação exigir.
- A bacia é uma calota esférica; o fundo da cavidade fica em
  `y = bottomThickness`, preservando a placa inferior.
- A tela é construída em `y = 0..thickness`; no preview é transladada para
  `y = seatY`. No STL, cada peça é exportada centralizada na mesa.
- A tela não é fundida ao suporte; são peças separadas.

## Arquitetura de arquivos

```text
src/features/studio/tools/lembrancinhas/termoformador/
  schema.ts                    # + parâmetros e defaults do suporte
  buildScreen.ts               # inalterado
  buildSupport.ts              # dimensões, perfil e LatheGeometry
  buildThermoformer.ts         # orquestra { screen, support, seatY }
  validateThermoformer.ts      # validação da tela + suporte (renomeia validateScreen)
  workerGeometry.ts            # serializa as duas peças + seatY
  buildScreen.worker.ts        # chama buildThermoformer
  workerClient.ts              # resultado com duas peças
  useThermoformer.ts           # estado, worker, duas geometrias e seatY
  exportStl.ts                 # dois STLs
  StudioPanel.tsx              # + seção Suporte e métricas
  ThermoformerPreview.tsx      # substitui ScreenPreview; monta o conjunto
```

## Pipeline

```text
Parâmetros
  → schema + validação
  → layout hexagonal da tela
  → buildScreen
  → perfil do suporte + LatheGeometry
  → montagem { screen, support, seatY }
  → worker + serialização
  → preview montado / export de dois STLs
```

## UI

- Painel em acordeões:
  1. **Tela** — diâmetro e espessura.
  2. **Malha** — abertura, linha e aro.
  3. **Suporte** — parede, fundo, profundidade, degrau, folga e chanfro, com
     métricas de diâmetro externo, altura e parede da bacia.
  4. **Aparência** — cor PLA única.
  5. **Validação** — issues da tela e do suporte.
- Status bar mostra o envelope do suporte: diâmetro externo × altura ×
  diâmetro externo.
- Câmera enquadrada pela esfera envolvente do suporte.
- Um único botão **Exportar STL** baixa as duas peças.

## Validação

| Código | Severidade | Regra |
|---|---|---|
| `support-step` | error/warning | defensivo: error se `stepWidth <= fitClearance`; warning se a sobreposição for menor que 1 mm (a UI não alcança; mínimo 1,4 mm) |
| `support-step-frame` | warning | `stepWidth − fitClearance > frameWidth`, degrau avança sob a área perfurada |
| `support-wall` | error | parede abaixo de 0,8 mm (defensivo) |
| `support-bottom` | error | fundo abaixo de 0,8 mm (defensivo) |
| `support-clearance` | warning | folga abaixo de 0,2 mm |
| `support-depth` | warning | profundidade inválida ou limitada para manter a parede mínima |

As issues da tela existentes permanecem. Avisos não bloqueiam o build.

## Exportação

- Dois STLs binários: `<nome>-tela.stl` e `<nome>-suporte.stl`.
- A tela é centralizada na mesa; o suporte é centralizado com a base em `y = 0`.
- O STL não carrega cor.

## Decisões

- **LatheGeometry:** um perfil fechado gera o sólido inteiro sem CSG; é o mesmo
  princípio do puxador da caixa. O fallback é loft de anéis, caso o spike de
  manifold falhe.
- **Diâmetro derivado:** o suporte acompanha a tela, evitando estados em que a
  tela não cabe.
- **Tela nivelada:** o rebaixo tem a espessura da tela; o topo fica flush.
- **Encaixe por degrau:** a tela apoia no degrau; não há anel de retenção nem
  rosca na v1.
- **Fundo fechado:** sem furo de vácuo; a bacia é um recipiente fechado.
- **Profundidade limitada:** se a bacia solicitada furar a parede externa,
  a profundidade efetiva é reduzida até manter 0,8 mm de parede e a
  validação avisa via `support-depth`.
- **Duas peças no export:** o botão exporta tela e suporte, como as peças da
  caixa.
- **Cor única:** as duas peças usam a mesma cor PLA; o STL não carrega cor.

## Riscos e mitigação

- **Malha do Lathe com triângulos degenerados no eixo:** teste `isClosed` e
  volume positivo; remover triângulos degenerados e, se necessário, migrar para
  loft de anéis.
- **Encaixe apertado ou frouxo:** folga ajustável e validação de folga mínima;
  a folga radial é aplicada só no rebaixo, não na bacia.
- **Degrau sob a área perfurada:** validação `support-step-frame` avisa quando o
  degrau passa do aro sólido da tela.
- **Peças colidindo no preview:** a tela é transladada para `seatY`; a validação
  de dimensões garante que o rebaixo comporte a tela.
- **Regressão na ferramenta de tela:** a tela continua sendo gerada pelo mesmo
  `buildScreen`; testes atuais permanecem.

## Critérios de conclusão

- O painel permite configurar tela e suporte.
- O preview mostra a tela assentada no suporte, nivelada.
- A validação cobre encaixe, parede, fundo, folga e degrau.
- O export baixa `<nome>-tela.stl` e `<nome>-suporte.stl`.
- Suporte fechado, manifold e com volume positivo.
- Typecheck, lint, testes e build passam.
- `termoformador/AGENTS.md`, `lembrancinhas/AGENTS.md` e
  `docs/frontend/studio.md` atualizados.
