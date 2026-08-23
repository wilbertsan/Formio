# Storage

# Objetivo

Este documento define as regras do módulo de armazenamento do projeto 3DFormio.

O módulo Storage é responsável por armazenar, recuperar e gerenciar todos os arquivos produzidos pela plataforma.

Toda persistência de arquivos deve ser segura, escalável, auditável e independente das regras de negócio.

---

# Filosofia

Storage armazena arquivos.

Storage não conhece regras de negócio.

Storage não conhece usuários.

Storage não controla permissões.

Storage apenas gerencia objetos.

---

# Objetivos

Garantir

Escalabilidade

Durabilidade

Segurança

Baixo custo

Alta disponibilidade

Rastreabilidade

---

# Serviço Oficial

Amazon S3

Todo armazenamento permanente deve utilizar S3.

Nunca utilizar disco local como armazenamento definitivo.

---

# Conceitos

Bucket

Object

Artifact

Prefix

Version

Metadata

Checksum

Lifecycle

Signed URL

---

# Responsabilidades

Armazenar arquivos.

Recuperar arquivos.

Gerar URLs assinadas.

Excluir arquivos.

Versionar objetos.

Aplicar políticas de retenção.

Registrar auditoria.

---

# Arquivos Suportados

STL

STEP

GLB

PNG

SVG

JSON

ZIP

Logs

Arquivos temporários

---

# Organização

Todo arquivo deve pertencer a um artefato.

Todo artefato pertence a uma geração.

Toda geração pertence a um projeto.

---

# Estrutura Oficial

projects/

{userId}/

{projectId}/

{generationId}/

preview/

stl/

step/

glb/

metadata/

logs/

Nunca utilizar estrutura diferente.

---

# Bucket

Utilizar buckets privados.

Nunca criar buckets públicos.

Separar ambientes

dev

staging

production

---

# Nomeação

Os nomes devem utilizar

UUID

Version

Extensão

Nunca utilizar nomes enviados pelo usuário.

---

# Metadata

Todo objeto deve possuir

ArtifactId

ProjectId

GenerationId

UserId

ContentType

Version

Checksum

CreatedAt

---

# Upload

Fluxo

Solicitação

↓

Validação

↓

URL Assinada

↓

Upload direto

↓

Confirmação

Nunca enviar arquivos através da aplicação quando possível.

---

# Download

Fluxo

Validação

↓

URL Assinada

↓

CloudFront

↓

Usuário

---

# URL Assinada

Toda URL deve possuir

Tempo de expiração.

Permissões mínimas.

HTTPS obrigatório.

---

# Versionamento

Ativar versionamento do bucket.

Nunca sobrescrever arquivos existentes.

Cada geração cria novos objetos.

---

# Integridade

Todo arquivo deve possuir

Checksum

Hash

Content-Length

Content-Type

Validar antes da confirmação do upload.

---

# Compressão

Compactar apenas quando necessário.

Nunca armazenar arquivos duplicados apenas para compressão.

---

# Arquivos Temporários

Devem possuir ciclo de vida curto.

Remover automaticamente após processamento.

Nunca permanecer indefinidamente.

---

# Retenção

Aplicar políticas por tipo

Logs

Previews

Artefatos temporários

Arquivos permanentes

Toda política deve ser configurável.

---

# Lifecycle

Utilizar Lifecycle Rules para

Arquivos temporários.

Objetos expirados.

Logs antigos.

Nunca remover artefatos ativos.

---

# Exclusão

Toda exclusão deve ser lógica antes da exclusão física.

Registrar auditoria.

Publicar evento.

---

# Recuperação

Quando houver versionamento

Permitir restauração de versões anteriores.

---

# Artefatos

Cada artefato deve possuir

ArtifactId

Tipo

Versão

Checksum

Bucket

Key

Status

CreatedAt

---

# Cache

Arquivos públicos temporários

Cache via CloudFront.

Arquivos privados

URLs assinadas.

Nunca utilizar cache para objetos sensíveis sem controle.

---

# Segurança

Bucket privado.

HTTPS obrigatório.

SSE habilitado.

IAM mínimo.

URLs assinadas.

Nunca expor caminhos internos.

---

# Criptografia

Habilitar criptografia em repouso.

Utilizar SSE-S3 ou SSE-KMS.

Nunca armazenar arquivos sem criptografia.

---

# IAM

Permissões mínimas.

A aplicação nunca deve possuir acesso administrativo ao bucket.

---

# Auditoria

Registrar

ArtifactId

Bucket

Key

Operação

UserId

RequestId

Timestamp

---

# Eventos

ArtifactUploaded

ArtifactValidated

ArtifactDeleted

ArtifactRestored

ArtifactDownloaded

ArtifactExpired

StorageQuotaExceeded

---

# Integração com Projects

Projects mantém apenas referências.

Storage mantém arquivos.

---

# Integração com Generation

Generation produz artefatos.

Storage persiste artefatos.

---

# Integração com Downloads

Downloads solicita URLs assinadas.

Storage nunca valida permissões.

---

# Integração com Authentication

Authentication identifica o usuário.

Storage nunca autentica usuários.

---

# Integração com Authorization

Authorization decide o acesso.

Storage apenas entrega o objeto solicitado.

---

# Integração com Billing

Storage nunca conhece planos ou pagamentos.

---

# Performance

Utilizar uploads multipart quando necessário.

Evitar downloads pela aplicação.

Utilizar CloudFront.

Evitar duplicação de arquivos.

---

# Escalabilidade

Todo armazenamento deve escalar automaticamente.

Nunca depender de servidores locais.

Nunca utilizar NFS.

---

# Logs

Registrar

Bucket

Key

Operação

Tempo

Resultado

RequestId

---

# Métricas

Uploads

Downloads

Tamanho armazenado

Objetos ativos

Objetos expirados

Erros

Latência

---

# Modelagem

Storage armazena apenas

Bucket

Object Key

Metadata

Checksum

Nunca armazenar regras de negócio.

---

# Anti-Padrões

Nunca utilizar bucket público.

Nunca armazenar arquivos permanentemente na Lambda.

Nunca salvar caminhos absolutos.

Nunca utilizar nomes enviados pelo usuário.

Nunca sobrescrever objetos.

Nunca validar permissões dentro do Storage.

Nunca misturar armazenamento com regras de negócio.

---

# Regras de Negócio

Todo artefato possui identificação única.

Todo upload gera auditoria.

Toda exclusão gera evento.

Todo download utiliza URL assinada.

Todo arquivo possui checksum.

Toda geração cria novos artefatos.

---

# Checklist

Antes de finalizar

✓ Bucket privado

✓ Versionamento habilitado

✓ Criptografia habilitada

✓ URL assinada utilizada

✓ Metadata registrada

✓ Auditoria implementada

✓ Eventos publicados

✓ Lifecycle configurado

✓ Testes implementados

✓ Documentação atualizada

---

# Definition of Done

Uma funcionalidade relacionada ao armazenamento somente está pronta quando

✓ Utiliza Amazon S3

✓ Bucket permanece privado

✓ Versionamento está ativo

✓ Criptografia está habilitada

✓ URLs assinadas são utilizadas

✓ Mantém auditoria

✓ Publica eventos

✓ Está documentada

✓ Está testada

✓ Compatível com arquitetura Serverless

---

# Regras para o OpenCode

Sempre utilizar o Amazon S3 como armazenamento oficial de artefatos.

Nunca armazenar arquivos permanentes na aplicação ou na AWS Lambda.

Sempre utilizar uploads diretos e URLs assinadas para transferência de arquivos.

Nunca implementar regras de negócio dentro do módulo Storage.

O módulo Storage deve ser responsável exclusivamente pelo ciclo de vida dos objetos armazenados, delegando autenticação ao Authentication, autorização ao Authorization, geração ao Generation e organização dos recursos ao Projects.

Todo armazenamento do 3DFormio deve ser seguro, versionado, criptografado, auditável e preparado para escalar automaticamente para milhões de objetos sem alterações na arquitetura.
