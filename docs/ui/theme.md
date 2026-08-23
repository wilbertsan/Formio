Amplify UI React — Theming

Objetivo

Guia operacional para OpenCode implementar, revisar e manter temas com @aws-amplify/ui-react. O sistema combina design tokens, breakpoints, overrides, CSS variables e padrões React. Prefira tokens e ThemeProvider; use CSS direto apenas quando tokens não forem suficientes.

Fontes

https://ui.docs.amplify.aws/react/theming

https://ui.docs.amplify.aws/react/theming/theme-provider

https://ui.docs.amplify.aws/react/theming/responsive

https://ui.docs.amplify.aws/react/theming/default-theme

https://ui.docs.amplify.aws/react/theming/default-theme/colors

https://ui.docs.amplify.aws/react/theming/default-theme/typography

1. ThemeProvider

ThemeProvider aplica um tema à aplicação e disponibiliza seus valores aos componentes filhos. AmplifyProvider foi renomeado para ThemeProvider; a exportação está disponível desde a versão 2.18.3.

import { ThemeProvider } from '@aws-amplify/ui-react';
export const App = () => (
  <ThemeProvider><YourApplication /></ThemeProvider>
);

Use tokens com useTheme ou referências diretas nos style props:

import { Button, useTheme } from '@aws-amplify/ui-react';
const { tokens } = useTheme();
<Button border={`2px solid ${tokens.colors.blue[80]}`} color="purple.80" />

2. Tema customizado

Um tema possui name, tokens, breakpoints e overrides. Por padrão, o tema customizado estende o defaultTheme.

import { ThemeProvider, Theme } from '@aws-amplify/ui-react';
const theme: Theme = {
  name: 'my-theme',
  tokens: {
    colors: { font: { primary: { value: '#008080' } } },
  },
};
export const App = () => (
  <ThemeProvider theme={theme}><YourApplication /></ThemeProvider>
);

Separe o tema em arquivo próprio, por exemplo src/theme/index.ts, para centralizar decisões visuais.

3. Design tokens

Design tokens são a forma principal de tematizar. São organizados por namespaces/tipos: colors, fonts, fontWeights, fontSizes, lineHeights, space, radii, shadows, borderWidths, time, transforms e outros.
Tokens podem referenciar outros tokens:

const theme = {
  name: 'my-theme',
  tokens: {
    colors: {
      font: { primary: { value: '{colors.neutral.100.value}' } },
    },
  },
};

Use referências quando uma decisão deve acompanhar outro token e evite duplicar valores.

4. Cores

A paleta do Amplify UI usa hsl(). Há tokens semânticos e paletas como primary, secondary, neutral, além de valores de fonte e background.

const theme = {
  name: 'custom-theme',
  tokens: {
    components: {
      card: {
        backgroundColor: { value: '{colors.background.secondary}' },
        outlined: { borderColor: { value: '{colors.black}' } },
      },
      heading: { color: { value: '{colors.secondary[80]}' } },
      text: { color: { value: '{colors.primary[80]}' } },
    },
  },
};

Prefira tokens semânticos para componentes e referências a tokens existentes para manter consistência.

5. Tipografia

Tokens disponíveis incluem pesos, tamanhos, line heights e famílias estáticas/variáveis.
Pesos: hairline=100, thin=200, light=300, normal=400, medium=500, semibold=600, bold=700, extrabold=800, black=900.
Tamanhos: xxxs=.375rem, xxs=.5rem, xs=.75rem, small=.875rem, medium=1rem, large=1.25rem, xl=1.5rem, xxl=2rem, xxxl=2.5rem, xxxxl=3rem.
Line heights: small=1.25, medium=1.5, large=2.
Famílias padrão: variável usa InterVariable/Inter var/Inter e fallback de sistema; estática usa Inter e fallback de sistema.
Customização:

const theme = {
  name: 'my-theme',
  tokens: {
    fonts: {
      default: {
        variable: { value: 'Raleway, sans-serif' },
        static: { value: 'Raleway, sans-serif' },
      },
    },
  },
};

6. Sizes

Use tokens para espaçamento, raios, larguras e bordas.
Exemplo:

const { tokens } = useTheme();
<Grid gap={tokens.space.xxl}>
  <View padding={tokens.space.medium} />
</Grid>

Também existem CSS variables equivalentes, como var(--amplify-space-medium).

7. Component tokens

Tokens de componentes seguem o padrão component[modifier][_state][child].
modifier representa variações como primary, link, small, medium, large. Estados começam com _, como _hover, _focus, _loading, _disabled.

const button = {
  _hover: {},
  _focus: {},
  _loading: {},
  _disabled: {},
  primary: {
    _hover: {},
    _focus: {},
    _loading: {},
    _disabled: {},
  },
  small: {},
  large: {},
};

Use esse padrão ao criar overrides para facilitar descoberta e previsibilidade.

8. Breakpoints e responsividade

A abordagem é mobile-first usando @media(min-width).
Breakpoints padrão: base=0, small=480px, medium=768px, large=992px, xl=1280px, xxl=1536px.
Style props aceitam sintaxe objeto ou array:

<Flex direction={{ base: 'column', large: 'row' }}>
  <View width="100%" backgroundColor={{ base: 'orange', large: 'yellow' }} />
</Flex>

Na sintaxe array, a ordem é base → small → medium → large → xl → xxl; valores omitidos acima mantêm o último estilo.
useBreakpointValue recebe objeto/array e retorna o valor do breakpoint atual:

const variation = useBreakpointValue({
  base: 'info', small: 'warning', medium: 'error', large: 'success',
});

Breakpoints podem ser customizados e são definidos em pixels:

breakpoints: {
  values: { base: 0, small: 480, medium: 768, large: 992, xl: 1280, xxl: 1536 },
  defaultBreakpoint: 'base',
}

9. Dark mode

ThemeProvider aceita colorMode="light" | "dark" | "system".

<ThemeProvider theme={theme} colorMode="system">
  <App />
</ThemeProvider>

Também é possível usar overrides por contexto ou CSS. Se houver múltiplos ThemeProvider, mantenha colorMode em estado/contexto compartilhado para evitar partes da aplicação com modos diferentes.

10. CSS variables

Todos os design tokens geram CSS variables. Podem ser sobrescritas:

:root, [data-amplify-theme] {
  --amplify-colors-font-primary: #333;
  --amplify-colors-font-secondary: var(--amplify-colors-neutral-60);
}

Quando necessário, selecione o tema:

[data-amplify-theme='my-theme'].disco {
  --amplify-colors-font-primary: pink;
}

As variáveis seguem o namespace do token, por exemplo --amplify-space-medium e --amplify-font-sizes-medium.

11. CSS direto

Componentes usam CSS normal; Sass/pre-processadores também podem ser usados. Todos os componentes possuem classes iniciadas por amplify.

.amplify-button {
  font-size: 2rem;
  padding: 1rem 2rem;
  background: none;
  border: 2px solid black;
}
.amplify-button:hover { background: gray; }

Ordem recomendada: style props/tokens → theme tokens/component tokens → CSS variables → CSS específico. Evite CSS global para resolver algo que pode ser expresso por token.

12. Style props

Style props podem receber CSS válido:

<Button backgroundColor="red" />

Ou token via useTheme:

const { tokens } = useTheme();
<Button backgroundColor={tokens.colors.red[40]} />

Ou shorthand:

<Button backgroundColor="red.40" />

Style props sobrescrevem CSS conflitante e theme styling; use-os para ajustes locais ou prototipagem, sem substituir a estratégia global de tokens.

13. Unstyled

Para controle visual total, use os componentes sem importar o CSS do Amplify UI:

import { Button, Card } from '@aws-amplify/ui-react';
// não importar: '@aws-amplify/ui-react/styles.css'

Isso transfere para o projeto a responsabilidade de estilização.

14. IconsProvider

Ícones de componentes podem ser substituídos globalmente ou por subárvores usando IconsProvider. O icons é um mapa de nomes para ReactNodes.

import { IconsProvider, Rating } from '@aws-amplify/ui-react';
import { FiStar } from 'react-icons/fi';
<IconsProvider icons={{
  rating: { filled: <FiStar />, empty: <FiStar /> },
}}>
  <Rating value={3.5} />
</IconsProvider>

Como usa React context, IconsProvider pode ser aninhado para mudar ícones apenas em uma parte da aplicação.
Componentes com overrides de ícones incluem Accordion, Alert, Checkbox, FileUploader, Menu, Pagination, PasswordField, Rating, SearchField, SelectField e StepperField.
Mapa comum:
alert: close/info/error/warning/success; checkbox: indeterminate/checked; accordion: more; field: clear; menu: menu; pagination: previous/next; passwordField: visibility/visibilityOff; rating: filled/empty; searchField: search; select: expand; stepperField: add/remove; storageManager: upload/remove/error/success/file.

15. createTheme e múltiplos temas

Use createTheme para estender um tema base e criar variantes:

import { createTheme, defaultTheme } from '@aws-amplify/ui';
const baseBrandTheme = createTheme({
  name: 'base-brand-theme',
  tokens: { colors: { font: { primary: { value: 'red' } } } },
});
const otherBrandTheme = createTheme({
  name: 'other-brand-theme',
  tokens: { colors: { font: { primary: { value: 'blue' } } } },
}, baseBrandTheme);

Se o segundo argumento não existir, a extensão parte de defaultTheme.

16. Regras para o projeto

Centralizar o tema em src/theme/.

Preferir referências de tokens a valores duplicados.

Usar ThemeProvider no topo da aplicação.

Manter responsividade mobile-first com breakpoints padrão, salvo requisito explícito.

Usar colorMode="system" quando o produto não exigir seletor próprio.

Usar style props para ajustes locais; não criar CSS global desnecessário.

Component token overrides devem seguir component[modifier][_state][child].

Evitar hardcode de cores, espaçamentos e tipografia quando existir token equivalente.

Para novos temas, usar createTheme quando houver herança/variantes.

Testar light/dark e breakpoints sempre que tokens ou overrides afetarem aparência.

17. Checklist OpenCode

Confirmar ThemeProvider e importação de estilos quando aplicável.

Localizar tokens existentes antes de criar novos valores.

Reutilizar referências {colors...} quando possível.

Validar estados _hover, _focus, _loading, _disabled em componentes customizados.

Validar base/small/medium/large/xl/xxl em alterações responsivas.

Garantir que múltiplos ThemeProvider compartilhem colorMode.

Preferir CSS variables para pequenas integrações com CSS.

Manter customizações de ícones dentro de IconsProvider.