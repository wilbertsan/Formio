import { render, screen } from '@testing-library/react'
import { StudioViewport } from '@/features/studio/components/StudioViewport'
import { defaultParameters } from '@/features/studio/config/parameters'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <div data-testid="grid" />,
  Environment: () => <div data-testid="environment" />,
  RoundedBox: () => <div data-testid="rounded-box" />,
  ContactShadows: () => <div data-testid="contact-shadows" />,
}))

vi.mock('@/features/studio/components/SampleSolid', () => ({
  SampleSolid: () => <div data-testid="sample-solid" />,
}))

describe('StudioViewport', () => {
  it('renderiza o canvas com descrição acessível', () => {
    render(<StudioViewport parameters={defaultParameters} resetCameraSignal={0} />)
    expect(screen.getByTestId('canvas-mock')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /visualização 3d do modelo/i }),
    ).toBeInTheDocument()
  })

  it('renderiza controles, grid, ambiente e sólido', () => {
    render(<StudioViewport parameters={defaultParameters} resetCameraSignal={0} />)
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument()
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    expect(screen.getByTestId('environment')).toBeInTheDocument()
    expect(screen.getByTestId('sample-solid')).toBeInTheDocument()
  })
})
