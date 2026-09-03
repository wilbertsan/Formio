import type { BuildPlacaLojaResult } from './buildPlacaLoja'

interface PlacaLojaPreviewProps {
  geometry: BuildPlacaLojaResult | null
  baseColor: string
  letterColor: string
}

export function PlacaLojaPreview({ geometry, baseColor, letterColor }: PlacaLojaPreviewProps) {
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
