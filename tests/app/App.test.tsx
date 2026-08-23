import { render, screen, waitFor } from '@testing-library/react'
import { App } from '@/app/App'

vi.mock('@/features/studio/StudioPage', () => ({
  StudioPage: () => <div>Studio Mock</div>,
}))

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renderiza a landing na rota raiz', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Modelos 3D personalizados em segundos' }),
    ).toBeInTheDocument()
  })

  it('aplica o tema custom do 3DFormio', () => {
    const { container } = render(<App />)
    expect(container.querySelector('[data-amplify-theme="3dformio"]')).not.toBeNull()
  })

  it('renderiza o Studio na rota /studio', async () => {
    window.history.pushState({}, '', '/studio')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Studio Mock')).toBeInTheDocument()
    })
    window.history.pushState({}, '', '/')
  })
})
