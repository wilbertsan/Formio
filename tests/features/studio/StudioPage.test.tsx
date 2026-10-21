import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudioPage } from '@/features/studio/StudioPage'
// Importa o painel eagerly para que o chunk lazy do StudioPage já esteja
// transformado e resolva de imediato mesmo sob carga da suíte completa.
import '@/features/studio/tools/confeitaria/topo-bolo/StudioPanel'
import '@/features/studio/tools/confeitaria/rolo-textura/StudioPanel'

const LAZY_TIMEOUT = { timeout: 5000 }

vi.mock('@/assets/fonts/helvetiker_regular.typeface.json?url', () => ({ default: '/mock-font.json' }))
vi.mock('@/assets/fonts/helvetiker_bold.typeface.json?url', () => ({ default: '/mock-font.json' }))
vi.mock('@/assets/fonts/optimer_regular.typeface.json?url', () => ({ default: '/mock-font.json' }))

// As fontes nunca resolvem, mantendo a geometria nula e os testes determinísticos.
vi.mock('three/examples/jsm/loaders/FontLoader.js', () => ({
  FontLoader: class {
    load(): void {}
  },
}))

// jsdom não implementa Worker; o hook da ferramenta cria um após o debounce.
class WorkerMock {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  postMessage(): void {}
  terminate(): void {}
}

vi.stubGlobal('Worker', WorkerMock)

vi.mock('@react-three/fiber', () => {
  const camera = { position: { set: vi.fn() }, lookAt: vi.fn(), fov: 45 }
  const state = {
    camera,
    gl: { domElement: document.createElement('canvas') },
    size: { width: 800, height: 600 },
  }
  return {
    Canvas: () => <div data-testid="canvas-mock" />,
    useThree: (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
  }
})

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <div data-testid="grid" />,
  Environment: () => <div data-testid="environment" />,
}))

function renderStudioPage() {
  return render(
    <MemoryRouter>
      <StudioPage />
    </MemoryRouter>,
  )
}

describe('StudioPage', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza topbar com nome do projeto', () => {
    renderStudioPage()
    expect(screen.getByText('3DFormio')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /nome do projeto/i })).toBeInTheDocument()
  })

  it('mostra o seletor de ferramentas por padrão', () => {
    renderStudioPage()
    expect(screen.getByRole('heading', { name: /escolha uma ferramenta/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /topo de bolo/i })).toBeInTheDocument()
  })

  it('exportar STL começa desabilitado', () => {
    renderStudioPage()
    expect(screen.getByRole('button', { name: 'Exportar STL' })).toBeDisabled()
  })

  it('não renderiza o editor de textos por padrão', () => {
    renderStudioPage()
    expect(screen.queryByTestId('text-editor')).not.toBeInTheDocument()
  })

  it('abre a ferramenta Topo de Bolo ao selecioná-la', async () => {
    renderStudioPage()
    fireEvent.click(screen.getByRole('button', { name: /topo de bolo/i }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Topo de Bolo' }, LAZY_TIMEOUT)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /visualização 3d do modelo/i })).toBeInTheDocument()
    expect(screen.getByText(/arraste para girar/i)).toBeInTheDocument()
  })

  it('mostra o card Rolo de Textura no seletor', () => {
    renderStudioPage()
    expect(screen.getByRole('button', { name: /rolo de textura/i })).toBeInTheDocument()
  })

  it('abre a ferramenta Rolo de Textura ao selecioná-la', async () => {
    renderStudioPage()
    fireEvent.click(screen.getByRole('button', { name: /rolo de textura/i }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Rolo de Textura' }, LAZY_TIMEOUT)).toBeInTheDocument()
  })

  it('abre o editor ao clicar em Posicionar textos na ferramenta Topo de Bolo', async () => {
    renderStudioPage()
    fireEvent.click(screen.getByRole('button', { name: /topo de bolo/i }))

    fireEvent.click(await screen.findByRole('button', { name: /posicionar textos/i }, LAZY_TIMEOUT))
    expect(screen.getByTestId('text-editor')).toBeInTheDocument()
  })
})
