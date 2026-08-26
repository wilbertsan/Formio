# 3DFormio

SaaS de geração de modelos 3D paramétricos para impressão, inspirado no Confeitaria3D.

## Stack

Frontend: React 19, Vite, TypeScript (strict), TailwindCSS 4, ThreeJS, React Three Fiber, Zod, Amplify UI
Backend: Python 3.12, FastAPI, CadQuery, Pydantic
Infra: Amplify Gen2, Cognito, API Gateway, Lambda Container, S3, DynamoDB, CloudFront
Testes: Vitest (frontend), Pytest (backend)
CI/CD: GitHub Actions, Amplify Hosting

## Regras Universais

- Commits semânticos: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `perf:`, `ci:`
- TS strict, sem `any`, sempre tipar funções e retorno
- Nunca expor secrets ou credenciais fixas
- Sempre validar entrada (Zod no frontend, Pydantic no backend)
- Nunca deixar TODO, hack ou código morto
- Preferir simplicidade sobre engenhosidade

## Definition of Done

Compilando • Testes passando • Lint sem erros • Tipagem válida • Sem warnings • Docs atualizadas • Sem código morto

## Tabela de Rotas

Ao trabalhar em, leia o AGENTS.md do segmento:

| Segmento | Caminho |
|---|---|
| Landing page | `src/features/landing/AGENTS.md` |
| Cadastro / auth | `src/features/cadastro/AGENTS.md` |
| Studio 3D (shell) | `src/features/studio/AGENTS.md` |
| Ferramenta: confeitaria | `src/features/studio/tools/confeitaria/AGENTS.md` |
| Ferramenta: chaveiros | `src/features/studio/tools/chaveiros/AGENTS.md` |
| Ferramenta: letreiros | `src/features/studio/tools/letreiros/AGENTS.md` |
| Backend / banco | `amplify/AGENTS.md` |

Regra: ao alterar um segmento, leia APENAS o AGENTS.md daquele segmento + este arquivo. Não leia os demais.
