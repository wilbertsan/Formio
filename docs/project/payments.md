# Payments

# Objetivo

Este documento define as regras do módulo de pagamentos do projeto 3DFormio.

O módulo Payments é responsável por iniciar, acompanhar, confirmar e reconciliar pagamentos realizados pelos usuários.

Toda operação financeira deve ser segura, auditável, idempotente e baseada na confirmação oficial do provedor de pagamento.

---

# Filosofia

Payments processa pagamentos.

Billing controla o ciclo financeiro.

Subscription controla planos.

Credits controla saldo de créditos.

Affiliates controla comissões.

Esses módulos nunca devem compartilhar responsabilidades.

---

# Objetivos

Garantir

Segurança

Idempotência

Rastreabilidade

Confiabilidade

Escalabilidade

Baixo acoplamento

---

# Conceitos

Payment

Order

Checkout

Provider

Transaction

Authorization

Capture

Refund

Webhook

Settlement

Reconciliation

---

# Responsabilidades

Criar pagamentos.

Consultar pagamentos.

Receber confirmações.

Registrar transações.

Processar estornos.

Reconciliar operações.

Publicar eventos.

Registrar auditoria.

---

# Provedores

O sistema deve suportar

Stripe

Mercado Pago

PagSeguro

PayPal

Asaas

Pagar.me

Outros provedores

A arquitetura deve permitir novos provedores sem alterações no domínio.

---

# Fluxo Oficial

Usuário

↓

Checkout

↓

Provider

↓

Pagamento

↓

Webhook

↓

Validação

↓

Transaction

↓

Evento

↓

Billing

↓

Subscription

↓

Credits

---

# Entidade Payment

Todo pagamento deve possuir

PaymentId

OrderId

Provider

ProviderPaymentId

Status

Currency

Amount

Method

CheckoutUrl

CreatedAt

UpdatedAt

---

# Entidade Transaction

Toda transação deve possuir

TransactionId

PaymentId

ProviderTransactionId

Status

AuthorizationCode

Amount

Currency

OccurredAt

CreatedAt

---

# Entidade Refund

Todo estorno deve possuir

RefundId

PaymentId

TransactionId

ProviderRefundId

Amount

Reason

Status

CreatedAt

UpdatedAt

---

# Métodos de Pagamento

Cartão de Crédito

PIX

Boleto Bancário

Carteira Digital

Assinatura Recorrente

Novos métodos devem ser suportados sem alterar o domínio.

---

# Status do Pagamento

CREATED

PENDING

AUTHORIZED

CAPTURED

PAID

FAILED

CANCELED

REFUNDED

PARTIALLY_REFUNDED

EXPIRED

---

# Máquina de Estados

CREATED

↓

PENDING

↓

AUTHORIZED

↓

CAPTURED

↓

PAID

Falhas podem ocorrer em qualquer etapa.

Nunca permitir transições inválidas.

---

# Checkout

Todo checkout deve possuir

OrderId

Valor

Moeda

Descrição

Tempo de expiração

Callback

Webhook

---

# Criação

Ao iniciar um pagamento

Validar usuário.

Validar pedido.

Validar valor.

Criar Payment.

Solicitar checkout ao provedor.

---

# Confirmação

O pagamento somente será considerado concluído após confirmação oficial do provedor.

Nunca confiar no retorno imediato do checkout.

---

# Webhooks

Todo provedor deve utilizar Webhooks para confirmação.

Toda notificação deve validar

Assinatura

Origem

Idempotência

Timestamp

---

# Idempotência

Toda operação financeira deve ser idempotente.

Reprocessamentos nunca podem gerar cobranças duplicadas.

---

# Captura

Quando suportado

Separar autorização de captura.

Nunca capturar automaticamente quando a estratégia exigir aprovação posterior.

---

# PIX

O sistema deve suportar

QR Code

Copia e Cola

Expiração

Confirmação assíncrona

---

# Boleto

O sistema deve suportar

Código de barras

Linha digitável

Data de vencimento

Liquidação assíncrona

---

# Cartão

Nunca armazenar

Número do cartão

CVV

Senha

Dados sensíveis

Toda tokenização deve ocorrer no provedor.

---

# Moeda

A moeda deve ser registrada em todos os pagamentos.

O sistema deve suportar múltiplas moedas.

Nunca assumir uma moeda fixa.

---

# Valor

Todo valor deve possuir

Valor bruto

Moeda

Precisão

Origem

Nunca utilizar valores enviados pelo frontend sem validação.

---

# Expiração

Pagamentos pendentes devem possuir tempo de expiração.

Após expiração

Atualizar status.

Publicar evento.

Registrar auditoria.

---

# Estornos

Todo estorno deve possuir

Motivo

Valor

Status

Origem

Data

Usuário responsável quando aplicável

---

# Estorno Parcial

Quando suportado pelo provedor

Permitir devolução parcial.

Registrar histórico completo.

---

# Reconciliação

Executar reconciliação periódica.

Comparar

Status

Valor

Moeda

Transações

Registrar divergências.

---

# Falhas

Quando ocorrer erro

Atualizar status.

Registrar motivo.

Publicar evento.

Nunca conceder benefícios.

---

# Segurança

HTTPS obrigatório.

Webhooks assinados.

Credenciais em Secrets Manager.

IAM mínimo.

Criptografia em trânsito.

Criptografia em repouso.

---

# Auditoria

Registrar

PaymentId

TransactionId

OrderId

Provider

Status

Amount

Currency

RequestId

Timestamp

---

# Eventos

PaymentCreated

CheckoutCreated

PaymentPending

PaymentAuthorized

PaymentCaptured

PaymentApproved

PaymentFailed

PaymentExpired

PaymentCanceled

RefundRequested

RefundCompleted

PaymentReconciled

---

# Integração com Billing

Billing cria pedidos.

Payments executa cobranças.

Billing registra efeitos financeiros.

---

# Integração com Subscription

Após pagamento confirmado

Publicar evento.

Subscription ativa ou renova o plano.

---

# Integração com Credits

Após pagamento confirmado

Publicar evento.

Credits adiciona saldo quando aplicável.

---

# Integração com Authentication

Todo pagamento pertence a um usuário autenticado.

Nunca aceitar pagamentos associados a usuários inexistentes.

---

# Integração com Authorization

Authorization valida permissões para

Solicitar estornos.

Consultar pagamentos.

Cancelar cobranças.

---

# Integração com Notifications

Após mudança de status

Publicar evento.

Permitir envio de notificações.

---

# Integração com Affiliates

Após confirmação

Publicar evento.

Affiliates decide eventual atribuição de comissão.

---

# Performance

Processar Webhooks de forma assíncrona.

Nunca bloquear o checkout.

Utilizar filas quando necessário.

---

# Escalabilidade

Permitir milhares de pagamentos simultâneos.

Nunca depender de estado em memória.

Toda operação deve ser stateless.

---

# Modelagem DynamoDB

Partition Key

PaymentId

Sort Key

TransactionId

Criar índices para

OrderId

UserId

Provider

Status

CreatedAt

---

# Logs

Registrar

PaymentId

Provider

Status

Valor

Moeda

Tempo

RequestId

Nunca registrar informações sensíveis do cartão.

---

# Métricas

Pagamentos iniciados

Pagamentos aprovados

Pagamentos recusados

Tempo médio de aprovação

Valor total processado

Estornos

Falhas

Reconciliações

---

# Anti-Padrões

Nunca confiar apenas no retorno do checkout.

Nunca armazenar dados do cartão.

Nunca processar pagamentos sem autenticação.

Nunca ignorar Webhooks.

Nunca registrar transações duplicadas.

Nunca liberar benefícios antes da confirmação.

Nunca misturar pagamentos com regras de assinatura.

---

# Regras de Negócio

Todo pagamento pertence a um pedido.

Toda confirmação depende do provedor.

Toda transação gera auditoria.

Todo estorno gera histórico.

Toda operação financeira é idempotente.

Toda mudança de status publica eventos.

---

# Checklist

Antes de finalizar

✓ Checkout implementado

✓ Webhooks validados

✓ Idempotência garantida

✓ Auditoria implementada

✓ Eventos publicados

✓ Reconciliação prevista

✓ Secrets Manager utilizado

✓ Testes implementados

✓ Documentação atualizada

---

# Definition of Done

Uma funcionalidade relacionada a pagamentos somente está pronta quando

✓ Utiliza provedor oficial

✓ Processa Webhooks com segurança

✓ Garante idempotência

✓ Mantém auditoria completa

✓ Publica eventos

✓ Não armazena dados sensíveis

✓ Está documentada

✓ Está testada

✓ Compatível com Clean Architecture

✓ Compatível com arquitetura Serverless

---

# Regras para o OpenCode

Sempre tratar o módulo Payments como responsável exclusivamente pelo processamento e acompanhamento das transações financeiras.

Nunca considerar um pagamento concluído antes da confirmação oficial do provedor por meio de Webhook ou mecanismo equivalente.

Sempre implementar idempotência em todas as operações financeiras, incluindo criação, confirmação, cancelamento e estorno.

Nunca armazenar dados sensíveis de meios de pagamento; utilizar tokenização e serviços especializados do provedor.

O módulo Payments deve permanecer desacoplado dos módulos Billing, Subscription, Credits e Affiliates, comunicando alterações de estado exclusivamente por eventos de domínio.

Toda transação financeira do 3DFormio deve ser segura, auditável, rastreável, reconciliável e preparada para suportar múltiplos provedores de pagamento sem alterações na arquitetura do domínio.
