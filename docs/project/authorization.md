# Authorization

# Objetivo

Este documento define as regras do módulo de autorização do projeto 3DFormio.

O módulo Authorization é responsável por determinar quais recursos um usuário autenticado pode acessar.

Toda decisão de autorização deve ser centralizada, auditável e independente da autenticação.

---

# Filosofia

Authentication responde

Quem é o usuário?

Authorization responde

O que o usuário pode fazer?

Esses módulos nunca devem ser acoplados.

---

# Objetivos

Garantir

Segurança

Consistência

Baixo acoplamento

Escalabilidade

Auditoria

Facilidade de manutenção

---

# Conceitos

Identity

Role

Permission

Resource

Ownership

Policy

Scope

Action

Context

---

# Responsabilidades

Validar permissões.

Validar propriedade dos recursos.

Aplicar políticas de acesso.

Negar acessos não autorizados.

Registrar auditoria.

Publicar eventos.

---

# Fluxo Oficial

Usuário

↓

Authentication

↓

JWT Validado

↓

Authorization

↓

Policy Engine

↓

Permissão

↓

Aplicação

---

# Fontes de Informação

Authentication

Subscription

Projects

Credits

Billing

Admin

Nunca confiar apenas no JWT.

---

# Hierarquia

Usuário

↓

Role

↓

Permissions

↓

Policies

↓

Decision

---

# Roles

USER

MODERATOR

SUPPORT

ADMIN

SUPER_ADMIN

Toda Role deve possuir responsabilidades bem definidas.

---

# Princípio

Negar por padrão.

Permitir apenas quando houver autorização explícita.

---

# Permissions

Cada permissão representa apenas uma ação.

Exemplos

project.read

project.create

project.update

project.delete

generation.create

generation.read

download.file

credits.read

subscription.read

billing.read

admin.dashboard

---

# Recursos

Project

Generation

Artifact

Subscription

Credits

Billing

User

Admin

Settings

Notification

---

# Ações

Create

Read

Update

Delete

Execute

Download

Share

Archive

Restore

Approve

Cancel

---

# Ownership

O proprietário do recurso possui acesso total.

Nunca permitir acesso a recursos de outro usuário sem autorização explícita.

---

# Recursos Próprios

Um usuário pode

Editar seus projetos.

Gerar seus modelos.

Baixar seus arquivos.

Consultar seus créditos.

Gerenciar sua assinatura.

---

# Recursos Administrativos

Administradores podem

Consultar usuários.

Consultar auditoria.

Moderar conteúdo.

Executar suporte.

Toda ação administrativa deve ser registrada.

---

# Subscription

A autorização depende da assinatura.

Exemplos

Plano Free

↓

Modelos limitados.

Plano Pro

↓

Modelos Premium.

Plano Enterprise

↓

Todos os recursos.

---

# Credits

Antes de iniciar uma geração

Verificar saldo disponível.

Authorization nunca altera saldo.

---

# Download

Antes do download

Validar proprietário.

Validar assinatura quando necessário.

Validar existência do artefato.

---

# Projects

Toda operação deve validar

Owner

Status

Permissões

---

# Generation

Validar

Plano.

Permissões.

Créditos.

Modelo permitido.

---

# Billing

Somente o proprietário pode visualizar

Histórico

Pagamentos

Faturas

Métodos de pagamento

---

# Administração

Somente ADMIN e SUPER_ADMIN possuem acesso ao painel administrativo.

Nunca liberar acesso utilizando apenas parâmetros enviados pelo frontend.

---

# Policies

Policies devem ser centralizadas.

Nunca espalhar regras pelo código.

---

# Policy Examples

ProjectOwnerPolicy

GenerationPolicy

DownloadPolicy

BillingPolicy

SubscriptionPolicy

CreditsPolicy

AdminPolicy

---

# Policy Engine

Toda autorização deve utilizar

Resource

Action

Identity

Context

Nunca utilizar condicionais espalhadas pela aplicação.

---

# Contexto

A autorização pode depender de

Plano

Saldo

Status

Proprietário

Origem

Horário

Ambiente

---

# Escopos

Scopes representam permissões concedidas pelo token.

Nunca utilizar scopes como única decisão de autorização.

---

# Validação

Toda operação protegida deve validar

Usuário autenticado.

Permissão.

Propriedade.

Plano.

Estado do recurso.

---

# Auditoria

Registrar

UserId

Role

Permission

Resource

Action

Resultado

Timestamp

RequestId

---

# Eventos

AuthorizationGranted

AuthorizationDenied

PermissionChanged

RoleAssigned

RoleRemoved

AdminAccessGranted

---

# Logs

Registrar

Resource

Permission

Decision

Duration

UserId

IP

RequestId

Nunca registrar informações sensíveis.

---

# Rate Limit

Aplicar proteção em operações críticas.

Registrar tentativas repetidas de acesso negado.

---

# Segurança

Negar acesso por padrão.

Nunca confiar no frontend.

Nunca confiar apenas no JWT.

Nunca permitir elevação de privilégios.

Nunca utilizar UserId informado pelo cliente.

---

# Performance

Utilizar cache apenas para leitura de permissões estáticas.

Nunca armazenar decisões de autorização em memória por longo período.

As decisões devem refletir imediatamente mudanças de assinatura e permissões.

---

# Anti-Padrões

Nunca misturar autenticação com autorização.

Nunca verificar permissões diretamente nos controllers.

Nunca duplicar regras de autorização.

Nunca confiar em parâmetros enviados pelo navegador.

Nunca utilizar Roles como única decisão.

Nunca permitir bypass administrativo sem auditoria.

---

# Regras de Negócio

Toda operação protegida deve passar pelo Authorization.

Toda decisão deve ser auditável.

Toda negação deve ser registrada.

Toda permissão deve ser explícita.

Todo recurso possui proprietário.

Toda autorização considera contexto.

---

# Integração com Authentication

Authentication identifica o usuário.

Authorization decide o acesso.

---

# Integração com Subscription

Subscription define recursos disponíveis.

Authorization aplica essas restrições.

---

# Integração com Credits

Credits informa disponibilidade.

Authorization valida se a operação pode continuar.

---

# Integração com Projects

Authorization valida propriedade antes de qualquer alteração.

---

# Integração com Generation

Authorization valida se o usuário pode iniciar a geração solicitada.

---

# Integração com Downloads

Authorization valida acesso antes da geração da URL assinada.

---

# Checklist

Antes de finalizar

✓ Usuário autenticado

✓ Permissão validada

✓ Ownership validado

✓ Plano validado

✓ Auditoria registrada

✓ Eventos publicados

✓ Logs estruturados

✓ Testes implementados

✓ Documentação atualizada

---

# Definition of Done

Uma funcionalidade relacionada à autorização somente está pronta quando

✓ Utiliza políticas centralizadas

✓ Valida proprietário do recurso

✓ Respeita a assinatura do usuário

✓ Registra auditoria

✓ Publica eventos

✓ Nega acesso por padrão

✓ Está documentada

✓ Está testada

✓ Compatível com Clean Architecture

✓ Compatível com arquitetura Serverless

---

# Regras para o OpenCode

Sempre tratar Authorization como a única fonte de decisão sobre permissões.

Nunca implementar verificações de acesso diretamente nos endpoints, serviços ou componentes.

Sempre utilizar políticas reutilizáveis baseadas em **Identity + Resource + Action + Context**.

Toda autorização deve validar autenticação, propriedade do recurso, plano ativo e regras de negócio antes de permitir qualquer operação.

O módulo Authorization deve permanecer independente da autenticação, do armazenamento e da lógica de negócio, sendo responsável exclusivamente por decidir se uma ação pode ou não ser executada.

Toda decisão de acesso no 3DFormio deve ser consistente, auditável, reproduzível e baseada no princípio do menor privilégio.
