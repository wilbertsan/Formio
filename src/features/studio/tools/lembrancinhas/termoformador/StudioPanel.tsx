import {
  Accordion,
  Alert,
  Button,
  Flex,
  Heading,
  SliderField,
  Text,
  View,
} from '@aws-amplify/ui-react'
import { getPlugDimensions } from './buildPlug'
import { getSupportDimensions } from './buildSupport'
import { PLA_COLORS, type ThermoformerParams } from './schema'
import { computeScreenPattern } from './screenPattern'
import type { ValidationIssue } from './validateThermoformer'

interface StudioPanelProps {
  params: ThermoformerParams
  issues: ValidationIssue[]
  onUpdateParam: (key: keyof ThermoformerParams, value: number | string) => void
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
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  const display = step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value

  return (
    <>
      <Flex direction="row" justifyContent="space-between">
        <Text fontSize="xs" color="font.tertiary">{label}</Text>
        <Text fontSize="xs" color="font.secondary">{display} mm</Text>
      </Flex>
      <SliderField
        label={label}
        labelHidden
        isValueHidden
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
  const pattern = computeScreenPattern(params)
  const supportDims = getSupportDimensions(params)
  const plugDims = getPlugDimensions(params)

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
        <Accordion.Item value="tela">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Tela</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Diâmetro" value={params.diameter} min={60} max={300} step={5} onChange={(value) => onUpdateParam('diameter', value)} />
              <LabeledSlider label="Espessura" value={params.thickness} min={1.2} max={6} step={0.1} onChange={(value) => onUpdateParam('thickness', value)} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="malha">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Malha</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <LabeledSlider label="Abertura do favo" value={params.opening} min={3} max={30} step={0.5} onChange={(value) => onUpdateParam('opening', value)} />
              <LabeledSlider label="Espessura da linha" value={params.lineWidth} min={0.4} max={4} step={0.2} onChange={(value) => onUpdateParam('lineWidth', value)} />
              <LabeledSlider label="Largura do aro" value={params.frameWidth} min={2} max={30} step={1} onChange={(value) => onUpdateParam('frameWidth', value)} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="suporte">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Suporte</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.secondary">
                Diâmetro externo {(supportDims.outerRadius * 2).toFixed(1)} mm · Altura{' '}
                {supportDims.height.toFixed(1)} mm · Parede da bacia{' '}
                {supportDims.cavityWall.toFixed(1)} mm
              </Text>
              <LabeledSlider label="Parede do suporte" value={params.wallThickness} min={2} max={10} step={0.5} onChange={(value) => onUpdateParam('wallThickness', value)} />
              <LabeledSlider label="Fundo do suporte" value={params.bottomThickness} min={2} max={10} step={0.5} onChange={(value) => onUpdateParam('bottomThickness', value)} />
              <LabeledSlider label="Profundidade da bacia" value={params.bowlDepth} min={5} max={60} step={1} onChange={(value) => onUpdateParam('bowlDepth', value)} />
              <LabeledSlider label="Largura do degrau" value={params.stepWidth} min={2} max={15} step={0.5} onChange={(value) => onUpdateParam('stepWidth', value)} />
              <LabeledSlider label="Folga da tela" value={params.fitClearance} min={0.1} max={0.6} step={0.1} onChange={(value) => onUpdateParam('fitClearance', value)} />
              <LabeledSlider label="Chanfro do suporte" value={params.edgeChamfer} min={0} max={3} step={0.1} onChange={(value) => onUpdateParam('edgeChamfer', value)} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="macho">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Macho</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Text fontSize="xs" color="font.secondary">
                Diâmetro {params.diameter.toFixed(1)} mm · Altura{' '}
                {plugDims.height.toFixed(1)} mm · Pega Ø
                {(plugDims.gripRadius * 2).toFixed(1)} ×{' '}
                {plugDims.gripDepth.toFixed(1)} mm
              </Text>
              <LabeledSlider label="Altura do corpo" value={params.plugHeight} min={10} max={40} step={1} onChange={(value) => onUpdateParam('plugHeight', value)} />
              <Text fontSize="xs" color="font.tertiary">
                A tela é exportada plana; aqueça e pressione com o macho para
                conformá-la na bacia.
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
            <Flex
              role="group"
              aria-label="Cor das peças"
              direction="column"
              gap="xs"
            >
              <Text fontSize="xs" color="font.tertiary">Cor das peças</Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.color}
                onSelect={(color) => onUpdateParam('color', color)}
              />
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
              {pattern.cells.length > 0 && (
                <Text fontSize="xs" color="font.secondary">
                  {pattern.cells.length} favos · aro sólido até{' '}
                  {(params.frameWidth + pattern.cellRadius).toFixed(1)} mm
                </Text>
              )}
              {issues.length === 0 ? (
                <Text fontSize="xs" color="font.tertiary">
                  Nenhum problema encontrado.
                </Text>
              ) : (
                <Flex direction="column" gap="xs">
                  {issues.map((issue) => (
                    <Alert
                      key={issue.code}
                      variation={issue.severity === 'error' ? 'error' : 'warning'}
                      heading={issue.severity === 'error' ? 'Erro' : 'Aviso'}
                    >
                      {issue.message}
                    </Alert>
                  ))}
                </Flex>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
