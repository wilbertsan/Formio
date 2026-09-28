import type { BuildCutterStampResult } from './buildCutterStamp'

interface CutterStampPreviewProps {
  geometry: BuildCutterStampResult | null
  baseColor: string
  stampColor: string
}

export function CutterStampPreview({ geometry, baseColor, stampColor }: CutterStampPreviewProps) {
  if (!geometry) return null

  return (
    <group>
      <mesh geometry={geometry.wall} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
      </mesh>
      {geometry.text && (
        <mesh geometry={geometry.text} castShadow receiveShadow>
          <meshStandardMaterial color={stampColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
      {geometry.centralShape && (
        <mesh geometry={geometry.centralShape} castShadow receiveShadow>
          <meshStandardMaterial color={stampColor} metalness={0.1} roughness={0.3} />
        </mesh>
      )}
    </group>
  )
}
