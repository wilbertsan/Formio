# Projects

# Objetivo

Este documento define as regras do módulo de projetos do 3DFormio.

Um projeto representa o trabalho do usuário dentro da plataforma.

Todo modelo gerado, parâmetros utilizados e arquivos produzidos pertencem a um projeto.

O projeto é a principal entidade de organização da aplicação.

---

# Filosofia

O projeto representa uma intenção de criação.

O modelo representa o resultado dessa criação.

O STL representa um artefato produzido.

Esses conceitos nunca devem ser misturados.

---

# Objetivos

Garantir

Organização

Histórico

Reprodutibilidade

Escalabilidade

Auditoria

Versionamento

---

# Conceitos

Projeto

Modelo

Parâmetros

Versão

Preview

STL

Categoria

Favorito

Compartilhamento

---

# Entidade Project

Todo projeto deve possuir

ProjectId

UserId

ModelId

CategoryId

Name

Description

Status

Visibility

Version

Parameters

Thumbnail

PreviewUrl

CreatedAt

UpdatedAt

LastGeneratedAt

---

# Identificação

ProjectId deve ser único.

Nunca reutilizar IDs.

Nunca utilizar nomes como identificador.

---

# Propriedade

Todo projeto pertence exatamente a um usuário.

Nunca permitir múltiplos proprietários.

---

# Nome

O nome deve possuir

Valor mínimo

Valor máximo

Caracteres permitidos

Suporte a Unicode

Nunca utilizar o nome como chave de busca principal.

---

# Descrição

Opcional.

Utilizada apenas para organização do usuário.

Nunca conter regras de negócio.

---

# Categorias

Exemplos

Cookie Cutter

Embosser

Lithophane

Keychain

Sign

Organizer

Box

Toy

Decoration

Cada projeto pertence a apenas uma categoria.

---

# Status

DRAFT

READY

GENERATING

COMPLETED

FAILED

ARCHIVED

DELETED

---

# Fluxo

Criar projeto

↓

Editar parâmetros

↓

Gerar Preview

↓

Gerar STL

↓

Salvar resultado

↓

Download

↓

Arquivar

---

# Criação

Ao criar um projeto

Gerar ProjectId.

Criar versão inicial.

Salvar parâmetros padrão.

Registrar auditoria.

Publicar evento.

---

# Atualização

Toda alteração deve atualizar

UpdatedAt

Version

Histórico

Nunca perder versões anteriores.

---

# Versionamento

Cada geração cria uma nova versão lógica.

A versão anterior permanece disponível para auditoria.

Nunca sobrescrever parâmetros históricos.

---

# Parâmetros

Todo projeto deve armazenar

Tipo

Nome

Valor

Unidade

Descrição

Origem

Nunca armazenar apenas valores sem contexto.

---

# Modelo

O projeto referencia um modelo.

Nunca copiar a definição completa do modelo para o projeto.

---

# Preview

O preview representa uma visualização rápida.

Nunca substituir o STL pelo preview.

---

# STL

O STL pertence a uma geração específica.

Nunca armazenar STL diretamente dentro do projeto.

Guardar apenas a referência.

---

# Arquivos

Todo arquivo deve permanecer no S3.

O projeto armazena apenas referências.

Nunca salvar caminhos locais.

---

# Visibilidade

PRIVATE

UNLISTED

PUBLIC

O padrão é PRIVATE.

---

# Favoritos

Um projeto pode ser marcado como favorito.

Essa informação pertence ao usuário.

Não altera o comportamento da geração.

---

# Pesquisa

Permitir busca por

Nome

Categoria

Modelo

Data

Status

Tags

Favoritos

Nunca utilizar Scan no DynamoDB.

---

# Ordenação

Permitir ordenação por

Criação

Atualização

Última geração

Nome

Favoritos

---

# Duplicação

Duplicar um projeto deve

Criar novo ProjectId.

Copiar parâmetros.

Copiar referências.

Nunca compartilhar identidade.

---

# Exclusão

Exclusão lógica.

Alterar status para DELETED.

Nunca remover imediatamente.

---

# Arquivamento

Projetos arquivados permanecem disponíveis.

Não aparecem na listagem padrão.

---

# Recuperação

Projetos arquivados ou excluídos logicamente podem ser restaurados.

Toda restauração deve gerar auditoria.

---

# Compartilhamento

Quando habilitado

Gerar link seguro.

Nunca expor informações internas.

Nunca compartilhar projetos privados sem autorização.

---

# Permissões

Somente o proprietário pode

Editar

Excluir

Arquivar

Duplicar

Gerar STL

Alterar parâmetros

---

# Administração

Administradores podem acessar projetos apenas para

Suporte

Auditoria

Moderação

Nunca modificar conteúdo sem registro.

---

# Eventos

ProjectCreated

ProjectUpdated

ProjectDeleted

ProjectArchived

ProjectRestored

ProjectDuplicated

ProjectShared

ProjectFavorited

ProjectGenerated

---

# Auditoria

Registrar

ProjectId

UserId

Operação

Origem

RequestId

Timestamp

Versão

---

# Histórico

Toda alteração relevante deve permanecer registrada.

Nunca apagar histórico.

---

# Integração com Generation

O projeto solicita uma geração.

A geração produz artefatos.

O projeto registra o resultado.

---

# Integração com Credits

Projetos não consomem créditos.

Apenas gerações consomem créditos.

---

# Integração com Subscription

O plano pode limitar

Quantidade de projetos

Categorias Premium

Espaço disponível

A lógica pertence ao módulo Subscription.

---

# Integração com Storage

O projeto nunca manipula arquivos diretamente.

Todo acesso ocorre através do módulo Storage.

---

# Performance

Carregar apenas os metadados na listagem.

Nunca carregar STL.

Nunca carregar previews pesados desnecessariamente.

Paginar resultados.

---

# Modelagem DynamoDB

Partition Key

UserId

Sort Key

ProjectId

Criar índices para

Status

Categoria

Última atualização

Favoritos

---

# Segurança

Validar proprietário.

Validar assinatura.

Validar permissões.

Nunca confiar no frontend.

---

# Logs

Registrar

ProjectId

UserId

Operation

Duration

Status

RequestId

---

# Anti-Padrões

Nunca excluir projetos fisicamente por padrão.

Nunca armazenar STL no projeto.

Nunca sobrescrever versões.

Nunca compartilhar projetos privados automaticamente.

Nunca utilizar nomes como identificadores.

Nunca misturar projeto com geração.

---

# Regras de Negócio

Todo usuário pode possuir múltiplos projetos.

Todo projeto pertence a apenas um usuário.

Todo projeto possui histórico.

Toda alteração gera auditoria.

Toda geração referencia um projeto.

Todo projeto pode ser reproduzido utilizando seus parâmetros.

---

# Checklist

Antes de finalizar

✓ Projeto criado corretamente

✓ Parâmetros persistidos

✓ Histórico atualizado

✓ Eventos publicados

✓ Auditoria registrada

✓ Permissões validadas

✓ Versionamento preservado

✓ Testes implementados

✓ Documentação atualizada

---

# Definition of Done

Uma funcionalidade relacionada a projetos somente está pronta quando

✓ Mantém histórico

✓ Mantém versionamento

✓ Preserva auditoria

✓ Publica eventos

✓ Respeita permissões

✓ É escalável

✓ Está documentada

✓ Está testada

✓ Compatível com Clean Architecture

---

# Regras para o OpenCode

Sempre tratar o projeto como a entidade central da experiência do usuário.

Nunca armazenar arquivos diretamente dentro do projeto.

Sempre preservar o histórico de alterações.

Toda modificação deve gerar eventos, auditoria e atualização da versão.

O módulo Projects deve permanecer responsável apenas pelos metadados, organização e ciclo de vida dos projetos, delegando geração ao módulo Generation, armazenamento ao módulo Storage, autenticação ao módulo Authentication e controle de créditos ao módulo Credits.

Os projetos devem ser reproduzíveis, auditáveis e independentes da infraestrutura utilizada para gerar os modelos 3D.
