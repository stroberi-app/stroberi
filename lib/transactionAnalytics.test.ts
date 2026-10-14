import type { TransactionModel } from '../database/transaction-model';
import {
  calculateCategorySpending,
  calculateTransactionAnalytics,
} from './transactionAnalytics';

const tx = (amountInBaseCurrency: number, categoryId: string | null) =>
  ({ amountInBaseCurrency, categoryId, date: new Date() }) as TransactionModel;

describe('transactionAnalytics', () => {
  const transactions = [
    tx(-30, 'food'),
    tx(-20, 'food'),
    tx(-40, null),
    tx(500, 'salary'),
  ];

  it('ranks expense totals per category', () => {
    expect(calculateCategorySpending(transactions)).toEqual([
      { category: 'food', total: 50 },
      { category: 'Uncategorized', total: 40 },
    ]);
  });

  it('summarises totals with expenses as a negative sum', () => {
    expect(calculateTransactionAnalytics(transactions)).toMatchObject({
      totalExpense: -90,
      totalIncome: 500,
      balance: 410,
      transactionCount: 4,
      highestSpendCategory: { category: 'food', total: 50 },
    });
  });

  it('reports zero, not negative zero, when nothing was spent', () => {
    const analytics = calculateTransactionAnalytics([]);
    expect(Object.is(analytics.totalExpense, 0)).toBe(true);
    expect(analytics.highestSpendCategory).toEqual({
      category: 'Uncategorized',
      total: 0,
    });
  });
});
