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
import { type CardParams, type TextBlock, PLA_COLORS } from './schema'

interface StudioPanelProps {
  params: CardParams
  selectedBlockId: string
  onSelectBlock: (id: string) => void
  onUpdateBlock: (id: string, patch: Partial<TextBlock>) => void
  onAddBlock: () => void
  onRemoveBlock: (id: string) => void
  onUpdateParam: (key: keyof CardParams, value: number | string) => void
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

function blockLabel(id: string): string {
  if (id === 'block-1') return 'Nome'
  if (id === 'block-2') return 'Cargo'
  return 'Contato'
}

export function StudioPanel({
  params,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onAddBlock,
  onRemoveBlock,
  onUpdateParam,
  onReset,
}: StudioPanelProps) {
  const selectedBlock = params.blocks.find((b) => b.id === selectedBlockId) ?? params.blocks[0]
  const canAddBlock = params.blocks.length < 3

  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Cartão de Visita
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="layout">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Layout
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Alinhamento"
                value={params.layout}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('layout', e.target.value)
                }
              >
                <option value="centered">Centralizado</option>
                <option value="left">Esquerda</option>
              </SelectField>
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
                <Text fontSize="xs" color="font.tertiary">Largura</Text>
                <Text fontSize="xs" color="font.secondary">{params.width} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura"
                min={50} max={90} step={1}
                value={params.width}
                onChange={(value) => onUpdateParam('width', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.height} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura"
                min={30} max={60} step={1}
                value={params.height}
                onChange={(value) => onUpdateParam('height', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Espessura</Text>
                <Text fontSize="xs" color="font.secondary">{params.thickness} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Espessura"
                min={1} max={3} step={0.5}
                value={params.thickness}
                onChange={(value) => onUpdateParam('thickness', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Cantos arredondados</Text>
                <Text fontSize="xs" color="font.secondary">{params.cornerRadius} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Cantos arredondados"
                min={0} max={10} step={0.5}
                value={params.cornerRadius}
                onChange={(value) => onUpdateParam('cornerRadius', value as number)}
              />

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

        <Accordion.Item value="texto">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Texto
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" gap="xs" wrap="wrap">
                {params.blocks.map((block) => (
                  <Button
                    key={block.id}
                    size="small"
                    aria-pressed={block.id === selectedBlockId}
                    onClick={() => onSelectBlock(block.id)}
                  >
                    {blockLabel(block.id)}
                  </Button>
                ))}
                {params.blocks.length > 1 && (
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => onRemoveBlock(selectedBlockId)}
                  >
                    ×
                  </Button>
                )}
              </Flex>

              <Button
                size="small"
                isDisabled={!canAddBlock}
                onClick={onAddBlock}
              >
                Adicionar bloco
              </Button>

              {selectedBlock && (
                <>
                  <TextField
                    label="Conteúdo"
                    value={selectedBlock.content}
                    maxLength={30}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateBlock(selectedBlock.id, { content: e.target.value })
                    }
                  />

                  <SelectField
                    label="Estilo da letra"
                    value={selectedBlock.fontStyle}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      onUpdateBlock(selectedBlock.id, { fontStyle: e.target.value as TextBlock['fontStyle'] })
                    }
                  >
                    <option value="bold">Negrito</option>
                    <option value="normal">Normal</option>
                    <option value="serif">Serifada</option>
                  </SelectField>

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Tamanho da fonte</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedBlock.fontSize} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Tamanho da fonte"
                    min={3} max={12} step={0.5}
                    value={selectedBlock.fontSize}
                    onChange={(value) => onUpdateBlock(selectedBlock.id, { fontSize: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do relevo</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedBlock.relief} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Altura do relevo"
                    min={0.3} max={1.5} step={0.1}
                    value={selectedBlock.relief}
                    onChange={(value) => onUpdateBlock(selectedBlock.id, { relief: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Offset horizontal</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedBlock.offsetX} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Offset horizontal"
                    min={-30} max={30} step={1}
                    value={selectedBlock.offsetX}
                    onChange={(value) => onUpdateBlock(selectedBlock.id, { offsetX: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Offset vertical</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedBlock.offsetY} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Offset vertical"
                    min={-30} max={30} step={1}
                    value={selectedBlock.offsetY}
                    onChange={(value) => onUpdateBlock(selectedBlock.id, { offsetY: value as number })}
                  />
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
