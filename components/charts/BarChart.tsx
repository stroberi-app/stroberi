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
  formatXLabel?: (value: InputFields<RawData>[XK]) => string;
};

export const BarChart = <
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
>({
  data,
  yKeys,
  xKey,
  domainPadding,
  barWidth,
  state,
  isActive,
  tooltip,
  barCount,
  formatXLabel,
}: CartesianChartProps<RawData, XK, YK>) => {
  const font = useFont(inter, 11);

  const dataLength = data.length;
  const calculatedBarWidth = React.useMemo(() => {
    if (barWidth) return barWidth;

    if (dataLength <= 3) return 60;
    if (dataLength <= 5) return 45;
    if (dataLength <= 7) return 35;
    return 28;
  }, [barWidth, dataLength]);

  const calculatedDomainPadding = React.useMemo(() => {
    if (domainPadding) return domainPadding;

    const horizontalPadding = Math.max(25, calculatedBarWidth * 0.8);
    return {
      left: horizontalPadding,
      right: horizontalPadding,
      top: 30,
      bottom: 0,
    };
  }, [domainPadding, calculatedBarWidth]);

  const { yDomain, yTickValues } = React.useMemo(() => {
    if (data.length === 0)
      return { yDomain: [0, 100] as [number, number], yTickValues: [0, 25, 50, 75, 100] };

    const yValues = data.flatMap(item =>
      yKeys
        .map(key => {
          const value = item[key];
          return typeof value === 'number' ? value : parseFloat(String(value) || '0');
        })
        .filter(val => !isNaN(val))
    );

    if (yValues.length === 0)
      return { yDomain: [0, 100] as [number, number], yTickValues: [0, 25, 50, 75, 100] };

    const maxValue = Math.max(...yValues);
    const minValue = 0;

    const range = maxValue - minValue;
    let tickInterval: number;

    if (range === 0) {
      return {
        yDomain: [0, Math.max(maxValue + 1, 10)] as [number, number],
        yTickValues: [0, Math.max(maxValue + 1, 10)],
      };
    }

    if (range < 10) {
      tickInterval = 1;
    } else if (range < 50) {
      tickInterval = 5;
    } else if (range < 100) {
      tickInterval = 10;
    } else if (range < 500) {
      tickInterval = 50;
    } else if (range < 1000) {
      tickInterval = 100;
    } else if (range < 5000) {
      tickInterval = 500;
    } else if (range < 10000) {
      tickInterval = 1000;
    } else if (range < 50000) {
      tickInterval = 5000;
    } else if (range < 100000) {
      tickInterval = 10000;
    } else if (range < 500000) {
      tickInterval = 50000;
    } else {
      tickInterval = 100000;
    }

    const ticks: number[] = [0];
    let currentTick = tickInterval;
    const maxTick = Math.ceil(maxValue / tickInterval) * tickInterval;

    while (currentTick <= maxTick && ticks.length < 8) {
      ticks.push(currentTick);
      currentTick += tickInterval;
    }

    const domainMax = Math.max(maxTick, maxValue);

    return {
      yDomain: [0, domainMax] as [number, number],
      yTickValues: ticks,
    };
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
        formatYLabel: (y: NumericalFields<RawData>[YK]) => {
          const numY = typeof y === 'number' ? y : parseFloat(y?.toString() || '0');
          if (isNaN(numY)) return '0';
          if (numY >= 1000000) return `${(numY / 1000000).toFixed(1)}M`;
          if (numY >= 1000) return `${(numY / 1000).toFixed(1)}K`;
          return numY.toString();
        },
        lineColor: 'rgba(255, 255, 255, 0.1)',
        tickCount: Math.min(yTickValues.length, 8),
      }}>
      {({ points, chartBounds }) => (
        <>
          <Bar
            chartBounds={chartBounds}
            points={points[yKeys[0]]}
            barWidth={calculatedBarWidth}
            barCount={barCount}
            roundedCorners={{
              topLeft: 6,
              topRight: 6,
            }}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, 400)}
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)']}
            />
          </Bar>
          {isActive && tooltip && <ToolTip x={tooltip.ttX} y={tooltip.ttY} />}
        </>
      )}
    </CartesianChart>
  );
};

function ToolTip({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }) {
  return <Circle cx={x} cy={y} r={6} color={'rgba(255, 255, 255, 0.8)'} opacity={0.9} />;
}
