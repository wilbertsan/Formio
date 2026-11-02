import { useEffect, useRef, useState } from 'react'
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
import {
  type FontStyle,
  type IconContent,
  type KeychainParams,
  type TextContent,
  PLA_COLORS,
} from './schema'

interface StudioPanelProps {
  params: KeychainParams
  selectedContentId: string
  onSelectContent: (id: string) => void
  onUpdateContent: (id: string, patch: Partial<TextContent> | Partial<IconContent>) => void
  onSetContentType: (id: string, kind: 'text' | 'icon') => void
  onAddContent: () => void
  onRemoveContent: (id: string) => void
  onUpdateParam: (key: keyof KeychainParams, value: number | string) => void
  onReset: () => void
  onOpenEditor: () => void
}

const MAX_SVG_BYTES = 1024 * 1024
const SVG_ERROR_MESSAGE = 'Envie um arquivo SVG de até 1 MB.'
const SVG_READ_ERROR_MESSAGE = 'Não foi possível ler o arquivo.'

function LabeledSlider({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  isDisabled,
}: {
  label: string
  value: number
  unit: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  isDisabled?: boolean
}) {
  return (
    <>
      <Flex direction="row" justifyContent="space-between">
        <Text fontSize="xs" color="font.tertiary">{label}</Text>
        <Text fontSize="xs" color="font.secondary">{value} {unit}</Text>
      </Flex>
      <SliderField
        label=""
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        isDisabled={isDisabled}
        isValueHidden
        onChange={(v) => onChange(v as number)}
      />
    </>
  )
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
  selectedContentId,
  onSelectContent,
  onUpdateContent,
  onSetContentType,
  onAddContent,
  onRemoveContent,
  onUpdateParam,
  onReset,
  onOpenEditor,
}: StudioPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [svgError, setSvgError] = useState<string | null>(null)
  const selected = params.contents.find((item) => item.id === selectedContentId) ?? params.contents[0]
  const canAddContent = params.contents.length < 3
  const iconItems = params.contents.filter((item) => item.kind === 'icon')
  const hasMultipleIcons = iconItems.length > 1

  useEffect(() => {
    setSvgError(null)
  }, [selectedContentId])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) {
      input.value = ''
      return
    }

    if (!file.name.toLowerCase().endsWith('.svg') || file.size > MAX_SVG_BYTES) {
      setSvgError(SVG_ERROR_MESSAGE)
      input.value = ''
      return
    }

    const contentId = selected.id
    const reader = new FileReader()
    reader.onload = (e) => {
      const svgContent = e.target?.result as string
      setSvgError(null)
      onUpdateContent(contentId, { svgIcon: svgContent })
      input.value = ''
    }
    reader.onerror = () => {
      setSvgError(SVG_READ_ERROR_MESSAGE)
      input.value = ''
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
          Produto
        </Heading>
        <Button size="small" variation="link" onClick={onReset}>
          Restaurar
        </Button>
      </Flex>

      <Accordion.Container allowMultiple>
        <Accordion.Item value="conteudo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Conteúdo
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <Flex direction="row" gap="xs" wrap="wrap">
                {params.contents.map((item) => (
                  <Button
                    key={item.id}
                    size="small"
                    aria-pressed={item.id === selected.id}
                    onClick={() => onSelectContent(item.id)}
                  >
                    {item.kind === 'text'
                      ? item.content || 'Texto'
                      : hasMultipleIcons
                        ? `Ícone ${iconItems.findIndex((icon) => icon.id === item.id) + 1}`
                        : 'Ícone'}
                  </Button>
                ))}
                {params.contents.length > 1 && (
                  <Button
                    size="small"
                    variation="link"
                    aria-label="Remover conteúdo"
                    onClick={() => {
                      setSvgError(null)
                      onRemoveContent(selected.id)
                    }}
                  >
                    ×
                  </Button>
                )}
              </Flex>

              <Button
                size="small"
                isDisabled={!canAddContent}
                onClick={onAddContent}
              >
                Adicionar texto
              </Button>

              <RadioGroupField
                legend="Tipo de conteúdo"
                name="contentType"
                value={selected.kind}
                onChange={(e) =>
                  onSetContentType(selected.id, e.target.value as 'text' | 'icon')
                }
              >
                <Radio value="text">Texto</Radio>
                <Radio value="icon">Ícone</Radio>
              </RadioGroupField>

              {selected.kind === 'text' ? (
                <>
                  <TextField
                    label="Conteúdo"
                    descriptiveText="Até 12 caracteres. Acentos são removidos."
                    value={selected.content}
                    maxLength={12}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onUpdateContent(selected.id, { content: e.target.value })
                    }
                  />

                  <SelectField
                    label="Estilo da letra"
                    value={selected.fontStyle}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      onUpdateContent(selected.id, { fontStyle: e.target.value as FontStyle })
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Negrito</option>
                    <option value="serif">Serifada</option>
                  </SelectField>

                  <LabeledSlider
                    label="Tamanho da fonte"
                    value={selected.fontSize}
                    unit="mm"
                    min={6} max={15} step={1}
                    onChange={(value) => onUpdateContent(selected.id, { fontSize: value })}
                  />
                </>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg"
                    data-testid="icon-upload"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  {!selected.svgIcon ? (
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
                        onClick={() => {
                          setSvgError(null)
                          onUpdateContent(selected.id, { svgIcon: null })
                        }}
                      >
                        Remover ícone
                      </Button>
                    </>
                  )}

                  {svgError && (
                    <Text role="alert" fontSize="xs" className="text-red-600">
                      {svgError}
                    </Text>
                  )}

                  <LabeledSlider
                    label="Escala do ícone"
                    value={selected.iconScale}
                    unit="x"
                    min={0.5} max={1} step={0.1}
                    isDisabled={!selected.svgIcon}
                    onChange={(value) => onUpdateContent(selected.id, { iconScale: value })}
                  />

                  <LabeledSlider
                    label="Espessura da linha do ícone"
                    value={selected.iconLineWidth}
                    unit="mm"
                    min={0.1} max={1.5} step={0.05}
                    isDisabled={!selected.svgIcon}
                    onChange={(value) => onUpdateContent(selected.id, { iconLineWidth: value })}
                  />
                </>
              )}

              <Text fontSize="xs" color="font.tertiary">
                Textos e ícones elevados em 1 mm.
              </Text>

              <Button
                size="small"
                variation="link"
                onClick={onOpenEditor}
                aria-label="Posicionar conteúdos"
              >
                ✥ Posicionar conteúdos
              </Button>
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
                label="Formato"
                value={params.baseShape}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('baseShape', e.target.value)
                }
              >
                <option value="rect">Retangular</option>
                <option value="circle">Circular</option>
                <option value="heart">Coração</option>
                <option value="name">Contorno do Nome</option>
              </SelectField>

              {params.baseShape !== 'name' && (
                <LabeledSlider
                  label="Comprimento"
                  value={params.width}
                  unit="mm"
                  min={20} max={80} step={1}
                  onChange={(value) => onUpdateParam('width', value)}
                />
              )}

              {params.baseShape !== 'circle' && params.baseShape !== 'name' && (
                <LabeledSlider
                  label="Altura da peça"
                  value={params.height}
                  unit="mm"
                  min={20} max={80} step={1}
                  onChange={(value) => onUpdateParam('height', value)}
                />
              )}

              {params.baseShape === 'name' && (
                <Text fontSize="xs" color="font.tertiary">
                  Tamanho controlado nos sliders de Texto
                </Text>
              )}

              <LabeledSlider
                label="Espessura"
                value={params.thickness}
                unit="mm"
                min={2} max={6} step={0.5}
                onChange={(value) => onUpdateParam('thickness', value)}
              />

              <LabeledSlider
                label="Borda"
                value={params.borderWidth}
                unit="mm"
                min={4} max={10} step={1}
                onChange={(value) => onUpdateParam('borderWidth', value)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="argola">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Argola
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Posição"
                value={params.ringPosition}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('ringPosition', e.target.value)
                }
              >
                <option value="top">Cima</option>
                <option value="bottom">Baixo</option>
                <option value="left">Esquerda</option>
                <option value="right">Direita</option>
              </SelectField>

              <LabeledSlider
                label="Diâmetro interno"
                value={params.ringInnerDiameter}
                unit="mm"
                min={3} max={10} step={0.5}
                onChange={(value) => onUpdateParam('ringInnerDiameter', value)}
              />

              <LabeledSlider
                label="Embutimento"
                value={params.ringEmbedding}
                unit="mm"
                min={0} max={3} step={0.5}
                onChange={(value) => onUpdateParam('ringEmbedding', value)}
              />

              <LabeledSlider
                label="Deslocamento radial"
                value={params.ringRadialOffset}
                unit="mm"
                min={0} max={5} step={0.5}
                onChange={(value) => onUpdateParam('ringRadialOffset', value)}
              />

              <LabeledSlider
                label="Deslocamento lateral"
                value={params.ringLateralOffset}
                unit="mm"
                min={-10} max={10} step={0.5}
                onChange={(value) => onUpdateParam('ringLateralOffset', value)}
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
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>
    </View>
  )
}
