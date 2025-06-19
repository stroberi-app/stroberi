import { Line, CartesianChart, ChartPressState } from 'victory-native';
import { useFont, Circle } from '@shopify/react-native-skia';
import inter from '../../assets/fonts/Inter-Medium.ttf';
import React from 'react';
import type { InputFields, NumericalFields } from 'victory-native/dist/types';
import type { SharedValue } from 'react-native-reanimated';
import { calculateChartDomain, formatYAxisLabel } from '../../lib/chartUtils';

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
  state?:
    | ChartPressState<{ x: InputFields<RawData>[XK]; y: Record<YK, number> }>
    | ChartPressState<{ x: InputFields<RawData>[XK]; y: Record<YK, number> }>[];
  isActive?: boolean;
  tooltip?: {
    ttX: SharedValue<number>;
    ttY: SharedValue<number>;
  };
  formatXLabel?: (value: InputFields<RawData>[XK]) => string;
  strokeWidth?: number;
  curveType?: 'linear' | 'natural';
};

export const LineChart = <
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
>({
  data,
  yKeys,
  xKey,
  domainPadding,
  state,
  isActive,
  tooltip,
  formatXLabel,
  strokeWidth = 3,
  curveType = 'natural',
}: CartesianChartProps<RawData, XK, YK>) => {
  const font = useFont(inter, 11);

  const calculatedDomainPadding = React.useMemo(() => {
    if (domainPadding) return domainPadding;

    return {
      left: 25,
      right: 25,
      top: 30,
      bottom: 10,
    };
  }, [domainPadding]);

  const { yDomain, yTickValues } = React.useMemo(() => {
    return calculateChartDomain(data, yKeys as string[]);
  }, [data, yKeys]);

  const defaultFormatXLabel = React.useCallback((x: InputFields<RawData>[XK]) => {
    if (!x) return '';
    const str = x.toString();
    if (str.length <= 4) return str;
    return str.length > 8 ? str.substring(0, 8) + '...' : str;
  }, []);

  return (
    <CartesianChart<RawData, XK, YK>
      data={data}
      xKey={xKey}
      yKeys={yKeys}
      domainPadding={calculatedDomainPadding}
      domain={{ y: yDomain }}
      chartPressState={state}
      padding={{
        right: 12,
        left: 12,
        bottom: 12,
        top: 8,
      }}
      chartPressConfig={{
        pan: {
          activateAfterLongPress: 200,
        },
      }}
      axisOptions={{
        font,
        labelColor: 'white',
        formatXLabel: formatXLabel || defaultFormatXLabel,
        formatYLabel: (y: NumericalFields<RawData>[YK]) => formatYAxisLabel(y as number),
        lineColor: 'rgba(255, 255, 255, 0.1)',
        tickCount: Math.min(yTickValues.length, 8),
      }}>
      {({ points }) => (
        <>
          <Line
            points={points[yKeys[0]]}
            color="rgba(255, 255, 255, 0.9)"
            strokeWidth={strokeWidth}
            curveType={curveType}
            animate={{ type: 'timing', duration: 300 }}
          />
          {isActive && tooltip && <ToolTip x={tooltip.ttX} y={tooltip.ttY} />}
        </>
      )}
    </CartesianChart>
  );
};

function ToolTip({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }) {
  return <Circle cx={x} cy={y} r={6} color="rgba(255, 255, 255, 0.9)" style="fill" />;
}
