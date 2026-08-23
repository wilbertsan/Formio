# 3DFormio

SaaS de geração de modelos 3D paramétricos para impressão, inspirado no fluxo do
Confeitaria3D. Escolha parâmetros, visualize e baixe STL prontos para impressão.

## Stack

- **Frontend:** React 19, Vite, TypeScript (strict), TailwindCSS 4, Amplify UI, React Router
- **Backend:** Amplify Gen2 (Cognito, Lambda Container, API Gateway, S3, DynamoDB)
- **Qualidade:** Vitest, Testing Library, ESLint, GitHub Actions

## Desenvolvimento

```bash
npm install        # instala dependências
npm run dev        # servidor de desenvolvimento
npm run test       # testes (Vitest)
npm run lint       # lint
npm run typecheck  # typecheck do frontend
npm run build      # build de produção
```

Backend Amplify Gen2 (exige credenciais AWS):

```bash
npx ampx sandbox   # ambiente de desenvolvimento
```

## Estrutura

```
amplify/                      # Backend Amplify Gen2 (auth Cognito)
src/
  app/                        # App, roteamento, providers, páginas da aplicação
  features/landing/           # Feature da landing page (components + config)
  theme/                      # Tema custom do Amplify UI
tests/                        # Testes (espelham a estrutura de src)
docs/                         # Documentação do projeto
```

## Documentação

- Visão: `docs/project/vision.md`
- Arquitetura: `docs/project/architecture.md`
- Landing page: `docs/frontend/landing.md`
- Planos e designs: `docs/plans/`
