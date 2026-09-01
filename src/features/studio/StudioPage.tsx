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
    </Suspense>
  )
}
