import { useCallback, useState } from 'react'
import { StudioTopbar } from './components/StudioTopbar'
import { StudioToolbar, type StudioTool } from './components/StudioToolbar'
import { StudioViewport } from './components/StudioViewport'
import { StudioParameters } from './components/StudioParameters'
import { StudioStatusBar } from './components/StudioStatusBar'
import { useKeychain } from './hooks/useKeychain'
import { exportStl } from './keychain/exportStl'

export function StudioPage() {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [activeTool, setActiveTool] = useState<StudioTool>('select')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const { params, geometry, dimensions, updateParam, updateName, reset } = useKeychain()

  const handleExport = useCallback(() => {
    if (geometry) exportStl(geometry, projectName)
  }, [geometry, projectName])

  return (
    <div className="flex h-screen flex-col">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={geometry !== null}
        onExport={handleExport}
      />
      <div className="flex flex-1 overflow-hidden">
        <StudioToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onResetCamera={() => setResetCameraSignal((s) => s + 1)}
        />
        <StudioViewport geometry={geometry} resetCameraSignal={resetCameraSignal} />
        <StudioParameters
          params={params}
          onUpdateParam={updateParam}
          onUpdateName={updateName}
          onReset={reset}
        />
      </div>
      <StudioStatusBar dimensions={dimensions} />
    </div>
  )
}
