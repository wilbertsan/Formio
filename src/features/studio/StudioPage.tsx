import { lazy, Suspense, useCallback, useState } from 'react'
import { Loader } from '@aws-amplify/ui-react'
import { StudioTopbar } from './components/StudioTopbar'
import { StudioViewport } from './components/StudioViewport'
import { StudioStatusBar } from './components/StudioStatusBar'
import { ToolSelector, type ToolId } from './components/ToolSelector'
import { useKeychain } from './tools/chaveiros/chaveiro/useKeychain'
import { exportStl } from './tools/chaveiros/chaveiro/exportStl'
import { TextPositionEditor } from './tools/chaveiros/chaveiro/TextPositionEditor'
import { useCard } from './tools/letreiros/cartao-visita/useCard'
import { useCakeStand } from './tools/confeitaria/suporte-bolo/useCakeStand'
import { useCakeTopper } from './tools/confeitaria/topo-bolo/useCakeTopper'
import { useStamp } from './tools/confeitaria/carimbo-brigadeiro/useStamp'
import { exportStampStl } from './tools/confeitaria/carimbo-brigadeiro/exportStampStl'
import { usePhotoStand } from './tools/letreiros/suporte-foto/usePhotoStand'
import { useBookmark } from './tools/letreiros/marcador-pagina/useBookmark'
import { exportStl as exportBookmarkStl } from './tools/letreiros/marcador-pagina/exportStl'
import { TextPositionEditor as BookmarkTextPositionEditor } from './tools/letreiros/marcador-pagina/TextPositionEditor'
import { usePlacaLoja } from './tools/letreiros/placa-loja/usePlacaLoja'
import { exportStl as exportPlacaLojaStl } from './tools/letreiros/placa-loja/exportStl'
import { TextPositionEditor as PlacaLojaTextPositionEditor } from './tools/letreiros/placa-loja/TextPositionEditor'
import { useCutterStamp } from './tools/confeitaria/cortador-carimbo/useCutterStamp'
import { exportCutterStampStl } from './tools/confeitaria/cortador-carimbo/exportStl'

const ChaveiroTool = lazy(() =>
  import('./tools/chaveiros/chaveiro/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const CartaoVisitaTool = lazy(() =>
  import('./tools/letreiros/cartao-visita/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const SuporteBoloTool = lazy(() =>
  import('./tools/confeitaria/suporte-bolo/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const ChaveiroPreview = lazy(() =>
  import('./tools/chaveiros/chaveiro/KeychainPreview').then((m) => ({
    default: m.KeychainPreview,
  })),
)

const CartaoVisitaPreview = lazy(() =>
  import('./tools/letreiros/cartao-visita/CardPreview').then((m) => ({
    default: m.CardPreview,
  })),
)

const SuporteBoloPreview = lazy(() =>
  import('./tools/confeitaria/suporte-bolo/CakeStandPreview').then((m) => ({
    default: m.CakeStandPreview,
  })),
)

const SuporteFotoTool = lazy(() =>
  import('./tools/letreiros/suporte-foto/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const SuporteFotoPreview = lazy(() =>
  import('./tools/letreiros/suporte-foto/PhotoStandPreview').then((m) => ({
    default: m.PhotoStandPreview,
  })),
)

const TopoBoloTool = lazy(() =>
  import('./tools/confeitaria/topo-bolo/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const TopoBoloPreview = lazy(() =>
  import('./tools/confeitaria/topo-bolo/CakeTopperPreview').then((m) => ({
    default: m.CakeTopperPreview,
  })),
)

const CarimboBrigadeiroTool = lazy(() =>
  import('./tools/confeitaria/carimbo-brigadeiro/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const CarimboBrigadeiroPreview = lazy(() =>
  import('./tools/confeitaria/carimbo-brigadeiro/StampPreview').then((m) => ({
    default: m.StampPreview,
  })),
)

const MarcadorPaginaTool = lazy(() =>
  import('./tools/letreiros/marcador-pagina/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const MarcadorPaginaPreview = lazy(() =>
  import('./tools/letreiros/marcador-pagina/BookmarkPreview').then((m) => ({
    default: m.BookmarkPreview,
  })),
)

const PlacaLojaTool = lazy(() =>
  import('./tools/letreiros/placa-loja/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const PlacaLojaPreview = lazy(() =>
  import('./tools/letreiros/placa-loja/PlacaLojaPreview').then((m) => ({
    default: m.PlacaLojaPreview,
  })),
)

const CortadorCarimboTool = lazy(() =>
  import('./tools/confeitaria/cortador-carimbo/StudioPanel').then((m) => ({
    default: m.StudioPanel,
  })),
)

const CortadorCarimboPreview = lazy(() =>
  import('./tools/confeitaria/cortador-carimbo/CutterStampPreview').then((m) => ({
    default: m.CutterStampPreview,
  })),
)

function ChaveiroToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)
  const [selectedTextId, setSelectedTextId] = useState<string>('')
  const [isEditorOpen, setEditorOpen] = useState(false)

  const {
    params,
    geometry,
    dimensions,
    updateParam,
    updateText,
    addText,
    removeText,
    reset,
  } = useKeychain()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (geometry) {
      exportStl(geometry, projectName)
    }
  }, [geometry, projectName])

  const handleSelectText = useCallback((id: string) => {
    setSelectedTextId(id)
  }, [])

  const handleAddText = useCallback(() => {
    addText()
    if (params.texts.length < 3) {
      const next = params.texts[params.texts.length]
      if (next) setSelectedTextId(next.id)
    }
  }, [addText, params.texts])

  const handleMoveText = useCallback((id: string, x: number, y: number) => {
    updateText(id, { offsetX: x, offsetY: y })
  }, [updateText])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <ChaveiroTool
            params={params}
            selectedTextId={selectedTextId}
            onSelectText={handleSelectText}
            onUpdateText={updateText}
            onAddText={handleAddText}
            onRemoveText={removeText}
            onUpdateParam={updateParam}
            onReset={reset}
            onOpenEditor={() => setEditorOpen(true)}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
        >
          <Suspense fallback={null}>
            <ChaveiroPreview
              geometry={geometry}
              baseColor={params.baseColor}
              letterColor={params.letterColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
      {isEditorOpen && (
        <Suspense fallback={null}>
          <TextPositionEditor
            params={params}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
            onMoveText={handleMoveText}
            onClose={() => setEditorOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

function CartaoVisitaToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)
  const [selectedBlockId, setSelectedBlockId] = useState<string>('name')

  const {
    params,
    geometry,
    dimensions,
    updateParam,
    updateBlock,
    addBlock,
    removeBlock,
    reset,
  } = useCard()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    // TODO: implement card STL export
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <CartaoVisitaTool
            params={params}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onUpdateBlock={updateBlock}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
            onUpdateParam={updateParam}
            onReset={reset}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
        >
          <Suspense fallback={null}>
            <CartaoVisitaPreview
              geometry={geometry}
              baseColor={params.baseColor}
              letterColor={params.letterColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}

function SuporteBoloToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const {
    params,
    geometry,
    dimensions,
    updateParam,
    reset,
  } = useCakeStand()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    // TODO: implement cake stand STL export
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <SuporteBoloTool
            params={params}
            onUpdateParam={updateParam}
            onReset={reset}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
        >
          <Suspense fallback={null}>
            <SuporteBoloPreview
              geometry={geometry}
              baseColor={params.baseColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}

function SuporteFotoToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const {
    params,
    geometry,
    dimensions,
    cameraPosition,
    updateParam,
    reset,
  } = usePhotoStand()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    // TODO: implement photo stand STL export
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <SuporteFotoTool
            params={params}
            onUpdateParam={updateParam}
            onReset={reset}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
          cameraPosition={cameraPosition}
        >
          <Suspense fallback={null}>
            <SuporteFotoPreview
              geometry={geometry}
              baseColor={params.baseColor}
              letterColor={params.letterColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}

function TopoBoloToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const {
    params,
    geometry,
    dimensions,
    cameraPosition,
    updateParam,
    setSvgIcon,
    reset,
  } = useCakeTopper()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    // TODO: implement cake topper STL export
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <TopoBoloTool
            params={params}
            onUpdateParam={updateParam}
            onSetSvgIcon={setSvgIcon}
            onReset={reset}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
          cameraPosition={cameraPosition}
        >
          <Suspense fallback={null}>
            <TopoBoloPreview
              geometry={geometry}
              baseColor={params.baseColor}
              textColor={params.textColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}

function CarimboBrigadeiroToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const {
    params,
    geometry,
    dimensions,
    cameraPosition,
    updateParam,
    setSvgIcon,
    reset,
  } = useStamp()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (geometry) {
      exportStampStl(geometry, projectName)
    }
  }, [geometry, projectName])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <CarimboBrigadeiroTool
            params={params}
            onUpdateParam={updateParam}
            onSetSvgIcon={setSvgIcon}
            onReset={reset}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
          cameraPosition={cameraPosition}
        >
          <Suspense fallback={null}>
            <CarimboBrigadeiroPreview
              geometry={geometry}
              baseColor={params.baseColor}
              reliefColor={params.reliefColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}

function CortadorCarimboToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const {
    params,
    geometry,
    isBuilding,
    error,
    dimensions,
    cameraPosition,
    updateParam,
    setSvgIcon,
    reset,
  } = useCutterStamp()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (geometry) {
      exportCutterStampStl(geometry, projectName)
    }
  }, [geometry, projectName])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="relative flex min-h-0 flex-1">
        {isBuilding && (
          <div
            role="status"
            aria-live="polite"
            className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-neutral-200 bg-white/90 px-3 py-1 text-xs text-neutral-600 shadow-sm"
          >
            Gerando…
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-red-200 bg-white/95 px-3 py-1 text-xs text-red-600 shadow-sm"
          >
            {error}
          </div>
        )}
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <CortadorCarimboTool
            params={params}
            onUpdateParam={updateParam}
            onSetSvgIcon={setSvgIcon}
            onReset={reset}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
          cameraPosition={cameraPosition}
        >
          <Suspense fallback={null}>
            <CortadorCarimboPreview
              geometry={geometry}
              cutterColor={params.cutterColor}
              stampColor={params.stampColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}

function MarcadorPaginaToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)
  const [selectedTextId, setSelectedTextId] = useState<string>('')
  const [isEditorOpen, setEditorOpen] = useState(false)

  const {
    params,
    geometry,
    dimensions,
    updateParam,
    updateTextById,
    addText,
    removeText,
    reset,
  } = useBookmark()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (geometry) {
      exportBookmarkStl(geometry, projectName)
    }
  }, [geometry, projectName])

  const handleSelectText = useCallback((id: string) => {
    setSelectedTextId(id)
  }, [])

  const handleAddText = useCallback(() => {
    addText()
    if (params.texts.length < 3) {
      const next = params.texts[params.texts.length]
      if (next) setSelectedTextId(next.id)
    }
  }, [addText, params.texts])

  const handleMoveText = useCallback((id: string, x: number, y: number) => {
    updateTextById(id, { offsetX: x, offsetY: y })
  }, [updateTextById])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <MarcadorPaginaTool
            params={params}
            selectedTextId={selectedTextId}
            onSelectText={handleSelectText}
            onUpdateText={updateTextById}
            onAddText={handleAddText}
            onRemoveText={removeText}
            onUpdateParam={updateParam}
            onReset={reset}
            onOpenEditor={() => setEditorOpen(true)}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
        >
          <Suspense fallback={null}>
            <MarcadorPaginaPreview
              geometry={geometry}
              baseColor={params.baseColor}
              letterColor={params.letterColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={{ width: dimensions.length, height: dimensions.width, thickness: dimensions.thickness }} />
      {isEditorOpen && (
        <Suspense fallback={null}>
          <BookmarkTextPositionEditor
            params={params}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
            onMoveText={handleMoveText}
            onClose={() => setEditorOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

function PlacaLojaToolWrapper({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)
  const [selectedTextId, setSelectedTextId] = useState<string>('')
  const [isEditorOpen, setEditorOpen] = useState(false)

  const {
    params,
    geometry,
    dimensions,
    updateParam,
    updateTextById,
    addText,
    removeText,
    reset,
  } = usePlacaLoja()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (geometry) {
      exportPlacaLojaStl(geometry, projectName)
    }
  }, [geometry, projectName])

  const handleSelectText = useCallback((id: string) => {
    setSelectedTextId(id)
  }, [])

  const handleAddText = useCallback(() => {
    addText()
    if (params.texts.length < 5) {
      const next = params.texts[params.texts.length]
      if (next) setSelectedTextId(next.id)
    }
  }, [addText, params.texts])

  const handleMoveText = useCallback((id: string, x: number, y: number) => {
    updateTextById(id, { offsetX: x, offsetY: y })
  }, [updateTextById])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="flex w-64 items-center justify-center border-l border-neutral-200 bg-white"><Loader /></div>}>
          <PlacaLojaTool
            params={params}
            selectedTextId={selectedTextId}
            onSelectText={handleSelectText}
            onUpdateText={updateTextById}
            onAddText={handleAddText}
            onRemoveText={removeText}
            onUpdateParam={updateParam}
            onReset={reset}
            onOpenEditor={() => setEditorOpen(true)}
          />
        </Suspense>
        <StudioViewport
          hasGeometry={geometry !== null}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
        >
          <Suspense fallback={null}>
            <PlacaLojaPreview
              geometry={geometry}
              baseColor={params.baseColor}
              letterColor={params.letterColor}
            />
          </Suspense>
        </StudioViewport>
      </div>
      <StudioStatusBar dimensions={dimensions} />
      {isEditorOpen && (
        <Suspense fallback={null}>
          <PlacaLojaTextPositionEditor
            params={params}
            selectedTextId={selectedTextId}
            onSelectText={setSelectedTextId}
            onMoveText={handleMoveText}
            onClose={() => setEditorOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

export function StudioPage() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)

  if (activeTool === null) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
        <StudioTopbar
          projectName="Projeto sem título"
          onProjectNameChange={() => {}}
          canExport={false}
          onExport={() => {}}
        />
        <ToolSelector onSelect={setActiveTool} />
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <Loader />
      </div>
    }>
      {activeTool === 'chaveiro' && (
        <ChaveiroToolWrapper onBack={() => setActiveTool(null)} />
      )}
      {activeTool === 'cartao-visita' && (
        <CartaoVisitaToolWrapper onBack={() => setActiveTool(null)} />
      )}
      {activeTool === 'suporte-bolo' && (
        <SuporteBoloToolWrapper onBack={() => setActiveTool(null)} />
      )}
      {activeTool === 'suporte-foto' && (
        <SuporteFotoToolWrapper onBack={() => setActiveTool(null)} />
      )}
      {activeTool === 'topo-bolo' && (
        <TopoBoloToolWrapper onBack={() => setActiveTool(null)} />
      )}
      {activeTool === 'carimbo-brigadeiro' && (
        <CarimboBrigadeiroToolWrapper onBack={() => setActiveTool(null)} />
      )}
      {activeTool === 'cortador-carimbo' && (
        <CortadorCarimboToolWrapper onBack={() => setActiveTool(null)} />
      )}
      {activeTool === 'marcador-pagina' && (
        <MarcadorPaginaToolWrapper onBack={() => setActiveTool(null)} />
      )}
      {activeTool === 'placa-loja' && (
        <PlacaLojaToolWrapper onBack={() => setActiveTool(null)} />
      )}
    </Suspense>
  )
}
