import type React from 'react';
import { Button as TamaguiButton, styled } from 'tamagui';

type AppButtonProps = React.ComponentProps<typeof TamaguiButton> & {
  color?: string;
  fontSize?: React.ComponentProps<typeof TamaguiButton>['size'];
  fontWeight?: string;
  brand?: 'primary' | 'secondary';
};

const StyledButton = styled(TamaguiButton, {
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
} as Record<string, unknown>);

const Button = StyledButton as React.ComponentType<AppButtonProps>;

export { Button };
