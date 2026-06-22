import {
  buildDataQualitySummary,
  buildSpendingLeaks,
  generateCategoryPaceInsights,
  generateDataQualityInsights,
  generateSmallPurchaseInsights,
  rankInsights,
} from './generators';
import { calculateMonthForecast, calculateSafeToSpend } from './safeToSpend';
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

const inRange = (transaction: InsightTransaction, fromDate: Date, toDate: Date) => {
  const time = transaction.date.getTime();
  return time >= fromDate.getTime() && time <= toDate.getTime();
};

const sumCurrentSpend = (transactions: InsightTransaction[]) =>
  transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Math.abs(transaction.amountInBaseCurrency), 0);

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
  const currentTransactions = transactions.filter((transaction) =>
    inRange(transaction, fromDate, comparisonToDate)
  );
  const previousTransactions = transactions.filter((transaction) =>
    inRange(transaction, previousFromDate, previousToDate)
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
    currentSpend: sumCurrentSpend(currentTransactions),
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
    ...generateSmallPurchaseInsights({ currentTransactions, currency }),
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
