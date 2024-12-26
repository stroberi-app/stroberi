import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { useChartPressState } from 'victory-native';
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { formatCurrencyWorklet } from '../../lib/format';
import { Canvas, matchFont, Text } from '@shopify/react-native-skia';
import { CarouselItemWrapper } from '../carousel/CarouselItemWrapper';
import { View } from 'tamagui';
import { CarouselItemText } from '../carousel/CarouselItemText';
import { CarouselItemChart } from '../carousel/CarouselItemChart';
import { CircleSlash } from '@tamagui/lucide-icons';
import { BarChart } from './BarChart';
import * as React from 'react';
import type { InputFields, NumericalFields } from 'victory-native/dist/types';

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
}: SpendBarChartProps<RawData, XK, YK>) => {
  const { defaultCurrency } = useDefaultCurrency();
  const { state, isActive } = useChartPressState({
    x: xKey as string,
    y: yKeys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<string, number>),
  });
  const amount = useDerivedValue(() => {
    const formattedCurrency = formatCurrencyWorklet(
      state?.y.total.value.value,
      defaultCurrency ?? 'USD'
    );
    return `${state.x.value.value}: ${formattedCurrency}`;
  }, [state?.y.total.value.value]);

  const fontStyle = {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: 'bold' as const,
  };
  const font = matchFont(fontStyle);

  const ttX = useSharedValue(0);
  const ttY = useSharedValue(0);

  useAnimatedReaction(
    () => state?.x.position.value,
    val => {
      ttX.value = withTiming(val, animConfig);
    }
  );
  useAnimatedReaction(
    () => state?.y.total.position.value,
    val => {
      ttY.value = withTiming(val, animConfig);
    }
  );

  return (
    <CarouselItemWrapper>
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$2"
        marginBottom="$2">
        {isActive ? (
          <Canvas
            style={{
              height: 17,
              flex: 1,
            }}>
            <Text x={0} y={12} font={font} text={amount} color="white" style="fill" />
          </Canvas>
        ) : (
          <CarouselItemText>{title}</CarouselItemText>
        )}
      </View>
      <CarouselItemChart>
        {isEmpty ? (
          <View width="100%" height="100%" alignItems="center" justifyContent="center" gap="$3">
            <CarouselItemText color="darkgray">No data available</CarouselItemText>
            <CircleSlash size={64} color="darkgray" />
          </View>
        ) : (
          <>
            <BarChart
              xKey={xKey}
              yKeys={yKeys}
              data={chartData}
              // @ts-expect-error ignore for now
              state={state}
              isActive={isActive}
              tooltip={{
                ttX,
                ttY,
              }}
              barCount={barCount}
              barWidth={barWidth}
            />
            {footer}
          </>
        )}
      </CarouselItemChart>
    </CarouselItemWrapper>
  );
};
