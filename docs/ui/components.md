# Amplify UI React — Componentes

## Objetivo

Use esta documentação como referência para implementar interfaces React com `@aws-amplify/ui-react`. Amplify UI fornece componentes acessíveis, responsivos, componíveis e tematizáveis, construídos com React e CSS. Os componentes podem ser usados isoladamente ou combinados com outros frameworks de estilização.

## Instalação

```bash
npm install @aws-amplify/ui-react aws-amplify
```

ou:

```bash
yarn add @aws-amplify/ui-react aws-amplify
```

Importe o CSS padrão no ponto de entrada da aplicação:

```tsx
import '@aws-amplify/ui-react/styles.css';
```

O tema padrão pode ser customizado posteriormente.

## Importação

```tsx
import {
  View,Flex,Grid,Text,Heading,Button,Card,
  Input,TextField,SelectField,CheckboxField,
  Table,Avatar,Badge,Alert
} from '@aws-amplify/ui-react';
```

## Princípios

* Prefira componentes Amplify UI antes de criar componentes equivalentes manualmente.
* Combine componentes pequenos para formar interfaces maiores.
* Use props de estilo quando forem suficientes.
* Preserve a semântica HTML utilizando `Heading`, `Text`, `View`, `Link` e campos apropriados.
* Prefira componentes acessíveis em vez de elementos HTML customizados sem comportamento acessível.
* Utilize componentes de layout para estruturar páginas.
* Utilize componentes de feedback para estados de carregamento, erro e sucesso.
* Utilize componentes de entrada para formulários consistentes.

## Componentes Base

### View

Componente fundamental de layout. Renderiza `<div>` por padrão e pode renderizar outros elementos HTML através de `as`. Suporta propriedades de estilo.

```tsx
<View padding="1rem" backgroundColor="white">
  Conteúdo
</View>
```

Para alterar o elemento:

```tsx
<View as="section">Seção</View>
```

Também suporta estados como `isDisabled`.

### Text

Use para textos simples e conteúdo equivalente semanticamente a `<p>`.

### Heading

Use para títulos semânticos. Suporta níveis `1` a `6`; o padrão é `6`.

```tsx
<Heading level={2}>Título</Heading>
```

Não use `Text` para substituir títulos semânticos.

### Icon

Exibe gráficos vetoriais simples e pode ser utilizado dentro de outros componentes, como botões.

### Image

Exibe imagens responsivas.

### ScrollView

Funciona como um `View` com capacidade de rolagem do conteúdo interno.

### Divider

Cria separações visuais entre conteúdos e ajuda a organizar o ritmo visual da interface.

## Feedback

### Alert

Exibe mensagens importantes sem interromper a tarefa. É apropriado para feedback que deve ser percebido por leitores de tela.

### Loader

Indica que uma operação está sendo processada.

### Message

Exibe mensagens de feedback ao usuário.

### Placeholder

Use durante carregamento assíncrono.

```tsx
<Placeholder />
```

Controle o estado carregado:

```tsx
<Placeholder isLoaded={true} />
```

Tamanhos disponíveis: padrão, `small` e `large`.

## Navegação

### Breadcrumbs

Mostra a hierarquia e localização atual do usuário dentro da aplicação.

### Link

Renderiza `<a>` por padrão.

```tsx
<Link href="/dashboard">Dashboard</Link>
```

Para links externos:

```tsx
<Link href="https://example.com" isExternal>
  Abrir site
</Link>
```

`isExternal` configura `target="_blank"` e `rel="noopener noreferrer"`. O componente também pode ser integrado a bibliotecas de roteamento.

### Menu

Menu interativo e acessível para seleção de ações. O dropdown adapta sua posição quando necessário.

### Tabs

Organiza conteúdo em múltiplas seções navegáveis.

## Inputs

### Button

Use para ações como submit, abrir diálogos, cancelar operações ou excluir recursos.

```tsx
<Button variation="primary">Salvar</Button>
```

### Input

Controle de entrada genérico.

### TextField

Campo de texto com integração apropriada para formulários.

### TextAreaField

Campo para entrada de texto multilinha.

### PasswordField

Entrada de senha com suporte a gerenciadores de senha e opção de mostrar/ocultar senha.

### PhoneNumberField

Entrada específica para números de telefone.

### SearchField

Campo para consultas de pesquisa.

### Autocomplete

Combina entrada de pesquisa com lista de sugestões.

### SelectField

Cria um campo de seleção/dropdown.

### CheckboxField

Permite selecionar um ou vários itens.

### RadioGroupField

Permite escolher uma única opção entre alternativas mutuamente exclusivas.

### SwitchField

Controle de estado ligado/desligado.

### ToggleButton

Representa estados alternáveis, como ativar/desativar uma configuração.

### SliderField

Permite selecionar rapidamente um valor dentro de limites definidos. Use quando os limites mínimo e máximo são invariáveis.

### StepperField

Campo numérico com controles para aumentar ou diminuir o valor.

### DropZone

Permite capturar arquivos utilizando arrastar e soltar.

### Fieldset

Agrupa campos relacionados de um formulário.

### Label

Fornece uma legenda/caption para um controle de interface.

## Layout

### Flex

Container baseado em Flexbox.

```tsx
<Flex direction="column" gap="medium">
  <Text>Título</Text>
  <Button>Continuar</Button>
</Flex>
```

### Grid

Container baseado em CSS Grid. Use para layouts em linhas e colunas.

### Card

Agrupa conteúdo relacionado em uma superfície visual.

```tsx
<Card variation="elevated">
  <Heading level={3}>Produto</Heading>
  <Text>Descrição</Text>
</Card>
```

### Accordion

Permite expandir e recolher seções de conteúdo.

### Collection

Combina `Flex` e `Grid` para renderizar coleções de dados.

### Pagination

Navegação entre grandes conjuntos de conteúdo distribuídos em páginas.

### Table

Tabela estilizada e customizável para dados tabulares.

## Data Display

### Avatar

Representa um usuário utilizando imagem, iniciais ou ícone de fallback.

### Badge

Pequeno indicador visual para status, categorias, mensagens ou rótulos.

### Rating

Exibe uma avaliação somente para leitura.

## Utilities

### HighlightMatch

Destaca uma parte específica de um texto, útil em resultados de pesquisa.

### VisuallyHidden

Oculta visualmente conteúdo mantendo-o disponível para leitores de tela. Use para informações necessárias à acessibilidade.

## Composição Recomendada

Combine componentes especializados em vez de criar estruturas equivalentes manualmente:

```tsx
<Card>
  <Flex direction="column" gap="medium">
    <Heading level={2}>Produto</Heading>
    <Text color="font.tertiary">Descrição do produto</Text>
    <Badge variation="success">Disponível</Badge>
    <Flex>
      <StepperField label="Quantidade" min={0} max={10} step={1} />
      <Button variation="primary">Adicionar</Button>
    </Flex>
  </Flex>
</Card>
```

A abordagem de composição é um dos principais objetivos do Amplify UI e permite construir interfaces complexas a partir de primitives menores.

## Estilização

Os componentes aceitam style props, classes CSS e tokens/variáveis do Amplify UI.
Exemplo:

```tsx
<Text fontSize="xl" fontWeight="bold">
  Título
</Text>
```

CSS pode utilizar variáveis Amplify:

```css
[data-amplify-theme] {
  --amplify-components-link-color: var(--amplify-colors-purple-80);
}
```

Também é possível utilizar classes como `.amplify-link` para estilização global.

## Responsividade

Prefira os recursos de layout do Amplify UI (`Flex`, `Grid`, `View`) para criar interfaces responsivas. Utilize as propriedades de estilo e tokens disponíveis em vez de valores CSS repetidos.

## Acessibilidade

* Use `Heading` para hierarquia semântica.
* Use `Label` associado aos campos.
* Prefira componentes de input especializados.
* Use `VisuallyHidden` quando informação precisa estar disponível para tecnologias assistivas sem aparecer visualmente.
* Não substitua componentes acessíveis por elementos customizados sem necessidade.
* Use `isDisabled` para estados desabilitados quando suportado.
* Garanta textos alternativos apropriados em `Image`.
* Use `Alert` para mensagens importantes que precisam ser percebidas por tecnologias assistivas.

## Padrão para OpenCode

Ao implementar UI:

1. Verifique se existe um componente Amplify UI adequado.
2. Importe diretamente de `@aws-amplify/ui-react`.
3. Prefira composição (`Card` + `Flex` + `Text` + `Button`) a componentes monolíticos.
4. Use `View` como primitive genérica quando não existir um componente especializado.
5. Use componentes semânticos para texto e títulos.
6. Use style props antes de criar CSS específico.
7. Utilize CSS variables/tokens para customizações globais.
8. Preserve acessibilidade e responsividade.
9. Não recrie `Button`, `Input`, `Tabs`, `Modal-like` ou componentes de layout já disponíveis sem uma necessidade específica.
10. Mantenha componentes de negócio separados dos primitives visuais.

## Categorias de Referência

Base: `Divider`, `Heading`, `Icon`, `Image`, `ScrollView`, `Text`, `View`.
Feedback: `Alert`, `Loader`, `Message`, `Placeholder`.
Navigation: `Breadcrumbs`, `Link`, `Menu`, `Tabs`.
Inputs: `Autocomplete`, `Button`, `CheckboxField`, `DropZone`, `Fieldset`, `Input`, `Label`, `PasswordField`, `PhoneNumberField`, `RadioGroupField`, `SearchField`, `SelectField`, `SliderField`, `StepperField`, `SwitchField`, `TextField`, `TextAreaField`, `ToggleButton`.
Layout: `Accordion`, `Card`, `Collection`, `Flex`, `Grid`, `Pagination`, `Table`.
Data display: `Avatar`, `Badge`, `Rating`.
Utilities: `HighlightMatch`, `VisuallyHidden`.

## Fonte

Documentação oficial: https://ui.docs.amplify.aws/react/components
