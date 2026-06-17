import { View, styled } from 'tamagui';

import { createSwitch } from '@tamagui/switch';

const Frame = styled(View, {
  backgroundColor: '$gray4',
  borderRadius: 999,
  justifyContent: 'center',

  variants: {
    checked: {
      true: {
        backgroundColor: '$green',
      },
      false: {
        backgroundColor: '$gray4',
      },
    },
    size: {
      '...size': (token, { tokens }) => {
        const raw = (tokens.size as Record<string, { val?: number } | number>)[String(token)];
        const baseSize = typeof raw === 'number' ? raw : raw?.val;
        const height = Math.round((baseSize ?? 24) * 0.65);
        return {
          height,
          minHeight: height,
          width: height * 2,
        };
      },
    },
  } as const,

  defaultVariants: {
    size: '$true',
  },
});

const Thumb = styled(View, {
  backgroundColor: '$gray2',
  borderRadius: 999,
  variants: {
    checked: {
      true: {
        backgroundColor: 'white',
        opacity: 1,
      },
      false: {
        backgroundColor: '$gray2',
        opacity: 1,
      },
    },
    size: {
      '...size': (token, { tokens }) => {
        const raw = (tokens.size as Record<string, { val?: number } | number>)[String(token)];
        const baseSize = typeof raw === 'number' ? raw : raw?.val;
        const dim = Math.round((baseSize ?? 24) * 0.65);
        return {
          width: dim,
          height: dim,
        };
      },
    },
  } as const,

  defaultVariants: {
    size: '$true',
  },
});
export const Switch = createSwitch({
  Frame,
  Thumb,
});
