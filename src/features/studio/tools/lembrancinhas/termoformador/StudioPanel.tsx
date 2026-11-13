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
  View,
} from '@aws-amplify/ui-react'
import {
  PLA_COLORS,
  MINIMUM_FEATURE_MM,
  MINIMUM_WALL_MM,
  type ThermoformerParams,
} from './schema'
import type { ValidationIssue } from './validateThermoformer'

interface StudioPanelProps {
  params: ThermoformerParams
  issues: ValidationIssue[]
  onUpdateParam: (key: keyof ThermoformerParams, value: number | string | boolean) => void
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
  suffix = 'mm',
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  format?: (value: number) => string
  onChange: (value: number) => void
}) {
  const display = format
    ? format(value)
    : step < 1
      ? value.toFixed(step < 0.1 ? 2 : 1)
      : value

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

export function StudioPanel({
  params,
  issues,
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
          Termoformador
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="dimensoes">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Dimensões</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Largura" value={params.width} min={60} max={300} step={5} onChange={(value) => onUpdateParam('width', value)} />
              <LabeledSlider label="Profundidade" value={params.depth} min={60} max={300} step={5} onChange={(value) => onUpdateParam('depth', value)} />
              <LabeledSlider label="Altura" value={params.height} min={20} max={120} step={1} onChange={(value) => onUpdateParam('height', value)} />
              <LabeledSlider label="Raio dos cantos" value={params.cornerRadius} min={0} max={40} step={1} onChange={(value) => onUpdateParam('cornerRadius', value)} />
              <LabeledSlider label="Espessura da parede" value={params.wallThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('wallThickness', value)} />
              <LabeledSlider label="Espessura do fundo" value={params.bottomThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('bottomThickness', value)} />
              <LabeledSlider label="Altura da borda" value={params.rimHeight} min={0} max={10} step={0.1} onChange={(value) => onUpdateParam('rimHeight', value)} />
              <LabeledSlider label="Espessura da borda" value={params.rimThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('rimThickness', value)} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="acabamento">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Acabamento</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Chanfro das arestas" value={params.edgeChamfer} min={0} max={3} step={0.1} onChange={(value) => onUpdateParam('edgeChamfer', value)} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="painel">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Painel frontal</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Largura do painel" value={params.frontPanelWidth} min={40} max={300} step={5} onChange={(value) => onUpdateParam('frontPanelWidth', value)} />
              <LabeledSlider label="Altura do painel" value={params.frontPanelHeight} min={40} max={300} step={5} onChange={(value) => onUpdateParam('frontPanelHeight', value)} />
              <LabeledSlider label="Espessura do painel" value={params.frontPanelThickness} min={1} max={5} step={0.1} onChange={(value) => onUpdateParam('frontPanelThickness', value)} />
              <LabeledSlider label="Raio do painel" value={params.frontPanelCornerRadius} min={0} max={40} step={1} onChange={(value) => onUpdateParam('frontPanelCornerRadius', value)} />
              <LabeledSlider label="Moldura sólida" value={params.borderWidth} min={3} max={20} step={0.5} onChange={(value) => onUpdateParam('borderWidth', value)} />

              <SelectField
                label="Superfície"
                value={params.surfaceCurvature}
                onChange={(event) => onUpdateParam('surfaceCurvature', event.target.value)}
              >
                <option value="flat">Plana</option>
                <option value="slightly_convex">Levemente convexa</option>
                <option value="slightly_concave">Levemente côncava</option>
              </SelectField>

              <SelectField
                label="Padrão"
                value={params.pattern}
                onChange={(event) => onUpdateParam('pattern', event.target.value)}
              >
                <option value="perforated">Perfurado</option>
                <option value="grid">Grade</option>
                <option value="mesh">Malha</option>
              </SelectField>

              <LabeledSlider label="Diâmetro do furo" value={params.holeDiameter} min={0.8} max={6} step={0.1} onChange={(value) => onUpdateParam('holeDiameter', value)} />
              <LabeledSlider label="Espaçamento horizontal" value={params.holeSpacingX} min={1} max={10} step={0.5} onChange={(value) => onUpdateParam('holeSpacingX', value)} />
              <LabeledSlider label="Espaçamento vertical" value={params.holeSpacingY} min={1} max={10} step={0.5} onChange={(value) => onUpdateParam('holeSpacingY', value)} />
              <LabeledSlider label="Espessura da nervura" value={params.gridThickness} min={0.8} max={4} step={0.1} onChange={(value) => onUpdateParam('gridThickness', value)} />

              {params.pattern !== 'perforated' && (
                <LabeledSlider label="Ângulo da grade" value={params.gridAngle} min={0} max={90} step={5} suffix="°" onChange={(value) => onUpdateParam('gridAngle', value)} />
              )}

              <Text fontSize="xs" color="font.secondary">
                A grade é limitada para manter o preview responsivo.
              </Text>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="tampa">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Tampa</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SwitchField
                label="Habilitar tampa"
                isChecked={params.lidEnabled}
                onChange={(event) => onUpdateParam('lidEnabled', event.target.checked)}
              />
              {params.lidEnabled && (
                <>
                  <LabeledSlider label="Espessura da tampa" value={params.lidThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('lidThickness', value)} />
                  <LabeledSlider label="Altura da tampa" value={params.lidHeight} min={0} max={30} step={0.5} onChange={(value) => onUpdateParam('lidHeight', value)} />
                  <LabeledSlider label="Folga da tampa" value={params.lidClearance} min={0.1} max={0.6} step={0.05} onChange={(value) => onUpdateParam('lidClearance', value)} />
                  <LabeledSlider label="Raio da tampa" value={params.lidCornerRadius} min={0} max={40} step={1} onChange={(value) => onUpdateParam('lidCornerRadius', value)} />
                  <LabeledSlider label="Profundidade do encaixe" value={params.lidFitDepth} min={2} max={20} step={0.5} onChange={(value) => onUpdateParam('lidFitDepth', value)} />
                  <SelectField
                    label="Encaixe"
                    value={params.fitType}
                    onChange={(event) => onUpdateParam('fitType', event.target.value)}
                  >
                    <option value="external">Externo</option>
                    <option value="internal">Interno</option>
                  </SelectField>
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="pino">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Pino lateral</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SwitchField
                label="Habilitar pino"
                isChecked={params.handleEnabled}
                onChange={(event) => onUpdateParam('handleEnabled', event.target.checked)}
              />
              {params.handleEnabled && (
                <>
                  <LabeledSlider label="Diâmetro do pino" value={params.handleDiameter} min={3} max={20} step={0.5} onChange={(value) => onUpdateParam('handleDiameter', value)} />
                  <LabeledSlider label="Comprimento do pino" value={params.handleLength} min={5} max={60} step={1} onChange={(value) => onUpdateParam('handleLength', value)} />
                  <LabeledSlider label="Diâmetro da base" value={params.handleBaseDiameter} min={4} max={30} step={1} onChange={(value) => onUpdateParam('handleBaseDiameter', value)} />
                  <LabeledSlider label="Raio da ponta" value={params.handleTipRadius} min={0} max={5} step={0.1} onChange={(value) => onUpdateParam('handleTipRadius', value)} />
                  <SelectField
                    label="Lateral"
                    value={params.handleSide}
                    onChange={(event) => onUpdateParam('handleSide', event.target.value)}
                  >
                    <option value="left">Esquerda</option>
                    <option value="right">Direita</option>
                    <option value="top">Topo</option>
                    <option value="bottom">Fundo</option>
                  </SelectField>
                  <LabeledSlider
                    label="Posição na lateral"
                    value={params.handleHeight}
                    min={0}
                    max={1}
                    step={0.05}
                    format={(value) => `${Math.round(value * 100)}`}
                    suffix="%"
                    onChange={(value) => onUpdateParam('handleHeight', value)}
                  />
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="base">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Base</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SwitchField
                label="Habilitar base"
                isChecked={params.baseEnabled}
                onChange={(event) => onUpdateParam('baseEnabled', event.target.checked)}
              />
              {params.baseEnabled && (
                <>
                  <LabeledSlider label="Altura da base" value={params.baseHeight} min={0} max={30} step={0.5} onChange={(value) => onUpdateParam('baseHeight', value)} />
                  <LabeledSlider label="Espessura da base" value={params.baseThickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('baseThickness', value)} />
                  <LabeledSlider label="Raio da base" value={params.baseCornerRadius} min={0} max={40} step={1} onChange={(value) => onUpdateParam('baseCornerRadius', value)} />
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="impressao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Impressão</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Folga de impressão" value={params.printClearance} min={0.2} max={0.3} step={0.01} onChange={(value) => onUpdateParam('printClearance', value)} />
              <Text fontSize="xs" color="font.secondary">
                Parede mínima {MINIMUM_WALL_MM.toFixed(1)} mm · elemento mínimo {MINIMUM_FEATURE_MM.toFixed(1)} mm.
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
              <Text fontSize="xs" color="font.tertiary">Cor do corpo</Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.bodyColor}
                onSelect={(color) => onUpdateParam('bodyColor', color)}
              />
              <Text fontSize="xs" color="font.tertiary">Cor de destaque</Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.accentColor}
                onSelect={(color) => onUpdateParam('accentColor', color)}
              />
              <Text fontSize="xs" color="font.secondary">
                Tampa, painel, pino e base usam a cor de destaque.
              </Text>
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
                  Sem problemas para impressão.
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
