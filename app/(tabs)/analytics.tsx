import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Flame,
  Lightbulb,
  TrendingUp,
} from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import * as React from 'react';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { Button, ScrollView, Separator, Text, View, styled } from 'tamagui';
import type { BudgetModel } from '../../database/budget-model';
import type { CategoryModel } from '../../database/category-model';
import { database } from '../../database/index';
import type { TransactionModel } from '../../database/transaction-model';
import { useAnalyticsOverview } from '../../hooks/useAnalyticsOverview';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import type { DateFilter } from '../../lib/analyticsOverview';
import {
  DATE_FILTER_OPTIONS,
  formatSignedCurrency,
  getPriorityStyles,
} from '../../lib/analyticsOverview';
import { formatCurrency } from '../../lib/format';

type AnalyticsContentProps = {
  transactions: TransactionModel[];
  categories: CategoryModel[];
  budgets: BudgetModel[];
};

const AnalyticsContent = withObservables<
  { database: Database },
  {
    transactions: Observable<TransactionModel[]>;
    categories: Observable<CategoryModel[]>;
    budgets: Observable<BudgetModel[]>;
  }
>(['database'], ({ database }) => ({
  transactions: database
    .get<TransactionModel>('transactions')
    .query(
      Q.where(
        'date',
        Q.gte(dayjs().subtract(18, 'month').startOf('month').toDate().getTime())
      )
    )
    .observeWithColumns(['amountInBaseCurrency', 'date', 'categoryId', 'merchant']),
  categories: database.get<CategoryModel>('categories').query().observe(),
  budgets: database
    .get<BudgetModel>('budgets')
    .query(Q.where('isActive', true))
    .observe(),
}))(({ transactions, categories, budgets }: AnalyticsContentProps) => {
  const { top } = useSafeAreaInsets();
  const { defaultCurrency } = useDefaultCurrency();
  const [dateFilter, setDateFilter] = useState<DateFilter>('thisMonth');
  const {
    actionPlan,
    categoryHotspots,
    currency,
    expenseChangePercent,
    forecast,
    forecastState,
    fromDate,
    hasAnyData,
    hasPeriodData,
    healthScore,
    label,
    monthBudgetLimit,
    periodTotals,
    potentialMonthlySavings,
    previousPeriodTotals,
    previousRange,
    pulseState,
    toDate,
    upcomingRecurring,
  } = useAnalyticsOverview({
    transactions,
    categories,
    budgets,
    defaultCurrency,
    dateFilter,
  });

  return (
    <ScrollView
      paddingTop={top || '$2'}
      backgroundColor="$bgPrimary"
      paddingHorizontal="$2"
      showsVerticalScrollIndicator={false}
    >
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        marginBottom="$3"
      >
        <View>
          <View flexDirection="row" alignItems="center" gap="$2">
            <BarChart3 size={24} color="$stroberi" />
            <Text fontSize="$8" fontWeight="bold">
              Analytics
            </Text>
          </View>
          <Text fontSize="$3" color="$gray10" marginTop="$1">
            {label} ({dayjs(fromDate).format('MMM D')} - {dayjs(toDate).format('MMM D')})
          </Text>
        </View>
      </View>

      <View flexDirection="row" gap="$2" marginBottom="$4" flexWrap="wrap">
        {DATE_FILTER_OPTIONS.map((option) => (
          <FilterPill
            key={option.value}
            active={dateFilter === option.value}
            onPress={() => setDateFilter(option.value)}
          >
            {option.label}
          </FilterPill>
        ))}
      </View>

      {!hasAnyData ? (
        <SectionCard alignItems="center" padding="$6">
          <BarChart3 size={44} color="$gray8" />
          <Text fontSize="$6" fontWeight="bold" color="$gray11" marginTop="$3">
            No analytics yet
          </Text>
          <Text fontSize="$3" color="$gray10" textAlign="center" marginTop="$1">
            Add transactions to unlock personalized spending guidance and trend alerts.
          </Text>
        </SectionCard>
      ) : !hasPeriodData ? (
        <SectionCard alignItems="center" padding="$6">
          <AlertTriangle size={42} color="$yellow" />
          <Text fontSize="$6" fontWeight="bold" color="$gray11" marginTop="$3">
            No data in this period
          </Text>
          <Text fontSize="$3" color="$gray10" textAlign="center" marginTop="$1">
            Try another date range to review trends and recommendations.
          </Text>
          <Button
            marginTop="$4"
            backgroundColor="$stroberi"
            onPress={() => setDateFilter('thisYear')}
          >
            View This Year
          </Button>
        </SectionCard>
      ) : (
        <>
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
                  {formatSignedCurrency(
                    periodTotals.net - previousPeriodTotals.net,
                    currency
                  )}
                </Text>
              </MetricTile>

              <MetricTile flex={1}>
                <Text fontSize="$2" color="$gray10">
                  Avg daily spend
                </Text>
                <Text fontSize="$5" fontWeight="bold" color="white" marginTop="$1">
                  {formatCurrency(
                    periodTotals.expenses / previousRange.daysInRange,
                    currency
                  )}
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
              <View
                height={8}
                backgroundColor="$gray5"
                borderRadius={4}
                overflow="hidden"
              >
                <View
                  height="100%"
                  width={`${
                    monthBudgetLimit
                      ? Math.min(100, (forecast.projectedSpend / monthBudgetLimit) * 100)
                      : Math.min(
                          100,
                          (forecast.currentSpend / Math.max(forecast.projectedSpend, 1)) *
                            100
                        )
                  }%`}
                  backgroundColor={
                    forecast.status === 'critical' ? '$stroberi' : '$green'
                  }
                />
              </View>
            </View>
          </SectionCard>

          <SectionCard>
            <View flexDirection="row" alignItems="center" justifyContent="space-between">
              <View flexDirection="row" alignItems="center" gap="$2">
                <Lightbulb size={16} color="$yellow" />
                <Text fontSize="$5" fontWeight="bold" color="white">
                  Priority Action Plan
                </Text>
              </View>
              <Text fontSize="$2" color="$gray10">
                Focus on these first
              </Text>
            </View>

            <View marginTop="$3" gap="$2">
              {actionPlan.map((item) => {
                const style = getPriorityStyles(item.priority);
                return (
                  <View
                    key={item.id}
                    borderRadius="$3"
                    borderWidth={1}
                    borderColor={style.borderColor}
                    backgroundColor={style.backgroundColor}
                    padding="$3"
                  >
                    <View
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                      marginBottom="$1"
                    >
                      <Text fontSize="$4" fontWeight="700" color="white" flex={1}>
                        {item.title}
                      </Text>
                      <Text fontSize="$1" color={style.textColor}>
                        {style.label}
                      </Text>
                    </View>
                    <Text fontSize="$2" color="$gray11">
                      {item.description}
                    </Text>
                    <Text
                      fontSize="$2"
                      color={style.textColor}
                      marginTop="$1.5"
                      fontWeight="700"
                    >
                      {item.impact}
                    </Text>
                  </View>
                );
              })}
            </View>
          </SectionCard>

          <SectionCard>
            <View
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$3"
            >
              <View flexDirection="row" alignItems="center" gap="$2">
                <TrendingUp size={16} color="$stroberi" />
                <Text fontSize="$5" fontWeight="bold" color="white">
                  Spending Hotspots
                </Text>
              </View>
              <Text fontSize="$2" color="$gray10">
                Save up to {formatCurrency(potentialMonthlySavings, currency)}
              </Text>
            </View>

            {categoryHotspots.slice(0, 5).map((item, index) => (
              <View key={item.categoryId}>
                {index > 0 && <Separator marginVertical="$3" borderColor="$gray5" />}
                <View
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  marginBottom="$1.5"
                >
                  <Text
                    fontSize="$3"
                    color="white"
                    fontWeight="600"
                    flex={1}
                    numberOfLines={1}
                  >
                    {item.categoryIcon} {item.categoryName}
                  </Text>
                  <Text fontSize="$3" color="white" fontWeight="700">
                    {formatCurrency(item.currentSpend, currency)}
                  </Text>
                </View>
                <View
                  height={7}
                  backgroundColor="$gray5"
                  borderRadius={4}
                  overflow="hidden"
                >
                  <View
                    height="100%"
                    width={`${Math.max(8, Math.min(100, item.share))}%`}
                    backgroundColor={item.changePercent > 0 ? '$stroberi' : '$green'}
                  />
                </View>
                <View
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  marginTop="$1.5"
                >
                  <Text
                    fontSize="$2"
                    color={item.changePercent > 0 ? '$stroberi' : '$green'}
                  >
                    {item.changePercent >= 0 ? '+' : ''}
                    {Math.round(item.changePercent)}% vs previous
                  </Text>
                  {item.potentialSavings > 0 && (
                    <Text fontSize="$2" color="$yellow">
                      Opportunity: {formatCurrency(item.potentialSavings, currency)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </SectionCard>

          <SectionCard>
            <View
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$3"
            >
              <View flexDirection="row" alignItems="center" gap="$2">
                <CalendarClock size={16} color="$blue10" />
                <Text fontSize="$5" fontWeight="bold" color="white">
                  Upcoming Bills
                </Text>
              </View>
              <Text fontSize="$2" color="$gray10">
                Next 30 days
              </Text>
            </View>

            {upcomingRecurring.length === 0 ? (
              <View
                borderRadius="$3"
                backgroundColor="$gray4"
                padding="$3"
                borderWidth={1}
                borderColor="$gray5"
              >
                <Text fontSize="$3" color="$gray11">
                  No recurring expenses detected yet. Add merchant names to improve bill
                  predictions.
                </Text>
              </View>
            ) : (
              upcomingRecurring.map((item, index) => {
                const daysUntil = dayjs(item.predictedDate).diff(dayjs(), 'day');
                return (
                  <View key={`${item.merchant}-${item.predictedDate.toISOString()}`}>
                    {index > 0 && (
                      <Separator marginVertical="$2.5" borderColor="$gray5" />
                    )}
                    <View
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <View flex={1}>
                        <Text fontSize="$3" color="white" fontWeight="600">
                          {item.merchant}
                        </Text>
                        <Text fontSize="$2" color="$gray10">
                          {daysUntil === 0
                            ? 'Due today'
                            : `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                        </Text>
                      </View>
                      <View alignItems="flex-end">
                        <Text fontSize="$3" color="white" fontWeight="700">
                          {formatCurrency(item.amount, currency)}
                        </Text>
                        <Text fontSize="$1" color="$gray10">
                          {Math.round(item.confidence * 100)}% confidence
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </SectionCard>
        </>
      )}

      <View height={140} />
    </ScrollView>
  );
});

const SectionCard = styled(View, {
  backgroundColor: '$gray3',
  borderRadius: '$4',
  padding: '$4',
  marginBottom: '$3',
});

const MetricTile = styled(View, {
  backgroundColor: '$gray4',
  borderRadius: '$3',
  padding: '$3',
  borderWidth: 1,
  borderColor: '$gray5',
});

const FilterPill = styled(Button, {
  backgroundColor: '$gray4',
  borderRadius: '$6',
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  height: 'auto',
  variants: {
    active: {
      true: {
        backgroundColor: '$stroberi',
      },
    },
  },
});

export default function AnalyticsScreen() {
  return <AnalyticsContent database={database} />;
}
