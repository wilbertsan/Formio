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

  const { params, geometry, dimensions, updateParam, updateName, updateText, reset } = useKeychain()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

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
          onUpdateParam={updateParam}
          onUpdateName={updateName}
          onUpdateText={updateText}
          onReset={reset}
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
    </div>
  )
}