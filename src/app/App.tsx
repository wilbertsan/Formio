import { ThemeProvider } from '@aws-amplify/ui-react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'
import { PlaceholderPage } from '@/app/PlaceholderPage'
import { theme } from '@/theme'

export function App() {
  return (
    <ThemeProvider theme={theme} colorMode="system">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/cadastro" element={<PlaceholderPage />} />
          <Route path="/termos" element={<PlaceholderPage />} />
          <Route path="/privacidade" element={<PlaceholderPage />} />
          <Route path="*" element={<PlaceholderPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
