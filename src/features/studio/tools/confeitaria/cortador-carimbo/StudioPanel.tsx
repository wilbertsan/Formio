import { useRef } from 'react'
import {
  Accordion,
  Button,
  Flex,
  Heading,
  Radio,
  RadioGroupField,
  SelectField,
  SliderField,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react'
import { type CutterStampParams, PLA_COLORS } from './schema'

interface StudioPanelProps {
  params: CutterStampParams
  onUpdateParam: (key: keyof CutterStampParams, value: number | string | null) => void
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

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = 'mm',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (value: number) => void
}) {
  const display = step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value
  return (
    <>
      <Flex direction="row" justifyContent="space-between">
        <Text fontSize="xs" color="font.tertiary">{label}</Text>
        <Text fontSize="xs" color="font.secondary">{display} {suffix}</Text>
      </Flex>
      <SliderField
        label=""
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(next) => onChange(next as number)}
      />
    </>
  )
}

export function StudioPanel({ params, onUpdateParam, onSetSvgIcon, onReset }: StudioPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      onSetSvgIcon(e.target?.result as string)
    }
    reader.readAsText(file)
    // Permite reenviar o mesmo arquivo depois de remover.
    input.value = ''
  }

  return (
    <View
      as="aside"
      aria-label="Painel do estúdio"
      className="flex w-64 flex-col gap-2 overflow-y-auto border-l border-neutral-200 bg-white p-3"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <Heading level={2} fontSize="medium" color="font.primary">
          Cortador + Carimbo
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="forma">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Forma
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <RadioGroupField
                legend="Tipo de forma"
                name="contentType"
                value={params.contentType}
                onChange={(e) => onUpdateParam('contentType', e.target.value)}
              >
                <Radio value="text">Texto</Radio>
                <Radio value="svg">Ícone SVG</Radio>
              </RadioGroupField>

              {params.contentType === 'text' ? (
                <>
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
                  <LabeledSlider
                    label="Altura da letra"
                    value={params.textHeight}
                    min={10} max={60} step={1}
                    onChange={(value) => onUpdateParam('textHeight', value)}
                  />
                </>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  {!params.svgIcon ? (
                    <Button size="small" onClick={() => fileInputRef.current?.click()}>
                      Upload SVG
                    </Button>
                  ) : (
                    <>
                      <Text fontSize="xs" color="font.secondary">
                        Ícone carregado
                      </Text>
                      <Button size="small" variation="link" onClick={() => onSetSvgIcon(null)}>
                        Remover ícone
                      </Button>
                    </>
                  )}

                  <LabeledSlider
                    label="Altura"
                    value={params.textHeight}
                    min={10} max={60} step={1}
                    onChange={(value) => onUpdateParam('textHeight', value)}
                  />
                  <LabeledSlider
                    label="Escala do ícone"
                    value={params.iconScale}
                    min={0.5} max={1.0} step={0.1}
                    suffix="x"
                    onChange={(value) => onUpdateParam('iconScale', value)}
                  />
                  <LabeledSlider
                    label="Espessura da linha"
                    value={params.iconLineWidth}
                    min={0.1} max={1.5} step={0.05}
                    onChange={(value) => onUpdateParam('iconLineWidth', value)}
                  />
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="cortador">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Cortador
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider
                label="Altura da parede"
                value={params.wallHeight}
                min={15} max={40} step={1}
                onChange={(value) => onUpdateParam('wallHeight', value)}
              />
              <LabeledSlider
                label="Espessura da parede"
                value={params.wallThickness}
                min={0.8} max={2} step={0.1}
                onChange={(value) => onUpdateParam('wallThickness', value)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="carimbo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Carimbo
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider
                label="Altura do carimbo"
                value={params.stampHeight}
                min={15} max={25} step={1}
                onChange={(value) => onUpdateParam('stampHeight', value)}
              />
              <LabeledSlider
                label="Margem da base"
                value={params.baseMargin}
                min={2} max={10} step={0.5}
                onChange={(value) => onUpdateParam('baseMargin', value)}
              />
              <LabeledSlider
                label="Altura do relevo"
                value={params.reliefHeight}
                min={1} max={3} step={0.5}
                onChange={(value) => onUpdateParam('reliefHeight', value)}
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
                Cor do cortador
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.cutterColor}
                onSelect={(color) => onUpdateParam('cutterColor', color)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Cor do carimbo
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.stampColor}
                onSelect={(color) => onUpdateParam('stampColor', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
