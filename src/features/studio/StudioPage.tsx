import { useCallback, useState } from 'react'
import { StudioTopbar } from './components/StudioTopbar'
import { StudioPanel } from './components/StudioPanel'
import { StudioViewport } from './components/StudioViewport'
import { StudioStatusBar } from './components/StudioStatusBar'
import { useKeychain } from './hooks/useKeychain'
import { exportStl } from './keychain/exportStl'

export function StudioPage() {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const { params, geometry, dimensions, updateParam, addText, removeText, updateText, reset } = useKeychain()
  const [selectedTextId, setSelectedTextId] = useState(params.texts[0]?.id ?? '')

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleMoveText = useCallback((id: string, x: number, y: number) => {
    updateText(id, { offsetX: x, offsetY: y })
  }, [updateText])

  const handleExport = useCallback(() => {
    if (geometry) {
      exportStl(geometry, projectName)
    }
  }, [geometry, projectName])

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
          onSelectText={setSelectedTextId}
          onUpdateText={updateText}
          onAddText={addText}
          onRemoveText={removeText}
          onUpdateParam={updateParam}
          onReset={reset}
        />
        <StudioViewport
          geometry={geometry}
          resetCameraSignal={resetCameraSignal}
          onResetCamera={handleResetCamera}
          baseColor={params.baseColor}
          letterColor={params.letterColor}
          selectedTextId={selectedTextId}
          onSelectText={setSelectedTextId}
          onMoveText={handleMoveText}
        />
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}
