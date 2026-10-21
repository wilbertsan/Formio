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
  View,
} from '@aws-amplify/ui-react'
import {
  MOTIFS_BY_FAMILY,
  PLA_COLORS,
  type PatternFamily,
  type PatternMotif,
  type TextureRollerParams,
} from './schema'

interface StudioPanelProps {
  params: TextureRollerParams
  onUpdateParam: (key: keyof TextureRollerParams, value: number | string | null) => void
  onSetSvgIcon: (svg: string | null) => void
  onReset: () => void
}

const MOTIF_LABELS: Record<PatternMotif, string> = {
  diamonds: 'Losangos', dots: 'Bolinhas', grid: 'Grade',
  waves: 'Ondas', chevrons: 'Chevrons', scales: 'Escamas',
  flower: 'Flor', leaf: 'Folha', rosette: 'Roseta',
}

const FAMILY_LABELS: Record<PatternFamily, string> = {
  geometric: 'Geométrico', wave: 'Ondulado', floral: 'Floral',
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
  const familyMotifs = MOTIFS_BY_FAMILY[params.patternFamily]
  const selectedMotif = (familyMotifs as readonly string[]).includes(params.patternMotif)
    ? params.patternMotif
    : familyMotifs[0]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === 'string' && text.trim()) onSetSvgIcon(text)
    }
    reader.readAsText(file)
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
          Rolo de Textura
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="padrao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Padrão
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Família"
                value={params.patternFamily}
                onChange={(e) => onUpdateParam('patternFamily', e.target.value)}
              >
                {Object.entries(FAMILY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectField>

              <SelectField
                label="Motivo"
                value={selectedMotif}
                onChange={(e) => onUpdateParam('patternMotif', e.target.value)}
              >
                {familyMotifs.map((motif) => (
                  <option key={motif} value={motif}>{MOTIF_LABELS[motif]}</option>
                ))}
              </SelectField>

              <RadioGroupField
                legend="Densidade"
                name="density"
                value={params.density}
                onChange={(e) => onUpdateParam('density', e.target.value)}
              >
                <Radio value="low">Baixa</Radio>
                <Radio value="medium">Média</Radio>
                <Radio value="high">Alta</Radio>
              </RadioGroupField>

              <LabeledSlider
                label="Profundidade do relevo"
                value={params.reliefDepth}
                min={0.5} max={2} step={0.1}
                onChange={(value) => onUpdateParam('reliefDepth', value)}
              />

              <RadioGroupField
                legend="Origem do padrão"
                name="patternSource"
                value={params.patternSource}
                onChange={(e) => onUpdateParam('patternSource', e.target.value)}
              >
                <Radio value="motif">Motivo interno</Radio>
                <Radio value="svg">SVG personalizado</Radio>
              </RadioGroupField>

              {params.patternSource === 'svg' && (
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
                    <Button size="small" variation="link" onClick={() => onSetSvgIcon(null)}>
                      Remover SVG
                    </Button>
                  )}

                  <Text fontSize="xs" color="font.secondary">
                    O SVG é repetido como motivo, sem alterações nas formas ou no traço.
                  </Text>
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="dimensoes">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Dimensões
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider
                label="Comprimento do rolo"
                value={params.length}
                min={50} max={150} step={5}
                onChange={(value) => onUpdateParam('length', value)}
              />
              <LabeledSlider
                label="Diâmetro do rolo"
                value={params.diameter}
                min={20} max={40} step={1}
                onChange={(value) => onUpdateParam('diameter', value)}
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
                Cor do rolo
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.rollerColor}
                onSelect={(color) => onUpdateParam('rollerColor', color)}
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
