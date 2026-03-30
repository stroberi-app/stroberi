import type { BudgetModel } from '../database/budget-model';
import type { TransactionModel } from '../database/transaction-model';
import { calculateBudgetAlert } from './budgetAlerts';

type BuildBudgetOptions = Partial<BudgetModel> & { id: string };
type BuildTransactionOptions = Partial<TransactionModel> & {
  id: string;
  categoryId?: string | null;
};

const buildBudget = ({ id, ...overrides }: BuildBudgetOptions): BudgetModel =>
  ({
    id,
    amount: 100,
    alertThreshold: 50,
    period: 'monthly',
    rollover: false,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    name: 'Budget',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as unknown as BudgetModel);

const buildTransaction = (
  { id, categoryId, ...overrides }: BuildTransactionOptions
): TransactionModel =>
  ({
    id,
    amountInBaseCurrency: -10,
    date: new Date('2026-03-15T00:00:00.000Z'),
    amount: -10,
    merchant: 'Test',
    note: '',
    currencyCode: 'USD',
    baseCurrencyCode: 'USD',
    exchangeRate: 1,
    conversionStatus: 'ok',
    recurringTransactionId: null,
    tripId: null,
    category: categoryId ? ({ id: categoryId } as never) : null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as unknown as TransactionModel);

describe('calculateBudgetAlert', () => {
  it('calculates alert values from the current period and matching categories', () => {
    const budget = buildBudget({ id: 'budget-1', amount: 100, alertThreshold: 50 });
    const alert = calculateBudgetAlert({
      budget,
      categoryIds: ['cat-1'],
      transactions: [
        buildTransaction({
          id: 'tx-1',
          amountInBaseCurrency: -60,
          categoryId: 'cat-1',
          date: new Date('2026-03-10T12:00:00.000Z'),
        }),
        buildTransaction({
          id: 'tx-2',
          amountInBaseCurrency: -20,
          categoryId: 'cat-2',
          date: new Date('2026-03-10T12:00:00.000Z'),
        }),
      ],
      periodDates: {
        start: new Date('2026-03-01T00:00:00.000Z'),
        end: new Date('2026-03-31T23:59:59.999Z'),
      },
    });

    expect(alert?.spent).toBe(60);
    expect(alert?.budgetLimit).toBe(100);
    expect(alert?.percentage).toBe(60);
  });

  it('includes rollover from the previous period when configured', () => {
    const budget = buildBudget({
      id: 'budget-2',
      amount: 100,
      alertThreshold: 10,
      rollover: true,
    });
    const alert = calculateBudgetAlert({
      budget,
      categoryIds: [],
      transactions: [
        buildTransaction({
          id: 'tx-3',
          amountInBaseCurrency: -40,
          date: new Date('2026-02-15T12:00:00.000Z'),
        }),
        buildTransaction({
          id: 'tx-4',
          amountInBaseCurrency: -30,
          date: new Date('2026-03-15T12:00:00.000Z'),
        }),
      ],
      periodDates: {
        start: new Date('2026-03-01T00:00:00.000Z'),
        end: new Date('2026-03-31T23:59:59.999Z'),
      },
      previousPeriodDates: {
        start: new Date('2026-02-01T00:00:00.000Z'),
        end: new Date('2026-02-28T23:59:59.999Z'),
      },
    });

    expect(alert?.spent).toBe(30);
    expect(alert?.budgetLimit).toBe(160);
    expect(alert?.percentage).toBe(18.75);
  });
});
