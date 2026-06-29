import { useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { View } from 'tamagui';
import { BarGroup, CartesianChart } from 'victory-native';
import inter from '../../assets/fonts/Inter-Medium.ttf';
import type { VictoryCompatKey } from '../../lib/chartTypes';
import { calculateChartDomain, formatYAxisLabel } from '../../lib/chartUtils';

const CURRENT_COLOR = 'rgba(255, 255, 255, 0.92)';
const PREVIOUS_COLOR = 'rgba(255, 255, 255, 0.32)';

type ComparisonRow = {
  label: string;
  current: number;
  previous: number;
};

type PeriodComparisonChartProps = {
  /** Current period totals. */
  current: { income: number; expenses: number };
  /** Previous period totals. */
  previous: { income: number; expenses: number };
  height?: number;
};

/**
 * Grouped bars comparing income & expenses for the current vs previous period.
 * "Current" bars are bright, "previous" bars are dimmed.
 */
export const PeriodComparisonChart = ({
  current,
  previous,
  height = 150,
}: PeriodComparisonChartProps) => {
  const font = useFont(inter, 11);

  const data: ComparisonRow[] = React.useMemo(
    () => [
      { label: 'Income', current: current.income, previous: previous.income },
      { label: 'Expenses', current: current.expenses, previous: previous.expenses },
    ],
    [current.income, current.expenses, previous.income, previous.expenses]
  );

  const { yDomain } = React.useMemo(
    () => calculateChartDomain(data, ['current', 'previous']),
    [data]
  );

  return (
    <View height={height}>
      <CartesianChart<ComparisonRow, VictoryCompatKey, VictoryCompatKey>
        data={data}
        xKey="label"
        yKeys={['current', 'previous']}
        domain={{ y: yDomain }}
        domainPadding={{ left: 50, right: 50, top: 20, bottom: 0 }}
        padding={{ right: 8, left: 8, bottom: 8, top: 8 }}
        axisOptions={{
          font,
          labelColor: 'white',
          formatYLabel: ((y: number) => formatYAxisLabel(y)) as (
            label: VictoryCompatKey
          ) => string,
          lineColor: 'rgba(255, 255, 255, 0.08)',
          tickCount: 4,
        }}
      >
        {({ points, chartBounds }) => (
          <BarGroup
            chartBounds={chartBounds}
            betweenGroupPadding={0.4}
            withinGroupPadding={0.2}
            roundedCorners={{ topLeft: 4, topRight: 4 }}
          >
            <BarGroup.Bar
              points={points.current}
              color={CURRENT_COLOR}
              animate={{ type: 'timing', duration: 300 }}
            />
            <BarGroup.Bar
              points={points.previous}
              color={PREVIOUS_COLOR}
              animate={{ type: 'timing', duration: 300 }}
            />
          </BarGroup>
        )}
      </CartesianChart>
    </View>
  );
};
