# Notifications

# Objetivo

Este documento define as regras do módulo de notificações do projeto 3DFormio.

O módulo Notifications é responsável por entregar comunicações aos usuários e sistemas externos de forma confiável, assíncrona e rastreável.

Toda notificação deve ser orientada a eventos, desacoplada das regras de negócio e preparada para múltiplos canais de comunicação.

---

# Filosofia

Notifications entrega mensagens.

Notifications não executa regras de negócio.

Notifications não altera o estado do domínio.

Notifications apenas comunica eventos.

---

# Objetivos

Garantir

Confiabilidade

Escalabilidade

Baixa latência

Auditabilidade

Reprocessamento

Baixo acoplamento

Entrega multicanal

---

# Conceitos

Notification

Message

Channel

Template

Recipient

Preference

Event

Delivery

Retry

Provider

Queue

---

# Responsabilidades

Receber eventos.

Criar notificações.

Selecionar canais.

Renderizar templates.

Enviar mensagens.

Registrar entregas.

Executar retries.

Publicar métricas.

---

# Canais

E-mail

Push Notification

SMS

Webhook

In-App

Discord

Telegram

Slack

WhatsApp

Novos canais devem ser adicionados sem alterar o domínio.

---

# Fluxo Oficial

Evento

↓

Notifications

↓

Template

↓

Canal

↓

Provider

↓

Entrega

↓

Auditoria

↓

Métricas

---

# Eventos de Origem

Authentication

Authorization

Projects

Generation

Downloads

Billing

Payments

Subscription

Credits

Affiliates

Storage

Administration

---

# Entidade Notification

Toda notificação deve possuir

NotificationId

EventId

UserId

TemplateId

Channel

Provider

Priority

Status

Language

CreatedAt

UpdatedAt

---

# Entidade Delivery

Toda entrega deve possuir

DeliveryId

NotificationId

ProviderMessageId

Status

Attempts

SentAt

DeliveredAt

FailedAt

CreatedAt

---

# Entidade Template

Todo template deve possuir

TemplateId

Name

Channel

Language

Version

Status

CreatedAt

UpdatedAt

---

# Estados

CREATED

QUEUED

PROCESSING

SENT

DELIVERED

FAILED

CANCELED

EXPIRED

---

# Máquina de Estados

CREATED

↓

QUEUED

↓

PROCESSING

↓

SENT

↓

DELIVERED

Falhas podem ocorrer em qualquer etapa.

Nunca permitir transições inválidas.

---

# Prioridade

LOW

NORMAL

HIGH

CRITICAL

A prioridade deve influenciar apenas a ordem de processamento.

---

# Templates

Toda mensagem deve utilizar template.

Nunca construir mensagens diretamente no código.

---

# Versionamento

Templates devem possuir versão.

Alterações nunca devem sobrescrever versões utilizadas anteriormente.

---

# Idiomas

O sistema deve suportar múltiplos idiomas.

Selecionar idioma conforme preferência do usuário.

Utilizar idioma padrão quando necessário.

---

# Preferências

Cada usuário pode configurar

Canais habilitados.

Idioma.

Horários permitidos.

Categorias.

Silenciamento.

---

# Categorias

Sistema

Segurança

Financeiro

Assinatura

Projetos

Geração

Downloads

Marketing

Promoções

Administrativo

---

# Notificações Obrigatórias

Notificações relacionadas à

Segurança

Autenticação

Pagamentos

Assinaturas

Nunca podem ser desabilitadas quando exigidas por requisitos legais ou de segurança.

---

# Notificações Opcionais

Marketing.

Campanhas.

Promoções.

Novidades.

Podem ser desativadas pelo usuário.

---

# Entrega

Toda entrega deve registrar

Canal

Provider

Status

Tentativas

Tempo

Resposta do provedor

---

# Retry

Toda falha temporária deve permitir reprocessamento.

Aplicar Backoff Exponencial.

Limitar quantidade máxima de tentativas.

---

# Dead Letter Queue

Após exceder o número máximo de tentativas

Mover para Dead Letter Queue.

Registrar auditoria.

Gerar alerta operacional.

---

# Idempotência

Uma mesma notificação nunca deve ser enviada duas vezes para o mesmo destinatário por erro de processamento.

Toda operação deve ser idempotente.

---

# Agendamento

Permitir envio

Imediato.

Agendado.

Recorrente.

Condicional.

---

# Cancelamento

Permitir cancelamento enquanto a entrega ainda não foi iniciada.

Registrar histórico.

Publicar evento.

---

# Expiração

Notificações podem possuir tempo máximo de validade.

Após expiração

Cancelar entrega.

Registrar auditoria.

---

# Segurança

Nunca incluir

Senhas.

Tokens.

Credenciais.

Dados financeiros sensíveis.

Informações pessoais desnecessárias.

---

# Webhooks

Permitir notificações para sistemas externos.

Validar assinaturas.

Registrar respostas.

Aplicar Retry.

---

# E-mail

Suportar

HTML

Texto simples

Anexos

Templates responsivos

---

# Push

Suportar

Android

iOS

Web Push

---

# SMS

Utilizar apenas para

Segurança.

Autenticação.

Eventos críticos.

---

# In-App

Permitir histórico.

Marcação como lida.

Agrupamento.

Arquivamento.

---

# Performance

Toda entrega deve ser assíncrona.

Nunca bloquear operações da aplicação aguardando envio.

---

# Escalabilidade

Permitir milhões de notificações.

Permitir múltiplos workers.

Nunca depender de memória compartilhada.

---

# Auditoria

Registrar

NotificationId

DeliveryId

EventId

UserId

Canal

Provider

Status

RequestId

Timestamp

---

# Eventos

NotificationCreated

NotificationQueued

NotificationSent

NotificationDelivered

NotificationFailed

NotificationCanceled

NotificationExpired

NotificationRetried

PreferenceUpdated

TemplatePublished

---

# Integração com Authentication

Enviar

Confirmação de e-mail.

Recuperação de senha.

Login suspeito.

MFA.

---

# Integração com Authorization

Enviar alertas de

Acesso negado.

Mudança de permissões.

Ações administrativas.

---

# Integração com Generation

Enviar

Início da geração.

Conclusão.

Falha.

Timeout.

---

# Integração com Downloads

Enviar notificações quando

Arquivos estiverem disponíveis.

Links expirarem.

Downloads em lote forem concluídos.

---

# Integração com Payments

Enviar

Pagamento iniciado.

Pagamento aprovado.

Pagamento recusado.

Estorno.

---

# Integração com Subscription

Enviar

Renovação.

Expiração.

Cancelamento.

Mudança de plano.

Período de carência.

---

# Integração com Credits

Enviar

Saldo baixo.

Créditos adicionados.

Créditos expirando.

Créditos expirados.

---

# Integração com Affiliates

Enviar

Conversão confirmada.

Recompensa liberada.

Campanha encerrada.

---

# Integração com Storage

Enviar alertas quando

Uploads falharem.

Arquivos forem removidos.

Artefatos expirarem.

---

# Integração com Observability

Publicar métricas de

Fila.

Tempo de entrega.

Falhas.

Retries.

Latência.

---

# Logs

Registrar

NotificationId

Channel

Provider

Status

Attempts

Tempo

RequestId

Nunca registrar conteúdo sensível.

---

# Métricas

Notificações criadas

Notificações entregues

Falhas

Retries

Tempo médio de entrega

Entregas por canal

Taxa de sucesso

Dead Letter Queue

---

# Modelagem DynamoDB

Partition Key

NotificationId

Sort Key

DeliveryId

Criar índices para

UserId

Status

Channel

CreatedAt

---

# Anti-Padrões

Nunca enviar notificações diretamente dos módulos de domínio.

Nunca bloquear requisições aguardando envio.

Nunca construir mensagens diretamente no código.

Nunca ignorar falhas de entrega.

Nunca reenviar mensagens sem idempotência.

Nunca armazenar credenciais em templates.

Nunca misturar lógica de negócio com lógica de comunicação.

---

# Regras de Negócio

Toda notificação nasce de um evento.

Toda entrega gera auditoria.

Todo template é versionado.

Toda falha pode ser reprocessada.

Toda entrega publica métricas.

Toda comunicação é assíncrona.

---

# Checklist

Antes de finalizar

✓ Templates implementados

✓ Processamento assíncrono

✓ Retry configurado

✓ Dead Letter Queue implementada

✓ Auditoria registrada

✓ Eventos publicados

✓ Métricas implementadas

✓ Preferências respeitadas

✓ Testes implementados

✓ Documentação atualizada

---

# Definition of Done

Uma funcionalidade relacionada às notificações somente está pronta quando

✓ É orientada a eventos

✓ Utiliza templates versionados

✓ Suporta múltiplos canais

✓ Implementa Retry

✓ Possui Dead Letter Queue

✓ Mantém auditoria

✓ Publica métricas

✓ Está documentada

✓ Está testada

✓ Compatível com arquitetura Serverless

---

# Regras para o OpenCode

Sempre tratar o módulo Notifications como responsável exclusivamente pela entrega de comunicações.

Nunca permitir que módulos de domínio enviem e-mails, SMS ou Push diretamente.

Sempre iniciar notificações a partir de eventos de domínio publicados pela aplicação.

Toda entrega deve ser assíncrona, idempotente, auditável e resiliente a falhas temporárias.

Utilizar templates versionados para todo conteúdo enviado e respeitar as preferências de comunicação configuradas pelo usuário.

O módulo Notifications deve permanecer desacoplado das regras de negócio, comunicando-se apenas por eventos e contratos bem definidos.

Toda comunicação do 3DFormio deve ser segura, rastreável, escalável, multicanal e preparada para operar em larga escala com alta disponibilidade.
