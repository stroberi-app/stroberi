import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { BarChart3 } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import * as React from 'react';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { Button, ScrollView, styled, Text, View } from 'tamagui';
import {
  CategoryTrendsCard,
  FinancialHealthCard,
  IncomeExpenseCard,
  SavingsRateCard,
  SpendingVelocityCard,
} from '../../components/analytics';
import { SmartInsightsFeed } from '../../components/analytics/SmartInsightsFeed';
import type { CategoryModel } from '../../database/category-model';
import type { BudgetModel } from '../../database/budget-model';
import { database } from '../../database/index';
import type { TransactionModel } from '../../database/transaction-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import {
  type CategoryTrendAnalysis,
  calculateCategoryTrends,
  calculateFinancialHealthScore,
  calculateIncomeExpenseRatio,
  calculateSavingsRate,
  calculateSpendingVelocity,
  type FinancialHealthScore,
  type IncomeExpenseRatioAnalysis,
  type SavingsRateAnalysis,
  type SpendingVelocityAnalysis,
} from '../../lib/advancedAnalytics';
import {
  type SpendingForecast,
  type SmartInsight,
  calculateProjectedSpending,
  generateSmartInsights,
} from '../../lib/forecasting';

type DateFilter = 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear';

const getDateRange = (filter: DateFilter): { fromDate: Date; toDate: Date } => {
  const today = dayjs();

  switch (filter) {
    case 'thisMonth':
      return {
        fromDate: today.startOf('month').toDate(),
        toDate: today.endOf('month').toDate(),
      };
    case 'lastMonth':
      return {
        fromDate: today.subtract(1, 'month').startOf('month').toDate(),
        toDate: today.subtract(1, 'month').endOf('month').toDate(),
      };
    case 'last3Months':
      return {
        fromDate: today.subtract(3, 'month').startOf('month').toDate(),
        toDate: today.endOf('month').toDate(),
      };
    case 'thisYear':
      return {
        fromDate: today.startOf('year').toDate(),
        toDate: today.endOf('year').toDate(),
      };
  }
};

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
        Q.gte(dayjs().subtract(1, 'year').startOf('year').toDate().getTime())
      )
    )
    .observeWithColumns(['amountInBaseCurrency', 'date', 'categoryId']),
  categories: database.get<CategoryModel>('categories').query().observe(),
  budgets: database
    .get<BudgetModel>('budgets')
    .query(Q.where('isActive', true))
    .observe(),
}))(({ transactions, categories, budgets }: AnalyticsContentProps) => {
  const { top } = useSafeAreaInsets();
  const { defaultCurrency } = useDefaultCurrency();
  const [dateFilter, setDateFilter] = useState<DateFilter>('thisMonth');

  const { fromDate, toDate } = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  const categoryList = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name })),
    [categories]
  );

  // Calculate budget adherence from actual budgets
  const budgetAdherence = useMemo(() => {
    if (budgets.length === 0) return undefined;

    // Calculate how well the user is staying within their total budget
    const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.amount, 0);

    // Get expenses in the selected period
    const periodExpenses = transactions
      .filter((tx) => {
        const txDate = new Date(tx.date).getTime();
        return (
          txDate >= fromDate.getTime() &&
          txDate <= toDate.getTime() &&
          tx.amountInBaseCurrency < 0
        );
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amountInBaseCurrency), 0);

    if (totalBudgetAmount === 0) return undefined;

    // Calculate adherence: 100% = exactly at budget, > 100% = under budget (good), < 100% = over budget
    const usagePercent = (periodExpenses / totalBudgetAmount) * 100;

    // Convert to adherence score: 0-100 where 100 is perfect (at or under budget)
    // If you spend 50% of budget = adherence score of 100 (great)
    // If you spend 100% of budget = adherence score of 80 (okay)
    // If you spend 150% of budget = adherence score of 40 (bad)
    if (usagePercent <= 100) {
      // Under or at budget: score between 80-100
      return Math.round(80 + (100 - usagePercent) * 0.2);
    } else {
      // Over budget: score decreases
      return Math.round(Math.max(0, 80 - (usagePercent - 100) * 0.8));
    }
  }, [budgets, transactions, fromDate, toDate]);

  // Calculate all analytics
  const savingsAnalysis: SavingsRateAnalysis = useMemo(
    () => calculateSavingsRate(transactions, fromDate, toDate),
    [transactions, fromDate, toDate]
  );

  const velocityAnalysis: SpendingVelocityAnalysis = useMemo(
    () => calculateSpendingVelocity(transactions, fromDate, toDate),
    [transactions, fromDate, toDate]
  );

  const ratioAnalysis: IncomeExpenseRatioAnalysis = useMemo(
    () => calculateIncomeExpenseRatio(transactions, fromDate, toDate),
    [transactions, fromDate, toDate]
  );

  const categoryTrends: CategoryTrendAnalysis = useMemo(
    () => calculateCategoryTrends(transactions, fromDate, toDate, categoryList),
    [transactions, fromDate, toDate, categoryList]
  );

  const healthScore: FinancialHealthScore = useMemo(
    () => calculateFinancialHealthScore(transactions, fromDate, toDate, budgetAdherence),
    [transactions, fromDate, toDate, budgetAdherence]
  );

  // Smart Analytics
  const forecast: SpendingForecast = useMemo(
    () => calculateProjectedSpending(transactions),
    [transactions]
  );

  const insights: SmartInsight[] = useMemo(
    () => generateSmartInsights(transactions, defaultCurrency || 'USD', categoryList),
    [transactions, defaultCurrency, categoryList]
  );

  const currency = defaultCurrency || 'USD';

  const hasData = transactions.length > 0;

  return (
    <ScrollView
      paddingTop={top || '$2'}
      backgroundColor="$bgPrimary"
      paddingHorizontal="$2"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        marginBottom="$3"
      >
        <View flexDirection="row" alignItems="center" gap="$2">
          <BarChart3 size={24} color="$stroberi" />
          <Text fontSize="$8" fontWeight="bold">
            Analytics
          </Text>
        </View>
      </View>

      {/* Date Filter Pills */}
      <View flexDirection="row" gap="$2" marginBottom="$4" flexWrap="wrap">
        <FilterPill
          active={dateFilter === 'thisMonth'}
          onPress={() => setDateFilter('thisMonth')}
        >
          This Month
        </FilterPill>
        <FilterPill
          active={dateFilter === 'lastMonth'}
          onPress={() => setDateFilter('lastMonth')}
        >
          Last Month
        </FilterPill>
        <FilterPill
          active={dateFilter === 'last3Months'}
          onPress={() => setDateFilter('last3Months')}
        >
          3 Months
        </FilterPill>
        <FilterPill
          active={dateFilter === 'thisYear'}
          onPress={() => setDateFilter('thisYear')}
        >
          This Year
        </FilterPill>
      </View>

      {!hasData ? (
        <View
          backgroundColor="$gray3"
          padding="$6"
          borderRadius="$4"
          alignItems="center"
          marginTop="$4"
        >
          <BarChart3 size={48} color="$gray8" />
          <Text fontSize="$5" fontWeight="bold" color="$gray11" marginTop="$3">
            No Data Yet
          </Text>
          <Text fontSize="$3" color="$gray10" textAlign="center" marginTop="$1">
            Add some transactions to see your financial insights
          </Text>
        </View>
      ) : (
        <>
          {/* Smart Insights Feed - [NEW] */}
          {dateFilter === 'thisMonth' && <SmartInsightsFeed insights={insights} />}

          {/* Financial Health Score - Featured at top */}
          <FinancialHealthCard score={healthScore} />

          {/* Savings Rate */}
          <SavingsRateCard analysis={savingsAnalysis} currency={currency} />

          {/* Income vs Expense */}
          <IncomeExpenseCard analysis={ratioAnalysis} currency={currency} />

          {/* Spending Velocity - Updated with Forecast */}
          <SpendingVelocityCard
            analysis={velocityAnalysis}
            currency={currency}
            forecast={dateFilter === 'thisMonth' ? forecast : undefined}
          />

          {/* Category Trends */}
          <CategoryTrendsCard analysis={categoryTrends} currency={currency} />
        </>
      )}

      {/* Bottom spacing for tab bar */}
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
