import type { TransactionModel } from '../database/transaction-model';

export interface TransactionAnalytics {
  totalExpense: number;
  totalIncome: number;
  transactionCount: number;
  balance: number;
  highestSpendCategory: {
    category: string;
    total: number;
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
  }>;
}

/**
 * Calculate comprehensive analytics from a list of transactions
 */
export function calculateTransactionAnalytics(
  transactions: TransactionModel[]
): TransactionAnalytics {
  let totalExpense = 0;
  let totalIncome = 0;
  const categoryTotals: Record<string, number> = {};

  // Single pass through transactions to calculate all metrics
  for (const transaction of transactions) {
    const amount = transaction.amountInBaseCurrency;
    const categoryId = transaction.category?.id || 'Uncategorized';

    if (amount < 0) {
      totalExpense += amount;
      // Track category spending (use absolute value for category totals)
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = 0;
      }
      categoryTotals[categoryId] += Math.abs(amount);
    } else {
      totalIncome += amount;
    }
  }

  // Calculate category breakdown
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // Find highest spend category
  const highestSpendCategory =
    categoryBreakdown.length > 0
      ? categoryBreakdown[0]
      : { category: 'Uncategorized', total: 0 };

  return {
    totalExpense,
    totalIncome,
    transactionCount: transactions.length,
    balance: totalIncome + totalExpense,
    highestSpendCategory,
    categoryBreakdown,
  };
}

/**
 * Calculate spending breakdown by category (for charts)
 */
export function calculateCategorySpending(transactions: TransactionModel[]): Array<{
  category: string;
  total: number;
}> {
  const categoryTotals: Record<string, number> = {};

  // Only process expense transactions
  const expenseTransactions = transactions.filter((t) => t.amountInBaseCurrency < 0);

  for (const transaction of expenseTransactions) {
    const categoryId = transaction.category?.id || 'Uncategorized';
    if (!categoryTotals[categoryId]) {
      categoryTotals[categoryId] = 0;
    }
    categoryTotals[categoryId] += Math.abs(transaction.amountInBaseCurrency);
  }

  return Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .filter((item) => item.total > 0) // Only include categories with spending
    .sort((a, b) => b.total - a.total);
}

/**
 * Calculate spending by transaction type (income/expense)
 */
export function calculateSpendingByType(
  transactions: TransactionModel[],
  type: 'expense' | 'income'
): Array<{
  period: string;
  total: number;
}> {
  const isExpense = type === 'expense';
  const filteredTransactions = transactions.filter((t) =>
    isExpense ? t.amountInBaseCurrency < 0 : t.amountInBaseCurrency >= 0
  );

  // Group by month for time-based analysis
  const monthlyTotals: Record<string, number> = {};

  for (const transaction of filteredTransactions) {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = 0;
    }

    monthlyTotals[monthKey] += Math.abs(transaction.amountInBaseCurrency);
  }

  return Object.entries(monthlyTotals)
    .map(([period, total]) => ({ period, total }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Filter transactions by date range
 */
export function filterTransactionsByDateRange(
  transactions: TransactionModel[],
  fromDate: number,
  toDate: number
): TransactionModel[] {
  return transactions.filter((t) => {
    const transactionDate = new Date(t.date).getTime();
    return transactionDate >= fromDate && transactionDate <= toDate;
  });
}

/**
 * Get top N categories by spending
 */
export function getTopSpendingCategories(
  transactions: TransactionModel[],
  limit: number = 10
): Array<{
  category: string;
  total: number;
}> {
  const categorySpending = calculateCategorySpending(transactions);
  return categorySpending.slice(0, limit);
}
