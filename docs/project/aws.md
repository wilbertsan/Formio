# AWS

# Objetivo

Este documento define a arquitetura oficial da AWS para o projeto 3DFormio.

Toda implementação deve priorizar:

- Serverless
- Escalabilidade
- Baixo custo
- Segurança
- Simplicidade
- Alta disponibilidade

Nunca utilizar serviços que aumentem o custo sem necessidade.

---

# Arquitetura

Frontend

↓

AWS Amplify Hosting

↓

CloudFront

↓

API Gateway

↓

Lambda Container

↓

CadQuery

↓

S3

↓

DynamoDB

---

# Serviços Oficiais

Frontend

AWS Amplify Gen2

Backend

AWS Lambda

Autenticação

Amazon Cognito

Banco

Amazon DynamoDB

Arquivos

Amazon S3

Distribuição

Amazon CloudFront

API

Amazon API Gateway

Monitoramento

CloudWatch

Tracing

AWS X-Ray

Segredos

Secrets Manager

Logs

CloudWatch Logs

DNS

Route53

---

# Filosofia

Sempre utilizar serviços gerenciados.

Nunca administrar servidores.

Nunca utilizar EC2.

Nunca instalar software manualmente.

Toda infraestrutura deve ser reproduzível.

---

# Amplify

Responsável por

Frontend

Deploy

Hospedagem

Autenticação

Integração AWS

Nunca colocar lógica pesada no Amplify.

---

# Lambda

Toda regra de negócio roda na Lambda.

A Lambda deve ser stateless.

Nunca depender de arquivos locais.

Nunca armazenar estado.

Todo processamento deve ser independente.

---

# Container

Utilizar Docker Multi Stage.

Imagem mínima possível.

Objetivo

menos de

700 MB

Nunca instalar ferramentas desnecessárias.

Remover cache do pip.

Copiar apenas runtime.

---

# API Gateway

Toda comunicação externa passa pelo API Gateway.

Nunca expor Lambda diretamente.

Utilizar

HTTPS

JWT

CORS

Rate Limit

---

# Cognito

Responsável por

Cadastro

Login

JWT

Refresh Token

Recuperação de senha

Nunca implementar autenticação própria.

---

# DynamoDB

Banco oficial.

Modelagem baseada em acesso.

Nunca pensar como banco relacional.

Preferir

Partition Key

Sort Key

GSI

Evitar Scan.

Priorizar Query.

---

# S3

Responsável por

STL

Preview

Uploads

Imagens

Arquivos temporários

Nunca deixar arquivos públicos.

Utilizar URLs temporárias.

---

# CloudFront

Distribuição

Cache

Compressão

HTTPS

Baixa latência

Todo acesso ao frontend deve passar pelo CloudFront.

---

# CloudWatch

Guardar

Logs

Métricas

Alarmes

Nunca utilizar print().

Sempre utilizar logs estruturados.

---

# X-Ray

Utilizar tracing.

Toda requisição deve possuir rastreabilidade.

---

# IAM

Princípio do menor privilégio.

Cada serviço possui apenas as permissões necessárias.

Nunca utilizar AdministratorAccess.

---

# Secrets

Todos os segredos ficam no Secrets Manager.

Nunca colocar

Senha

Token

API Key

no código.

---

# Variáveis

Utilizar

Environment Variables

Nunca hardcode.

---

# Região

Toda infraestrutura deve utilizar uma única região principal.

Evitar comunicação entre regiões.

---

# CDN

Todo conteúdo estático deve utilizar cache.

HTML

Cache curto.

JS

Cache longo.

CSS

Cache longo.

Imagens

Cache longo.

STL

URLs assinadas.

---

# Upload

Fluxo

Frontend

↓

URL assinada

↓

Upload direto para S3

↓

Confirmação

Nunca enviar arquivos através da Lambda.

---

# Download

Fluxo

Usuário autenticado

↓

API

↓

Validação

↓

URL assinada

↓

Download

---

# Segurança

HTTPS obrigatório.

JWT obrigatório.

Rate Limit.

Validação de entrada.

CORS restritivo.

---

# Performance

Sempre reduzir

Cold Start

Latência

Número de chamadas

Tamanho das respostas

---

# Custos

Priorizar Free Tier.

Evitar serviços com cobrança contínua.

Desligar recursos não utilizados.

Remover versões antigas.

Evitar armazenamento desnecessário.

---

# Escalabilidade

Toda arquitetura deve escalar automaticamente.

Nunca depender de servidor fixo.

Nunca depender de sessão.

---

# Observabilidade

Toda requisição deve possuir

RequestId

UserId

Tempo

Endpoint

Status

---

# Deploy

GitHub

↓

GitHub Actions

↓

Amplify

↓

Deploy

Nunca realizar deploy manual.

---

# Versionamento

Frontend

Deploy automático.

Backend

Versionado.

Infraestrutura

Versionada.

---

# Monitoramento

Criar alarmes para

Erro Lambda

Timeout

5XX

Uso excessivo

Falhas Cognito

---

# Timeout

Lambda

Tempo mínimo necessário.

Nunca deixar timeout alto sem motivo.

---

# Retry

Operações críticas devem possuir retry.

Operações idempotentes.

---

# S3

Organização

users/

projects/

preview/

stl/

temp/

logs/

---

# DynamoDB

Tabelas

Users

Projects

Models

Generations

Subscriptions

Credits

AffiliateClicks

Downloads

---

# CloudFront

Distribuir

Frontend

Preview

Imagens

Arquivos públicos

Nunca distribuir arquivos privados diretamente.

---

# Logs

Sempre registrar

Início

Fim

Erro

Tempo

Usuário

Projeto

---

# Backups

Ativar versionamento do S3.

Backup contínuo do DynamoDB.

---

# Infraestrutura

Toda infraestrutura deve ser criada como código.

Nunca criar recursos manualmente no Console.

---

# Qualidade

Toda alteração deve considerar

Segurança

Performance

Escalabilidade

Custo

Manutenção

---

# Definition of Done

Uma implementação AWS somente está pronta quando

✓ Serverless

✓ Segura

✓ Escalável

✓ Baixo custo

✓ Observável

✓ Documentada

✓ Automatizada

✓ Sem permissões excessivas

✓ Logs configurados

✓ Alarmes criados

---

# Regras para o OpenCode

Sempre priorizar serviços serverless.

Sempre reduzir custo.

Sempre utilizar recursos gerenciados.

Sempre pensar em milhares de usuários.

Nunca criar infraestrutura desnecessária.

Toda decisão deve equilibrar

Performance

Escalabilidade

Segurança

Baixo custo

Facilidade de manutenção.

A arquitetura oficial do 3DFormio deve permanecer simples, moderna e preparada para crescer sem reescritas significativas.
