import { Clock, Flame, Zap } from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';
import type { SpendingVelocityAnalysis } from '../../lib/advancedAnalytics';
import type { SpendingForecast } from '../../lib/forecasting';
import { formatCurrency } from '../../lib/format';
import { AnalyticsCard, MetricRow, TrendBadge } from './AnalyticsCard';

type SpendingVelocityCardProps = {
  analysis: SpendingVelocityAnalysis;
  currency: string;
  forecast?: SpendingForecast;
};

export const SpendingVelocityCard = ({
  analysis,
  currency,
  forecast,
}: SpendingVelocityCardProps) => {
  const getVelocityColor = () => {
    if (analysis.velocityTrend === 'decelerating') return '$green';
    if (analysis.velocityTrend === 'accelerating') return '$stroberi';
    return '$yellow';
  };

  return (
    <AnalyticsCard
      title="Spending Velocity"
      icon={<Flame size={20} color="$stroberi" />}
      accentColor="$stroberi"
    >
      {/* Forecast Section */}
      {forecast && (
        <View marginBottom="$4">
          <View flexDirection="row" justifyContent="space-between" alignItems="flex-end" marginBottom="$2">
            <Text fontSize="$3" color="$gray11">Month End Projection</Text>
            <Text fontSize="$5" fontWeight="bold" color={forecast.status === 'critical' ? '$stroberi' : '$gray12'}>
              {formatCurrency(forecast.projectedSpend, currency)}
            </Text>
          </View>

          {/* Visual Progress Bar */}
          <View height={6} backgroundColor="$gray6" borderRadius={3} overflow="hidden">
            {/* Current Spend */}
            <View
              height="100%"
              backgroundColor="$gray9"
              width={`${Math.min(100, (forecast.currentSpend / forecast.projectedSpend) * 100)}%`}
              position="absolute"
            />
            {/* Projected Add-on */}
            <View
              height="100%"
              backgroundColor="$stroberi"
              opacity={0.3}
              width="100%"
            />
          </View>
          <View flexDirection="row" justifyContent="space-between" marginTop="$1">
            <Text fontSize={10} color="$gray10">Current: {formatCurrency(forecast.currentSpend, currency)}</Text>
            <Text fontSize={10} color="$gray10">{forecast.daysRemaining} days left</Text>
          </View>
        </View>
      )}

      {/* Daily Burn Rate - Main Metric */}
      <View
        backgroundColor="$gray4"
        padding="$4"
        borderRadius="$3"
        alignItems="center"
        marginBottom="$3"
      >
        <View flexDirection="row" alignItems="center" gap="$2" marginBottom="$1">
          <Flame size={16} color={getVelocityColor()} />
          <Text fontSize="$3" color="$gray11">
            Daily Burn Rate
          </Text>
        </View>
        <Text fontSize="$8" fontWeight="bold" color="white">
          {formatCurrency(analysis.dailyBurnRate, currency)}
        </Text>
        <Text fontSize="$3" color="$gray10" marginTop="$1">
          per day
        </Text>
        <View marginTop="$2">
          <TrendBadge trend={analysis.velocityTrend} />
        </View>
      </View>

      {/* Key Metrics Grid */}
      <View flexDirection="row" gap="$3" marginBottom="$3">
        <View
          flex={1}
          backgroundColor="$gray4"
          padding="$3"
          borderRadius="$3"
          alignItems="center"
        >
          <Clock size={16} color="$gray11" />
          <Text fontSize="$2" color="$gray11" marginTop="$1">
            Weekly Rate
          </Text>
          <Text fontSize="$4" fontWeight="bold" color="white" marginTop="$1">
            {formatCurrency(analysis.weeklyBurnRate, currency)}
          </Text>
        </View>
        <View
          flex={1}
          backgroundColor="$gray4"
          padding="$3"
          borderRadius="$3"
          alignItems="center"
        >
          <Zap size={16} color="$gray11" />
          <Text fontSize="$2" color="$gray11" marginTop="$1">
            Avg Transaction
          </Text>
          <Text fontSize="$4" fontWeight="bold" color="white" marginTop="$1">
            {formatCurrency(analysis.averageTransactionAmount, currency)}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View backgroundColor="$gray4" padding="$3" borderRadius="$3">
        <MetricRow
          label="Transactions/Day"
          value={analysis.transactionFrequency.toFixed(1)}
          subValue={`${analysis.daysInPeriod} days analyzed`}
        />
      </View>

      {/* Weekly Comparison Bar Chart */}
      {analysis.weeklyComparison.length > 1 && (
        <View marginTop="$3">
          <Text fontSize="$2" color="$gray11" marginBottom="$2">
            Weekly Spending
          </Text>
          <View flexDirection="row" gap="$1" alignItems="flex-end" height={60}>
            {analysis.weeklyComparison.slice(-8).map((week, index) => {
              const maxValue = Math.max(...analysis.weeklyComparison.map((w) => w.total));
              const heightPercent = maxValue > 0 ? (week.total / maxValue) * 100 : 0;
              const isLast = index === analysis.weeklyComparison.slice(-8).length - 1;

              return (
                <View key={week.week} flex={1} alignItems="center">
                  <View
                    height={`${heightPercent}%`}
                    minHeight={4}
                    width="70%"
                    backgroundColor={isLast ? getVelocityColor() : '$gray6'}
                    borderRadius="$1"
                  />
                  <Text fontSize={9} color="$gray10" marginTop="$1">
                    W{index + 1}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </AnalyticsCard>
  );
};
