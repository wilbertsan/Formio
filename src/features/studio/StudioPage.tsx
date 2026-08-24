import { useCallback, useState } from 'react'
import { StudioTopbar } from './components/StudioTopbar'
import { StudioToolbar } from './components/StudioToolbar'
import { StudioViewport } from './components/StudioViewport'
import { StudioParameters } from './components/StudioParameters'
import { StudioStatusBar } from './components/StudioStatusBar'
import { useKeychain } from './hooks/useKeychain'
import { exportStl } from './keychain/exportStl'
import type { KeychainParams } from './keychain/schema'

export function StudioPage() {
  const [projectName, setProjectName] = useState('Projeto sem título')
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

  const { params, keychainResult, dimensions, updateParam, updateName, reset } = useKeychain()

  const handleResetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const handleExport = useCallback(() => {
    if (keychainResult) {
      exportStl(keychainResult.base, projectName)
    }
  }, [keychainResult, projectName])

  const handleSelectShape = useCallback(
    (shape: KeychainParams['shape']) => updateParam('shape', shape),
    [updateParam],
  )

  const handleSelectTextMode = useCallback(
    (mode: KeychainParams['textMode']) => updateParam('textMode', mode),
    [updateParam],
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50">
      <StudioTopbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canExport={keychainResult !== null}
        onExport={handleExport}
      />
      <div className="flex min-h-0 flex-1">
        <StudioToolbar
          activeShape={params.shape}
          textMode={params.textMode}
          onSelectShape={handleSelectShape}
          onSelectTextMode={handleSelectTextMode}
          onResetCamera={handleResetCamera}
        />
        <StudioViewport geometry={keychainResult?.base ?? null} resetCameraSignal={resetCameraSignal} />
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
