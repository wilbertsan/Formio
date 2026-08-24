import type { BufferGeometry } from 'three'
import { TextDraggable } from './TextDraggable'
import type { BoundingBox2D, Circle2D } from '../keychain/positioning'

interface TextMeshItem {
  id: string
  geometry: BufferGeometry
  x: number
  y: number
}

interface KeychainPreviewProps {
  baseGeometry: BufferGeometry | null
  textMeshes: TextMeshItem[]
  baseColor: string
  letterColor: string
  selectedTextId: string | null
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void
  pieceBB: BoundingBox2D | null
  hole: Circle2D | null
  pieceThickness: number
}

export function KeychainPreview({
  baseGeometry,
  textMeshes,
  baseColor,
  letterColor,
  selectedTextId,
  onSelectText,
  onMoveText,
  pieceBB,
  hole,
  pieceThickness,
}: KeychainPreviewProps) {
  return (
    <group>
      {baseGeometry && (
        <mesh geometry={baseGeometry} castShadow receiveShadow>
          <meshStandardMaterial color={baseColor} metalness={0.1} roughness={0.4} />
        </mesh>
      )}
      {textMeshes.map((tm) => (
        <TextDraggable
          key={tm.id}
          id={tm.id}
          geometry={tm.geometry}
          x={tm.x}
          y={tm.y}
          z={pieceThickness - 0.01}
          letterColor={letterColor}
          selected={selectedTextId === tm.id}
          onSelect={onSelectText}
          onMove={onMoveText}
          pieceBB={pieceBB}
          hole={hole}
          halfWidth={5}
          halfHeight={4}
        />
      ))}
    </group>
  )
}
