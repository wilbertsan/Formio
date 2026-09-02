import type { BuildBookmarkResult } from './buildBookmark'

interface BookmarkPreviewProps {
  geometry: BuildBookmarkResult | null
  baseColor: string
  letterColor: string
}

export function BookmarkPreview({ geometry, baseColor, letterColor }: BookmarkPreviewProps) {
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={geometry.text} castShadow receiveShadow>
        <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
      </mesh>
    </group>
  )
}
