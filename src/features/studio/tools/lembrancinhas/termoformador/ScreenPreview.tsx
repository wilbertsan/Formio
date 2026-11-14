import type { BufferGeometry } from 'three'

interface ScreenPreviewProps {
  geometry: BufferGeometry | null
  color: string
}

export function ScreenPreview({ geometry, color }: ScreenPreviewProps) {
  if (!geometry) return null

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} metalness={0.1} roughness={0.4} />
    </mesh>
  )
}
