import { Flex, View } from '@aws-amplify/ui-react'

interface StudioTopbarProps {
  projectName: string
  onProjectNameChange: (name: string) => void
  canExport: boolean
  onExport: () => void
  onBack?: () => void
}

export function StudioTopbar({ projectName, onProjectNameChange, canExport, onExport, onBack }: StudioTopbarProps) {
  return (
    <View
      as="header"
      className="flex h-12 items-center justify-between border-b border-neutral-200 bg-white px-4"
    >
      <Flex direction="row" alignItems="center" gap="medium">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-7 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            ← Voltar
          </button>
        )}
        <span className="text-sm font-bold tracking-tight text-neutral-900">3DFormio</span>
        <View
          as="input"
          aria-label="Nome do projeto"
          value={projectName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onProjectNameChange(event.target.value)}
          className="w-56 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 outline-none focus:border-brand-600"
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
