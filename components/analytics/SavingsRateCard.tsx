import {
  Award,
  PiggyBank,
  Target,
  TrendingDown,
  TrendingUp,
} from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';
import { useSavingsRateTarget } from '../../hooks/useSavingsRateTarget';
import type { SavingsRateAnalysis } from '../../lib/advancedAnalytics';
import { formatMonthLabel } from '../../lib/advancedAnalytics';
import { formatCurrency } from '../../lib/format';
import { buildSavingsRateSummary } from '../../lib/savingsRate';
import { Sparkline } from '../charts/Sparkline';
import { AnalyticsCard, ProgressBar, TrendBadge } from './AnalyticsCard';

type SavingsRateCardProps = {
  analysis: SavingsRateAnalysis;
  currency: string;
};

export const SavingsRateCard = ({ analysis, currency }: SavingsRateCardProps) => {
  const { savingsRateTarget } = useSavingsRateTarget();
  const summary = buildSavingsRateSummary({
    analysis,
    target: savingsRateTarget,
  });

  const rateColor =
    summary.status === 'onTrack'
      ? '$green'
      : summary.status === 'behind'
        ? '$stroberi'
        : 'white';

  const progressTowardTarget =
    savingsRateTarget > 0
      ? Math.min(100, Math.max(0, (summary.currentRate / savingsRateTarget) * 100))
      : 0;

  return (
    <AnalyticsCard
      title="Savings Rate"
      icon={<PiggyBank size={20} color="$green" />}
      accentColor="$green"
    >
      {/* Current month rate vs target */}
      <View alignItems="center" marginBottom="$3">
        <View flexDirection="row" alignItems="baseline" gap="$1">
          <Text fontSize="$9" fontWeight="bold" color={rateColor}>
            {summary.currentRate > 0 ? '+' : ''}
            {summary.currentRate.toFixed(1)}
          </Text>
          <Text fontSize="$5" color={rateColor}>
            %
          </Text>
        </View>
        <Text fontSize="$2" color="$gray10" marginTop="$1">
          this month
        </Text>
        <View flexDirection="row" alignItems="center" gap="$2" marginTop="$2">
          <View
            flexDirection="row"
            alignItems="center"
            gap="$1"
            backgroundColor="$gray4"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Target size={12} color="$gray11" />
            <Text fontSize="$2" color="$gray11" fontWeight="600">
              Target {savingsRateTarget}%
            </Text>
          </View>
          <View
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            backgroundColor={
              summary.status === 'onTrack'
                ? 'rgba(34, 197, 94, 0.15)'
                : summary.status === 'behind'
                  ? 'rgba(244, 63, 94, 0.15)'
                  : '$gray4'
            }
          >
            <Text fontSize="$2" color={rateColor} fontWeight="600">
              {summary.status === 'onTrack'
                ? 'On track'
                : summary.status === 'behind'
                  ? `${summary.gap.toFixed(1)}% behind`
                  : 'No data'}
            </Text>
          </View>
          <TrendBadge trend={analysis.trend} />
        </View>
      </View>

      {/* Progress toward target */}
      <View marginBottom="$3">
        <View flexDirection="row" justifyContent="space-between" marginBottom="$1">
          <Text fontSize="$2" color="$gray11">
            Progress to target
          </Text>
          <Text fontSize="$2" color="$gray11">
            {Math.round(progressTowardTarget)}%
          </Text>
        </View>
        <ProgressBar value={progressTowardTarget} color={rateColor} />
      </View>

      {/* Savings rate trend */}
      {analysis.monthlyRates.length >= 2 && (
        <View backgroundColor="$gray4" padding="$3" borderRadius="$3" marginBottom="$3">
          <View
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            marginBottom="$2"
          >
            <Text fontSize="$2" color="$gray11">
              Savings rate trend
            </Text>
            <Text fontSize="$2" color="$gray10">
              {formatMonthLabel(analysis.monthlyRates[0].month)} –{' '}
              {formatMonthLabel(
                analysis.monthlyRates[analysis.monthlyRates.length - 1].month
              )}
            </Text>
          </View>
          <Sparkline
            values={analysis.monthlyRates.map((entry) => entry.rate)}
            height={44}
            color={
              analysis.trend === 'down'
                ? '#E54B4B'
                : analysis.trend === 'up'
                  ? '#6BCB77'
                  : '#9CA3AF'
            }
          />
        </View>
      )}

      {/* Target stats */}
      <View flexDirection="row" gap="$2" marginBottom="$3">
        <View flex={1} backgroundColor="$gray4" padding="$3" borderRadius="$3">
          <Text fontSize="$2" color="$gray10">
            Average
          </Text>
          <Text fontSize="$4" fontWeight="bold" color="white" marginTop="$1">
            {summary.averageRate.toFixed(1)}%
          </Text>
        </View>
        <View flex={1} backgroundColor="$gray4" padding="$3" borderRadius="$3">
          <Text fontSize="$2" color="$gray10">
            Best month
          </Text>
          <Text fontSize="$4" fontWeight="bold" color="white" marginTop="$1">
            {summary.bestMonth ? `${summary.bestMonth.rate.toFixed(1)}%` : '—'}
          </Text>
        </View>
        <View flex={1} backgroundColor="$gray4" padding="$3" borderRadius="$3">
          <View flexDirection="row" alignItems="center" gap="$1">
            <Award size={12} color="$green" />
            <Text fontSize="$2" color="$gray10">
              Met / streak
            </Text>
          </View>
          <Text fontSize="$4" fontWeight="bold" color="white" marginTop="$1">
            {summary.monthsMet} / {summary.streak}
          </Text>
        </View>
      </View>

      {/* Income & Expense Summary (trailing window) */}
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
      {summary.chartData.length > 1 &&
        (() => {
          // Scale bars relative to the highest value in view (rates or target)
          // so month-to-month variation is visible instead of saturating.
          const maxRate = Math.max(
            ...summary.chartData.map((month) => month.rate),
            savingsRateTarget,
            1
          );

          return (
            <View marginTop="$3">
              <Text fontSize="$2" color="$gray11" marginBottom="$2">
                Monthly Trend
              </Text>
              <View flexDirection="row" gap="$1" justifyContent="space-between">
                {summary.chartData.map((month) => {
                  const fillPercent =
                    month.rate > 0
                      ? Math.max(6, Math.min(100, (month.rate / maxRate) * 100))
                      : 0;

                  return (
                    <View key={month.month} alignItems="center" flex={1}>
                      <Text fontSize={9} color="$gray10" marginBottom="$1">
                        {Math.round(month.rate)}%
                      </Text>
                      <View
                        height={48}
                        width="80%"
                        backgroundColor="$gray5"
                        borderRadius="$1"
                        justifyContent="flex-end"
                        overflow="hidden"
                      >
                        <View
                          height={`${fillPercent}%`}
                          backgroundColor={
                            month.rate >= savingsRateTarget ? '$green' : '$stroberi'
                          }
                          borderRadius="$1"
                        />
                      </View>
                      <Text fontSize={10} color="$gray10" marginTop="$1">
                        {formatMonthLabel(month.month)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

      {/* Actionable tip */}
      <Text fontSize="$3" color="$gray11" marginTop="$3">
        {summary.tip}
      </Text>
    </AnalyticsCard>
  );
};
