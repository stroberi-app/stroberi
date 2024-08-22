import { Button as TamaguiButton } from 'tamagui';
import { styled } from '@tamagui/core';

const Button = styled(TamaguiButton, {
  variants: {
    brand: {
      primary: {
        backgroundColor: '$primary',
        color: '$white',
      },
      secondary: {
        backgroundColor: '$secondary',
        color: '$white',
      },
    },
  },
});
export { Button };
