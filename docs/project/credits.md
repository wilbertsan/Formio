# Credits

# Objetivo

Este documento define o funcionamento do sistema de créditos do projeto 3DFormio.

Os créditos representam a unidade oficial de consumo da plataforma.

Toda geração de modelos, recursos premium e funcionalidades pagas devem utilizar este sistema.

---

# Filosofia

O sistema de créditos existe para limitar o consumo de recursos computacionais.

Créditos não representam dinheiro.

Créditos representam capacidade de processamento.

Toda geração possui um custo conhecido.

O consumo deve ser previsível.

---

# Objetivos

Garantir

Escalabilidade

Controle de consumo

Justiça entre usuários

Baixo custo operacional

Auditoria completa

---

# Conceitos

Crédito

Saldo

Consumo

Reserva

Estorno

Expiração

Recarga

Limite

Histórico

---

# Entidade CreditAccount

Cada usuário possui apenas uma conta de créditos.

Campos

AccountId

UserId

AvailableCredits

ReservedCredits

LifetimeCredits

ConsumedCredits

CreatedAt

UpdatedAt

---

# Tipos de Créditos

Mensais

Comprados

Promocionais

Bônus

Cashback

Afiliados

Compensação

---

# Prioridade de Consumo

Sempre consumir nesta ordem

Promocionais

↓

Bônus

↓

Mensais

↓

Comprados

Nunca alterar esta prioridade.

---

# Saldo

O saldo disponível nunca pode ser negativo.

Todo consumo deve validar saldo antes da execução.

---

# Reserva

Antes de iniciar uma geração

Reservar créditos.

A reserva impede consumo duplicado.

---

# Fluxo de Consumo

Solicitação

↓

Validar saldo

↓

Reservar créditos

↓

Executar geração

↓

Confirmar geração

↓

Consumir créditos

↓

Registrar histórico

---

# Falha na Geração

Caso a geração falhe

Cancelar reserva.

Restaurar saldo.

Registrar evento.

Nunca consumir créditos.

---

# Timeout

Caso ocorra timeout

Cancelar reserva.

Registrar tentativa.

Nenhum crédito deve ser perdido.

---

# Cancelamento

Caso o usuário cancele antes da geração iniciar

Cancelar reserva.

Restaurar saldo.

---

# Estorno

O estorno pode ocorrer por

Erro interno

Falha da infraestrutura

Cancelamento administrativo

Compensação

Todo estorno deve gerar auditoria.

---

# Expiração

Créditos mensais

Expiram na renovação.

Créditos promocionais

Expiram conforme campanha.

Créditos comprados

Nunca expiram.

---

# Compra de Créditos

A compra adiciona créditos permanentes.

Nunca substituir créditos existentes.

Sempre acumular saldo.

---

# Consumo por Operação

Preview

0 créditos

Salvar projeto

0 créditos

Editar parâmetros

0 créditos

Download STL

0 créditos

Gerar STL

Consome créditos

Render Premium

Consome créditos

Modelos IA

Consomem créditos conforme tabela.

---

# Tabela de Consumo

O custo deve ser configurável.

Nunca fixar valores no código.

Exemplos

Modelo simples

1 crédito

Modelo intermediário

3 créditos

Modelo complexo

5 créditos

Render IA

10 créditos

---

# Histórico

Todo consumo deve registrar

TransactionId

UserId

Tipo

Quantidade

Saldo anterior

Saldo atual

Origem

Projeto

Modelo

Timestamp

RequestId

---

# Tipos de Transação

ADD

RESERVE

COMMIT

ROLLBACK

REFUND

BONUS

PURCHASE

EXPIRE

CASHBACK

AFFILIATE

---

# Idempotência

Uma geração nunca pode consumir créditos duas vezes.

Uma confirmação repetida deve ser ignorada.

Uma reserva nunca deve ser aplicada duas vezes.

---

# Concorrência

Suportar múltiplas gerações simultâneas.

Nunca permitir saldo negativo.

Toda operação deve ser atômica.

---

# Consistência

Saldo disponível

+

Saldo reservado

=

Saldo total

Toda operação deve preservar esta relação.

---

# Auditoria

Registrar

Usuário

Operação

Origem

Quantidade

Projeto

Modelo

IP

RequestId

Timestamp

---

# Eventos

CreditsReserved

CreditsConsumed

CreditsRefunded

CreditsExpired

CreditsPurchased

CreditsAdded

CreditsBonusGranted

CreditsCashbackGranted

CreditsAffiliateGranted

---

# Integração com Subscription

A assinatura define

Quantidade mensal

Limites

Periodicidade

O módulo Credits controla apenas o saldo.

---

# Integração com Billing

Billing adiciona créditos.

Credits administra o saldo.

Billing nunca altera saldo diretamente.

---

# Integração com Generation

Generation solicita reserva.

Credits valida saldo.

Generation confirma sucesso.

Credits efetiva consumo.

---

# Segurança

Nunca confiar no frontend.

Nunca aceitar saldo informado pelo cliente.

Todo cálculo deve ocorrer no backend.

---

# Performance

Evitar consultas repetidas.

Atualizações devem ser atômicas.

Utilizar operações condicionais no DynamoDB.

Nunca utilizar Scan.

---

# Modelagem DynamoDB

Partition Key

UserId

Sort Key

TransactionId

Criar índices para

Timestamp

Tipo

Projeto

---

# Logs

Registrar

RequestId

UserId

Operation

Credits

Duration

Status

---

# Anti-Padrões

Nunca permitir saldo negativo.

Nunca consumir créditos antes do sucesso da geração.

Nunca alterar saldo manualmente.

Nunca excluir histórico.

Nunca sobrescrever transações.

Nunca confiar em cálculos do frontend.

Nunca criar regras específicas para um plano.

---

# Regras de Negócio

Cada geração consome apenas uma vez.

Uma falha nunca consome créditos.

Um estorno nunca gera saldo negativo.

Toda alteração gera auditoria.

Todo consumo gera evento.

Toda compra gera evento.

Todo bônus gera histórico.

---

# Checklist

Antes de finalizar uma implementação

✓ Saldo validado

✓ Reserva criada

✓ Consumo confirmado

✓ Estorno implementado

✓ Auditoria registrada

✓ Eventos publicados

✓ Idempotência garantida

✓ Testes implementados

✓ Logs estruturados

---

# Definition of Done

Uma funcionalidade relacionada a créditos somente está pronta quando

✓ Não permite saldo negativo

✓ É totalmente auditável

✓ Possui operações atômicas

✓ É idempotente

✓ Publica eventos

✓ Mantém histórico completo

✓ Está testada

✓ Está documentada

✓ Funciona com múltiplas gerações simultâneas

---

# Regras para o OpenCode

Sempre tratar créditos como um recurso financeiro crítico.

Nunca consumir créditos antes da conclusão bem-sucedida da geração.

Sempre utilizar o fluxo **Validar → Reservar → Executar → Confirmar → Consumir**.

Nunca modificar saldos diretamente sem registrar uma transação.

Toda alteração de saldo deve gerar histórico, auditoria e evento de domínio.

O módulo Credits deve permanecer independente dos gateways de pagamento, da autenticação e da lógica de geração de modelos, sendo responsável exclusivamente pela gestão do saldo e das transações de créditos do 3DFormio.
