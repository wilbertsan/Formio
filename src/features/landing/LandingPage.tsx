import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { PricingSection } from './components/PricingSection'
import { FaqSection } from './components/FaqSection'
import { Footer } from './components/Footer'

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  )
}
