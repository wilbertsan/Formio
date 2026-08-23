# Design — Landing Page 3DFormio

Data: 2026-08-23
Status: Aprovado
Escopo: Frontend — landing page com Amplify Gen2

## Contexto

Primeira entrega do projeto 3DFormio (greenfield). O roadmap define a landing como
porta de entrada do fluxo: Landing → Cadastro → Pagamento. A execução será feita
por um agente especializado em AWS Amplify; este documento e o plano de
implementação guiam essa execução.

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Abordagem | Amplify Gen2 padrão + Amplify UI | Stack oficial; Cognito pronto para o Sprint 1; base padrão para o agente Amplify |
| Hero | Visual estático leve (imagem WebP + animação CSS) | Zero WebGL, bundle mínimo, performance da landing |
| Preços | 3 planos com valores em config | Fácil troca sem tocar em JSX; valores ainda não definidos no negócio |
| Idioma | PT-BR | Público-alvo do projeto (referência Confeitaria3D, meios de pagamento BR) |

## Arquitetura

Stack: Vite + React 19 + TypeScript (strict) + TailwindCSS (utilitários) +
Amplify UI (componentes tematizados) + Amplify Gen2 (`amplify/` com Cognito via
`defineAuth`, hosting CI/CD).

```
/
├── amplify/                    # Amplify Gen2 (auth Cognito + backend.ts)
├── src/
│   ├── app/                    # App.tsx, roteamento, providers
│   ├── features/
│   │   └── landing/
│   │       ├── components/     # Hero, PricingSection, FaqSection, Footer, Navbar
│   │       └── config/         # plans.ts (3 planos), faq.ts (perguntas)
│   ├── components/             # Primitives compartilhados
│   ├── theme/                  # tema Amplify UI custom (index.ts)
│   ├── lib/                    # Amplify configure, utils
│   └── main.tsx
├── tests/                      # Vitest (setup + testes de feature)
└── package.json
```

Regras:

- Componentes apenas visuais; dados de planos/FAQ em arquivos de config.
- React Router com rota `/` (landing). CTAs apontam para `/cadastro`
  (placeholder "em breve" para evitar 404).
- Sem Three.js na landing.
- `ThemeProvider` do Amplify UI no topo, `colorMode="system"`, tema custom
  centralizado em `src/theme/` conforme docs/ui/theme.md.

## Página (PT-BR)

### Navbar
Fixa e leve. Logo "3DFormio", links âncora (Preços, FAQ), botão "Criar conta"
→ `/cadastro`.

### Hero
- Headline: "Modelos 3D personalizados em segundos"
- Subtítulo: "Ajuste parâmetros, visualize e baixe STL prontos para impressão —
  sem instalar nada."
- CTA primário "Começar grátis" → `/cadastro`
- CTA secundário "Ver preços" → âncora `#precos`
- Visual: imagem otimizada (WebP + fallback) de modelo gerado, com leve
  animação CSS (float/glow). Lazy loading, asset em `src/assets/`.

### Preços (`#precos`)
Três cartões (Amplify UI `Card`):

1. **Grátis** — trial, gerações limitadas — R$ 0
2. **Pro** — destaque "Mais popular" (badge), créditos mensais — R$ 29
3. **Business** — créditos maiores, suporte prioritário — R$ 89

Valores placeholder em `features/landing/config/plans.ts`, marcados como
configuráveis. CTA de cada plano → `/cadastro`.

### FAQ (`#faq`)
5–6 perguntas em Accordion (Amplify UI). Sugestões:

- Preciso instalar algo?
- Quais formatos de download?
- Posso cancelar quando quiser?
- O que são créditos?
- Os modelos são prontos para impressão?

Conteúdo em `config/faq.ts`.

### Footer
Logo, tagline, links (Preços, FAQ, Termos, Privacidade — placeholders de rota),
copyright.

### Acessibilidade
HTML semântico (`Heading` com níveis corretos), imagens com alt, foco visível
em CTAs, mobile-first nos breakpoints padrão do Amplify UI.

## Testes

Vitest + Testing Library:

- Unitários: `plans.ts` (3 planos, Pro em destaque, campos obrigatórios),
  `faq.ts` (perguntas/respostas não vazias).
- Componente: `PricingSection` (3 cartões, badge no Pro), `FaqSection`
  (Accordion expande/colapsa), `Hero` (CTAs com href corretos), `Navbar`
  (link "Criar conta").
- Sem testes E2E nesta fase.

## CI/CD

GitHub Actions em PR: ESLint, `tsc --noEmit`, `vitest run`, `vite build`.
Deploy via Amplify Hosting conectado ao repositório (branch `main`).

## Performance

- Bundle inicial mínimo: sem Three.js, sem React Query na landing.
- Code splitting por rota.
- Imagem do hero otimizada com lazy loading.

## Edge Cases

- Imagem do hero com fallback.
- Rota `/cadastro` placeholder renderiza página "em breve".

## Definition of Done (fase landing)

- Build sem erros
- Testes passando
- Lint limpo
- TS strict sem `any`
- Lighthouse ≥ 90 (performance e acessibilidade)
- Documentação da feature em `docs/frontend/`
- Sem código morto

## Fora de escopo

- Login/Cadastro (Sprint 1, agente Amplify)
- Pagamentos e planos reais
- Preview 3D interativo (Three.js/R3F)
- Backend de geração (CadQuery)
