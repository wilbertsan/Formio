import {
  Accordion,
  Button,
  ButtonGroup,
  Flex,
  Heading,
  SliderField,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react'
import { type KeychainParams, PLA_COLORS } from '../keychain/schema'

interface StudioPanelProps {
  params: KeychainParams
  onUpdateParam: (key: keyof KeychainParams, value: number | string) => void
  onUpdateName: (name: string) => void
  onReset: () => void
}

const FONT_STYLES = [
  { value: 'bold', label: 'Negrito' },
  { value: 'normal', label: 'Normal' },
  { value: 'serif', label: 'Serifada' },
] as const

const RING_POSITIONS = [
  { value: 'top', label: 'Cima' },
  { value: 'bottom', label: 'Baixo' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' },
] as const

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
  onUpdateName,
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
          Produto
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
                label="Nome"
                descriptiveText="Até 12 caracteres. Acentos são removidos."
                value={params.name}
                maxLength={12}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateName(e.target.value)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Estilo da letra
              </Text>
              <ButtonGroup size="small" variation="link">
                {FONT_STYLES.map((style) => (
                  <Button
                    key={style.value}
                    isDisabled={params.fontStyle === style.value}
                    onClick={() => onUpdateParam('fontStyle', style.value)}
                    aria-label={style.label}
                  >
                    {style.label}
                  </Button>
                ))}
              </ButtonGroup>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">
                  Largura
                </Text>
                <Text fontSize="xs" color="font.secondary">
                  {params.width} mm
                </Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura"
                min={20}
                max={80}
                step={1}
                value={params.width}
                onChange={(value) => onUpdateParam('width', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">
                  Altura da letra
                </Text>
                <Text fontSize="xs" color="font.secondary">
                  {params.letterHeight} mm
                </Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura da letra"
                min={0.4}
                max={2}
                step={0.1}
                value={params.letterHeight}
                onChange={(value) => onUpdateParam('letterHeight', value as number)}
              />
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
              <Text fontSize="xs" color="font.tertiary">
                Cor da base
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.baseColor}
                onSelect={(color) => onUpdateParam('baseColor', color)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Cor das letras
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.letterColor}
                onSelect={(color) => onUpdateParam('letterColor', color)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">
                  Espessura
                </Text>
                <Text fontSize="xs" color="font.secondary">
                  {params.thickness} mm
                </Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Espessura"
                min={2}
                max={6}
                step={0.5}
                value={params.thickness}
                onChange={(value) => onUpdateParam('thickness', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">
                  Borda
                </Text>
                <Text fontSize="xs" color="font.secondary">
                  {params.borderWidth} mm
                </Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Borda"
                min={4}
                max={10}
                step={1}
                value={params.borderWidth}
                onChange={(value) => onUpdateParam('borderWidth', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="argola">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Argola
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.tertiary">
                Posição
              </Text>
              <ButtonGroup size="small" variation="link">
                {RING_POSITIONS.map((pos) => (
                  <Button
                    key={pos.value}
                    isDisabled={params.ringPosition === pos.value}
                    onClick={() => onUpdateParam('ringPosition', pos.value)}
                    aria-label={pos.label}
                  >
                    {pos.label}
                  </Button>
                ))}
              </ButtonGroup>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">
                  Diâmetro interno
                </Text>
                <Text fontSize="xs" color="font.secondary">
                  {params.ringInnerDiameter} mm
                </Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Diâmetro interno"
                min={3}
                max={10}
                step={0.5}
                value={params.ringInnerDiameter}
                onChange={(value) => onUpdateParam('ringInnerDiameter', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">
                  Espessura do anel
                </Text>
                <Text fontSize="xs" color="font.secondary">
                  {params.ringThickness} mm
                </Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Espessura do anel"
                min={1.5}
                max={4}
                step={0.5}
                value={params.ringThickness}
                onChange={(value) => onUpdateParam('ringThickness', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">
                  Embutimento
                </Text>
                <Text fontSize="xs" color="font.secondary">
                  {params.ringEmbedding} mm
                </Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Embutimento"
                min={0}
                max={3}
                step={0.5}
                value={params.ringEmbedding}
                onChange={(value) => onUpdateParam('ringEmbedding', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="relevo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Relevo
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.tertiary">
                Altura do relevo
              </Text>
              <SliderField
                label=""
                aria-label="Altura do relevo"
                min={0.4}
                max={2}
                step={0.1}
                value={params.letterHeight}
                onChange={(value) => onUpdateParam('letterHeight', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
