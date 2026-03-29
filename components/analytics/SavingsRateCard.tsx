import { Award, PiggyBank, TrendingDown, TrendingUp } from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';
import type { SavingsRateAnalysis } from '../../lib/advancedAnalytics';
import { formatMonthLabel } from '../../lib/advancedAnalytics';
import { formatCurrency } from '../../lib/format';
import { AnalyticsCard, ProgressBar, TrendBadge } from './AnalyticsCard';

type SavingsRateCardProps = {
  analysis: SavingsRateAnalysis;
  currency: string;
};

export const SavingsRateCard = ({ analysis, currency }: SavingsRateCardProps) => {
  const isPositive = analysis.savingsRate > 0;
  const rateColor = isPositive
    ? '$green'
    : analysis.savingsRate < 0
      ? '$stroberi'
      : 'white';

  return (
    <AnalyticsCard
      title="Savings Rate"
      icon={<PiggyBank size={20} color="$green" />}
      accentColor="$green"
    >
      {/* Main Savings Rate */}
      <View alignItems="center" marginBottom="$4">
        <View flexDirection="row" alignItems="baseline" gap="$1">
          <Text fontSize="$9" fontWeight="bold" color={rateColor}>
            {analysis.savingsRate > 0 ? '+' : ''}
            {analysis.savingsRate.toFixed(1)}
          </Text>
          <Text fontSize="$5" color={rateColor}>
            %
          </Text>
        </View>
        <View flexDirection="row" alignItems="center" gap="$2" marginTop="$2">
          <TrendBadge trend={analysis.trend} />
          {analysis.consecutivePositiveMonths > 0 && (
            <View
              flexDirection="row"
              alignItems="center"
              gap="$1"
              backgroundColor="rgba(34, 197, 94, 0.15)"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Award size={12} color="$green" />
              <Text fontSize="$2" color="$green" fontWeight="600">
                {analysis.consecutivePositiveMonths} month streak
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Visual Progress Bar */}
      <View marginBottom="$3">
        <View flexDirection="row" justifyContent="space-between" marginBottom="$1">
          <Text fontSize="$2" color="$gray11">
            Savings Progress
          </Text>
          <Text fontSize="$2" color="$gray11">
            {isPositive ? 'Saving' : 'Overspending'}
          </Text>
        </View>
        <ProgressBar
          value={Math.min(100, Math.abs(analysis.savingsRate))}
          color={rateColor}
        />
      </View>

      {/* Income & Expense Summary */}
      <View backgroundColor="$gray4" padding="$3" borderRadius="$3" gap="$2">
        <View flexDirection="row" justifyContent="space-between">
          <View flexDirection="row" alignItems="center" gap="$2">
            <TrendingUp size={14} color="$green" />
            <Text fontSize="$3" color="$gray11">
              Income
            </Text>
          </View>
          <Text fontSize="$3" fontWeight="bold" color="$green">
            {formatCurrency(analysis.totalIncome, currency)}
          </Text>
        </View>
        <View flexDirection="row" justifyContent="space-between">
          <View flexDirection="row" alignItems="center" gap="$2">
            <TrendingDown size={14} color="$stroberi" />
            <Text fontSize="$3" color="$gray11">
              Expenses
            </Text>
          </View>
          <Text fontSize="$3" fontWeight="bold" color="$stroberi">
            {formatCurrency(analysis.totalExpenses, currency)}
          </Text>
        </View>
        <View height={1} backgroundColor="$gray5" marginVertical="$1" />
        <View flexDirection="row" justifyContent="space-between">
          <Text fontSize="$3" fontWeight="600" color="white">
            Net Savings
          </Text>
          <Text fontSize="$3" fontWeight="bold" color={rateColor}>
            {analysis.netSavings >= 0 ? '+' : ''}
            {formatCurrency(analysis.netSavings, currency)}
          </Text>
        </View>
      </View>

      {/* Monthly Mini-Chart */}
      {analysis.monthlyRates.length > 1 && (
        <View marginTop="$3">
          <Text fontSize="$2" color="$gray11" marginBottom="$2">
            Monthly Trend
          </Text>
          <View flexDirection="row" gap="$1" justifyContent="space-between">
            {analysis.monthlyRates.slice(-6).map((month) => (
              <View key={month.month} alignItems="center" flex={1}>
                <View
                  height={40}
                  width="80%"
                  backgroundColor="$gray5"
                  borderRadius="$1"
                  justifyContent="flex-end"
                  overflow="hidden"
                >
                  <View
                    height={`${Math.min(100, Math.abs(month.rate) * 2)}%`}
                    backgroundColor={month.rate >= 0 ? '$green' : '$stroberi'}
                    borderRadius="$1"
                  />
                </View>
                <Text fontSize={10} color="$gray10" marginTop="$1">
                  {formatMonthLabel(month.month)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </AnalyticsCard>
  );
};
