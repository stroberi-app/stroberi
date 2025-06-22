import type * as React from 'react';
import { View } from 'tamagui';

type CarouselItemChartProps = {
  children: React.ReactNode;
};
export const CarouselItemChart = ({ children }: CarouselItemChartProps) => {
  return (
    <View backgroundColor="transparent" flex={1}>
      {children}
    </View>
  );
};
