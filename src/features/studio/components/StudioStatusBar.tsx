import { Text, View } from '@aws-amplify/ui-react'

interface StudioStatusBarProps {
  dimensions: { width: number; height: number; thickness: number }
}

export function StudioStatusBar({ dimensions }: StudioStatusBarProps) {
  return (
    <View as="footer" className="flex h-8 items-center justify-between border-t border-neutral-200 bg-white px-4">
      <Text fontSize="small" color="font.tertiary">
        {dimensions.width} × {dimensions.height} × {dimensions.thickness} mm
      </Text>
      <Text fontSize="small" color="font.tertiary" aria-label="Dica de navegação">
        Arraste para girar • Scroll para zoom • Botão direito para pan
      </Text>
    </View>
  )
}
