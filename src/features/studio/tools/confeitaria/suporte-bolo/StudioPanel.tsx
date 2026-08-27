import {
  Accordion,
  Button,
  Flex,
  Heading,
  SelectField,
  SliderField,
  SwitchField,
  Text,
  View,
} from '@aws-amplify/ui-react'
import { type CakeStandParams, PLA_COLORS, HEIGHT_MAP } from './schema'

interface StudioPanelProps {
  params: CakeStandParams
  onUpdateParam: (key: keyof CakeStandParams, value: number | string | boolean) => void
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
          className="h-7 w-7 rounded-full p-0"
          style={{ backgroundColor: color, border: color === selected ? '2px solid #000' : '2px solid transparent' }}
        />
      ))}
    </Flex>
  )
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
          Suporte de Bolo
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
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
                <Text fontSize="xs" color="font.tertiary">Diâmetro</Text>
                <Text fontSize="xs" color="font.secondary">{params.baseDiameter} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Diâmetro da base"
                min={80} max={200} step={5}
                value={params.baseDiameter}
                onChange={(value) => onUpdateParam('baseDiameter', value as number)}
              />

              <SelectField
                label="Decoração"
                value={params.baseDecoration}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('baseDecoration', e.target.value)
                }
              >
                <option value="none">Nenhuma</option>
                <option value="hexagon">Hexágonos</option>
                <option value="lines">Linhas</option>
                <option value="waves">Ondas</option>
              </SelectField>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Espessura</Text>
                <Text fontSize="xs" color="font.secondary">{params.thickness} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Espessura"
                min={3} max={6} step={0.5}
                value={params.thickness}
                onChange={(value) => onUpdateParam('thickness', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="coluna">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Coluna
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Altura"
                value={params.height}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('height', e.target.value)
                }
              >
                <option value="low">Baixo ({HEIGHT_MAP.low} mm)</option>
                <option value="medium">Médio ({HEIGHT_MAP.medium} mm)</option>
                <option value="high">Alto ({HEIGHT_MAP.high} mm)</option>
              </SelectField>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="prato">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Prato
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SwitchField
                label="Com borda elevada"
                labelPosition="end"
                checked={params.plateHasRim}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdateParam('plateHasRim', e.target.checked)
                }
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura da borda</Text>
                <Text fontSize="xs" color="font.secondary">{params.rimHeight} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura da borda"
                min={5} max={15} step={1}
                value={params.rimHeight}
                isDisabled={!params.plateHasRim}
                onChange={(value) => onUpdateParam('rimHeight', value as number)}
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
                Cor do PLA
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.baseColor}
                onSelect={(color) => onUpdateParam('baseColor', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}