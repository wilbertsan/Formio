# AWS Amplify Gen 2 — Form Builder

## Objetivo

Use o Amplify Form Builder para gerar formulários React conectados aos modelos do Amplify Data. Formulários conectados criam ou atualizam registros automaticamente, sem necessidade de implementar manualmente `onSubmit` para o fluxo padrão. Os formulários são construídos com Amplify UI.

## Pré-requisitos

* Aplicação Next.js/React configurada com Amplify Gen 2.
* Recurso Amplify Data configurado e disponível no sandbox.
* Biblioteca UI instalada:

```bash
npm add @aws-amplify/ui-react
```

* Gere os formulários após o modelo de dados estar disponível:

```bash
npx ampx generate forms
```

O comando gera formulários Create e Update para cada modelo, normalmente em `ui-components/`, além dos arquivos GraphQL e utilitários necessários.

## Geração dos formulários

A geração pode produzir arquivos como:

```text
ui-components/
├── graphql/
├── TodoCreateForm.jsx
├── TodoCreateForm.d.ts
├── TodoUpdateForm.jsx
├── TodoUpdateForm.d.ts
├── utils.js
└── index.js
```

Se o modelo de dados for alterado, faça backup de `ui-components/` antes de executar novamente `npx ampx generate forms`, pois os arquivos gerados podem ser sobrescritos.

## Configuração da aplicação

Configure Amplify e os estilos do Amplify UI no entrypoint:

```tsx
import '@aws-amplify/ui-react/styles.css';
import { ThemeProvider } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json';

Amplify.configure(outputs);
```

Use `ThemeProvider` envolvendo a aplicação:

```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

Depois importe o formulário:

```tsx
import { TodoCreateForm } from './ui-components';

export default function App() {
  return <TodoCreateForm />;
}
```

## Create e Update

Formulários podem ser Create ou Update.

* Create: inicia com campos vazios e, quando conectado ao modelo, cria um novo registro.
* Update: espera dados para pré-preencher os campos.
* Update conectado pode receber `id`:

```tsx
<AuthorUpdateForm id="record-id" />
```

* Também pode receber o registro através da prop correspondente ao modelo:

```tsx
<AuthorUpdateForm author={authorRecord} />
```

## Personalização com overrides

Formulários gerados permitem sobrescrever propriedades dos componentes através de `overrides`:

```tsx
<TodoCreateForm
  overrides={{
    content: {
      variation: 'quiet',
      label: 'Todo'
    }
  }}
/>
```

É possível personalizar componentes como `TextField`, `TextAreaField` e `SelectField`. Evite sobrescrever propriedades que já são definidas pelo formulário gerado, pois isso pode causar comportamento inesperado. Verifique o JSX gerado antes de alterar propriedades.

## Campos adicionados manualmente

Quando um novo campo é necessário no formulário, atualize o componente gerado considerando:

1. `initialValues`.
2. Estado React do novo campo.
3. `resetStateValues`.
4. Regras em `validations`.
5. Inclusão do campo em `onSubmit`.
6. Componente visual (`TextField`, `SelectField`, etc.).
   O campo deve integrar `onChange`, validação, `errorMessage`, `hasError` e `getOverrideProps`.

## Campos de opções

Para valores predefinidos utilize `SelectField`, `RadioGroupField` ou `AutocompleteField`.
Exemplo:

```tsx
<SelectField
  label="Status"
  placeholder="Selecione"
  value={status}
  onChange={e => setStatus(e.target.value)}
>
  <option value="Not started">Not started</option>
  <option value="In progress">In progress</option>
  <option value="Done">Done</option>
</SelectField>
```

## Espaçamento e botões

Use `overrides` para configurar layout:

```tsx
<TodoCreateForm
  overrides={{
    TodoCreateForm: {
      rowGap: 'xl',
      columnGap: 'xs',
      padding: 'xl'
    }
  }}
/>
```

Valores podem ser CSS (`px`, `rem`, `em`, `%`) ou valores de espaçamento do tema (`xss`, `medium`, `large`).

Personalize botões:

```tsx
overrides={{
  ClearButton: { children: 'Fechar' },
  SubmitButton: { children: 'Salvar' }
}}
```

Também é possível ocultá-los:

```tsx
overrides={{
  ClearButton: { display: 'none' },
  SubmitButton: { display: 'none' }
}}
```

Quando os botões são ocultados, `onChange` pode ser usado para controlar um fluxo de atualização em tempo real.

## FileUploader

Para upload de arquivos, o formulário pode utilizar `FileUploader`, integrado ao Amplify Storage/S3. O aplicativo precisa ter Authentication e Storage habilitados. O upload ocorre quando o arquivo é selecionado e o componente retorna uma chave S3 que pode ser armazenada no modelo.

Importe:

```tsx
import { FileUploader } from '@aws-amplify/ui-react-storage';
import { processFile } from './utils';
```

Exemplo:

```tsx
<FileUploader
  accessLevel="public"
  maxFileCount={10}
  acceptedFileTypes={['image/*']}
  processFile={processFile}
  onUploadSuccess={({ key }) =>
    setImages(prev => [...prev, key])
  }
  onFileRemove={({ key }) =>
    setImages(prev => prev.filter(img => img !== key))
  }
/>
```

Para uma única imagem, use `maxFileCount={1}` e armazene a chave diretamente no campo.

## Chaves S3

O `FileUploader` gera chaves S3 únicas usando o conteúdo do arquivo para reduzir colisões. Arquivos diferentes com o mesmo nome não sobrescrevem automaticamente o arquivo anterior. Arquivos idênticos podem ser tratados como duplicados. Com acesso `private` ou `protected`, arquivos idênticos de usuários diferentes permanecem separados; com `public`, podem ocorrer sobrescritas quando a chave for igual.

## Validações automáticas

O Form Builder infere validações a partir do modelo.
Strings suportam regras como:

* começa com;
* termina com;
* contém;
* não contém;
* tamanho menor que N;
* tamanho mínimo N.

`Int` e `Float` suportam maior que, menor que e igual a.
`AWSDate`, `AWSTime` e `AWSDateTime` suportam antes/depois.

Tipos especiais possuem validações automáticas:

* `AWSIPAddress`: IPv4 ou IPv6 válido.
* `AWSURL`: URL válida com schema e path.
* `AWSEmail`: formato de e-mail válido.
* `AWSJSON`: JSON válido.
* `AWSPhone`: telefone válido com espaços ou hífens.

## Validação customizada

Use `onValidate` para adicionar regras:

```tsx
<HomeCreateForm
  onValidate={{
    address: (value, validationResponse) => {
      if (!value.startsWith('0')) {
        return {
          hasError: true,
          errorMessage: 'Valor inválido'
        };
      }
      return validationResponse;
    }
  }}
/>
```

A função deve retornar:

```ts
type ValidationResponse = {
  hasError: boolean;
  errorMessage?: string;
};
```

## JSON aninhado

Para dados JSON aninhados, a estrutura de `onValidate` deve acompanhar a estrutura dos dados:

```tsx
<ProductForm
  onValidate={{
    price: {
      currency: (value, validationResponse) => {
        const allowed = ['$', '€', '￥', '₹'];
        if (!allowed.includes(value)) {
          return {
            hasError: true,
            errorMessage: 'Moeda inválida'
          };
        }
        return validationResponse;
      }
    }
  }}
/>
```

## Validação assíncrona

`onValidate` pode retornar uma `Promise`, permitindo validar dados através de APIs ou bancos externos:

```tsx
<AgentContactForm
  onValidate={{
    licenseNumber: async (value, validationResponse) => {
      const response = await fetch(`/api/agent/${value}`);
      if (response.status !== 200) {
        return {
          hasError: true,
          errorMessage: 'Registro não encontrado'
        };
      }
      return validationResponse;
    }
  }}
/>
```

Use essa abordagem quando a validade do campo depender de uma fonte externa.

## Ciclo de vida

O ciclo de vida padrão é:

1. Estado inicial.
2. `onChange`.
3. `onValidate`.
4. `onSubmit`.
5. `onSuccess`.
6. `onError`.
7. `onCancel`.

O estado inicial contém valores vazios ou valores padrão e é restaurado por Clear/Reset. `onChange` ocorre quando os dados mudam; `onValidate` ocorre depois de `onChange`.

## onChange

Use `onChange` para obter os dados em tempo real:

```tsx
const [formData, setFormData] = useState();

<HomeCreateForm
  onChange={fields => setFormData(fields)}
/>
```

É adequado para previews, cálculos em tempo real, autosave e formulários controlados.

## onSubmit

`onSubmit` é o mecanismo padrão para tratar o envio. Ele pode modificar os dados antes que sejam persistidos. O objeto retornado pelo handler será salvo no backend quando o formulário estiver conectado a um modelo:

```tsx
<HomeCreateForm
  onSubmit={fields => {
    const updatedFields = {};
    Object.keys(fields).forEach(key => {
      updatedFields[key] =
        typeof fields[key] === 'string'
          ? fields[key].trim()
          : fields[key];
    });
    return updatedFields;
  }}
/>
```

## onSuccess

Executado quando a persistência no cloud é concluída com sucesso. Use para fechar o formulário, redirecionar ou atualizar a interface:

```tsx
<HomeCreateForm
  onSuccess={() => setShowForm(false)}
/>
```

Disponível para formulários conectados a modelos.

## onError

Executado quando ocorre erro durante o salvamento:

```tsx
<HomeCreateForm
  onError={error => {
    console.error(error);
  }}
/>
```

Use para logging, diagnóstico e apresentação de mensagens apropriadas ao usuário.

## onCancel

Executado quando o usuário cancela a operação:

```tsx
<HomeCreateForm
  onCancel={() => setShowForm(false)}
/>
```

Use para fechar o formulário, retornar à página anterior ou cancelar o fluxo sem persistir os dados.

## Regras para o projeto

* Prefira formulários gerados pelo `npx ampx generate forms`.
* Não altere desnecessariamente propriedades internas dos componentes gerados.
* Faça backup de `ui-components` antes de regenerar formulários.
* Use `overrides` para personalizações simples.
* Para campos complexos, altere o componente gerado seguindo o padrão existente.
* Use `onValidate` para regras de negócio de validação.
* Preserve `validationResponse` quando a validação automática também deve continuar.
* Use validação assíncrona somente quando a regra depender de fonte externa.
* Use `onSubmit` para normalização dos dados antes da persistência.
* Use `onSuccess`, `onError` e `onCancel` para controlar o fluxo da interface.
* Para uploads, utilize `FileUploader` integrado ao Amplify Storage e armazene a chave S3 no modelo.
* Não coloque lógica sensível exclusivamente em validações do frontend; regras críticas devem ser protegidas também no backend.

## Referências oficiais

* Connected Forms: https://docs.amplify.aws/nextjs/build-ui/formbuilder/
* Customização: https://docs.amplify.aws/nextjs/build-ui/formbuilder/customize/
* Inputs especiais: https://docs.amplify.aws/nextjs/build-ui/formbuilder/special-inputs/
* Validações: https://docs.amplify.aws/nextjs/build-ui/formbuilder/validations/
* Lifecycle: https://docs.amplify.aws/nextjs/build-ui/formbuilder/lifecycle/
