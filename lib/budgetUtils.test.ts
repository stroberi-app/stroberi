// @ts-expect-error Jest globals are available at runtime in test execution.
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
});
