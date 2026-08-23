# Studio 3D

## Visão geral

O Studio (`/studio`) é o ambiente de modelagem do 3DFormio. Nesta fase (frontend
puro), o shell está completo com viewport 3D real e um sólido de exemplo
paramétrico:

- **Topbar** — marca, nome do projeto editável, Salvar e Exportar STL (disabled,
  disponíveis a partir do Sprint 2)
- **Toolbar** — Selecionar, Mover, Rotacionar, Zoom (visuais, com estado ativo) e
  Resetar câmera (funcional)
- **Viewport** — Canvas React Three Fiber com OrbitControls, Grid, Environment,
  sombras e RoundedBox teal paramétrico
- **Parâmetros** — sliders Largura, Altura, Profundidade, Raio de arredondamento
  e Segmentos; alteram o sólido em tempo real
- **Status bar** — dimensões atuais em mm e dicas de navegação

Acesso: botão "Studio 3D" na navbar e "Abrir o Studio" no hero da landing
(rota pública; autenticação entra em ciclo futuro).

## Como editar

| O que | Onde |
|---|---|
| Ranges/defaults dos parâmetros | `src/features/studio/config/parameters.ts` |
| Layout do shell | `src/features/studio/StudioPage.tsx` |
| Sólido de exemplo | `src/features/studio/components/SampleSolid.tsx` |
| Câmera e cena | `src/features/studio/components/StudioViewport.tsx` |
| Ferramentas da toolbar | `src/features/studio/components/StudioToolbar.tsx` |

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