# Domain

# 3DFormio

## Objetivo

O 3DFormio é um SaaS para criação de modelos 3D paramétricos destinados à impressão 3D.

O objetivo da plataforma é permitir que qualquer usuário, mesmo sem conhecimento em CAD, consiga gerar arquivos STL profissionais através de parâmetros simples.

O usuário nunca modela manualmente.

Ele apenas escolhe um tipo de produto, informa parâmetros e o sistema gera automaticamente um modelo utilizando CadQuery.

---

# Missão

Transformar qualquer pessoa em um criador de modelos para impressão 3D.

O sistema deve ser:

- simples
- rápido
- intuitivo
- profissional
- escalável

---

# Público

Confeiteiros

Cake Designers

Artesãos

Empresas

Professores

Makers

Hobbistas

Usuários de Impressão 3D

---

# Fluxo Principal

Landing

↓

Cadastro

↓

Confirmação de Email

↓

Login

↓

Escolha do Plano

↓

Dashboard

↓

Selecionar Categoria

↓

Selecionar Modelo

↓

Configurar Parâmetros

↓

Gerar Preview

↓

Gerar STL

↓

Salvar Projeto

↓

Download

↓

Histórico

---

# Filosofia

Todo modelo deve ser paramétrico.

Nenhum STL será armazenado manualmente.

Todos os arquivos são gerados automaticamente.

O usuário compra acesso ao sistema, não ao arquivo.

---

# Conceitos do Domínio

## Usuário

Representa quem utiliza a plataforma.

Pode possuir:

Plano

Projetos

Downloads

Histórico

Favoritos

Configurações

---

## Plano

Define quais recursos o usuário possui.

Exemplos

Free

Starter

Pro

Business

Enterprise

Cada plano define

Quantidade de gerações

Downloads

Modelos Premium

Resolução

Limite diário

Espaço utilizado

---

## Créditos

Toda geração pode consumir créditos.

Créditos podem ser:

Mensais

Comprados

Promocionais

Bônus

Nunca podem ficar negativos.

---

## Projeto

Representa um trabalho salvo pelo usuário.

Contém

Nome

Categoria

Modelo

Parâmetros

Preview

Data

Versão

Status

---

## Modelo

Representa um template paramétrico.

Exemplos

Cortador

Carimbo

Topo de bolo

Letreiro

Chaveiro

Cookie Cutter

Molde

Textura

Organizador

Suporte

Brinquedo

Decoração

Cada modelo possui parâmetros próprios.

---

## Categoria

Agrupa modelos.

Exemplo

Confeitaria

↓

Cortadores

↓

Animais

↓

Dinossauros

---

# Parâmetros

Todo modelo recebe parâmetros.

Exemplos

Altura

Largura

Espessura

Raio

Texto

Fonte

Imagem

Quantidade

Borda

Escala

Margem

Profundidade

Arredondamento

Furo

Orientação

Cada parâmetro deve possuir

Nome

Tipo

Valor padrão

Valor mínimo

Valor máximo

Descrição

Validação

---

# Preview

Antes da geração final o usuário visualiza o modelo.

Preview deve ser leve.

Nunca utilizar STL definitivo para preview.

Preferir malhas simplificadas.

---

# Geração

Toda geração segue exatamente este fluxo.

Receber parâmetros

↓

Validar parâmetros

↓

Criar objeto CadQuery

↓

Validar sólido

↓

Gerar Mesh

↓

Exportar STL

↓

Salvar S3

↓

Registrar banco

↓

Disponibilizar Download

---

# STL

Todo STL deve ser

Manifold

Fechado

Sem faces invertidas

Sem auto interseções

Imprimível

Compatível com PrusaSlicer

Compatível com OrcaSlicer

Compatível com Cura

---

# Download

Todo download deve ser autenticado.

Nunca disponibilizar arquivos públicos.

Utilizar URL temporária do S3.

---

# Histórico

Guardar

Projeto

Data

Tempo de geração

Versão

Parâmetros

Tamanho STL

Downloads

---

# Biblioteca

O usuário pode reutilizar projetos antigos.

Duplicar projeto.

Editar projeto.

Excluir projeto.

Compartilhar projeto.

---

# Favoritos

Usuário pode favoritar modelos.

Favoritos aparecem primeiro.

---

# Busca

Permitir busca por

Nome

Categoria

Tags

Texto

Popularidade

---

# Administração

Administrador pode

Criar categorias

Criar modelos

Editar parâmetros

Bloquear usuários

Gerenciar planos

Gerenciar afiliados

Visualizar métricas

---

# Afiliados

Usuário pode desbloquear recursos através de parceiros.

Parceiros

Amazon

Mercado Livre

Shopee

Outros

Toda comissão deve ser registrada.

---

# Pagamentos

Suportar

Assinatura

Compra de créditos

Upgrade

Downgrade

Cupom

Cashback

Reembolso

---

# Eventos

Eventos importantes

Usuário criado

Plano adquirido

Crédito recebido

Projeto criado

Preview gerado

STL gerado

Download realizado

Pagamento aprovado

Pagamento cancelado

---

# Regras de Negócio

Nunca gerar STL inválido.

Nunca permitir download sem autenticação.

Nunca permitir geração acima do limite do plano.

Nunca consumir créditos quando ocorrer erro.

Toda geração deve possuir rastreabilidade.

Toda alteração importante deve gerar log.

---

# Performance

A geração deve ser assíncrona.

Operações pesadas não devem bloquear a interface.

Sempre retornar progresso da geração.

---

# Segurança

Todos os endpoints exigem autenticação.

Uploads devem possuir limite de tamanho.

Validar todos os parâmetros.

Nunca executar código enviado pelo usuário.

Nunca utilizar eval().

---

# Escalabilidade

O sistema deve suportar milhares de usuários simultâneos.

Nenhuma funcionalidade deve depender de estado local da Lambda.

Todo processamento deve ser stateless.

Arquivos temporários devem ser descartados automaticamente.

---

# Objetivo Final

O usuário deve conseguir criar um modelo profissional em menos de dois minutos.

Toda experiência deve ser simples, rápida e intuitiva.

Sempre priorizar facilidade de uso em vez de complexidade técnica.
