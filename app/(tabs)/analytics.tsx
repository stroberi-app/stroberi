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
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { Button, ScrollView, Separator, Text, View, styled } from 'tamagui';
import type { BudgetModel } from '../../database/budget-model';
import type { CategoryModel } from '../../database/category-model';
import { database } from '../../database/index';
import type { TransactionModel } from '../../database/transaction-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import {
  calculateFinancialHealthScore,
  calculateSavingsRate,
  type FinancialHealthScore,
  type SavingsRateAnalysis,
} from '../../lib/advancedAnalytics';
import { formatCurrency } from '../../lib/format';
import {
  calculateProjectedSpending,
  detectRecurringTransactions,
  type SpendingForecast,
} from '../../lib/forecasting';

type DateFilter =
  | 'thisMonth'
  | 'lastMonth'
  | 'last3Months'
  | 'last6Months'
  | 'thisYear';

type DateRange = {
  fromDate: Date;
  toDate: Date;
  label: string;
};

type ActionPriority = 'high' | 'medium' | 'low';

type ActionPlanItem = {
  id: string;
  title: string;
  description: string;
  impact: string;
  priority: ActionPriority;
};

type CategoryHotspot = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  currentSpend: number;
  previousSpend: number;
  changePercent: number;
  share: number;
  potentialSavings: number;
};

const DATE_FILTER_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: '3 Months' },
  { value: 'last6Months', label: '6 Months' },
  { value: 'thisYear', label: 'This Year' },
];

const getDateRange = (filter: DateFilter): DateRange => {
  const today = dayjs();

  switch (filter) {
    case 'thisMonth':
      return {
        fromDate: today.startOf('month').toDate(),
        toDate: today.endOf('month').toDate(),
        label: 'This month',
      };
    case 'lastMonth':
      return {
        fromDate: today.subtract(1, 'month').startOf('month').toDate(),
        toDate: today.subtract(1, 'month').endOf('month').toDate(),
        label: 'Last month',
      };
    case 'last3Months':
      return {
        fromDate: today.subtract(3, 'month').startOf('month').toDate(),
        toDate: today.endOf('month').toDate(),
        label: 'Last 3 months',
      };
    case 'last6Months':
      return {
        fromDate: today.subtract(6, 'month').startOf('month').toDate(),
        toDate: today.endOf('month').toDate(),
        label: 'Last 6 months',
      };
    case 'thisYear':
      return {
        fromDate: today.startOf('year').toDate(),
        toDate: today.endOf('year').toDate(),
        label: 'This year',
      };
  }
};

const getPreviousRange = (fromDate: Date, comparisonToDate: Date) => {
  const daysInRange = Math.max(
    1,
    dayjs(comparisonToDate).diff(dayjs(fromDate), 'day') + 1
  );
  return {
    previousFromDate: dayjs(fromDate).subtract(daysInRange, 'day').toDate(),
    previousToDate: dayjs(fromDate).subtract(1, 'day').toDate(),
    daysInRange,
  };
};

const calculatePercentChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

const formatSignedCurrency = (value: number, currency: string) => {
  const formatted = formatCurrency(Math.abs(value), currency);
  if (value === 0) {
    return formatCurrency(0, currency);
  }
  return value > 0 ? `+${formatted}` : `-${formatted}`;
};

const getPriorityStyles = (priority: ActionPriority) => {
  switch (priority) {
    case 'high':
      return {
        backgroundColor: 'rgba(229, 75, 75, 0.18)',
        borderColor: '$stroberi',
        textColor: '$stroberi',
        label: 'High impact',
      };
    case 'medium':
      return {
        backgroundColor: 'rgba(234, 179, 8, 0.18)',
        borderColor: '$yellow',
        textColor: '$yellow',
        label: 'Worth doing',
      };
    default:
      return {
        backgroundColor: 'rgba(34, 197, 94, 0.16)',
        borderColor: '$green',
        textColor: '$green',
        label: 'Keep it up',
      };
  }
};

const getForecastState = (forecast: SpendingForecast, budgetLimit?: number) => {
  if (!budgetLimit || budgetLimit <= 0) {
    return {
      label: 'No budget baseline set',
      color: '$gray11',
    };
  }

  if (forecast.status === 'critical') {
    return {
      label: 'Projected to exceed budget',
      color: '$stroberi',
    };
  }

  if (forecast.status === 'warning') {
    return {
      label: 'Close to monthly limit',
      color: '$yellow',
    };
  }

  return {
    label: 'On pace with budget',
    color: '$green',
  };
};

const createCategoryHotspots = (
  periodTransactions: TransactionModel[],
  previousPeriodTransactions: TransactionModel[],
  categories: CategoryModel[]
): CategoryHotspot[] => {
  const currentTotals: Record<string, number> = {};
  const previousTotals: Record<string, number> = {};
  const categoryMeta = new Map(
    categories.map((category) => [
      category.id,
      { name: category.name, icon: category.icon || '•' },
    ])
  );

  const expenseTransactions = periodTransactions.filter(
    (tx) => tx.amountInBaseCurrency < 0
  );
  const previousExpenseTransactions = previousPeriodTransactions.filter(
    (tx) => tx.amountInBaseCurrency < 0
  );

  for (const tx of expenseTransactions) {
    const categoryId = tx.category?.id || 'uncategorized';
    currentTotals[categoryId] =
      (currentTotals[categoryId] || 0) + Math.abs(tx.amountInBaseCurrency);
  }

  for (const tx of previousExpenseTransactions) {
    const categoryId = tx.category?.id || 'uncategorized';
    previousTotals[categoryId] =
      (previousTotals[categoryId] || 0) + Math.abs(tx.amountInBaseCurrency);
  }

  const totalCurrentSpend = Object.values(currentTotals).reduce(
    (sum, value) => sum + value,
    0
  );
  const allCategoryIds = new Set([
    ...Object.keys(currentTotals),
    ...Object.keys(previousTotals),
  ]);

  return Array.from(allCategoryIds)
    .map((categoryId) => {
      const currentSpend = currentTotals[categoryId] || 0;
      const previousSpend = previousTotals[categoryId] || 0;
      const changePercent = calculatePercentChange(currentSpend, previousSpend);
      const share = totalCurrentSpend > 0 ? (currentSpend / totalCurrentSpend) * 100 : 0;
      const potentialSavings =
        previousSpend > 0
          ? Math.max(0, (currentSpend - previousSpend) * 0.75)
          : currentSpend * 0.12;
      const category = categoryMeta.get(categoryId);

      return {
        categoryId,
        categoryName: category?.name || 'Uncategorized',
        categoryIcon: category?.icon || '•',
        currentSpend,
        previousSpend,
        changePercent,
        share,
        potentialSavings,
      };
    })
    .filter((item) => item.currentSpend > 0)
    .sort((a, b) => b.currentSpend - a.currentSpend);
};

const calculateNoSpendStats = (
  periodTransactions: TransactionModel[],
  fromDate: Date,
  toDate: Date
) => {
  const expenseDaySet = new Set<string>();

  for (const transaction of periodTransactions) {
    if (transaction.amountInBaseCurrency < 0) {
      expenseDaySet.add(dayjs(transaction.date).format('YYYY-MM-DD'));
    }
  }

  const totalDays = Math.max(1, dayjs(toDate).diff(dayjs(fromDate), 'day') + 1);
  let noSpendDays = 0;
  let bestNoSpendStreak = 0;
  let currentStreak = 0;

  for (let i = 0; i < totalDays; i++) {
    const dayKey = dayjs(fromDate).add(i, 'day').format('YYYY-MM-DD');
    const spent = expenseDaySet.has(dayKey);
    if (spent) {
      currentStreak = 0;
      continue;
    }

    noSpendDays += 1;
    currentStreak += 1;
    if (currentStreak > bestNoSpendStreak) {
      bestNoSpendStreak = currentStreak;
    }
  }

  return { noSpendDays, bestNoSpendStreak, totalDays };
};

const buildActionPlan = ({
  currency,
  periodNet,
  daysInPeriod,
  daysRemainingInPeriod,
  isCurrentPeriod,
  forecast,
  budgetLimit,
  categoryHotspots,
  noSpendDays,
  savingsRate,
  upcomingBillsCount,
}: {
  currency: string;
  periodNet: number;
  daysInPeriod: number;
  daysRemainingInPeriod: number;
  isCurrentPeriod: boolean;
  forecast: SpendingForecast;
  budgetLimit?: number;
  categoryHotspots: CategoryHotspot[];
  noSpendDays: number;
  savingsRate: number;
  upcomingBillsCount: number;
}): ActionPlanItem[] => {
  const actions: ActionPlanItem[] = [];

  if (
    isCurrentPeriod &&
    budgetLimit &&
    budgetLimit > 0 &&
    (forecast.status === 'warning' || forecast.status === 'critical')
  ) {
    const overrun = Math.max(0, forecast.projectedSpend - budgetLimit);
    actions.push({
      id: 'budget-runway',
      title: 'Protect this month budget',
      description:
        forecast.status === 'critical'
          ? `At current pace you may overshoot by ${formatCurrency(overrun, currency)}.`
          : 'You are nearing the monthly budget ceiling.',
      impact:
        forecast.daysRemaining > 0
          ? `Cap daily spend near ${formatCurrency(
              Math.max(0, (budgetLimit - forecast.currentSpend) / forecast.daysRemaining),
              currency
            )}`
          : 'Review month-end spend',
      priority: forecast.status === 'critical' ? 'high' : 'medium',
    });
  }

  if (isCurrentPeriod && periodNet < 0 && daysRemainingInPeriod > 0) {
    const neededDailyShift = Math.abs(periodNet) / daysRemainingInPeriod;
    actions.push({
      id: 'cashflow-shift',
      title: 'Restore positive cashflow',
      description: `You are negative ${formatCurrency(Math.abs(periodNet), currency)} in this period.`,
      impact: `Reduce daily spend by ${formatCurrency(neededDailyShift, currency)}`,
      priority: 'high',
    });
  }

  const topOpportunity = categoryHotspots.find(
    (item) => item.potentialSavings > 0 && item.currentSpend > 0
  );
  if (topOpportunity) {
    actions.push({
      id: 'category-focus',
      title: `Trim ${topOpportunity.categoryName}`,
      description: `${topOpportunity.categoryName} rose ${Math.round(
        topOpportunity.changePercent
      )}% vs previous period.`,
      impact: `Potential savings: ${formatCurrency(topOpportunity.potentialSavings, currency)}`,
      priority: topOpportunity.changePercent > 25 ? 'high' : 'medium',
    });
  }

  const targetNoSpendDays = Math.max(2, Math.round(daysInPeriod * 0.25));
  if (noSpendDays < targetNoSpendDays) {
    actions.push({
      id: 'no-spend-days',
      title: 'Add no-spend days',
      description: `You logged ${noSpendDays} no-spend days out of ${daysInPeriod}.`,
      impact: `Aim for ${targetNoSpendDays} no-spend days this period`,
      priority: 'medium',
    });
  }

  if (upcomingBillsCount > 0) {
    actions.push({
      id: 'upcoming-bills',
      title: 'Prepare for recurring bills',
      description: `${upcomingBillsCount} expected recurring charge(s) in the next 30 days.`,
      impact: 'Set aside cash before due dates',
      priority: 'medium',
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'steady',
      title: 'Maintain your momentum',
      description:
        savingsRate >= 15
          ? 'Savings rate is strong. Keep your current habits consistent.'
          : 'Spending and income are balanced right now.',
      impact:
        savingsRate >= 15
          ? 'Keep saving at the current pace'
          : 'Try to lift savings rate by 2-3%',
      priority: 'low',
    });
  }

  return actions.slice(0, 4);
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

  const { fromDate, toDate, label } = useMemo(() => getDateRange(dateFilter), [dateFilter]);
  const comparisonToDate = useMemo(() => {
    const now = dayjs().endOf('day');
    return dayjs(toDate).isAfter(now) ? now.toDate() : toDate;
  }, [toDate]);

  const previousRange = useMemo(
    () => getPreviousRange(fromDate, comparisonToDate),
    [fromDate, comparisonToDate]
  );

  const periodTransactions = useMemo(
    () =>
      transactions.filter((tx) => {
        const txDate = new Date(tx.date).getTime();
        return txDate >= fromDate.getTime() && txDate <= comparisonToDate.getTime();
      }),
    [transactions, fromDate, comparisonToDate]
  );

  const previousPeriodTransactions = useMemo(
    () =>
      transactions.filter((tx) => {
        const txDate = new Date(tx.date).getTime();
        return (
          txDate >= previousRange.previousFromDate.getTime() &&
          txDate <= previousRange.previousToDate.getTime()
        );
      }),
    [transactions, previousRange]
  );

  const periodTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;

    for (const transaction of periodTransactions) {
      const amount = transaction.amountInBaseCurrency;
      if (amount >= 0) {
        income += amount;
      } else {
        expenses += Math.abs(amount);
      }
    }

    return {
      income,
      expenses,
      net: income - expenses,
    };
  }, [periodTransactions]);

  const previousPeriodTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;

    for (const transaction of previousPeriodTransactions) {
      const amount = transaction.amountInBaseCurrency;
      if (amount >= 0) {
        income += amount;
      } else {
        expenses += Math.abs(amount);
      }
    }

    return {
      income,
      expenses,
      net: income - expenses,
    };
  }, [previousPeriodTransactions]);

  const expenseChangePercent = useMemo(
    () => calculatePercentChange(periodTotals.expenses, previousPeriodTotals.expenses),
    [periodTotals.expenses, previousPeriodTotals.expenses]
  );

  const monthBudgetLimit = useMemo(() => {
    if (budgets.length === 0) {
      return undefined;
    }
    const total = budgets.reduce((sum, budget) => sum + budget.amount, 0);
    return total > 0 ? total : undefined;
  }, [budgets]);

  const periodBudgetLimit = useMemo(() => {
    if (!monthBudgetLimit) {
      return undefined;
    }
    const monthsCovered = Math.max(
      1,
      dayjs(comparisonToDate).diff(dayjs(fromDate), 'month') + 1
    );
    return monthBudgetLimit * monthsCovered;
  }, [monthBudgetLimit, fromDate, comparisonToDate]);

  const budgetAdherence = useMemo(() => {
    if (!periodBudgetLimit || periodBudgetLimit <= 0) {
      return undefined;
    }
    const usagePercent = (periodTotals.expenses / periodBudgetLimit) * 100;
    if (usagePercent <= 100) {
      return Math.round(80 + (100 - usagePercent) * 0.2);
    }
    return Math.round(Math.max(0, 80 - (usagePercent - 100) * 0.8));
  }, [periodTotals.expenses, periodBudgetLimit]);

  const savingsAnalysis: SavingsRateAnalysis = useMemo(
    () => calculateSavingsRate(transactions, fromDate, toDate),
    [transactions, fromDate, toDate]
  );

  const healthScore: FinancialHealthScore = useMemo(
    () => calculateFinancialHealthScore(transactions, fromDate, toDate, budgetAdherence),
    [transactions, fromDate, toDate, budgetAdherence]
  );

  const forecast: SpendingForecast = useMemo(
    () => calculateProjectedSpending(transactions, monthBudgetLimit),
    [transactions, monthBudgetLimit]
  );

  const categoryHotspots = useMemo(
    () => createCategoryHotspots(periodTransactions, previousPeriodTransactions, categories),
    [periodTransactions, previousPeriodTransactions, categories]
  );

  const noSpendStats = useMemo(
    () => calculateNoSpendStats(periodTransactions, fromDate, comparisonToDate),
    [periodTransactions, fromDate, comparisonToDate]
  );

  const upcomingRecurring = useMemo(
    () =>
      detectRecurringTransactions(transactions)
        .filter((item) => {
          const dueDate = dayjs(item.predictedDate);
          const daysUntil = dueDate.diff(dayjs(), 'day');
          return daysUntil >= 0 && daysUntil <= 30;
        })
        .sort((a, b) => a.predictedDate.getTime() - b.predictedDate.getTime())
        .slice(0, 4),
    [transactions]
  );

  const isCurrentPeriod = useMemo(() => {
    const today = dayjs();
    return (
      today.isAfter(dayjs(fromDate).subtract(1, 'day')) &&
      today.isBefore(dayjs(toDate).add(1, 'day'))
    );
  }, [fromDate, toDate]);

  const daysRemainingInPeriod = useMemo(() => {
    if (!isCurrentPeriod) {
      return 0;
    }
    return Math.max(1, dayjs(toDate).diff(dayjs().startOf('day'), 'day') + 1);
  }, [isCurrentPeriod, toDate]);

  const actionPlan = useMemo(
    () =>
      buildActionPlan({
        currency: defaultCurrency || 'USD',
        periodNet: periodTotals.net,
        daysInPeriod: previousRange.daysInRange,
        daysRemainingInPeriod,
        isCurrentPeriod,
        forecast,
        budgetLimit: monthBudgetLimit,
        categoryHotspots,
        noSpendDays: noSpendStats.noSpendDays,
        savingsRate: savingsAnalysis.savingsRate,
        upcomingBillsCount: upcomingRecurring.length,
      }),
    [
      defaultCurrency,
      periodTotals.net,
      previousRange.daysInRange,
      daysRemainingInPeriod,
      isCurrentPeriod,
      forecast,
      monthBudgetLimit,
      categoryHotspots,
      noSpendStats.noSpendDays,
      savingsAnalysis.savingsRate,
      upcomingRecurring.length,
    ]
  );

  const pulseState = useMemo(() => {
    if (
      healthScore.overallScore >= 80 &&
      savingsAnalysis.savingsRate >= 10 &&
      periodTotals.net >= 0
    ) {
      return {
        label: 'Strong',
        description: 'Your money habits are working in your favor.',
        color: '$green',
        bg: 'rgba(34, 197, 94, 0.16)',
      };
    }

    if (periodTotals.net >= 0 && healthScore.overallScore >= 65) {
      return {
        label: 'Stable',
        description: 'You are on track, but there is room to optimize.',
        color: '$yellow',
        bg: 'rgba(234, 179, 8, 0.16)',
      };
    }

    return {
      label: 'Needs Attention',
      description: 'Spending pressure is increasing in this period.',
      color: '$stroberi',
      bg: 'rgba(229, 75, 75, 0.16)',
    };
  }, [healthScore.overallScore, savingsAnalysis.savingsRate, periodTotals.net]);

  const potentialMonthlySavings = useMemo(
    () =>
      categoryHotspots
        .slice(0, 3)
        .reduce((sum, hotspot) => sum + hotspot.potentialSavings, 0),
    [categoryHotspots]
  );

  const forecastState = useMemo(
    () => getForecastState(forecast, monthBudgetLimit),
    [forecast, monthBudgetLimit]
  );

  const currency = defaultCurrency || 'USD';
  const hasAnyData = transactions.length > 0;
  const hasPeriodData = periodTransactions.length > 0;

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
                <View
                  flexDirection="row"
                  alignItems="center"
                  gap="$2"
                  marginBottom="$2"
                >
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
                  vs prev: {formatSignedCurrency(periodTotals.net - previousPeriodTotals.net, currency)}
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
                      : Math.min(100, (forecast.currentSpend / Math.max(forecast.projectedSpend, 1)) * 100)
                  }%`}
                  backgroundColor={forecast.status === 'critical' ? '$stroberi' : '$green'}
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
                    <Text fontSize="$2" color={style.textColor} marginTop="$1.5" fontWeight="700">
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
                  <Text fontSize="$3" color="white" fontWeight="600" flex={1} numberOfLines={1}>
                    {item.categoryIcon} {item.categoryName}
                  </Text>
                  <Text fontSize="$3" color="white" fontWeight="700">
                    {formatCurrency(item.currentSpend, currency)}
                  </Text>
                </View>
                <View height={7} backgroundColor="$gray5" borderRadius={4} overflow="hidden">
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
                  No recurring expenses detected yet. Add merchant names to improve bill predictions.
                </Text>
              </View>
            ) : (
              upcomingRecurring.map((item, index) => {
                const daysUntil = dayjs(item.predictedDate).diff(dayjs(), 'day');
                return (
                  <View key={`${item.merchant}-${item.predictedDate.toISOString()}`}>
                    {index > 0 && <Separator marginVertical="$2.5" borderColor="$gray5" />}
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
