import { View, Heading, Text } from '@aws-amplify/ui-react'

export type ToolId = 'chaveiro' | 'cartao-visita' | 'suporte-bolo' | 'suporte-foto'

interface ToolCard {
  id: ToolId
  name: string
  description: string
  icon: string
  category: string
}

const TOOLS: ToolCard[] = [
  {
    id: 'chaveiro',
    name: 'Chaveiro',
    description: 'Chaveiros 3D personalizados com texto em relevo e formatos variados',
    icon: '🔑',
    category: 'Chaveiros',
  },
  {
    id: 'cartao-visita',
    name: 'Cartão de Visita',
    description: 'Cartões de visita 3D com texto em relevo e layout personalizado',
    icon: '💳',
    category: 'Letreiros',
  },
  {
    id: 'suporte-bolo',
    name: 'Suporte de Bolo',
    description: 'Suportes para exibir bolo com decoração personalizada',
    icon: '🎂',
    category: 'Confeitaria',
  },
  {
    id: 'suporte-foto',
    name: 'Suporte para Foto',
    description: 'Suportes personalizados com texto 3D e slot para fotos',
    icon: '🖼️',
    category: 'Letreiros',
  },
]

interface ToolSelectorProps {
  onSelect: (toolId: ToolId) => void
}

export function ToolSelector({ onSelect }: ToolSelectorProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-neutral-50 p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Heading level={2} fontSize="large" color="font.primary">
            Escolha uma Ferramenta
          </Heading>
          <Text fontSize="small" color="font.tertiary">
            Selecione o tipo de produto 3D que deseja criar
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelect(tool.id)}
              className="group flex flex-col items-start rounded-lg border border-neutral-200 bg-white p-6 text-left shadow-sm transition-all hover:border-teal-500 hover:shadow-md focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <View className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-2xl group-hover:bg-teal-100">
                {tool.icon}
              </View>
              <Heading level={3} fontSize="medium" color="font.primary" className="mb-1">
                {tool.name}
              </Heading>
              <Text fontSize="xs" color="font.tertiary" className="mb-2">
                {tool.category}
              </Text>
              <Text fontSize="small" color="font.secondary">
                {tool.description}
              </Text>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
