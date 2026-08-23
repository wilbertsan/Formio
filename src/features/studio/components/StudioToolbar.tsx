import { View } from '@aws-amplify/ui-react'

export type StudioTool = 'select' | 'move' | 'rotate' | 'zoom'

interface StudioToolbarProps {
  activeTool: StudioTool
  onSelectTool: (tool: StudioTool) => void
  onResetCamera: () => void
}

const tools: { id: StudioTool; label: string; icon: string }[] = [
  { id: 'select', label: 'Selecionar', icon: '⬚' },
  { id: 'move', label: 'Mover', icon: '✥' },
  { id: 'rotate', label: 'Rotacionar', icon: '⟳' },
  { id: 'zoom', label: 'Zoom', icon: '⤢' },
]

export function StudioToolbar({ activeTool, onSelectTool, onResetCamera }: StudioToolbarProps) {
  return (
    <View
      as="nav"
      aria-label="Ferramentas do studio"
      className="flex w-14 flex-col items-center gap-1 border-r border-neutral-800 bg-neutral-900 py-2"
    >
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          title={tool.label}
          aria-label={tool.label}
          aria-pressed={activeTool === tool.id}
          onClick={() => onSelectTool(tool.id)}
          className={`flex h-10 w-10 items-center justify-center rounded-md text-lg transition-colors ${
            activeTool === tool.id
              ? 'bg-teal-600 text-white'
              : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
          }`}
        >
          <span aria-hidden="true">{tool.icon}</span>
        </button>
      ))}
      <View className="my-1 h-px w-8 bg-neutral-800" />
      <button
        type="button"
        title="Resetar câmera"
        aria-label="Resetar câmera"
        onClick={onResetCamera}
        className="flex h-10 w-10 items-center justify-center rounded-md text-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
      >
        <span aria-hidden="true">⌂</span>
      </button>
    </View>
  )
}
