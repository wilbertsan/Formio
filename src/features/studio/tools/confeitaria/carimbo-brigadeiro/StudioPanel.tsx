import { useRef } from 'react'
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
import { type StampParams, PLA_COLORS } from './schema'

interface StudioPanelProps {
  params: StampParams
  onUpdateParam: (key: keyof StampParams, value: number | string | boolean | null) => void
  onSetSvgIcon: (svg: string | null) => void
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
  onSetSvgIcon,
  onReset,
}: StudioPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const svgContent = e.target?.result as string
      onSetSvgIcon(svgContent)
    }
    reader.readAsText(file)
  }

  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Carimbo Brigadeiro
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
                onChange={(e) => onUpdateParam('text', e.target.value)}
              />

              <SelectField
                label="Estilo da fonte"
                value={params.fontStyle}
                onChange={(e) => onUpdateParam('fontStyle', e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="bold">Negrito</option>
                <option value="serif">Serif</option>
              </SelectField>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Tamanho</Text>
                <Text fontSize="xs" color="font.secondary">{params.fontSize} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Tamanho da fonte"
                min={6} max={15} step={1}
                value={params.fontSize}
                onChange={(value) => onUpdateParam('fontSize', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="formato">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Formato
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Diâmetro</Text>
                <Text fontSize="xs" color="font.secondary">{params.diameter} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Diâmetro"
                min={10} max={30} step={1}
                value={params.diameter}
                onChange={(value) => onUpdateParam('diameter', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.height} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura"
                min={15} max={25} step={1}
                value={params.height}
                onChange={(value) => onUpdateParam('height', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="icone">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Ícone SVG
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />

              {!params.svgIcon ? (
                <Button
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload SVG
                </Button>
              ) : (
                <>
                  <Text fontSize="xs" color="font.secondary">
                    Ícone carregado
                  </Text>
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => onSetSvgIcon(null)}
                  >
                    Remover ícone
                  </Button>
                </>
              )}

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Escala</Text>
                <Text fontSize="xs" color="font.secondary">{params.iconScale.toFixed(1)}x</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Escala do ícone"
                min={0.5} max={2.0} step={0.1}
                value={params.iconScale}
                isDisabled={!params.svgIcon}
                onChange={(value) => onUpdateParam('iconScale', value as number)}
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
              <SelectField
                label="Tipo de relevo"
                value={params.reliefType}
                onChange={(e) => onUpdateParam('reliefType', e.target.value)}
              >
                <option value="negative">Negativo (gravado)</option>
                <option value="positive">Positivo (elevado)</option>
              </SelectField>
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
                Cor do relevo
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.reliefColor}
                onSelect={(color) => onUpdateParam('reliefColor', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
