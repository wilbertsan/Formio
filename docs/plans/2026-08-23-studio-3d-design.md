# Design — Studio 3D (3DFormio)

Data: 2026-08-23
Status: Aprovado
Escopo: Frontend — shell do Studio 3D com viewport real (sem auth, sem backend)

## Contexto

A landing page está completa. O usuário pediu a interface do Studio 3D, onde
ficarão as ferramentas de modelagem, ainda apenas frontend. O acesso ao Studio
fica disponível via botão (navbar e hero); autenticação entra em ciclo futuro
com Authenticator + sandbox AWS. A geração real via CadQuery fica para o
Sprint 2.

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Viewport | React Three Fiber + @react-three/drei | Stack oficial do AGENTS.md; drei elimina boilerplate (OrbitControls, Grid, Environment) |
| Sólido de exemplo | RoundedBox (drei) paramétrica | Demonstra o conceito do produto sem backend |
| Parâmetros | Sliders ligados à geometria em tempo real | Studio tangível com custo mínimo; CadQuery substitui no Sprint 2 |
| Auth | Nenhuma nesta fase | Usuário optou por frontend puro; /studio é rota pública |
| Bundle | React.lazy + Suspense em /studio | three.js (~600KB) fora do bundle da landing |
| Estado | useReducer + Zod local ao StudioPage | Sem estado global (YAGNI); React Query só com API real |

## Arquitetura

Novas deps: `three`, `@react-three/fiber`, `@react-three/drei` (drei com peer three).

Roteamento:

- `/studio` → `StudioPage` (lazy + Suspense)
- Navbar ganha botão "Studio 3D" ao lado de "Criar conta"
- Hero ganha CTA terciário "Abrir o Studio"

Estrutura Feature First:

```
src/features/studio/
├── StudioPage.tsx            # Layout do shell (grid de painéis)
├── components/
│   ├── StudioTopbar.tsx      # Logo, nome do projeto, Salvar, Exportar STL
│   ├── StudioToolbar.tsx     # Toolbar lateral esquerda (ícones de ferramentas)
│   ├── StudioViewport.tsx    # Canvas R3F + Suspense + fallback loader
│   ├── StudioParameters.tsx  # Painel direito de parâmetros (sliders)
│   ├── StudioStatusBar.tsx   # Barra inferior (dimensões, unidades, dicas)
│   └── SampleSolid.tsx       # Sólido de exemplo (geometria paramétrica)
├── config/
│   └── parameters.ts         # Definição tipada dos parâmetros (min/max/step/label)
└── hooks/
    └── useModelParameters.ts # Estado dos parâmetros (useReducer + Zod)
```

## Layout

Grid CSS em tela cheia (h-screen, sem scroll):

- Topbar: 48px — logo, campo editável "Projeto sem título", botões "Salvar"
  (.btn-primary) e "Exportar STL" (.btn-secondary), ambos disabled com
  tooltip "disponível no Sprint 2"
- Toolbar esquerda: 56px — botões de ícone: Selecionar, Mover, Rotacionar,
  Zoom, Resetar câmera (funcional: controls.reset()). Ferramenta ativa com
  highlight teal
- Viewport central: flexível — Canvas R3F com OrbitControls, Grid e
  Environment (drei), fundo neutro escuro, iluminação padrão, sombras suaves.
  Fallback do Suspense com Loader do Amplify UI
- Painel de parâmetros (direita): 280px — header "Parâmetros", botão
  "Restaurar padrão", sliders:
  - Largura: 10–100 mm (default 60)
  - Altura: 10–100 mm (default 40)
  - Profundidade: 10–100 mm (default 30)
  - Raio de arredondamento: 0–10 mm (default 4)
  - Segmentos: 2–32 (default 8)
- Status bar: 32px — dimensões atuais ("60 × 40 × 30 mm"), unidades "mm",
  dica rotativa ("Arraste para girar • Scroll para zoom • Botão direito para pan")

Mobile: toolbar vira barra horizontal; painel de parâmetros vira drawer
colapsável (breakpoints base/medium).

## Interações

- Slider → geometria do sólido atualiza em tempo real (props R3F)
- Resetar câmera → controls.reset()
- Nome do projeto editável (estado local)

## Testes

- `parameters.ts`: schema Zod (ranges, defaults, clamping)
- `useModelParameters`: reducer (update, restore, valor inválido clampado)
- `StudioTopbar`: título editável, botões disabled
- `StudioToolbar`: seleção de ferramenta ativa
- `StudioParameters`: 5 sliders renderizados, dispara update, restaura padrão
- `StudioStatusBar`: dimensões formatadas em mm
- Viewport: mock do Canvas R3F (jsdom sem WebGL); `SampleSolid` testado por
  props

## Performance

- React.lazy + Suspense em /studio (three.js fora do bundle inicial)
- Geometria recriada apenas quando parâmetros mudam
- React.memo onde apropriado

## Acessibilidade

- Sliders com Label/SliderField do Amplify UI
- Toolbar com aria-pressed na ferramenta ativa
- Viewport com role="img" + aria-label descritivo
- Contraste no tema escuro

## Fora de escopo

- Geração CadQuery real
- Exportar STL funcional
- Salvar projeto (persistência)
- Autenticação (próximo ciclo: Authenticator + sandbox AWS)

## Definition of Done

- Build sem erros
- Testes passando
- Lint limpo
- TS strict sem `any`
- Bundle da landing sem three.js (chunk separado no vite build)
- Documentação: `docs/frontend/studio.md`
- Sem código morto
