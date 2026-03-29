import { ArrowLeftRight, Scale, TrendingDown, TrendingUp } from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';
import type { IncomeExpenseRatioAnalysis } from '../../lib/advancedAnalytics';
import { formatMonthLabel } from '../../lib/advancedAnalytics';
import { formatCurrency } from '../../lib/format';
import { AnalyticsCard } from './AnalyticsCard';

type IncomeExpenseCardProps = {
  analysis: IncomeExpenseRatioAnalysis;
  currency: string;
};

export const IncomeExpenseCard = ({ analysis, currency }: IncomeExpenseCardProps) => {
  const getStatusConfig = () => {
    switch (analysis.status) {
      case 'saving':
        return { color: '$green', label: "You're saving!", icon: TrendingUp };
      case 'overspending':
        return { color: '$stroberi', label: 'Overspending', icon: TrendingDown };
      default:
        return { color: '$yellow', label: 'Balanced', icon: Scale };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  // Calculate percentage for visual bar (income vs total)
  const total = analysis.totalIncome + analysis.totalExpenses;
  const incomePercent = total > 0 ? (analysis.totalIncome / total) * 100 : 50;

  return (
    <AnalyticsCard
      title="Income vs Expense"
      icon={<ArrowLeftRight size={20} color="$yellow" />}
      accentColor="$yellow"
    >
      {/* Ratio Display */}
      <View alignItems="center" marginBottom="$4">
        <View
          flexDirection="row"
          alignItems="center"
          gap="$2"
          backgroundColor={
            analysis.status === 'saving'
              ? 'rgba(34, 197, 94, 0.15)'
              : analysis.status === 'overspending'
                ? 'rgba(229, 75, 75, 0.15)'
                : 'rgba(234, 179, 8, 0.15)'
          }
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$3"
        >
          <StatusIcon size={18} color={config.color} />
          <Text fontSize="$4" fontWeight="bold" color={config.color}>
            {config.label}
          </Text>
        </View>
        <View flexDirection="row" alignItems="baseline" gap="$1" marginTop="$3">
          <Text fontSize="$8" fontWeight="bold" color="white">
            {analysis.ratio.toFixed(2)}
          </Text>
          <Text fontSize="$4" color="$gray11">
            ratio
          </Text>
        </View>
        <Text fontSize="$2" color="$gray10" marginTop="$1">
          {analysis.ratio >= 1
            ? `For every $1 spent, you earn $${analysis.ratio.toFixed(2)}`
            : `For every $1 earned, you spend $${(1 / analysis.ratio).toFixed(2)}`}
        </Text>
      </View>

      {/* Income vs Expense Bar */}
      <View marginBottom="$4">
        <View flexDirection="row" justifyContent="space-between" marginBottom="$2">
          <View flexDirection="row" alignItems="center" gap="$1">
            <View width={10} height={10} backgroundColor="$green" borderRadius={5} />
            <Text fontSize="$2" color="$gray11">
              Income
            </Text>
          </View>
          <View flexDirection="row" alignItems="center" gap="$1">
            <View width={10} height={10} backgroundColor="$stroberi" borderRadius={5} />
            <Text fontSize="$2" color="$gray11">
              Expense
            </Text>
          </View>
        </View>
        <View
          height={24}
          backgroundColor="$gray5"
          borderRadius="$3"
          overflow="hidden"
          flexDirection="row"
        >
          <View
            width={`${incomePercent}%`}
            height="100%"
            backgroundColor="$green"
            justifyContent="center"
            alignItems="center"
          >
            {incomePercent > 20 && (
              <Text fontSize={10} fontWeight="bold" color="white">
                {incomePercent.toFixed(0)}%
              </Text>
            )}
          </View>
          <View
            flex={1}
            height="100%"
            backgroundColor="$stroberi"
            justifyContent="center"
            alignItems="center"
          >
            {100 - incomePercent > 20 && (
              <Text fontSize={10} fontWeight="bold" color="white">
                {(100 - incomePercent).toFixed(0)}%
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Amounts */}
      <View flexDirection="row" gap="$3" marginBottom="$3">
        <View flex={1} backgroundColor="$gray4" padding="$3" borderRadius="$3">
          <View flexDirection="row" alignItems="center" gap="$1" marginBottom="$1">
            <TrendingUp size={12} color="$green" />
            <Text fontSize="$2" color="$gray11">
              Total Income
            </Text>
          </View>
          <Text fontSize="$4" fontWeight="bold" color="$green">
            {formatCurrency(analysis.totalIncome, currency)}
          </Text>
        </View>
        <View flex={1} backgroundColor="$gray4" padding="$3" borderRadius="$3">
          <View flexDirection="row" alignItems="center" gap="$1" marginBottom="$1">
            <TrendingDown size={12} color="$stroberi" />
            <Text fontSize="$2" color="$gray11">
              Total Expenses
            </Text>
          </View>
          <Text fontSize="$4" fontWeight="bold" color="$stroberi">
            {formatCurrency(analysis.totalExpenses, currency)}
          </Text>
        </View>
      </View>

      {/* Monthly Comparison */}
      {analysis.monthlyComparison.length > 1 && (
        <View>
          <Text fontSize="$2" color="$gray11" marginBottom="$2">
            Monthly Comparison
          </Text>
          <View gap="$1">
            {analysis.monthlyComparison.slice(-4).map((month) => {
              const monthTotal = month.income + month.expenses;
              const monthIncomePercent =
                monthTotal > 0 ? (month.income / monthTotal) * 100 : 50;

              return (
                <View key={month.month}>
                  <View
                    flexDirection="row"
                    justifyContent="space-between"
                    marginBottom="$0.5"
                  >
                    <Text fontSize="$2" color="$gray10">
                      {formatMonthLabel(month.month)}
                    </Text>
                    <Text fontSize="$2" color={month.ratio >= 1 ? '$green' : '$stroberi'}>
                      {month.ratio.toFixed(2)}x
                    </Text>
                  </View>
                  <View
                    height={12}
                    backgroundColor="$gray5"
                    borderRadius="$1"
                    overflow="hidden"
                    flexDirection="row"
                  >
                    <View
                      width={`${monthIncomePercent}%`}
                      height="100%"
                      backgroundColor="$green"
                    />
                    <View flex={1} height="100%" backgroundColor="$stroberi" />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </AnalyticsCard>
  );
};
