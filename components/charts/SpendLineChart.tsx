import { CircleSlash } from '@tamagui/lucide-icons';
import * as React from 'react';
import { TextInput } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { View } from 'tamagui';
import { useChartPressState } from 'victory-native';
import type { InputFields, NumericalFields } from 'victory-native/dist/types';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { formatCurrencyWorklet } from '../../lib/format';
import { CarouselItemChart } from '../carousel/CarouselItemChart';
import { CarouselItemText } from '../carousel/CarouselItemText';
import { CarouselItemWrapper } from '../carousel/CarouselItemWrapper';
import { LineChart } from './LineChart';

const animConfig = { duration: 300 };

type SpendLineChartProps<
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
  strokeWidth?: number;
  curveType?: 'linear' | 'natural';
};

export const SpendLineChart = <
  RawData extends Record<string, unknown>,
  XK extends keyof InputFields<RawData>,
  YK extends keyof NumericalFields<RawData>,
>({
  chartData,
  title,
  xKey,
  yKeys,
  isEmpty,
  footer,
  formatXLabel,
  strokeWidth = 3,
  curveType = 'natural',
}: SpendLineChartProps<RawData, XK, YK>) => {
  const { defaultCurrency } = useDefaultCurrency();

  const { state, isActive } = useChartPressState({
    x: xKey as string,
    y: Object.fromEntries(yKeys.map((key) => [key, 0])),
  });
  const amount = useDerivedValue(() => {
    const formattedCurrency = formatCurrencyWorklet(
      state?.y.total.value.value,
      defaultCurrency ?? 'USD'
    );
    return `${state.x.value.value}: ${formattedCurrency}`;
  }, [state?.y.total.value.value]);

  const ttX = useSharedValue(0);
  const ttY = useSharedValue(0);

  useAnimatedReaction(
    () => state?.x.position.value,
    (val) => {
      ttX.value = withTiming(val, animConfig);
    }
  );
  useAnimatedReaction(
    () => state?.y.total.position.value,
    (val) => {
      ttY.value = withTiming(val, animConfig);
    }
  );

  const titleRef = React.useRef<TextInput>(null);

  const updateText = (value: string) => {
    if (!isActive) {
      titleRef.current?.setNativeProps({
        text: title,
      });
      return;
    }
    if (!titleRef.current) return;
    titleRef.current.setNativeProps({
      text: value,
    });
  };

  useAnimatedReaction(
    () => amount.value,
    (val) => {
      runOnJS(updateText)(val);
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
        <TextInput
          ref={titleRef}
          defaultValue=""
          style={{
            color: 'white',
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'Inter',
          }}
        />
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
            <LineChart
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
              formatXLabel={formatXLabel}
              strokeWidth={strokeWidth}
              curveType={curveType}
            />
            {footer}
          </>
        )}
      </CarouselItemChart>
    </CarouselItemWrapper>
  );
};
