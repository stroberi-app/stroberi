import {
  categoryLabel,
  findSmallPurchases,
  formatWholeAmount,
  SMALL_PURCHASE_MIN_COUNT,
  SMALL_PURCHASE_THRESHOLD,
  sumExpenses,
  UNCATEGORIZED_KEY,
} from './shared';
import type {
  DataQualitySummary,
  InsightCategory,
  InsightTransaction,
  MoneyInsight,
  SpendingLeak,
} from './types';

const roundedExpenses = (transactions: InsightTransaction[]) =>
  Math.round(sumExpenses(transactions));

const groupByCategory = (transactions: InsightTransaction[]) => {
  const totals = new Map<string, { amount: number; ids: string[] }>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue;
    }

    const key = transaction.categoryId ?? UNCATEGORIZED_KEY;
    const existing = totals.get(key) ?? { amount: 0, ids: [] };
    totals.set(key, {
      amount: existing.amount + Math.abs(transaction.amountInBaseCurrency),
      ids: [...existing.ids, transaction.id],
    });
  }

  return totals;
};

type CategoryInsightArgs = {
  currentTransactions: InsightTransaction[];
  previousTransactions: InsightTransaction[];
  categories: InsightCategory[];
  currency: string;
};

export const generateCategoryPaceInsights = ({
  currentTransactions,
  previousTransactions,
  categories,
  currency,
}: CategoryInsightArgs): MoneyInsight[] => {
  const current = groupByCategory(currentTransactions);
  const previous = groupByCategory(previousTransactions);
  const insights: MoneyInsight[] = [];

  for (const [categoryId, currentValue] of current.entries()) {
    if (categoryId === UNCATEGORIZED_KEY) {
      continue;
    }

    const previousValue = previous.get(categoryId)?.amount ?? 0;
    if (previousValue <= 0 || currentValue.amount < previousValue * 1.25) {
      continue;
    }

    const changePercent = Math.round(
      ((currentValue.amount - previousValue) / previousValue) * 100
    );
    const label = categoryLabel(categories, categoryId);

    insights.push({
      id: `category-spike-${categoryId}`,
      type: 'categorySpike',
      title: `${label} is running higher than usual`,
      body: `${label} is ${changePercent}% above the previous comparable period (${formatWholeAmount(currentValue.amount, currency)} vs ${formatWholeAmount(previousValue, currency)}).`,
      severity: changePercent >= 200 ? 'critical' : 'warning',
      confidence: 'medium',
      priority: Math.min(95, 50 + changePercent),
      amount: Math.round(currentValue.amount - previousValue),
      categoryId,
      evidence: {
        current: Math.round(currentValue.amount),
        baseline: Math.round(previousValue),
        changePercent,
        transactionIds: currentValue.ids,
      },
      actions: [{ type: 'viewTransactions', label: 'Review transactions', categoryId }],
    });
  }

  return insights;
};

type SmallPurchaseArgs = {
  currentTransactions: InsightTransaction[];
  currency: string;
  fromDate: Date;
  toDate: Date;
  threshold?: number;
  minimumCount?: number;
};

export const generateSmallPurchaseInsights = ({
  currentTransactions,
  currency,
  fromDate,
  toDate,
  threshold = SMALL_PURCHASE_THRESHOLD,
  minimumCount = SMALL_PURCHASE_MIN_COUNT,
}: SmallPurchaseArgs): MoneyInsight[] => {
  const smallPurchases = findSmallPurchases(currentTransactions, threshold);

  if (smallPurchases.length < minimumCount) {
    return [];
  }

  const amount = roundedExpenses(smallPurchases);

  return [
    {
      id: 'small-purchases',
      type: 'smallPurchases',
      title: 'Small purchases are adding up',
      body: `${smallPurchases.length} purchases under ${formatWholeAmount(threshold, currency)} added up to ${formatWholeAmount(amount, currency)}.`,
      severity: 'neutral',
      confidence: 'high',
      priority: Math.min(75, 30 + amount),
      amount,
      evidence: {
        current: amount,
        transactionIds: smallPurchases.map((transaction) => transaction.id),
      },
      actions: [
        {
          type: 'viewTransactions',
          label: 'Review small purchases',
          maxExpenseAmount: threshold,
          fromDate,
          toDate,
        },
      ],
    },
  ];
};

export const buildDataQualitySummary = (
  transactions: InsightTransaction[]
): DataQualitySummary => {
  const uncategorized = transactions.filter(
    (transaction) => transaction.type === 'expense' && !transaction.categoryId
  );
  const transactionCount = transactions.length;
  const uncategorizedCount = uncategorized.length;
  const uncategorizedAmount = roundedExpenses(uncategorized);
  const ratio = transactionCount === 0 ? 0 : uncategorizedCount / transactionCount;

  return {
    uncategorizedCount,
    uncategorizedAmount,
    transactionCount,
    confidence: ratio > 0.25 ? 'low' : transactionCount >= 30 ? 'high' : 'medium',
  };
};

export const generateDataQualityInsights = (
  dataQuality: DataQualitySummary,
  currency: string
): MoneyInsight[] => {
  if (dataQuality.uncategorizedCount === 0) {
    return [];
  }

  const { uncategorizedCount } = dataQuality;
  const transactionLabel =
    uncategorizedCount === 1 ? 'transaction needs' : 'transactions need';
  const categorizeLabel = uncategorizedCount === 1 ? 'Categorize it' : 'Categorize them';

  return [
    {
      id: 'data-quality-uncategorized',
      type: 'dataQuality',
      title: `${uncategorizedCount} ${transactionLabel} a category`,
      body: `${formatWholeAmount(dataQuality.uncategorizedAmount, currency)} is unsorted. ${categorizeLabel} to unlock accurate insights.`,
      severity: 'neutral',
      confidence: dataQuality.confidence,
      priority: Math.min(85, 45 + uncategorizedCount * 4),
      amount: dataQuality.uncategorizedAmount,
      evidence: {
        current: uncategorizedCount,
        baseline: dataQuality.transactionCount,
      },
      actions: [{ type: 'fixCategories', label: 'Categorize now' }],
    },
  ];
};

export const buildSpendingLeaks = (
  currentTransactions: InsightTransaction[]
): SpendingLeak[] => {
  const smallPurchases = findSmallPurchases(currentTransactions);

  if (smallPurchases.length < SMALL_PURCHASE_MIN_COUNT) {
    return [];
  }

  return [
    {
      id: 'leak-tiny-purchases',
      type: 'tinyPurchases',
      title: 'Frequent small purchases',
      monthlyImpact: roundedExpenses(smallPurchases),
      confidence: 'high',
      transactions: smallPurchases.map((transaction) => transaction.id),
      action: { type: 'viewTransactions', label: 'Review small purchases' },
    },
  ];
};

export const rankInsights = (insights: MoneyInsight[], limit = 7): MoneyInsight[] => {
  const sorted = [...insights].sort((left, right) => right.priority - left.priority);
  const selected: MoneyInsight[] = [];
  const usedTypes = new Set<string>();

  for (const insight of sorted) {
    if (selected.length >= limit) {
      break;
    }

    if (usedTypes.has(insight.type)) {
      continue;
    }

    selected.push(insight);
    usedTypes.add(insight.type);
  }

  if (selected.length < limit) {
    for (const insight of sorted) {
      if (selected.length >= limit) {
        break;
      }

      if (!selected.some((item) => item.id === insight.id)) {
        selected.push(insight);
      }
    }
  }

  return selected;
};
