import { lazy, Suspense } from 'react'
import { Loader, ThemeProvider } from '@aws-amplify/ui-react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'
import { PrivacyPage } from '@/features/legal/PrivacyPage'
import { TermsPage } from '@/features/legal/TermsPage'
import { PlaceholderPage } from '@/app/PlaceholderPage'
import { theme } from '@/theme'

const StudioPage = lazy(() =>
  import('@/features/studio/StudioPage').then((module) => ({
    default: module.StudioPage,
  })),
)

export function App() {
  return (
    <ThemeProvider theme={theme} colorMode="system">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/studio"
            element={
              <Suspense fallback={<Loader />}>
                <StudioPage />
              </Suspense>
            }
          />
          <Route path="/cadastro" element={<PlaceholderPage />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="*" element={<PlaceholderPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
