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
import { type CakeTopperParams, PLA_COLORS } from './schema'

interface StudioPanelProps {
  params: CakeTopperParams
  onUpdateParam: (key: keyof CakeTopperParams, value: number | string | boolean | null) => void
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
          Topo de Bolo
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
                maxLength={40}
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
                min={8} max={20} step={1}
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
              <SelectField
                label="Forma"
                value={params.shape}
                onChange={(e) => onUpdateParam('shape', e.target.value)}
              >
                <option value="circle">Circular</option>
                <option value="rectangle">Retangular</option>
                <option value="oval">Oval</option>
              </SelectField>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura</Text>
                <Text fontSize="xs" color="font.secondary">{params.width} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura"
                min={50} max={120} step={5}
                value={params.width}
                onChange={(value) => onUpdateParam('width', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.height} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura"
                min={30} max={80} step={5}
                value={params.height}
                onChange={(value) => onUpdateParam('height', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Espessura</Text>
                <Text fontSize="xs" color="font.secondary">{params.thickness} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Espessura"
                min={2} max={4} step={0.5}
                value={params.thickness}
                onChange={(value) => onUpdateParam('thickness', value as number)}
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

              <SelectField
                label="Posição"
                value={params.iconPosition}
                onChange={(e) => onUpdateParam('iconPosition', e.target.value)}
                isDisabled={!params.svgIcon}
              >
                <option value="above">Acima</option>
                <option value="left">Esquerda</option>
                <option value="right">Direita</option>
              </SelectField>

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

        <Accordion.Item value="suporte">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Suporte (Pé)
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.legHeight} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Altura do pé"
                min={30} max={60} step={5}
                value={params.legHeight}
                onChange={(value) => onUpdateParam('legHeight', value as number)}
              />

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Largura</Text>
                <Text fontSize="xs" color="font.secondary">{params.legWidth} mm</Text>
              </Flex>
              <SliderField
                label=""
                aria-label="Largura do pé"
                min={3} max={8} step={0.5}
                value={params.legWidth}
                onChange={(value) => onUpdateParam('legWidth', value as number)}
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
                Cor da placa
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.baseColor}
                onSelect={(color) => onUpdateParam('baseColor', color)}
              />

              <Text fontSize="xs" color="font.tertiary">
                Cor do texto/ícone
              </Text>
              <ColorSwatches
                colors={PLA_COLORS}
                selected={params.textColor}
                onSelect={(color) => onUpdateParam('textColor', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
