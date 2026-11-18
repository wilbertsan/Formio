import {
  Accordion,
  Alert,
  Button,
  Flex,
  Heading,
  SelectField,
  SliderField,
  SwitchField,
  Text,
  TextField,
  View,
} from '@aws-amplify/ui-react'
import {
  CAN_DIAMETER,
  CAN_HEIGHT,
  CAN_TOP_DIAMETER,
  CAN_VOLUME_ML,
  FONT_STYLES,
  MAX_TEXT_LENGTH,
  PLA_COLORS,
  getTopLand,
  type FontStyle,
  type CanHolderParams,
  type PlaColor,
} from './schema'
import type { ValidationIssue } from './validateCanHolder'

interface StudioPanelProps {
  params: CanHolderParams
  issues: ValidationIssue[]
  outerDiameter: number
  outerHeight: number
  exposedHeight: number
  onUpdateParam: (key: keyof CanHolderParams, value: number | string | boolean) => void
  onReset: () => void
}

const FONT_STYLE_LABELS: Record<FontStyle, string> = {
  normal: 'Normal',
  bold: 'Negrito',
  serif: 'Serifada',
}

function isFontStyle(value: string): value is FontStyle {
  return FONT_STYLES.some((style) => style === value)
}

/** Número com vírgula decimal, como no restante da UI. */
function formatNumber(value: number): string {
  return String(value).replace('.', ',')
}

/** Medidas em mm com vírgula decimal, como no restante da UI. */
function formatMm(value: number): string {
  return value.toFixed(1).replace('.', ',')
}

function ColorSwatches({
  colors,
  selected,
  onSelect,
}: {
  colors: readonly PlaColor[]
  selected: PlaColor
  onSelect: (color: PlaColor) => void
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
          style={{
            backgroundColor: color,
            border: color === selected ? '2px solid #000' : '2px solid transparent',
          }}
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
  isDisabled = false,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  isDisabled?: boolean
  onChange: (value: number) => void
}) {
  const display = formatNumber(
    step < 1 ? Number(value.toFixed(step < 0.1 ? 2 : 1)) : value,
  )

  return (
    <>
      <Flex
        direction="row"
        justifyContent="space-between"
        className={isDisabled ? 'opacity-50' : undefined}
      >
        <Text fontSize="xs" color="font.tertiary">{label}</Text>
        <Text fontSize="xs" color="font.secondary">{display} mm</Text>
      </Flex>
      <SliderField
        label={label}
        labelHidden
        isValueHidden
        isDisabled={isDisabled}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
      />
    </>
  )
}

export function StudioPanel({
  params,
  issues,
  outerDiameter,
  outerHeight,
  exposedHeight,
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
          Porta-lata
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="corpo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Corpo</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Profundidade da cavidade" value={params.cavityDepth} min={80} max={118} step={1} onChange={(value) => onUpdateParam('cavityDepth', value)} />
              <LabeledSlider label="Folga da lata" value={params.canClearance} min={0.5} max={1.2} step={0.1} onChange={(value) => onUpdateParam('canClearance', value)} />
              <LabeledSlider label="Espessura da parede" value={params.wallThickness} min={1.8} max={4} step={0.1} onChange={(value) => onUpdateParam('wallThickness', value)} />
              <LabeledSlider label="Espessura do fundo" value={params.bottomThickness} min={2} max={6} step={0.1} onChange={(value) => onUpdateParam('bottomThickness', value)} />
              <LabeledSlider label="Furo de ventilação" value={params.ventHoleDiameter} min={6} max={14} step={1} onChange={(value) => onUpdateParam('ventHoleDiameter', value)} />
              <LabeledSlider label="Borda de entrada" value={params.rimLeadIn} min={0.5} max={2} step={0.1} onChange={(value) => onUpdateParam('rimLeadIn', value)} />
              <LabeledSlider label="Chanfro da borda" value={params.rimChamfer} min={0} max={1.5} step={0.1} onChange={(value) => onUpdateParam('rimChamfer', value)} />
              <Text fontSize="xs" color="font.secondary">
                Lata {CAN_VOLUME_ML} ml · Ø{formatMm(CAN_DIAMETER)} × {formatMm(CAN_HEIGHT)} mm · topo {CAN_TOP_DIAMETER} mm
              </Text>
              <Text fontSize="xs" color="font.secondary">
                Diâmetro externo: {formatMm(outerDiameter)} mm
              </Text>
              <Text fontSize="xs" color="font.secondary">
                Altura externa: {formatMm(outerHeight)} mm
              </Text>
              <Text fontSize="xs" color="font.secondary">
                Altura exposta: {formatMm(exposedHeight)} mm
              </Text>
              <Text fontSize="xs" color="font.secondary">
                Parede do topo: {formatMm(getTopLand(params))} mm
              </Text>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="alca">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Alça</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SwitchField
                label="Habilitar alça"
                isChecked={params.handleEnabled}
                onChange={(event) => onUpdateParam('handleEnabled', event.target.checked)}
              />
              <LabeledSlider label="Altura da alça" value={params.handleHeight} min={35} max={85} step={1} isDisabled={!params.handleEnabled} onChange={(value) => onUpdateParam('handleHeight', value)} />
              <LabeledSlider label="Abertura da mão" value={params.handleGap} min={24} max={40} step={1} isDisabled={!params.handleEnabled} onChange={(value) => onUpdateParam('handleGap', value)} />
              <LabeledSlider label="Alcance da alça" value={params.handleReach} min={30} max={50} step={1} isDisabled={!params.handleEnabled} onChange={(value) => onUpdateParam('handleReach', value)} />
              <LabeledSlider label="Banda da alça" value={params.handleBand} min={5} max={10} step={0.5} isDisabled={!params.handleEnabled} onChange={(value) => onUpdateParam('handleBand', value)} />
              <LabeledSlider label="Largura da alça" value={params.handleWidth} min={8} max={16} step={1} isDisabled={!params.handleEnabled} onChange={(value) => onUpdateParam('handleWidth', value)} />
              <LabeledSlider label="Folga da alça" value={params.handleClearance} min={0.2} max={0.5} step={0.05} isDisabled={!params.handleEnabled} onChange={(value) => onUpdateParam('handleClearance', value)} />
              {!params.handleEnabled && (
                <Text fontSize="xs" color="font.secondary">
                  Ligue a alça para ajustar os parâmetros.
                </Text>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="personalizacao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Personalização</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <TextField
                label="Texto"
                maxLength={MAX_TEXT_LENGTH}
                value={params.text}
                onChange={(event) => onUpdateParam('text', event.target.value)}
              />
              <LabeledSlider label="Tamanho do texto" value={params.textSize} min={6} max={18} step={0.5} onChange={(value) => onUpdateParam('textSize', value)} />
              <LabeledSlider label="Altura do texto" value={params.textCenterY} min={20} max={90} step={1} onChange={(value) => onUpdateParam('textCenterY', value)} />
              <SelectField
                label="Fonte"
                value={params.fontStyle}
                onChange={(event) => {
                  if (isFontStyle(event.target.value)) {
                    onUpdateParam('fontStyle', event.target.value)
                  }
                }}
              >
                {FONT_STYLES.map((style) => (
                  <option key={style} value={style}>{FONT_STYLE_LABELS[style]}</option>
                ))}
              </SelectField>
              <Text fontSize="xs" color="font.secondary">
                O relevo tem 1 mm de profundidade.
              </Text>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="aparencia">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Aparência</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex role="group" aria-label="Cor do corpo" direction="column" gap="xs">
                <Text fontSize="xs" color="font.tertiary">Cor do corpo</Text>
                <ColorSwatches
                  colors={PLA_COLORS}
                  selected={params.bodyColor}
                  onSelect={(color) => onUpdateParam('bodyColor', color)}
                />
              </Flex>
              <Flex role="group" aria-label="Cor da alça" direction="column" gap="xs">
                <Text fontSize="xs" color="font.tertiary">Cor da alça</Text>
                <ColorSwatches
                  colors={PLA_COLORS}
                  selected={params.accentColor}
                  onSelect={(color) => onUpdateParam('accentColor', color)}
                />
              </Flex>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="validacao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Validação</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              {issues.length === 0 ? (
                <Text fontSize="xs" color="font.secondary">
                  Sem avisos
                </Text>
              ) : (
                issues.map((issue) => (
                  <Alert
                    key={issue.code}
                    variation={issue.severity === 'error' ? 'error' : 'warning'}
                    heading={issue.severity === 'error' ? 'Erro' : 'Aviso'}
                  >
                    {issue.message}
                  </Alert>
                ))
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
