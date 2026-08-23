import { Text, View } from '@aws-amplify/ui-react'
import type { ModelParameters } from '../config/parameters'

interface StudioStatusBarProps { parameters: ModelParameters }

export function StudioStatusBar({ parameters }: StudioStatusBarProps) {
  return (
    <View as="footer" className="flex h-8 items-center justify-between border-t border-neutral-800 bg-neutral-900 px-4">
      <Text fontSize="small" color="font.tertiary">
        {parameters.width} × {parameters.height} × {parameters.depth} mm
      </Text>
      <Text fontSize="small" color="font.tertiary" aria-label="Dica de navegação">
        Arraste para girar • Scroll para zoom • Botão direito para pan
      </Text>
    </View>
  )
}
