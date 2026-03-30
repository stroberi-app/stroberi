import dayjs from 'dayjs';
import { useMemo } from 'react';
import type { BudgetModel } from '../database/budget-model';
import type { BudgetCategoryModel } from '../database/budget-category-model';
import type { CategoryModel } from '../database/category-model';
import type { TransactionModel } from '../database/transaction-model';
import {
  calculateFinancialHealthScore,
  calculateSavingsRate,
  type FinancialHealthScore,
  type SavingsRateAnalysis,
} from '../lib/advancedAnalytics';
import {
  buildActionPlan,
  calculateNoSpendStats,
  calculatePercentChange,
  calculatePeriodTotals,
  calculatePotentialMonthlySavings,
  calculateGlobalMonthlyBudgetLimit,
  createCategoryHotspots,
  derivePulseState,
  filterTransactionsByDateRange,
  getDateRange,
  getForecastState,
  getPreviousRange,
  type DateFilter,
} from '../lib/analyticsOverview';
import {
  calculateProjectedSpending,
  detectRecurringTransactions,
  type SpendingForecast,
} from '../lib/forecasting';

type UseAnalyticsOverviewArgs = {
  transactions: TransactionModel[];
  categories: CategoryModel[];
  budgets: BudgetModel[];
  budgetCategories: BudgetCategoryModel[];
  defaultCurrency: string | null;
  dateFilter: DateFilter;
};

export const useAnalyticsOverview = ({
  transactions,
  categories,
  budgets,
  budgetCategories,
  defaultCurrency,
  dateFilter,
}: UseAnalyticsOverviewArgs) => {
  const { fromDate, toDate, label } = useMemo(
    () => getDateRange(dateFilter),
    [dateFilter]
  );
  const comparisonToDate = useMemo(() => {
    const now = dayjs().endOf('day');
    return dayjs(toDate).isAfter(now) ? now.toDate() : toDate;
  }, [toDate]);
  const previousRange = useMemo(
    () => getPreviousRange(fromDate, comparisonToDate),
    [fromDate, comparisonToDate]
  );
  const periodTransactions = useMemo(
    () => filterTransactionsByDateRange(transactions, fromDate, comparisonToDate),
    [transactions, fromDate, comparisonToDate]
  );
  const previousPeriodTransactions = useMemo(
    () =>
      filterTransactionsByDateRange(
        transactions,
        previousRange.previousFromDate,
        previousRange.previousToDate
      ),
    [transactions, previousRange]
  );
  const periodTotals = useMemo(
    () => calculatePeriodTotals(periodTransactions),
    [periodTransactions]
  );
  const previousPeriodTotals = useMemo(
    () => calculatePeriodTotals(previousPeriodTransactions),
    [previousPeriodTransactions]
  );
  const expenseChangePercent = useMemo(
    () => calculatePercentChange(periodTotals.expenses, previousPeriodTotals.expenses),
    [periodTotals.expenses, previousPeriodTotals.expenses]
  );
  const monthBudgetLimit = useMemo(() => {
    return calculateGlobalMonthlyBudgetLimit(budgets, budgetCategories);
  }, [budgets, budgetCategories]);
  const periodBudgetLimit = useMemo(() => {
    if (!monthBudgetLimit) {
      return undefined;
    }

    const monthsCovered = Math.max(
      1,
      dayjs(comparisonToDate).diff(dayjs(fromDate), 'month') + 1
    );

    return monthBudgetLimit * monthsCovered;
  }, [monthBudgetLimit, comparisonToDate, fromDate]);
  const budgetAdherence = useMemo(() => {
    if (!periodBudgetLimit || periodBudgetLimit <= 0) {
      return undefined;
    }

    const usagePercent = (periodTotals.expenses / periodBudgetLimit) * 100;
    if (usagePercent <= 100) {
      return Math.round(80 + (100 - usagePercent) * 0.2);
    }

    return Math.round(Math.max(0, 80 - (usagePercent - 100) * 0.8));
  }, [periodBudgetLimit, periodTotals.expenses]);
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
    () =>
      createCategoryHotspots(periodTransactions, previousPeriodTransactions, categories),
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
        .sort(
          (left, right) => left.predictedDate.getTime() - right.predictedDate.getTime()
        )
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
  const currency = defaultCurrency || 'USD';
  const actionPlan = useMemo(
    () =>
      buildActionPlan({
        currency,
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
      categoryHotspots,
      currency,
      daysRemainingInPeriod,
      forecast,
      isCurrentPeriod,
      monthBudgetLimit,
      noSpendStats.noSpendDays,
      periodTotals.net,
      previousRange.daysInRange,
      savingsAnalysis.savingsRate,
      upcomingRecurring.length,
    ]
  );
  const pulseState = useMemo(
    () =>
      derivePulseState({
        overallScore: healthScore.overallScore,
        savingsRate: savingsAnalysis.savingsRate,
        periodNet: periodTotals.net,
      }),
    [healthScore.overallScore, savingsAnalysis.savingsRate, periodTotals.net]
  );
  const potentialMonthlySavings = useMemo(
    () => calculatePotentialMonthlySavings(categoryHotspots),
    [categoryHotspots]
  );
  const forecastState = useMemo(
    () => getForecastState(forecast, monthBudgetLimit),
    [forecast, monthBudgetLimit]
  );

  return {
    actionPlan,
    categoryHotspots,
    comparisonToDate,
    currency,
    daysRemainingInPeriod,
    expenseChangePercent,
    forecast,
    forecastState,
    fromDate,
    hasAnyData: transactions.length > 0,
    hasPeriodData: periodTransactions.length > 0,
    healthScore,
    isCurrentPeriod,
    label,
    monthBudgetLimit,
    noSpendStats,
    periodTotals,
    periodTransactions,
    potentialMonthlySavings,
    previousPeriodTotals,
    previousPeriodTransactions,
    previousRange,
    pulseState,
    savingsAnalysis,
    toDate,
    upcomingRecurring,
  };
};
