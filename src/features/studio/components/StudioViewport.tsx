import { Suspense, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Loader } from '@aws-amplify/ui-react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { PerspectiveCamera } from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Grid, OrbitControls } from '@react-three/drei'

interface StudioViewportProps {
  hasGeometry: boolean
  resetCameraSignal: number
  onResetCamera: () => void
  cameraPosition?: [number, number, number]
  /** Raio da esfera envolvente do objeto. Se informado, o reset enquadra ~80% da tela. */
  fitRadius?: number
  children: ReactNode
}

// Fração da tela que o objeto deve preencher ao resetar a câmera.
const FIT_FILL = 0.8
// Inclinação (graus) e giro (graus) em torno do eixo Y do reset.
const RESET_ELEVATION_DEGREES = 25
const RESET_AZIMUTH_DEGREES = 180

function CameraController({
  controlsRef,
  resetSignal,
  cameraPosition,
  fitRadius,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>
  resetSignal: number
  cameraPosition: [number, number, number]
  fitRadius?: number
}) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const handledRef = useRef<number | null>(null)

  useEffect(() => {
    if (handledRef.current === resetSignal) return
    handledRef.current = resetSignal

    const perspective = camera as PerspectiveCamera
    if (!perspective || typeof perspective.position?.set !== 'function') return

    if (fitRadius && size && size.height > 0) {
      const aspect = size.width / size.height
      const tanVertical = Math.tan((perspective.fov * Math.PI) / 360)
      const tanHorizontal = tanVertical * aspect
      // Distância que faz a esfera envolvente preencher FIT_FILL da tela.
      const distance = Math.max(
        fitRadius / (FIT_FILL * tanVertical),
        fitRadius / (FIT_FILL * tanHorizontal),
      )
      const elevation = (RESET_ELEVATION_DEGREES * Math.PI) / 180
      const azimuth = (RESET_AZIMUTH_DEGREES * Math.PI) / 180
      const cosElevation = Math.cos(elevation)
      perspective.position.set(
        distance * Math.sin(azimuth) * cosElevation,
        distance * Math.sin(elevation),
        distance * Math.cos(azimuth) * cosElevation,
      )
      perspective.lookAt(0, 0, 0)
    } else {
      perspective.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2])
      perspective.lookAt(0, 0, 0)
    }
    const controls = controlsRef.current
    if (controls) {
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }, [resetSignal, fitRadius, cameraPosition, camera, size, controlsRef])

  return null
}

export function StudioViewport({
  hasGeometry,
  resetCameraSignal,
  onResetCamera,
  cameraPosition = [40, 30, 80],
  fitRadius,
  children,
}: StudioViewportProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

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
          <CameraController
            controlsRef={controlsRef}
            resetSignal={resetCameraSignal}
            cameraPosition={cameraPosition}
            fitRadius={fitRadius}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
