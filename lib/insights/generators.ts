import type {
  DataQualitySummary,
  InsightCategory,
  InsightTransaction,
  MoneyInsight,
  SpendingLeak,
} from './types';

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

const sumExpenses = (transactions: InsightTransaction[]) =>
  Math.round(
    transactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Math.abs(transaction.amountInBaseCurrency), 0)
  );

const groupByCategory = (transactions: InsightTransaction[]) => {
  const totals = new Map<string, { amount: number; ids: string[] }>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue;
    }

    const key = transaction.categoryId ?? 'uncategorized';
    const existing = totals.get(key) ?? { amount: 0, ids: [] };
    totals.set(key, {
      amount: existing.amount + Math.abs(transaction.amountInBaseCurrency),
      ids: [...existing.ids, transaction.id],
    });
  }

  return totals;
};

const categoryName = (categories: InsightCategory[], categoryId: string) =>
  categories.find((category) => category.id === categoryId)?.name ?? 'Unknown category';

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
    if (categoryId === 'uncategorized') {
      continue;
    }

    const previousValue = previous.get(categoryId)?.amount ?? 0;
    if (previousValue <= 0 || currentValue.amount < previousValue * 1.25) {
      continue;
    }

    const changePercent = Math.round(
      ((currentValue.amount - previousValue) / previousValue) * 100
    );
    const label = categoryName(categories, categoryId);

    insights.push({
      id: `category-spike-${categoryId}`,
      type: 'categorySpike',
      title: `${label} is running higher than usual`,
      body: `${label} is ${changePercent}% above the previous comparable period (${formatAmount(currentValue.amount, currency)} vs ${formatAmount(previousValue, currency)}).`,
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

export const generatePositiveTrendInsights = ({
  currentTransactions,
  previousTransactions,
  categories,
  currency,
}: CategoryInsightArgs): MoneyInsight[] => {
  const current = groupByCategory(currentTransactions);
  const previous = groupByCategory(previousTransactions);
  const insights: MoneyInsight[] = [];

  for (const [categoryId, previousValue] of previous.entries()) {
    if (categoryId === 'uncategorized' || previousValue.amount < 40) {
      continue;
    }

    const currentAmount = current.get(categoryId)?.amount ?? 0;
    if (currentAmount > previousValue.amount * 0.75) {
      continue;
    }

    const saved = Math.round(previousValue.amount - currentAmount);
    const label = categoryName(categories, categoryId);

    insights.push({
      id: `positive-trend-${categoryId}`,
      type: 'positiveTrend',
      title: `${label} improved`,
      body: `${label} is ${formatAmount(saved, currency)} lower than the previous comparable period. Nice work.`,
      severity: 'positive',
      confidence: 'medium',
      priority: Math.min(80, 35 + saved),
      amount: saved,
      categoryId,
      evidence: {
        current: Math.round(currentAmount),
        baseline: Math.round(previousValue.amount),
        transactionIds: current.get(categoryId)?.ids ?? [],
      },
      actions: [{ type: 'viewTransactions', label: 'See what changed', categoryId }],
    });
  }

  return insights;
};

type SmallPurchaseArgs = {
  currentTransactions: InsightTransaction[];
  currency: string;
  threshold?: number;
  minimumCount?: number;
};

export const generateSmallPurchaseInsights = ({
  currentTransactions,
  currency,
  threshold = 8,
  minimumCount = 5,
}: SmallPurchaseArgs): MoneyInsight[] => {
  const smallPurchases = currentTransactions.filter(
    (transaction) =>
      transaction.type === 'expense' &&
      Math.abs(transaction.amountInBaseCurrency) <= threshold
  );

  if (smallPurchases.length < minimumCount) {
    return [];
  }

  const amount = sumExpenses(smallPurchases);

  return [
    {
      id: 'small-purchases',
      type: 'smallPurchases',
      title: 'Small purchases are adding up',
      body: `${smallPurchases.length} purchases under ${formatAmount(threshold, currency)} added up to ${formatAmount(amount, currency)}.`,
      severity: 'neutral',
      confidence: 'high',
      priority: Math.min(75, 30 + amount),
      amount,
      evidence: {
        current: amount,
        transactionIds: smallPurchases.map((transaction) => transaction.id),
      },
      actions: [{ type: 'viewTransactions', label: 'Review small purchases' }],
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
  const uncategorizedAmount = sumExpenses(uncategorized);
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

  return [
    {
      id: 'data-quality-uncategorized',
      type: 'dataQuality',
      title: 'Some transactions need categories',
      body: `${dataQuality.uncategorizedCount} uncategorized transactions (${formatAmount(dataQuality.uncategorizedAmount, currency)}) are making insights less accurate.`,
      severity: 'neutral',
      confidence: 'high',
      priority: Math.min(85, 45 + dataQuality.uncategorizedCount * 4),
      amount: dataQuality.uncategorizedAmount,
      evidence: {
        current: dataQuality.uncategorizedCount,
        baseline: dataQuality.transactionCount,
      },
      actions: [{ type: 'fixCategories', label: 'Fix categories' }],
    },
  ];
};

export const buildSpendingLeaks = (
  currentTransactions: InsightTransaction[]
): SpendingLeak[] => {
  const smallPurchases = currentTransactions.filter(
    (transaction) =>
      transaction.type === 'expense' && Math.abs(transaction.amountInBaseCurrency) <= 8
  );

  if (smallPurchases.length < 5) {
    return [];
  }

  return [
    {
      id: 'leak-tiny-purchases',
      type: 'tinyPurchases',
      title: 'Frequent small purchases',
      monthlyImpact: sumExpenses(smallPurchases),
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
