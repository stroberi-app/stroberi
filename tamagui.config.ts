import { config } from '@tamagui/config/v3';

import { createTamagui } from 'tamagui';

const customColors = {
  stroberi: '#E54B4B',
  brandPrimary: '#E54B4B',
  brandSecondary: '#FFA987',
  bgPrimary: 'black',
  seashell: '#F7EBE8',
  green: 'hsl(151, 50.0%, 53.2%)',
  greenLight: 'hsl(151, 50.0%, 70.2%)',
  stroberiLight: 'rgb(215,99,80)',
  yellow: '#F5C211',
} as const;

export const tamaguiConfig = createTamagui({
  ...config,
  tokens: {
    ...config.tokens,
    color: {
      ...config.tokens.color,
      ...customColors,
    },
  },
  themes: {
    ...config.themes,
    dark: {
      ...config.themes.dark,
      ...customColors,
    },
  },
});
export default tamaguiConfig;
export type Conf = typeof tamaguiConfig;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
