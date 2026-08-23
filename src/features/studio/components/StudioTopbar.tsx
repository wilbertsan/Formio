import { Flex, View } from '@aws-amplify/ui-react'

interface StudioTopbarProps {
  projectName: string
  onProjectNameChange: (name: string) => void
  canExport: boolean
  onExport: () => void
}

export function StudioTopbar({ projectName, onProjectNameChange, canExport, onExport }: StudioTopbarProps) {
  return (
    <View
      as="header"
      className="flex h-12 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4"
    >
      <Flex direction="row" alignItems="center" gap="medium">
        <span className="text-sm font-bold tracking-tight text-white">3DFormio</span>
        <View
          as="input"
          aria-label="Nome do projeto"
          value={projectName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onProjectNameChange(event.target.value)}
          className="w-56 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-teal-500"
        />
      </Flex>
      <Flex direction="row" gap="small">
        <button
          type="button"
          disabled={!canExport}
          onClick={onExport}
          className="btn-secondary"
        >
          Exportar STL
        </button>
        <button type="button" disabled title="disponível no Sprint 2" className="btn-primary">
          Salvar
        </button>
      </Flex>
    </View>
  )
}
