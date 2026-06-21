import type {
  InsightCategory,
  InsightTransaction,
  RecapItem,
  WeeklyRecap,
} from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const endOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

const money = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(Math.abs(value)));

const sumExpenses = (transactions: InsightTransaction[]) =>
  transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Math.abs(transaction.amountInBaseCurrency), 0);

const inRange = (transaction: InsightTransaction, fromDate: Date, toDate: Date) => {
  const time = transaction.date.getTime();
  return time >= fromDate.getTime() && time <= toDate.getTime();
};

const categoryName = (categories: InsightCategory[], categoryId: string | null) => {
  if (!categoryId) {
    return 'Uncategorized';
  }

  return (
    categories.find((category) => category.id === categoryId)?.name ?? 'Unknown category'
  );
};

const totalsByCategory = (
  transactions: InsightTransaction[],
  categories: InsightCategory[]
) => {
  const totals = new Map<string, RecapItem>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue;
    }

    const key = transaction.categoryId ?? 'uncategorized';
    const existing = totals.get(key);
    totals.set(key, {
      label: categoryName(categories, transaction.categoryId),
      amount: (existing?.amount ?? 0) + Math.abs(transaction.amountInBaseCurrency),
      changeAmount: 0,
      categoryId: transaction.categoryId ?? undefined,
    });
  }

  return totals;
};

type BuildWeeklyRecapArgs = {
  transactions: InsightTransaction[];
  categories: InsightCategory[];
  today: Date;
  currency: string;
};

export const buildWeeklyRecap = ({
  transactions,
  categories,
  today,
  currency,
}: BuildWeeklyRecapArgs): WeeklyRecap => {
  const currentEnd = endOfUtcDay(today);
  const currentStart = new Date(startOfUtcDay(today).getTime() - 6 * MS_PER_DAY);
  const previousStart = new Date(currentStart.getTime() - 7 * MS_PER_DAY);
  const previousEnd = new Date(currentStart.getTime() - 1);

  const current = transactions.filter((transaction) =>
    inRange(transaction, currentStart, currentEnd)
  );
  const previous = transactions.filter((transaction) =>
    inRange(transaction, previousStart, previousEnd)
  );
  const totalSpent = Math.round(sumExpenses(current));
  const previousWeekSpent = Math.round(sumExpenses(previous));
  const changeAmount = totalSpent - previousWeekSpent;
  const changePercent =
    previousWeekSpent === 0 ? 0 : Math.round((changeAmount / previousWeekSpent) * 100);

  const currentByCategory = totalsByCategory(current, categories);
  const previousByCategory = totalsByCategory(previous, categories);
  const categoryIds = new Set([
    ...currentByCategory.keys(),
    ...previousByCategory.keys(),
  ]);
  const changes = Array.from(categoryIds).map((categoryId) => {
    const currentItem = currentByCategory.get(categoryId);
    const previousItem = previousByCategory.get(categoryId);
    return {
      label: currentItem?.label ?? previousItem?.label ?? 'Unknown category',
      amount: Math.round(currentItem?.amount ?? 0),
      changeAmount: Math.round((currentItem?.amount ?? 0) - (previousItem?.amount ?? 0)),
      categoryId: currentItem?.categoryId ?? previousItem?.categoryId,
    };
  });

  const increases = changes
    .filter((item) => item.changeAmount > 0)
    .sort((a, b) => b.changeAmount - a.changeAmount);
  const improvements = changes
    .filter((item) => item.changeAmount < 0)
    .sort((a, b) => a.changeAmount - b.changeAmount);
  const direction = changeAmount <= 0 ? 'less' : 'more';

  return {
    totalSpent,
    previousWeekSpent,
    changeAmount,
    changePercent,
    bestImprovement: improvements[0],
    biggestIncrease: increases[0],
    oneThingToWatch: increases[0],
    summary: `You spent ${money(totalSpent, currency)} this week, ${money(changeAmount, currency)} ${direction} than the previous week.`,
  };
};
