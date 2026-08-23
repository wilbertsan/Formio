# Backend

# Objetivo

Este documento define os padrões oficiais do backend do projeto 3DFormio.

Todo código deve ser desenvolvido para produção.

O backend deve ser

- Escalável
- Testável
- Tipado
- Seguro
- Performático
- Serverless

Nunca desenvolver pensando apenas no funcionamento.

Sempre pensar na manutenção futura.

---

# Stack Oficial

Python 3.12

FastAPI

Mangum

Pydantic

CadQuery

Boto3

Pytest

Docker

AWS Lambda

---

# Filosofia

Código simples.

Código reutilizável.

Baixo acoplamento.

Alta coesão.

Responsabilidades bem definidas.

Nunca misturar camadas.

---

# Arquitetura

Clean Architecture

api

↓

application

↓

domain

↓

infrastructure

A dependência sempre aponta para o domínio.

---

# Estrutura

backend/

api/

application/

domain/

infrastructure/

repositories/

services/

schemas/

cad/

validators/

exceptions/

utils/

tests/

---

# API

Responsável por

Receber requisições

Validar entrada

Autenticar

Chamar casos de uso

Retornar resposta

Nunca conter regra de negócio.

---

# Application

Responsável por

Casos de uso

Orquestração

Fluxos

Regras de aplicação

Nunca acessar AWS diretamente.

---

# Domain

Responsável por

Entidades

Value Objects

Regras de negócio

Eventos

Nunca depender de frameworks.

---

# Infrastructure

Responsável por

DynamoDB

S3

Cognito

Secrets Manager

CloudWatch

AWS SDK

Nunca conter regra de negócio.

---

# Repositories

Toda persistência deve utilizar Repository Pattern.

Nunca acessar DynamoDB diretamente nos casos de uso.

---

# Services

Serviços representam integrações.

Exemplos

StorageService

GenerationService

CreditService

NotificationService

---

# Schemas

Todos os DTOs devem utilizar

Pydantic.

Nunca retornar objetos internos.

---

# Tipagem

Toda função deve possuir

Parâmetros tipados.

Retorno tipado.

Nunca utilizar any.

---

# Pydantic

Separar

Request

Response

Internal

Nunca reutilizar o mesmo schema para tudo.

---

# Validação

Toda entrada deve ser validada.

Nunca confiar em dados do frontend.

---

# Exceções

Criar exceções específicas.

Exemplos

ProjectNotFound

CreditLimitExceeded

InvalidParameter

GenerationFailed

UnauthorizedDownload

---

# Tratamento de Erros

Nunca retornar traceback.

Sempre retornar

status

message

errors

requestId

---

# Endpoints

Organização

/auth

/projects

/models

/generations

/downloads

/users

/subscriptions

/admin

---

# HTTP

GET

Consulta

POST

Criação

PUT

Atualização completa

PATCH

Atualização parcial

DELETE

Remoção

---

# Versionamento

Utilizar

/api/v1

Preparar estrutura para futuras versões.

---

# Autenticação

JWT Cognito.

Nunca criar autenticação própria.

Sempre validar token.

---

# Autorização

Toda ação deve validar permissões.

Usuário nunca acessa recursos de outro usuário.

---

# CadQuery

Toda geração deve ficar isolada.

Nunca misturar CadQuery com API.

Criar camada específica.

---

# Geração

Fluxo

Receber parâmetros

↓

Validar

↓

Gerar modelo

↓

Exportar STL

↓

Salvar S3

↓

Registrar banco

↓

Retornar resultado

---

# Arquivos

Nunca armazenar STL localmente.

Sempre utilizar S3.

Arquivos temporários devem ser removidos.

---

# Banco

Utilizar DynamoDB.

Nunca utilizar joins.

Modelagem baseada em acesso.

---

# Logs

Registrar

RequestId

UserId

Tempo

Erro

Projeto

Modelo

---

# Observabilidade

CloudWatch.

X-Ray.

Logs estruturados.

Nunca utilizar print().

---

# Performance

Evitar consultas repetidas.

Evitar processamento duplicado.

Minimizar memória.

Reduzir tempo de execução.

---

# Lambda

Cold Start mínimo.

Imagem otimizada.

Sem dependências desnecessárias.

---

# Segurança

Sanitizar entrada.

Validar parâmetros.

Nunca executar código enviado pelo usuário.

Nunca utilizar eval().

---

# Upload

Upload direto para S3.

Backend apenas gera URL assinada.

---

# Download

Sempre gerar URL temporária.

Nunca disponibilizar bucket público.

---

# Configuração

Toda configuração deve vir de

Environment Variables.

Nunca hardcode.

---

# Segredos

Utilizar

Secrets Manager.

Nunca armazenar senhas no código.

---

# Eventos

Criar eventos para

Usuário criado

Projeto criado

Geração iniciada

Geração concluída

Download realizado

Pagamento aprovado

---

# Idempotência

Operações críticas devem ser idempotentes.

Evitar duplicações.

---

# Concorrência

Backend deve suportar múltiplas gerações simultâneas.

Nunca depender de memória compartilhada.

---

# Timeout

Evitar operações longas.

Processos pesados devem ser assíncronos.

---

# Testes

Utilizar

Pytest.

Testar

Use Cases

Repositories

Services

Validators

API

CadQuery

---

# Cobertura

Priorizar testes de

Regras de negócio.

Fluxos críticos.

Validações.

---

# Qualidade

Black.

Ruff.

Mypy.

Pytest.

Todos obrigatórios.

---

# Documentação

Toda API deve possuir

OpenAPI.

Swagger.

Schemas completos.

---

# Organização

Um arquivo deve possuir apenas uma responsabilidade.

Classes pequenas.

Funções pequenas.

---

# Nomenclatura

Utilizar nomes explícitos.

Evitar abreviações.

Métodos devem representar ações.

---

# Código

Preferir composição.

Evitar herança desnecessária.

Evitar funções gigantes.

---

# Response

Padrão

status

message

data

errors

timestamp

requestId

---

# Definition of Done

Uma funcionalidade backend somente está pronta quando

✓ Tipada

✓ Testada

✓ Documentada

✓ Sem warnings

✓ Sem duplicação

✓ Logs implementados

✓ Segurança revisada

✓ Performance revisada

✓ Compatível com Clean Architecture

✓ Compatível com Lambda

---

# Regras para o OpenCode

Sempre respeitar a Clean Architecture.

Nunca misturar camadas.

Nunca acessar infraestrutura diretamente nos casos de uso.

Sempre utilizar tipagem completa.

Sempre validar entradas.

Sempre criar testes.

Sempre documentar endpoints.

Toda implementação deve ser preparada para milhares de usuários, mantendo baixo custo na AWS, alta performance e facilidade de manutenção.

O backend do 3DFormio deve permanecer desacoplado da infraestrutura, permitindo evolução sem necessidade de reescrita das regras de negócio.
