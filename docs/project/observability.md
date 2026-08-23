# Observability

# Objetivo

Este documento define as regras do módulo de observabilidade do projeto 3DFormio.

O módulo Observability é responsável por fornecer visibilidade completa sobre o comportamento da plataforma em produção.

Toda operação deve ser monitorada, rastreada, registrada e mensurada.

A observabilidade deve permitir identificar problemas antes que impactem os usuários.

---

# Filosofia

Não é possível operar o que não pode ser observado.

Logs mostram o que aconteceu.

Métricas mostram o comportamento.

Traces mostram o caminho da requisição.

Eventos mostram mudanças de estado.

Esses conceitos são complementares.

---

# Objetivos

Garantir

Visibilidade

Diagnóstico rápido

Auditoria

Monitoramento contínuo

Detecção de falhas

Análise de performance

Redução do MTTR

Escalabilidade operacional

---

# Princípios

Toda operação deve produzir logs.

Toda operação crítica deve gerar métricas.

Toda requisição distribuída deve possuir Trace.

Todo erro deve ser rastreável.

Toda exceção deve possuir contexto.

Nunca depender exclusivamente de logs para diagnosticar problemas.

---

# Serviços Oficiais

Amazon CloudWatch

AWS X-Ray

Amazon EventBridge

Amazon SNS

AWS Lambda Insights

Amazon CloudWatch Logs Insights

Amazon CloudWatch Alarms

---

# Conceitos

Log

Metric

Trace

Span

CorrelationId

RequestId

Event

Alarm

Dashboard

Health Check

---

# Responsabilidades

Registrar logs.

Coletar métricas.

Gerar traces.

Detectar falhas.

Emitir eventos.

Criar alarmes.

Disponibilizar dashboards.

Registrar auditoria técnica.

---

# Fluxo Oficial

Requisição

↓

RequestId

↓

Trace

↓

Logs

↓

Métricas

↓

Evento

↓

Dashboard

↓

Alarme

↓

Operação

---

# Logs

Todo log deve possuir

Timestamp

Level

Service

Module

RequestId

TraceId

UserId quando disponível

Operation

Duration

Environment

Version

Message

---

# Níveis de Log

DEBUG

INFO

WARN

ERROR

FATAL

Cada nível deve possuir finalidade específica.

---

# DEBUG

Utilizado apenas durante desenvolvimento.

Nunca habilitar permanentemente em produção.

---

# INFO

Registrar operações normais.

Login.

Download.

Geração.

Upload.

Conclusão de processos.

---

# WARN

Registrar comportamentos inesperados.

Rate Limit.

Retry.

Timeout parcial.

Falhas recuperáveis.

---

# ERROR

Registrar falhas que impedem a conclusão da operação.

Toda exceção deve gerar ERROR.

---

# FATAL

Registrar falhas críticas que comprometem o funcionamento do serviço.

Deve gerar alerta imediato.

---

# Estrutura dos Logs

Todos os logs devem utilizar formato estruturado.

Preferencialmente JSON.

Nunca utilizar logs livres sem contexto.

---

# Informações Proibidas

Nunca registrar

Senha

Token

Refresh Token

JWT completo

Cartão

CVV

Segredos

Credenciais

Dados pessoais sensíveis

---

# Correlação

Toda requisição deve possuir

RequestId

CorrelationId

TraceId

Esses identificadores devem acompanhar toda a execução.

---

# Tracing

Toda chamada distribuída deve ser rastreada.

Frontend

↓

API Gateway

↓

Lambda

↓

CadQuery

↓

S3

↓

DynamoDB

↓

Resposta

---

# Spans

Cada operação relevante deve possuir Span próprio.

Exemplos

Autenticação

Consulta

Validação

Modelagem

Exportação

Upload

Download

Persistência

---

# Métricas

Registrar

Quantidade

Tempo

Latência

Taxa de erro

Disponibilidade

Uso de memória

Uso de CPU

Tempo de geração

Downloads

Uploads

---

# Métricas de Negócio

Usuários ativos

Projetos criados

Modelos gerados

Downloads

Consumo de créditos

Conversão para Premium

Cancelamentos

Receita

---

# Métricas Técnicas

Tempo de resposta

Lambda Duration

Lambda Errors

Lambda Cold Starts

Throttle

Timeouts

Retries

Uso do DynamoDB

Uso do S3

CloudFront Hit Ratio

---

# Dashboards

Criar dashboards para

Infraestrutura

Backend

Frontend

Generation

CadQuery

Billing

Downloads

Storage

Authentication

Subscription

---

# Alarmes

Criar alarmes para

Erro elevado.

Timeout elevado.

Latência elevada.

Falha de autenticação.

Falha na geração.

Fila crescente.

Uso elevado de memória.

Falhas de upload.

Falhas de download.

---

# Alertas

Os alertas devem possuir

Severidade

Origem

Descrição

Impacto

Ação recomendada

Timestamp

---

# Health Checks

Todos os serviços críticos devem possuir endpoint de saúde.

Verificar

Disponibilidade

Dependências

Banco

Storage

Fila

---

# Eventos

Todo evento relevante deve ser publicado.

Exemplos

GenerationCompleted

GenerationFailed

DownloadCompleted

SubscriptionRenewed

CreditsConsumed

PaymentApproved

UserRegistered

---

# Auditoria Técnica

Registrar

RequestId

TraceId

Service

Operation

Duration

Status

Environment

Version

Timestamp

---

# Observabilidade da Lambda

Registrar

Cold Start

Memory Usage

Execution Time

Invocations

Errors

Retries

Timeouts

---

# Observabilidade do DynamoDB

Monitorar

Latency

Read Capacity

Write Capacity

Throttling

Errors

---

# Observabilidade do S3

Monitorar

Uploads

Downloads

Failures

Storage Size

Object Count

---

# Observabilidade do CloudFront

Monitorar

Cache Hit Ratio

Requests

Bandwidth

Errors

Latency

---

# Observabilidade do CadQuery

Registrar

Tempo de modelagem

Operações booleanas

Tempo de exportação

Falhas

Uso de memória

Modelo utilizado

---

# Performance

Toda operação deve medir

Início

Fim

Tempo total

Nunca estimar tempos.

Sempre utilizar medições reais.

---

# Retenção

Definir política de retenção para

Logs

Métricas

Traces

Eventos

Auditoria

Cada categoria deve possuir ciclo de vida apropriado.

---

# Ambientes

Separar completamente

Development

Testing

Staging

Production

Nunca compartilhar dashboards entre ambientes.

---

# Segurança

Logs devem seguir princípio do menor privilégio.

Somente usuários autorizados podem acessar informações operacionais.

---

# Escalabilidade

A observabilidade deve crescer junto com a plataforma.

Nunca depender de servidores dedicados para coleta de métricas.

---

# Integração com Authentication

Registrar

Login

Logout

Falhas

MFA

Recuperação de senha

---

# Integração com Authorization

Registrar

Permissões concedidas.

Permissões negadas.

Tentativas de acesso.

---

# Integração com Generation

Registrar

Fila

Tempo

Modelo

Falhas

Exportação

Conclusão

---

# Integração com Storage

Registrar

Uploads

Downloads

Falhas

Objetos

Latência

---

# Integração com Billing

Registrar

Pagamentos

Falhas

Estornos

Renovações

---

# Integração com Subscription

Registrar

Assinaturas

Cancelamentos

Expirações

Renovações

---

# Integração com Credits

Registrar

Reservas

Consumo

Estornos

Saldo insuficiente

---

# Logs Estruturados

Exemplo de campos

Timestamp

Level

Service

Module

Operation

RequestId

TraceId

UserId

Duration

Status

ErrorCode

Message

---

# KPIs

Disponibilidade

Tempo médio de resposta

MTTR

MTBF

Taxa de erro

Cold Starts

Tempo médio de geração

Downloads por minuto

Uploads por minuto

---

# SLOs

Disponibilidade mínima

99.9%

Tempo médio de resposta da API

Inferior a 500 ms

Tempo médio para geração de modelos

Conforme complexidade do modelo

Falhas de geração

Inferiores a 1%

---

# Anti-Padrões

Nunca registrar dados sensíveis.

Nunca registrar logs sem contexto.

Nunca utilizar apenas logs para monitoramento.

Nunca ignorar falhas silenciosas.

Nunca criar alarmes sem ação definida.

Nunca utilizar níveis de log incorretos.

Nunca remover rastreamento distribuído.

Nunca deixar exceções sem registro.

---

# Regras de Negócio

Toda operação gera logs.

Toda operação crítica gera métricas.

Toda requisição possui TraceId.

Toda exceção gera ERROR.

Toda falha crítica gera alerta.

Todo evento relevante é registrado.

Toda auditoria é preservada.

---

# Checklist

Antes de finalizar

✓ Logs estruturados implementados

✓ Métricas publicadas

✓ Traces configurados

✓ Dashboards criados

✓ Alarmes configurados

✓ Health Checks implementados

✓ Eventos registrados

✓ Auditoria habilitada

✓ Testes realizados

✓ Documentação atualizada

---

# Definition of Done

Uma funcionalidade relacionada à observabilidade somente está pronta quando

✓ Gera logs estruturados

✓ Publica métricas

✓ Possui tracing distribuído

✓ Está integrada ao CloudWatch

✓ Está integrada ao AWS X-Ray

✓ Possui alarmes

✓ Possui dashboards

✓ Mantém auditoria

✓ Está documentada

✓ Está testada

---

# Regras para o OpenCode

Sempre implementar observabilidade desde o início do desenvolvimento, nunca como etapa posterior.

Toda nova funcionalidade deve produzir logs estruturados, métricas relevantes e traces distribuídos.

Nunca registrar informações sensíveis ou credenciais em qualquer mecanismo de observabilidade.

Sempre utilizar os serviços gerenciados da AWS, priorizando CloudWatch, X-Ray, Lambda Insights e CloudWatch Alarms para reduzir complexidade operacional.

O módulo Observability deve permanecer independente das regras de negócio, sendo responsável exclusivamente pela coleta, correlação, monitoramento, auditoria técnica e disponibilização das informações operacionais da plataforma.

Toda operação do 3DFormio deve ser completamente observável, permitindo identificar, diagnosticar e corrigir problemas rapidamente, mantendo alta disponibilidade, baixo tempo de recuperação e excelente experiência para os usuários.
