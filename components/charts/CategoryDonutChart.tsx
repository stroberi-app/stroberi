import type * as React from 'react';
import { View } from 'tamagui';
import { Pie, PolarChart } from 'victory-native';

export type DonutDatum = {
  label: string;
  value: number;
  color: string;
};

type CategoryDonutChartProps = {
  data: DonutDatum[];
  size?: number;
  innerRadius?: number | string;
  /** Optional content rendered in the centre of the ring (e.g. a total). */
  children?: React.ReactNode;
};

/**
 * Donut breakdown of category spend. Each datum carries its own `color`
 * (see lib/chartColors). Optional `children` are centred inside the ring.
 */
export const CategoryDonutChart = ({
  data,
  size = 150,
  innerRadius = '64%',
  children,
}: CategoryDonutChartProps) => {
  return (
    <View width={size} height={size} alignItems="center" justifyContent="center">
      <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color">
        <Pie.Chart innerRadius={innerRadius}>
          {() => <Pie.Slice animate={{ type: 'timing', duration: 300 }} />}
        </Pie.Chart>
      </PolarChart>
      {children != null && (
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          {children}
        </View>
      )}
    </View>
  );
};
