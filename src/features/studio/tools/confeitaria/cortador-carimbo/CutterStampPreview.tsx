import type { BuildCutterStampResult } from './buildCutterStamp'

interface CutterStampPreviewProps {
  geometry: BuildCutterStampResult | null
  cutterColor: string
  stampColor: string
}

export function CutterStampPreview({ geometry, cutterColor, stampColor }: CutterStampPreviewProps) {
  if (!geometry) return null

  return (
    <group>
      <mesh geometry={geometry.cutter} castShadow receiveShadow>
        <meshStandardMaterial color={cutterColor} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={geometry.stampBase} castShadow receiveShadow>
        <meshStandardMaterial color={stampColor} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh geometry={geometry.stampRelief} castShadow receiveShadow>
        <meshStandardMaterial color={stampColor} metalness={0.1} roughness={0.3} />
      </mesh>
    </group>
  )
}
