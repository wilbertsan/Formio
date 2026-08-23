import { render, screen } from '@testing-library/react'
import { App } from '@/app/App'

describe('App', () => {
  it('renderiza sem crash', () => {
    render(<App />)
    expect(screen.getByText('3DFormio')).toBeInTheDocument()
  })
})
