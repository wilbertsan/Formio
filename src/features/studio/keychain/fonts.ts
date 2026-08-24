import helvetikerRegular from '@/assets/fonts/helvetiker_regular.typeface.json?url'
import helvetikerBold from '@/assets/fonts/helvetiker_bold.typeface.json?url'
import optimerRegular from '@/assets/fonts/optimer_regular.typeface.json?url'
import type { FontStyle } from './schema'

export const fontUrls: Record<FontStyle, string> = {
  normal: helvetikerRegular,
  bold: helvetikerBold,
  serif: optimerRegular,
}
