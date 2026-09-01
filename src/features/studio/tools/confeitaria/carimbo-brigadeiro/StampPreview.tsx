import type { BuildStampResult } from './buildStamp'

interface StampPreviewProps {
  geometry: BuildStampResult | null
  baseColor: string
  reliefColor: string
}

export function StampPreview({ geometry, baseColor, reliefColor }: StampPreviewProps) {
  if (!geometry) return null

  return (
    <group>
      <mesh geometry={geometry.base} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={geometry.handle} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.text && (
        <mesh geometry={geometry.text} castShadow receiveShadow>
          <meshStandardMaterial color={reliefColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
      {geometry.icon && (
        <mesh geometry={geometry.icon} castShadow receiveShadow>
          <meshStandardMaterial color={reliefColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
    </group>
  )
}