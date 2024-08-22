import { Bar, CartesianChart } from 'victory-native';
import { LinearGradient, useFont, vec } from '@shopify/react-native-skia';
import inter from '../../assets/fonts/Inter-Medium.ttf';
import { useTheme } from 'tamagui';
import React from 'react';
import type { InputFields, NumericalFields } from 'victory-native/dist/types';

type CartesianChartProps<
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
> = {
  data: RawData[];
  xKey: XK;
  yKeys: YK[];
  domainPadding?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  barWidth?: number;
};

export const BarChart = <
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
>({
  data,
  yKeys,
  xKey,
  domainPadding = { left: 50, right: 50, top: 16, bottom: 0 },
  barWidth,
}: CartesianChartProps<RawData, XK, YK>) => {
  const { red1 } = useTheme();
  const font = useFont(inter, 12);
  return (
    <CartesianChart
      data={data}
      xKey={xKey}
      yKeys={yKeys}
      domainPadding={domainPadding}
      axisOptions={{
        font,
        labelColor: 'white',
        formatXLabel: x => (x ? x.toString() : ''),
      }}>
      {({ points, chartBounds }) => (
        <Bar
          chartBounds={chartBounds}
          points={points[yKeys[0]]}
          barWidth={barWidth}
          // barCount={2}
          roundedCorners={{
            topLeft: 5,
            topRight: 5,
          }}>
          <LinearGradient start={vec(0, 0)} end={vec(0, 400)} colors={['white', red1?.get()]} />
        </Bar>
      )}
    </CartesianChart>
  );
};
