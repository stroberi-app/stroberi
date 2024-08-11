import { Text } from 'tamagui';
import * as React from 'react';

type CarouselItemTextProps = {
  children: React.ReactNode;
} & React.ComponentProps<typeof Text>;
export const CarouselItemText = ({ children, ...rest }: CarouselItemTextProps) => {
  return (
    <Text
      fontSize={'$4'}
      fontWeight={'bold'}
      marginTop={'$4'}
      marginBottom={'$2'}
      ml={'$2'}
      {...rest}>
      {children}
    </Text>
  );
};
