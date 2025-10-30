import { Stack, styled } from '@tamagui/core';

import { createSwitch } from '@tamagui/switch';

const Frame = styled(Stack, {
  variants: {
    checked: {
      true: {
        backgroundColor: '$green',
      },
      false: {
        backgroundColor: '$gray4',
      },
    },
    switchSize: {
      small: {
        width: 48,
        height: 24,
        borderRadius: 16,
      },
      medium: {
        width: 60,
        height: 30,
        borderRadius: 20,
      },
      large: {
        width: 72,
        height: 36,
        borderRadius: 24,
      },
    },
  } as const,

  defaultVariants: {
    checked: false,
    switchSize: 'small',
  },
});

const Thumb = styled(Stack, {
  backgroundColor: 'white',
  variants: {
    checked: {
      true: {
        opacity: 0.8,
      },
      false: {
        opacity: 0.5,
      },
    },
    switchSize: {
      small: {
        width: 24,
        height: 24,
        borderRadius: 16,
      },
      medium: {
        width: 30,
        height: 30,
        borderRadius: 20,
      },
      large: {
        width: 36,
        height: 36,
        borderRadius: 24,
      },
    },
  } as const,
  defaultVariants: {
    checked: false,
    switchSize: 'small',
  },
});
export const Switch = createSwitch({
  Frame,
  Thumb,
});
