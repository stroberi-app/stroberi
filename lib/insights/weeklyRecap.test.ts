import { buildWeeklyRecap } from './weeklyRecap';
import type { InsightCategory, InsightTransaction } from './types';

const categories: InsightCategory[] = [
  { id: 'food', name: 'Food' },
  { id: 'shopping', name: 'Shopping' },
];

const tx = (
  id: string,
  amount: number,
  date: string,
  categoryId: string | null
): InsightTransaction => ({
  id,
  amountInBaseCurrency: amount,
  date: new Date(date),
  categoryId,
  merchant: id,
  type: 'expense',
});

describe('buildWeeklyRecap', () => {
  it('summarizes current week versus previous week', () => {
    const recap = buildWeeklyRecap({
      transactions: [
        tx('food-now', 80, '2026-06-17', 'food'),
        tx('shopping-now', 20, '2026-06-18', 'shopping'),
        tx('food-prev', 40, '2026-06-10', 'food'),
        tx('shopping-prev', 90, '2026-06-11', 'shopping'),
      ],
      categories,
      today: new Date('2026-06-18T12:00:00.000Z'),
      currency: 'EUR',
    });

    expect(recap.totalSpent).toBe(100);
    expect(recap.previousWeekSpent).toBe(130);
    expect(recap.changeAmount).toBe(-30);
    expect(recap.bestImprovement?.label).toBe('Shopping');
    expect(recap.biggestIncrease?.label).toBe('Food');
    expect(recap.summary).toContain('€100');
  });
});
