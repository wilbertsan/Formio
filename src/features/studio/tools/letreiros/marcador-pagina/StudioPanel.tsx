import { useRef, useState } from 'react'
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
import {
  PATTERN_DENSITIES,
  PATTERN_TYPES,
  PLA_COLORS,
  type BookmarkParams,
  type PatternDensity,
  type PatternParams,
  type PatternType,
  type TextParams,
} from './schema'

const SLIDER_LIMITS = {
  textWidth: { min: 8, max: 100, step: 1 },
  textHeight: { min: 4, max: 40, step: 0.5 },
  relief: { min: 3, max: 5, step: 0.1 },
  length: { min: 50, max: 150, step: 1 },
  width: { min: 30, max: 50, step: 1 },
  thickness: { min: 1, max: 2, step: 0.5 },
  patternDepth: { min: 0.4, max: 1.5, step: 0.1 },
} as const

const PATTERN_LABELS: Record<PatternType, string> = {
  none: 'Nenhuma',
  triangles: 'Triângulos',
  squares: 'Quadrados',
  circles: 'Círculos',
  diamonds: 'Losangos',
  svg: 'SVG personalizado',
}

const DENSITY_LABELS: Record<PatternDensity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

interface StudioPanelProps {
  params: BookmarkParams
  onUpdateText: (patch: Partial<TextParams>) => void
  onUpdatePattern: (patch: Partial<PatternParams>) => void
  onUpdateParam: (key: keyof BookmarkParams, value: number | string) => void
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
  onUpdateText,
  onUpdatePattern,
  onUpdateParam,
  onReset,
}: StudioPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [svgError, setSvgError] = useState<string | null>(null)

  const handleSvgUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.svg')) {
      setSvgError('Envie um arquivo SVG')
      input.value = ''
      return
    }
    if (file.size > 1024 * 1024) {
      setSvgError('O SVG deve ter no máximo 1MB')
      input.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === 'string' && text.trim()) {
        setSvgError(null)
        onUpdatePattern({ svg: text })
      } else {
        setSvgError('Não foi possível ler o SVG')
      }
    }
    reader.onerror = () => setSvgError('Não foi possível ler o SVG')
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
              <TextField
                label="Conteúdo"
                value={params.text.content}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdateText({ content: e.target.value })
                }
              />

              <SelectField
                label="Estilo da letra"
                value={params.text.fontStyle}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateText({ fontStyle: e.target.value as TextParams['fontStyle'] })
                }
              >
                <option value="bold">Negrito</option>
                <option value="normal">Normal</option>
                <option value="serif">Serifada</option>
              </SelectField>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura do texto</Text>
                <Text fontSize="xs" color="font.secondary">{params.text.width} mm</Text>
              </Flex>
              <SliderField
                label="Largura do texto"
                labelHidden
                aria-label="Largura do texto"
                min={SLIDER_LIMITS.textWidth.min}
                max={SLIDER_LIMITS.textWidth.max}
                step={SLIDER_LIMITS.textWidth.step}
                value={params.text.width}
                onChange={(value) => onUpdateText({ width: value as number })}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura do texto</Text>
                <Text fontSize="xs" color="font.secondary">{params.text.height} mm</Text>
              </Flex>
              <SliderField
                label="Altura do texto"
                labelHidden
                aria-label="Altura do texto"
                min={SLIDER_LIMITS.textHeight.min}
                max={SLIDER_LIMITS.textHeight.max}
                step={SLIDER_LIMITS.textHeight.step}
                value={params.text.height}
                onChange={(value) => onUpdateText({ height: value as number })}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Espessura da parede</Text>
                <Text fontSize="xs" color="font.secondary">{params.text.relief} mm</Text>
              </Flex>
              <SliderField
                label="Espessura da parede"
                labelHidden
                aria-label="Espessura da parede"
                min={SLIDER_LIMITS.relief.min}
                max={SLIDER_LIMITS.relief.max}
                step={SLIDER_LIMITS.relief.step}
                value={params.text.relief}
                onChange={(value) => onUpdateText({ relief: value as number })}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="textura">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Textura
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Tipo de textura"
                value={params.pattern.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdatePattern({ type: e.target.value as PatternType })
                }
              >
                {PATTERN_TYPES.map((type) => (
                  <option key={type} value={type}>{PATTERN_LABELS[type]}</option>
                ))}
              </SelectField>

              {params.pattern.type !== 'none' && (
                <>
                  <SelectField
                    label="Densidade"
                    value={params.pattern.density}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      onUpdatePattern({ density: e.target.value as PatternDensity })
                    }
                  >
                    {PATTERN_DENSITIES.map((density) => (
                      <option key={density} value={density}>{DENSITY_LABELS[density]}</option>
                    ))}
                  </SelectField>

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Profundidade</Text>
                    <Text fontSize="xs" color="font.secondary">{params.pattern.depth} mm</Text>
                  </Flex>
                  <SliderField
                    label="Profundidade da textura"
                    labelHidden
                    aria-label="Profundidade da textura"
                    min={SLIDER_LIMITS.patternDepth.min}
                    max={SLIDER_LIMITS.patternDepth.max}
                    step={SLIDER_LIMITS.patternDepth.step}
                    value={params.pattern.depth}
                    onChange={(value) => onUpdatePattern({ depth: value as number })}
                  />
                </>
              )}

              {params.pattern.type === 'svg' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg"
                    onChange={handleSvgUpload}
                    style={{ display: 'none' }}
                  />

                  {params.pattern.svg ? (
                    <Button size="small" variation="link" onClick={() => onUpdatePattern({ svg: null })}>
                      Remover SVG
                    </Button>
                  ) : (
                    <Button size="small" onClick={() => fileInputRef.current?.click()}>
                      Enviar SVG
                    </Button>
                  )}

                  <Text fontSize="xs" color="font.secondary">
                    O SVG é repetido como motivo, mantendo a proporção.
                  </Text>

                  {svgError && (
                    <Text fontSize="xs" className="text-red-600" role="alert">
                      {svgError}
                    </Text>
                  )}
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
                label="Comprimento"
                labelHidden
                aria-label="Comprimento"
                min={SLIDER_LIMITS.length.min}
                max={SLIDER_LIMITS.length.max}
                step={SLIDER_LIMITS.length.step}
                value={params.length}
                onChange={(value) => onUpdateParam('length', value as number)}
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
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
