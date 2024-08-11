import { View } from 'tamagui';
import * as React from 'react';

type CarouselItemChartProps = {
  children: React.ReactNode;
};
export const CarouselItemChart = ({ children }: CarouselItemChartProps) => {
  return (
    <View backgroundColor={'transparent'} height={200}>
      {children}
    </View>
  );
};
