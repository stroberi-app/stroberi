import type * as React from 'react';
import { View } from 'tamagui';

type CarouselItemWrapperProps = {
  children: React.ReactNode;
};
export const CAROUSEL_ITEM_WRAPPER_HEIGHT = 255;
export const CarouselItemWrapper = ({ children }: CarouselItemWrapperProps) => {
  return (
    <View
      height={CAROUSEL_ITEM_WRAPPER_HEIGHT}
      borderRadius={'$4'}
      marginRight={'$2'}
      marginLeft={'$2'}
      backgroundColor={'$gray4'}
      paddingBottom={'$4'}
      paddingVertical={'$3'}
    >
      {children}
    </View>
  );
};
