import { View, Heading, Text } from '@aws-amplify/ui-react'

export type ToolId = 'chaveiro' | 'cartao-visita' | 'suporte-bolo' | 'suporte-foto' | 'topo-bolo' | 'carimbo-brigadeiro' | 'cortador-carimbo' | 'rolo-textura' | 'marcador-pagina' | 'placa-loja'

type ToolCategory = 'Confeitaria' | 'Letreiros'

interface ToolCard {
  id: ToolId
  name: string
  description: string
  icon: string
  category: ToolCategory
}

const CATEGORY_ORDER: ToolCategory[] = ['Confeitaria', 'Letreiros']

const TOOLS: ToolCard[] = [
  {
    id: 'chaveiro',
    name: 'Chaveiro',
    description: 'Chaveiros 3D personalizados com texto em relevo e formatos variados',
    icon: '🔑',
    category: 'Letreiros',
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
  {
    id: 'topo-bolo',
    name: 'Topo de Bolo',
    description: 'Toppers com texto em relevo ou vazado, ícone SVG e fixação por haste ou base',
    icon: '🎂',
    category: 'Confeitaria',
  },
  {
    id: 'carimbo-brigadeiro',
    name: 'Carimbo Brigadeiro',
    description: 'Carimbos para marcar brigadeiros com texto e formatos',
    icon: '🔖',
    category: 'Confeitaria',
  },
  {
    id: 'cortador-carimbo',
    name: 'Cortador + Carimbo',
    description: 'Cortador e carimbo a partir de texto ou SVG',
    icon: '🍪',
    category: 'Confeitaria',
  },
  {
    id: 'rolo-textura',
    name: 'Rolo de Textura',
    description: 'Rolos de textura em relevo para marcar massas, fondant e doces',
    icon: '🍥',
    category: 'Confeitaria',
  },
  {
    id: 'marcador-pagina',
    name: 'Marcador de Página',
    description: 'Marcadores 3D personalizados com texto em relevo e furo para fita',
    icon: '📖',
    category: 'Letreiros',
  },
  {
    id: 'placa-loja',
    name: 'Placa de Loja',
    description: 'Placas de identificação 3D com texto personalizável e furos para parafuso',
    icon: '🏪',
    category: 'Letreiros',
  },
]

interface ToolSelectorProps {
  onSelect: (toolId: ToolId) => void
}

export function ToolSelector({ onSelect }: ToolSelectorProps) {
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    tools: TOOLS.filter((tool) => tool.category === category),
  }))

  return (
    <div className="flex flex-1 justify-center overflow-y-auto bg-neutral-50 p-8">
      <div className="w-full max-w-7xl">
        <div className="mb-8 text-center">
          <Heading level={1} fontSize="large" color="font.primary">
            Escolha uma Ferramenta
          </Heading>
          <Text fontSize="small" color="font.tertiary">
            Selecione o tipo de produto 3D que deseja criar
          </Text>
        </div>

        <div className="flex flex-col gap-8">
          {groups.map(({ category, tools }) => (
            <section key={category} aria-labelledby={`category-${category}`}>
              <Heading
                id={`category-${category}`}
                level={2}
                fontSize="medium"
                color="font.primary"
                className="mb-4"
              >
                {category}
              </Heading>

              <div className="flex flex-wrap items-stretch gap-4">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => onSelect(tool.id)}
                    className="group flex w-full flex-col items-start rounded-lg border border-neutral-200 bg-white p-6 text-left shadow-sm transition-all hover:border-brand-500 hover:shadow-md focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:w-56"
                  >
                    <View className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-2xl group-hover:bg-brand-100">
                      {tool.icon}
                    </View>
                    <Heading level={3} fontSize="medium" color="font.primary" className="mb-2">
                      {tool.name}
                    </Heading>
                    <Text fontSize="small" color="font.secondary">
                      {tool.description}
                    </Text>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
