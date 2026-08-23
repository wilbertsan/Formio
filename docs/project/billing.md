# Billing

# Objetivo

Este documento define as regras de faturamento do projeto 3DFormio.

Toda funcionalidade relacionada a planos, créditos, pagamentos e assinaturas deve seguir este documento.

O objetivo é manter um sistema previsível, seguro e consistente.

---

# Filosofia

O usuário paga pelo acesso à plataforma.

O usuário não compra arquivos STL.

Os arquivos são gerados sob demanda utilizando seus créditos e permissões.

---

# Conceitos

Usuário

Plano

Assinatura

Créditos

Pagamento

Cupom

Reembolso

Upgrade

Downgrade

Renovação

Cancelamento

---

# Planos

Exemplos

Free

Starter

Pro

Business

Enterprise

Cada plano define

Quantidade de créditos

Modelos disponíveis

Downloads

Limites diários

Espaço disponível

Recursos Premium

---

# Assinatura

Uma assinatura possui

Plano

Status

Data de início

Data de renovação

Data de expiração

Método de pagamento

Valor

Moeda

---

# Status

ACTIVE

TRIAL

PENDING

PAST_DUE

CANCELED

EXPIRED

SUSPENDED

Somente ACTIVE possui acesso completo.

---

# Trial

O período de teste concede acesso limitado.

O Trial não pode ser utilizado mais de uma vez por usuário.

---

# Créditos

Créditos representam capacidade de geração.

Toda geração consome créditos.

Créditos nunca podem ficar negativos.

---

# Tipos de Créditos

Mensais

Comprados

Bônus

Promocionais

Cashback

Afiliados

---

# Prioridade de Consumo

Consumir nesta ordem

Créditos Promocionais

↓

Bônus

↓

Mensais

↓

Comprados

---

# Expiração

Créditos promocionais podem expirar.

Créditos mensais expiram na renovação.

Créditos comprados não expiram.

---

# Consumo

Gerar Preview

0 créditos

Gerar STL

Consome créditos

Download

Não consome créditos

Duplicar projeto

Não consome créditos

Editar projeto

Não consome créditos

---

# Geração

Os créditos somente podem ser debitados após sucesso da geração.

Caso a geração falhe

Nenhum crédito será consumido.

---

# Falhas

Erros internos

↓

Não consumir créditos.

Erro do usuário

↓

Não consumir créditos.

Timeout

↓

Não consumir créditos.

---

# Compra de Créditos

Usuário pode comprar pacotes adicionais.

Exemplo

100 créditos

500 créditos

1000 créditos

Os créditos comprados são cumulativos.

---

# Renovação

Na renovação

Atualizar assinatura.

Adicionar créditos mensais.

Atualizar limites.

Registrar evento.

---

# Cancelamento

Ao cancelar

A assinatura permanece válida até o vencimento.

Nunca remover acesso imediatamente.

---

# Expiração

Quando expirar

Bloquear novas gerações.

Permitir acesso ao histórico.

Permitir download dos arquivos existentes conforme política da plataforma.

---

# Upgrade

Upgrade deve ser imediato.

Adicionar benefícios imediatamente.

Calcular diferença proporcional quando aplicável.

Registrar histórico.

---

# Downgrade

Aplicar apenas na próxima renovação.

Nunca remover recursos imediatamente.

---

# Reembolso

Quando ocorrer

Registrar evento.

Reverter pagamento.

Cancelar créditos adicionados quando aplicável.

Manter auditoria.

---

# Cupom

Todo cupom possui

Código

Validade

Limite de uso

Tipo

Valor

Status

---

# Tipos de Cupom

Percentual

Valor fixo

Primeira compra

Plano específico

Afiliado

---

# Cashback

Cashback gera créditos promocionais.

Nunca dinheiro.

---

# Afiliados

Compras realizadas através de afiliados devem registrar

Parceiro

Campanha

Usuário

Comissão

Data

Valor

Status

---

# Métodos de Pagamento

Cartão

PIX

Boleto

Carteiras Digitais

A implementação deve permitir novos métodos futuramente.

---

# Histórico

Registrar

Pagamento

Falha

Renovação

Upgrade

Downgrade

Cancelamento

Reembolso

Cupom

Compra de créditos

---

# Auditoria

Todo evento financeiro deve possuir

Data

Usuário

Valor

Moeda

Status

Origem

RequestId

---

# Segurança

Nunca confiar em callbacks sem validação.

Sempre validar assinaturas do gateway.

Nunca atualizar assinatura apenas pelo frontend.

---

# Idempotência

Pagamentos devem ser idempotentes.

Um mesmo evento nunca pode gerar duas cobranças.

Uma mesma confirmação nunca pode adicionar créditos duas vezes.

---

# Eventos

SubscriptionCreated

SubscriptionRenewed

SubscriptionCanceled

PaymentApproved

PaymentFailed

CreditsAdded

CreditsConsumed

CouponApplied

RefundProcessed

AffiliateCommissionCreated

---

# Regras de Negócio

Nunca permitir créditos negativos.

Nunca liberar recursos sem assinatura válida.

Nunca consumir créditos antes da geração terminar.

Nunca perder créditos comprados pelo usuário.

Toda alteração financeira deve gerar log.

Toda operação deve ser auditável.

---

# Definition of Done

Uma funcionalidade financeira somente está pronta quando

✓ Regras de negócio implementadas

✓ Auditoria registrada

✓ Eventos publicados

✓ Idempotência garantida

✓ Testes implementados

✓ Documentação atualizada

✓ Logs estruturados

✓ Segurança revisada

---

# Regras para o OpenCode

Sempre tratar pagamentos como operações críticas.

Nunca confiar em dados enviados pelo frontend.

Sempre validar o estado atual da assinatura antes de conceder acesso.

Sempre registrar eventos financeiros.

Sempre manter histórico completo.

Toda lógica financeira deve ser determinística, auditável e idempotente.

Nenhuma operação financeira pode resultar em perda de créditos ou inconsistência de cobrança.

O sistema de faturamento do 3DFormio deve ser preparado para crescer, suportando novos planos, novos gateways de pagamento e novos modelos de monetização sem necessidade de reescrever as regras de negócio.
