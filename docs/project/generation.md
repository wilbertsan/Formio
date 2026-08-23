# Generation

# Objetivo

Este documento define as regras do módulo de geração do 3DFormio.

O módulo Generation é responsável por transformar parâmetros em modelos 3D válidos para impressão.

Toda geração deve ser determinística, auditável, escalável e independente da interface do usuário.

---

# Filosofia

A geração é um processo.

O projeto define o que será criado.

O modelo define como será criado.

A geração produz os artefatos.

Esses conceitos nunca devem ser ser misturados.

---

# Objetivos

Garantir

Escalabilidade

Performance

Reprodutibilidade

Auditoria

Baixo custo

Alta disponibilidade

---

# Conceitos

Generation

Job

Queue

Worker

Preview

Artifact

STL

STEP

Metadata

Parâmetros

---

# Responsabilidades

Receber solicitação.

Validar parâmetros.

Validar permissões.

Solicitar reserva de créditos.

Executar CadQuery.

Exportar arquivos.

Salvar artefatos.

Registrar histórico.

Publicar eventos.

---

# Entidade Generation

Toda geração deve possuir

GenerationId

ProjectId

UserId

ModelId

Status

Parameters

EngineVersion

StartedAt

FinishedAt

Duration

CreditsConsumed

PreviewUrl

ArtifactUrls

ErrorMessage

RequestId

CreatedAt

UpdatedAt

---

# Identificação

GenerationId deve ser único.

Nunca reutilizar identificadores.

Nunca utilizar timestamps como identificador principal.

---

# Fluxo Oficial

Usuário

↓

Validação

↓

Reserva de Créditos

↓

Criação da Generation

↓

Fila

↓

Worker

↓

CadQuery

↓

Exportação

↓

Upload S3

↓

Atualização da Generation

↓

Consumo definitivo dos créditos

↓

Evento

---

# Estados

PENDING

QUEUED

PROCESSING

EXPORTING

COMPLETED

FAILED

CANCELED

TIMEOUT

---

# Máquina de Estados

PENDING

↓

QUEUED

↓

PROCESSING

↓

EXPORTING

↓

COMPLETED

Falhas podem ocorrer em qualquer etapa.

Nunca permitir transições inválidas.

---

# Validação

Antes de iniciar

Validar usuário.

Validar assinatura.

Validar créditos.

Validar projeto.

Validar modelo.

Validar parâmetros.

---

# Parâmetros

Os parâmetros utilizados devem ser armazenados junto à geração.

Nunca depender do estado atual do projeto para reproduzir uma geração antiga.

---

# Versionamento

Registrar

Versão do CadQuery.

Versão do modelo.

Versão da Engine.

Versão da API.

Toda geração deve ser reproduzível.

---

# Fila

Toda geração pesada deve ser executada de forma assíncrona.

Nunca bloquear requisições HTTP durante a modelagem.

---

# Worker

O Worker possui responsabilidade exclusiva pela geração.

Nunca executar regras de autenticação.

Nunca executar lógica financeira.

---

# CadQuery

Receber parâmetros validados.

Gerar sólido.

Validar geometria.

Exportar artefatos.

Nunca acessar banco de dados.

---

# Artefatos

A geração pode produzir

Preview PNG

Preview GLB

STL

STEP

Metadata JSON

Logs técnicos

Todos os artefatos devem possuir referência própria.

---

# Upload

Todo upload deve utilizar S3.

Nunca armazenar arquivos permanentemente na Lambda.

---

# Preview

O Preview deve ser gerado antes do STL sempre que possível.

Deve ser otimizado para visualização.

Nunca substituir o STL final.

---

# STL

Exportar em formato binário.

Validar integridade antes do upload.

Nunca disponibilizar arquivos corrompidos.

---

# STEP

Quando suportado pelo modelo.

Utilizado para integração CAD.

Opcional.

---

# Metadata

Registrar

Modelo

Categoria

Parâmetros

Versões

Tempo

Volume

Bounding Box

Quantidade de Faces

Formato

---

# Créditos

Créditos são apenas reservados antes da geração.

Somente consumir definitivamente após COMPLETED.

---

# Falhas

Em caso de erro

Cancelar reserva.

Atualizar status.

Registrar erro.

Publicar evento.

Nunca consumir créditos.

---

# Timeout

Caso ultrapasse o tempo limite

Cancelar execução.

Liberar recursos.

Estornar reserva.

Registrar auditoria.

---

# Cancelamento

Se permitido

Cancelar Job.

Cancelar reserva.

Atualizar status.

Registrar histórico.

---

# Concorrência

Permitir múltiplas gerações simultâneas.

Cada geração é independente.

Nunca compartilhar estado em memória.

---

# Reprocessamento

Uma geração pode ser reexecutada.

Cada execução cria uma nova Generation.

Nunca sobrescrever uma geração anterior.

---

# Reprodutibilidade

Uma geração antiga deve produzir exatamente o mesmo resultado utilizando

Mesmo modelo.

Mesmos parâmetros.

Mesma versão da Engine.

---

# Eventos

GenerationRequested

GenerationQueued

GenerationStarted

GenerationExported

GenerationCompleted

GenerationFailed

GenerationCanceled

GenerationTimedOut

ArtifactsUploaded

---

# Auditoria

Registrar

GenerationId

ProjectId

UserId

Status

Worker

EngineVersion

Duration

RequestId

Timestamp

---

# Histórico

Nunca excluir gerações.

Toda geração permanece disponível para auditoria.

---

# Performance

Minimizar

Tempo de processamento.

Uso de memória.

Operações booleanas.

Exportações desnecessárias.

---

# Escalabilidade

Workers devem escalar horizontalmente.

Nunca depender de sessão.

Nunca depender de disco persistente.

---

# Segurança

Validar permissões antes da geração.

Nunca executar código enviado pelo usuário.

Nunca interpretar scripts externos.

Nunca permitir acesso direto ao bucket.

---

# Integração com Projects

Projects solicita uma geração.

Generation produz artefatos.

Projects registra a referência.

---

# Integração com Credits

Generation solicita

Reserva.

Confirmação.

Cancelamento.

Nunca altera saldo diretamente.

---

# Integração com Storage

Todo artefato pertence ao Storage.

Generation mantém apenas referências.

---

# Integração com Subscription

Generation consulta permissões.

Nunca controla planos.

---

# Integração com Notifications

Ao finalizar

Publicar evento.

Permitir envio de notificações.

---

# Modelagem DynamoDB

Partition Key

ProjectId

Sort Key

GenerationId

Criar índices para

UserId

Status

CreatedAt

FinishedAt

---

# Logs

Registrar

GenerationId

UserId

Worker

Tempo

Status

Modelo

RequestId

---

# Métricas

Tempo médio.

Falhas.

Timeouts.

Fila.

Consumo de créditos.

Quantidade diária.

---

# Anti-Padrões

Nunca consumir créditos antes da conclusão.

Nunca executar CadQuery dentro do endpoint HTTP.

Nunca sobrescrever gerações.

Nunca excluir histórico.

Nunca depender de arquivos temporários permanentes.

Nunca misturar geração com autenticação.

Nunca executar geração sem auditoria.

---

# Regras de Negócio

Toda geração pertence a um projeto.

Toda geração produz histórico.

Toda geração registra parâmetros.

Toda geração publica eventos.

Toda geração é reproduzível.

Toda falha preserva os créditos do usuário.

---

# Checklist

Antes de finalizar

✓ Parâmetros validados

✓ Créditos reservados

✓ Job criado

✓ Worker executado

✓ STL validado

✓ Upload realizado

✓ Créditos consumidos

✓ Eventos publicados

✓ Auditoria registrada

✓ Histórico preservado

---

# Definition of Done

Uma funcionalidade relacionada à geração somente está pronta quando

✓ É assíncrona

✓ É reproduzível

✓ Preserva histórico

✓ Publica eventos

✓ Mantém auditoria

✓ Não perde créditos

✓ Está documentada

✓ Está testada

✓ Compatível com Clean Architecture

✓ Compatível com arquitetura Serverless

---

# Regras para o OpenCode

Sempre tratar a geração como um processo assíncrono e independente.

Nunca executar modelagem pesada diretamente em requisições HTTP.

Sempre seguir o fluxo **Validar → Reservar Créditos → Enfileirar → Processar → Exportar → Armazenar → Confirmar → Consumir Créditos**.

Toda geração deve ser reproduzível, auditável e versionada.

O módulo Generation deve permanecer responsável exclusivamente pelo ciclo de vida da geração, delegando modelagem ao CadQuery, armazenamento ao Storage, controle financeiro ao Credits e autorização ao Subscription.

O objetivo principal é produzir modelos 3D válidos, consistentes e escaláveis, mantendo baixo custo operacional e alta confiabilidade para o 3DFormio.
