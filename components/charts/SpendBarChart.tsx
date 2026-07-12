import { CircleSlash } from '@tamagui/lucide-icons';
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
import { formatCurrencyWorklet } from '../../lib/format';
import { CarouselItemChart } from '../carousel/CarouselItemChart';
import { CarouselItemText } from '../carousel/CarouselItemText';
import { CarouselItemWrapper } from '../carousel/CarouselItemWrapper';
import { BarChart } from './BarChart';

const animConfig = { duration: 300 };

type SpendBarChartProps<
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
> = {
  chartData: RawData[];
  title: string;
  xKey: XK;
  yKeys: YK[];
  isEmpty: boolean;
  barCount?: number;
  barWidth?: number;
  footer?: React.ReactNode;
  formatXLabel?: (value: InputFields<RawData>[XK]) => string;
};

export const SpendBarChart = <
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
>({
  chartData,
  title,
  xKey,
  yKeys,
  isEmpty,
  barCount,
  barWidth,
  footer,
  formatXLabel,
}: SpendBarChartProps<RawData, XK, YK>) => {
  const { defaultCurrency } = useDefaultCurrency();

  const { state, isActive } = useChartPressState({
    x: xKey as string,
    y: Object.fromEntries(yKeys.map((key) => [key, 0])),
  });
  const amount = useDerivedValue(() => {
    const rawValue = state?.y.total.value.value;
    const safeValue = sanitizeChartPressNumber(rawValue, 0);
    const formattedCurrency = formatCurrencyWorklet(safeValue, defaultCurrency ?? 'USD');
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
            <BarChart
              xKey={xKey}
              yKeys={yKeys}
              data={chartData}
              state={state}
              isActive={isActive}
              tooltip={{
                ttX,
                ttY,
                ttLabel: amount,
              }}
              barCount={barCount}
              barWidth={barWidth}
              formatXLabel={formatXLabel}
            />
            {footer}
          </>
        )}
      </CarouselItemChart>
    </CarouselItemWrapper>
  );
};
