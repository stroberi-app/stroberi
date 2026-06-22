import { Flame } from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';
import type { useAnalyticsOverview } from '../../hooks/useAnalyticsOverview';
import { formatSignedCurrency } from '../../lib/analyticsOverview';
import { formatCurrency } from '../../lib/format';
import { MetricTile, SectionCard } from './SectionCard';

type Overview = ReturnType<typeof useAnalyticsOverview>;

type MoneyPulseCardProps = Pick<
  Overview,
  | 'pulseState'
  | 'healthScore'
  | 'periodTotals'
  | 'previousPeriodTotals'
  | 'previousRange'
  | 'expenseChangePercent'
  | 'forecast'
  | 'forecastState'
  | 'monthBudgetLimit'
  | 'currency'
>;

export const MoneyPulseCard = ({
  pulseState,
  healthScore,
  periodTotals,
  previousPeriodTotals,
  previousRange,
  expenseChangePercent,
  forecast,
  forecastState,
  monthBudgetLimit,
  currency,
}: MoneyPulseCardProps) => (
  <SectionCard borderWidth={1} borderColor="$gray5">
    <View
      flexDirection="row"
      justifyContent="space-between"
      alignItems="flex-start"
      gap="$3"
    >
      <View flex={1}>
        <View flexDirection="row" alignItems="center" gap="$2" marginBottom="$2">
          <Flame size={18} color={pulseState.color} />
          <Text fontSize="$5" fontWeight="bold" color="white">
            Money Pulse
          </Text>
        </View>
        <View
          backgroundColor={pulseState.bg}
          paddingHorizontal="$3"
          paddingVertical="$1.5"
          borderRadius="$3"
          alignSelf="flex-start"
        >
          <Text fontSize="$3" fontWeight="700" color={pulseState.color}>
            {pulseState.label}
          </Text>
        </View>
        <Text fontSize="$3" color="$gray10" marginTop="$2">
          {pulseState.description}
        </Text>
      </View>
      <View alignItems="center">
        <Text fontSize="$9" fontWeight="bold" color={pulseState.color}>
          {healthScore.overallScore}
        </Text>
        <Text fontSize="$2" color="$gray10">
          Health Score
        </Text>
      </View>
    </View>

    <View flexDirection="row" gap="$3" marginTop="$4">
      <MetricTile flex={1}>
        <Text fontSize="$2" color="$gray10">
          Net cashflow
        </Text>
        <Text
          fontSize="$5"
          fontWeight="bold"
          color={periodTotals.net >= 0 ? '$green' : '$stroberi'}
          marginTop="$1"
        >
          {formatSignedCurrency(periodTotals.net, currency)}
        </Text>
        <Text fontSize="$2" color="$gray10" marginTop="$1">
          vs prev:{' '}
          {formatSignedCurrency(periodTotals.net - previousPeriodTotals.net, currency)}
        </Text>
      </MetricTile>

      <MetricTile flex={1}>
        <Text fontSize="$2" color="$gray10">
          Avg daily spend
        </Text>
        <Text fontSize="$5" fontWeight="bold" color="white" marginTop="$1">
          {formatCurrency(periodTotals.expenses / previousRange.daysInRange, currency)}
        </Text>
        <Text
          fontSize="$2"
          color={expenseChangePercent > 0 ? '$stroberi' : '$green'}
          marginTop="$1"
        >
          {expenseChangePercent >= 0 ? '+' : ''}
          {Math.round(expenseChangePercent)}% vs prev
        </Text>
      </MetricTile>
    </View>

    <View marginTop="$3">
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        marginBottom="$1"
      >
        <Text fontSize="$2" color="$gray10">
          Monthly projection
        </Text>
        <Text fontSize="$2" color={forecastState.color}>
          {forecastState.label}
        </Text>
      </View>
      <View height={8} backgroundColor="$gray5" borderRadius={4} overflow="hidden">
        <View
          height="100%"
          width={`${
            monthBudgetLimit
              ? Math.min(100, (forecast.projectedSpend / monthBudgetLimit) * 100)
              : Math.min(
                  100,
                  (forecast.currentSpend / Math.max(forecast.projectedSpend, 1)) * 100
                )
          }%`}
          backgroundColor={forecast.status === 'critical' ? '$stroberi' : '$green'}
        />
      </View>
    </View>
  </SectionCard>
);
