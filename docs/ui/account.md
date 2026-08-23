# Amplify UI React — Account Settings

Documentação para implementação no projeto usando `@aws-amplify/ui-react` e `aws-amplify`.

## 1. Visão geral

`AccountSettings` fornece componentes standalone para implementar fluxos de gerenciamento da conta com pouco boilerplate. Os principais componentes documentados são:

* `AccountSettings.ChangePassword`: alteração de senha.
* `AccountSettings.DeleteUser`: exclusão permanente da conta.
  Os componentes exigem que o usuário final esteja autenticado. O `Authenticator` pode ser utilizado para fornecer a interface de autenticação.

## 2. Instalação

```bash
npm install @aws-amplify/ui-react aws-amplify
```

ou:

```bash
yarn add @aws-amplify/ui-react aws-amplify
```

O backend pode ser configurado com Amplify CLI. A documentação recomenda atualizar versões antigas do CLI antes da utilização dos componentes.

## 3. Next.js

Os componentes Amplify UI são interativos e funcionam no client side. Em Next.js 13.4+ usando App Router, componentes que utilizam Account Settings devem estar dentro de um Client Component com:

```tsx
'use client';
```

No Pages Router não são necessárias alterações específicas para utilizar os componentes.

## 4. Importação

```tsx
import { AccountSettings } from '@aws-amplify/ui-react';
```

## 5. ChangePassword

`AccountSettings.ChangePassword` fornece uma interface pronta para o usuário alterar sua senha.

Uso básico:

```tsx
function App() {
  const handleSuccess = () => {
    alert('Password successfully changed!');
  };

  return (
    <AccountSettings.ChangePassword
      onSuccess={handleSuccess}
    />
  );
}
```

### Props

| Prop          | Tipo                        | Finalidade                            |
| ------------- | --------------------------- | ------------------------------------- |
| `onSuccess`   | `() => void`                | Executado após alteração bem-sucedida |
| `onError`     | `(error: Error) => void`    | Executado quando ocorre erro          |
| `validators`  | `ValidatorOptions[]`        | Validações personalizadas             |
| `components`  | `ChangePasswordComponents`  | Substitui partes da UI                |
| `displayText` | `ChangePasswordDisplayText` | Personaliza textos                    |

`onSuccess` pode ser utilizado para navegar para outra rota ou exibir uma mensagem de confirmação.

## 6. Validação de senha

O `validators` permite substituir/adicionar validações personalizadas:

```tsx
const minLength = {
  validationMode: 'onChange',
  validator: (password: string) => password.length >= 8,
  message: 'Password must have at least 8 characters',
};
```

Modos disponíveis:

* `onBlur`: valida a cada evento de blur.
* `onChange`: valida a cada alteração.
* `onTouched`: valida no primeiro blur e depois a cada alteração.

Múltiplos validators podem ser enviados:

```tsx
<AccountSettings.ChangePassword
  validators={[minLength]}
/>
```

## 7. Slots do ChangePassword

`components` permite substituir partes específicas:

* `CurrentPasswordField`
* `NewPasswordField`
* `ConfirmPasswordField`
* `ErrorMessage`
* `SubmitButton`

É possível reutilizar os componentes padrão:

```tsx
const components = {
  NewPasswordField: (props) => (
    <AccountSettings.ChangePassword.NewPasswordField
      {...props}
      label="Nova senha"
    />
  ),
};
```

Sempre propague `...props`, pois handlers como `onChange`, `onBlur` e atributos HTML como `name` precisam chegar ao elemento interno.

### Props dos Password Fields

Os campos possuem:

* `onBlur`
* `onChange`
* `name`
* `fieldValidationErrors?: string[]`

Exemplo com HTML:

```tsx
CurrentPasswordField: ({
  fieldValidationErrors,
  name,
  onBlur,
  onChange,
}) => (
  <>
    <input
      name={name}
      onBlur={onBlur}
      onChange={onChange}
      type="password"
    />
    {fieldValidationErrors?.map((error) => (
      <p key={error} role="alert">{error}</p>
    ))}
  </>
)
```

## 8. SubmitButton

O `SubmitButton` recebe `isDisabled` e deve impedir interação enquanto a operação estiver indisponível:

```tsx
const components = {
  SubmitButton: ({ onClick, isDisabled }) => (
    <button
      type="submit"
      onClick={onClick}
      disabled={isDisabled}
    >
      Alterar senha
    </button>
  ),
};
```

Também é possível reutilizar `AccountSettings.ChangePassword.SubmitButton`.

## 9. Textos do ChangePassword

Todos os textos podem ser personalizados:

```tsx
<AccountSettings.ChangePassword
  displayText={{
    currentPasswordLabel: 'Senha atual',
    newPasswordLabel: 'Nova senha',
    confirmPasswordLabel: 'Confirmar senha',
    updatePasswordText: 'Atualizar senha',
  }}
/>
```

## 10. DeleteUser

`AccountSettings.DeleteUser` permite ao usuário excluir permanentemente sua própria conta.

Uso básico:

```tsx
function App() {
  const handleSuccess = () => {
    alert('User successfully deleted');
  };

  return (
    <AccountSettings.DeleteUser
      onSuccess={handleSuccess}
    />
  );
}
```

### Props

| Prop           | Tipo                                        | Finalidade                   |
| -------------- | ------------------------------------------- | ---------------------------- |
| `onSuccess`    | `() => void`                                | Executado após exclusão      |
| `onError`      | `(error: Error) => void`                    | Executado quando ocorre erro |
| `handleDelete` | `(user: AuthUser) => Promise<void> \| void` | Handler personalizado        |
| `components`   | `DeleteUserComponents`                      | Substitui partes da UI       |
| `displayText`  | `DeleteUserDisplayText`                     | Personaliza textos           |

`onSuccess` pode executar navegação, limpeza de estado ou exibir confirmação.

## 11. Handler personalizado

`handleDelete` permite executar lógica adicional antes/depois da exclusão:

```tsx
const handleDelete = async () => {
  await cleanupApplicationData();
  await Auth.deleteUser();
};

<AccountSettings.DeleteUser
  handleDelete={handleDelete}
/>
```

Use esse recurso quando a aplicação precisar realizar limpeza adicional relacionada ao usuário.

## 12. Slots do DeleteUser

`components` suporta:

* `DeleteButton`
* `ErrorMessage`
* `WarningView`

Exemplo:

```tsx
const components = {
  DeleteButton: (props) => (
    <AccountSettings.DeleteUser.DeleteButton {...props}>
      Excluir minha conta
    </AccountSettings.DeleteUser.DeleteButton>
  ),
};

<AccountSettings.DeleteUser components={components} />
```

Ao criar componentes próprios, propague os props recebidos para preservar eventos e atributos necessários.

## 13. DeleteButton

Props principais:

* `onClick`: handler acionado ao clicar.
* `isDisabled`: indica se a exclusão está em andamento.

```tsx
DeleteButton: ({ onClick, isDisabled }) => (
  <button
    onClick={onClick}
    disabled={isDisabled}
  >
    Excluir conta
  </button>
)
```

## 14. ErrorMessage

Recebe `children` contendo a mensagem de erro:

```tsx
const components = {
  ErrorMessage: ({ children }) => (
    <Text variation="warning">{children}</Text>
  ),
};
```

Pode ser combinado com `Heading`, `Text` ou outros componentes Amplify UI.

## 15. WarningView

`WarningView` controla a confirmação da exclusão.
Props:

* `onCancel`: cancela a operação.
* `onConfirm`: confirma a exclusão.
* `isDisabled`: indica operação em andamento.

Uma implementação personalizada pode exigir que o usuário digite `delete` antes de permitir a confirmação.

Exemplo conceitual:

```tsx
function CustomWarning({ onCancel, onConfirm, isDisabled }) {
  const [value, setValue] = useState('');

  return (
    <>
      <Text variation="warning">
        A exclusão da conta não pode ser revertida.
      </Text>
      <TextField
        label="Confirmar exclusão"
        placeholder="delete"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button onClick={onCancel}>Cancelar</Button>
      <Button
        onClick={onConfirm}
        isDisabled={isDisabled || value !== 'delete'}
      >
        Excluir
      </Button>
    </>
  );
}
```

## 16. Textos do DeleteUser

```tsx
<AccountSettings.DeleteUser
  displayText={{
    deleteAccountText: 'Excluir conta',
    cancelButtonText: 'Cancelar',
    confirmDeleteButtonText: 'Excluir conta',
    warningText: 'Tem certeza que deseja excluir sua conta?',
  }}
/>
```

Todos os textos da interface podem ser substituídos por `displayText`.

## 17. Theming

`ChangePassword` e `DeleteUser` utilizam o sistema de theming do Amplify UI. O projeto pode definir tokens de design e fornecer o tema através de `ThemeProvider`.

```tsx
import {
  AccountSettings,
  Card,
  ThemeProvider,
} from '@aws-amplify/ui-react';

const theme = {
  name: 'custom-theme',
  tokens: {
    colors: {
      border: {
        primary: { value: '{colors.neutral.40}' },
        secondary: { value: '{colors.neutral.20}' },
        tertiary: { value: '{colors.neutral.10}' },
      },
    },
    radii: {
      small: { value: '2px' },
      medium: { value: '3px' },
      large: { value: '4px' },
      xl: { value: '6px' },
    },
  },
};

function AccountPage() {
  return (
    <ThemeProvider theme={theme}>
      <Card width="800px">
        <AccountSettings.ChangePassword />
        <AccountSettings.DeleteUser />
      </Card>
    </ThemeProvider>
  );
}
```

## 18. Regras para implementação no projeto

* Use `AccountSettings` somente em contexto autenticado.
* Em Next.js App Router, mantenha os componentes interativos em Client Components.
* Prefira `onSuccess` para navegação e confirmação após operações.
* Use `onError` para tratamento e apresentação de erros.
* Use `validators` para regras específicas de senha.
* Ao sobrescrever slots, preserve os props recebidos.
* Desabilite botões enquanto operações estiverem em andamento.
* Use `handleDelete` somente quando houver necessidade de lógica adicional.
* Para exclusão de conta, considere uma confirmação explícita para reduzir exclusões acidentais.
* Use `displayText` para internacionalização ou adequação dos textos ao produto.
* Use `ThemeProvider` e design tokens para manter consistência visual.

## 19. Referências oficiais

* Account Settings: https://ui.docs.amplify.aws/react/connected-components/account-settings
* Change Password: https://ui.docs.amplify.aws/react/connected-components/account-settings/change-password
* Delete User: https://ui.docs.amplify.aws/react/connected-components/account-settings/delete-user
