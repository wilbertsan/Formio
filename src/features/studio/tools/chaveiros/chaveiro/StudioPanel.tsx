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
  const selected = params.contents.find((item) => item.id === selectedContentId) ?? params.contents[0]
  const canAddContent = params.contents.length < 3

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const contentId = selected.id
    const reader = new FileReader()
    reader.onload = (e) => {
      const svgContent = e.target?.result as string
      onUpdateContent(contentId, { svgIcon: svgContent })
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
                    {item.kind === 'text' ? item.content : 'Ícone'}
                  </Button>
                ))}
                {params.contents.length > 1 && (
                  <Button
                    size="small"
                    variation="link"
                    aria-label="Remover conteúdo"
                    onClick={() => onRemoveContent(selected.id)}
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

                  <SliderField
                    label=""
                    aria-label="Tamanho da fonte"
                    min={6} max={15} step={1}
                    value={selected.fontSize}
                    onChange={(value) => onUpdateContent(selected.id, { fontSize: value as number })}
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
                        onClick={() => onUpdateContent(selected.id, { svgIcon: null })}
                      >
                        Remover ícone
                      </Button>
                    </>
                  )}

                  <SliderField
                    label=""
                    aria-label="Escala do ícone"
                    min={0.5} max={1} step={0.1}
                    value={selected.iconScale}
                    isDisabled={!selected.svgIcon}
                    onChange={(value) => onUpdateContent(selected.id, { iconScale: value as number })}
                  />

                  <SliderField
                    label=""
                    aria-label="Espessura da linha do ícone"
                    min={0.1} max={1.5} step={0.05}
                    value={selected.iconLineWidth}
                    isDisabled={!selected.svgIcon}
                    onChange={(value) => onUpdateContent(selected.id, { iconLineWidth: value as number })}
                  />
                </>
              )}

              <Button
                size="small"
                variation="link"
                onClick={onOpenEditor}
                aria-label="Posicionar textos"
              >
                ✥ Posicionar textos
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
                <SliderField
                  label=""
                  aria-label="Comprimento"
                  min={20} max={80} step={1}
                  value={params.width}
                  onChange={(value) => onUpdateParam('width', value as number)}
                />
              )}

              {params.baseShape !== 'circle' && params.baseShape !== 'name' && (
                <SliderField
                  label=""
                  aria-label="Altura da peça"
                  min={20} max={80} step={1}
                  value={params.height}
                  onChange={(value) => onUpdateParam('height', value as number)}
                />
              )}

              {params.baseShape === 'name' && (
                <Text fontSize="xs" color="font.tertiary">
                  Tamanho controlado nos sliders de Texto
                </Text>
              )}

              <SliderField
                label=""
                aria-label="Espessura"
                min={2} max={6} step={0.5}
                value={params.thickness}
                onChange={(value) => onUpdateParam('thickness', value as number)}
              />

              <SliderField
                label=""
                aria-label="Borda"
                min={4} max={10} step={1}
                value={params.borderWidth}
                onChange={(value) => onUpdateParam('borderWidth', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="relevo">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Relevo
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Modo de relevo"
                value={params.textMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdateParam('textMode', e.target.value)
                }
              >
                <option value="raised">Elevado</option>
                <option value="engraved">Gravado</option>
              </SelectField>

              <SliderField
                label=""
                aria-label="Profundidade do relevo"
                min={0.4} max={2} step={0.1}
                value={params.reliefDepth}
                onChange={(value) => onUpdateParam('reliefDepth', value as number)}
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

              <SliderField
                label=""
                aria-label="Diâmetro interno"
                min={3} max={10} step={0.5}
                value={params.ringInnerDiameter}
                onChange={(value) => onUpdateParam('ringInnerDiameter', value as number)}
              />

              <SliderField
                label=""
                aria-label="Embutimento"
                min={0} max={3} step={0.5}
                value={params.ringEmbedding}
                onChange={(value) => onUpdateParam('ringEmbedding', value as number)}
              />

              <SliderField
                label=""
                aria-label="Deslocamento radial"
                min={0} max={5} step={0.5}
                value={params.ringRadialOffset}
                onChange={(value) => onUpdateParam('ringRadialOffset', value as number)}
              />

              <SliderField
                label=""
                aria-label="Deslocamento lateral"
                min={-10} max={10} step={0.5}
                value={params.ringLateralOffset}
                onChange={(value) => onUpdateParam('ringLateralOffset', value as number)}
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
