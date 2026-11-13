# Caixa Personalizada — Design da renomeação

**Data:** 2026-11-13
**Ferramenta:** `lembrancinhas/caixa-personalizada`
**Status:** design aprovado; implementação pendente

## Objetivo

Renomear a ferramenta atualmente chamada **Termoformador** para **Caixa
Personalizada**, refletindo o produto real: uma caixa paramétrica com tampa,
painel decorativo, puxador lateral e base.

O novo **Termoformador** fica como ferramenta separada, planejada, com spec
próprio e sem implementação nesta entrega.

## Escopo

Incluído:

- Renomear pasta, arquivos, símbolos, imports, testes e docs da ferramenta atual.
- Trocar `ToolId`, `productType`, card, heading, labels de UI e nomes de
  exportação.
- Recriar o spec planejado do Termoformador e atualizar a categoria
  Lembrancinhas.
- Renomear o design atual e registrar o plano antigo como histórico.

Excluído:

- Texto/nome em relevo na caixa.
- Implementação do novo Termoformador.
- Card não funcional do Termoformador no seletor.
- Alteração das chaves técnicas do schema (`handle*`, `frontPanel*`, `rim*`).

## Nomenclatura

- Pasta: `src/features/studio/tools/lembrancinhas/caixa-personalizada`
- Testes: `tests/features/studio/tools/lembrancinhas/caixa-personalizada`
- `ToolId` e `productType`: `'caixa-personalizada'`
- UI: **Caixa Personalizada**
- Código interno: `Box`

## Arquivos renomeados

| Atual | Novo |
|---|---|
| `ThermoformerPreview.tsx` | `BoxPreview.tsx` |
| `buildThermoformer.ts` | `buildBox.ts` |
| `buildThermoformer.worker.ts` | `buildBox.worker.ts` |
| `useThermoformer.ts` | `useBox.ts` |
| `validateThermoformer.ts` | `validateBox.ts` |
| `termoformador/` | `caixa-personalizada/` |

Os demais arquivos mantêm o nome e recebem atualização de símbolos/imports.

## Símbolos

| Atual | Novo |
|---|---|
| `ThermoformerParams` | `BoxParams` |
| `ThermoformerGeometryParams` | `BoxGeometryParams` |
| `thermoformerParamsSchema` | `boxParamsSchema` |
| `defaultThermoformerParams` | `defaultBoxParams` |
| `BuildThermoformerResult` | `BuildBoxResult` |
| `buildThermoformer` | `buildBox` |
| `disposeThermoformerResult` | `disposeBoxResult` |
| `ThermoformerWorker` | `BoxWorker` |
| `createThermoformerWorker` | `createBoxWorker` |
| `UseThermoformerOptions` / `UseThermoformerResult` | `UseBoxOptions` / `UseBoxResult` |
| `useThermoformer` | `useBox` |
| `ThermoformerIssueCode` | `BoxIssueCode` |
| `validateThermoformer` | `validateBox` |
| `exportThermoformerStl` | `exportBoxStl` |
| `TermoformadorToolWrapper` | `BoxToolWrapper` |
| worker `productType` | `'caixa-personalizada'` |

`ValidationIssue`, `SerializedBuildResult`, `workerGeometry` e
`workerClient` permanecem genéricos.

## UI

- Card e heading: **Caixa Personalizada**
- Ícone: `📦`
- Descrição: “Caixa 3D personalizável com tampa, painel decorativo, puxador
  lateral e base”
- “Pino lateral” → **Puxador lateral**
- “Habilitar pino” → **Habilitar puxador**
- “Diâmetro do pino” → **Diâmetro do puxador**
- “Comprimento do pino” → **Comprimento do puxador**
- “Diâmetro da base” → **Diâmetro da base do puxador**
- “Painel frontal” → **Painel decorativo**
- “Diâmetro do furo” → **Tamanho da abertura**
- Mensagens de validação passam a usar “caixa” e “puxador” onde fizer sentido.

As chaves técnicas `handle*`, `frontPanel*` e `rim*` permanecem no schema para
reduzir risco; os labels e a documentação fazem a ponte semântica.

## Exportação

Arquivos separados:

```text
<nome>-corpo.stl
<nome>-tampa.stl
<nome>-painel.stl
<nome>-puxador.stl
<nome>-base.stl
```

Orientações de impressão permanecem: corpo/base como construídos, tampa
invertida, painel deitado e puxador em pé.

## Documentação

- `caixa-personalizada/AGENTS.md`: spec real da caixa e decisões da v1.
- `termoformador/AGENTS.md`: recriado como **Planejada**, com o spec original de
  termoformagem e fora de escopo.
- `lembrancinhas/AGENTS.md`: tabela com `caixa-personalizada` implementada e
  `termoformador` planejada.
- `docs/frontend/studio.md`: substitui a seção atual pela Caixa Personalizada,
  atualizando paths, labels, validação, decisões e nomes de exportação.
- `docs/plans/2026-11-12-termoformador-design.md` → 
  `2026-11-12-caixa-personalizada-design.md`, com título e termos atualizados.
- `docs/plans/2026-11-12-termoformador.md`: mantido como registro histórico,
  com nota de renomeação.
- Novos docs: `2026-11-13-caixa-personalizada-rename-design.md` e
  `2026-11-13-caixa-personalizada-rename.md`.

## Testes e validação

- Renomear a pasta de testes e os arquivos que carregam o nome antigo.
- Atualizar imports, `describe`, fixtures e mocks.
- Atualizar `ToolSelector.test.tsx` e `StudioPage.test.tsx` para o novo card,
  heading, `productType` do mock de worker e caminho do mock de exportação.
- Rodar `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build`.
- Confirmar que `buildBox.worker` é emitido e que a caixa abre/exporta.

## Riscos e mitigação

- **Substituição global atingir docs históricos.** Limitar a substituição a
  `src`, `tests` e docs atuais; o plano antigo recebe apenas uma nota.
- **Referências esquecidas em mocks/testes.** Fazer uma varredura final por
  `termoformador`, `Termoformador`, `Thermoformer` e `thermoformer` em `src` e
  `tests`, esperando zero ocorrências.
- **Histórico do git.** Usar `git mv` para pastas e arquivos.
- **Chaves técnicas ambíguas.** Documentar `handle = puxador` e
  `frontPanel = painel decorativo` no `AGENTS.md` da caixa.

## Critérios de conclusão

- Ferramenta aparece como **Caixa Personalizada** na categoria Lembrancinhas.
- Nenhum código-fonte/teste ativo usa o nome antigo.
- `termoformador/AGENTS.md` existe como spec planejado, sem código.
- Exportação usa `-puxador`.
- Typecheck, lint, testes e build passam.
- Documentação atualizada e histórico preservado.
