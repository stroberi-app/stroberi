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
