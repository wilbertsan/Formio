# Subscription

# Objetivo

Este documento define as regras de assinatura do projeto 3DFormio.

A assinatura controla o acesso do usuário aos recursos da plataforma.

Toda lógica relacionada a planos, renovação, cancelamento e permissões deve seguir este documento.

---

# Filosofia

A assinatura representa o contrato entre o usuário e a plataforma.

A assinatura nunca representa um pagamento.

Pagamentos geram eventos.

A assinatura representa o estado atual do acesso.

---

# Conceitos

Usuário

Plano

Assinatura

Renovação

Expiração

Upgrade

Downgrade

Trial

Cancelamento

Período de Carência

Webhook

---

# Objetivos

Garantir

Controle de acesso

Escalabilidade

Consistência

Auditoria

Segurança

Baixo acoplamento

---

# Entidade Subscription

Uma assinatura deve possuir

SubscriptionId

UserId

PlanId

Status

StartDate

RenewDate

ExpireDate

CancelDate

TrialEndDate

PaymentProvider

ExternalSubscriptionId

Currency

BillingCycle

CreatedAt

UpdatedAt

---

# Billing Cycle

Mensal

Trimestral

Semestral

Anual

A implementação deve permitir novos ciclos sem alterar as regras de negócio.

---

# Status

TRIAL

ACTIVE

PENDING

PAST_DUE

GRACE_PERIOD

CANCELED

EXPIRED

SUSPENDED

Somente ACTIVE e TRIAL concedem acesso à plataforma.

---

# Fluxo da Assinatura

Usuário cria conta

↓

Escolhe plano

↓

Pagamento aprovado

↓

Assinatura criada

↓

Acesso liberado

↓

Renovações sucessivas

↓

Cancelamento ou Expiração

---

# Trial

O Trial possui duração definida pelo plano.

Cada usuário pode utilizar apenas um Trial.

O Trial não deve ser reiniciado por troca de plano.

O Trial deve registrar data de início e término.

---

# Criação

Uma assinatura somente pode ser criada após confirmação do pagamento ou ativação de Trial.

Nunca criar assinatura apenas pela intenção de compra.

---

# Renovação

Na renovação

Atualizar ExpireDate.

Atualizar RenewDate.

Atualizar benefícios.

Adicionar créditos mensais quando aplicável.

Publicar evento.

Registrar auditoria.

---

# Renovação Antecipada

Caso o pagamento seja confirmado antes do vencimento

Manter continuidade da assinatura.

Nunca reduzir dias restantes.

---

# Período de Carência

Quando houver falha no pagamento

Entrar em GRACE_PERIOD.

Durante esse período

O usuário mantém acesso conforme política do plano.

Ao final do período

Migrar para EXPIRED.

---

# Cancelamento

O cancelamento interrompe futuras renovações.

Nunca remover acesso imediatamente.

A assinatura permanece ACTIVE até ExpireDate.

---

# Expiração

Ao expirar

Bloquear novas gerações.

Bloquear funcionalidades Premium.

Permitir acesso ao histórico.

Permitir acesso às configurações da conta.

Permitir nova assinatura.

---

# Suspensão

A suspensão pode ocorrer por

Fraude

Violação de termos

Chargeback

Determinação administrativa

Durante a suspensão

Todo acesso Premium deve ser bloqueado.

---

# Upgrade

Upgrade deve ocorrer imediatamente.

Atualizar

Plano

Permissões

Limites

Créditos conforme política de negócio.

Registrar histórico.

Publicar evento.

---

# Downgrade

O downgrade somente deve ser aplicado na próxima renovação.

Nunca remover benefícios imediatamente.

---

# Mudança de Plano

Toda alteração deve registrar

Plano anterior

Plano novo

Data

Usuário

Motivo

Origem

---

# Reativação

Uma assinatura cancelada pode ser reativada antes da expiração.

Após expiração

Uma nova assinatura deve ser criada.

---

# Assinaturas Simultâneas

Cada usuário pode possuir apenas uma assinatura ativa.

Nunca permitir duas assinaturas ACTIVE para o mesmo usuário.

---

# Permissões

Toda permissão deve ser derivada do plano.

Nunca cadastrar permissões diretamente na assinatura.

---

# Recursos Controlados

Quantidade de créditos

Quantidade de projetos

Downloads

Modelos Premium

Espaço de armazenamento

Funcionalidades experimentais

APIs disponíveis

---

# Validação

Toda requisição protegida deve validar

Existência da assinatura

Status

Plano

Permissões

Data de expiração

Nunca confiar apenas no token JWT.

---

# Eventos

SubscriptionCreated

SubscriptionActivated

SubscriptionRenewed

SubscriptionCanceled

SubscriptionExpired

SubscriptionReactivated

SubscriptionSuspended

SubscriptionDowngraded

SubscriptionUpgraded

PlanChanged

---

# Integração com Pagamentos

A assinatura nunca processa pagamentos.

Ela apenas reage aos eventos recebidos.

Exemplos

PaymentApproved

PaymentFailed

RefundProcessed

ChargebackReceived

---

# Integração com Créditos

A assinatura não controla saldo.

Ela apenas define

Quantidade inicial

Limites

Periodicidade de renovação

O gerenciamento do saldo pertence ao módulo Credits.

---

# Auditoria

Registrar

SubscriptionId

UserId

Evento

Plano

Status anterior

Status atual

Origem

RequestId

Timestamp

---

# Histórico

Todo evento deve permanecer armazenado.

Nunca sobrescrever informações históricas.

---

# Segurança

Nunca permitir alteração da assinatura pelo frontend.

Toda alteração deve ser validada pelo backend.

Nunca confiar em dados enviados pelo navegador.

---

# Idempotência

Webhooks podem ser enviados mais de uma vez.

Toda atualização deve ser idempotente.

Nunca criar duas assinaturas para o mesmo evento.

Nunca renovar duas vezes pela mesma confirmação.

---

# Performance

Consultar assinatura utilizando índices.

Evitar consultas repetidas.

Utilizar cache apenas para leitura.

Nunca armazenar estado em memória da aplicação.

---

# Consistência

Toda alteração de status deve gerar

Evento

Log

Auditoria

Atualização do histórico

---

# Regras de Negócio

Uma assinatura nunca pode voltar no tempo.

Uma assinatura expirada nunca deve ser reativada automaticamente.

Um cancelamento nunca remove histórico.

Toda mudança de plano deve ser registrada.

Todo acesso Premium depende de uma assinatura válida.

---

# Anti-Padrões

Nunca excluir assinaturas.

Nunca alterar datas manualmente sem auditoria.

Nunca confiar em datas enviadas pelo cliente.

Nunca utilizar lógica financeira dentro da assinatura.

Nunca misturar permissões com pagamentos.

Nunca criar regras específicas para um gateway de pagamento.

---

# Definition of Done

Uma funcionalidade relacionada à assinatura somente está pronta quando

✓ Regras de negócio implementadas

✓ Permissões validadas

✓ Eventos publicados

✓ Auditoria registrada

✓ Histórico preservado

✓ Idempotência garantida

✓ Testes implementados

✓ Documentação atualizada

✓ Logs estruturados

✓ Compatível com múltiplos gateways

---

# Regras para o OpenCode

Sempre tratar a assinatura como a fonte oficial de autorização do usuário.

Nunca acoplar a assinatura ao gateway de pagamento.

Sempre validar o estado atual da assinatura antes de liberar funcionalidades Premium.

Toda alteração de estado deve gerar eventos, logs e auditoria.

A arquitetura deve permitir adicionar novos planos, novos ciclos de cobrança e novos provedores de pagamento sem alterar as regras centrais do domínio.

O módulo de Subscription deve permanecer responsável apenas pelo ciclo de vida da assinatura, delegando pagamentos ao módulo Billing, créditos ao módulo Credits e autenticação ao módulo Authentication.
