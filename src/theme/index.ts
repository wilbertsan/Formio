import type { Theme } from '@aws-amplify/ui-react'

export const theme: Theme = {
  name: '3dformio',
  tokens: {
    colors: {
      brand: {
        50: '#d6edd0',
        100: '#c8ecbf',
        200: '#aee79f',
        300: '#89e172',
        400: '#50dd2d',
        500: '#33ac15',
        600: '#1f6e0b',
        700: '#185908',
        800: '#134905',
        900: '#0e3804',
      },
      primary: {
        10: '{colors.brand.50}',
        20: '{colors.brand.100}',
        40: '{colors.brand.300}',
        60: '{colors.brand.500}',
        80: '{colors.brand.700}',
        90: '{colors.brand.800}',
        100: '{colors.brand.900}',
      },
    },
  },
}
