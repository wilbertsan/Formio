import { render, screen } from '@testing-library/react'
import { StudioViewport } from '@/features/studio/components/StudioViewport'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <div data-testid="grid" />,
  Environment: () => <div data-testid="environment" />,
  ContactShadows: () => <div data-testid="contact-shadows" />,
}))

vi.mock('@/features/studio/components/KeychainPreview', () => ({
  KeychainPreview: ({ geometry }: { geometry: unknown }) =>
    geometry ? <div data-testid="keychain-preview" /> : <div data-testid="keychain-loading" />,
}))

describe('StudioViewport', () => {
  it('renderiza o canvas com descrição acessível', () => {
    render(<StudioViewport geometry={null} resetCameraSignal={0} />)
    expect(screen.getByTestId('canvas-mock')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /visualização 3d do modelo/i })).toBeInTheDocument()
  })

  it('mostra loading quando geometria não está pronta', () => {
    render(<StudioViewport geometry={null} resetCameraSignal={0} />)
    expect(screen.getByTestId('keychain-loading')).toBeInTheDocument()
  })

  it('renderiza controles, grid, ambiente e preview', () => {
    render(<StudioViewport geometry={{} as never} resetCameraSignal={0} />)
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument()
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    expect(screen.getByTestId('environment')).toBeInTheDocument()
    expect(screen.getByTestId('keychain-preview')).toBeInTheDocument()
  })
})
