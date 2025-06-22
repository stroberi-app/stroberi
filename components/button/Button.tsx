import { styled } from '@tamagui/core';
import { Button as TamaguiButton } from 'tamagui';

const Button = styled(TamaguiButton, {
  fontSize: '$5',
  fontWeight: 'bold',
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
