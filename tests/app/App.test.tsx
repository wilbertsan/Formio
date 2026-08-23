import { render, screen } from '@testing-library/react'
import { App } from '@/app/App'

describe('App', () => {
  it('renderiza sem crash', () => {
    render(<App />)
    expect(screen.getByText('3DFormio')).toBeInTheDocument()
  })

  it('aplica o tema custom do 3DFormio', () => {
    const { container } = render(<App />)
    expect(container.querySelector('[data-amplify-theme="3dformio"]')).not.toBeNull()
  })
})
