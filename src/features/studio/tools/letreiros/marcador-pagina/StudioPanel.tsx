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
import { type BookmarkParams, type TextItem, PLA_COLORS } from './schema'

interface StudioPanelProps {
  params: BookmarkParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onUpdateText: (id: string, patch: Partial<TextItem>) => void
  onAddText: () => void
  onRemoveText: (id: string) => void
  onUpdateParam: (key: keyof BookmarkParams, value: number | string) => void
  onReset: () => void
  onOpenEditor: () => void
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
  selectedTextId,
  onSelectText,
  onUpdateText,
  onAddText,
  onRemoveText,
  onUpdateParam,
  onReset,
  onOpenEditor,
}: StudioPanelProps) {
  const selectedText = params.texts.find((t) => t.id === selectedTextId) ?? params.texts[0]
  const canAddText = params.texts.length < 3

  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Marcador de Página
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
              <Flex direction="row" gap="xs" wrap="wrap">
                {params.texts.map((text) => (
                  <Button
                    key={text.id}
                    size="small"
                    aria-pressed={text.id === selectedTextId}
                    onClick={() => onSelectText(text.id)}
                  >
                    {text.content}
                  </Button>
                ))}
                {selectedTextId && params.texts.length > 1 && (
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => onRemoveText(selectedTextId)}
                  >
                    ×
                  </Button>
                )}
              </Flex>

              <Button
                size="small"
                isDisabled={!canAddText}
                onClick={onAddText}
              >
                Adicionar texto
              </Button>

              {selectedText && (
                <>
                  <Button
                    size="small"
                    variation="link"
                    onClick={onOpenEditor}
                    aria-label="Posicionar textos"
                  >
                    ✥ Posicionar textos
                  </Button>

                  <TextField
                    label="Conteúdo"
                    descriptiveText="Até 12 caracteres"
                    value={selectedText.content}
                    maxLength={12}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateText(selectedText.id, { content: e.target.value })
                    }
                  />

                  <SelectField
                    label="Estilo da letra"
                    value={selectedText.fontStyle}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      onUpdateText(selectedText.id, { fontStyle: e.target.value as TextItem['fontStyle'] })
                    }
                  >
                    <option value="bold">Negrito</option>
                    <option value="normal">Normal</option>
                    <option value="serif">Serifada</option>
                  </SelectField>

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Largura do texto</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.width} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Largura do texto"
                    min={8} max={60} step={1}
                    value={selectedText.width}
                    onChange={(value) => onUpdateText(selectedText.id, { width: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do texto</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.height} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Altura do texto"
                    min={4} max={20} step={0.5}
                    value={selectedText.height}
                    onChange={(value) => onUpdateText(selectedText.id, { height: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do relevo</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.relief} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Altura do relevo"
                    min={0.4} max={2} step={0.1}
                    value={selectedText.relief}
                    onChange={(value) => onUpdateText(selectedText.id, { relief: value as number })}
                  />
                </>
              )}
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
              <SelectField
                label="Modo de texto"
                value={params.textMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('textMode', e.target.value)
                }
              >
                <option value="raised">Relevo</option>
                <option value="engraved">Gravado</option>
              </SelectField>

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
                <Text fontSize="xs" color="font.tertiary">Comprimento</Text>
                <Text fontSize="xs" color="font.secondary">{params.length} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Comprimento"
                min={50} max={150} step={1}
                value={params.length}
                onChange={(value) => onUpdateParam('length', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura</Text>
                <Text fontSize="xs" color="font.secondary">{params.width} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura"
                min={30} max={50} step={1}
                value={params.width}
                onChange={(value) => onUpdateParam('width', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="furo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Furo
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Diâmetro</Text>
                <Text fontSize="xs" color="font.secondary">{params.holeDiameter} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Diâmetro"
                min={3} max={8} step={0.5}
                value={params.holeDiameter}
                onChange={(value) => onUpdateParam('holeDiameter', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Margem do topo</Text>
                <Text fontSize="xs" color="font.secondary">{params.holeMargin} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Margem do topo"
                min={5} max={15} step={1}
                value={params.holeMargin}
                onChange={(value) => onUpdateParam('holeMargin', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}