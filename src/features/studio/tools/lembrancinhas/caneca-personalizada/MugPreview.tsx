import type { BufferGeometry } from 'three'

interface MugPreviewProps {
  body: BufferGeometry | null
  handle: BufferGeometry | null
  bodyColor: string
  accentColor: string
}

export function MugPreview({
  body,
  handle,
  bodyColor,
  accentColor,
}: MugPreviewProps) {
  if (!body && !handle) return null

  return (
    <group>
      {body && (
        <mesh geometry={body} castShadow receiveShadow>
          <meshStandardMaterial color={bodyColor} metalness={0.05} roughness={0.5} />
        </mesh>
      )}
      {handle && (
        <mesh geometry={handle} castShadow receiveShadow>
          <meshStandardMaterial color={accentColor} metalness={0.05} roughness={0.5} />
        </mesh>
      )}
    </group>
  )
}
