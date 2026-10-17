jest.mock('@nozbe/watermelondb', () => ({
  Q: {
    where: (field: string, condition: unknown) => ({ field, condition }),
    gte: (value: number) => ({ operator: 'gte', value }),
    lte: (value: number) => ({ operator: 'lte', value }),
    lt: (value: number) => ({ operator: 'lt', value }),
    oneOf: (values: string[]) => ({ operator: 'oneOf', values }),
  },
}));

import {
  buildBudgetTransactionConditions,
  calculateRollover,
  evaluateBudget,
  getBudgetDisplayName,
  sumBudgetTransactions,
} from './budgetUtils';

describe('budgetUtils', () => {
  it('builds shared budget transaction conditions with optional category filters', () => {
    const start = new Date('2026-03-01T00:00:00.000Z');
    const end = new Date('2026-03-31T23:59:59.999Z');

    expect(buildBudgetTransactionConditions(start, end)).toEqual([
      {
        field: 'date',
        condition: { operator: 'gte', value: start.getTime() },
      },
      {
        field: 'date',
        condition: { operator: 'lte', value: end.getTime() },
      },
      {
        field: 'amountInBaseCurrency',
        condition: { operator: 'lt', value: 0 },
      },
    ]);

    expect(buildBudgetTransactionConditions(start, end, ['cat_1', 'cat_2'])).toEqual([
      {
        field: 'date',
        condition: { operator: 'gte', value: start.getTime() },
      },
      {
        field: 'date',
        condition: { operator: 'lte', value: end.getTime() },
      },
      {
        field: 'amountInBaseCurrency',
        condition: { operator: 'lt', value: 0 },
      },
      {
        field: 'categoryId',
        condition: { operator: 'oneOf', values: ['cat_1', 'cat_2'] },
      },
    ]);
  });

  it('reuses the same rollover math in the action and preview layers', () => {
    expect(calculateRollover({ amount: 100, rollover: false }, 75)).toBe(0);
    expect(calculateRollover({ amount: 100, rollover: true }, 75)).toBe(25);
    expect(calculateRollover({ amount: 100, rollover: true }, 125)).toBe(0);
  });

  it('sums budget transactions by absolute base-currency spend', () => {
    expect(
      sumBudgetTransactions([
        { amountInBaseCurrency: -12.5 },
        { amountInBaseCurrency: 8 },
        { amountInBaseCurrency: -4.5 },
      ])
    ).toBe(25);
  });

  describe('evaluateBudget', () => {
    const budget = { amount: 200, rollover: true, alertThreshold: 75 };

    it('grades spend against the limit and alert threshold', () => {
      expect(evaluateBudget({ ...budget, rollover: false }, 50)).toEqual({
        spent: 50,
        budgetLimit: 200,
        rolloverAmount: 0,
        remaining: 150,
        percentage: 25,
        status: 'ok',
      });
      expect(evaluateBudget(budget, 150).status).toBe('warning');
      expect(evaluateBudget(budget, 200).status).toBe('exceeded');
    });

    it('adds rollover only when the previous period spend is known', () => {
      expect(evaluateBudget(budget, 150, 120)).toMatchObject({
        budgetLimit: 280,
        rolloverAmount: 80,
        status: 'ok',
      });
      expect(evaluateBudget(budget, 150).rolloverAmount).toBe(0);
    });

    it('treats a zero limit as 0% used', () => {
      expect(evaluateBudget({ ...budget, amount: 0 }, 10).percentage).toBe(0);
    });
  });

  it('names unnamed budgets after their period', () => {
    expect(getBudgetDisplayName({ name: '', period: 'weekly' })).toBe('Weekly Budget');
    expect(getBudgetDisplayName({ name: 'Groceries', period: 'weekly' })).toBe(
      'Groceries'
    );
  });
});
