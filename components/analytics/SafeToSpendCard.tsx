import { AlertTriangle, ShieldCheck } from '@tamagui/lucide-icons';
import { Text, View, styled } from 'tamagui';
import { formatCurrency } from '../../lib/format';
import type { MonthForecast, SafeToSpendSummary } from '../../lib/insights';
import {
  getSafeToSpendDisplayText,
  getSafeToSpendExplanation,
} from './emptyStates';

type SafeToSpendCardProps = {
  safeToSpend: SafeToSpendSummary;
  forecast: MonthForecast;
  currency: string;
};

const statusColor = {
  safe: '$green',
  caution: '$yellow',
  danger: '$stroberi',
  unknown: '$gray10',
} as const;

export const SafeToSpendCard = ({
  safeToSpend,
  forecast,
  currency,
}: SafeToSpendCardProps) => {
  const Icon = safeToSpend.status === 'danger' ? AlertTriangle : ShieldCheck;

  return (
    <Card borderColor={statusColor[safeToSpend.status]}>
      <View flexDirection="row" alignItems="center" gap="$2">
        <Icon size={22} color={statusColor[safeToSpend.status]} />
        <Text fontSize="$5" fontWeight="bold" color="white">
          Safe to spend
        </Text>
      </View>

      <Text fontSize="$9" fontWeight="bold" color="white" marginTop="$3">
        {getSafeToSpendDisplayText(safeToSpend, currency)}
      </Text>

      <Text fontSize="$3" color="$gray10" marginTop="$2">
        {getSafeToSpendExplanation(safeToSpend)}
      </Text>

      <View flexDirection="row" gap="$3" marginTop="$4">
        <MetricTile flex={1}>
          <Text fontSize="$2" color="$gray10">
            Month forecast
          </Text>
          <Text fontSize="$5" fontWeight="bold" color="white" marginTop="$1">
            {formatCurrency(forecast.projectedSpend, currency)}
          </Text>
        </MetricTile>
        <MetricTile flex={1}>
          <Text fontSize="$2" color="$gray10">
            Days left
          </Text>
          <Text fontSize="$5" fontWeight="bold" color="white" marginTop="$1">
            {safeToSpend.daysLeft}
          </Text>
        </MetricTile>
      </View>
    </Card>
  );
};

const Card = styled(View, {
  backgroundColor: '$gray2',
  borderRadius: '$6',
  borderWidth: 1,
  padding: '$4',
});

const MetricTile = styled(View, {
  backgroundColor: '$gray3',
  borderRadius: '$4',
  padding: '$3',
});
