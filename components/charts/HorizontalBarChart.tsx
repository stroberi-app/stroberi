import { useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { CartesianChart, HorizontalBar } from 'victory-native';
import inter from '../../assets/fonts/Inter-Medium.ttf';
import { CHART_NEUTRAL } from '../../lib/chartColors';
import type {
  InputFields,
  NumericalFields,
  VictoryCompatKey,
} from '../../lib/chartTypes';
import { calculateChartDomain, formatYAxisLabel } from '../../lib/chartUtils';

type HorizontalBarChartProps<
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
> = {
  data: RawData[];
  xKey: XK;
  yKey: YK;
  /** Colour per bar, aligned to `data` order. Falls back to a neutral colour. */
  colors?: string[];
  formatXLabel?: (value: InputFields<RawData>[XK]) => string;
  formatValueLabel?: (value: number) => string;
};

export const HorizontalBarChart = <
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
>({
  data,
  xKey,
  yKey,
  colors,
  formatXLabel,
  formatValueLabel,
}: HorizontalBarChartProps<RawData, XK, YK>) => {
  const font = useFont(inter, 11);

  const { yDomain, yTickValues } = React.useMemo(() => {
    return calculateChartDomain(data, [yKey as string]);
  }, [data, yKey]);

  const defaultFormatXLabel = React.useCallback((x: InputFields<RawData>[XK]) => {
    const str = x?.toString() ?? '';
    return str.length > 14 ? `${str.substring(0, 13)}…` : str;
  }, []);

  const valueLabel = React.useMemo(
    () => ({
      position: 'right' as const,
      font,
      color: 'rgba(255, 255, 255, 0.85)',
      formatLabel: (value: number | null | undefined) =>
        formatValueLabel ? formatValueLabel(value ?? 0) : formatYAxisLabel(value ?? 0),
    }),
    [font, formatValueLabel]
  );

  return (
    <CartesianChart<RawData, VictoryCompatKey, VictoryCompatKey>
      data={data}
      xKey={xKey}
      yKeys={[yKey]}
      orientation="horizontal"
      domain={{ y: yDomain }}
      domainPadding={{ top: 14, bottom: 14, left: 0, right: 44 }}
      padding={{ right: 12, left: 12, bottom: 8, top: 8 }}
      axisOptions={{
        font,
        labelColor: 'white',
        // Victory's horizontal/dynamic-orientation formatter signatures are
        // looser than our keyed props; cast to the compat key to bridge them.
        formatXLabel: (formatXLabel || defaultFormatXLabel) as (
          label: VictoryCompatKey
        ) => string,
        formatYLabel: ((y: number) => formatYAxisLabel(y)) as (
          label: VictoryCompatKey
        ) => string,
        lineColor: 'rgba(255, 255, 255, 0.08)',
        tickCount: { x: Math.min(yTickValues.length, 5), y: data.length },
      }}
    >
      {({ points, chartBounds }) => {
        const barPoints = points[yKey as keyof typeof points] ?? [];
        return (
          <>
            {barPoints.map((point, index) => (
              <HorizontalBar
                key={`${String(point.xValue)}-${index}`}
                points={[point]}
                chartBounds={chartBounds}
                barCount={barPoints.length}
                color={colors?.[index] ?? CHART_NEUTRAL}
                roundedCorners={{ topRight: 6, bottomRight: 6 }}
                animate={{ type: 'timing', duration: 300 }}
                labels={valueLabel}
              />
            ))}
          </>
        );
      }}
    </CartesianChart>
  );
};
