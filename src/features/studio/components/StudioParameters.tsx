import {
  Button,
  Flex,
  Heading,
  Radio,
  RadioGroupField,
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
  { key: 'height' as const, label: 'Altura', min: 20, max: 80, step: 1, unit: 'mm' },
  { key: 'thickness' as const, label: 'Espessura', min: 2, max: 6, step: 0.5, unit: 'mm' },
  { key: 'textHeight' as const, label: 'Tamanho do texto', min: 10, max: 24, step: 1, unit: 'mm' },
  { key: 'textDepth' as const, label: 'Profundidade do texto', min: 0.4, max: 2, step: 0.1, unit: 'mm' },
  { key: 'holeDiameter' as const, label: 'Diâmetro do furo', min: 3, max: 8, step: 0.5, unit: 'mm' },
]

const SHAPES = [
  { value: 'rect' as const, label: 'Retângulo' },
  { value: 'circle' as const, label: 'Círculo' },
  { value: 'heart' as const, label: 'Coração' },
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
      className="flex w-70 flex-col gap-4 overflow-y-auto border-l border-neutral-800 bg-neutral-900 p-4"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="large" color="font.primary">
          Parâmetros
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar padrão
        </Button>
      </Flex>

      <TextField
        label="Nome"
        value={params.name}
        onChange={(e) => onUpdateName(e.target.value)}
      />

      <View className="flex flex-col gap-1">
        <Text fontSize="small">Forma</Text>
        <Flex direction="row" gap="small">
          {SHAPES.map((shape) => (
            <Button
              key={shape.value}
              size="small"
              variation={params.shape === shape.value ? 'primary' : 'link'}
              onClick={() => onUpdateParam('shape', shape.value)}
            >
              {shape.label}
            </Button>
          ))}
        </Flex>
      </View>

      <RadioGroupField
        legend="Modo de texto"
        name="textMode"
        value={params.textMode}
        onChange={(e) => onUpdateParam('textMode', e.target.value)}
        direction="row"
      >
        <Radio value="raised">Relevo</Radio>
        <Radio value="engraved">Gravado</Radio>
      </RadioGroupField>

      {SLIDERS.map((slider) => (
        <View key={slider.key} className="flex flex-col gap-1">
          <Flex direction="row" justifyContent="space-between">
            <Text fontSize="small">{slider.label}</Text>
            <Text fontSize="small">
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
