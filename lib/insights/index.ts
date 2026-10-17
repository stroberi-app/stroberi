import {
  buildDataQualitySummary,
  buildSpendingLeaks,
  generateCategoryPaceInsights,
  generateDataQualityInsights,
  generateSmallPurchaseInsights,
  rankInsights,
} from './generators';
import { filterByDateRange } from '../ledger';
import { calculateMonthForecast, calculateSafeToSpend } from './safeToSpend';
import { sumExpenses } from './shared';
import type { InsightCategory, InsightTransaction, InsightsOverview } from './types';
import { buildWeeklyRecap } from './weeklyRecap';

export type BuildInsightsOverviewArgs = {
  transactions: InsightTransaction[];
  categories: InsightCategory[];
  fromDate: Date;
  toDate: Date;
  comparisonToDate: Date;
  previousFromDate: Date;
  previousToDate: Date;
  today: Date;
  currency: string;
  budgetLimit?: number;
  expectedRecurring: number;
};

export const buildInsightsOverview = ({
  transactions,
  categories,
  fromDate,
  toDate,
  comparisonToDate,
  previousFromDate,
  previousToDate,
  today,
  currency,
  budgetLimit,
  expectedRecurring,
}: BuildInsightsOverviewArgs): InsightsOverview => {
  const currentTransactions = filterByDateRange(transactions, fromDate, comparisonToDate);
  const previousTransactions = filterByDateRange(
    transactions,
    previousFromDate,
    previousToDate
  );
  const dataQuality = buildDataQualitySummary(currentTransactions);
  const safeToSpend = calculateSafeToSpend({
    transactions,
    fromDate,
    toDate,
    today,
    budgetLimit,
    expectedRecurring,
  });
  const forecast = calculateMonthForecast({
    currentSpend: sumExpenses(currentTransactions),
    budgetLimit,
    fromDate,
    toDate,
    today,
    dataConfidence: dataQuality.confidence,
  });
  const weeklyRecap = buildWeeklyRecap({ transactions, categories, today, currency });
  const spendingLeaks = buildSpendingLeaks(currentTransactions);
  const insights = rankInsights([
    ...generateCategoryPaceInsights({
      currentTransactions,
      previousTransactions,
      categories,
      currency,
    }),
    ...generateSmallPurchaseInsights({
      currentTransactions,
      currency,
      fromDate,
      toDate: comparisonToDate,
    }),
    ...generateDataQualityInsights(dataQuality, currency),
  ]);

  return {
    safeToSpend,
    forecast,
    weeklyRecap,
    insights,
    spendingLeaks,
    dataQuality,
  };
};

export type {
  DataQualitySummary,
  InsightAction,
  InsightCategory,
  InsightTransaction,
  InsightsOverview,
  MoneyInsight,
  MonthForecast,
  SafeToSpendSummary,
  SpendingLeak,
  WeeklyRecap,
} from './types';
