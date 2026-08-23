# Studio 3D

## Visão geral

O Studio (`/studio`) é o ambiente de modelagem do 3DFormio. A primeira ferramenta
real é o **gerador de chaveiros** (frontend puro, exportação STL):

- **Topbar** — marca, nome do projeto editável, Exportar STL (funcional) e
  Salvar (disabled, disponível a partir do Sprint 2)
- **Toolbar** — Selecionar, Mover, Rotacionar, Zoom (visuais, com estado ativo) e
  Resetar câmera (funcional)
- **Viewport** — Canvas React Three Fiber com OrbitControls, Grid, Environment,
  sombras; renderiza chaveiro com material teal, agnóstico (recebe geometria)
- **Parâmetros** — nome (1-12 caracteres, acentos normalizados), forma (retângulo/
  círculo/coração), modo de texto (rebaixado/gravado), 6 sliders
- **Status bar** — dimensões atuais em mm e dicas de navegação

Acesso: botão "Studio 3D" na navbar e "Abrir o Studio" no hero da landing
(rota pública; autenticação entra em ciclo futuro).

## Como editar

| O que | Onde |
|---|---|
| Parâmetros/ranges/defaults | `src/features/studio/keychain/schema.ts` |
| Formas da base | `src/features/studio/keychain/shapes.ts` |
| Texto 3D | `src/features/studio/keychain/textToGeometry.ts` |
| Composição (merge/CSG) | `src/features/studio/keychain/buildKeychain.ts` |
| Exportação STL | `src/features/studio/keychain/exportStl.ts` |
| Estado + debounce | `src/features/studio/hooks/useKeychain.ts` |

## Gerador de chaveiros

Pipeline completo de geração do chaveiro 3D:

**schema.ts (Zod)** → **shapes.ts (THREE.Shape + furo nativo)** → **textToGeometry.ts (TextGeometry + fit-to-width)** → **buildKeychain.ts (raised = merge, engraved = CSG)** → **exportStl.ts (STL binário + download)**

1. **schema.ts** — Valida e normaliza parâmetros (nome 1-12 chars, forma, modo de texto, dimensões)
2. **shapes.ts** — Gera a forma base (retângulo, círculo ou coração) com furo nativo para o aro
3. **textToGeometry.ts** — Cria geometria 3D do texto com TextGeometry, ajusta escura para caber na base
4. **buildKeychain.ts** — Composição: raised (rebaixado) usa merge, engraved (gravado) usa CSG subtração
5. **exportStl.ts** — Exporta geometria final como STL binário e dispara download

## Decisões

- **R3F + drei:** stack oficial do AGENTS.md; OrbitControls/Grid/Environment do
  drei evitam boilerplate.
- **1 unidade three.js = 1 mm:** dimensões da UI mapeiam direto para a cena.
- **React.lazy em /studio:** three.js (~600KB) fica em chunk separado — a
  landing não paga esse custo.
- **Estado local com useReducer + Zod:** sem estado global (YAGNI); o schema
  valida e clampa os valores dos sliders.
- **Mock de fiber/drei nos testes:** jsdom não tem WebGL; Canvas e componentes
  drei são mockados nos testes do viewport/page.

## Próximos passos (fora de escopo desta fase)

- Autenticação (Authenticator + rota protegida)
- Geração real via CadQuery (Sprint 2)
- Exportar STL e salvar projeto
- Drawer de parâmetros no mobile

## Testes

`tests/features/studio/` cobre config, hook, componentes e composição da página.
Rodar: `npm run test`.