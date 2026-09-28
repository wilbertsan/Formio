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
import { type CutterStampParams, PLA_COLORS } from './schema'

interface StudioPanelProps {
  params: CutterStampParams
  onUpdateParam: (key: keyof CutterStampParams, value: number | string | boolean | null) => void
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
          Cortador + Carimbo
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="formato">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Formato
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Formato externo"
                value={params.outerShape}
                onChange={(e) => onUpdateParam('outerShape', e.target.value)}
              >
                <option value="circle">Círculo</option>
                <option value="rectangle">Retângulo</option>
                <option value="star">Estrela</option>
              </SelectField>

              {params.outerShape === 'rectangle' ? (
                <>
                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Largura</Text>
                    <Text fontSize="xs" color="font.secondary">{params.rectWidth} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Largura"
                    min={30} max={80} step={1}
                    value={params.rectWidth}
                    onChange={(value) => onUpdateParam('rectWidth', value as number)}
                  />
                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura</Text>
                    <Text fontSize="xs" color="font.secondary">{params.rectHeight} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Altura"
                    min={30} max={80} step={1}
                    value={params.rectHeight}
                    onChange={(value) => onUpdateParam('rectHeight', value as number)}
                  />
                </>
              ) : (
                <>
                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Diâmetro</Text>
                    <Text fontSize="xs" color="font.secondary">{params.diameter} mm</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Diâmetro"
                    min={30} max={80} step={1}
                    value={params.diameter}
                    onChange={(value) => onUpdateParam('diameter', value as number)}
                  />
                </>
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="parede">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Parede
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura da parede</Text>
                <Text fontSize="xs" color="font.secondary">{params.wallHeight} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura da parede"
                min={15} max={40} step={1}
                value={params.wallHeight}
                onChange={(value) => onUpdateParam('wallHeight', value as number)}
              />
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Espessura</Text>
                <Text fontSize="xs" color="font.secondary">{params.wallThickness.toFixed(1)} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Espessura da parede"
                min={0.8} max={2} step={0.1}
                value={params.wallThickness}
                onChange={(value) => onUpdateParam('wallThickness', value as number)}
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
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura do carimbo</Text>
                <Text fontSize="xs" color="font.secondary">{params.stampHeight} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura do carimbo"
                min={5} max={Math.max(5, params.wallHeight - 1)} step={1}
                value={params.stampHeight}
                onChange={(value) => onUpdateParam('stampHeight', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="conteudo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Conteúdo Central
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
                <Text fontSize="xs" color="font.tertiary">Tamanho da fonte</Text>
                <Text fontSize="xs" color="font.secondary">{params.fontSize} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Tamanho da fonte"
                min={5} max={15} step={1}
                value={params.fontSize}
                onChange={(value) => onUpdateParam('fontSize', value as number)}
              />

              <SelectField
                label="Forma central"
                value={params.centralShape ?? ''}
                onChange={(e) => onUpdateParam('centralShape', e.target.value || null)}
              >
                <option value="">Nenhuma</option>
                <option value="circle">Círculo</option>
                <option value="star">Estrela</option>
                <option value="heart">Coração</option>
              </SelectField>

              {params.centralShape && (
                <>
                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Escala da forma</Text>
                    <Text fontSize="xs" color="font.secondary">{params.shapeScale.toFixed(1)}x</Text>
                  </Flex>
                  <SliderField
                    label=""
                    aria-label="Escala da forma"
                    min={0.5} max={2.0} step={0.1}
                    value={params.shapeScale}
                    onChange={(value) => onUpdateParam('shapeScale', value as number)}
                  />
                </>
              )}
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
