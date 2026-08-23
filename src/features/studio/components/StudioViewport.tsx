import { Suspense, useEffect, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Canvas } from '@react-three/fiber'
import { Environment, Grid, OrbitControls } from '@react-three/drei'
import { SampleSolid } from './SampleSolid'
import type { ModelParameters } from '../config/parameters'

interface StudioViewportProps {
  parameters: ModelParameters
  resetCameraSignal: number
}

export function StudioViewport({ parameters, resetCameraSignal }: StudioViewportProps) {
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
      className="relative flex-1 bg-neutral-950"
    >
      <Canvas
        shadows
        camera={{ position: [90, 70, 90], fov: 45 }}
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
          <SampleSolid parameters={parameters} />
          <Grid
            args={[300, 300]}
            cellSize={10}
            cellColor="#404040"
            sectionSize={50}
            sectionColor="#525252"
            fadeDistance={280}
            infiniteGrid
          />
          <Environment preset="city" />
          <OrbitControls ref={controlsRef} makeDefault />
        </Suspense>
      </Canvas>
    </div>
  )
}
