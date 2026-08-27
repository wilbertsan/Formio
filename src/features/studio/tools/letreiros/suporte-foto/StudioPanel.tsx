import {
  Accordion,
  Button,
  Flex,
  Heading,
  SelectField,
  SliderField,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react'
import { type PhotoStandParams, PLA_COLORS, PHOTO_SIZES, SLOT_DEPTH } from './schema'

interface StudioPanelProps {
  params: PhotoStandParams
  onUpdateParam: (key: keyof PhotoStandParams, value: number | string) => void
  onReset: () => void
}

function ColorSwatches({
  colors,
  selected,
  onSelect,
}: {
  colors: readonly string[]
  selected: string
  onSelect: (color: string) => void
}) {
  return (
    <Flex direction="row" gap="xs" wrap="wrap">
      {colors.map((color) => (
        <Button
          key={color}
          size="small"
          aria-label={color}
          aria-pressed={color === selected}
          onClick={() => onSelect(color)}
          className={`h-7 w-7 rounded-full p-0 ${color === selected ? 'ring-2 ring-black ring-offset-2' : 'border-2 border-transparent'}`}
          style={{ backgroundColor: color }}
        />
      ))}
    </Flex>
  )
}

function slotLabel(photoSize: string): string {
  const key = photoSize as keyof typeof PHOTO_SIZES
  const size = PHOTO_SIZES[key]
  if (!size) return 'Slot: —'
  return `Slot: ${size.width}mm × ${SLOT_DEPTH}mm`
}

export function StudioPanel({
  params,
  onUpdateParam,
  onReset,
}: StudioPanelProps) {
  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Suporte para Foto
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="texto">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Texto
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <TextField
                label="Conteúdo"
                value={params.text}
                maxLength={30}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdateParam('text', e.target.value)
                }
              />

              <SelectField
                label="Estilo da letra"
                value={params.fontStyle}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('fontStyle', e.target.value)
                }
              >
                <option value="normal">Normal</option>
                <option value="bold">Negrito</option>
                <option value="serif">Serifada</option>
              </SelectField>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="foto">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Foto
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Tamanho da foto"
                value={params.photoSize}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('photoSize', e.target.value)
                }
              >
                <option value="10x15">10 × 15 cm</option>
                <option value="13x18">13 × 18 cm</option>
                <option value="15x20">15 × 20 cm</option>
              </SelectField>

              <Text fontSize="xs" color="font.tertiary">
                {slotLabel(params.photoSize)}
              </Text>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="base">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Base
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.baseHeight} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura"
                min={50} max={120} step={1}
                value={params.baseHeight}
                onChange={(value) => onUpdateParam('baseHeight', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Espessura</Text>
                <Text fontSize="xs" color="font.secondary">{params.baseThickness} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Espessura"
                min={2} max={4} step={0.5}
                value={params.baseThickness}
                onChange={(value) => onUpdateParam('baseThickness', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura mínima</Text>
                <Text fontSize="xs" color="font.secondary">{params.baseMinWidth} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura mínima"
                min={40} max={100} step={1}
                value={params.baseMinWidth}
                onChange={(value) => onUpdateParam('baseMinWidth', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Profundidade</Text>
                <Text fontSize="xs" color="font.secondary">{params.baseDepth} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Profundidade"
                min={30} max={60} step={1}
                value={params.baseDepth}
                onChange={(value) => onUpdateParam('baseDepth', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="aparencia">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Aparência
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.tertiary">
                Cor da base
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.baseColor}
                onSelect={(color) => onUpdateParam('baseColor', color)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Cor do texto
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.letterColor}
                onSelect={(color) => onUpdateParam('letterColor', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
