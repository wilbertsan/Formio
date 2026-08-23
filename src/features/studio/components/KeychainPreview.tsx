import type { BufferGeometry } from 'three'

interface KeychainPreviewProps {
  geometry: BufferGeometry | null
}

export function KeychainPreview({ geometry }: KeychainPreviewProps) {
  if (!geometry) return null
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#14b8a6" metalness={0.1} roughness={0.4} />
    </mesh>
  )
}
