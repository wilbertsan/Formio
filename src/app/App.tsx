import { ThemeProvider } from '@aws-amplify/ui-react'
import { theme } from '@/theme'

export function App() {
  return (
    <ThemeProvider theme={theme} colorMode="system">
      <main>3DFormio</main>
    </ThemeProvider>
  )
}
