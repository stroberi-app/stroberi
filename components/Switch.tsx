import { Stack, styled } from '@tamagui/core';

import { createSwitch } from '@tamagui/switch';
const Frame = styled(Stack, {
  width: 60,
  height: 30,
  borderRadius: 20,
  variants: {
    checked: {
      true: {
        backgroundColor: '$green',
      },
      false: {
        backgroundColor: '$gray4',
      },
    },
  } as const,

  defaultVariants: {
    checked: false,
  },
});
const Thumb = styled(Stack, {
  width: 30,
  height: 30,
  backgroundColor: 'white',
  borderRadius: 20,
  variants: {
    checked: {
      true: {
        opacity: 0.8,
      },
      false: {
        opacity: 0.5,
      },
    },
  } as const,
});
export const Switch = createSwitch({
  Frame,
  Thumb,
});
