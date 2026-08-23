import { Button, Flex, Heading, SliderField, Text, View } from '@aws-amplify/ui-react'
import {
  parameterDefinitions,
  type ModelParameters,
  type ParameterKey,
} from '../config/parameters'

interface StudioParametersProps {
  parameters: ModelParameters
  onUpdateParameter: (key: ParameterKey, value: number) => void
  onResetParameters: () => void
}

export function StudioParameters({
  parameters,
  onUpdateParameter,
  onResetParameters,
}: StudioParametersProps) {
  return (
    <View
      as="aside"
      aria-label="Parâmetros do modelo"
      className="flex w-70 flex-col gap-4 overflow-y-auto border-l border-neutral-800 bg-neutral-900 p-4"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="large" color="font.primary">
          Parâmetros
        </Heading>
        <Button size="small" variation="link" onClick={onResetParameters}>
          Restaurar padrão
        </Button>
      </Flex>
      {parameterDefinitions.map((def) => (
        <View key={def.key} className="flex flex-col gap-1">
          <Flex direction="row" justifyContent="space-between">
            <Text fontSize="small">{def.label}</Text>
            <Text fontSize="small">
              {parameters[def.key]} {def.unit}
            </Text>
          </Flex>
          <SliderField
            label=""
            aria-label={def.label}
            min={def.min}
            max={def.max}
            step={def.step}
            value={parameters[def.key]}
            onChange={(value) => onUpdateParameter(def.key, value as number)}
          />
        </View>
      ))}
    </View>
  )
}
