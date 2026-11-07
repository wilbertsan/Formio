import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CakeTopperParams, TextItem } from './schema'
import { svgBounds } from '../shared/svgToIconShape'

interface TextPositionEditorProps {
  params: CakeTopperParams
  selectedTextId: string
  onSelectText: (id: string) => void
  onMoveText: (id: string, x: number, y: number) => void
  onMoveIcon: (x: number, y: number) => void
  onClose: () => void
}

const TEXT_MARGIN = 3
const SCALE = 2
const ICON_MARGIN = 1
const ICON_ID = '__icon__'

interface HalfSize {
  halfWidth: number
  halfHeight: number
}

function plateHalfExtents(params: CakeTopperParams): HalfSize {
  if (params.shape === 'circle') {
    const radius = Math.min(params.width, params.height) / 2
    return { halfWidth: radius, halfHeight: radius }
  }
  return { halfWidth: params.width / 2, halfHeight: params.height / 2 }
}

// Encolhe o retângulo do texto até a área útil da placa, espelhando o builder.
function effectiveHalfSize(item: TextItem, plate: HalfSize): HalfSize {
  const usableHalfWidth = Math.max(0, plate.halfWidth - TEXT_MARGIN)
  const usableHalfHeight = Math.max(0, plate.halfHeight - TEXT_MARGIN)
  return {
    halfWidth: Math.min(item.width / 2, usableHalfWidth),
    halfHeight: Math.min(item.height / 2, usableHalfHeight),
  }
}

// Mesma escala do builder: o ícone encaixa pelo vértice mais distante.
function iconHalfSize(
  svgIcon: string | null,
  width: number,
  height: number,
  iconScale: number,
): HalfSize | null {
  if (!svgIcon) return null
  const bounds = svgBounds(svgIcon)
  const maxRadius = (Math.min(width, height) / 3) * iconScale
  if (!bounds || maxRadius <= 0) return null
  const scale = (maxRadius - 0.5) / bounds.farthest
  if (!(scale > 0)) return null
  return {
    halfWidth: (bounds.width / 2) * scale + 0.5,
    halfHeight: (bounds.height / 2) * scale + 0.5,
  }
}

function clampOffset(
  value: number,
  plateHalf: number,
  itemHalf: number,
  margin: number = TEXT_MARGIN,
): number {
  const maxOffset = Math.max(0, plateHalf - itemHalf - margin)
  return Math.max(-maxOffset, Math.min(maxOffset, value))
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
}

export function TextPositionEditor({
  params,
  selectedTextId,
  onSelectText,
  onMoveText,
  onMoveIcon,
  onClose,
}: TextPositionEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const canvasWidth = params.width * SCALE
  const canvasHeight = params.height * SCALE
  const plate = plateHalfExtents(params)

  const [iconSelected, setIconSelected] = useState(false)
  const iconHalf = useMemo(
    () => iconHalfSize(params.svgIcon, params.width, params.height, params.iconScale),
    [params.svgIcon, params.width, params.height, params.iconScale],
  )

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2

    ctx.beginPath()
    switch (params.shape) {
      case 'circle':
        ctx.arc(centerX, centerY, plate.halfWidth * SCALE, 0, Math.PI * 2)
        break
      case 'oval':
        ctx.ellipse(centerX, centerY, plate.halfWidth * SCALE, plate.halfHeight * SCALE, 0, 0, Math.PI * 2)
        break
      case 'rounded-rect': {
        const radius = Math.min(params.cornerRadius, plate.halfWidth, plate.halfHeight) * SCALE
        roundRect(ctx, centerX - plate.halfWidth * SCALE, centerY - plate.halfHeight * SCALE, canvasWidth, canvasHeight, radius)
        break
      }
      case 'custom':
        ctx.rect(centerX - plate.halfWidth * SCALE, centerY - plate.halfHeight * SCALE, canvasWidth, canvasHeight)
        break
    }
    ctx.fillStyle = '#e4e4e7'
    ctx.fill()
    ctx.strokeStyle = '#a1a1aa'
    ctx.lineWidth = 1
    ctx.stroke()

    for (const text of params.texts) {
      const isSelected = !iconSelected && text.id === selectedTextId
      const half = effectiveHalfSize(text, plate)
      const textWidth = half.halfWidth * 2 * SCALE
      const textHeight = half.halfHeight * 2 * SCALE
      const x = centerX + text.offsetX * SCALE - textWidth / 2
      const y = centerY + text.offsetY * SCALE - textHeight / 2

      ctx.fillStyle = isSelected ? '#14b8a6' : '#a1a1aa'
      ctx.fillRect(x, y, textWidth, textHeight)

      ctx.strokeStyle = isSelected ? '#0d9488' : '#71717a'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.strokeRect(x, y, textWidth, textHeight)

      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text.content, x + textWidth / 2, y + textHeight / 2)
    }

    if (iconHalf) {
      const iconWidth = iconHalf.halfWidth * 2 * SCALE
      const iconHeight = iconHalf.halfHeight * 2 * SCALE
      const x = centerX + params.iconOffsetX * SCALE - iconWidth / 2
      const y = centerY + params.iconOffsetY * SCALE - iconHeight / 2

      ctx.fillStyle = iconSelected ? '#f59e0b' : '#d4d4d8'
      ctx.fillRect(x, y, iconWidth, iconHeight)

      ctx.strokeStyle = iconSelected ? '#d97706' : '#71717a'
      ctx.lineWidth = iconSelected ? 2 : 1
      ctx.strokeRect(x, y, iconWidth, iconHeight)

      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Ícone', x + iconWidth / 2, y + iconHeight / 2)
    }
  }, [params, selectedTextId, canvasWidth, canvasHeight, plate, iconHalf, iconSelected])

  useEffect(() => {
    draw()
  }, [draw])

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (iconHalf) {
      const iconWidth = iconHalf.halfWidth * 2 * SCALE
      const iconHeight = iconHalf.halfHeight * 2 * SCALE
      const iconX = canvasWidth / 2 + params.iconOffsetX * SCALE - iconWidth / 2
      const iconY = canvasHeight / 2 + params.iconOffsetY * SCALE - iconHeight / 2

      if (x >= iconX && x <= iconX + iconWidth && y >= iconY && y <= iconY + iconHeight) {
        setIconSelected(true)
        setDragging(ICON_ID)
        setDragStart({ x: event.clientX, y: event.clientY })
        return
      }
    }

    for (const text of params.texts) {
      const half = effectiveHalfSize(text, plate)
      const textWidth = half.halfWidth * 2 * SCALE
      const textHeight = half.halfHeight * 2 * SCALE
      const textX = canvasWidth / 2 + text.offsetX * SCALE - textWidth / 2
      const textY = canvasHeight / 2 + text.offsetY * SCALE - textHeight / 2

      if (x >= textX && x <= textX + textWidth && y >= textY && y <= textY + textHeight) {
        setIconSelected(false)
        onSelectText(text.id)
        setDragging(text.id)
        setDragStart({ x: event.clientX, y: event.clientY })
        return
      }
    }
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return

    if (dragging === ICON_ID) {
      if (!iconHalf) return
      const dx = (event.clientX - dragStart.x) / SCALE
      const dy = (event.clientY - dragStart.y) / SCALE
      const newX = clampOffset(
        params.iconOffsetX + dx,
        plate.halfWidth,
        iconHalf.halfWidth,
        ICON_MARGIN,
      )
      const newY = clampOffset(
        params.iconOffsetY + dy,
        plate.halfHeight,
        iconHalf.halfHeight,
        ICON_MARGIN,
      )
      onMoveIcon(newX, newY)
      setDragStart({ x: event.clientX, y: event.clientY })
      return
    }

    const text = params.texts.find((item) => item.id === dragging)
    if (!text) return

    const dx = (event.clientX - dragStart.x) / SCALE
    const dy = (event.clientY - dragStart.y) / SCALE
    const half = effectiveHalfSize(text, plate)
    const newX = clampOffset(text.offsetX + dx, plate.halfWidth, half.halfWidth)
    const newY = clampOffset(text.offsetY + dy, plate.halfHeight, half.halfHeight)

    onMoveText(dragging, newX, newY)
    setDragStart({ x: event.clientX, y: event.clientY })
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  return (
    <div
      data-testid="text-editor"
      role="dialog"
      aria-modal="true"
      aria-label="Posicionamento de conteúdo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Posicionar Conteúdo</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded p-1 hover:bg-neutral-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          aria-label="Área de posicionamento de conteúdo"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-move border border-neutral-200"
        />
        <p className="mt-2 text-sm text-neutral-500">Arraste os textos e o ícone para reposicionar</p>
      </div>
    </div>
  )
}
