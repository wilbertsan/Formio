import type { BuildCakeTopperResult } from './buildCakeTopper'

interface CakeTopperPreviewProps {
  geometry: BuildCakeTopperResult | null
  baseColor: string
  textColor: string
}

export function CakeTopperPreview({ geometry, baseColor, textColor }: CakeTopperPreviewProps) {
  if (!geometry) return null

  return (
    <group>
      <mesh geometry={geometry.plate} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.text && (
        <mesh geometry={geometry.text} castShadow receiveShadow>
          <meshStandardMaterial color={textColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
      {geometry.icon && (
        <mesh geometry={geometry.icon} castShadow receiveShadow>
          <meshStandardMaterial color={textColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
      {geometry.leg && (
        <mesh geometry={geometry.leg} castShadow receiveShadow>
          <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
        </mesh>
      )}
    </group>
  )
}
