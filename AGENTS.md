# AGENTS.md

# Projeto

Nome: 3DFormio

Objetivo:

Construir um SaaS profissional de geração de modelos 3D para impressão,
inspirado no fluxo do Confeitaria3D, utilizando React, AWS Amplify Gen2,
Lambda Container e CadQuery.

O projeto deve priorizar:

- simplicidade
- escalabilidade
- baixo custo AWS
- código limpo
- alta performance
- excelente experiência do usuário

---

# Stack Oficial

Frontend

- React 19
- Vite
- Typescript
- TailwindCSS
- React Query
- React Hook Form
- Zod
- ThreeJS
- React Three Fiber
- AWS Amplify UI

Backend

- Python 3.12
- FastAPI
- Mangum
- CadQuery
- Pydantic
- Uvicorn

Infraestrutura

- AWS Amplify Gen2
- Cognito
- API Gateway
- Lambda Container
- S3
- DynamoDB
- CloudFront
- CloudWatch
- X-Ray
- Secrets Manager

CI/CD

- GitHub Actions
- Amplify Hosting

---

# Filosofia

Sempre escrever código para produção.

Nunca criar código temporário.

Nunca criar hacks.

Nunca deixar TODO.

Nunca comentar código morto.

Sempre preferir simplicidade.

Sempre pensar em manutenção futura.

---

# Arquitetura

Utilizar Clean Architecture.

API

↓

Application

↓

Domain

↓

Infrastructure

Nunca quebrar essa estrutura.

---

# Responsabilidade das Camadas

API

- recebe requests
- valida dados
- chama casos de uso

Nunca acessar banco.

Application

- casos de uso
- orquestra domínio

Nunca acessar HTTP.

Domain

- regras de negócio
- entidades
- value objects

Nunca depender de frameworks.

Infrastructure

- DynamoDB
- S3
- Cognito
- AWS SDK

Nunca conter regra de negócio.

---

# Frontend

Utilizar Feature First.

src/

app/

features/

components/

hooks/

services/

schemas/

types/

lib/

Nunca colocar toda lógica em pages.

Componentes devem possuir apenas responsabilidade visual.

---

# Backend

Organização

api/

application/

domain/

infrastructure/

repositories/

schemas/

services/

tests/

Nunca colocar lógica dentro das rotas.

---

# CadQuery

Toda geração deve produzir sólidos válidos.

Sempre gerar STL manifold.

Evitar operações booleanas desnecessárias.

Preferir operações simples.

Minimizar tempo de geração.

Evitar loops pesados.

Sempre validar parâmetros.

---

# Lambda

Objetivo

Cold Start mínimo.

Utilizar Docker Multi Stage.

Nunca instalar dependências desnecessárias.

Remover cache do pip.

Remover compiladores da imagem final.

Copiar apenas bibliotecas necessárias.

Imagem final deve ser a menor possível.

---

# AWS

Sempre utilizar serviços serverless.

Priorizar:

Lambda

S3

DynamoDB

CloudFront

Cognito

Evitar EC2.

Evitar serviços permanentes quando houver alternativa serverless.

---

# API

Seguir REST.

Sempre retornar:

status

message

data

errors

Nunca retornar exceções internas.

---

# Banco

Utilizar DynamoDB.

Modelagem orientada a acesso.

Nunca simular banco relacional.

Evitar scans.

Priorizar queries.

---

# Segurança

Nunca expor Secrets.

Nunca utilizar credenciais fixas.

Utilizar IAM mínimo.

Validar JWT.

Validar entrada.

Sanitizar parâmetros.

Aplicar Rate Limit.

---

# Performance

Lazy Loading.

Code Splitting.

Compressão.

Cache.

CloudFront.

Paginação.

Uploads diretos para S3.

---

# React

Sempre utilizar

React Query

React Hook Form

Zod

Nunca utilizar estado global desnecessariamente.

Evitar prop drilling.

Preferir composição.

---

# Typescript

Strict Mode obrigatório.

Nunca utilizar any.

Sempre tipar funções.

Sempre tipar retorno.

---

# Python

Typing obrigatório.

Utilizar dataclasses quando fizer sentido.

Utilizar Pydantic para entrada.

Seguir PEP8.

---

# Testes

Frontend

Vitest

Backend

Pytest

Toda feature nova deve possuir testes.

---

# Observabilidade

Utilizar

CloudWatch

Logs estruturados

X-Ray

Nunca utilizar print().

---

# Git

Commits semânticos.

Exemplos

feat:

fix:

refactor:

docs:

test:

perf:

ci:

---

# Documentação

Toda alteração importante deve atualizar

README

docs

OpenAPI

ADR

---

# Definition of Done

Uma tarefa somente é concluída quando:

✓ Código compilando

✓ Testes passando

✓ Lint sem erros

✓ Tipagem válida

✓ Sem warnings

✓ Documentação atualizada

✓ Sem código morto

✓ Sem duplicação

✓ Performance revisada

✓ Segurança revisada

---

# Fluxo de Desenvolvimento

1 Planejar

2 Definir arquitetura

3 Criar contratos

4 Implementar backend

5 Criar testes

6 Implementar frontend

7 Integrar

8 Testar

9 Documentar

10 Revisar

---

# Regras para o OpenCode

Antes de alterar qualquer arquivo:

Leia README.

Leia docs/.

Entenda a arquitetura.

Nunca alterar arquivos fora do escopo solicitado.

Nunca fazer refatorações não solicitadas.

Sempre preservar compatibilidade.

Sempre sugerir melhorias ao final.

Quando houver dúvida sobre arquitetura,
priorizar simplicidade, escalabilidade
e menor custo na AWS.

Você é responsável por manter este projeto
como um SaaS profissional, preparado para
milhares de usuários, mantendo código limpo,
baixo custo operacional e excelente experiência
para desenvolvedores e usuários finais.
