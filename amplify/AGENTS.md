# Backend / Banco (Amplify)

## Escopo

Backend do 3DFormio via AWS Amplify Gen2.

## Status atual

Apenas autenticação Cognito implementada (`defineAuth` com login por e-mail).
Não existem data models, storage, functions ou API configurados.

## Stack

- Amplify Gen2 (`@aws-amplify/backend`)
- Cognito (user pools, JWT)
- Futuro: DynamoDB, S3, API Gateway, Lambda Container, FastAPI

## Comandos

- `npx ampx sandbox` — ambiente de desenvolvimento
- `npm run typecheck:amplify` — typecheck do código Amplify
- `npm run typecheck` — typecheck do frontend

## Regras

- DynamoDB: modelagem orientada a acesso, sem simulação relacional, evitar scans
- Lambda: stateless, Docker multi-stage, imagem mínima
- API: REST, retornar `{ status, message, data, errors }`, nunca expor exceções
- Segurança: IAM mínimo, JWT válido, rate limiting, sanitização de entrada
- Observabilidade: CloudWatch, logs estruturados, X-Ray, sem `print()`
- Nunca expor secrets ou credenciais fixas

## Estrutura (futura)

```
amplify/
  auth/resource.ts        # Cognito (implementado)
  data/resource.ts        # DynamoDB models (futuro)
  storage/resource.ts     # S3 (futuro)
  functions/              # Lambda containers (futuro)
```

## Fora de escopo

Frontend, landing, studio, ferramentas de geração.
