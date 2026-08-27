import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioViewport } from '@/features/studio/components/StudioViewport'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
  useThree: () => ({
    camera: { position: [0, 0, 5] },
    gl: { domElement: document.createElement('canvas') },
  }),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: ({ position }: { position?: [number, number, number] }) => (
    <div data-testid="grid" data-position={position?.join(',')} />
  ),
  Environment: () => <div data-testid="environment" />,
}))

describe('StudioViewport', () => {
  it('renderiza o canvas com descrição acessível', () => {
    render(
      <StudioViewport
        hasGeometry={false}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
      >
        <div data-testid="child-content" />
      </StudioViewport>,
    )
    expect(screen.getByTestId('canvas-mock')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /visualização 3d do modelo/i })).toBeInTheDocument()
  })

  it('mostra loading quando não há geometria', () => {
    render(
      <StudioViewport
        hasGeometry={false}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
      >
        <div />
      </StudioViewport>,
    )
    expect(screen.queryByRole('button', { name: /resetar câmera/i })).not.toBeInTheDocument()
  })

  it('renderiza controles, grid, ambiente e conteúdo filho', () => {
    render(
      <StudioViewport
        hasGeometry={true}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
      >
        <div data-testid="preview-content" />
      </StudioViewport>,
    )
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument()
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    expect(screen.getByTestId('environment')).toBeInTheDocument()
    expect(screen.getByTestId('preview-content')).toBeInTheDocument()
  })

  it('posiciona o grid como piso distante abaixo da figura', () => {
    render(
      <StudioViewport
        hasGeometry={true}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
      >
        <div />
      </StudioViewport>,
    )
    expect(screen.getByTestId('grid')).toHaveAttribute('data-position', '0,-25,0')
  })

  it('renderiza botão de reset flutuante quando há geometria', () => {
    render(
      <StudioViewport
        hasGeometry={true}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
      >
        <div />
      </StudioViewport>,
    )
    expect(screen.getByRole('button', { name: /resetar câmera/i })).toBeInTheDocument()
  })

  it('dispara onResetCamera ao clicar no botão flutuante', async () => {
    const user = userEvent.setup()
    const onResetCamera = vi.fn()
    render(
      <StudioViewport
        hasGeometry={true}
        resetCameraSignal={0}
        onResetCamera={onResetCamera}
      >
        <div />
      </StudioViewport>,
    )
    await user.click(screen.getByRole('button', { name: /resetar câmera/i }))
    expect(onResetCamera).toHaveBeenCalledTimes(1)
  })
})
