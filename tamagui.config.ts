import { config } from '@tamagui/config/v3';

import { createTamagui, createTokens } from 'tamagui';

const tokens = createTokens({
  ...config.tokens,
  color: {
    ...config.tokens.color,
    stroberi: '#E54B4B',
    brandPrimary: '#E54B4B',
    brandSecondary: '#FFA987',
    bgPrimary: 'black',
    seashell: '#F7EBE8',
    green: 'hsl(151, 50.0%, 53.2%)',
    greenLight: 'hsl(151, 50.0%, 70.2%)',
    stroberiLight: 'rgb(215,99,80)',
  },
});
export const tamaguiConfig = createTamagui({
  ...config,
  tokens,
  themes: {
    ...config.themes,
    dark: {
      ...config.themes.dark,
      stroberi: tokens.color.stroberi,
      bgPrimary: tokens.color.bgPrimary,
      brandPrimary: tokens.color.brandPrimary,
      brandSecondary: tokens.color.brandSecondary,
      seashell: tokens.color.seashell,
      green: tokens.color.green,
      greenLight: tokens.color.greenLight,
      stroberiLight: tokens.color.stroberiLight,
    },
  },
});
export default tamaguiConfig;
export type Conf = typeof tamaguiConfig;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
