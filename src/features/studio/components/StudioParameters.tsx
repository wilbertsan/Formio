import {
  Button,
  Flex,
  Heading,
  SliderField,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react'
import { type KeychainParams } from '../keychain/schema'

interface StudioParametersProps {
  params: KeychainParams
  onUpdateParam: (key: keyof KeychainParams, value: number | string) => void
  onUpdateName: (name: string) => void
  onReset: () => void
}

const SLIDERS = [
  { key: 'width' as const, label: 'Largura', min: 20, max: 80, step: 1, unit: 'mm' },
  { key: 'thickness' as const, label: 'Espessura', min: 2, max: 6, step: 0.5, unit: 'mm' },
  { key: 'letterHeight' as const, label: 'Altura da letra', min: 0.4, max: 2, step: 0.1, unit: 'mm' },
  { key: 'ringInnerDiameter' as const, label: 'Diâmetro do furo', min: 3, max: 10, step: 0.5, unit: 'mm' },
  { key: 'ringThickness' as const, label: 'Espessura do anel', min: 1.5, max: 4, step: 0.5, unit: 'mm' },
]

export function StudioParameters({
  params,
  onUpdateParam,
  onUpdateName,
  onReset,
}: StudioParametersProps) {
  return (
    <View
      as="aside"
      aria-label="Parâmetros do modelo"
      className="studio-parameters flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Parâmetros
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <TextField
        label="Nome"
        descriptiveText="Até 12 caracteres. Acentos são removidos."
        value={params.name}
        maxLength={12}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateName(e.target.value)}
      />

      {SLIDERS.map((slider) => (
        <View key={slider.key} className="flex flex-col gap-0.5">
          <Flex direction="row" justifyContent="space-between">
            <Text fontSize="xs" color="font.tertiary">
              {slider.label}
            </Text>
            <Text fontSize="xs" color="font.secondary">
              {params[slider.key]} {slider.unit}
            </Text>
          </Flex>
          <SliderField
            label=""
            aria-label={slider.label}
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={params[slider.key]}
            onChange={(value) => onUpdateParam(slider.key, value as number)}
          />
        </View>
      ))}
    </View>
  )
}
