import type { BuildBookmarkResult } from './buildBookmark'

/** Deita a base no plano horizontal (plano XZ) e vira o texto para a frente. */
const DEFAULT_ROTATION_X = (-90 * Math.PI) / 180
const DEFAULT_ROTATION_Z = (-90 * Math.PI) / 180

interface BookmarkPreviewProps {
  geometry: BuildBookmarkResult | null
  baseColor: string
  letterColor: string
}

export function BookmarkPreview({ geometry, baseColor, letterColor }: BookmarkPreviewProps) {
  if (!geometry) return null
  return (
    <group rotation={[DEFAULT_ROTATION_X, 0, DEFAULT_ROTATION_Z]}>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={geometry.text} castShadow receiveShadow>
        <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
      </mesh>
    </group>
  )
}
