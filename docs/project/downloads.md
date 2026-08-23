# Downloads

# Objetivo

Este documento define as regras do módulo de downloads do projeto 3DFormio.

O módulo Downloads é responsável por controlar o acesso aos arquivos gerados pelos usuários.

Seu objetivo é garantir segurança, rastreabilidade, escalabilidade e alta disponibilidade na distribuição dos artefatos.

---

# Filosofia

O download representa o acesso a um artefato existente.

O download nunca gera um novo modelo.

O download nunca altera um projeto.

O download nunca consome créditos.

---

# Objetivos

Garantir

Segurança

Escalabilidade

Baixa latência

Auditoria

Controle de acesso

Distribuição eficiente

---

# Conceitos

Download

Artefato

Arquivo

URL Assinada

Expiração

Histórico

Permissão

CloudFront

S3

---

# Responsabilidades

Validar usuário.

Validar permissões.

Localizar artefato.

Gerar URL assinada.

Registrar auditoria.

Publicar eventos.

Nunca manipular arquivos diretamente.

---

# Entidade Download

Todo download deve possuir

DownloadId

UserId

ProjectId

GenerationId

ArtifactId

ArtifactType

Status

Source

IPAddress

UserAgent

RequestId

ExpiresAt

DownloadedAt

CreatedAt

---

# Tipos de Arquivos

STL

STEP

GLB

PNG

SVG

JSON

ZIP

Cada tipo deve possuir política própria de distribuição.

---

# Tipos de Download

Download individual

Download em lote

Download compactado

Download público

Download privado

---

# Fluxo Oficial

Usuário

↓

Autenticação

↓

Autorização

↓

Localizar Artefato

↓

Gerar URL Assinada

↓

Registrar Auditoria

↓

Download

↓

Registrar Evento

---

# Permissões

Somente o proprietário pode baixar seus arquivos.

Administradores possuem acesso apenas para suporte.

Nunca permitir acesso por conhecimento da URL.

---

# URL Assinada

Todo download deve utilizar URL assinada.

Nunca expor caminhos internos do S3.

Nunca utilizar buckets públicos.

---

# Expiração

URLs assinadas devem possuir tempo limitado.

Tempo padrão

5 minutos

A configuração deve ser parametrizável.

---

# CloudFront

Sempre distribuir arquivos através do CloudFront.

Nunca acessar o bucket S3 diretamente pelo navegador.

---

# S3

O bucket permanece privado.

Toda autorização ocorre antes da geração da URL.

---

# Artefatos

Cada artefato deve possuir

ArtifactId

Tipo

Tamanho

Hash

Versão

Data de criação

Localização

Checksum

---

# Validação

Antes do download validar

Usuário autenticado

Permissão

Existência do artefato

Status da geração

Disponibilidade do arquivo

---

# Arquivos Inválidos

Nunca disponibilizar

Arquivos corrompidos

Arquivos incompletos

Artefatos temporários

Versões intermediárias

---

# Compressão

Arquivos múltiplos devem ser compactados.

A compactação deve ocorrer sob demanda.

Nunca armazenar ZIP permanentemente.

---

# Histórico

Todo download deve registrar

Usuário

Arquivo

Projeto

GenerationId

IP

UserAgent

Timestamp

RequestId

---

# Auditoria

Registrar

DownloadId

ArtifactId

UserId

Origem

Status

Tempo

Resultado

---

# Eventos

DownloadRequested

DownloadAuthorized

DownloadStarted

DownloadCompleted

DownloadExpired

DownloadDenied

DownloadFailed

---

# Integração com Projects

Projects identifica os artefatos disponíveis.

Downloads apenas entrega os arquivos.

---

# Integração com Generation

Generation produz artefatos.

Downloads distribui artefatos.

---

# Integração com Storage

Storage localiza arquivos.

Downloads nunca acessa o bucket diretamente.

---

# Integração com Subscription

Subscription pode limitar

Quantidade diária

Downloads Premium

Tipos de arquivos

Nunca controlar armazenamento.

---

# Integração com Credits

Downloads nunca consomem créditos.

---

# Download Público

Quando permitido

Gerar link temporário.

Nunca remover autenticação sem autorização explícita.

---

# Download Privado

Sempre requer autenticação.

Sempre validar proprietário.

---

# Downloads em Massa

Limitar quantidade de arquivos por solicitação.

Executar processamento assíncrono quando necessário.

---

# Rate Limit

Aplicar limite de requisições por usuário.

Evitar abuso.

Registrar tentativas excessivas.

---

# Performance

Utilizar CloudFront.

Utilizar cache.

Evitar processamento desnecessário.

Nunca transferir arquivos através da aplicação.

---

# Segurança

Nunca retornar caminhos internos.

Nunca retornar nomes de buckets.

Nunca expor credenciais.

Nunca reutilizar URLs expiradas.

Sempre utilizar HTTPS.

---

# Integridade

Todo artefato deve possuir

Hash

Checksum

Tamanho

Versão

Validar integridade antes da distribuição.

---

# Retenção

Arquivos podem possuir política de retenção.

Após expiração

Registrar evento.

Remover referências quando aplicável.

Nunca remover registros históricos.

---

# Modelagem DynamoDB

Partition Key

UserId

Sort Key

DownloadId

Criar índices para

ProjectId

GenerationId

ArtifactId

CreatedAt

---

# Logs

Registrar

DownloadId

UserId

ArtifactId

Tempo

Status

IP

RequestId

---

# Métricas

Downloads por dia

Downloads por usuário

Arquivos mais baixados

Falhas

Tempo médio

Transferência total

---

# Anti-Padrões

Nunca utilizar bucket público.

Nunca retornar arquivos pela API.

Nunca compartilhar URLs permanentes.

Nunca ignorar permissões.

Nunca excluir histórico.

Nunca confiar em IDs enviados pelo frontend.

Nunca permitir acesso cruzado entre usuários.

---

# Regras de Negócio

Todo download pertence a um usuário.

Todo download gera auditoria.

Toda URL possui expiração.

Todo acesso é autenticado.

Todo evento é registrado.

Todo arquivo permanece privado até autorização.

---

# Checklist

Antes de finalizar

✓ Permissões validadas

✓ URL assinada gerada

✓ Auditoria registrada

✓ Eventos publicados

✓ Histórico atualizado

✓ HTTPS utilizado

✓ CloudFront configurado

✓ Testes implementados

✓ Documentação atualizada

---

# Definition of Done

Uma funcionalidade relacionada a downloads somente está pronta quando

✓ Utiliza URL assinada

✓ Mantém bucket privado

✓ Preserva auditoria

✓ Publica eventos

✓ Possui controle de acesso

✓ Está documentada

✓ Está testada

✓ Compatível com CloudFront

✓ Compatível com arquitetura Serverless

---

# Regras para o OpenCode

Sempre tratar downloads como uma operação de distribuição de artefatos, nunca como uma operação de geração.

Nunca transferir arquivos através da aplicação quando for possível utilizar URLs assinadas.

Sempre validar autenticação, autorização e existência do artefato antes de gerar o acesso.

Toda solicitação deve gerar logs, auditoria e eventos de domínio.

O módulo Downloads deve permanecer responsável exclusivamente pela entrega segura dos arquivos, delegando armazenamento ao Storage, autenticação ao Authentication, autorização ao Subscription e produção dos artefatos ao módulo Generation.

Toda distribuição de arquivos do 3DFormio deve ser segura, rastreável, escalável e otimizada para baixa latência utilizando S3 privado e CloudFront.
