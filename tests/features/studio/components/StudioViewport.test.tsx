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

vi.mock('@/features/studio/components/KeychainPreview', () => ({
  KeychainPreview: ({ baseGeometry }: { baseGeometry: unknown }) =>
    baseGeometry ? <div data-testid="keychain-preview" /> : <div data-testid="keychain-loading" />,
}))

describe('StudioViewport', () => {
  it('renderiza o canvas com descrição acessível', () => {
    render(
      <StudioViewport
        geometry={null}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
        baseColor="#14b8a6"
        letterColor="#f5f5f5"
        selectedTextId={null}
        onSelectText={() => undefined}
        onMoveText={() => undefined}
      />,
    )
    expect(screen.getByTestId('canvas-mock')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /visualização 3d do modelo/i })).toBeInTheDocument()
  })

  it('mostra loading quando geometria não está pronta', () => {
    render(
      <StudioViewport
        geometry={null}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
        baseColor="#14b8a6"
        letterColor="#f5f5f5"
        selectedTextId={null}
        onSelectText={() => undefined}
        onMoveText={() => undefined}
      />,
    )
    expect(screen.getByTestId('keychain-loading')).toBeInTheDocument()
  })

  it('renderiza controles, grid, ambiente e preview', () => {
    render(
      <StudioViewport
        geometry={{ base: {}, text: {}, textItems: [], pieceBB: { minX: 0, maxX: 0, minY: 0, maxY: 0 }, hole: { x: 0, y: 0, radius: 0 } } as never}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
        baseColor="#14b8a6"
        letterColor="#f5f5f5"
        selectedTextId={null}
        onSelectText={() => undefined}
        onMoveText={() => undefined}
      />,
    )
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument()
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    expect(screen.getByTestId('environment')).toBeInTheDocument()
    expect(screen.getByTestId('keychain-preview')).toBeInTheDocument()
  })

  it('posiciona o grid como piso distante abaixo da figura', () => {
    render(
      <StudioViewport
        geometry={{} as never}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
        baseColor="#14b8a6"
        letterColor="#f5f5f5"
        selectedTextId={null}
        onSelectText={() => undefined}
        onMoveText={() => undefined}
      />,
    )
    expect(screen.getByTestId('grid')).toHaveAttribute('data-position', '0,-25,0')
  })

  it('renderiza botão de reset flutuante', () => {
    render(
      <StudioViewport
        geometry={{} as never}
        resetCameraSignal={0}
        onResetCamera={() => undefined}
        baseColor="#14b8a6"
        letterColor="#f5f5f5"
        selectedTextId={null}
        onSelectText={() => undefined}
        onMoveText={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: /resetar câmera/i })).toBeInTheDocument()
  })

  it('dispara onResetCamera ao clicar no botão flutuante', async () => {
    const user = userEvent.setup()
    const onResetCamera = vi.fn()
    render(
      <StudioViewport
        geometry={{} as never}
        resetCameraSignal={0}
        onResetCamera={onResetCamera}
        baseColor="#14b8a6"
        letterColor="#f5f5f5"
        selectedTextId={null}
        onSelectText={() => undefined}
        onMoveText={() => undefined}
      />,
    )
    await user.click(screen.getByRole('button', { name: /resetar câmera/i }))
    expect(onResetCamera).toHaveBeenCalledTimes(1)
  })
})
