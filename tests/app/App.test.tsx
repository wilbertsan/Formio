import { render, screen } from '@testing-library/react'
import { App } from '@/app/App'

describe('App', () => {
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
})
