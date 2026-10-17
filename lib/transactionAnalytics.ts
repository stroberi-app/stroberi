import type { TransactionModel } from '../database/transaction-model';
import { calculatePeriodTotals, sumExpensesBy } from './ledger';

type CategorySpend = { category: string; total: number };

export interface TransactionAnalytics {
  /** Sum of expenses as a negative number (0 when there are none). */
  totalExpense: number;
  totalIncome: number;
  transactionCount: number;
  balance: number;
  highestSpendCategory: CategorySpend;
  categoryBreakdown: CategorySpend[];
}

/** Expense totals per category id (or `Uncategorized`), largest first. */
export function calculateCategorySpending(
  transactions: TransactionModel[]
): CategorySpend[] {
  const totals = sumExpensesBy(
    transactions,
    (transaction) => transaction.categoryId || 'Uncategorized'
  );

  return Array.from(totals, ([category, total]) => ({ category, total })).sort(
    (a, b) => b.total - a.total
  );
}

export function calculateTransactionAnalytics(
  transactions: TransactionModel[]
): TransactionAnalytics {
  const { income, expenses, net } = calculatePeriodTotals(transactions);
  const categoryBreakdown = calculateCategorySpending(transactions);

  return {
    totalExpense: 0 - expenses,
    totalIncome: income,
    transactionCount: transactions.length,
    balance: net,
    highestSpendCategory: categoryBreakdown[0] ?? { category: 'Uncategorized', total: 0 },
    categoryBreakdown,
  };
}
