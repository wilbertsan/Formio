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
import { type PlacaLojaParams, type TextItem, PLA_COLORS } from './schema'

const SLIDER_LIMITS = {
  textWidth: { min: 20, max: 200, step: 1 },
  textHeight: { min: 5, max: 40, step: 1 },
  relief: { min: 0.4, max: 3, step: 0.1 },
  width: { min: 100, max: 300, step: 1 },
  height: { min: 50, max: 150, step: 1 },
  thickness: { min: 3, max: 8, step: 0.5 },
  cornerRadius: { min: 5, max: 20, step: 1 },
  screwHoleDiameter: { min: 4, max: 6, step: 0.5 },
  screwHoleMargin: { min: 5, max: 15, step: 1 },
} as const

interface StudioPanelProps {
  params: PlacaLojaParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onUpdateText: (id: string, patch: Partial<TextItem>) => void
  onAddText: () => void
  onRemoveText: (id: string) => void
  onUpdateParam: (key: keyof PlacaLojaParams, value: number | string) => void
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
  const canAddText = params.texts.length < 5

  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Placa de Loja
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
                  <Flex key={text.id} direction="row" gap="xs" alignItems="center">
                    <Button
                      size="small"
                      aria-pressed={text.id === selectedTextId}
                      onClick={() => onSelectText(text.id)}
                    >
                      {text.content}
                    </Button>
                    <Button
                      size="small"
                      variation="link"
                      onClick={() => onRemoveText(text.id)}
                      aria-label={`Remover texto ${text.content}`}
                      isDisabled={params.texts.length <= 1}
                    >
                      ×
                    </Button>
                  </Flex>
                ))}
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
                    descriptiveText="Até 30 caracteres"
                    value={selectedText.content}
                    maxLength={30}
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
                    label="Largura do texto"
                    labelHidden
                    aria-label="Largura do texto"
                    min={SLIDER_LIMITS.textWidth.min}
                    max={SLIDER_LIMITS.textWidth.max}
                    step={SLIDER_LIMITS.textWidth.step}
                    value={selectedText.width}
                    onChange={(value) => onUpdateText(selectedText.id, { width: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do texto</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.height} mm</Text>
                  </Flex>
                  <SliderField
                    label="Altura do texto"
                    labelHidden
                    aria-label="Altura do texto"
                    min={SLIDER_LIMITS.textHeight.min}
                    max={SLIDER_LIMITS.textHeight.max}
                    step={SLIDER_LIMITS.textHeight.step}
                    value={selectedText.height}
                    onChange={(value) => onUpdateText(selectedText.id, { height: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do relevo</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.relief} mm</Text>
                  </Flex>
                  <SliderField
                    label="Altura do relevo"
                    labelHidden
                    aria-label="Altura do relevo"
                    min={SLIDER_LIMITS.relief.min}
                    max={SLIDER_LIMITS.relief.max}
                    step={SLIDER_LIMITS.relief.step}
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
                <Text fontSize="xs" color="font.tertiary">Largura</Text>
                <Text fontSize="xs" color="font.secondary">{params.width} mm</Text>
              </Flex>
              <SliderField
                label="Largura"
                labelHidden
                aria-label="Largura"
                min={SLIDER_LIMITS.width.min}
                max={SLIDER_LIMITS.width.max}
                step={SLIDER_LIMITS.width.step}
                value={params.width}
                onChange={(value) => onUpdateParam('width', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.height} mm</Text>
              </Flex>
              <SliderField
                label="Altura"
                labelHidden
                aria-label="Altura"
                min={SLIDER_LIMITS.height.min}
                max={SLIDER_LIMITS.height.max}
                step={SLIDER_LIMITS.height.step}
                value={params.height}
                onChange={(value) => onUpdateParam('height', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Espessura</Text>
                <Text fontSize="xs" color="font.secondary">{params.thickness} mm</Text>
              </Flex>
              <SliderField
                label="Espessura"
                labelHidden
                aria-label="Espessura"
                min={SLIDER_LIMITS.thickness.min}
                max={SLIDER_LIMITS.thickness.max}
                step={SLIDER_LIMITS.thickness.step}
                value={params.thickness}
                onChange={(value) => onUpdateParam('thickness', value as number)}
              />

              <SelectField
                label="Formato"
                value={params.shape}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('shape', e.target.value)
                }
              >
                <option value="rectangular">Retangular</option>
                <option value="rounded">Arredondado</option>
              </SelectField>

              {params.shape === 'rounded' && (
                <>
                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Raio de borda</Text>
                    <Text fontSize="xs" color="font.secondary">{params.cornerRadius} mm</Text>
                  </Flex>
                  <SliderField
                    label="Raio de borda"
                    labelHidden
                    aria-label="Raio de borda"
                    min={SLIDER_LIMITS.cornerRadius.min}
                    max={SLIDER_LIMITS.cornerRadius.max}
                    step={SLIDER_LIMITS.cornerRadius.step}
                    value={params.cornerRadius}
                    onChange={(value) => onUpdateParam('cornerRadius', value as number)}
                  />
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="fixacao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Fixação
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Diâmetro do furo</Text>
                <Text fontSize="xs" color="font.secondary">{params.screwHoleDiameter} mm</Text>
              </Flex>
              <SliderField
                label="Diâmetro do furo"
                labelHidden
                aria-label="Diâmetro do furo"
                min={SLIDER_LIMITS.screwHoleDiameter.min}
                max={SLIDER_LIMITS.screwHoleDiameter.max}
                step={SLIDER_LIMITS.screwHoleDiameter.step}
                value={params.screwHoleDiameter}
                onChange={(value) => onUpdateParam('screwHoleDiameter', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Margem do furo</Text>
                <Text fontSize="xs" color="font.secondary">{params.screwHoleMargin} mm</Text>
              </Flex>
              <SliderField
                label="Margem do furo"
                labelHidden
                aria-label="Margem do furo"
                min={SLIDER_LIMITS.screwHoleMargin.min}
                max={SLIDER_LIMITS.screwHoleMargin.max}
                step={SLIDER_LIMITS.screwHoleMargin.step}
                value={params.screwHoleMargin}
                onChange={(value) => onUpdateParam('screwHoleMargin', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
