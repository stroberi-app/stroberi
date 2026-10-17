import type { InsightCategory, InsightTransaction } from './types';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const UNCATEGORIZED_KEY = 'uncategorized';

/** Purchases at or below this amount count as "small". */
export const SMALL_PURCHASE_THRESHOLD = 8;
/** How many small purchases it takes before they are worth flagging. */
export const SMALL_PURCHASE_MIN_COUNT = 5;

const sumByType = (
  transactions: InsightTransaction[],
  type: InsightTransaction['type']
) =>
  transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amountInBaseCurrency), 0);

export const sumExpenses = (transactions: InsightTransaction[]) =>
  sumByType(transactions, 'expense');

export const sumIncome = (transactions: InsightTransaction[]) =>
  sumByType(transactions, 'income');

export const findSmallPurchases = (
  transactions: InsightTransaction[],
  threshold = SMALL_PURCHASE_THRESHOLD
) =>
  transactions.filter(
    (transaction) =>
      transaction.type === 'expense' &&
      Math.abs(transaction.amountInBaseCurrency) <= threshold
  );

export const categoryLabel = (
  categories: InsightCategory[],
  categoryId: string | null
) =>
  categoryId
    ? (categories.find((category) => category.id === categoryId)?.name ??
      'Unknown category')
    : 'Uncategorized';

/** Currency without minor units, e.g. "€12", for conversational copy. */
export const formatWholeAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
