import {
  calculateMonthForecast,
  calculateSafeToSpend,
  getHistoricalMonthlyAverage,
} from './safeToSpend';
import type { InsightTransaction } from './types';

const tx = (
  id: string,
  amount: number,
  date: string,
  type: 'expense' | 'income' = 'expense',
  categoryId: string | null = 'food'
): InsightTransaction => ({
  id,
  amountInBaseCurrency: amount,
  date: new Date(date),
  categoryId,
  merchant: id,
  type,
});

describe('calculateSafeToSpend', () => {
  it('uses an active monthly budget before income or history', () => {
    const result = calculateSafeToSpend({
      transactions: [tx('groceries', 300, '2026-06-05')],
      fromDate: new Date('2026-06-01T00:00:00.000Z'),
      toDate: new Date('2026-06-30T23:59:59.999Z'),
      today: new Date('2026-06-15T12:00:00.000Z'),
      budgetLimit: 900,
      expectedRecurring: 120,
    });

    expect(result.remainingAmount).toBe(480);
    expect(result.daysLeft).toBe(16);
    expect(result.dailyAmount).toBe(30);
    expect(result.status).toBe('safe');
    expect(result.confidence).toBe('high');
    expect(result.explanation).toContain('monthly budget');
  });

  it('falls back to current month income when no budget exists', () => {
    const result = calculateSafeToSpend({
      transactions: [
        tx('salary', 2000, '2026-06-01', 'income'),
        tx('rent', 700, '2026-06-02'),
      ],
      fromDate: new Date('2026-06-01T00:00:00.000Z'),
      toDate: new Date('2026-06-30T23:59:59.999Z'),
      today: new Date('2026-06-20T12:00:00.000Z'),
      expectedRecurring: 200,
    });

    expect(result.remainingAmount).toBe(1100);
    expect(result.dailyAmount).toBe(100);
    expect(result.status).toBe('safe');
    expect(result.confidence).toBe('medium');
    expect(result.explanation).toContain('income');
  });

  it('returns unknown when no budget, income, or historical baseline exists', () => {
    const result = calculateSafeToSpend({
      transactions: [tx('coffee', 5, '2026-06-02')],
      fromDate: new Date('2026-06-01T00:00:00.000Z'),
      toDate: new Date('2026-06-30T23:59:59.999Z'),
      today: new Date('2026-06-10T12:00:00.000Z'),
      expectedRecurring: 0,
    });

    expect(result.status).toBe('unknown');
    expect(result.dailyAmount).toBe(0);
    expect(result.confidence).toBe('low');
  });
});

describe('getHistoricalMonthlyAverage', () => {
  it('averages complete previous months only', () => {
    const average = getHistoricalMonthlyAverage(
      [
        tx('may-a', 100, '2026-05-03'),
        tx('may-b', 200, '2026-05-13'),
        tx('apr-a', 300, '2026-04-03'),
        tx('jun-current', 999, '2026-06-03'),
        tx('income', 1000, '2026-05-01', 'income'),
      ],
      new Date('2026-06-15T12:00:00.000Z')
    );

    expect(average).toBe(300);
  });
});

describe('calculateMonthForecast', () => {
  it('projects current spending pace across the period', () => {
    const result = calculateMonthForecast({
      currentSpend: 300,
      budgetLimit: 900,
      fromDate: new Date('2026-06-01T00:00:00.000Z'),
      toDate: new Date('2026-06-30T23:59:59.999Z'),
      today: new Date('2026-06-15T12:00:00.000Z'),
      dataConfidence: 'high',
    });

    expect(result.daysElapsed).toBe(15);
    expect(result.daysInPeriod).toBe(30);
    expect(result.projectedSpend).toBe(600);
    expect(result.status).toBe('safe');
  });
});
