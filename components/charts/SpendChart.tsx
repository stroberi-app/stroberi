import { CircleSlash } from '@tamagui/lucide-icons-2';
import * as React from 'react';
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text, View } from 'tamagui';
import { useChartPressState } from 'victory-native';
import type { InputFields, NumericalFields } from '../../lib/chartTypes';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { sanitizeChartPressNumber } from '../../lib/chartPressState';
import { formatCurrency } from '../../lib/format';
import { CarouselItemChart } from '../carousel/CarouselItemChart';
import { CarouselItemText } from '../carousel/CarouselItemText';
import { CarouselItemWrapper } from '../carousel/CarouselItemWrapper';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';

const animConfig = { duration: 300 };

type SpendChartProps<
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
> = {
  chartData: RawData[];
  title: string;
  xKey: XK;
  yKeys: YK[];
  isEmpty: boolean;
  footer?: React.ReactNode;
  formatXLabel?: (value: InputFields<RawData>[XK]) => string;
} & (
  | { variant: 'bar' }
  | { variant: 'line'; strokeWidth?: number; curveType?: 'linear' | 'natural' }
);

/** A carousel card plotting spend over time, with a press-to-inspect tooltip. */
export const SpendChart = <
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
>(
  props: SpendChartProps<RawData, XK, YK>
) => {
  const { chartData, title, xKey, yKeys, isEmpty, footer, formatXLabel } = props;
  const { currency } = useDefaultCurrency();

  const { state, isActive } = useChartPressState({
    x: xKey as string,
    y: Object.fromEntries(yKeys.map((key) => [key, 0])),
  });
  const amount = useDerivedValue(() => {
    const rawValue = state?.y.total.value.value;
    const safeValue = sanitizeChartPressNumber(rawValue, 0);
    const formattedCurrency = formatCurrency(safeValue, currency);
    const xValue = state?.x.value.value;
    const xLabel = xValue === undefined || xValue === null ? '' : String(xValue);
    return `${xLabel}: ${formattedCurrency}`;
  });

  const ttX = useSharedValue(0);
  const ttY = useSharedValue(0);

  useAnimatedReaction(
    () => state?.x.position.value,
    (val) => {
      ttX.value = withTiming(sanitizeChartPressNumber(val, ttX.value), animConfig);
    }
  );
  useAnimatedReaction(
    () => state?.y.total.position.value,
    (val) => {
      ttY.value = withTiming(sanitizeChartPressNumber(val, ttY.value), animConfig);
    }
  );

  const chartProps = {
    xKey,
    yKeys,
    data: chartData,
    state,
    isActive,
    tooltip: { ttX, ttY, ttLabel: amount },
    formatXLabel,
  };

  return (
    <CarouselItemWrapper>
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$2"
        marginBottom="$2"
      >
        <Text color="white" fontSize={14} fontWeight="bold" fontFamily="Inter">
          {title}
        </Text>
      </View>
      <CarouselItemChart>
        {isEmpty ? (
          <View
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
            gap="$3"
          >
            <CarouselItemText color="darkgray">No data available</CarouselItemText>
            <CircleSlash size={64} color="darkgray" />
            <View position={'absolute'} bottom={0}>
              {footer}
            </View>
          </View>
        ) : (
          <>
            {props.variant === 'bar' ? (
              <BarChart {...chartProps} />
            ) : (
              <LineChart
                {...chartProps}
                strokeWidth={props.strokeWidth}
                curveType={props.curveType}
              />
            )}
            {footer}
          </>
        )}
      </CarouselItemChart>
    </CarouselItemWrapper>
  );
};
