import { Suspense, useEffect, useRef, type ReactNode } from 'react'
import { Loader } from '@aws-amplify/ui-react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Canvas } from '@react-three/fiber'
import { Environment, Grid, OrbitControls } from '@react-three/drei'

interface StudioViewportProps {
  hasGeometry: boolean
  resetCameraSignal: number
  onResetCamera: () => void
  cameraPosition?: [number, number, number]
  children: ReactNode
}

export function StudioViewport({
  hasGeometry,
  resetCameraSignal,
  onResetCamera,
  cameraPosition = [40, 30, 80],
  children,
}: StudioViewportProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    if (resetCameraSignal > 0) {
      controlsRef.current?.reset()
    }
  }, [resetCameraSignal])

  return (
    <div
      role="img"
      aria-label="Visualização 3D do modelo"
      className="relative flex-1 bg-neutral-100"
    >
      {hasGeometry && (
        <button
          type="button"
          title="Resetar câmera"
          aria-label="Resetar câmera"
          onClick={onResetCamera}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white/90 text-neutral-600 shadow-sm transition-colors hover:bg-neutral-100"
        >
          ⌂
        </button>
      )}
      {!hasGeometry && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Loader />
        </div>
      )}
      <Canvas
        shadows
        camera={{ position: cameraPosition, fov: 45 }}
        className="absolute inset-0"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[80, 120, 60]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          {children}
          <Grid
            position={[0, -25, 0]}
            args={[300, 300]}
            cellSize={10}
            cellColor="#d4d4d4"
            sectionSize={50}
            sectionColor="#a3a3a3"
            fadeDistance={150}
            infiniteGrid
          />
          <Environment preset="city" />
          <OrbitControls ref={controlsRef} makeDefault />
        </Suspense>
      </Canvas>
    </div>
  )
}
