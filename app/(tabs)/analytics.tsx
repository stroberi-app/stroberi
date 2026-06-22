import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { AlertTriangle, BarChart3 } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import * as React from 'react';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { Button, ScrollView, Text, View, styled } from 'tamagui';
import type { BudgetModel } from '../../database/budget-model';
import type { BudgetCategoryModel } from '../../database/budget-category-model';
import type { CategoryModel } from '../../database/category-model';
import { database } from '../../database/index';
import { InsightInbox } from '../../components/analytics/InsightInbox';
import { MoneyPulseCard } from '../../components/analytics/MoneyPulseCard';
import { PriorityActionPlanCard } from '../../components/analytics/PriorityActionPlanCard';
import { SafeToSpendCard } from '../../components/analytics/SafeToSpendCard';
import { SavingsRateCard } from '../../components/analytics/SavingsRateCard';
import { SectionCard } from '../../components/analytics/SectionCard';
import { SpendingHotspotsCard } from '../../components/analytics/SpendingHotspotsCard';
import { UpcomingBillsCard } from '../../components/analytics/UpcomingBillsCard';
import { WeeklyRecapCard } from '../../components/analytics/WeeklyRecapCard';
import { INSIGHTS_CARD_GAP } from '../../components/analytics/emptyStates';
import type { TransactionModel } from '../../database/transaction-model';
import { useAnalyticsOverview } from '../../hooks/useAnalyticsOverview';
import { useSavingsRateEnabled } from '../../hooks/useSavingsRateEnabled';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import type { DateFilter } from '../../lib/analyticsOverview';
import { DATE_FILTER_OPTIONS } from '../../lib/analyticsOverview';

type AnalyticsContentProps = {
  transactions: TransactionModel[];
  categories: CategoryModel[];
  budgets: BudgetModel[];
  budgetCategories: BudgetCategoryModel[];
};

const AnalyticsContent = withObservables<
  { database: Database },
  {
    transactions: Observable<TransactionModel[]>;
    categories: Observable<CategoryModel[]>;
    budgets: Observable<BudgetModel[]>;
    budgetCategories: Observable<BudgetCategoryModel[]>;
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
  budgetCategories: database
    .get<BudgetCategoryModel>('budget_categories')
    .query()
    .observe(),
}))(({ transactions, categories, budgets, budgetCategories }: AnalyticsContentProps) => {
  const { top } = useSafeAreaInsets();
  const { defaultCurrency } = useDefaultCurrency();
  const { savingsRateEnabled } = useSavingsRateEnabled();
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
    insightsOverview,
    label,
    monthBudgetLimit,
    periodTotals,
    potentialMonthlySavings,
    previousPeriodTotals,
    previousRange,
    pulseState,
    savingsTrend,
    toDate,
    upcomingRecurring,
  } = useAnalyticsOverview({
    transactions,
    categories,
    budgets,
    budgetCategories,
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
            Add or import transactions to unlock safe-to-spend, weekly recaps, and private
            local insights.
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
          <View gap={INSIGHTS_CARD_GAP} marginBottom="$4">
            <SafeToSpendCard
              safeToSpend={insightsOverview.safeToSpend}
              forecast={insightsOverview.forecast}
              currency={currency}
            />

            <InsightInbox insights={insightsOverview.insights} />

            <WeeklyRecapCard recap={insightsOverview.weeklyRecap} currency={currency} />

            {savingsRateEnabled ? (
              <SavingsRateCard analysis={savingsTrend} currency={currency} />
            ) : null}
          </View>

          <MoneyPulseCard
            pulseState={pulseState}
            healthScore={healthScore}
            periodTotals={periodTotals}
            previousPeriodTotals={previousPeriodTotals}
            previousRange={previousRange}
            expenseChangePercent={expenseChangePercent}
            forecast={forecast}
            forecastState={forecastState}
            monthBudgetLimit={monthBudgetLimit}
            currency={currency}
          />

          <PriorityActionPlanCard actionPlan={actionPlan} />

          <SpendingHotspotsCard
            categoryHotspots={categoryHotspots}
            potentialMonthlySavings={potentialMonthlySavings}
            currency={currency}
          />

          <UpcomingBillsCard upcomingRecurring={upcomingRecurring} currency={currency} />
        </>
      )}

      <View height={140} />
    </ScrollView>
  );
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
