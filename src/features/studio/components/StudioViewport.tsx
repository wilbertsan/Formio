import { Suspense, useEffect, useRef } from 'react'
import { Loader } from '@aws-amplify/ui-react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { BuildKeychainResult } from '../keychain/buildKeychain'
import { Canvas } from '@react-three/fiber'
import { Environment, Grid, OrbitControls } from '@react-three/drei'
import { KeychainPreview } from './KeychainPreview'

interface StudioViewportProps {
  geometry: BuildKeychainResult | null
  resetCameraSignal: number
  onResetCamera: () => void
  baseColor: string
  letterColor: string
  selectedTextId: string | null
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function StudioViewport({
  geometry,
  resetCameraSignal,
  onResetCamera,
  baseColor,
  letterColor,
  selectedTextId,
  onSelectText,
  onMoveText,
  onDragStart,
  onDragEnd,
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
      {geometry && (
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
      {geometry ? null : (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Loader />
        </div>
      )}
      <Canvas
        shadows
        camera={{ position: [40, 30, 80], fov: 45 }}
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
          <KeychainPreview
            baseGeometry={geometry?.base ?? null}
            textMeshes={geometry?.textItems?.map((ti) => ({ id: ti.id, geometry: ti.geometry, x: 0, y: 0 })) ?? []}
            baseColor={baseColor}
            letterColor={letterColor}
            selectedTextId={selectedTextId}
            onSelectText={onSelectText}
            onMoveText={onMoveText}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            pieceBB={geometry?.pieceBB ?? null}
            hole={geometry?.hole ?? null}
            pieceThickness={3}
          />
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
