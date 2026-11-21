import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import {
  Accordion,
  Alert,
  Button,
  Flex,
  Heading,
  SelectField,
  SliderField,
  Text,
  View,
} from '@aws-amplify/ui-react'
import { getPlugDimensions } from './buildPlug'
import { getSupportDimensions } from './buildSupport'
import type { ShapeOutline } from './outline'
import {
  PLA_COLORS,
  SVG_MAX_LENGTH,
  type ThermoformerGeometryParams,
  type ThermoformerParams,
} from './schema'
import { computeScreenPattern } from './screenPattern'
import { getTrayDimensions } from './tray'
import type { ValidationIssue } from './validateThermoformer'

const MAX_SVG_BYTES = 2 * 1024 * 1024
const SVG_EXTENSION_ERROR = 'Envie um arquivo SVG.'
const SVG_SIZE_ERROR = 'O SVG deve ter no máximo 2 MB.'
const SVG_READ_ERROR = 'Não foi possível ler o arquivo.'

interface StudioPanelProps {
  params: ThermoformerParams
  outline?: ShapeOutline | null
  svgError?: { code: string; message: string } | null
  issues: ValidationIssue[]
  onUpdateParam: (key: keyof ThermoformerParams, value: number | string) => void
  onSetSvg?: (svg: string | null) => void
  onReset: () => void
}

function ignoreSvg() {
  return undefined
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
  unit = 'mm',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  const display = unit === '%'
    ? `${Math.round(value * 100)} ${unit}`
    : `${step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value} ${unit}`

  return (
    <>
      <Flex direction="row" justifyContent="space-between">
        <Text fontSize="xs" color="font.tertiary">{label}</Text>
        <Text fontSize="xs" color="font.secondary">{display}</Text>
      </Flex>
      <SliderField
        label={label}
        labelHidden
        isValueHidden
        min={min}
        max={max}
        step={step}
        value={value}
        ariaValuetext={display}
        onChange={(next) => onChange(next as number)}
      />
    </>
  )
}

export function StudioPanel({
  params,
  outline = null,
  svgError = null,
  issues,
  onUpdateParam,
  onSetSvg = ignoreSvg,
  onReset,
}: StudioPanelProps) {
  const [svgFileName, setSvgFileName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // `computeScreenPattern` só lê estes campos. O snapshot evita recalcular o
  // padrão hexagonal ao mexer em parâmetros que não o afetam.
  const patternParamsRef = useRef<ThermoformerGeometryParams>(params)
  const patternParams = useMemo<ThermoformerGeometryParams>(() => {
    const next: ThermoformerGeometryParams = {
      ...patternParamsRef.current,
      shape: params.shape,
      diameter: params.diameter,
      frameWidth: params.frameWidth,
      opening: params.opening,
      lineWidth: params.lineWidth,
    }
    patternParamsRef.current = next
    return next
  }, [
    params.shape,
    params.diameter,
    params.frameWidth,
    params.opening,
    params.lineWidth,
  ])

  const pattern = useMemo(
    () => (params.shape !== 'circle' && outline?.kind !== 'polygon'
      ? null
      : computeScreenPattern(patternParams, outline)),
    [patternParams, outline, params.shape],
  )

  // `getTrayDimensions` calcula a pega com Clipper e triangulação; o snapshot
  // restringe o recálculo aos campos de apoio e pega e ao contorno.
  const trayParamsRef = useRef<ThermoformerGeometryParams>(params)
  const trayParams = useMemo<ThermoformerGeometryParams>(() => {
    const next: ThermoformerGeometryParams = {
      ...trayParamsRef.current,
      shape: params.shape,
      draftAngle: params.draftAngle,
      pyramidTip: params.pyramidTip,
      thickness: params.thickness,
      wallThickness: params.wallThickness,
      bottomThickness: params.bottomThickness,
      bowlDepth: params.bowlDepth,
      stepWidth: params.stepWidth,
      plugHeight: params.plugHeight,
    }
    trayParamsRef.current = next
    return next
  }, [
    params.shape,
    params.draftAngle,
    params.pyramidTip,
    params.thickness,
    params.wallThickness,
    params.bottomThickness,
    params.bowlDepth,
    params.stepWidth,
    params.plugHeight,
  ])

  const trayDimensions = useMemo(
    () => (outline?.kind === 'polygon'
      ? getTrayDimensions(trayParams, outline)
      : null),
    [trayParams, outline],
  )

  const circleSupportDims = useMemo(
    () => (params.shape === 'circle' ? getSupportDimensions(params) : null),
    [params],
  )

  const circlePlugDims = useMemo(
    () => (params.shape === 'circle' ? getPlugDimensions(params) : null),
    [params],
  )

  const isDraftShape =
    params.shape === 'square' ||
    params.shape === 'rectangle' ||
    params.shape === 'svg'
  const hasSvg = params.svg.length > 0 || svgFileName !== null

  useEffect(() => {
    if (!params.svg) {
      setSvgFileName(null)
      setUploadError(null)
    }
  }, [params.svg])

  const handleSvgUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.svg')) {
      setUploadError(SVG_EXTENSION_ERROR)
      return
    }
    if (file.size > MAX_SVG_BYTES) {
      setUploadError(SVG_SIZE_ERROR)
      return
    }
    try {
      const text = await file.text()
      if (text.length > SVG_MAX_LENGTH) {
        setUploadError(SVG_SIZE_ERROR)
        return
      }
      setSvgFileName(file.name)
      setUploadError(null)
      onSetSvg(text)
    } catch {
      setUploadError(SVG_READ_ERROR)
    }
  }

  const handleRemoveSvg = () => {
    setSvgFileName(null)
    setUploadError(null)
    onSetSvg(null)
  }

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
        <Accordion.Item value="forma">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Forma</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              <SelectField
                label="Forma"
                value={params.shape}
                onChange={(event) => onUpdateParam('shape', event.target.value)}
              >
                <option value="circle">Círculo</option>
                <option value="square">Quadrado</option>
                <option value="rectangle">Retângulo</option>
                <option value="pyramid">Pirâmide</option>
                <option value="svg">SVG</option>
              </SelectField>

              {params.shape === 'circle' && (
                <LabeledSlider
                  label="Diâmetro"
                  value={params.diameter}
                  min={60}
                  max={300}
                  step={5}
                  onChange={(value) => onUpdateParam('diameter', value)}
                />
              )}

              {params.shape === 'square' && (
                <LabeledSlider
                  label="Lado"
                  value={params.width}
                  min={40}
                  max={300}
                  step={1}
                  onChange={(value) => onUpdateParam('width', value)}
                />
              )}

              {params.shape === 'rectangle' && (
                <>
                  <LabeledSlider
                    label="Largura"
                    value={params.width}
                    min={40}
                    max={300}
                    step={1}
                    onChange={(value) => onUpdateParam('width', value)}
                  />
                  <LabeledSlider
                    label="Altura"
                    value={params.height}
                    min={40}
                    max={300}
                    step={1}
                    onChange={(value) => onUpdateParam('height', value)}
                  />
                </>
              )}

              {params.shape === 'pyramid' && (
                <>
                  <LabeledSlider
                    label="Lado da base"
                    value={params.width}
                    min={40}
                    max={300}
                    step={1}
                    onChange={(value) => onUpdateParam('width', value)}
                  />
                  <LabeledSlider
                    label="Fundo da pirâmide"
                    value={params.pyramidTip}
                    min={0.05}
                    max={0.3}
                    step={0.01}
                    unit="%"
                    onChange={(value) => onUpdateParam('pyramidTip', value)}
                  />
                </>
              )}

              {params.shape === 'svg' && (
                <>
                  <LabeledSlider
                    label="Tamanho do SVG"
                    value={params.svgSize}
                    min={40}
                    max={300}
                    step={1}
                    onChange={(value) => onUpdateParam('svgSize', value)}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    aria-label="Arquivo SVG"
                    onChange={handleSvgUpload}
                    style={{ display: 'none' }}
                  />
                  <Flex direction="row" gap="xs" wrap="wrap">
                    <Button
                      size="small"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {hasSvg ? 'Trocar SVG' : 'Enviar SVG'}
                    </Button>
                    {hasSvg && (
                      <Button
                        size="small"
                        variation="link"
                        onClick={handleRemoveSvg}
                      >
                        Remover SVG
                      </Button>
                    )}
                  </Flex>
                  {hasSvg && (
                    <Text fontSize="xs" color="font.secondary">
                      {svgFileName ?? 'SVG carregado'}
                    </Text>
                  )}
                  {(svgError || uploadError) && (
                    <Alert variation="error" heading="Erro no SVG">
                      {svgError?.message ?? uploadError}
                    </Alert>
                  )}
                </>
              )}

              {isDraftShape && (
                <LabeledSlider
                  label="Ângulo de saída"
                  value={params.draftAngle}
                  min={0}
                  max={15}
                  step={0.5}
                  unit="°"
                  onChange={(value) => onUpdateParam('draftAngle', value)}
                />
              )}
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="tela">
          <Accordion.Trigger>
            <Heading level={3} fontSize="small">Tela</Heading>
            <Accordion.Icon />
          </Accordion.Trigger>
          <Accordion.Content>
            <Flex direction="column" gap="xs">
              {trayDimensions && (
                <Text fontSize="xs" color="font.secondary">
                  Tela {trayDimensions.screenBounds.width.toFixed(1)} ×{' '}
                  {trayDimensions.screenBounds.height.toFixed(1)} mm
                </Text>
              )}
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
              {trayDimensions ? (
                <>
                  <Text fontSize="xs" color="font.secondary">
                    Suporte {trayDimensions.outerBounds.width.toFixed(1)} ×{' '}
                    {trayDimensions.outerBounds.height.toFixed(1)} mm · Altura{' '}
                    {trayDimensions.height.toFixed(1)} mm
                  </Text>
                  <Text fontSize="xs" color="font.secondary">
                    Degrau efetivo {trayDimensions.effectiveStep.toFixed(1)} mm ·
                    Parede da cavidade {trayDimensions.cavityWall.toFixed(1)} mm
                  </Text>
                  {trayDimensions.stepClamped && (
                    <Text fontSize="xs" color="font.tertiary">
                      O degrau efetivo é ampliado pela moldura da tela.
                    </Text>
                  )}
                </>
              ) : circleSupportDims ? (
                <Text fontSize="xs" color="font.secondary">
                  Diâmetro externo {(circleSupportDims.outerRadius * 2).toFixed(1)} mm · Altura{' '}
                  {circleSupportDims.height.toFixed(1)} mm · Parede da bacia{' '}
                  {circleSupportDims.cavityWall.toFixed(1)} mm
                </Text>
              ) : (
                <Text fontSize="xs" color="font.tertiary">
                  Aguardando contorno válido.
                </Text>
              )}
              <LabeledSlider label="Parede do suporte" value={params.wallThickness} min={2} max={10} step={0.5} onChange={(value) => onUpdateParam('wallThickness', value)} />
              <LabeledSlider label="Fundo do suporte" value={params.bottomThickness} min={2} max={10} step={0.5} onChange={(value) => onUpdateParam('bottomThickness', value)} />
              <LabeledSlider label="Profundidade da bacia" value={params.bowlDepth} min={5} max={60} step={1} onChange={(value) => onUpdateParam('bowlDepth', value)} />
              <LabeledSlider label="Largura do degrau" value={params.stepWidth} min={2} max={15} step={0.5} onChange={(value) => onUpdateParam('stepWidth', value)} />
              <LabeledSlider label="Folga da tela" value={params.fitClearance} min={0.1} max={0.6} step={0.1} onChange={(value) => onUpdateParam('fitClearance', value)} />
              <LabeledSlider label="Chanfro do suporte" value={params.edgeChamfer} min={0} max={3} step={0.1} onChange={(value) => onUpdateParam('edgeChamfer', value)} />
              <Text fontSize="xs" color="font.tertiary">
                O chanfro da borda aplica-se apenas ao círculo por enquanto.
              </Text>
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
              {trayDimensions ? (
                <>
                  <Text fontSize="xs" color="font.secondary">
                    Guia {trayDimensions.guideWidth.toFixed(1)} ×{' '}
                    {trayDimensions.guideHeight.toFixed(1)} mm · Altura total{' '}
                    {trayDimensions.plugTotalHeight.toFixed(1)} mm
                  </Text>
                  <Text fontSize="xs" color="font.secondary">
                    {trayDimensions.gripEnabled
                      ? `Pega Ø${(trayDimensions.gripRadius * 2).toFixed(1)} × ${trayDimensions.gripDepth.toFixed(1)} mm`
                      : 'Pega desabilitada'}
                  </Text>
                </>
              ) : circlePlugDims ? (
                <Text fontSize="xs" color="font.secondary">
                  Diâmetro {(circlePlugDims.guideRadius * 2).toFixed(1)} mm · Altura
                  total {circlePlugDims.height.toFixed(1)} mm · Pega Ø
                  {(circlePlugDims.gripRadius * 2).toFixed(1)} ×{' '}
                  {circlePlugDims.gripDepth.toFixed(1)} mm
                </Text>
              ) : (
                <Text fontSize="xs" color="font.tertiary">
                  Aguardando contorno válido.
                </Text>
              )}
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
              {pattern && pattern.cells.length > 0 && (
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
