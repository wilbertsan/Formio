# Design: Chaveiro com build em Web Worker e feedback “Gerando…”

**Data:** 2026-11-02
**Status:** Aprovado
**Ferramenta:** Studio 3D > Chaveiros > Chaveiro

---

## 1. Objetivo

Eliminar o travamento da UI durante a geração do chaveiro e exibir o aviso **Gerando…** enquanto a geometria é recalculada, seguindo o padrão do **Cortador + Carimbo**.

---

## 2. Arquitetura

```
useKeychain (main thread)
  ├─ parse SVG (DOMParser) + cache
  ├─ debounce 200ms
  ├─ cria Worker
  ├─ postMessage({ params, parsedSvgs, styles })
  └─ recebe { data } | { error }
        │
        ▼
buildKeychain.worker.ts
  ├─ carrega fontes via FontLoader/fontUrls
  ├─ buildKeychain({ params, fonts, parsedSvgs })
  └─ serializeKeychainResult → postMessage(data, transfer)
```

- O SVG é parseado na main thread porque o Worker não tem `DOMParser`; o `ParsedSvg` é serializável.
- As fontes são carregadas dentro do Worker, removendo `FontLoader`/cache da main thread.
- O Worker é terminado em rebuild, erro e unmount.
- A geometria anterior permanece visível durante o rebuild; a nova a substitui ao chegar.

---

## 3. Serialização

- Mover `SerializedGeometry`, `serializeGeometry` e `deserializeGeometry` para `confeitaria/shared/workerGeometry.ts`.
- `cortador-carimbo/workerGeometry.ts` reexporta/usa os helpers compartilhados (API pública preservada).
- Novo `chaveiro/workerGeometry.ts`:
  ```ts
  interface SerializedKeychainResult {
    base: SerializedGeometry
    content: SerializedGeometry | null
    contentItems: Array<{ id: string; halfWidth: number; halfHeight: number }>
    pieceBB: BoundingBox2D
    hole: Circle2D
  }
  ```
- `contentItems[].geometry` é sempre `null` após o merge; a main thread reconstrói com `geometry: null`.

---

## 4. SVG no Worker

- `svgToIconShape.ts` ganha:
  - `buildSvgIconGeometryFromParsed(parsed, input)`
  - `buildSvgIconGeometryInBoxFromParsed(parsed, input)`
- As funções atuais baseadas em string passam a fazer `parseSvg` e delegar.
- `buildKeychain`/`autoFit` aceitam `parsedSvgs?: Record<string, ParsedSvg | null>`:
  - `ParsedSvg` → usa a variante `fromParsed`.
  - `undefined` → mantém o parse por string (testes/main thread).
  - `null` → item inválido; o hook interrompe o build com erro.

---

## 5. Hook

`useKeychain` passa a expor:
- `isBuilding: boolean`
- `error: string | null`

Remove `fontError` e o carregamento de fontes na main thread.

Fluxo:
1. Debounce de 200ms.
2. Termina o Worker anterior.
3. Parseia os SVGs (cache por string). Se algum falhar: `error = 'Não foi possível ler o SVG'`, `isBuilding = false`, não inicia o Worker.
4. Cria o Worker, seta `isBuilding = true`.
5. Envia `{ params, parsedSvgs, styles }`.
6. No sucesso: desserializa, troca a geometria, descarta a anterior, `isBuilding = false`, `error = null`.
7. No erro: `isBuilding = false`, `error = mensagem`.

`styles` = estilos distintos de itens de texto não vazios.

---

## 6. UI

`ChaveiroToolWrapper` (StudioPage):
- Container principal vira `relative` com `aria-busy={isBuilding}`.
- Overlay:
  - Erro: `role="alert"`, banner vermelho.
  - Gerando: `role="status"` + `aria-live="polite"`, “Gerando…”, `pointer-events-none`.
- Remove o banner antigo de `fontError`.
- Exportar continua habilitado se `geometry !== null`.

---

## 7. Testes

- `useKeychain.test.tsx` com Worker falso controlável:
  - `isBuilding` inicial/final, resposta, erro.
  - SVG parseado e enviado ao Worker.
  - SVG inválido interrompe o build.
  - Peça anterior permanece durante rebuild.
  - `terminate` em rebuild/unmount.
  - Dimensões após resposta.
- `chaveiro/workerGeometry.test.ts`: serialização/desserialização.
- `svgToIconShape.test.ts`: variantes `fromParsed`.
- `buildKeychain.test.ts`: build com `parsedSvgs`.
- `StudioPage.test.tsx`: “Gerando…” aparece ao abrir o chaveiro.
- Docs: `chaveiro/AGENTS.md` e `docs/frontend/studio.md`.

---

## 8. Decisões

- Worker completo para todos os formatos.
- SVG inválido interrompe o build e mantém a peça anterior.
- Sem mudança na geometria gerada.
- Reutiliza o padrão `workerFactory` injetável do `useCutterStamp` para testes.
- Helpers genéricos de serialização passam a ser compartilhados.

## 9. Fora de escopo

- Alterar o build de outras ferramentas.
- Cancelamento cooperativo dentro do Worker (usa `terminate`).
- Persistência, backend ou autenticação.
