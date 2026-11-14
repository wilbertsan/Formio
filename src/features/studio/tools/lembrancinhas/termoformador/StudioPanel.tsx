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
import { PLA_COLORS, type ThermoformerParams } from './schema'
import { computeScreenPattern } from './screenPattern'
import type { ValidationIssue } from './validateScreen'

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

        <Accordion.Item value="aparencia">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Aparência</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex
              role="group"
              aria-label="Cor da tela"
              direction="column"
              gap="xs"
            >
              <Text fontSize="xs" color="font.tertiary">Cor da tela</Text>
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
