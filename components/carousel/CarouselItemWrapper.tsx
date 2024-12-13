import { View } from 'tamagui';
import * as React from 'react';

type CarouselItemWrapperProps = {
  children: React.ReactNode;
};
export const CarouselItemWrapper = ({ children }: CarouselItemWrapperProps) => {
  return (
    <View
      borderRadius={'$4'}
      marginRight={'$2'}
      marginLeft={'$2'}
      backgroundColor={'$gray4'}
      paddingVertical={'$3'}
      paddingBottom={'$4'}>
      {children}
    </View>
  );
};
