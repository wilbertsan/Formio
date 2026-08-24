import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudioPage } from '@/features/studio/StudioPage'

vi.mock('@/features/studio/keychain/buildKeychain', () => ({
  buildKeychain: vi.fn(() => ({
    base: { dispose: vi.fn(), getAttribute: () => ({ count: 0 }) },
    text: { dispose: vi.fn(), getAttribute: () => ({ count: 0 }) },
    textItems: [{ id: 'text-1', geometry: { dispose: () => {} }, x: 0, y: 0 }],
    pieceBB: { minX: -25, maxX: 25, minY: -12.5, maxY: 12.5 },
    hole: { x: 0, y: 10, radius: 4.5 },
  })),
}))

vi.mock('@/features/studio/keychain/exportStl', () => ({
  exportStl: vi.fn(),
}))

vi.mock('@/assets/fonts/helvetiker_regular.typeface.json?url', () => ({ default: '/mock-font.json' }))
vi.mock('@/assets/fonts/helvetiker_bold.typeface.json?url', () => ({ default: '/mock-font.json' }))
vi.mock('@/assets/fonts/optimer_regular.typeface.json?url', () => ({ default: '/mock-font.json' }))

vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: class {
    load(_url: string, onLoad: (font: unknown) => void): void {
      onLoad({ glyphs: {} })
    }
  },
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
  useThree: () => ({ camera: {}, gl: { domElement: document.createElement('canvas') } }),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <div data-testid="grid" />,
  Environment: () => <div data-testid="environment" />,
}))

vi.mock('@/features/studio/components/KeychainPreview', () => ({
  KeychainPreview: () => <div data-testid="keychain-preview" />,
}))

function renderStudioPage() {
  return render(
    <MemoryRouter>
      <StudioPage />
    </MemoryRouter>,
  )
}

describe('StudioPage', () => {
  it('renderiza topbar com nome do projeto', () => {
    renderStudioPage()
    expect(screen.getByText('3DFormio')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /nome do projeto/i })).toBeInTheDocument()
  })

  it('renderiza painel com chip do primeiro texto selecionado', () => {
    renderStudioPage()
    expect(screen.getByRole('button', { name: /meu nome/i })).toBeInTheDocument()
  })

  it('renderiza viewport 3D', () => {
    renderStudioPage()
    expect(screen.getByTestId('canvas-mock')).toBeInTheDocument()
  })

  it('renderiza barra de status', () => {
    renderStudioPage()
    expect(screen.getByText(/arraste para girar/i)).toBeInTheDocument()
  })

  it('exportar stl começa desabilitado', () => {
    renderStudioPage()
    expect(screen.getByRole('button', { name: 'Exportar STL' })).toBeDisabled()
  })
})
