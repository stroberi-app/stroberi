import { CalendarClock } from '@tamagui/lucide-icons';
import { Text, View, styled } from 'tamagui';
import { formatCurrency } from '../../lib/format';
import type { WeeklyRecap } from '../../lib/insights';
import { getWeeklyRecapDisplayState } from './emptyStates';

type WeeklyRecapCardProps = {
  recap: WeeklyRecap;
  currency: string;
};

export const WeeklyRecapCard = ({ recap, currency }: WeeklyRecapCardProps) => {
  const displayState = getWeeklyRecapDisplayState(recap);

  return (
    <SectionCard>
      <View flexDirection="row" alignItems="center" gap="$2">
        <CalendarClock size={20} color="$stroberi" />
        <Text fontSize="$5" fontWeight="bold" color="white">
          Weekly Recap
        </Text>
      </View>

      {displayState.isEmpty ? (
        <EmptyPanel marginTop="$3">
          <Text fontSize="$4" fontWeight="700" color="white">
            {displayState.title}
          </Text>
          <Text fontSize="$3" color="$gray10" marginTop="$1">
            {displayState.summary}
          </Text>
        </EmptyPanel>
      ) : (
        <>
          <Text fontSize="$3" color="$gray10" marginTop="$2">
            {displayState.summary}
          </Text>

          <View flexDirection="row" gap="$3" marginTop="$4">
        <MetricTile flex={1}>
          <Text fontSize="$2" color="$gray10">
            This week
          </Text>
          <Text fontSize="$5" fontWeight="bold" color="white" marginTop="$1">
            {formatCurrency(recap.totalSpent, currency)}
          </Text>
        </MetricTile>
        <MetricTile flex={1}>
          <Text fontSize="$2" color="$gray10">
            Vs previous
          </Text>
          <Text
            fontSize="$5"
            fontWeight="bold"
            color={recap.changeAmount <= 0 ? '$green' : '$stroberi'}
            marginTop="$1"
          >
            {recap.changeAmount <= 0 ? '-' : '+'}
            {formatCurrency(Math.abs(recap.changeAmount), currency)}
          </Text>
        </MetricTile>
          </View>

          {recap.oneThingToWatch ? (
            <Text fontSize="$3" color="$gray10" marginTop="$3">
              Watch {recap.oneThingToWatch.label}: up{' '}
              {formatCurrency(recap.oneThingToWatch.changeAmount, currency)}.
            </Text>
          ) : null}
        </>
      )}
    </SectionCard>
  );
};

const SectionCard = styled(View, {
  backgroundColor: '$gray2',
  borderRadius: '$6',
  borderWidth: 1,
  borderColor: '$gray5',
  padding: '$4',
});

const MetricTile = styled(View, {
  backgroundColor: '$gray3',
  borderRadius: '$4',
  padding: '$3',
});

const EmptyPanel = styled(View, {
  backgroundColor: '$gray3',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$gray5',
  padding: '$3',
});
