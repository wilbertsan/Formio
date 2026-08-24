import { View } from '@aws-amplify/ui-react'
import type { KeychainParams } from '../keychain/schema'

interface StudioToolbarProps {
  activeShape: KeychainParams['baseShape']
  textMode: KeychainParams['textMode']
  onSelectShape: (shape: KeychainParams['baseShape']) => void
  onSelectTextMode: (mode: KeychainParams['textMode']) => void
  onResetCamera: () => void
}

const shapes: { id: KeychainParams['baseShape']; label: string; icon: string }[] = [
  { id: 'rect', label: 'Retângulo', icon: '▭' },
  { id: 'circle', label: 'Círculo', icon: '◯' },
  { id: 'heart', label: 'Coração', icon: '♥' },
]

const textModes: { id: KeychainParams['textMode']; label: string; icon: string }[] = [
  { id: 'raised', label: 'Relevo', icon: 'A▲' },
  { id: 'engraved', label: 'Gravado', icon: 'A▼' },
]

const inactiveButtonClassName =
  'flex h-10 w-10 items-center justify-center rounded-md text-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900'
const activeButtonClassName =
  'flex h-10 w-10 items-center justify-center rounded-md text-lg bg-teal-600 text-white transition-colors'

export function StudioToolbar({
  activeShape,
  textMode,
  onSelectShape,
  onSelectTextMode,
  onResetCamera,
}: StudioToolbarProps) {
  return (
    <View
      as="nav"
      aria-label="Ferramentas do studio"
      className="flex w-14 flex-col items-center gap-1 border-r border-neutral-200 bg-white py-2"
    >
      {shapes.map((shape) => (
        <button
          key={shape.id}
          type="button"
          title={shape.label}
          aria-label={shape.label}
          aria-pressed={activeShape === shape.id}
          onClick={() => onSelectShape(shape.id)}
          className={activeShape === shape.id ? activeButtonClassName : inactiveButtonClassName}
        >
          <span aria-hidden="true">{shape.icon}</span>
        </button>
      ))}
      <View className="my-1 h-px w-8 bg-neutral-200" />
      {textModes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          title={mode.label}
          aria-label={mode.label}
          aria-pressed={textMode === mode.id}
          onClick={() => onSelectTextMode(mode.id)}
          className={`text-sm ${textMode === mode.id ? activeButtonClassName : inactiveButtonClassName}`}
        >
          <span aria-hidden="true">{mode.icon}</span>
        </button>
      ))}
      <View className="my-1 h-px w-8 bg-neutral-200" />
      <button
        type="button"
        title="Resetar câmera"
        aria-label="Resetar câmera"
        onClick={onResetCamera}
        className={inactiveButtonClassName}
      >
        <span aria-hidden="true">⌂</span>
      </button>
    </View>
  )
}
