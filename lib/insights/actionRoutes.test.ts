import { buildInsightActionRoute } from './actionRoutes';

describe('buildInsightActionRoute', () => {
  it('preserves transaction category and merchant context', () => {
    expect(
      buildInsightActionRoute({
        type: 'viewTransactions',
        label: 'Review transactions',
        categoryId: 'food',
        merchant: 'Corner Shop',
      })
    ).toEqual({
      pathname: '/transactions',
      params: {
        insightAction: '1',
        categoryId: 'food',
        merchant: 'Corner Shop',
      },
    });
  });

  it('preserves small-purchase amount and date context', () => {
    expect(
      buildInsightActionRoute({
        type: 'viewTransactions',
        label: 'Review small purchases',
        maxExpenseAmount: 8,
        fromDate: new Date('2026-06-01T00:00:00.000Z'),
        toDate: new Date('2026-06-30T23:59:59.999Z'),
      })
    ).toEqual({
      pathname: '/transactions',
      params: {
        insightAction: '1',
        maxExpenseAmount: '8',
        fromDate: '1780272000000',
        toDate: '1782863999999',
      },
    });
  });

  it('marks category repair as an uncategorized transaction filter', () => {
    expect(
      buildInsightActionRoute({ type: 'fixCategories', label: 'Categorize now' })
    ).toEqual({
      pathname: '/transactions',
      params: { insightAction: '1', uncategorized: '1' },
    });
  });

  it('opens budget creation with category context', () => {
    expect(
      buildInsightActionRoute({
        type: 'createBudget',
        label: 'Create budget',
        categoryId: 'food',
      })
    ).toEqual({
      pathname: '/budgets',
      params: { openCreate: '1', categoryId: 'food' },
    });
  });

  it('omits blank optional values and returns null for no action', () => {
    expect(
      buildInsightActionRoute({
        type: 'viewTransactions',
        label: 'Review',
        categoryId: ' ',
        merchant: '',
      })
    ).toEqual({ pathname: '/transactions', params: { insightAction: '1' } });
    expect(buildInsightActionRoute({ type: 'none', label: '' })).toBe(null);
  });
});
