import { useEffect, useRef, useState } from 'react'
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
import { type CakeTopperParams, type TextItem, PLA_COLORS } from './schema'
import { TextPositionEditor } from './TextPositionEditor'

const SLIDER_LIMITS = {
  textWidth: { min: 10, max: 110, step: 1 },
  textHeight: { min: 5, max: 50, step: 1 },
  relief: { min: 0.4, max: 3, step: 0.1 },
  width: { min: 50, max: 120, step: 1 },
  height: { min: 30, max: 80, step: 1 },
  thickness: { min: 2, max: 4, step: 0.5 },
  cornerRadius: { min: 3, max: 15, step: 1 },
  iconScale: { min: 0.5, max: 2, step: 0.1 },
  stemDiameter: { min: 3, max: 8, step: 0.5 },
  stemLength: { min: 20, max: 60, step: 1 },
  slotWidth: { min: 2.4, max: 4.5, step: 0.1 },
  slotDepth: { min: 5, max: 20, step: 1 },
  baseWidth: { min: 30, max: 60, step: 1 },
  baseDepth: { min: 20, max: 40, step: 1 },
} as const

interface StudioPanelProps {
  params: CakeTopperParams
  onUpdateParam: (key: keyof CakeTopperParams, value: number | string | null) => void
  onAddText: () => void
  onRemoveText: (id: string) => void
  onUpdateTextById: (id: string, patch: Partial<TextItem>) => void
  onSetSvgIcon: (svg: string | null) => void
  onSetContourSvg: (svg: string | null) => void
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

function readSvgFile(
  file: File,
  onLoad: (svg: string) => void,
  onError: () => void,
): void {
  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result
    if (typeof content === 'string') onLoad(content)
    else onError()
  }
  reader.onerror = () => onError()
  reader.readAsText(file)
}

export function StudioPanel({
  params,
  onUpdateParam,
  onAddText,
  onRemoveText,
  onUpdateTextById,
  onSetSvgIcon,
  onSetContourSvg,
  onReset,
}: StudioPanelProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedTextId, setSelectedTextId] = useState(params.texts[0]?.id ?? '')
  const [iconUploadError, setIconUploadError] = useState(false)
  const [contourUploadError, setContourUploadError] = useState(false)
  const contourInputRef = useRef<HTMLInputElement>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)
  const textCountRef = useRef(params.texts.length)

  useEffect(() => {
    if (params.texts.length > textCountRef.current) {
      const last = params.texts[params.texts.length - 1]
      if (last) setSelectedTextId(last.id)
    }
    textCountRef.current = params.texts.length
  }, [params.texts])

  const handleContourUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    setContourUploadError(false)
    readSvgFile(file, onSetContourSvg, () => setContourUploadError(true))
    input.value = ''
  }

  const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    setIconUploadError(false)
    readSvgFile(file, onSetSvgIcon, () => setIconUploadError(true))
    input.value = ''
  }

  const selectedText = params.texts.find((text) => text.id === selectedTextId) ?? params.texts[0]
  const canAddText = params.texts.length < 3

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
              <Flex direction="row" gap="xs" wrap="wrap">
                {params.texts.map((text) => (
                  <Flex key={text.id} direction="row" gap="xs" alignItems="center">
                    <Button
                      size="small"
                      aria-pressed={text.id === selectedText.id}
                      onClick={() => setSelectedTextId(text.id)}
                    >
                      {text.content}
                    </Button>
                    <Button
                      size="small"
                      variation="link"
                      onClick={() => onRemoveText(text.id)}
                      aria-label={`Remover texto ${text.content}`}
                      isDisabled={params.texts.length <= 1}
                    >
                      ×
                    </Button>
                  </Flex>
                ))}
              </Flex>

              <Button size="small" isDisabled={!canAddText} onClick={onAddText}>
                Adicionar texto
              </Button>

              {selectedText && (
                <>
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => setEditorOpen(true)}
                  >
                    ✥ Posicionar textos
                  </Button>

                  <TextField
                    label="Conteúdo"
                    descriptiveText="Até 40 caracteres"
                    value={selectedText.content}
                    maxLength={40}
                    onChange={(event) =>
                      onUpdateTextById(selectedText.id, { content: event.target.value })
                    }
                  />

                  <SelectField
                    label="Estilo da letra"
                    value={selectedText.fontStyle}
                    onChange={(event) =>
                      onUpdateTextById(selectedText.id, {
                        fontStyle: event.target.value as TextItem['fontStyle'],
                      })
                    }
                  >
                    <option value="bold">Negrito</option>
                    <option value="normal">Normal</option>
                    <option value="serif">Serifada</option>
                  </SelectField>

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Largura do texto</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.width} mm</Text>
                  </Flex>
                  <SliderField
                    label="Largura do texto"
                    labelHidden
                    aria-label="Largura do texto"
                    min={SLIDER_LIMITS.textWidth.min}
                    max={SLIDER_LIMITS.textWidth.max}
                    step={SLIDER_LIMITS.textWidth.step}
                    value={selectedText.width}
                    onChange={(value) => onUpdateTextById(selectedText.id, { width: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do texto</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.height} mm</Text>
                  </Flex>
                  <SliderField
                    label="Altura do texto"
                    labelHidden
                    aria-label="Altura do texto"
                    min={SLIDER_LIMITS.textHeight.min}
                    max={SLIDER_LIMITS.textHeight.max}
                    step={SLIDER_LIMITS.textHeight.step}
                    value={selectedText.height}
                    onChange={(value) => onUpdateTextById(selectedText.id, { height: value as number })}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Altura do relevo</Text>
                    <Text fontSize="xs" color="font.secondary">{selectedText.relief} mm</Text>
                  </Flex>
                  <SliderField
                    label="Altura do relevo"
                    labelHidden
                    aria-label="Altura do relevo"
                    min={SLIDER_LIMITS.relief.min}
                    max={SLIDER_LIMITS.relief.max}
                    step={SLIDER_LIMITS.relief.step}
                    value={selectedText.relief}
                    onChange={(value) => onUpdateTextById(selectedText.id, { relief: value as number })}
                  />

                  <SelectField
                    label="Modo do texto"
                    value={params.textMode}
                    onChange={(event) => onUpdateParam('textMode', event.target.value)}
                  >
                    <option value="raised">Relevo</option>
                    <option value="cut">Corte vazado</option>
                  </SelectField>
                </>
              )}
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
                onChange={(event) => onUpdateParam('shape', event.target.value)}
              >
                <option value="circle">Circular</option>
                <option value="rounded-rect">Arredondado</option>
                <option value="oval">Oval</option>
                <option value="custom">Personalizado</option>
              </SelectField>

              {params.shape === 'custom' && (
                <>
                  <input
                    ref={contourInputRef}
                    type="file"
                    accept=".svg"
                    aria-label="Carregar contorno SVG"
                    onChange={handleContourUpload}
                    style={{ display: 'none' }}
                  />
                  <Button size="small" onClick={() => contourInputRef.current?.click()}>
                    Carregar contorno SVG
                  </Button>
                  {contourUploadError && (
                    <Text fontSize="xs" className="text-red-600">
                      Falha ao ler o arquivo SVG
                    </Text>
                  )}
                  {params.contourSvg && (
                    <>
                      <Text fontSize="xs" color="font.secondary">Contorno carregado</Text>
                      <Button
                        size="small"
                        variation="link"
                        onClick={() => onSetContourSvg(null)}
                      >
                        Remover contorno
                      </Button>
                    </>
                  )}
                </>
              )}

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
                <Text fontSize="xs" color="font.tertiary">Altura</Text>
                <Text fontSize="xs" color="font.secondary">{params.height} mm</Text>
              </Flex>
              <SliderField
                label="Altura"
                labelHidden
                aria-label="Altura"
                min={SLIDER_LIMITS.height.min}
                max={SLIDER_LIMITS.height.max}
                step={SLIDER_LIMITS.height.step}
                value={params.height}
                onChange={(value) => onUpdateParam('height', value as number)}
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

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Raio de borda</Text>
                <Text fontSize="xs" color="font.secondary">{params.cornerRadius} mm</Text>
              </Flex>
              <SliderField
                label="Raio de borda"
                labelHidden
                aria-label="Raio de borda"
                min={SLIDER_LIMITS.cornerRadius.min}
                max={SLIDER_LIMITS.cornerRadius.max}
                step={SLIDER_LIMITS.cornerRadius.step}
                value={params.cornerRadius}
                onChange={(value) => onUpdateParam('cornerRadius', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="icone">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Ícone
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <input
                ref={iconInputRef}
                type="file"
                accept=".svg"
                aria-label="Carregar ícone SVG"
                onChange={handleIconUpload}
                style={{ display: 'none' }}
              />
              <Button size="small" onClick={() => iconInputRef.current?.click()}>
                Carregar ícone SVG
              </Button>
              {iconUploadError && (
                <Text fontSize="xs" className="text-red-600">
                  Falha ao ler o arquivo SVG
                </Text>
              )}
              {params.svgIcon && (
                <>
                  <Text fontSize="xs" color="font.secondary">Ícone carregado</Text>
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
                label="Posição do ícone"
                value={params.iconPosition}
                isDisabled={!params.svgIcon}
                onChange={(event) => onUpdateParam('iconPosition', event.target.value)}
              >
                <option value="above">Acima</option>
                <option value="center">Centro</option>
              </SelectField>

              <Flex direction="row" justifyContent="space-between">
                <Text fontSize="xs" color="font.tertiary">Escala do ícone</Text>
                <Text fontSize="xs" color="font.secondary">{params.iconScale.toFixed(1)}x</Text>
              </Flex>
              <SliderField
                label="Escala do ícone"
                labelHidden
                aria-label="Escala do ícone"
                min={SLIDER_LIMITS.iconScale.min}
                max={SLIDER_LIMITS.iconScale.max}
                step={SLIDER_LIMITS.iconScale.step}
                value={params.iconScale}
                isDisabled={!params.svgIcon}
                onChange={(value) => onUpdateParam('iconScale', value as number)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="fixacao">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">
              Fixação
            </Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Tipo de fixação"
                value={params.supportType}
                onChange={(event) => onUpdateParam('supportType', event.target.value)}
              >
                <option value="haste">Haste (palito)</option>
                <option value="base">Base de encaixe</option>
              </SelectField>

              {params.supportType === 'haste' ? (
                <>
                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Diâmetro da haste</Text>
                    <Text fontSize="xs" color="font.secondary">{params.stemDiameter} mm</Text>
                  </Flex>
                  <SliderField
                    label="Diâmetro da haste"
                    labelHidden
                    aria-label="Diâmetro da haste"
                    min={SLIDER_LIMITS.stemDiameter.min}
                    max={SLIDER_LIMITS.stemDiameter.max}
                    step={SLIDER_LIMITS.stemDiameter.step}
                    value={params.stemDiameter}
                    onChange={(value) => onUpdateParam('stemDiameter', value as number)}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Comprimento da haste</Text>
                    <Text fontSize="xs" color="font.secondary">{params.stemLength} mm</Text>
                  </Flex>
                  <SliderField
                    label="Comprimento da haste"
                    labelHidden
                    aria-label="Comprimento da haste"
                    min={SLIDER_LIMITS.stemLength.min}
                    max={SLIDER_LIMITS.stemLength.max}
                    step={SLIDER_LIMITS.stemLength.step}
                    value={params.stemLength}
                    onChange={(value) => onUpdateParam('stemLength', value as number)}
                  />
                </>
              ) : (
                <>
                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Largura da base</Text>
                    <Text fontSize="xs" color="font.secondary">{params.baseWidth} mm</Text>
                  </Flex>
                  <SliderField
                    label="Largura da base"
                    labelHidden
                    aria-label="Largura da base"
                    min={SLIDER_LIMITS.baseWidth.min}
                    max={SLIDER_LIMITS.baseWidth.max}
                    step={SLIDER_LIMITS.baseWidth.step}
                    value={params.baseWidth}
                    onChange={(value) => onUpdateParam('baseWidth', value as number)}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Profundidade da base</Text>
                    <Text fontSize="xs" color="font.secondary">{params.baseDepth} mm</Text>
                  </Flex>
                  <SliderField
                    label="Profundidade da base"
                    labelHidden
                    aria-label="Profundidade da base"
                    min={SLIDER_LIMITS.baseDepth.min}
                    max={SLIDER_LIMITS.baseDepth.max}
                    step={SLIDER_LIMITS.baseDepth.step}
                    value={params.baseDepth}
                    onChange={(value) => onUpdateParam('baseDepth', value as number)}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Largura do encaixe</Text>
                    <Text fontSize="xs" color="font.secondary">{params.slotWidth} mm</Text>
                  </Flex>
                  <SliderField
                    label="Largura do encaixe"
                    labelHidden
                    aria-label="Largura do encaixe"
                    min={SLIDER_LIMITS.slotWidth.min}
                    max={SLIDER_LIMITS.slotWidth.max}
                    step={SLIDER_LIMITS.slotWidth.step}
                    value={params.slotWidth}
                    onChange={(value) => onUpdateParam('slotWidth', value as number)}
                  />

                  <Flex direction="row" justifyContent="space-between">
                    <Text fontSize="xs" color="font.tertiary">Profundidade do encaixe</Text>
                    <Text fontSize="xs" color="font.secondary">{params.slotDepth} mm</Text>
                  </Flex>
                  <SliderField
                    label="Profundidade do encaixe"
                    labelHidden
                    aria-label="Profundidade do encaixe"
                    min={SLIDER_LIMITS.slotDepth.min}
                    max={SLIDER_LIMITS.slotDepth.max}
                    step={SLIDER_LIMITS.slotDepth.step}
                    value={params.slotDepth}
                    onChange={(value) => onUpdateParam('slotDepth', value as number)}
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
                selected={params.letterColor}
                onSelect={(color) => onUpdateParam('letterColor', color)}
              />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Container>

      {editorOpen && selectedText && (
        <TextPositionEditor
          params={params}
          selectedTextId={selectedText.id}
          onSelectText={setSelectedTextId}
          onMoveText={(id, x, y) => onUpdateTextById(id, { offsetX: x, offsetY: y })}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </View>
  )
}
