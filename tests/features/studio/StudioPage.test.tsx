import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudioPage } from '@/features/studio/StudioPage'

vi.mock('@/features/studio/keychain/buildKeychain', () => ({
  buildKeychain: vi.fn(() => ({ dispose: vi.fn() })),
}))

vi.mock('@/features/studio/keychain/exportStl', () => ({
  exportStl: vi.fn(),
}))

vi.mock('@/assets/fonts/helvetiker_bold.typeface.json?url', () => ({
  default: '/mock-font.json',
}))

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
  it('renderiza o topo com o nome do projeto', () => {
    renderStudioPage()
    expect(screen.getByText('3DFormio')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /nome do projeto/i })).toBeInTheDocument()
  })

  it('renderiza os controles de ferramentas', () => {
    renderStudioPage()
    expect(screen.getByRole('navigation', { name: /ferramentas do studio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /selecionar/i })).toBeInTheDocument()
  })

  it('renderiza a seção de parâmetros', () => {
    renderStudioPage()
    expect(screen.getByRole('complementary', { name: /parâmetros do modelo/i })).toBeInTheDocument()
    expect(screen.getByText('Parâmetros')).toBeInTheDocument()
  })

  it('renderiza a viewport 3d', () => {
    renderStudioPage()
    expect(screen.getByRole('img', { name: /visualização 3d do modelo/i })).toBeInTheDocument()
  })

  it('renderiza a barra de status', () => {
    renderStudioPage()
    expect(screen.getByText(/arraste para girar/i)).toBeInTheDocument()
  })

  it(' Exportar STL começa desabilitado sem geometria', () => {
    renderStudioPage()
    expect(screen.getByRole('button', { name: 'Exportar STL' })).toBeDisabled()
  })
})
