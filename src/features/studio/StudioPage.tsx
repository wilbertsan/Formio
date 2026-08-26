import { useCallback, useState } from 'react'
import { StudioTopbar } from './components/StudioTopbar'
import { StudioPanel } from './tools/chaveiros/chaveiro/StudioPanel'
import { StudioViewport } from './components/StudioViewport'
import { StudioStatusBar } from './components/StudioStatusBar'
import { TextPositionEditor } from './tools/chaveiros/chaveiro/TextPositionEditor'
import { useKeychain } from './tools/chaveiros/chaveiro/useKeychain'
import { exportStl } from './tools/chaveiros/chaveiro/exportStl'

export function StudioPage() {
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
      />
      <div className="flex min-h-0 flex-1">
        <StudioPanel
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
        <StudioViewport
          geometry={geometry}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
          baseColor={params.baseColor}
          letterColor={params.letterColor}
        />
      </div>
      <StudioStatusBar dimensions={dimensions} />
      {isEditorOpen && (
        <TextPositionEditor
          params={params}
          selectedTextId={selectedTextId}
          onSelectText={setSelectedTextId}
          onMoveText={handleMoveText}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  )
}
