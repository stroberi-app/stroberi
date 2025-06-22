import type * as React from 'react';
import { Text } from 'tamagui';

type CarouselItemTextProps = {
  children: React.ReactNode;
} & React.ComponentProps<typeof Text>;
export const CarouselItemText = ({ children, ...rest }: CarouselItemTextProps) => {
  return (
    <Text fontSize="$4" fontWeight="bold" {...rest}>
      {children}
    </Text>
  );
};
