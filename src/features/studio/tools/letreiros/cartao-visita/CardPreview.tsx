import type { BuildCardResult } from './buildCard'

interface CardPreviewProps {
  geometry: BuildCardResult | null
  baseColor: string
  letterColor: string
}

export function CardPreview({ geometry, baseColor, letterColor }: CardPreviewProps) {
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.text && (
        <mesh geometry={geometry.text} castShadow>
          <meshStandardMaterial color={letterColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
    </group>
  )
}
