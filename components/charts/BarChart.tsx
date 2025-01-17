import { Bar, CartesianChart, ChartPressState } from 'victory-native';
import { LinearGradient, useFont, vec, Circle } from '@shopify/react-native-skia';
import inter from '../../assets/fonts/Inter-Medium.ttf';
import React from 'react';
import type { InputFields, NumericalFields } from 'victory-native/dist/types';
import type { SharedValue } from 'react-native-reanimated';

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
  state?:
    | ChartPressState<{ x: InputFields<RawData>[XK]; y: Record<YK, number> }>
    | ChartPressState<{ x: InputFields<RawData>[XK]; y: Record<YK, number> }>[];
  isActive?: boolean;
  tooltip?: {
    ttX: SharedValue<number>;
    ttY: SharedValue<number>;
  };
  barCount?: number;
};

export const BarChart = <
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
>({
  data,
  yKeys,
  xKey,
  domainPadding = { left: 32, right: 32, top: 0, bottom: 0 },
  barWidth,
  state,
  isActive,
  tooltip,
  barCount,
}: CartesianChartProps<RawData, XK, YK>) => {
  const font = useFont(inter, 12);

  return (
    <CartesianChart<RawData, XK, YK>
      data={data}
      xKey={xKey}
      yKeys={yKeys}
      domainPadding={domainPadding}
      chartPressState={state}
      padding={{
        right: 8,
        left: 8,
        bottom: 8,
      }}
      chartPressConfig={{
        pan: {
          activateAfterLongPress: 200,
        },
      }}
      axisOptions={{
        font,
        labelColor: 'white',
        formatXLabel: x => (x ? x.toString() : ''),
      }}>
      {({ points, chartBounds }) => (
        <>
          <Bar
            chartBounds={chartBounds}
            points={points[yKeys[0]]}
            barWidth={barWidth}
            barCount={barCount}
            roundedCorners={{
              topLeft: 5,
              topRight: 5,
            }}>
            <LinearGradient start={vec(0, 0)} end={vec(0, 400)} colors={['white', 'black']} />
          </Bar>
          {isActive && tooltip && <ToolTip x={tooltip.ttX} y={tooltip.ttY} />}
        </>
      )}
    </CartesianChart>
  );
};

function ToolTip({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }) {
  return <Circle cx={x} cy={y} r={8} color={'grey'} opacity={0.8} />;
}
